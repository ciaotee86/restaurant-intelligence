import React, { useState, useEffect, useRef } from 'react';
import type { Restaurant } from '../../types/restaurant';
import { restaurantService } from '../../services/restaurantService';
import {
  Send,
  Sparkles,
  RotateCcw,
  Zap,
  Lightbulb,
  ShieldCheck
} from 'lucide-react';

interface AiAssistantWidgetProps {
  restaurant: Restaurant;
}

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  source?: 'cache' | 'gemini_ai';
  timestamp: string;
  latencyMs?: number;
}

const getNow = () => Date.now();

export const AiAssistantWidget: React.FC<AiAssistantWidgetProps> = ({ restaurant }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputQuestion, setInputQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [quickQuestions, setQuickQuestions] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const msgCounter = useRef(0);

  const MAX_INPUT_LENGTH = 400;

  const createMsgId = (prefix: string) => {
    msgCounter.current += 1;
    return `${prefix}-${msgCounter.current}`;
  };

  // Khởi tạo câu hỏi định hướng và tin nhắn chào mừng chuẩn Nền Tảng
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
            text: `Xin chào! Tôi là Trợ lý Thông tin của nền tảng **Restaurant Intelligence**. Tôi cung cấp góc nhìn phân tích độc lập, khách quan dựa trên **${restaurant.totalReviews} nhận xét thực tế** của thực khách tại **${restaurant.name}**. Bạn cần tra cứu món ngon, tiêu chí phục vụ, giá cả hay không gian quán?`,
            source: 'gemini_ai',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            latencyMs: 15
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
    // TC25: Chặn câu hỏi rỗng
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
    // TC28: Khóa gửi khi đang xử lý
    setIsLoading(true);
    const startTs = getNow();

    try {
      const result = await restaurantService.askAssistant(restaurant.id, q);
      const endTs = getNow();
      const latencyMs = Math.max(1, endTs - startTs);

      const aiMsg: Message = {
        id: createMsgId('ai'),
        sender: 'assistant',
        text: result.answer,
        source: result.source,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        latencyMs
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch {
      const endTs = getNow();
      setMessages((prev) => [
        ...prev,
        {
          id: createMsgId('ai-err'),
          sender: 'assistant',
          text: '> [!WARNING]\n> *Hiện tại hệ thống chưa thể kết nối đến máy chủ phân tích. Vui lòng thử lại sau giây lát.*',
          source: 'gemini_ai',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          latencyMs: Math.max(1, endTs - startTs)
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // TC29: Nhấn nút làm mới cuộc trò chuyện
  const handleClearHistory = () => {
    setInputQuestion('');
    setMessages([
      {
        id: createMsgId('welcome'),
        sender: 'assistant',
        text: `Đã làm mới phiên trò chuyện. Tôi là Trợ lý Thông tin của nền tảng **Restaurant Intelligence**, sẵn sàng giải đáp và phân tích dữ liệu đánh giá thực tế của **${restaurant.name}**!`,
        source: 'gemini_ai',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        latencyMs: 10
      }
    ]);
  };

  // Helper render text inline (bold, code, quotes)
  const renderInlineText = (text: string): React.ReactNode => {
    const parts = text.split(/(\*\*.*?\*\*|`.*?`|\*.*?\*)/g);
    return parts.map((part, pIdx) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={pIdx} className="font-bold text-[#18181B]">
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith('*') && part.endsWith('*')) {
        return (
          <em key={pIdx} className="italic text-zinc-600">
            {part.slice(1, -1)}
          </em>
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
  };

  // Helper render formatted markdown bao gồm Table (TC18), Bullet lists, Quotes
  const renderFormattedText = (text: string) => {
    const lines = text.split('\n');
    const elements: React.ReactNode[] = [];
    let tableRows: string[] = [];
    let inTable = false;

    const flushTable = (tableKey: string) => {
      if (tableRows.length >= 2) {
        const headerCells = tableRows[0]
          .split('|')
          .map((c) => c.trim())
          .filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
        const dataRows = tableRows
          .slice(2)
          .map((r) =>
            r
              .split('|')
              .map((c) => c.trim())
              .filter((_, idx, arr) => idx > 0 && idx < arr.length - 1)
          );

        elements.push(
          <div key={tableKey} className="my-3 overflow-x-auto rounded-lg border border-[#E5E3DE] shadow-2xs">
            <table className="min-w-full text-xs text-left divide-y divide-[#E5E3DE]">
              <thead className="bg-[#FAF9F5] font-bold text-[#18181B]">
                <tr>
                  {headerCells.map((h, i) => (
                    <th key={i} className="px-3 py-2 border-r border-[#E5E3DE] last:border-r-0">
                      {renderInlineText(h)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E3DE] bg-white">
                {dataRows.map((row, rIdx) => (
                  <tr key={rIdx} className={rIdx % 2 === 1 ? 'bg-[#FAF9F5]/50' : 'bg-white'}>
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} className="px-3 py-2 text-[#3F3F46] border-r border-[#E5E3DE] last:border-r-0 leading-relaxed">
                        {renderInlineText(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }
      tableRows = [];
      inTable = false;
    };

    lines.forEach((line, idx) => {
      const trimmed = line.trim();

      // Kiểm tra dòng bảng Markdown
      if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
        inTable = true;
        tableRows.push(trimmed);
        return;
      }
      
      if (inTable) {
        flushTable(`table-${idx}`);
      }

      // Xử lý dòng gạch đầu dòng
      const isBullet = trimmed.startsWith('- ') || trimmed.startsWith('• ');
      const isQuote = trimmed.startsWith('>') || trimmed.startsWith('• *"') || trimmed.startsWith('* "');

      if (isBullet) {
        elements.push(
          <div key={`bullet-${idx}`} className="flex items-start gap-2 my-1 text-xs sm:text-sm leading-relaxed">
            <span className="text-[#C2410C] font-black shrink-0">•</span>
            <span className="text-[#3F3F46]">{renderInlineText(trimmed.substring(2))}</span>
          </div>
        );
        return;
      }

      if (isQuote) {
        elements.push(
          <div key={`quote-${idx}`} className="pl-3 py-1 my-1 border-l-2 border-[#C2410C] text-xs sm:text-sm text-zinc-600 italic bg-[#FAF9F5]/70 rounded-r">
            {renderInlineText(trimmed.replace(/^>\s*/, ''))}
          </div>
        );
        return;
      }

      if (trimmed === '') {
        elements.push(<div key={`empty-${idx}`} className="h-2" />);
        return;
      }

      elements.push(
        <p key={`p-${idx}`} className="text-xs sm:text-sm text-[#3F3F46] leading-relaxed my-0.5">
          {renderInlineText(line)}
        </p>
      );
    });

    if (inTable) {
      flushTable(`table-end`);
    }

    return elements;
  };

  return (
    <div className="bg-white border border-[#E5E3DE] rounded-2xl shadow-craft overflow-hidden">
      {/* 1. Header Widget - Tái định vị Platform Assistant */}
      <div className="bg-[#FAF9F5] border-b border-[#E5E3DE] px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#18181B] text-white flex items-center justify-center shadow-craft-sm">
            <Sparkles className="w-5 h-5 text-orange-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-black text-[#18181B] tracking-tight">
                Trợ lý Thông tin Nền tảng
              </h3>
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                <ShieldCheck className="w-2.5 h-2.5" />
                Độc lập & Khách quan
              </span>
            </div>
            <p className="text-xs text-zinc-500">
              Phân tích khách quan dựa trên {restaurant.totalReviews} đánh giá thực tế
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          {/* TC29: Nút làm mới */}
          <button
            onClick={handleClearHistory}
            title="Làm mới cuộc trò chuyện"
            className="p-1.5 rounded-lg border border-[#E5E3DE] bg-white text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50 transition-colors shadow-2xs cursor-pointer"
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
              className={`max-w-[90%] sm:max-w-[82%] rounded-2xl p-4 sm:p-5 shadow-2xs ${
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

            {/* TC30: Huy hiệu nguồn thông tin */}
            {msg.sender === 'assistant' && (
              <div className="flex flex-wrap items-center gap-2 mt-1.5 ml-1 text-[11px] text-zinc-400">
                {msg.source === 'cache' && (
                  <span className="flex items-center gap-1 text-blue-700 font-semibold bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    <Zap className="w-2.5 h-2.5" />
                    Phản hồi tức thì
                  </span>
                )}
                {msg.source === 'gemini_ai' && (
                  <span className="flex items-center gap-1 text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    <Sparkles className="w-2.5 h-2.5" />
                    Trợ lý AI
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
            <span>Đang tổng hợp ý kiến thực khách...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 3. Gợi ý câu hỏi nhanh (TC23) */}
      {quickQuestions.length > 0 && (
        <div className="px-4 sm:px-6 py-3 bg-[#FAF9F5] border-t border-[#E5E3DE]/70">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-2">
            <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
            <span>Câu hỏi gợi ý nhanh từ nền tảng:</span>
          </div>
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            {quickQuestions.map((q, qIdx) => (
              <button
                key={qIdx}
                disabled={isLoading}
                onClick={() => handleSend(q)}
                className="text-left text-xs font-semibold bg-white hover:bg-orange-50/80 hover:text-[#C2410C] hover:border-[#C2410C]/40 border border-[#E5E3DE] rounded-lg px-3 py-1.5 text-zinc-700 transition-all shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 4. Khung nhập liệu câu hỏi (TC24, TC25, TC26, TC27, TC28) */}
      <div className="p-3 sm:p-4 bg-white border-t border-[#E5E3DE]">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex flex-col gap-1.5"
        >
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={inputQuestion}
                onChange={(e) => setInputQuestion(e.target.value)}
                placeholder={`Tra cứu dữ liệu về ${restaurant.name} (ví dụ: món nào ngon, dịch vụ ra sao, số lượng đánh giá...)...`}
                disabled={isLoading}
                maxLength={MAX_INPUT_LENGTH}
                className="w-full bg-[#FAF9F5] border border-[#D4D4D8] rounded-xl px-4 py-2.5 text-xs sm:text-sm text-[#18181B] placeholder-zinc-400 focus:outline-none focus:border-[#C2410C] focus:bg-white transition-all shadow-2xs disabled:opacity-60 disabled:cursor-not-allowed"
              />
            </div>

            {/* TC25: Disabled khi trống hoặc đang loading */}
            <button
              type="submit"
              disabled={!inputQuestion.trim() || isLoading}
              className="inline-flex items-center justify-center gap-1.5 px-4 sm:px-5 py-2.5 rounded-xl bg-[#18181B] hover:bg-[#C2410C] text-white text-xs sm:text-sm font-bold transition-all shadow-craft-sm disabled:opacity-40 disabled:hover:bg-[#18181B] disabled:cursor-not-allowed cursor-pointer"
            >
              <span>Hỏi</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* TC26: Bộ đếm ký tự & chú thích */}
          <div className="flex items-center justify-between px-1 text-[11px] text-zinc-400">
            <span>Hỗ trợ tiếng Việt có dấu. Phân tích độc lập dựa trên nhận xét thực tế.</span>
            <span className={inputQuestion.length >= MAX_INPUT_LENGTH ? 'text-red-500 font-bold' : ''}>
              {inputQuestion.length}/{MAX_INPUT_LENGTH}
            </span>
          </div>
        </form>
      </div>
    </div>
  );
};

