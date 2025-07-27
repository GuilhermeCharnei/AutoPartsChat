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
      <div className="bg-whatsapp text-white p-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <i className="fas fa-comments text-xl"></i>
          <h1 className="text-lg font-semibold">Sistema de Vendas WhatsApp - Autopeças Brasil</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
              {(user as any)?.profileImageUrl ? (
                <img
                  src={(user as any).profileImageUrl}
                  alt={(user as any)?.firstName || "Usuario"}
                  className="w-8 h-8 rounded-full object-cover"
                />
              ) : (
                <i className="fas fa-user text-sm"></i>
              )}
            </div>
            <span className="text-sm">
              {(user as any)?.firstName ? `${(user as any).firstName} ${(user as any).lastName || ''}`.trim() : 'Usuário'}
            </span>
            {(user as any)?.role === 'admin' && (
              <span className="text-xs bg-white/20 px-2 py-1 rounded">Admin</span>
            )}
          </div>
          <button 
            onClick={() => window.location.href = '/api/logout'}
            className="text-white/80 hover:text-white"
          >
            <i className="fas fa-sign-out-alt"></i>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - Admin Panel */}
        <AdminPanel />

        {/* Chat List Panel */}
        <ChatList 
          selectedConversationId={selectedConversationId}
          onSelectConversation={setSelectedConversationId}
        />

        {/* Chat Conversation Area */}
        <ChatConversation conversationId={selectedConversationId} />
      </div>
    </div>
  );
}
