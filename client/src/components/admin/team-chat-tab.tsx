import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Send, Users, Clock, MessageCircle, Home } from 'lucide-react';
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
  const [selectedDM, setSelectedDM] = useState<string | null>(null);
  const [chatMode, setChatMode] = useState<'rooms' | 'dm'>('rooms');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const chatRooms = [
    { id: 'general', label: 'Geral', description: 'Chat geral da equipe', icon: '💬' },
    { id: 'support', label: 'Suporte', description: 'Discussões de suporte ao cliente', icon: '🆘' },
    { id: 'sales', label: 'Vendas', description: 'Estratégias e dicas de vendas', icon: '💰' }
  ];

  // Fetch team members
  const { data: teamMembers = [] } = useQuery<TeamMember[]>({
    queryKey: ['/api/team-chat/members'],
  });

  // Fetch chat messages
  const { data: messages = [], refetch: refetchMessages } = useQuery<ChatMessage[]>({
    queryKey: ['/api/team-chat/messages', chatMode === 'dm' ? `dm-${selectedDM}` : selectedRoom],
    queryFn: () => {
      const url = chatMode === 'dm' 
        ? `/api/team-chat/messages?receiverId=${selectedDM}&limit=50`
        : `/api/team-chat/messages?chatRoom=${selectedRoom}&limit=50`;
      return fetch(url).then(res => res.json());
    },
    enabled: chatMode === 'rooms' || (chatMode === 'dm' && selectedDM !== null),
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (messageData: any) => {
      const response = await apiRequest('POST', '/api/team-chat/messages', messageData);
      return response.json();
    },
    onSuccess: () => {
      setNewMessage('');
      const queryKey = chatMode === 'dm' ? `dm-${selectedDM}` : selectedRoom;
      queryClient.invalidateQueries({ queryKey: ['/api/team-chat/messages', queryKey] });
      refetchMessages();
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao enviar mensagem',
        description: 'Tente novamente em alguns segundos.',
        variant: 'destructive',
      });
    },
  });

  // Auto-refresh messages every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      refetchMessages();
    }, 5000);

    return () => clearInterval(interval);
  }, [refetchMessages]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;

    const messageData = {
      message: newMessage.trim(),
      messageType: 'text',
      ...(chatMode === 'dm' 
        ? { receiverId: selectedDM, chatRoom: null }
        : { chatRoom: selectedRoom, receiverId: null }
      )
    };

    sendMessageMutation.mutate(messageData);
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
    return new Date(timestamp).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
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

  const getSelectedMember = () => {
    return teamMembers.find(m => m.id === selectedDM);
  };

  const getCurrentChatTitle = () => {
    if (chatMode === 'rooms') {
      return chatRooms.find(r => r.id === selectedRoom)?.label || 'Geral';
    }
    if (selectedDM) {
      const member = getSelectedMember();
      return `${member?.firstName} ${member?.lastName}`;
    }
    return 'Mensagens Diretas';
  };

  const getCurrentChatDescription = () => {
    if (chatMode === 'rooms') {
      return chatRooms.find(r => r.id === selectedRoom)?.description || '';
    }
    if (selectedDM) {
      const member = getSelectedMember();
      return `Conversa privada • ${member?.role}`;
    }
    return 'Selecione uma pessoa para conversar';
  };

  return (
    <div className="h-full flex bg-gray-50">
      {/* Sidebar */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        {/* Mode Toggle */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setChatMode('rooms')}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                chatMode === 'rooms' 
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Home className="w-4 h-4" />
              Salas
            </button>
            <button
              onClick={() => setChatMode('dm')}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                chatMode === 'dm' 
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <MessageCircle className="w-4 h-4" />
              Diretas
            </button>
          </div>
        </div>

        {/* Chat Rooms or DM List */}
        {chatMode === 'rooms' ? (
          <div className="p-4 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-3">Salas de Chat</h3>
            <div className="space-y-1">
              {chatRooms.map((room) => (
                <button
                  key={room.id}
                  onClick={() => setSelectedRoom(room.id)}
                  className={`w-full text-left p-3 rounded-lg transition-colors ${
                    selectedRoom === room.id
                      ? 'bg-green-50 text-green-700 border border-green-200'
                      : 'bg-gray-50 hover:bg-gray-100 text-gray-700'
                  }`}
                >
                  <div className="font-medium text-sm flex items-center gap-2">
                    <span>{room.icon}</span>
                    {room.label}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">{room.description}</div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="p-4 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-3">Mensagens Diretas</h3>
            <div className="space-y-1">
              {teamMembers
                .filter(member => member.isActive && member.id !== user?.id)
                .map((member) => (
                  <button
                    key={member.id}
                    onClick={() => setSelectedDM(member.id)}
                    className={`w-full text-left p-3 rounded-lg transition-colors flex items-center gap-3 ${
                      selectedDM === member.id
                        ? 'bg-green-50 text-green-700 border border-green-200'
                        : 'bg-gray-50 hover:bg-gray-100 text-gray-700'
                    }`}
                  >
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={member.profileImageUrl || ''} />
                      <AvatarFallback className="text-xs">
                        {member.firstName?.[0]}{member.lastName?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">
                        {member.firstName} {member.lastName}
                      </div>
                      <Badge className={`text-xs ${getRoleColor(member.role)}`}>
                        {member.role}
                      </Badge>
                    </div>
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  </button>
                ))}
              {teamMembers.filter(m => m.isActive && m.id !== user?.id).length === 0 && (
                <div className="text-center py-4 text-gray-500">
                  <Users className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">Nenhum membro disponível</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Team Members (Always visible) */}
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
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                {chatMode === 'dm' && selectedDM && (
                  <Avatar className="w-6 h-6">
                    <AvatarImage src={getSelectedMember()?.profileImageUrl || ''} />
                    <AvatarFallback className="text-xs">
                      {getSelectedMember()?.firstName?.[0]}
                      {getSelectedMember()?.lastName?.[0]}
                    </AvatarFallback>
                  </Avatar>
                )}
                {getCurrentChatTitle()}
              </h2>
              <p className="text-sm text-gray-600">
                {getCurrentChatDescription()}
              </p>
            </div>
            <Badge variant="secondary">
              {messages.length} mensagens
            </Badge>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4" data-testid="chat-messages">
          {(chatMode === 'dm' && !selectedDM) ? (
            <div className="text-center py-12 text-gray-500">
              <MessageCircle className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="font-semibold mb-2">Mensagens Diretas</h3>
              <p>Selecione uma pessoa da lista para iniciar uma conversa privada.</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="font-semibold mb-2">Nenhuma mensagem ainda</h3>
              <p>Seja o primeiro a iniciar a conversa!</p>
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
                        className={`inline-block px-4 py-2 rounded-lg ${
                          isCurrentUser
                            ? 'bg-green-500 text-white'
                            : 'bg-white border border-gray-200 text-gray-900'
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap">{message.message}</p>
                        <div
                          className={`text-xs mt-1 ${
                            isCurrentUser ? 'text-green-100' : 'text-gray-500'
                          }`}
                        >
                          {formatTime(message.createdAt)}
                        </div>
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
        {(chatMode === 'rooms' || (chatMode === 'dm' && selectedDM)) && (
          <div className="p-4 border-t border-gray-200 bg-white">
            <div className="flex gap-3">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Digite sua mensagem..."
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
        )}
      </div>
    </div>
  );
}