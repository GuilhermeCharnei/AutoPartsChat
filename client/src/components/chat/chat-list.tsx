import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Conversation } from "@shared/schema";
import { useState } from "react";

interface ChatListProps {
  selectedConversationId: number | null;
  onSelectConversation: (id: number) => void;
}

export function ChatList({ selectedConversationId, onSelectConversation }: ChatListProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const { data: conversations = [], isLoading } = useQuery<Conversation[]>({
    queryKey: ['/api/conversations'],
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  const filteredConversations = conversations.filter(conversation =>
    conversation.customerName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="w-96 bg-white border-r border-border-light flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-whatsapp border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="w-96 bg-white border-r border-border-light flex flex-col">
      {/* Chat List Header */}
      <div className="bg-whatsapp-panel p-4 border-b border-border-light">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-text-primary">Conversas Ativas</h2>
          <button className="text-text-secondary hover:text-text-primary">
            <i className="fas fa-ellipsis-v"></i>
          </button>
        </div>
        
        {/* Search Bar */}
        <div className="relative">
          <Input
            type="text"
            placeholder="Pesquisar conversas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-whatsapp-bg border-none"
          />
          <i className="fas fa-search absolute left-3 top-2.5 text-text-secondary text-sm"></i>
        </div>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {filteredConversations.length === 0 ? (
          <div className="p-4 text-center text-text-secondary">
            <i className="fas fa-comments text-2xl mb-2"></i>
            <p>Nenhuma conversa encontrada</p>
          </div>
        ) : (
          filteredConversations.map((conversation) => (
            <div
              key={conversation.id}
              onClick={() => onSelectConversation(conversation.id)}
              className={`p-3 border-b border-border-light cursor-pointer transition-colors ${
                selectedConversationId === conversation.id
                  ? 'bg-whatsapp-light'
                  : 'hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-3">
                {conversation.customerAvatar ? (
                  <img
                    src={conversation.customerAvatar}
                    alt={conversation.customerName}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                    <i className="fas fa-user text-gray-400"></i>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-semibold text-text-primary truncate">
                      {conversation.customerName}
                    </h3>
                    <span className="text-xs text-text-secondary">
                      {conversation.lastMessageAt && new Date(conversation.lastMessageAt).toLocaleTimeString('pt-BR', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-text-secondary truncate">
                      {conversation.status === 'active' ? 'Conversa ativa...' : 'Finalizada'}
                    </p>
                    {conversation.status === 'active' && (
                      <div className="w-5 h-5 bg-whatsapp rounded-full flex items-center justify-center">
                        <span className="text-xs text-white font-bold">•</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
