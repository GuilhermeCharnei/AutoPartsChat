import { Message } from "@shared/schema";

interface MessageBubbleProps {
  message: Message;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isCustomer = message.senderType === 'customer';
  const isBot = message.senderType === 'bot';
  const isSeller = message.senderType === 'seller';

  const getBubbleClasses = () => {
    if (isCustomer) {
      return "bg-chat-outgoing rounded-lg p-3 relative chat-bubble-tail";
    } else if (isBot) {
      return "bg-chat-incoming border border-border-light rounded-lg p-3 relative chat-bubble-tail-incoming";
    } else {
      return "bg-blue-50 border border-blue-200 rounded-lg p-3 relative chat-bubble-tail-incoming";
    }
  };

  const getContainerClasses = () => {
    if (isCustomer) {
      return "flex justify-end";
    } else {
      return "flex items-start gap-2";
    }
  };

  const formatTime = (date: Date | string) => {
    const messageDate = new Date(date);
    return messageDate.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isCustomer) {
    return (
      <div className={getContainerClasses()}>
        <div className="max-w-md">
          <div className={getBubbleClasses()}>
            <p className="text-sm text-text-primary">{message.content}</p>
          </div>
          <div className="flex items-center justify-end gap-1 mt-1">
            <span className="text-xs text-text-secondary">
              {message.createdAt ? formatTime(message.createdAt) : ''}
            </span>
            <i className="fas fa-check-double text-blue-500 text-xs"></i>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={getContainerClasses()}>
      {isBot ? (
        <div className="w-8 h-8 bg-whatsapp rounded-full flex items-center justify-center text-white text-xs font-bold">
          BOT
        </div>
      ) : (
        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs">
          <i className="fas fa-user"></i>
        </div>
      )}
      <div className="max-w-md">
        <div className={getBubbleClasses()}>
          {isSeller && (
            <div className="text-xs text-blue-600 font-semibold mb-1">
              {message.senderId ? 'Vendedor' : 'Sistema'}
            </div>
          )}
          <p className="text-sm text-text-primary">{message.content}</p>
          
          {/* Product metadata rendering */}
          {message.metadata && message.messageType === 'product' && (
            <div className="mt-2 space-y-2">
              {Array.isArray((message.metadata as any)?.products) && (message.metadata as any)?.products?.map((product: any, index: number) => (
                <div key={index} className="border border-gray-200 rounded p-2">
                  <div className="font-semibold text-sm">{product.name}</div>
                  <div className="text-xs text-text-secondary">{product.description}</div>
                  <div className="text-whatsapp font-bold">R$ {product.price}</div>
                </div>
              ))}
            </div>
          )}
        </div>
        <span className="text-xs text-text-secondary ml-2">
          {message.createdAt ? formatTime(message.createdAt) : ''}
        </span>
      </div>
    </div>
  );
}
