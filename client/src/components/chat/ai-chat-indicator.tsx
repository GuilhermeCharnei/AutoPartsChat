import React from 'react';
import { Bot, Sparkles } from 'lucide-react';

interface AIChatIndicatorProps {
  isAIEnabled: boolean;
  isTyping?: boolean;
}

export function AIChatIndicator({ isAIEnabled, isTyping }: AIChatIndicatorProps) {
  if (!isAIEnabled) return null;

  return (
    <div className="flex items-center gap-2 text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
      <div className="flex items-center gap-1">
        <Bot className="w-3 h-3" />
        <Sparkles className="w-3 h-3" />
      </div>
      <span className="font-medium">
        {isTyping ? 'IA pensando...' : 'IA ativada'}
      </span>
      {isTyping && (
        <div className="flex gap-1">
          <div className="w-1 h-1 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="w-1 h-1 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="w-1 h-1 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>
      )}
    </div>
  );
}