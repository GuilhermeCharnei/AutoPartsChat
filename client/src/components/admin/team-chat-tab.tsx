import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Send, Users, MessageCircle, Home, Check, CheckCheck, Circle, UserCheck } from 'lucide-react';
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
  chatRoom: string | null;
  createdAt: string;
  senderName: string;
  senderEmail: string;
  senderRole: string;
}

interface Conversation {
  id: string;
  type: 'room' | 'dm';
  name: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  senderName: string;
  profileImageUrl?: string;
  role?: string;
}

export function TeamChatTab() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [newMessage, setNewMessage] = useState('');
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const chatRooms = [
    { id: 'general', label: 'Geral', description: 'Chat geral da equipe', icon: '💬' },
    { id: 'support', label: 'Suporte', description: 'Discussões de suporte ao cliente', icon: '🆘' },
    { id: 'sales', label: 'Vendas', description: 'Estratégias e dicas de vendas', icon: '💰' }
  ];

  // Fetch conversations list (WhatsApp-style)
  const { data: conversations = [], refetch: refetchConversations } = useQuery<Conversation[]>({
    queryKey: ['/api/team-chat/conversations'],
    refetchInterval: 3000, // Refresh every 3 seconds
  });

  // Fetch team members
  const { data: teamMembers = [] } = useQuery<TeamMember[]>({
    queryKey: ['/api/team-chat/members'],
  });

  // Fetch chat messages for selected conversation
  const { data: messages = [], refetch: refetchMessages } = useQuery<ChatMessage[]>({
    queryKey: ['/api/team-chat/messages', selectedConversation?.type, selectedConversation?.id],
    queryFn: () => {
      if (!selectedConversation) return Promise.resolve([]);
      
      const url = selectedConversation.type === 'dm' 
        ? `/api/team-chat/messages?receiverId=${selectedConversation.id}&limit=50`
        : `/api/team-chat/messages?chatRoom=${selectedConversation.id}&limit=50`;
      return fetch(url).then(res => res.json());
    },
    enabled: !!selectedConversation,
    refetchInterval: 5000, // Refresh messages every 5 seconds
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (messageData: any) => {
      const response = await apiRequest('POST', '/api/team-chat/messages', messageData);
      return response.json();
    },
    onSuccess: () => {
      setNewMessage('');
      refetchMessages();
      refetchConversations(); // Update conversation list
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao enviar mensagem',
        description: 'Tente novamente em alguns segundos.',
        variant: 'destructive',
      });
    },
  });

  // Mark conversation as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async ({ conversationId, type }: { conversationId: string, type: string }) => {
      const response = await apiRequest('POST', `/api/team-chat/conversations/${conversationId}/read`, { type });
      return response.json();
    },
    onSuccess: () => {
      refetchConversations();
    },
  });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Mark conversation as read when selected
  useEffect(() => {
    if (selectedConversation && selectedConversation.unreadCount > 0) {
      markAsReadMutation.mutate({
        conversationId: selectedConversation.id,
        type: selectedConversation.type
      });
    }
  }, [selectedConversation]);

  const handleSendMessage = () => {
    if (!newMessage.trim() || !selectedConversation) return;

    const messageData = {
      message: newMessage.trim(),
      messageType: 'text',
      ...(selectedConversation.type === 'dm' 
        ? { receiverId: selectedConversation.id, chatRoom: null }
        : { chatRoom: selectedConversation.id, receiverId: null }
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
    const now = new Date();
    const messageDate = new Date(timestamp);
    
    if (now.toDateString() === messageDate.toDateString()) {
      return messageDate.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit'
      });
    } else {
      return messageDate.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit'
      });
    }
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

  const getConversationIcon = (conversation: Conversation) => {
    if (conversation.type === 'room') {
      const room = chatRooms.find(r => r.id === conversation.id);
      return room?.icon || '💬';
    }
    return null;
  };

  // Add conversations for rooms that don't have messages yet
  const allConversations = [
    ...conversations,
    ...chatRooms
      .filter(room => !conversations.find(c => c.id === room.id && c.type === 'room'))
      .map(room => ({
        id: room.id,
        type: 'room' as const,
        name: room.label,
        lastMessage: 'Nenhuma mensagem ainda',
        lastMessageTime: new Date().toISOString(),
        unreadCount: 0,
        senderName: '',
      }))
  ];

  return (
    <div className="h-full flex bg-white">
      {/* Conversations List (WhatsApp-style) */}
      <div className="w-80 border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <MessageCircle className="w-5 h-5" />
            Chat da Equipe
          </h2>
          <p className="text-sm text-gray-600">
            {conversations.length} conversas ativas
          </p>
        </div>

        {/* Tabs for Conversations and Team Contacts */}
        <Tabs defaultValue="conversations" className="flex-1 flex flex-col">
          <TabsList className="grid w-full grid-cols-2 bg-gray-100 mx-4 mt-2">
            <TabsTrigger value="conversations" className="text-xs">Conversas</TabsTrigger>
            <TabsTrigger value="contacts" className="text-xs">Contatos</TabsTrigger>
          </TabsList>

          {/* Conversations Tab */}
          <TabsContent value="conversations" className="flex-1 flex flex-col mt-0">
            <div className="flex-1 overflow-y-auto">
              {allConversations
                .sort((a, b) => new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime())
                .map((conversation) => (
                <button
                  key={`${conversation.type}-${conversation.id}`}
                  onClick={() => setSelectedConversation(conversation)}
                  className={`w-full p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors text-left ${
                    selectedConversation?.id === conversation.id && selectedConversation?.type === conversation.type
                      ? 'bg-green-50 border-l-4 border-l-green-500'
                      : ''
                  }`}
                  data-testid={`conversation-${conversation.type}-${conversation.id}`}
                >
                  <div className="flex items-center gap-3">
                    {/* Avatar */}
                    {conversation.type === 'dm' ? (
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={conversation.profileImageUrl || ''} />
                        <AvatarFallback className="bg-gray-200">
                          {conversation.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                    ) : (
                      <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-lg">
                        {getConversationIcon(conversation)}
                      </div>
                    )}

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-medium text-gray-900 truncate">
                          {conversation.name}
                          {conversation.role && (
                            <Badge className={`ml-2 text-xs ${getRoleColor(conversation.role)}`}>
                              {conversation.role}
                            </Badge>
                          )}
                        </h3>
                        <span className="text-xs text-gray-500">
                          {formatTime(conversation.lastMessageTime)}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-gray-600 truncate">
                          {conversation.senderName && (
                            <span className="font-medium">{conversation.senderName}: </span>
                          )}
                          {conversation.lastMessage || 'Nenhuma mensagem ainda'}
                        </p>
                        
                        {conversation.unreadCount > 0 && (
                          <Badge className="bg-green-500 text-white text-xs min-w-[20px] h-5 rounded-full flex items-center justify-center">
                            {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
              
              {allConversations.length === 0 && (
                <div className="p-8 text-center text-gray-500">
                  <MessageCircle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>Nenhuma conversa ainda</p>
                  <p className="text-sm mt-1">Envie uma mensagem para começar</p>
                </div>
              )}
            </div>

            {/* Quick Add Room buttons */}
            <div className="p-4 border-t border-gray-200 bg-gray-50">
              <div className="grid grid-cols-3 gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const generalRoom = allConversations.find(c => c.id === 'general' && c.type === 'room');
                    if (generalRoom) setSelectedConversation(generalRoom);
                  }}
                  className="text-xs"
                  data-testid="button-room-general"
                >
                  🏠 Geral
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const supportRoom = allConversations.find(c => c.id === 'support' && c.type === 'room');
                    if (supportRoom) setSelectedConversation(supportRoom);
                  }}
                  className="text-xs"
                  data-testid="button-room-support"
                >
                  🆘 Suporte
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const salesRoom = allConversations.find(c => c.id === 'sales' && c.type === 'room');
                    if (salesRoom) setSelectedConversation(salesRoom);
                  }}
                  className="text-xs"
                  data-testid="button-room-sales"
                >
                  💰 Vendas
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* Team Contacts Tab */}
          <TabsContent value="contacts" className="flex-1 flex flex-col mt-0">
            <div className="flex-1 overflow-y-auto">
              <div className="p-3 bg-gray-50 border-b">
                <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Equipe ({teamMembers.filter(m => m.id !== user?.id).length} membros)
                </h3>
              </div>

              {teamMembers
                .filter(member => member.id !== user?.id) // Don't show current user
                .sort((a, b) => {
                  // Sort by role priority, then by name
                  const roleOrder = { 'administrador': 0, 'gerente': 1, 'vendedor': 2, 'dev': 3 };
                  const aOrder = roleOrder[a.role as keyof typeof roleOrder] ?? 99;
                  const bOrder = roleOrder[b.role as keyof typeof roleOrder] ?? 99;
                  if (aOrder !== bOrder) return aOrder - bOrder;
                  return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
                })
                .map((member) => (
                <button
                  key={member.id}
                  onClick={() => {
                    const dmConversation: Conversation = {
                      id: member.id,
                      type: 'dm',
                      name: `${member.firstName} ${member.lastName}`,
                      lastMessage: '',
                      lastMessageTime: new Date().toISOString(),
                      unreadCount: 0,
                      senderName: '',
                      profileImageUrl: member.profileImageUrl,
                      role: member.role
                    };
                    setSelectedConversation(dmConversation);
                  }}
                  className="w-full p-3 border-b border-gray-100 hover:bg-gray-50 transition-colors text-left"
                  data-testid={`contact-${member.id}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={member.profileImageUrl || ''} />
                        <AvatarFallback className="bg-gray-200">
                          {`${member.firstName} ${member.lastName}`.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      {/* Online status indicator */}
                      <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${
                        member.isActive ? 'bg-green-500' : 'bg-gray-400'
                      }`} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-gray-900 truncate">
                          {member.firstName} {member.lastName}
                        </h4>
                        <Badge className={`text-xs ${getRoleColor(member.role)}`}>
                          {member.role}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 truncate">
                        {member.email} • {member.isActive ? 'Online' : 'Offline'}
                      </p>
                    </div>
                  </div>
                </button>
              ))}

              {teamMembers.filter(m => m.id !== user?.id).length === 0 && (
                <div className="p-8 text-center text-gray-500">
                  <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>Nenhum membro da equipe</p>
                  <p className="text-sm mt-1">Aguarde outros membros se conectarem</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center gap-3">
                {selectedConversation.type === 'dm' ? (
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={selectedConversation.profileImageUrl || ''} />
                    <AvatarFallback>
                      {selectedConversation.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                ) : (
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-lg">
                    {getConversationIcon(selectedConversation)}
                  </div>
                )}
                
                <div>
                  <h2 className="font-semibold text-gray-900">
                    {selectedConversation.name}
                  </h2>
                  <p className="text-sm text-gray-600">
                    {selectedConversation.type === 'dm' 
                      ? `${selectedConversation.role} • Online`
                      : chatRooms.find(r => r.id === selectedConversation.id)?.description || 'Sala de chat'
                    }
                  </p>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50" data-testid="chat-messages">
              {messages.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <MessageCircle className="w-16 h-16 mx-auto mb-4 text-gray-300" />
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
                          <span className="text-xs text-gray-500 bg-white px-3 py-1 rounded-full shadow-sm">
                            {formatDate(message.createdAt)}
                          </span>
                        </div>
                      )}
                      
                      <div className={`flex gap-3 ${isCurrentUser ? 'flex-row-reverse' : ''}`}>
                        {!isCurrentUser && (
                          <Avatar className="w-8 h-8">
                            <AvatarFallback className="text-xs bg-gray-200">
                              {message.senderName.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                        )}
                        
                        <div className={`max-w-md ${isCurrentUser ? 'text-right' : ''}`}>
                          {!isCurrentUser && selectedConversation.type === 'room' && (
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
                            className={`inline-block px-4 py-2 rounded-2xl shadow-sm ${
                              isCurrentUser
                                ? 'bg-green-500 text-white rounded-br-md'
                                : 'bg-white text-gray-900 rounded-bl-md'
                            }`}
                          >
                            <p className="text-sm whitespace-pre-wrap">{message.message}</p>
                            <div
                              className={`text-xs mt-1 flex items-center gap-1 ${
                                isCurrentUser ? 'text-green-100 justify-end' : 'text-gray-500'
                              }`}
                            >
                              <span>{formatTime(message.createdAt)}</span>
                              {isCurrentUser && (
                                message.isRead ? <CheckCheck className="w-3 h-3" /> : <Check className="w-3 h-3" />
                              )}
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
            <div className="p-4 border-t border-gray-200 bg-white">
              <div className="flex gap-3">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder={`Mensagem para ${selectedConversation.name}...`}
                  className="flex-1"
                  data-testid="input-message"
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim() || sendMessageMutation.isPending}
                  className="bg-green-500 hover:bg-green-600"
                  data-testid="button-send"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          /* No conversation selected */
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center text-gray-500 max-w-md">
              <MessageCircle className="w-20 h-20 mx-auto mb-6 text-gray-300" />
              <h2 className="text-2xl font-semibold mb-4 text-gray-700">Chat da Equipe</h2>
              <p className="text-lg mb-6">Selecione uma conversa para começar a trocar mensagens</p>
              <div className="grid grid-cols-2 gap-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    const generalRoom = allConversations.find(c => c.id === 'general' && c.type === 'room');
                    if (generalRoom) setSelectedConversation(generalRoom);
                  }}
                >
                  🏠 Chat Geral
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    const availableMember = teamMembers.find(m => m.id !== user?.id && m.isActive);
                    if (availableMember) {
                      const dmConversation: Conversation = {
                        id: availableMember.id,
                        type: 'dm',
                        name: `${availableMember.firstName} ${availableMember.lastName}`,
                        lastMessage: '',
                        lastMessageTime: new Date().toISOString(),
                        unreadCount: 0,
                        senderName: '',
                        profileImageUrl: availableMember.profileImageUrl,
                        role: availableMember.role
                      };
                      setSelectedConversation(dmConversation);
                    }
                  }}
                >
                  💬 Mensagem Direta
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}