import React, { useState, useEffect, useRef } from 'react';
import { Bot, Send, X, Sparkles, Loader2, Trash2, Square } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { useAppStore } from '../../store/useAppStore';
import { isTauri } from '../../services/storage';
import { ChatMessage } from '../../types';
import { ChatBubble } from './ChatBubble';
import { validateAndRepairAiPayload } from '../../utils/aiValidator';

export const ChatOverlay: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const isCancelledRef = useRef(false);

  const llmPreferences = useAppStore((s) => s.llmPreferences);
  const currentWorkspace = useAppStore((s) => s.currentWorkspace);
  const activeDiagramId = useAppStore((s) => s.activeDiagramId);
  const logicalData = useAppStore((s) => s.logicalData);
  const visualData = useAppStore((s) => s.visualData);
  const language = useAppStore((s) => s.language);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Load chat memory on diagram switch
  useEffect(() => {
    if (!isTauri() || !currentWorkspace || !activeDiagramId) return;

    invoke<{ shortTermMessages: ChatMessage[] }>('get_chat_memory', {
      workspacePath: currentWorkspace.path,
      diagramId: activeDiagramId,
    })
      .then((mem) => {
        if (mem && mem.shortTermMessages) {
          setMessages(mem.shortTermMessages);
        } else {
          setMessages([]);
        }
      })
      .catch((err) => console.error('Failed to load chat memory:', err));
  }, [currentWorkspace, activeDiagramId]);

  // Close chat overlay on ESC key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  if (!isTauri() || !currentWorkspace || !activeDiagramId) return null; // Only show when a diagram is active in Tauri app

  const handleToggle = () => {
    if (!llmPreferences.apiKey.trim()) {
      // Prompt user or open preferences
      alert(
        language === 'tr'
          ? 'Lütfen önce Tercihler (Preferences) ekranından LLM API Anahtarınızı giriniz.'
          : 'Please enter your LLM API Key in Preferences first.'
      );
      return;
    }
    setIsOpen(!isOpen);
  };

  const handleClearMemory = async () => {
    if (!currentWorkspace || !activeDiagramId) return;
    try {
      await invoke('clear_chat_memory', {
        workspacePath: currentWorkspace.path,
        diagramId: activeDiagramId,
      });
      setMessages([]);
    } catch (err) {
      console.error('Failed to clear chat memory:', err);
    }
  };

  const handleStop = async () => {
    isCancelledRef.current = true;
    setLoading(false);

    try {
      await invoke('cancel_agent_chat');
    } catch (err) {
      console.error('Failed to send cancel signal to Rust:', err);
    }

    const cancelMsg: ChatMessage = {
      id: `cancel-${Date.now()}`,
      sender: 'assistant',
      text: language === 'tr' ? '⚠️ *İstek kullanıcı tarafından iptal edildi.*' : '⚠️ *Request cancelled by user.*',
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, cancelMsg]);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();

    if (loading) {
      handleStop();
      return;
    }

    if (!input.trim() || !currentWorkspace || !activeDiagramId) return;

    const userText = input.trim();
    setInput('');
    isCancelledRef.current = false;

    const tempUserMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      sender: 'user',
      text: userText,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, tempUserMsg]);
    setLoading(true);

    try {
      const response = await invoke<{
        message: string;
        updatedLogical?: any;
        updatedVisual?: any;
      }>('chat_with_agent', {
        workspacePath: currentWorkspace.path,
        diagramId: activeDiagramId,
        currentLogical: logicalData,
        currentVisual: visualData,
        userMessage: userText,
      });

      if (isCancelledRef.current) return;

      const botMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        sender: 'assistant',
        text: response.message,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, botMsg]);

      // Real-time Visual & Logical Update + Timeline Schedule Recalculation!
      if (response.updatedLogical || response.updatedVisual) {
        const baseLogical = response.updatedLogical || logicalData;
        const baseVisual = response.updatedVisual || visualData;
        const { safeLogical, safeVisual } = validateAndRepairAiPayload(baseLogical, baseVisual);
        useAppStore.getState().updateDiagramFromAi(safeLogical, safeVisual);
      }

    } catch (err: any) {
      if (isCancelledRef.current) return;
      console.error('Chat execution failed:', err);
      const errMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        sender: 'assistant',
        text: `Hata: ${err?.toString() || 'Bilinmeyen bir hata oluştu.'}`,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      if (!isCancelledRef.current) {
        setLoading(false);
      }
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end select-none">
      {/* Messenger-style Floating Overlay Chat Window */}
      {isOpen && (
        <div className="w-[400px] h-[560px] bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden mb-3 animate-in zoom-in-95 fade-in duration-200">
          {/* Header */}
          <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/50">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  YADA AI Assistant
                </h4>
                <span className="text-[10px] text-slate-400 font-medium block">
                  {llmPreferences.model || 'LLM Agent'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handleClearMemory}
                className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title={language === 'tr' ? 'Sohbeti Temizle' : 'Clear Chat'}
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages Body */}
          <div className="flex-1 p-4 overflow-y-auto bg-slate-50/30 dark:bg-slate-950/30">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 dark:text-slate-500">
                <Bot className="w-10 h-10 mb-2 opacity-40 text-indigo-500" />
                <p className="text-xs font-medium mb-1">
                  {language === 'tr' ? 'Mimari Asistanınız Hazır' : 'Your Architecture Assistant is Ready'}
                </p>
                <p className="text-[11px] leading-relaxed opacity-75">
                  {language === 'tr'
                    ? 'Diyagram oluşturmak veya mevcut akışı değiştirmek için yazabilirsiniz.'
                    : 'Ask me to create services, add databases, or modify your system architecture.'}
                </p>
              </div>
            ) : (
              messages.map((msg) => <ChatBubble key={msg.id} message={msg} />)
            )}

            {loading && (
              <div className="flex items-center gap-2 text-indigo-500 text-xs font-medium py-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{language === 'tr' ? 'Diyagram güncelleniyor...' : 'Updating diagram...'}</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Form */}
          <form onSubmit={handleSend} className="p-3 border-t border-slate-200 dark:border-slate-800 flex gap-2 items-end bg-white dark:bg-slate-900">
            <textarea
              rows={2}
              placeholder={
                language === 'tr'
                  ? 'Diyagram hakkında yazın... (Enter: Gönder, Shift+Enter: Yeni satır)'
                  : 'Type a message... (Enter: Send, Shift+Enter: Newline)'
              }
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (loading) {
                    handleStop();
                  } else if (input.trim()) {
                    handleSend(e);
                  }
                }
              }}
              disabled={loading}
              className="flex-1 text-xs bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-200 outline-none focus:border-indigo-500 transition-colors select-text resize-none min-h-[48px] max-h-[140px] leading-normal overflow-y-auto disabled:opacity-80"
            />

            <button
              type={loading ? "button" : "submit"}
              onClick={loading ? handleStop : undefined}
              disabled={!loading && !input.trim()}
              className={`w-9 h-9 rounded-xl flex items-center justify-center cursor-pointer transition-all shadow-md shrink-0 mb-0.5 ${
                loading
                  ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/20'
                  : 'bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white shadow-indigo-600/20'
              }`}
              title={
                loading
                  ? (language === 'tr' ? 'İsteği Durdur' : 'Stop Request')
                  : (language === 'tr' ? 'Gönder' : 'Send')
              }
            >
              {loading ? <Square className="w-3.5 h-3.5 fill-current" /> : <Send className="w-4 h-4" />}
            </button>
          </form>
        </div>
      )}

      {/* Floating Action Button (FAB) */}
      <button
        onClick={handleToggle}
        className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-600 text-white shadow-xl shadow-indigo-500/30 hover:scale-105 active:scale-95 flex items-center justify-center cursor-pointer transition-all duration-200"
        title="AI Architecture Assistant"
      >
        <Sparkles className="w-6 h-6" />
      </button>
    </div>
  );
};

