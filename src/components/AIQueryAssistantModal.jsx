// frontend/src/components/AIQueryAssistantModal.jsx
import React, { useState, useEffect, useRef } from 'react';
import { Bot, Sparkles, Send, X, AlertCircle, FileText, Loader2, ShieldCheck, Cpu } from 'lucide-react';
import { sendAIQuery } from '../services/aiQueryService';

const AIQueryAssistantModal = ({ isOpen, onClose }) => {
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState([
    {
      sender: 'assistant',
      text: 'Hello! I am your Treasury AI Assistant. Ask me questions about your organization\'s Letters of Guarantee, bank facilities, or general treasury concepts.\n\n🔒 Note: Conversations are automatically saved for quality analysis and system enhancements.',
      references: [],
      level: 0
    }
  ]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, loading, isOpen]);

  if (!isOpen) return null;

  const handleSend = async (customText = null, cardId = null) => {
    const textToSend = customText || question;
    if (!textToSend.trim() && !cardId) return;
    if (loading) return;

    const userMessage = { sender: 'user', text: customText || question || `[Quick Action: ${cardId}]` };
    setMessages((prev) => [...prev, userMessage]);
    if (!customText && !cardId) setQuestion('');
    setLoading(true);

    try {
      const res = await sendAIQuery(textToSend, cardId);

      if (res.success) {
        setMessages((prev) => [
          ...prev,
          {
            sender: 'assistant',
            text: res.answer || 'No response generated.',
            references: res.references || [],
            visualMetadata: res.visual_metadata || null,
            level: res.level !== undefined ? res.level : 1,
            sourceAwareness: res.source_awareness
          }
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            sender: 'assistant',
            isError: true,
            text: res.error || 'Failed to retrieve answer. Please try again.',
            references: []
          }
        ]);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          sender: 'assistant',
          isError: true,
          text: 'An unexpected network error occurred.',
          references: []
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const getLevelBadge = (level) => {
    switch (level) {
      case 0:
        return (
          <span className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 rounded-md border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
            <Cpu className="w-2.5 h-2.5" /> L0 System Only
          </span>
        );
      case 1:
        return (
          <span className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 rounded-md border border-indigo-300 dark:border-indigo-800 flex items-center gap-1">
            <Sparkles className="w-2.5 h-2.5" /> L1 Simple AI + System
          </span>
        );
      case 2:
        return (
          <span className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 rounded-md border border-purple-300 dark:border-purple-800 flex items-center gap-1">
            <ShieldCheck className="w-2.5 h-2.5" /> L2 Complex AI (Tokenized)
          </span>
        );
      case 3:
        return (
          <span className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300 rounded-md border border-sky-300 dark:border-sky-800 flex items-center gap-1">
            <Bot className="w-2.5 h-2.5" /> L3 General Treasury AI
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl flex flex-col h-[640px] overflow-hidden">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white/10 rounded-xl backdrop-blur-md">
              <Sparkles className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-bold text-lg leading-none">Treasury AI Assistant</h3>
                <span className="px-2 py-0.5 text-[10px] uppercase tracking-wider font-extrabold bg-amber-400 text-slate-900 rounded-full shadow-sm">
                  Experimental
                </span>
              </div>
              <p className="text-xs text-indigo-100 mt-1">4-Level Architecture & Governance Guardrails</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/20 rounded-lg transition-colors text-white/80 hover:text-white"
            title="Close Assistant"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Suggest Chips - Predefined Card IDs trigger Level 0 (Bypasses AI) */}
        <div className="bg-slate-50 dark:bg-slate-950 px-6 py-2.5 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center gap-1.5 text-xs flex-shrink-0">
          <span className="text-slate-400 font-semibold mr-1">Quick Cards (L0):</span>
          <button
            onClick={() => handleSend(null, 'pending_approvals_check')}
            disabled={loading}
            className="bg-white dark:bg-slate-800 hover:bg-amber-50 dark:hover:bg-slate-700 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-slate-700 px-2 py-1 rounded-lg transition-colors font-medium text-[11px]"
          >
            ⚡ Pending Approvals
          </button>
          <button
            onClick={() => handleSend(null, 'expiring_60_days')}
            disabled={loading}
            className="bg-white dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-slate-700 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-slate-700 px-2 py-1 rounded-lg transition-colors font-medium text-[11px]"
          >
            ⌛ Expiring in 60 Days
          </button>
          <button
            onClick={() => handleSend(null, 'portfolio_summary')}
            disabled={loading}
            className="bg-white dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-slate-700 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-slate-700 px-2 py-1 rounded-lg transition-colors font-medium text-[11px]"
          >
            📊 Portfolio Exposure
          </button>
          <button
            onClick={() => handleSend(null, 'facility_summary')}
            disabled={loading}
            className="bg-white dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-slate-700 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-slate-700 px-2 py-1 rounded-lg transition-colors font-medium text-[11px]"
          >
            🏦 Credit Facilities
          </button>
        </div>

        {/* Chat History Container */}
        <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-slate-50/50 dark:bg-slate-900/50">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl p-4 shadow-sm ${
                  msg.sender === 'user'
                    ? 'bg-indigo-600 text-white rounded-br-none'
                    : msg.isError
                    ? 'bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 rounded-bl-none'
                    : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-bl-none'
                }`}
              >
                {msg.sender === 'assistant' && (
                  <div className="flex items-center justify-between gap-2 mb-2 pb-1.5 border-b border-slate-100 dark:border-slate-700/50">
                    <div className="flex items-center space-x-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                      <Bot className="w-3.5 h-3.5" />
                      <span>AI Assistant</span>
                    </div>
                    {getLevelBadge(msg.level)}
                  </div>
                )}
                
                {msg.isError && (
                  <div className="flex items-center space-x-1.5 mb-1 text-xs font-semibold text-rose-600">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>Query Restricted / Error</span>
                  </div>
                )}

                <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>

                {/* Visual Summary Card */}
                {msg.visualMetadata && (
                  <div className="mt-3 p-3 bg-indigo-50/70 dark:bg-slate-950/60 border border-indigo-100 dark:border-slate-800 rounded-xl space-y-2">
                    {msg.visualMetadata.type === 'portfolio_summary' && (
                      <div>
                        <div className="flex items-center justify-between text-xs font-bold text-indigo-700 dark:text-indigo-300 mb-2">
                          <span>Portfolio Financial Breakdown</span>
                          <span className="bg-indigo-600 text-white px-2 py-0.5 rounded-full text-[10px]">
                            {msg.visualMetadata.total_count} LG Records
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          {Object.entries(msg.visualMetadata.currencies || {}).map(([curr, amt]) => (
                            <div key={curr} className="bg-white dark:bg-slate-800 p-2 rounded-lg border border-slate-200 dark:border-slate-700">
                              <span className="text-[10px] text-slate-400 font-bold uppercase block">{curr} Exposure</span>
                              <span className="font-extrabold text-indigo-600 dark:text-indigo-400 text-sm">
                                {Number(amt).toLocaleString(undefined, { maximumFractionDigits: 0 })} {curr}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {msg.visualMetadata.type === 'facility_analytics' && (
                      <div>
                        <div className="flex items-center justify-between text-xs font-bold text-indigo-700 dark:text-indigo-300 mb-2">
                          <span>Bank Credit Facilities Overview</span>
                          <span className="bg-indigo-600 text-white px-2 py-0.5 rounded-full text-[10px]">
                            {msg.visualMetadata.total_facilities} Active Credit Lines
                          </span>
                        </div>
                        <div className="space-y-1.5">
                          {Object.entries(msg.visualMetadata.bank_limits || {}).map(([bank, currs]) => (
                            <div key={bank} className="bg-white dark:bg-slate-800 p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs flex justify-between items-center">
                              <span className="font-bold text-slate-700 dark:text-slate-200">{bank}</span>
                              <div className="flex gap-2 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">
                                {Object.entries(currs).map(([c, val]) => (
                                  <span key={c}>{Number(val).toLocaleString()} {c}</span>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Referenced LG Badges */}
                {msg.references && msg.references.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700/60">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-2">
                      Referenced Records ({msg.references.length})
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {msg.references.map((ref, idx) => (
                        <div
                          key={idx}
                          className="bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 px-2.5 py-1 rounded-lg text-xs flex items-center space-x-1.5"
                        >
                          <FileText className="w-3 h-3 text-indigo-500" />
                          <span className="font-semibold">{ref.lg_number}</span>
                          {ref.expiry_date && (
                            <span className="text-[10px] text-slate-500 dark:text-slate-400">
                              (Exp: {ref.expiry_date})
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl rounded-bl-none p-4 flex items-center space-x-2 text-slate-500">
                <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                <span className="text-xs font-medium">Evaluating policy rules & executing query...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex flex-col gap-2 flex-shrink-0">
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Ask a question about your LGs or treasury concepts..."
              disabled={loading}
              className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white placeholder-slate-400"
            />
            <button
              onClick={() => handleSend()}
              disabled={!question.trim() || loading}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white p-2.5 rounded-xl transition-colors flex items-center justify-center"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          <div className="text-[10px] text-slate-400 dark:text-slate-500 text-center flex items-center justify-center gap-1">
            <ShieldCheck className="w-3 h-3 text-indigo-400" />
            <span>Conversations are saved to secure cloud storage for analytical quality review & enhancements.</span>
          </div>
        </div>

      </div>
    </div>
  );
};

export default AIQueryAssistantModal;
