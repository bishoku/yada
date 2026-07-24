import React, { useState } from 'react';
import { ChatMessage } from '../../types';
import { Bot, User, Copy, Check } from 'lucide-react';
import { SimpleMarkdown } from '../canvas/SimpleMarkdown';

interface ChatBubbleProps {
  message: ChatMessage;
}

export const ChatBubble: React.FC<ChatBubbleProps> = ({ message }) => {
  const isUser = message.sender === 'user';
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (message.text) {
      navigator.clipboard.writeText(message.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className={`flex gap-2 mb-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      <div
        className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
          isUser
            ? 'bg-indigo-600 text-white'
            : 'bg-slate-200 dark:bg-slate-800 text-indigo-500 dark:text-indigo-400 border border-slate-300 dark:border-slate-700'
        }`}
      >
        {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
      </div>

      <div
        className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-xs font-normal leading-relaxed shadow-sm select-text relative group ${
          isUser
            ? 'bg-indigo-600 text-white rounded-tr-none'
            : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800 rounded-tl-none'
        }`}
      >
        <SimpleMarkdown text={message.text} />
        
        <div className="flex items-center justify-between mt-1 text-[9px] font-medium opacity-80 gap-2 select-none border-t border-slate-200/40 dark:border-slate-800/40 pt-1">
          {!isUser && (
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-1 text-slate-400 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors cursor-pointer"
              title="Kopyala"
            >
              {copied ? (
                <>
                  <Check className="w-3 h-3 text-emerald-500" />
                  <span className="text-[9px] text-emerald-500 font-semibold">Kopyalandı</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span className="text-[9px]">Kopyala</span>
                </>
              )}
            </button>
          )}

          <span className={`text-[9px] ${isUser ? 'text-indigo-100 ml-auto' : 'text-slate-400 dark:text-slate-500 ml-auto'}`}>
            {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>
    </div>
  );
};

