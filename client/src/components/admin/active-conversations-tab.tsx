import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MessageCircle, Search, Clock } from 'lucide-react';
import { ChatConversation } from '@/components/chat/chat-conversation';
import { ResizableDivider } from '@/components/ui/resizable-divider';

export function ActiveConversationsTab() {
  const [selectedConversationId, setSelectedConversationId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const { data: conversations = [], isLoading } = useQuery({
    queryKey: ['/api/conversations'],
    refetchInterval: 5000,
  });

  const filteredConversations = (conversations as any[]).filter(conversation =>
    conversation.customerName.toLowerCase().includes(searchTerm.toLowerCase()) &&
    conversation.status === 'active'
  );

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'waiting': return 'bg-yellow-100 text-yellow-800';
      case 'resolved': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-whatsapp border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const conversationsList = (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center gap-3 mb-4">
          <MessageCircle className="w-6 h-6 text-green-600" />
          <h2 className="text-lg font-semibold text-gray-900">Conversas Ativas</h2>
          <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
            {filteredConversations.length}
          </span>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Pesquisar conversas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto">
        {filteredConversations.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm">Nenhuma conversa ativa encontrada</p>
          </div>
        ) : (
          filteredConversations.map((conversation) => (
            <div
              key={conversation.id}
              onClick={() => setSelectedConversationId(conversation.id)}
              className={`p-4 border-b border-gray-100 cursor-pointer transition-colors hover:bg-gray-50 ${
                selectedConversationId === conversation.id ? 'bg-green-50 border-l-4 border-l-green-500' : ''
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium text-gray-900 truncate">
                      {conversation.customerName}
                    </h3>
                    <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(conversation.status)}`}>
                      {conversation.status === 'active' ? 'Ativa' : 
                       conversation.status === 'waiting' ? 'Aguardando' : 'Resolvida'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 truncate">
                    {conversation.customerPhone}
                  </p>
                  <p className="text-xs text-gray-500 mt-1 truncate">
                    {conversation.lastMessage || 'Sem mensagens'}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0 ml-3">
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <Clock className="w-3 h-3" />
                    {formatTime(conversation.updatedAt)}
                  </div>
                  {conversation.unreadCount > 0 && (
                    <span className="bg-green-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                      {conversation.unreadCount}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  const chatArea = selectedConversationId ? (
    <ChatConversation conversationId={selectedConversationId} />
  ) : (
    <div className="h-full flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <MessageCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Selecione uma conversa</h3>
        <p className="text-gray-600">Escolha uma conversa ativa para visualizar as mensagens</p>
      </div>
    </div>
  );

  return (
    <div className="h-[calc(100vh-200px)]">
      <ResizableDivider
        leftPanel={conversationsList}
        rightPanel={chatArea}
        defaultLeftWidth={35}
        minLeftWidth={25}
        maxLeftWidth={60}
        className="h-full"
      />
    </div>
  );
}