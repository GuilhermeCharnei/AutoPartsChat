import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertProductSchema, insertConversationSchema, insertMessageSchema, insertOrderSchema } from "@shared/schema";
import multer from "multer";
import XLSX from "xlsx";

const upload = multer({ storage: multer.memoryStorage() });

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any)?.claims?.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Temporary login for testing
  app.post('/api/auth/temp-login', async (req, res) => {
    try {
      const { email, role, name } = req.body;
      
      // Create or get user
      let user = await storage.getUserByEmail(email);
      if (!user) {
        // Set permissions based on role
        let permissions = {};
        switch (role) {
          case 'dev':
            permissions = {
              viewStock: true,
              editProducts: true,
              viewReports: true,
              manageUsers: true,
              adminAccess: true,
              apiConfig: true,
              canCreateDev: true
            };
            break;
          case 'administrador':
            permissions = {
              viewStock: true,
              editProducts: true,
              viewReports: true,
              manageUsers: true,
              adminAccess: true,
              apiConfig: false
            };
            break;
          case 'gerente':
            permissions = {
              viewStock: true,
              editProducts: true,
              viewReports: true,
              manageUsers: true,
              adminAccess: false,
              apiConfig: false,
              canCreateAdmin: false
            };
            break;
          case 'vendedor':
            permissions = {
              viewStock: true,
              editProducts: false,
              viewReports: false,
              manageUsers: false,
              adminAccess: false,
              apiConfig: false,
              editOwnProfile: true
            };
            break;
        }

        user = await storage.upsertUser({
          id: `temp_${Date.now()}`,
          email,
          firstName: name.split(' ')[0],
          lastName: name.split(' ').slice(1).join(' '),
          role,
          isActive: true,
          permissions,
          isInvitePending: false
        });
      }

      // Create session manually
      (req as any).session = (req as any).session || {};
      (req as any).session.user = {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        profileImageUrl: user.profileImageUrl,
        claims: { sub: user.id }
      };

      res.json({ success: true, user: (req as any).session.user });
    } catch (error) {
      console.error('Temp login error:', error);
      res.status(500).json({ message: 'Erro no login temporário' });
    }
  });

  // Logout route
  app.post('/api/auth/logout', async (req, res) => {
    try {
      (req as any).session.destroy((err: any) => {
        if (err) {
          console.error('Session destroy error:', err);
          return res.status(500).json({ message: 'Erro ao fazer logout' });
        }
        res.json({ success: true });
      });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({ message: 'Erro no logout' });
    }
  });

  // User management routes
  app.get('/api/users', isAuthenticated, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.patch('/api/users/:id/permissions', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const { permissions } = req.body;
      const user = await storage.updateUserPermissions(id, permissions);
      res.json(user);
    } catch (error) {
      console.error("Error updating permissions:", error);
      res.status(500).json({ message: "Failed to update permissions" });
    }
  });

  // Product/Inventory routes
  app.get('/api/products', isAuthenticated, async (req, res) => {
    try {
      const { search } = req.query;
      let products;
      if (search && typeof search === 'string') {
        products = await storage.searchProducts(search);
      } else {
        products = await storage.getAllProducts();
      }
      res.json(products);
    } catch (error) {
      console.error("Error fetching products:", error);
      res.status(500).json({ message: "Failed to fetch products" });
    }
  });

  app.post('/api/products', isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertProductSchema.parse(req.body);
      const product = await storage.createProduct(validatedData);
      res.json(product);
    } catch (error) {
      console.error("Error creating product:", error);
      res.status(500).json({ message: "Failed to create product" });
    }
  });

  app.patch('/api/products/:id', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const product = await storage.updateProduct(parseInt(id), req.body);
      res.json(product);
    } catch (error) {
      console.error("Error updating product:", error);
      res.status(500).json({ message: "Failed to update product" });
    }
  });

  app.delete('/api/products/:id', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteProduct(parseInt(id));
      res.json({ success });
    } catch (error) {
      console.error("Error deleting product:", error);
      res.status(500).json({ message: "Failed to delete product" });
    }
  });

  app.post('/api/products/upload', isAuthenticated, upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const removeDuplicates = req.body.removeDuplicates === 'true';
      const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      // Skip header rows and get data starting from row 3 (index 2)
      const data = XLSX.utils.sheet_to_json(worksheet, { 
        range: 2, // Start from row 3 (0-indexed)
        header: ['codigo', 'descricao', 'marca', 'estoque', 'fabricante', 'preco_unitario']
      });

      let imported = 0;
      let updated = 0;
      let duplicates = 0;
      const existingProducts = await storage.getAllProducts();
      const productMap = new Map(existingProducts.map(p => [
        (p.descricao || p.name || '').toLowerCase(), p
      ]));

      for (const row of data) {
        try {
          const rowData = row as any;
          
          // Skip empty rows
          if (!rowData.codigo && !rowData.descricao) continue;
          
          const product = {
            // New schema fields
            codigo: String(rowData.codigo || '').trim(),
            descricao: String(rowData.descricao || '').trim(),
            marca: String(rowData.marca || '').trim(),
            estoque_atual: parseInt(String(rowData.estoque || '0')) || 0,
            fornecedor: String(rowData.fabricante || '').trim(),
            preco_venda: String(parseFloat(String(rowData.preco_unitario || '0')) || 0),
            ativo: true,
            
            // Legacy compatibility
            name: String(rowData.descricao || '').trim(),
            description: String(rowData.descricao || '').trim(),
            brand: String(rowData.marca || '').trim(),
            stock: parseInt(String(rowData.estoque || '0')) || 0,
            price: String(parseFloat(String(rowData.preco_unitario || '0')) || 0),
            sku: String(rowData.codigo || '').trim(),
            isActive: true
          };

          if (!product.descricao || parseFloat(String(product.preco_venda)) <= 0) continue;

          const existingProduct = productMap.get(product.descricao.toLowerCase());
          
          if (existingProduct) {
            if (removeDuplicates) {
              // Update existing product with new data
              await storage.updateProduct(existingProduct.id, product);
              updated++;
            } else {
              duplicates++;
            }
          } else {
            await storage.createProduct(product);
            imported++;
            productMap.set(product.descricao.toLowerCase(), product as any);
          }
        } catch (error) {
          console.error("Error processing row:", error);
        }
      }

      res.json({ imported, updated, duplicates });
    } catch (error) {
      console.error("Error uploading Excel:", error);
      res.status(500).json({ message: "Failed to process Excel file" });
    }
  });

  // New user creation route with invite system
  app.post('/api/users', isAuthenticated, async (req, res) => {
    try {
      const userData = req.body;
      const currentUserId = (req as any).user?.claims?.sub;
      const currentUser = await storage.getUser(currentUserId);
      
      // Check if user is trying to create a DEV role
      if (userData.role === 'dev') {
        // Only allow if current user is DEV and has canCreateDev permission
        if (!currentUser || currentUser.role !== 'dev' || !(currentUser.permissions as any)?.canCreateDev) {
          return res.status(403).json({ 
            message: "Apenas usuários DEV podem criar outros usuários DEV." 
          });
        }
      }
      
      // Check if email already exists
      const existingUser = await storage.getUserByEmail(userData.email);
      if (existingUser) {
        return res.status(400).json({ 
          message: "Este email já está em uso. Por favor, utilize outro email." 
        });
      }
      
      // Generate invite token
      const inviteToken = `invite_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const inviteExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
      
      const user = await storage.upsertUser({
        id: `temp_${Date.now()}`,
        role: userData.role || 'vendedor',
        permissions: userData.permissions || {},
        inviteToken,
        inviteExpiresAt,
        isInvitePending: true,
        ...userData
      });
      
      // Log invite details (in production, send email)
      console.log(`
      ====== CONVITE DE USUÁRIO ======
      Email: ${userData.email}
      Nome: ${userData.firstName} ${userData.lastName}
      Link: ${req.protocol}://${req.get('host')}/invite/${inviteToken}
      Expira: ${inviteExpiresAt.toLocaleString('pt-BR')}
      ================================
      `);
      
      res.json({ 
        ...user, 
        message: `Convite enviado para ${userData.email}. Link válido por 7 dias.`
      });
    } catch (error: any) {
      console.error("Error creating user:", error);
      if (error.code === '23505') {
        res.status(400).json({ 
          message: "Este email já está em uso. Por favor, utilize outro email." 
        });
      } else {
        res.status(500).json({ message: "Erro interno do servidor. Tente novamente." });
      }
    }
  });

  // Delete user route
  app.delete('/api/users/:id', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteUser(id);
      res.json({ message: "Usuário removido com sucesso" });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ message: "Erro ao remover usuário" });
    }
  });

  // Promote user route
  app.patch('/api/users/:id/promote', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const { role } = req.body;
      const user = await storage.updateUser(id, { role });
      res.json(user);
    } catch (error) {
      console.error("Error promoting user:", error);
      res.status(500).json({ message: "Erro ao promover usuário" });
    }
  });

  // Update user permissions route
  app.patch('/api/users/:id/permissions', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const { permissions } = req.body;
      const user = await storage.updateUser(id, { permissions });
      res.json(user);
    } catch (error) {
      console.error("Error updating permissions:", error);
      res.status(500).json({ message: "Erro ao atualizar permissões" });
    }
  });

  // Chat transfer route
  app.patch('/api/conversations/:id/assign', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const { sellerId } = req.body;
      const conversation = await storage.assignConversation(parseInt(id), sellerId);
      res.json(conversation);
    } catch (error) {
      console.error("Error assigning conversation:", error);
      res.status(500).json({ message: "Failed to assign conversation" });
    }
  });

  // Finalize order route
  app.patch('/api/orders/:id/finalize', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const order = await storage.finalizeOrder(parseInt(id));
      res.json(order);
    } catch (error) {
      console.error("Error finalizing order:", error);
      res.status(500).json({ message: "Failed to finalize order" });
    }
  });

  // Admin Profile Routes
  app.get('/api/admin/profile', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching admin profile:", error);
      res.status(500).json({ message: "Failed to fetch profile" });
    }
  });

  app.put('/api/admin/profile', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const updatedProfile = await storage.updateUser(userId, req.body);
      res.json(updatedProfile);
    } catch (error) {
      console.error("Error updating admin profile:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  // WhatsApp Configuration Routes
  app.get('/api/admin/whatsapp-config', isAuthenticated, async (req: any, res) => {
    try {
      const config = await storage.getWhatsAppConfig();
      res.json(config || {});
    } catch (error) {
      console.error("Error fetching WhatsApp config:", error);
      res.status(500).json({ message: "Failed to fetch config" });
    }
  });

  app.put('/api/admin/whatsapp-config', isAuthenticated, async (req: any, res) => {
    try {
      const config = await storage.updateWhatsAppConfig(req.body);
      res.json(config);
    } catch (error) {
      console.error("Error updating WhatsApp config:", error);
      res.status(500).json({ message: "Failed to update config" });
    }
  });

  app.post('/api/admin/whatsapp-test', isAuthenticated, async (req: any, res) => {
    try {
      // Mock test for now - in production this would test the actual WhatsApp API
      res.json({ success: true, message: "Connection test successful" });
    } catch (error) {
      console.error("Error testing WhatsApp connection:", error);
      res.status(500).json({ message: "Connection test failed" });
    }
  });

  // Permissions Routes
  app.get('/api/admin/permissions', isAuthenticated, async (req: any, res) => {
    try {
      const permissions = await storage.getAllPermissions();
      res.json(permissions || []);
    } catch (error) {
      console.error("Error fetching permissions:", error);
      res.status(500).json({ message: "Failed to fetch permissions" });
    }
  });

  app.get('/api/admin/user-permissions/:userId', isAuthenticated, async (req: any, res) => {
    try {
      const { userId } = req.params;
      const userPermissions = await storage.getUserPermissions(userId);
      res.json(userPermissions || []);
    } catch (error) {
      console.error("Error fetching user permissions:", error);
      res.status(500).json({ message: "Failed to fetch user permissions" });
    }
  });

  app.put('/api/admin/user-permissions', isAuthenticated, async (req: any, res) => {
    try {
      const { userId, permissionId, granted } = req.body;
      const result = await storage.updateUserPermission(userId, permissionId, granted);
      res.json(result);
    } catch (error) {
      console.error("Error updating user permission:", error);
      res.status(500).json({ message: "Failed to update permission" });
    }
  });

  app.post('/api/admin/users/:userId/promote', isAuthenticated, async (req: any, res) => {
    try {
      const { userId } = req.params;
      const result = await storage.promoteUserToAdmin(userId);
      res.json(result);
    } catch (error) {
      console.error("Error promoting user:", error);
      res.status(500).json({ message: "Failed to promote user" });
    }
  });

  app.post('/api/admin/users/:userId/demote', isAuthenticated, async (req: any, res) => {
    try {
      const { userId } = req.params;
      const result = await storage.demoteUserFromAdmin(userId);
      res.json(result);
    } catch (error) {
      console.error("Error demoting user:", error);
      res.status(500).json({ message: "Failed to demote user" });
    }
  });

  // Edit user route
  app.patch('/api/users/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userData = req.body;
      const user = await storage.updateUser(id, userData);
      res.json(user);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  // Delete user route
  app.delete('/api/users/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteUser(id);
      res.json({ success });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  // Update user role route
  app.patch('/api/users/:id/role', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { role } = req.body;
      const user = await storage.updateUserRole(id, role);
      res.json(user);
    } catch (error) {
      console.error("Error updating user role:", error);
      res.status(500).json({ message: "Failed to update user role" });
    }
  });

  // AI Bot Routes
  app.post('/api/admin/test-ai', isAuthenticated, async (req: any, res) => {
    try {
      const { message, botConfig } = req.body;
      const { aiBot } = await import('./openai');
      
      // Atualizar conhecimento do negócio
      if (botConfig) {
        aiBot.updateBusinessKnowledge({
          companyName: botConfig.companyName || 'AutoPeças Brasil',
          businessType: 'Distribuidora de autopeças',
          specialties: botConfig.specialties?.split(',').map((s: string) => s.trim()) || [],
          commonProducts: ['Filtro de óleo', 'Pastilha de freio', 'Amortecedor'],
          workingHours: botConfig.workingHours || 'Segunda a Sexta: 8h às 18h',
          policies: botConfig.policies?.split(',').map((p: string) => p.trim()) || [],
          promotions: botConfig.promotions?.split(',').map((p: string) => p.trim()) || [],
        });
      }

      const products = await storage.getAllProducts();
      
      const response = await aiBot.generateResponse(
        message || 'Olá, preciso de ajuda com autopeças',
        {
          conversationHistory: [],
          currentProducts: products.slice(0, 10) // Primeiros 10 produtos para contexto
        },
        products.slice(0, 20) // Produtos disponíveis para recomendação
      );

      res.json({ response, success: true });
    } catch (error) {
      console.error("Error testing AI:", error);
      res.status(500).json({ message: "Failed to test AI", error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  app.post('/api/chat/ai-response', isAuthenticated, async (req: any, res) => {
    try {
      const { message, conversationId, customerName } = req.body;
      const { aiBot } = await import('./openai');

      // Buscar configuração do bot
      const config = await storage.getWhatsAppConfig();
      const botConfig = config?.bot || {};

      // Atualizar conhecimento se IA estiver habilitada
      if (botConfig.aiEnabled) {
        aiBot.updateBusinessKnowledge({
          companyName: botConfig.companyName || 'AutoPeças Brasil',
          businessType: 'Distribuidora de autopeças',
          specialties: botConfig.specialties?.split(',').map((s: string) => s.trim()) || [],
          commonProducts: ['Filtro de óleo', 'Pastilha de freio', 'Amortecedor'],
          workingHours: botConfig.workingHours || 'Segunda a Sexta: 8h às 18h',
          policies: botConfig.policies?.split(',').map((p: string) => p.trim()) || [],
          promotions: botConfig.promotions?.split(',').map((p: string) => p.trim()) || [],
        });
      }

      // Buscar histórico da conversa
      const messages = await storage.getMessagesByConversation(conversationId);
      const conversationHistory = messages.map(msg => ({
        role: msg.senderType === 'customer' ? 'user' as const : 'assistant' as const,
        content: msg.content,
        timestamp: msg.createdAt || new Date()
      }));

      // Buscar produtos disponíveis
      const products = await storage.getAllProducts();

      // Gerar resposta da IA
      const aiResponse = await aiBot.generateResponse(
        message,
        {
          customerName,
          conversationHistory,
          currentProducts: products.slice(0, 10)
        },
        products
      );

      // Salvar resposta do bot
      const botMessage = await storage.createMessage({
        conversationId,
        content: aiResponse,
        senderType: 'bot',
        senderId: 'ai-bot',
        isRead: false,
      });

      res.json({ 
        response: aiResponse, 
        message: botMessage,
        success: true 
      });
    } catch (error) {
      console.error("Error generating AI response:", error);
      res.status(500).json({ message: "Failed to generate AI response" });
    }
  });

  app.post('/api/chat/analyze-intent', isAuthenticated, async (req: any, res) => {
    try {
      const { message } = req.body;
      const { aiBot } = await import('./openai');

      const analysis = await aiBot.analyzeIntent(message);
      res.json(analysis);
    } catch (error) {
      console.error("Error analyzing intent:", error);
      res.status(500).json({ message: "Failed to analyze intent" });
    }
  });

  app.post('/api/chat/recommend-products', isAuthenticated, async (req: any, res) => {
    try {
      const { vehicleInfo } = req.body;
      const { aiBot } = await import('./openai');

      const products = await storage.getAllProducts();
      const recommendations = await aiBot.recommendProducts(vehicleInfo, products);
      
      res.json({ recommendations });
    } catch (error) {
      console.error("Error recommending products:", error);
      res.status(500).json({ message: "Failed to recommend products" });
    }
  });

  // Export reports route
  app.get('/api/reports/export', isAuthenticated, async (req, res) => {
    try {
      const { type, period } = req.query;
      
      // Generate Excel file based on type and period
      let data = [];
      let filename = `relatorio_${type}_${period}.xlsx`;
      
      switch (type) {
        case 'sales':
          const orders = await storage.getAllOrders();
          data = orders.map(order => ({
            'ID': order.id,
            'Cliente': order.customerName || '',
            'Produtos': Array.isArray(order.items) ? order.items.map((item: any) => item.name).join(', ') : 'N/A',
            'Quantidade Total': Array.isArray(order.items) ? order.items.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0) : 0,
            'Valor Total (R$)': order.totalAmount || 0,
            'Status': order.status || '',
            'Data da Venda': order.createdAt ? new Date(order.createdAt).toLocaleDateString('pt-BR') : ''
          }));
          break;
        case 'products':
          const products = await storage.getAllProducts();
          data = products.map(product => ({
            'Código': product.codigo || product.sku || '',
            'Descrição': product.descricao || product.description || product.name || '',
            'Marca': product.marca || product.brand || '',
            'Categoria': product.categoria || product.category || '',
            'Subcategoria': product.subcategoria || '',
            'Aplicação': product.aplicacao || `${product.vehicleModel || ''} ${product.vehicleYear || ''}`.trim(),
            'Preço de Custo (R$)': product.preco_custo || '',
            'Preço de Venda (R$)': product.preco_venda || product.price || '',
            'Margem de Lucro (%)': product.margem_lucro || '',
            'Estoque Atual': product.estoque_atual || product.stock || 0,
            'Status do Estoque': (product.estoque_atual || product.stock || 0) < 5 ? 'Baixo' : (product.estoque_atual || product.stock || 0) < 20 ? 'Médio' : 'Alto',
            'Estoque Mínimo': product.estoque_minimo || '',
            'Localização': product.localizacao || '',
            'Fornecedor': product.fornecedor || '',
            'Peso (kg)': product.peso || '',
            'Dimensões': product.dimensoes || '',
            'NCM': product.ncm || '',
            'Observações': product.observacoes || '',
            'Status': (product.ativo !== false && product.isActive !== false) ? 'Ativo' : 'Inativo',
            'Data de Cadastro': product.data_cadastro ? new Date(product.data_cadastro).toLocaleDateString('pt-BR') : 
                               (product.createdAt ? new Date(product.createdAt).toLocaleDateString('pt-BR') : '')
          }));
          break;
        case 'conversations':
          const conversations = await storage.getAllConversations();
          data = conversations.map(conv => ({
            'ID': conv.id,
            'Cliente': conv.customerName,
            'Telefone': conv.customerPhone || '',
            'Status': conv.status,
            'Vendedor Responsável': conv.assignedUserId || '',
            'Última Mensagem': conv.lastMessageAt ? new Date(conv.lastMessageAt).toLocaleDateString('pt-BR') : '',
            'Data de Criação': conv.createdAt ? new Date(conv.createdAt).toLocaleDateString('pt-BR') : ''
          }));
          break;
        case 'users':
          const users = await storage.getAllUsers();
          data = users.map(user => ({
            'Nome': user.firstName || '',
            'Sobrenome': user.lastName || '',
            'Email': user.email || '',
            'Telefone': user.phone || '',
            'Função': user.role || '',
            'Empresa': user.companyName || '',
            'Status': user.isActive ? 'Ativo' : 'Inativo',
            'Data de Criação': user.createdAt ? new Date(user.createdAt).toLocaleDateString('pt-BR') : ''
          }));
          break;
        case 'inventory':
          const inventory = await storage.getAllProducts();
          data = inventory.map(product => ({
            'Nome do Produto': product.name,
            'Categoria': product.category || '',
            'Marca': product.brand || '',
            'Estoque Atual': product.stock,
            'Preço (R$)': product.price,
            'Status do Estoque': (product.stock || 0) < 5 ? 'Baixo' : (product.stock || 0) < 20 ? 'Médio' : 'Alto',
            'Última Atualização': product.updatedAt ? new Date(product.updatedAt).toLocaleDateString('pt-BR') : ''
          }));
          break;
        default:
          return res.status(400).json({ message: "Invalid report type" });
      }

      // Create Excel buffer
      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Relatório');
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.send(buffer);
    } catch (error) {
      console.error("Error exporting report:", error);
      res.status(500).json({ message: "Failed to export report" });
    }
  });

  // Conversation routes
  app.get('/api/conversations', isAuthenticated, async (req, res) => {
    try {
      const conversations = await storage.getAllConversations();
      res.json(conversations);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ message: "Failed to fetch conversations" });
    }
  });

  app.post('/api/conversations', isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertConversationSchema.parse(req.body);
      const conversation = await storage.createConversation(validatedData);
      res.json(conversation);
    } catch (error) {
      console.error("Error creating conversation:", error);
      res.status(500).json({ message: "Failed to create conversation" });
    }
  });

  app.get('/api/conversations/:id/messages', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const messages = await storage.getMessagesByConversation(parseInt(id));
      res.json(messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  app.post('/api/conversations/:id/messages', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const messageData = {
        ...req.body,
        conversationId: parseInt(id),
        senderId: (req.user as any)?.claims?.sub,
      };
      const validatedData = insertMessageSchema.parse(messageData);
      const message = await storage.createMessage(validatedData);
      
      // Broadcast to WebSocket clients
      broadcastMessage(message);
      
      res.json(message);
    } catch (error) {
      console.error("Error creating message:", error);
      res.status(500).json({ message: "Failed to create message" });
    }
  });

  // Order routes
  app.get('/api/orders', isAuthenticated, async (req, res) => {
    try {
      const orders = await storage.getAllOrders();
      res.json(orders);
    } catch (error) {
      console.error("Error fetching orders:", error);
      res.status(500).json({ message: "Failed to fetch orders" });
    }
  });

  app.post('/api/orders', isAuthenticated, async (req, res) => {
    try {
      const orderData = {
        ...req.body,
        sellerId: (req.user as any)?.claims?.sub,
      };
      const validatedData = insertOrderSchema.parse(orderData);
      const order = await storage.createOrder(validatedData);
      res.json(order);
    } catch (error) {
      console.error("Error creating order:", error);
      res.status(500).json({ message: "Failed to create order" });
    }
  });

  // Dashboard stats
  app.get('/api/dashboard/stats', isAuthenticated, async (req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  // OpenAI Configuration routes (DEV only)
  app.get('/api/admin/openai-config', isAuthenticated, async (req, res) => {
    try {
      const currentUser = await storage.getUser((req.user as any)?.claims?.sub);
      
      if (!currentUser || currentUser.role !== 'dev') {
        return res.status(403).json({ message: "Apenas usuários DEV podem acessar configurações da OpenAI" });
      }

      const config = await storage.getOpenAIConfig();
      
      // Don't expose the actual API key
      const safeConfig = {
        ...config,
        apiKey: config.apiKey ? '***' + config.apiKey.slice(-4) : ''
      };
      
      res.json(safeConfig);
    } catch (error) {
      console.error("Error getting OpenAI config:", error);
      res.status(500).json({ message: "Erro ao buscar configuração da OpenAI" });
    }
  });

  app.put('/api/admin/openai-config', isAuthenticated, async (req, res) => {
    try {
      const currentUser = await storage.getUser((req.user as any)?.claims?.sub);
      
      if (!currentUser || currentUser.role !== 'dev') {
        return res.status(403).json({ message: "Apenas usuários DEV podem configurar a OpenAI" });
      }

      const config = await storage.createOrUpdateOpenAIConfig(req.body);
      res.json(config);
    } catch (error) {
      console.error("Error updating OpenAI config:", error);
      res.status(500).json({ message: "Erro ao atualizar configuração da OpenAI" });
    }
  });

  // Chat with AI Bot for internal use
  app.post('/api/chat/ai-message', isAuthenticated, async (req, res) => {
    try {
      const { message } = req.body;
      const currentUser = await storage.getUser((req.user as any)?.claims?.sub);
      
      if (!currentUser) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }

      const config = await storage.getOpenAIConfig();
      
      if (!config.isActive || !config.apiKey) {
        return res.status(400).json({ message: "OpenAI API não está configurada ou ativa" });
      }

      // Mock response - in production this would call the actual OpenAI API
      const response = `Como assistente especializado em autopeças, posso ajudar com informações sobre: produtos, preços, compatibilidade de peças, estoque e recomendações. Sua mensagem: "${message}". Como posso ajudá-lo especificamente?`;
      
      res.json({ response });
    } catch (error) {
      console.error("Error processing AI message:", error);
      res.status(500).json({ message: "Erro ao processar mensagem da IA" });
    }
  });

  // Create HTTP server
  const httpServer = createServer(app);

  // WebSocket server for real-time chat
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  const clients = new Set<WebSocket>();

  wss.on('connection', (ws) => {
    clients.add(ws);
    
    ws.on('close', () => {
      clients.delete(ws);
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      clients.delete(ws);
    });
  });

  // Function to broadcast messages to all connected clients
  function broadcastMessage(message: any) {
    const messageStr = JSON.stringify({
      type: 'new_message',
      data: message,
    });

    clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(messageStr);
      }
    });
  }

  return httpServer;
}
