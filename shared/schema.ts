import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  integer,
  decimal,
  boolean,
  serial,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table.
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table.
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role").default("vendedor"), // dev, administrador, vendedor
  permissions: jsonb("permissions").default({}),
  phone: varchar("phone"),
  companyName: varchar("company_name"),
  companyAddress: varchar("company_address"),
  companyDescription: varchar("company_description"),
  systemName: varchar("system_name").default("Sistema de Vendas WhatsApp - Autopeças Brasil"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Products/Inventory table
export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 100 }),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  stock: integer("stock").notNull().default(0),
  sku: varchar("sku", { length: 100 }).unique(),
  brand: varchar("brand", { length: 100 }),
  vehicleModel: varchar("vehicle_model", { length: 100 }),
  vehicleYear: varchar("vehicle_year", { length: 20 }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Chat conversations
export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  customerName: varchar("customer_name", { length: 255 }).notNull(),
  customerPhone: varchar("customer_phone", { length: 20 }),
  customerAvatar: varchar("customer_avatar"),
  status: varchar("status").notNull().default("active"), // active, closed, waiting
  assignedUserId: varchar("assigned_user_id").references(() => users.id),
  lastMessageAt: timestamp("last_message_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Chat messages
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull().references(() => conversations.id),
  senderId: varchar("sender_id"), // null for customer messages, user id for bot/seller
  senderType: varchar("sender_type").notNull(), // customer, bot, seller
  content: text("content").notNull(),
  messageType: varchar("message_type").notNull().default("text"), // text, product, image
  metadata: jsonb("metadata"), // for product cards, attachments, etc
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Orders
export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").references(() => conversations.id),
  sellerId: varchar("seller_id").references(() => users.id),
  customerName: varchar("customer_name", { length: 255 }).notNull(),
  customerPhone: varchar("customer_phone", { length: 20 }),
  items: jsonb("items").notNull(), // [{productId, quantity, price, name}]
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  status: varchar("status").notNull().default("pending"), // pending, confirmed, delivered, cancelled
  paymentStatus: varchar("payment_status").notNull().default("pending"), // pending, paid, failed
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  conversations: many(conversations),
  orders: many(orders),
}));

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  assignedUser: one(users, {
    fields: [conversations.assignedUserId],
    references: [users.id],
  }),
  messages: many(messages),
  order: one(orders),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
}));

export const ordersRelations = relations(orders, ({ one }) => ({
  conversation: one(conversations, {
    fields: [orders.conversationId],
    references: [conversations.id],
  }),
  seller: one(users, {
    fields: [orders.sellerId],
    references: [users.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true, updatedAt: true });
export const insertProductSchema = createInsertSchema(products).omit({ id: true, createdAt: true, updatedAt: true });
export const insertConversationSchema = createInsertSchema(conversations).omit({ id: true, createdAt: true, updatedAt: true });
export const insertMessageSchema = createInsertSchema(messages).omit({ id: true, createdAt: true });
export const insertOrderSchema = createInsertSchema(orders).omit({ id: true, createdAt: true, updatedAt: true });

// OpenAI Configuration (separated from WhatsApp)
export const openaiConfig = pgTable("openai_config", {
  id: serial("id").primaryKey(),
  apiKey: varchar("api_key"),
  model: varchar("model").default("gpt-4o"),
  maxTokens: integer("max_tokens").default(1000),
  temperature: decimal("temperature", { precision: 3, scale: 2 }).default("0.7"),
  systemPrompt: text("system_prompt"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// System conversations for internal users (including bot conversation)
export const systemConversations = pgTable("system_conversations", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(), // "IA Assistant", "Bot Consultas", etc.
  type: varchar("type").notNull(), // "bot", "internal", "support"
  description: text("description"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// WhatsApp Configuration
export const whatsappConfig = pgTable("whatsapp_config", {
  id: serial("id").primaryKey(),
  apiKey: varchar("api_key"),
  phoneNumber: varchar("phone_number"),
  companyName: varchar("company_name"),
  welcomeMessage: text("welcome_message"),
  awayMessage: text("away_message"),
  workingHours: jsonb("working_hours"), // {start: "09:00", end: "18:00", days: ["mon", "tue"...]}
  isActive: boolean("is_active").default(true),
  bot: jsonb("bot").default({}), // Bot configuration
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Additional insert schemas
export const insertOpenAIConfigSchema = createInsertSchema(openaiConfig).omit({ id: true, createdAt: true, updatedAt: true });
export const insertSystemConversationSchema = createInsertSchema(systemConversations).omit({ id: true, createdAt: true, updatedAt: true });
export const insertWhatsAppConfigSchema = createInsertSchema(whatsappConfig).omit({ id: true, createdAt: true, updatedAt: true });

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Order = typeof orders.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type OpenAIConfig = typeof openaiConfig.$inferSelect;
export type InsertOpenAIConfig = z.infer<typeof insertOpenAIConfigSchema>;
export type SystemConversation = typeof systemConversations.$inferSelect;
export type InsertSystemConversation = z.infer<typeof insertSystemConversationSchema>;
export type WhatsAppConfig = typeof whatsappConfig.$inferSelect;
export type InsertWhatsAppConfig = z.infer<typeof insertWhatsAppConfigSchema>;
