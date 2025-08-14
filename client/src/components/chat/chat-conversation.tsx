import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Message, Conversation } from "@shared/schema";
import { MessageBubble } from "./message-bubble";
import { ChatTransferModal } from "@/components/admin/chat-transfer-modal";
import { FinalizeOrderModal } from "@/components/admin/finalize-order-modal";
import { ProductSelectionModal } from "@/components/admin/product-selection-modal";
import { AIChatIndicator } from "./ai-chat-indicator";
import { AiBotConversation } from "./ai-bot-conversation";
import { UserCheck, Package, Bot, Sparkles, Trash2 } from "lucide-react";

interface ChatConversationProps {
  conversationId: number | null;
}

export function ChatConversation({ conversationId }: ChatConversationProps) {
  const [messageText, setMessageText] = useState("");
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showFinalizeModal, setShowFinalizeModal] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [isAITyping, setIsAITyping] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<Array<{
    id: number;
    codigo: string;
    name: string;
    price: string;
    quantity: number;
  }>>([]);
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

  // Query WhatsApp config to check if AI is enabled
  const { data: whatsappConfig } = useQuery({
    queryKey: ['/api/admin/whatsapp-config'],
  });

  const isAIEnabled = (whatsappConfig as any)?.bot?.aiEnabled || false;

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!conversationId) throw new Error("No conversation selected");
      return apiRequest(`/api/conversations/${conversationId}/messages`, 'POST', {
        content,
        senderType: 'seller',
        messageType: 'text',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/conversations', conversationId, 'messages'] });
      setMessageText("");
      
      // Trigger AI response if enabled
      if (isAIEnabled) {
        triggerAIResponse(messageText);
      }
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao enviar mensagem",
        variant: "destructive",
      });
    },
  });

  const aiResponseMutation = useMutation({
    mutationFn: async (message: string) => {
      if (!conversationId) throw new Error("No conversation selected");
      return apiRequest('/api/chat/ai-response', 'POST', {
        message,
        conversationId,
        customerName: conversation?.customerName || 'Cliente',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/conversations', conversationId, 'messages'] });
      setIsAITyping(false);
    },
    onError: () => {
      setIsAITyping(false);
      toast({
        title: "Erro",
        description: "Falha na resposta da IA",
        variant: "destructive",
      });
    },
  });

  const triggerAIResponse = (userMessage: string) => {
    if (!isAIEnabled) return;
    
    setIsAITyping(true);
    // Delay to simulate thinking time
    setTimeout(() => {
      aiResponseMutation.mutate(userMessage);
    }, 1500);
  };

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

  // Extract order items from selected products
  const getOrderItems = () => {
    // First try to get items from selected products
    if (selectedProducts.length > 0) {
      return selectedProducts.map(product => ({
        productId: product.id,
        productName: product.name,
        quantity: product.quantity,
        price: product.price
      }));
    }

    // Fallback to product messages
    const productMessages = messages.filter(msg => 
      msg.messageType === 'product' && msg.metadata
    );
    
    return productMessages.map(msg => {
      const product = msg.metadata as any;
      return {
        productId: product.id || 0,
        productName: product.name || 'Produto',
        quantity: product.quantity || 1,
        price: product.price || '0.00'
      };
    });
  };

  const handleAddProducts = (products: any[]) => {
    setSelectedProducts(prev => {
      const newProducts = [...prev];
      
      products.forEach(product => {
        const existingIndex = newProducts.findIndex(p => p.id === product.id);
        if (existingIndex >= 0) {
          // Update quantity if product already exists
          newProducts[existingIndex].quantity += product.quantity;
        } else {
          // Add new product
          newProducts.push({
            id: product.id,
            codigo: product.codigo,
            name: product.name,
            price: product.price,
            quantity: product.quantity
          });
        }
      });
      
      toast({
        title: "Produtos Adicionados!",
        description: `${products.length} produto(s) adicionado(s) ao pedido`,
      });
      
      return newProducts;
    });
  };

  const handleRemoveProduct = (productId: number) => {
    setSelectedProducts(prev => prev.filter(p => p.id !== productId));
    toast({
      title: "Produto Removido",
      description: "Produto removido do pedido",
    });
  };

  // Special handling for AI bot conversation
  if (conversationId === -1) {
    return <AiBotConversation />;
  }

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
    <div className="flex-1 flex flex-col bg-chat-incoming max-h-screen">
      {/* Chat Header */}
      <div className="bg-whatsapp-panel px-2 sm:px-4 py-2 sm:py-3 border-b border-border-light flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          {conversation?.customerAvatar ? (
            <img
              src={conversation.customerAvatar}
              alt={conversation.customerName}
              className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
              <i className="fas fa-user text-gray-400 text-xs sm:text-sm"></i>
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-text-primary text-xs sm:text-base truncate">
              {conversation?.customerName || 'Cliente'}
            </h3>
            <div className="flex items-center gap-1 sm:gap-2">
              <p className="text-xs text-whatsapp">
                {conversation?.status === 'active' ? 'Online' : 'Offline'}
              </p>
              <AIChatIndicator isAIEnabled={isAIEnabled} isTyping={isAITyping} />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowTransferModal(true)}
            className="text-xs px-1 sm:px-3 h-7 sm:h-8"
          >
            <UserCheck className="w-3 h-3 sm:mr-1" />
            <span className="hidden sm:inline">Transferir</span>
          </Button>
          <Button
            size="sm"
            onClick={() => setShowFinalizeModal(true)}
            className="bg-green-600 hover:bg-green-700 text-white text-xs px-1 sm:px-3 h-7 sm:h-8"
            disabled={selectedProducts.length === 0 && getOrderItems().length === 0}
          >
            <Package className="w-3 h-3 sm:mr-1" />
            <span className="hidden sm:inline">Finalizar</span>
          </Button>
        </div>
      </div>

      {/* Chat Messages - Ajustar altura baseada na presença de produtos */}
      <div 
        className={`flex-1 overflow-y-auto scrollbar-thin px-2 sm:px-4 py-2 sm:py-4 space-y-2 sm:space-y-4 ${
          selectedProducts.length > 0 ? 'max-h-[40vh] sm:max-h-[50vh]' : 'max-h-[70vh] sm:max-h-[80vh]'
        }`}
      >
        {messages.length === 0 ? (
          <div className="text-center text-text-secondary py-4 sm:py-8">
            <i className="fas fa-comment-dots text-xl sm:text-2xl mb-2"></i>
            <p className="text-sm sm:text-base">Nenhuma mensagem ainda</p>
          </div>
        ) : (
          messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input Area - Área fixa no final */}
      <div className="bg-whatsapp-panel border-t border-border-light flex-shrink-0">
        {/* Selected Products - Compacto no celular */}
        {selectedProducts.length > 0 && (
          <div className="px-2 sm:px-4 py-2 border-b border-border-light">
            <div className="bg-green-50 rounded-lg border border-green-200 p-2 sm:p-3">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs sm:text-sm font-medium text-green-800">
                  Produtos ({selectedProducts.length})
                </h4>
                <span className="text-xs sm:text-sm font-semibold text-green-600">
                  R$ {selectedProducts.reduce((sum, p) => sum + (parseFloat(p.price) * p.quantity), 0).toFixed(2)}
                </span>
              </div>
              <div className="max-h-20 sm:max-h-32 overflow-y-auto space-y-1 sm:space-y-2">
                {selectedProducts.map((product) => (
                  <div key={product.id} className="flex items-center justify-between bg-white p-1 sm:p-2 rounded border">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm font-medium truncate">{product.name}</p>
                      <p className="text-xs text-gray-500">
                        {product.codigo} | {product.quantity}x
                      </p>
                    </div>
                    <div className="flex items-center gap-1 sm:gap-2">
                      <span className="text-xs sm:text-sm font-medium text-green-600">
                        R$ {(parseFloat(product.price) * product.quantity).toFixed(2)}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveProduct(product.id)}
                        className="h-5 w-5 sm:h-6 sm:w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-2 w-2 sm:h-3 sm:w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Message Input */}
        <div className="px-2 sm:px-4 py-2 sm:py-3">
          <form onSubmit={handleSendMessage} className="flex items-center gap-2 sm:gap-3">
            <button type="button" className="text-text-secondary hover:text-text-primary hidden sm:block">
              <i className="fas fa-paperclip"></i>
            </button>
            <div className="flex-1 relative">
              <Input
                type="text"
                placeholder="Digite uma mensagem..."
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                className="pr-8 sm:pr-12 bg-white border-border-light focus:border-whatsapp text-sm"
              />
              <button type="button" className="absolute right-2 sm:right-3 top-2 sm:top-2.5 text-text-secondary hover:text-text-primary">
                <i className="fas fa-smile text-sm"></i>
              </button>
            </div>
            <Button
              type="submit"
              disabled={!messageText.trim() || sendMessageMutation.isPending}
              className="w-8 h-8 sm:w-10 sm:h-10 bg-whatsapp hover:bg-whatsapp-hover text-white rounded-full p-0"
            >
              <i className="fas fa-paper-plane text-xs sm:text-sm"></i>
            </Button>
          </form>
          
          {/* Quick Actions */}
          <div className="flex flex-wrap gap-1 sm:gap-2 mt-2 sm:mt-3">
            <Button 
              variant="outline" 
              size="sm" 
              className="text-xs flex-shrink-0 h-7 sm:h-8 px-2 sm:px-3"
              onClick={() => setShowProductModal(true)}
            >
              <i className="fas fa-plus mr-1"></i> 
              <span className="hidden sm:inline">Adicionar Produto</span>
              <span className="sm:hidden">Produto</span>
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="text-xs flex-shrink-0 h-7 sm:h-8 px-2 sm:px-3"
            >
              <i className="fas fa-calculator mr-1"></i>
              <span className="hidden sm:inline">Calcular Frete</span>
              <span className="sm:hidden">Frete</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Modals */}
      {conversationId && (
        <>
          <ChatTransferModal
            isOpen={showTransferModal}
            onClose={() => setShowTransferModal(false)}
            conversationId={conversationId}
            currentAssignee={conversation?.assignedUserId || undefined}
          />
          <ProductSelectionModal
            isOpen={showProductModal}
            onClose={() => setShowProductModal(false)}
            onAddProducts={handleAddProducts}
          />
          <FinalizeOrderModal
            isOpen={showFinalizeModal}
            onClose={() => {
              setShowFinalizeModal(false);
              // Clear selected products after successful order
              setSelectedProducts([]);
            }}
            conversationId={conversationId}
            customerName={conversation?.customerName || 'Cliente'}
            items={getOrderItems()}
          />
        </>
      )}
    </div>
  );
}
