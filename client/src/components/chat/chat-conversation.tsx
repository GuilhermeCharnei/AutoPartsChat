import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Message, Conversation } from "@shared/schema";
import { MessageBubble } from "./message-bubble";

interface ChatConversationProps {
  conversationId: number | null;
}

export function ChatConversation({ conversationId }: ChatConversationProps) {
  const [messageText, setMessageText] = useState("");
  const [ws, setWs] = useState<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const { data: conversation } = useQuery<Conversation>({
    queryKey: ['/api/conversations', conversationId],
    enabled: !!conversationId,
  });

  const { data: messages = [] } = useQuery<Message[]>({
    queryKey: ['/api/conversations', conversationId, 'messages'],
    enabled: !!conversationId,
    refetchInterval: 2000, // Refresh every 2 seconds
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!conversationId) throw new Error("No conversation selected");
      return apiRequest('POST', `/api/conversations/${conversationId}/messages`, {
        content,
        senderType: 'seller',
        messageType: 'text',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/conversations', conversationId, 'messages'] });
      setMessageText("");
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao enviar mensagem",
        variant: "destructive",
      });
    },
  });

  // WebSocket connection for real-time updates
  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    const websocket = new WebSocket(wsUrl);
    
    websocket.onopen = () => {
      console.log("WebSocket connected");
      setWs(websocket);
    };
    
    websocket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'new_message' && data.data.conversationId === conversationId) {
        queryClient.invalidateQueries({ queryKey: ['/api/conversations', conversationId, 'messages'] });
        queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
      }
    };
    
    websocket.onclose = () => {
      console.log("WebSocket disconnected");
      setWs(null);
    };
    
    return () => {
      websocket.close();
    };
  }, [conversationId, queryClient]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (messageText.trim() && conversationId) {
      sendMessageMutation.mutate(messageText.trim());
    }
  };

  if (!conversationId) {
    return (
      <div className="flex-1 flex items-center justify-center bg-chat-incoming">
        <div className="text-center text-text-secondary">
          <i className="fas fa-comments text-4xl mb-4"></i>
          <p className="text-lg">Selecione uma conversa para começar</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-chat-incoming">
      {/* Chat Header */}
      <div className="bg-whatsapp-panel p-4 border-b border-border-light flex items-center justify-between">
        <div className="flex items-center gap-3">
          {conversation?.customerAvatar ? (
            <img
              src={conversation.customerAvatar}
              alt={conversation.customerName}
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
              <i className="fas fa-user text-gray-400"></i>
            </div>
          )}
          <div>
            <h3 className="font-semibold text-text-primary">
              {conversation?.customerName || 'Cliente'}
            </h3>
            <p className="text-sm text-whatsapp">
              {conversation?.status === 'active' ? 'Online' : 'Offline'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button className="text-text-secondary hover:text-text-primary">
            <i className="fas fa-search"></i>
          </button>
          <button className="text-text-secondary hover:text-text-primary">
            <i className="fas fa-phone"></i>
          </button>
          <button className="text-text-secondary hover:text-text-primary">
            <i className="fas fa-ellipsis-v"></i>
          </button>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-text-secondary py-8">
            <i className="fas fa-comment-dots text-2xl mb-2"></i>
            <p>Nenhuma mensagem ainda</p>
          </div>
        ) : (
          messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="bg-whatsapp-panel p-4 border-t border-border-light">
        <form onSubmit={handleSendMessage} className="flex items-center gap-3">
          <button type="button" className="text-text-secondary hover:text-text-primary">
            <i className="fas fa-paperclip"></i>
          </button>
          <div className="flex-1 relative">
            <Input
              type="text"
              placeholder="Digite uma mensagem..."
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              className="pr-12 bg-white border-border-light focus:border-whatsapp"
            />
            <button type="button" className="absolute right-3 top-2.5 text-text-secondary hover:text-text-primary">
              <i className="fas fa-smile"></i>
            </button>
          </div>
          <Button
            type="submit"
            disabled={!messageText.trim() || sendMessageMutation.isPending}
            className="w-10 h-10 bg-whatsapp hover:bg-whatsapp-hover text-white rounded-full p-0"
          >
            <i className="fas fa-paper-plane"></i>
          </Button>
        </form>
        
        {/* Quick Actions */}
        <div className="flex gap-2 mt-3">
          <Button variant="outline" size="sm" className="text-xs">
            <i className="fas fa-plus mr-1"></i> Adicionar Produto
          </Button>
          <Button variant="outline" size="sm" className="text-xs">
            <i className="fas fa-calculator mr-1"></i> Calcular Frete
          </Button>
          <Button size="sm" className="bg-whatsapp hover:bg-whatsapp-hover text-white text-xs">
            <i className="fas fa-check mr-1"></i> Finalizar Pedido
          </Button>
        </div>
      </div>
    </div>
  );
}
