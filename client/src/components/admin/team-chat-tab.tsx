import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Send, Users, Clock } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface TeamMember {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  profileImageUrl?: string;
  role: string;
  isActive: boolean;
}

interface ChatMessage {
  id: number;
  senderId: string;
  receiverId?: string;
  message: string;
  messageType: string;
  isRead: boolean;
  chatRoom: string;
  createdAt: string;
  senderName: string;
  senderEmail: string;
  senderRole: string;
}

export function TeamChatTab() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [newMessage, setNewMessage] = useState('');
  const [selectedRoom, setSelectedRoom] = useState('general');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const chatRooms = [
    { id: 'general', label: 'Geral', description: 'Chat geral da equipe' },
    { id: 'support', label: 'Suporte', description: 'Discussões de suporte ao cliente' },
    { id: 'sales', label: 'Vendas', description: 'Estratégias e dicas de vendas' }
  ];

  // Fetch team members
  const { data: teamMembers = [] } = useQuery<TeamMember[]>({
    queryKey: ['/api/team-chat/members'],
  });

  // Fetch chat messages
  const { data: messages = [], refetch: refetchMessages } = useQuery<ChatMessage[]>({
    queryKey: ['/api/team-chat/messages', selectedRoom],
    queryFn: () => 
      fetch(`/api/team-chat/messages?chatRoom=${selectedRoom}&limit=50`)
        .then(res => res.json()),
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (messageData: any) => {
      const response = await apiRequest('POST', '/api/team-chat/messages', messageData);
      return response.json();
    },
    onSuccess: () => {
      setNewMessage('');
      queryClient.invalidateQueries({ queryKey: ['/api/team-chat/messages', selectedRoom] });
      refetchMessages();
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao enviar mensagem",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-refresh messages every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      refetchMessages();
    }, 5000);
    
    return () => clearInterval(interval);
  }, [refetchMessages]);

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;

    sendMessageMutation.mutate({
      message: newMessage.trim(),
      chatRoom: selectedRoom,
      messageType: 'text',
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString('pt-BR');
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'dev': return 'bg-purple-100 text-purple-800';
      case 'administrador': return 'bg-red-100 text-red-800';
      case 'gerente': return 'bg-blue-100 text-blue-800';
      case 'vendedor': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="h-full flex">
      {/* Sidebar with rooms and team members */}
      <div className="w-80 border-r border-gray-200 flex flex-col">
        {/* Chat Rooms */}
        <div className="p-4 border-b border-gray-200">
          <h3 className="font-semibold text-sm text-gray-900 mb-3">Salas de Chat</h3>
          <div className="space-y-2">
            {chatRooms.map((room) => (
              <button
                key={room.id}
                onClick={() => setSelectedRoom(room.id)}
                className={`w-full text-left p-3 rounded-lg transition-colors ${
                  selectedRoom === room.id
                    ? 'bg-blue-50 border border-blue-200 text-blue-900'
                    : 'bg-gray-50 hover:bg-gray-100 text-gray-700'
                }`}
              >
                <div className="font-medium text-sm">{room.label}</div>
                <div className="text-xs text-gray-500 mt-1">{room.description}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Team Members */}
        <div className="flex-1 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-4 h-4 text-gray-600" />
            <h3 className="font-semibold text-sm text-gray-900">
              Equipe Online ({teamMembers.filter(m => m.isActive).length})
            </h3>
          </div>
          <div className="space-y-2">
            {teamMembers
              .filter(member => member.isActive)
              .map((member) => (
                <div key={member.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={member.profileImageUrl || ''} />
                    <AvatarFallback className="text-xs">
                      {member.firstName?.[0]}{member.lastName?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-gray-900 truncate">
                      {member.firstName} {member.lastName}
                      {user && member.id === user.id && ' (Você)'}
                    </div>
                    <Badge className={`text-xs ${getRoleColor(member.role)}`}>
                      {member.role}
                    </Badge>
                  </div>
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Chat Header */}
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-gray-900">
                {chatRooms.find(r => r.id === selectedRoom)?.label}
              </h2>
              <p className="text-sm text-gray-600">
                {chatRooms.find(r => r.id === selectedRoom)?.description}
              </p>
            </div>
            <Badge variant="secondary">
              {messages.length} mensagens
            </Badge>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4" data-testid="chat-messages">
          {messages.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>Nenhuma mensagem ainda.</p>
              <p className="text-sm">Seja o primeiro a iniciar a conversa!</p>
            </div>
          ) : (
            messages.map((message, index) => {
              const isCurrentUser = user && message.senderId === user.id;
              const showDate = index === 0 || 
                formatDate(messages[index - 1].createdAt) !== formatDate(message.createdAt);
              
              return (
                <div key={message.id}>
                  {showDate && (
                    <div className="text-center py-2">
                      <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                        {formatDate(message.createdAt)}
                      </span>
                    </div>
                  )}
                  
                  <div className={`flex gap-3 ${isCurrentUser ? 'flex-row-reverse' : ''}`}>
                    {!isCurrentUser && (
                      <Avatar className="w-8 h-8">
                        <AvatarFallback className="text-xs">
                          {message.senderName.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    
                    <div className={`flex-1 max-w-md ${isCurrentUser ? 'text-right' : ''}`}>
                      {!isCurrentUser && (
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm text-gray-900">
                            {message.senderName}
                          </span>
                          <Badge className={`text-xs ${getRoleColor(message.senderRole)}`}>
                            {message.senderRole}
                          </Badge>
                        </div>
                      )}
                      
                      <div
                        className={`inline-block p-3 rounded-lg text-sm ${
                          isCurrentUser
                            ? 'bg-blue-600 text-white'
                            : 'bg-white border border-gray-200 text-gray-900'
                        }`}
                      >
                        {message.message}
                      </div>
                      
                      <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                        <Clock className="w-3 h-3" />
                        {formatTime(message.createdAt)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Digite sua mensagem..."
              disabled={sendMessageMutation.isPending}
              className="flex-1"
              data-testid="input-message"
            />
            <Button
              onClick={handleSendMessage}
              disabled={!newMessage.trim() || sendMessageMutation.isPending}
              data-testid="button-send"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Pressione Enter para enviar, Shift+Enter para nova linha
          </p>
        </div>
      </div>
    </div>
  );
}