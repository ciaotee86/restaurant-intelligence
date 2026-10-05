import React, { useState, useEffect, useRef } from 'react';
import type { Restaurant } from '../../types/restaurant';
import { restaurantService } from '../../services/restaurantService';
import {
  Bot,
  Send,
  Sparkles,
  Zap,
  RotateCcw,
  CheckCircle2,
  Database,
  Lightbulb
} from 'lucide-react';

interface AiAssistantWidgetProps {
  restaurant: Restaurant;
}

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  source?: 'local_bi' | 'cache' | 'gemini_ai';
  timestamp: string;
}

export const AiAssistantWidget: React.FC<AiAssistantWidgetProps> = ({ restaurant }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputQuestion, setInputQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [forceAi, setForceAi] = useState(false);
  const [quickQuestions, setQuickQuestions] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const msgCounter = useRef(0);

  const createMsgId = (prefix: string) => {
    msgCounter.current += 1;
    return `${prefix}-${msgCounter.current}`;
  };

  // Khởi tạo câu hỏi định hướng và tin nhắn chào mừng
  useEffect(() => {
    let isMounted = true;
    const loadQuestions = async () => {
      const qList = await restaurantService.getQuickQuestions(restaurant.id);
      if (isMounted) {
        setQuickQuestions(qList);
        setMessages([
          {
            id: 'welcome',
            sender: 'assistant',
            text: `Xin chào! Tôi là Trợ lý AI của quán **${restaurant.name}**. Tôi đã đọc vị toàn bộ ${restaurant.totalReviews} bài đánh giá của thực khách. Bạn có thể chọn câu hỏi gợi ý bên dưới hoặc hỏi bất kỳ điều gì về hương vị món ăn, thái độ phục vụ hay giải pháp cải thiện kinh doanh!`,
            source: 'local_bi',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
      }
    };
    loadQuestions();
    return () => {
      isMounted = false;
    };
  }, [restaurant.id, restaurant.name, restaurant.totalReviews]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSend = async (questionToSend?: string) => {
    const q = (questionToSend || inputQuestion).trim();
    if (!q || isLoading) return;

    const userMsg: Message = {
      id: createMsgId('user'),
      sender: 'user',
      text: q,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!questionToSend) {
      setInputQuestion('');
    }
    setIsLoading(true);

    try {
      const result = await restaurantService.askAssistant(restaurant.id, q, forceAi);
      const aiMsg: Message = {
        id: createMsgId('ai'),
        sender: 'assistant',
        text: result.answer,
        source: result.source,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: createMsgId('ai-err'),
          sender: 'assistant',
          text: 'Xin lỗi, hiện tại tôi chưa thể kết nối đến máy chủ phân tích. Vui lòng thử lại sau giây lát.',
          source: 'local_bi',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearHistory = () => {
    setMessages([
      {
        id: createMsgId('welcome'),
        sender: 'assistant',
        text: `Đã làm mới cuộc hội thoại. Hãy hỏi tôi về đánh giá thực tế của **${restaurant.name}**!`,
        source: 'local_bi',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  // Helper render text markdown đơn giản (bold, bullet)
  const renderFormattedText = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, idx) => {
      // Dòng gạch đầu dòng
      const isBullet = line.trim().startsWith('- ') || line.trim().startsWith('• ');
      const cleanLine = isBullet ? line.trim().substring(2) : line;

      // Xử lý in đậm **text**
      const parts = cleanLine.split(/(\*\*.*?\*\*)/g);
      const content = parts.map((part, pIdx) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return (
            <strong key={pIdx} className="font-bold text-[#18181B]">
              {part.slice(2, -2)}
            </strong>
          );
        }
        if (part.startsWith('`') && part.endsWith('`')) {
          return (
            <code key={pIdx} className="px-1.5 py-0.5 rounded bg-zinc-100 text-[#C2410C] font-mono text-[11px]">
              {part.slice(1, -1)}
            </code>
          );
        }
        return part;
      });

      if (isBullet) {
        return (
          <div key={idx} className="flex items-start gap-2 my-1 text-xs sm:text-sm leading-relaxed">
            <span className="text-[#C2410C] font-black shrink-0">•</span>
            <span className="text-[#3F3F46]">{content}</span>
          </div>
        );
      }

      if (line.trim() === '') {
        return <div key={idx} className="h-2" />;
      }

      return (
        <p key={idx} className="text-xs sm:text-sm text-[#3F3F46] leading-relaxed my-0.5">
          {content}
        </p>
      );
    });
  };

  return (
    <div className="bg-white border border-[#E5E3DE] rounded-2xl shadow-craft overflow-hidden">
      {/* 1. Header Widget */}
      <div className="bg-[#FAF9F5] border-b border-[#E5E3DE] px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#18181B] text-white flex items-center justify-center shadow-craft-sm">
            <Bot className="w-5 h-5 text-orange-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-black text-[#18181B] tracking-tight">
                Trợ lý AI Nhà Hàng (Conversational BI)
              </h3>
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                <Zap className="w-2.5 h-2.5" />
                Hybrid 2-Tier
              </span>
            </div>
            <p className="text-xs text-zinc-500">
              Hỏi đáp trực tiếp trên dữ liệu thật của quán · Phản hồi ngay trong 0ms
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          {/* Nút bật/tắt gọi Gemini nâng cao */}
          <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-zinc-600 bg-white border border-[#E5E3DE] rounded-lg px-2.5 py-1 hover:bg-zinc-50 transition-colors shadow-2xs">
            <input
              type="checkbox"
              checked={forceAi}
              onChange={(e) => setForceAi(e.target.checked)}
              className="rounded text-[#C2410C] focus:ring-0 w-3.5 h-3.5 accent-[#C2410C]"
            />
            <span className="flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-500" />
              Sáng tạo sâu (Gemini)
            </span>
          </label>

          <button
            onClick={handleClearHistory}
            title="Làm mới cuộc trò chuyện"
            className="p-1.5 rounded-lg border border-[#E5E3DE] bg-white text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50 transition-colors shadow-2xs"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 2. Khung hội thoại */}
      <div className="p-4 sm:p-6 space-y-4 max-h-[460px] overflow-y-auto bg-[#FDFCFB]/40">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div
              className={`max-w-[88%] sm:max-w-[80%] rounded-2xl p-4 sm:p-5 shadow-2xs ${
                msg.sender === 'user'
                  ? 'bg-[#18181B] text-white rounded-br-none'
                  : 'bg-white border border-[#E5E3DE] rounded-bl-none'
              }`}
            >
              {msg.sender === 'user' ? (
                <p className="text-xs sm:text-sm font-medium leading-relaxed">{msg.text}</p>
              ) : (
                <div className="space-y-1">{renderFormattedText(msg.text)}</div>
              )}
            </div>

            {/* Badge nguồn thông tin cho tin nhắn AI */}
            {msg.sender === 'assistant' && (
              <div className="flex items-center gap-2 mt-1.5 ml-1 text-[11px] text-zinc-400">
                {msg.source === 'local_bi' && (
                  <span className="flex items-center gap-1 text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                    <CheckCircle2 className="w-2.5 h-2.5" />
                    Phân tích số liệu thực tế (0ms · Tiết kiệm Quota)
                  </span>
                )}
                {msg.source === 'cache' && (
                  <span className="flex items-center gap-1 text-blue-700 font-semibold bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                    <Database className="w-2.5 h-2.5" />
                    Bộ nhớ đệm thông minh (0 Token)
                  </span>
                )}
                {msg.source === 'gemini_ai' && (
                  <span className="flex items-center gap-1 text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded border border-amber-100">
                    <Sparkles className="w-2.5 h-2.5" />
                    Gemini AI Engine
                  </span>
                )}
                <span>{msg.timestamp}</span>
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center gap-2.5 text-xs text-zinc-500 bg-white border border-[#E5E3DE] rounded-xl px-4 py-3 w-fit shadow-2xs">
            <div className="w-3.5 h-3.5 border-2 border-[#C2410C] border-t-transparent rounded-full animate-spin" />
            <span>Trợ lý AI đang tra cứu và tổng hợp dữ liệu...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 3. Gợi ý câu hỏi nhanh (Quick Question Pills) */}
      {quickQuestions.length > 0 && (
        <div className="px-4 sm:px-6 py-3 bg-[#FAF9F5] border-t border-[#E5E3DE]/70">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-2">
            <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
            <span>Câu hỏi gợi ý nhanh cho quán:</span>
          </div>
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            {quickQuestions.map((q, qIdx) => (
              <button
                key={qIdx}
                disabled={isLoading}
                onClick={() => handleSend(q)}
                className="text-left text-xs font-semibold bg-white hover:bg-orange-50/80 hover:text-[#C2410C] hover:border-[#C2410C]/40 border border-[#E5E3DE] rounded-lg px-3 py-1.5 text-zinc-700 transition-all shadow-2xs disabled:opacity-50"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 4. Khung nhập liệu câu hỏi */}
      <div className="p-3 sm:p-4 bg-white border-t border-[#E5E3DE]">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2"
        >
          <div className="relative flex-1">
            <input
              type="text"
              value={inputQuestion}
              onChange={(e) => setInputQuestion(e.target.value)}
              placeholder={`Hỏi bất kỳ điều gì về ${restaurant.name} (ví dụ: món nào ngon, phục vụ ra sao...)...`}
              disabled={isLoading}
              className="w-full bg-[#FAF9F5] border border-[#D4D4D8] rounded-xl px-4 py-2.5 text-xs sm:text-sm text-[#18181B] placeholder-zinc-400 focus:outline-none focus:border-[#C2410C] focus:bg-white transition-all shadow-2xs disabled:opacity-60"
            />
          </div>

          <button
            type="submit"
            disabled={!inputQuestion.trim() || isLoading}
            className="inline-flex items-center justify-center gap-1.5 px-4 sm:px-5 py-2.5 rounded-xl bg-[#18181B] hover:bg-[#C2410C] text-white text-xs sm:text-sm font-bold transition-all shadow-craft-sm disabled:opacity-40 disabled:hover:bg-[#18181B]"
          >
            <span>Hỏi</span>
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
};
