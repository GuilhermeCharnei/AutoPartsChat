import {
  users,
  products,
  conversations,
  messages,
  orders,
  sales,
  botSettings,
  teamChat,
  type User,
  type UpsertUser,
  type Product,
  type InsertProduct,
  type Conversation,
  type InsertConversation,
  type Message,
  type InsertMessage,
  type Order,
  type InsertOrder,
  type Sale,
  type InsertSale,
  type BotSettings,
  type InsertBotSettings,
  type TeamChat,
  type InsertTeamChat,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, or, ilike, sql, isNull } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  updateUserPermissions(id: string, permissions: any): Promise<User | undefined>;
  
  // Product operations
  getAllProducts(): Promise<Product[]>;
  getProduct(id: number): Promise<Product | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: number, product: Partial<InsertProduct>): Promise<Product | undefined>;
  deleteProduct(id: number): Promise<boolean>;
  searchProducts(query: string): Promise<Product[]>;
  updateStock(id: number, newStock: number): Promise<Product | undefined>;
  
  // Conversation operations
  getAllConversations(): Promise<Conversation[]>;
  getConversation(id: number): Promise<Conversation | undefined>;
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  updateConversation(id: number, updates: Partial<InsertConversation>): Promise<Conversation | undefined>;
  
  // Message operations
  getMessagesByConversation(conversationId: number): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  markMessagesAsRead(conversationId: number): Promise<void>;
  
  // Order operations
  getAllOrders(): Promise<Order[]>;
  getOrder(id: number): Promise<Order | undefined>;
  createOrder(order: InsertOrder): Promise<Order>;
  updateOrderStatus(id: number, status: string): Promise<Order | undefined>;
  finalizeOrder(id: number): Promise<Order | undefined>;
  getOrdersByDate(date: string): Promise<Order[]>;
  
  // Chat transfer operations
  assignConversation(conversationId: number, sellerId: string): Promise<Conversation | undefined>;
  
  // Dashboard/Analytics
  getDashboardStats(): Promise<{
    totalProducts: number;
    lowStockProducts: number;
    todaySales: number;
    activeConversations: number;
    totalSales: number;
  }>;

  // Permission operations
  hasPermission(user: User, permission: string): boolean;
  updateUserRole(userId: string, role: string): Promise<User>;
  updateUserPermissions(userId: string, permissions: Record<string, boolean>): Promise<User>;
  deleteUser(userId: string): Promise<boolean>;
  updateUser(id: string, data: any): Promise<User>;
  getUserByInviteToken(token: string): Promise<User | undefined>;
  
  // Sales operations
  getAllSales(): Promise<Sale[]>;
  getSale(id: number): Promise<Sale | undefined>;
  createSale(sale: InsertSale): Promise<Sale>;
  updateSaleStatus(id: number, status: string): Promise<Sale | undefined>;
  
  // Bot operations
  getBotSettings(): Promise<BotSettings | undefined>;
  updateBotSettings(settings: Partial<InsertBotSettings>): Promise<BotSettings>;
  
  // Product stock management
  updateProductStock(productId: number, quantityChange: number): Promise<Product | undefined>;
  
  // OpenAI Config operations
  getOpenAIConfig(): Promise<any>;
  createOrUpdateOpenAIConfig(data: any): Promise<any>;
  
  // System Conversations operations
  getSystemConversations(): Promise<any[]>;
  createSystemConversation(data: any): Promise<any>;
  
  // Team Chat operations
  getTeamChatMessages(chatRoom?: string, limit?: number): Promise<any[]>;
  getDirectMessages(userId: string, otherUserId: string, limit?: number): Promise<any[]>;
  sendTeamChatMessage(message: any): Promise<any>;
  markTeamChatMessagesAsRead(userId: string, messageIds: number[]): Promise<void>;
  getActiveTeamMembers(): Promise<User[]>;
  getTeamChatConversations(userId: string): Promise<any[]>;
  markTeamConversationAsRead(userId: string, conversationId: string, type: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUserByInviteToken(token: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.inviteToken, token));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    // Check if email is provided
    if (!userData.email) {
      throw new Error('Email is required for user upsert');
    }
    
    // First try to find existing user by email
    const existingUser = await this.getUserByEmail(userData.email);
    
    if (existingUser) {
      // Update existing user with new data, ensuring permissions are updated
      const [user] = await db
        .update(users)
        .set({
          ...userData,
          updatedAt: new Date(),
        })
        .where(eq(users.email, userData.email))
        .returning();
      return user;
    } else {
      // Insert new user
      const [user] = await db
        .insert(users)
        .values(userData)
        .returning();
      return user;
    }
  }

  async updateUser(id: string, data: any): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ 
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async promoteUserToAdmin(id: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ 
        role: 'admin',
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async demoteUserFromAdmin(id: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ 
        role: 'seller',
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  // WhatsApp Configuration
  private whatsappConfig: any = {
    bot: {
      aiEnabled: false,
      companyName: 'AutoPeças Brasil',
      specialties: 'Peças originais, Filtros, Óleos, Pneus, Baterias',
      policies: 'Garantia de 90 dias em peças nacionais, Garantia de 1 ano em peças originais, Entrega grátis para pedidos acima de R$ 200',
      promotions: ''
    }
  };

  async getWhatsAppConfig(): Promise<any> {
    return this.whatsappConfig;
  }

  async updateWhatsAppConfig(config: any): Promise<any> {
    this.whatsappConfig = { ...this.whatsappConfig, ...config };
    return this.whatsappConfig;
  }

  // Permission checking
  hasPermission(user: User, permission: string): boolean {
    if (user.role === 'dev') return true; // DEV has all permissions
    
    const userPermissions = user.permissions as any || {};
    return userPermissions[permission] === true;
  }

  async updateUserRole(userId: string, role: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ 
        role,
        updatedAt: new Date() 
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async updateUserPermissions(userId: string, permissions: Record<string, boolean>): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ 
        permissions,
        updatedAt: new Date() 
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async deleteUser(userId: string): Promise<boolean> {
    try {
      const result = await db
        .delete(users)
        .where(eq(users.id, userId));
      return true;
    } catch (error) {
      console.error("Error deleting user:", error);
      return false;
    }
  }

  // OpenAI Config operations - mock for now
  private openaiConfig: any = {
    apiKey: '',
    model: 'gpt-4o',
    maxTokens: 1000,
    temperature: 0.7,
    systemPrompt: 'Você é um assistente especializado em autopeças.',
    isActive: false
  };

  async getOpenAIConfig(): Promise<any> {
    return this.openaiConfig;
  }

  async createOrUpdateOpenAIConfig(data: any): Promise<any> {
    this.openaiConfig = { ...this.openaiConfig, ...data };
    return this.openaiConfig;
  }

  // System Conversations operations - mock for now
  private systemConversations: any[] = [
    {
      id: -1, // Negative ID to distinguish from regular conversations
      customerName: "🤖 IA Assistant",
      customerPhone: "bot",
      customerAvatar: null,
      status: "active",
      lastMessage: "Consulte a IA sobre produtos, preços e informações do negócio",
      lastMessageAt: new Date(),
      unreadCount: 0,
      assignedUserId: null,
      isSystemBot: true,
      type: "bot"
    }
  ];

  async getSystemConversations(): Promise<any[]> {
    return this.systemConversations;
  }

  async createSystemConversation(data: any): Promise<any> {
    const newConv = {
      id: this.systemConversations.length + 1,
      ...data,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.systemConversations.push(newConv);
    return newConv;
  }

  // Permissions
  async getAllPermissions(): Promise<any[]> {
    // Return default permissions - in production this could be stored in database
    return [];
  }

  async getUserPermissions(userId: string): Promise<any[]> {
    // Return user-specific permissions - in production this would be from database
    return [];
  }

  async updateUserPermission(userId: string, permissionId: string, granted: boolean): Promise<any> {
    // Update user permission - in production this would update database
    return { userId, permissionId, granted };
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).where(eq(users.isActive, true)).orderBy(users.firstName);
  }



  // Product operations
  async getAllProducts(): Promise<Product[]> {
    return await db.select().from(products).where(eq(products.isActive, true)).orderBy(products.name);
  }

  async getProduct(id: number): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.id, id));
    return product;
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const [newProduct] = await db.insert(products).values({
      ...product,
      data_cadastro: new Date(),
      data_atualizacao: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();
    return newProduct;
  }

  async updateProduct(id: number, product: Partial<InsertProduct>): Promise<Product | undefined> {
    const [updatedProduct] = await db
      .update(products)
      .set({ ...product, updatedAt: new Date() })
      .where(eq(products.id, id))
      .returning();
    return updatedProduct;
  }

  async deleteProduct(id: number): Promise<boolean> {
    const result = await db
      .update(products)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(products.id, id));
    return (result.rowCount || 0) > 0;
  }

  async searchProducts(query: string): Promise<Product[]> {
    return await db
      .select()
      .from(products)
      .where(
        and(
          eq(products.isActive, true),
          or(
            ilike(products.name, `%${query}%`),
            ilike(products.description, `%${query}%`),
            ilike(products.vehicleModel, `%${query}%`),
            ilike(products.brand, `%${query}%`)
          )
        )
      )
      .orderBy(products.name);
  }

  async updateStock(id: number, newStock: number): Promise<Product | undefined> {
    const [product] = await db
      .update(products)
      .set({ stock: newStock, updatedAt: new Date() })
      .where(eq(products.id, id))
      .returning();
    return product;
  }

  // Conversation operations
  async getAllConversations(): Promise<Conversation[]> {
    const regularConversations = await db
      .select()
      .from(conversations)
      .orderBy(desc(conversations.lastMessageAt));
    
    // Add system bot conversation at the top for internal users
    const botConversation = this.systemConversations[0];
    return [botConversation as any, ...regularConversations];
  }

  async getConversation(id: number): Promise<Conversation | undefined> {
    // Handle bot conversation specially
    if (id === -1) {
      return this.systemConversations[0] as any;
    }
    
    const [conversation] = await db.select().from(conversations).where(eq(conversations.id, id));
    return conversation;
  }

  async createConversation(conversation: InsertConversation): Promise<Conversation> {
    const [newConversation] = await db.insert(conversations).values(conversation).returning();
    return newConversation;
  }

  async updateConversation(id: number, updates: Partial<InsertConversation>): Promise<Conversation | undefined> {
    const [conversation] = await db
      .update(conversations)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(conversations.id, id))
      .returning();
    return conversation;
  }

  // Message operations
  async getMessagesByConversation(conversationId: number): Promise<Message[]> {
    // Handle bot conversation specially - return empty array for now
    if (conversationId === -1) {
      return [];
    }
    
    return await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(messages.createdAt);
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const [newMessage] = await db.insert(messages).values(message).returning();
    
    // Update conversation's lastMessageAt
    await db
      .update(conversations)
      .set({ lastMessageAt: new Date() })
      .where(eq(conversations.id, message.conversationId));
    
    return newMessage;
  }

  async markMessagesAsRead(conversationId: number): Promise<void> {
    await db
      .update(messages)
      .set({ isRead: true })
      .where(and(eq(messages.conversationId, conversationId), eq(messages.isRead, false)));
  }

  // Order operations
  async getAllOrders(): Promise<Order[]> {
    return await db.select().from(orders).orderBy(desc(orders.createdAt));
  }

  async getOrder(id: number): Promise<Order | undefined> {
    const [order] = await db.select().from(orders).where(eq(orders.id, id));
    return order;
  }

  async createOrder(order: InsertOrder): Promise<Order> {
    const [newOrder] = await db.insert(orders).values(order).returning();
    return newOrder;
  }

  async updateOrderStatus(id: number, status: string): Promise<Order | undefined> {
    const [order] = await db
      .update(orders)
      .set({ status, updatedAt: new Date() })
      .where(eq(orders.id, id))
      .returning();
    return order;
  }

  async finalizeOrder(id: number): Promise<Order | undefined> {
    const [order] = await db
      .update(orders)
      .set({ status: 'finalized', updatedAt: new Date() })
      .where(eq(orders.id, id))
      .returning();
    return order;
  }

  async getOrdersByDate(date: string): Promise<Order[]> {
    return await db
      .select()
      .from(orders)
      .where(sql`DATE(${orders.createdAt}) = ${date}`)
      .orderBy(desc(orders.createdAt));
  }

  // Chat transfer operations
  async assignConversation(conversationId: number, sellerId: string): Promise<Conversation | undefined> {
    const [conversation] = await db
      .update(conversations)
      .set({ assignedUserId: sellerId, updatedAt: new Date() })
      .where(eq(conversations.id, conversationId))
      .returning();
    return conversation;
  }

  // Dashboard/Analytics
  async getDashboardStats(): Promise<{
    totalProducts: number;
    lowStockProducts: number;
    todaySales: number;
    activeConversations: number;
    totalSales: number;
  }> {
    const today = new Date().toISOString().split('T')[0];
    
    const [totalProducts] = await db
      .select({ count: sql<number>`count(*)` })
      .from(products)
      .where(eq(products.isActive, true));
    
    const [lowStockProducts] = await db
      .select({ count: sql<number>`count(*)` })
      .from(products)
      .where(and(eq(products.isActive, true), sql`${products.stock} < 5`));
    
    const [todaySalesResult] = await db
      .select({ total: sql<number>`COALESCE(SUM(${orders.totalAmount}), 0)` })
      .from(orders)
      .where(sql`DATE(${orders.createdAt}) = ${today}`);
    
    const [activeConversationsResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(conversations)
      .where(eq(conversations.status, 'active'));

    const [totalSalesResult] = await db
      .select({ total: sql<number>`COALESCE(SUM(${orders.totalAmount}), 0)` })
      .from(orders);
    
    return {
      totalProducts: totalProducts.count || 0,
      lowStockProducts: lowStockProducts.count || 0,
      todaySales: todaySalesResult.total || 0,
      activeConversations: activeConversationsResult.count || 0,
      totalSales: totalSalesResult.total || 0,
    };
  }

  // Sales operations
  async getAllSales(): Promise<Sale[]> {
    return await db.select().from(sales).orderBy(desc(sales.createdAt));
  }

  async getSale(id: number): Promise<Sale | undefined> {
    const [sale] = await db.select().from(sales).where(eq(sales.id, id));
    return sale || undefined;
  }

  async createSale(sale: InsertSale): Promise<Sale> {
    const [newSale] = await db.insert(sales).values(sale).returning();
    return newSale;
  }

  async updateSaleStatus(id: number, status: string): Promise<Sale | undefined> {
    const [updatedSale] = await db
      .update(sales)
      .set({ status, updatedAt: new Date() })
      .where(eq(sales.id, id))
      .returning();
    return updatedSale || undefined;
  }

  // Bot operations
  async getBotSettings(): Promise<BotSettings | undefined> {
    const [settings] = await db.select().from(botSettings).orderBy(desc(botSettings.createdAt));
    return settings || undefined;
  }

  async updateBotSettings(settingsData: Partial<InsertBotSettings>): Promise<BotSettings> {
    // Check if settings exist
    const existing = await this.getBotSettings();
    
    if (existing) {
      // Update existing settings
      const [updated] = await db
        .update(botSettings)
        .set({ ...settingsData, updatedAt: new Date() })
        .where(eq(botSettings.id, existing.id))
        .returning();
      return updated;
    } else {
      // Create new settings
      const [created] = await db.insert(botSettings).values(settingsData as InsertBotSettings).returning();
      return created;
    }
  }

  // Product stock management
  async updateProductStock(productId: number, quantityChange: number): Promise<Product | undefined> {
    // Get current product
    const product = await this.getProduct(productId);
    if (!product) return undefined;

    const currentStock = product.stock || product.estoque_atual || 0;
    const newStock = currentStock + quantityChange;

    // Update both stock fields for compatibility
    const [updatedProduct] = await db
      .update(products)
      .set({ 
        stock: newStock,
        estoque_atual: newStock,
        data_atualizacao: new Date(),
        updatedAt: new Date()
      })
      .where(eq(products.id, productId))
      .returning();
    
    return updatedProduct || undefined;
  }

  // Team Chat operations
  async getTeamChatMessages(chatRoom: string = 'general', limit: number = 50): Promise<any[]> {
    const messages = await db
      .select({
        id: teamChat.id,
        senderId: teamChat.senderId,
        receiverId: teamChat.receiverId,
        message: teamChat.message,
        messageType: teamChat.messageType,
        isRead: teamChat.isRead,
        chatRoom: teamChat.chatRoom,
        metadata: teamChat.metadata,
        createdAt: teamChat.createdAt,
        senderName: sql<string>`${users.firstName} || ' ' || ${users.lastName}`,
        senderEmail: users.email,
        senderRole: users.role,
      })
      .from(teamChat)
      .leftJoin(users, eq(teamChat.senderId, users.id))
      .where(eq(teamChat.chatRoom, chatRoom))
      .orderBy(desc(teamChat.createdAt))
      .limit(limit);
    
    return messages.reverse(); // Return in chronological order
  }

  async getDirectMessages(userId: string, otherUserId: string, limit: number = 50): Promise<any[]> {
    const messages = await db
      .select({
        id: teamChat.id,
        senderId: teamChat.senderId,
        receiverId: teamChat.receiverId,
        message: teamChat.message,
        messageType: teamChat.messageType,
        isRead: teamChat.isRead,
        chatRoom: teamChat.chatRoom,
        metadata: teamChat.metadata,
        createdAt: teamChat.createdAt,
        senderName: sql<string>`${users.firstName} || ' ' || ${users.lastName}`,
        senderEmail: users.email,
        senderRole: users.role,
      })
      .from(teamChat)
      .leftJoin(users, eq(teamChat.senderId, users.id))
      .where(
        and(
          isNull(teamChat.chatRoom), // Direct messages have null chatRoom
          or(
            and(eq(teamChat.senderId, userId), eq(teamChat.receiverId, otherUserId)),
            and(eq(teamChat.senderId, otherUserId), eq(teamChat.receiverId, userId))
          )
        )
      )
      .orderBy(desc(teamChat.createdAt))
      .limit(limit);
    
    return messages.reverse(); // Return in chronological order
  }

  async sendTeamChatMessage(messageData: InsertTeamChat): Promise<TeamChat> {
    const [message] = await db.insert(teamChat).values(messageData).returning();
    return message;
  }

  async markTeamChatMessagesAsRead(userId: string, messageIds: number[]): Promise<void> {
    if (messageIds.length === 0) return;
    
    await db
      .update(teamChat)
      .set({ isRead: true })
      .where(and(
        eq(teamChat.receiverId, userId),
        sql`${teamChat.id} = ANY(${messageIds})`
      ));
  }

  async getActiveTeamMembers(): Promise<User[]> {
    const activeUsers = await db
      .select()
      .from(users)
      .where(eq(users.isActive, true))
      .orderBy(users.firstName);
    
    return activeUsers;
  }

  // Get team chat conversations (WhatsApp-style list) - Simplified version
  async getTeamChatConversations(userId: string): Promise<any[]> {
    // Get latest message for each room
    const roomMessages = await db
      .select()
      .from(teamChat)
      .leftJoin(users, eq(teamChat.senderId, users.id))
      .where(sql`${teamChat.chatRoom} is not null`)
      .orderBy(desc(teamChat.createdAt));

    // Get latest message for each DM
    const dmMessages = await db
      .select()
      .from(teamChat)
      .leftJoin(users, eq(teamChat.senderId, users.id))
      .where(and(
        isNull(teamChat.chatRoom),
        or(
          eq(teamChat.senderId, userId),
          eq(teamChat.receiverId, userId)
        )
      ))
      .orderBy(desc(teamChat.createdAt));

    // Process room conversations
    const roomConversations = new Map();
    roomMessages.forEach(row => {
      const room = row.team_chat.chatRoom!;
      if (!roomConversations.has(room)) {
        roomConversations.set(room, {
          id: room,
          type: 'room',
          name: room === 'general' ? 'Geral' : room === 'support' ? 'Suporte' : room === 'sales' ? 'Vendas' : room,
          lastMessage: row.team_chat.message,
          lastMessageTime: row.team_chat.createdAt,
          unreadCount: 0,
          senderName: row.users ? `${row.users.firstName} ${row.users.lastName}` : ''
        });
      }
    });

    // Process DM conversations
    const dmConversations = new Map();
    dmMessages.forEach(row => {
      const otherUserId = row.team_chat.senderId === userId ? row.team_chat.receiverId : row.team_chat.senderId;
      if (otherUserId && !dmConversations.has(otherUserId)) {
        dmConversations.set(otherUserId, {
          id: otherUserId,
          type: 'dm',
          name: row.users ? `${row.users.firstName} ${row.users.lastName}` : 'Usuário',
          lastMessage: row.team_chat.message,
          lastMessageTime: row.team_chat.createdAt,
          unreadCount: 0,
          senderName: row.team_chat.senderId === userId ? 'Você' : (row.users ? `${row.users.firstName} ${row.users.lastName}` : ''),
          profileImageUrl: row.users?.profileImageUrl,
          role: row.users?.role
        });
      }
    });

    // Combine all conversations
    const allConversations = [...Array.from(roomConversations.values()), ...Array.from(dmConversations.values())];
    
    // Sort by last message time
    return allConversations.sort((a, b) => new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime());
  }

  // Mark conversation as read
  async markTeamConversationAsRead(userId: string, conversationId: string, type: string): Promise<void> {
    if (type === 'room') {
      await db
        .update(teamChat)
        .set({ isRead: true })
        .where(and(
          eq(teamChat.chatRoom, conversationId),
          sql`${teamChat.senderId} != ${userId}` // Don't mark own messages
        ));
    } else if (type === 'dm') {
      await db
        .update(teamChat)
        .set({ isRead: true })
        .where(and(
          isNull(teamChat.chatRoom),
          eq(teamChat.receiverId, userId),
          eq(teamChat.senderId, conversationId)
        ));
    }
  }
}

export const storage = new DatabaseStorage();
