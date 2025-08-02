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
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
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
      const data = XLSX.utils.sheet_to_json(worksheet);

      let imported = 0;
      let updated = 0;
      let duplicates = 0;
      const existingProducts = await storage.getAllProducts();
      const productMap = new Map(existingProducts.map(p => [p.name.toLowerCase(), p]));

      for (const row of data) {
        try {
          const rowData = row as any;
          const product = {
            name: String(rowData['Nome'] || rowData['name'] || '').trim(),
            description: String(rowData['Descrição'] || rowData['description'] || '').trim(),
            category: String(rowData['Categoria'] || rowData['category'] || '').trim(),
            price: String(parseFloat(String(rowData['Preço'] || rowData['price'] || '0'))),
            stock: parseInt(String(rowData['Estoque'] || rowData['stock'] || '0')),
            brand: String(rowData['Marca'] || rowData['brand'] || '').trim(),
            vehicleModel: String(rowData['Modelo'] || rowData['vehicleModel'] || '').trim(),
            vehicleYear: String(rowData['Ano'] || rowData['vehicleYear'] || '').trim(),
          };

          if (!product.name || !product.price) continue;

          const existingProduct = productMap.get(product.name.toLowerCase());
          
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
            productMap.set(product.name.toLowerCase(), product as any);
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

  // New user creation route
  app.post('/api/users', isAuthenticated, async (req, res) => {
    try {
      const userData = {
        ...req.body,
        id: `temp_${Date.now()}`, // Temporary ID for manual users
      };
      const user = await storage.upsertUser(userData);
      res.json(user);
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).json({ message: "Failed to create user" });
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
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching admin profile:", error);
      res.status(500).json({ message: "Failed to fetch profile" });
    }
  });

  app.put('/api/admin/profile', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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
          data = await storage.getAllOrders();
          break;
        case 'products':
          data = await storage.getAllProducts();
          break;
        case 'conversations':
          data = await storage.getAllConversations();
          break;
        case 'users':
          data = await storage.getAllUsers();
          break;
        case 'inventory':
          data = await storage.getAllProducts();
          break;
        default:
          return res.status(400).json({ message: "Invalid report type" });
      }

      // Create Excel buffer
      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');
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
