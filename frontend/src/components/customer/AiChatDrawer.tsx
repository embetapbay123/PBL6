import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Product } from '../../types';
import {
  X,
  Sparkles,
  Send,
  Bot,
  User,
  ShoppingBag,
  ExternalLink,
  ChevronRight
} from 'lucide-react';

interface AiChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectProduct: (product: Product) => void;
}

export const AiChatDrawer: React.FC<AiChatDrawerProps> = ({
  isOpen,
  onClose,
  onSelectProduct
}) => {
  const { aiMessages, sendAiMessage } = useApp();
  const [inputText, setInputText] = useState('');

  if (!isOpen) return null;

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    sendAiMessage(inputText.trim());
    setInputText('');
  };

  const handleQuickPrompt = (prompt: string) => {
    sendAiMessage(prompt);
  };

  const formatVnd = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96 max-w-[calc(100vw-2rem)] h-[580px] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 duration-200">
      {/* Header */}
      <div className="px-4 py-3 bg-gradient-to-r from-emerald-700 via-teal-700 to-slate-900 text-white flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-emerald-300" />
          </div>
          <div>
            <h4 className="font-bold text-sm leading-tight">Trợ Lý Mua Sắm AI</h4>
            <p className="text-[10px] text-emerald-200">RAG Grounded trên Catalog PBL6</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10 transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs bg-slate-50/50">
        {aiMessages.map(msg => (
          <div
            key={msg.id}
            className={`flex gap-2.5 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.sender === 'assistant' && (
              <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                <Bot className="w-3.5 h-3.5" />
              </div>
            )}

            <div className={`space-y-2 max-w-[82%]`}>
              <div
                className={`p-3 rounded-2xl shadow-xs leading-relaxed ${
                  msg.sender === 'user'
                    ? 'bg-emerald-600 text-white rounded-tr-none'
                    : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none'
                }`}
              >
                <p>{msg.text}</p>
              </div>

              {/* Grounded Products Cards attached by RAG */}
              {msg.products && msg.products.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Sản phẩm liên quan trực tiếp:
                  </span>
                  {msg.products.map(prod => {
                    const minPrice = Math.min(...prod.variants.map(v => v.priceVnd));
                    return (
                      <div
                        key={prod.id}
                        onClick={() => onSelectProduct(prod)}
                        className="bg-white p-2.5 rounded-xl border border-slate-200 hover:border-emerald-500 shadow-xs hover:shadow transition flex items-center gap-2.5 cursor-pointer group"
                      >
                        <img
                          src={prod.images[0]}
                          alt={prod.name}
                          className="w-11 h-11 rounded-lg object-cover border border-slate-100"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-slate-900 line-clamp-1 group-hover:text-emerald-600">
                            {prod.name}
                          </p>
                          <p className="text-[10px] text-slate-400">{prod.storeName}</p>
                          <p className="text-emerald-600 font-bold text-xs mt-0.5">
                            {formatVnd(minPrice)}
                          </p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 transition" />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {msg.sender === 'user' && (
              <div className="w-6 h-6 rounded-full bg-slate-300 text-slate-700 flex items-center justify-center shrink-0 mt-0.5">
                <User className="w-3.5 h-3.5" />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Quick Prompts */}
      <div className="px-3 py-2 bg-white border-t border-slate-100 flex gap-1.5 overflow-x-auto text-[11px] no-scrollbar">
        <button
          onClick={() => handleQuickPrompt('Tìm tai nghe chống ồn tốt')}
          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded-full whitespace-nowrap text-slate-700 transition"
        >
          🎧 Tai nghe chống ồn
        </button>
        <button
          onClick={() => handleQuickPrompt('Có áo khoác bomber không?')}
          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded-full whitespace-nowrap text-slate-700 transition"
        >
          🧥 Áo bomber
        </button>
        <button
          onClick={() => handleQuickPrompt('Bàn phím cơ giá bao nhiêu?')}
          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded-full whitespace-nowrap text-slate-700 transition"
        >
          ⌨️ Bàn phím cơ
        </button>
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="p-3 bg-white border-t border-slate-200 flex gap-2">
        <input
          type="text"
          value={inputText}
          onChange={e => setInputText(e.target.value)}
          placeholder="Hỏi về sản phẩm, giá cả, voucher..."
          className="flex-1 bg-slate-100 hover:bg-slate-50 focus:bg-white border border-transparent focus:border-emerald-500 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none transition"
        />
        <button
          type="submit"
          disabled={!inputText.trim()}
          className="p-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 text-white disabled:text-slate-400 rounded-xl transition shadow-xs cursor-pointer"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
