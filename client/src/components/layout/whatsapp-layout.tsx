import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { AdminPanel } from "@/components/admin/admin-panel";
import { ChatList } from "@/components/chat/chat-list";
import { ChatConversation } from "@/components/chat/chat-conversation";

export function WhatsAppLayout() {
  const { user } = useAuth();
  const [selectedConversationId, setSelectedConversationId] = useState<number | null>(null);

  return (
    <div className="h-screen flex flex-col bg-whatsapp-bg font-whatsapp">
      {/* Navigation Header */}
      <div className="bg-whatsapp text-white px-3 sm:px-4 py-3 flex justify-between items-center">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <i className="fas fa-comments text-lg sm:text-xl flex-shrink-0"></i>
          <h1 className="text-sm sm:text-lg font-semibold truncate">
            <span className="hidden sm:inline">Sistema de Vendas WhatsApp - Autopeças Brasil</span>
            <span className="sm:hidden">MVPChat</span>
          </h1>
        </div>
        <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 sm:w-8 sm:h-8 bg-white/20 rounded-full flex items-center justify-center">
              {(user as any)?.profileImageUrl ? (
                <img
                  src={(user as any).profileImageUrl}
                  alt={(user as any)?.firstName || "Usuario"}
                  className="w-6 h-6 sm:w-8 sm:h-8 rounded-full object-cover"
                />
              ) : (
                <i className="fas fa-user text-xs sm:text-sm"></i>
              )}
            </div>
            <span className="text-xs sm:text-sm hidden sm:block">
              {(user as any)?.firstName ? `${(user as any).firstName} ${(user as any).lastName || ''}`.trim() : 'Usuário'}
            </span>
            {(user as any)?.role === 'admin' && (
              <span className="text-xs bg-white/20 px-1 sm:px-2 py-1 rounded hidden sm:inline">Admin</span>
            )}
          </div>
          <button 
            onClick={() => window.location.href = '/api/logout'}
            className="text-white/80 hover:text-white p-1"
          >
            <i className="fas fa-sign-out-alt text-sm"></i>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - Admin Panel */}
        <div className="hidden lg:block w-80 flex-shrink-0">
          <AdminPanel />
        </div>

        {/* Chat List Panel */}
        <div className="w-full sm:w-80 lg:w-80 flex-shrink-0 border-r border-border-light">
          <ChatList 
            selectedConversationId={selectedConversationId}
            onSelectConversation={setSelectedConversationId}
          />
        </div>

        {/* Chat Conversation Area */}
        <div className={`flex-1 ${selectedConversationId ? 'block' : 'hidden sm:block'}`}>
          <ChatConversation conversationId={selectedConversationId} />
        </div>

        {/* Mobile Admin Panel Toggle */}
        <div className="lg:hidden fixed bottom-4 right-4 z-50">
          <button className="bg-whatsapp text-white p-3 rounded-full shadow-lg">
            <i className="fas fa-cog"></i>
          </button>
        </div>
      </div>
    </div>
  );
}
