# WhatsApp Auto Parts Sales System - Architecture Documentation

## Overview

This is a full-stack web application for automating sales through WhatsApp for an auto parts store. The system features a WhatsApp Web-inspired interface with real-time chat capabilities, administrative controls, inventory management, and user role management. The application is built with a modern React frontend and Express.js backend, using PostgreSQL for data persistence.

## User Preferences

Preferred communication style: Simple, everyday language.

### Recent User Requests (January 2025)
- Implemented resizable divider functionality between conversation list and chat area
- Added "Conversas Ativas" (Active Conversations) dedicated tab in admin panel
- Enhanced layout flexibility with toggle between fixed and resizable layouts
- Created dedicated Dashboard tab with comprehensive metrics and performance indicators
- Separated dashboard analytics from conversation management for better organization
- Redesigned admin panel with clean sidebar navigation and improved layout structure
- Added comprehensive admin functions: profile management, company settings, bot configuration
- Created WhatsApp API setup configuration tab for bot functionality
- Implemented user permission management system with role-based access control
- Added profile settings with company information and photo upload capabilities

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and optimized builds
- **UI Framework**: Radix UI components with shadcn/ui design system
- **Styling**: Tailwind CSS with custom WhatsApp-themed color variables
- **State Management**: TanStack Query (React Query) for server state
- **Routing**: Wouter for lightweight client-side routing
- **Forms**: React Hook Form with Zod validation

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Database ORM**: Drizzle ORM for type-safe database operations
- **Authentication**: OpenID Connect with Replit Auth integration
- **Session Management**: Express sessions with PostgreSQL storage
- **File Upload**: Multer for Excel file processing
- **Real-time Communication**: WebSocket support for live chat updates

### Database Design
- **Primary Database**: PostgreSQL via Neon serverless
- **ORM**: Drizzle ORM with schema-first approach
- **Migration Strategy**: Drizzle Kit for schema migrations
- **Connection Pooling**: Neon serverless connection pooling

## Key Components

### Authentication & Authorization
- **Provider**: Replit OpenID Connect integration
- **Session Storage**: PostgreSQL-backed sessions using connect-pg-simple
- **Role-based Access**: Admin and Seller roles with granular permissions
- **Security**: HTTP-only cookies, CSRF protection, secure session management

### Real-time Chat System
- **Interface**: WhatsApp Web-inspired UI with chat bubbles and conversation list
- **Message Types**: Support for customer, bot, and seller messages
- **Real-time Updates**: Polling-based updates every 2-5 seconds for messages and conversations
- **Message Status**: Read/unread status tracking and visual indicators

### Inventory Management
- **Excel Integration**: Upload Excel spreadsheets to bulk update product inventory
- **Manual CRUD**: Individual product creation, editing, and deletion
- **Stock Tracking**: Automatic stock decrementation on sales
- **Product Search**: Real-time search functionality across product catalog

### User Management
- **Role Assignment**: Admin and Seller role management
- **Permission System**: Checkbox-based granular permissions (view stock, edit products, view reports)
- **User Profiles**: Integration with Replit user profiles and avatars

### Administrative Dashboard
- **Multi-tab Interface**: Users, Inventory, and Reports sections
- **Real-time Statistics**: Sales metrics, active conversations, and inventory levels
- **User Permission Management**: Dynamic permission updates for sellers

## Data Flow

### Chat Message Flow
1. Customer messages received via WhatsApp integration (planned)
2. Bot processes initial customer queries and product searches
3. Complex queries transferred to human sellers
4. Sellers receive real-time notifications of new conversations
5. Sellers can view full conversation history and respond
6. Messages stored in PostgreSQL with proper threading

### Inventory Update Flow
1. Admin uploads Excel file through web interface
2. Multer processes file upload to memory
3. XLSX library parses spreadsheet data
4. Batch database operations update product inventory
5. Real-time UI updates reflect new inventory levels
6. Error handling reports parsing failures

### Authentication Flow
1. User initiates login via Replit OAuth
2. OpenID Connect handles authentication
3. User profile data synchronized with local database
4. Role-based permissions applied to UI elements
5. Session maintained across browser refreshes

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: PostgreSQL database connection
- **drizzle-orm**: Type-safe ORM for database operations
- **@tanstack/react-query**: Server state management
- **@radix-ui/***: Accessible UI component primitives
- **tailwindcss**: Utility-first CSS framework

### Authentication & Security
- **openid-client**: OpenID Connect authentication
- **passport**: Authentication middleware
- **express-session**: Session management
- **connect-pg-simple**: PostgreSQL session store

### File Processing
- **multer**: Multipart form data handling
- **xlsx**: Excel file parsing and processing

### Development Tools
- **vite**: Build tool and development server
- **typescript**: Type safety across the stack
- **tsx**: TypeScript execution for development

## Deployment Strategy

### Build Process
1. **Frontend Build**: Vite builds React application to `dist/public`
2. **Backend Build**: esbuild bundles Express server to `dist/index.js`
3. **Database Migration**: Drizzle Kit applies schema changes
4. **Asset Optimization**: Vite optimizes static assets and code splitting

### Environment Configuration
- **DATABASE_URL**: Neon PostgreSQL connection string
- **SESSION_SECRET**: Secure session encryption key
- **REPLIT_DOMAINS**: Allowed domains for OAuth
- **ISSUER_URL**: OpenID Connect provider endpoint

### Production Considerations
- **Static File Serving**: Express serves Vite-built React application
- **Error Handling**: Centralized error middleware with proper status codes
- **Logging**: Request/response logging for API endpoints
- **Security Headers**: CORS, session security, and CSRF protection

### Development Features
- **Hot Module Replacement**: Vite HMR for instant frontend updates
- **Runtime Error Overlay**: Development error reporting
- **Database Synchronization**: Real-time schema syncing during development
- **TypeScript Compilation**: Incremental compilation for fast feedback