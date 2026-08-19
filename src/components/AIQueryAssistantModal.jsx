import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  Send,
  X,
  Bot,
  AlertCircle,
  FileText,
  Loader2,
  ShieldCheck,
  Cpu,
  HelpCircle,
  Clock,
  UserCheck,
  ExternalLink,
  ArrowRight
} from 'lucide-react';
import { sendAIQuery } from '../services/aiQueryService';

const AIQueryAssistantModal = ({ isOpen, onClose, userRole }) => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([
    {
      sender: 'assistant',
      text: 'Hello! I am your **Grow Treasury & System AI Assistant**.\n\nI am aware of your profile, active subscription plan, and permissions. You can ask me about:\n- **Recent Activity & Audit History**: *\"What did I do recently?\"*, *\"Show organization audit logs\"*\n- **Role Capabilities & Permissions**: *\"What can I do?\"*, *\"What are my permissions?\"*\n- **Step-by-Step System Guides**: *\"How can I record a new LG?\"*, *\"How do I extend an LG?\"*\n- **Portfolio & Facilities**: *\"Show LGs expiring in August\"*, *\"What is our available facility headroom?\"*\n- **Treasury Concepts**: *\"What is cash pooling?\"*, *\"How do forward contracts work?\"*',
      level: 4,
      sourceAwareness: 'SYSTEM_KNOWLEDGE'
    }
  ]);
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const getRolePrefix = () => {
    if (userRole === 'corporate_admin') return 'corporate-admin';
    if (userRole === 'end_user') return 'end-user';
    if (userRole === 'checker') return 'checker';
    if (userRole === 'system_owner') return 'system-owner';
    
    // Fallback from URL pathname
    const path = window.location.pathname;
    if (path.includes('corporate-admin')) return 'corporate-admin';
    if (path.includes('end-user')) return 'end-user';
    if (path.includes('checker')) return 'checker';
    if (path.includes('system-owner')) return 'system-owner';
    return 'corporate-admin';
  };

  const handleNavigateRecord = (ref) => {
    const prefix = getRolePrefix();
    if (ref.lg_id) {
      navigate(`/${prefix}/lg-records/${ref.lg_id}`);
      if (onClose) onClose();
    } else if (ref.url) {
      navigate(ref.url);
      if (onClose) onClose();
    } else if (ref.lg_number) {
      navigate(`/${prefix}/lg-records?search=${encodeURIComponent(ref.lg_number)}`);
      if (onClose) onClose();
    }
  };

  const handleDirectLink = (url) => {
    if (!url) return;
    if (url.startsWith('http://') || url.startsWith('https://')) {
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      navigate(url);
      if (onClose) onClose();
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  if (!isOpen) return null;

  const handleSend = async (overrideText = null, cardId = null) => {
    const queryText = overrideText || question;
    if (!queryText.trim() && !cardId) return;

    // Append User Message (if free text)
    if (queryText.trim()) {
      setMessages((prev) => [...prev, { sender: 'user', text: queryText }]);
    }
    setQuestion('');
    setLoading(true);

    try {
      const res = await sendAIQuery({ question: queryText, cardId });

      if (res && res.success) {
        setMessages((prev) => [
          ...prev,
          {
            sender: 'assistant',
            text: res.answer,
            level: res.level,
            sourceAwareness: res.source_awareness,
            references: res.references || [],
            suggestedChips: res.suggested_chips || [],
            visualMetadata: res.visual_metadata
          }
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            sender: 'assistant',
            text: res?.error || 'Unable to process query at this time.',
            isError: true,
            level: -1,
            references: []
          }
        ]);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          sender: 'assistant',
          text: 'A network or server communication error occurred. Please retry.',
          isError: true,
          level: -1,
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
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
            <Cpu className="w-3 h-3 text-slate-500" />
            L0 SYSTEM CACHE
          </span>
        );
      case 1:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
            <Cpu className="w-3 h-3 text-blue-500" />
            L1 SIMPLE AI + SYSTEM
          </span>
        );
      case 2:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
            <ShieldCheck className="w-3 h-3 text-purple-500" />
            L2 PRIVACY TOKENIZED
          </span>
        );
      case 3:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            <Sparkles className="w-3 h-3 text-emerald-500" />
            L3 TREASURY EXPERT
          </span>
        );
      case 4:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            <HelpCircle className="w-3 h-3 text-amber-500" />
            L4 SYSTEM GUIDE
          </span>
        );
      default:
        return null;
    }
  };

  // Helper to parse basic markdown elements (bold, links, code, bullets)
  const renderFormattedText = (rawText) => {
    if (!rawText) return null;

    const lines = rawText.split('\n');
    return lines.map((line, lIdx) => {
      // Check if line is a bullet item
      const isBullet = line.trim().startsWith('- ') || line.trim().startsWith('* ');
      const cleanLine = isBullet ? line.trim().replace(/^[-*]\s+/, '') : line;

      // Parse inline formatting: **bold**, `code`, [link](url)
      const parts = [];
      let lastIndex = 0;
      const regex = /(\*\*.*?\*\*|`.*?`|\[.*?\]\(.*?\))/g;
      let match;

      while ((match = regex.exec(cleanLine)) !== null) {
        if (match.index > lastIndex) {
          parts.push(cleanLine.substring(lastIndex, match.index));
        }

        const token = match[0];
        if (token.startsWith('**') && token.endsWith('**')) {
          parts.push(
            <strong key={`${lIdx}-${match.index}`} className="font-bold text-slate-900 dark:text-white">
              {token.slice(2, -2)}
            </strong>
          );
        } else if (token.startsWith('`') && token.endsWith('`')) {
          parts.push(
            <code key={`${lIdx}-${match.index}`} className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-xs font-mono text-indigo-600 dark:text-indigo-400">
              {token.slice(1, -1)}
            </code>
          );
        } else if (token.startsWith('[') && token.includes('](')) {
          const title = token.substring(1, token.indexOf(']('));
          const url = token.substring(token.indexOf('](') + 2, token.length - 1);
          parts.push(
            <button
              key={`${lIdx}-${match.index}`}
              onClick={() => handleDirectLink(url)}
              className="inline-flex items-center gap-1 font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-200 underline decoration-indigo-300 underline-offset-2 mx-1 cursor-pointer"
            >
              <span>{title}</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          );
        }

        lastIndex = regex.lastIndex;
      }

      if (lastIndex < cleanLine.length) {
        parts.push(cleanLine.substring(lastIndex));
      }

      if (isBullet) {
        return (
          <div key={lIdx} className="flex items-start space-x-2 my-1 pl-1">
            <span className="text-indigo-500 font-bold leading-tight select-none">•</span>
            <div className="flex-1 leading-relaxed">{parts}</div>
          </div>
        );
      }

      if (!line.trim()) {
        return <div key={lIdx} className="h-2" />;
      }

      return (
        <div key={lIdx} className="leading-relaxed my-0.5">
          {parts}
        </div>
      );
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col h-[700px] max-h-[90vh] overflow-hidden">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700 p-4 text-white flex items-center justify-between shadow-md flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className="bg-white/20 p-2 rounded-xl backdrop-blur-md">
              <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-bold text-base leading-tight">Treasury & System AI Assistant</h3>
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded-full">
                  ACTIVE
                </span>
              </div>
              <p className="text-xs text-indigo-100 opacity-90">
                User-Aware Copilot, Audit Log Explorer & Treasury Guide
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Action Badges */}
        <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center gap-1.5 flex-wrap flex-shrink-0">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">
            Quick Actions:
          </span>
          <button
            onClick={() => handleSend(null, 'my_recent_activity')}
            disabled={loading}
            className="text-xs bg-white dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 px-2.5 py-1 rounded-full flex items-center space-x-1 transition-all shadow-sm active:scale-95 cursor-pointer"
          >
            <Clock className="w-3 h-3 text-indigo-500" />
            <span>Recent Activity</span>
          </button>
          <button
            onClick={() => handleSend(null, 'my_profile_permissions')}
            disabled={loading}
            className="text-xs bg-white dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 px-2.5 py-1 rounded-full flex items-center space-x-1 transition-all shadow-sm active:scale-95 cursor-pointer"
          >
            <UserCheck className="w-3 h-3 text-purple-500" />
            <span>My Permissions</span>
          </button>
          <button
            onClick={() => handleSend(null, 'system_capabilities_guide')}
            disabled={loading}
            className="text-xs bg-white dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 px-2.5 py-1 rounded-full flex items-center space-x-1 transition-all shadow-sm active:scale-95 cursor-pointer"
          >
            <HelpCircle className="w-3 h-3 text-emerald-500" />
            <span>System Guide</span>
          </button>
          <button
            onClick={() => handleSend(null, 'pending_approvals_check')}
            disabled={loading}
            className="text-xs bg-white dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 px-2.5 py-1 rounded-full flex items-center space-x-1 transition-all shadow-sm active:scale-95 cursor-pointer"
          >
            <span className="text-amber-500">⚡</span>
            <span>Pending Approvals</span>
          </button>
          <button
            onClick={() => handleSend(null, 'portfolio_summary')}
            disabled={loading}
            className="text-xs bg-white dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 px-2.5 py-1 rounded-full flex items-center space-x-1 transition-all shadow-sm active:scale-95 cursor-pointer"
          >
            <span className="text-indigo-500">📊</span>
            <span>Portfolio</span>
          </button>
        </div>

        {/* Chat Messages Body */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-50/50 dark:bg-slate-900/50">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[88%] rounded-2xl p-4 shadow-sm ${
                  msg.sender === 'user'
                    ? 'bg-indigo-600 text-white rounded-br-none'
                    : msg.isError
                    ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 border border-rose-200 dark:border-rose-900 rounded-bl-none'
                    : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-bl-none'
                }`}
              >
                {msg.sender === 'assistant' && (
                  <div className="flex items-center justify-between gap-2 mb-2 pb-1.5 border-b border-slate-100 dark:border-slate-700/50">
                    <div className="flex items-center space-x-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                      <Bot className="w-3.5 h-3.5" />
                      <span>Grow Assistant</span>
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

                <div className="text-sm">
                  {renderFormattedText(msg.text)}
                </div>

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

                {/* Referenced LG Badges / Clickable Action Links */}
                {msg.references && msg.references.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700/60">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                        <FileText className="w-3 h-3 text-indigo-500" />
                        Referenced Records ({msg.references.length})
                      </span>
                      <span className="text-[10px] text-slate-400 italic">Click to view details</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {msg.references.map((ref, rIdx) => (
                        <button
                          key={rIdx}
                          onClick={() => handleNavigateRecord(ref)}
                          title={`Navigate to details for ${ref.lg_number}`}
                          className="group bg-indigo-50/90 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/80 text-indigo-700 dark:text-indigo-200 border border-indigo-200/80 dark:border-indigo-800 hover:border-indigo-400 px-3 py-1.5 rounded-xl text-xs flex items-center space-x-1.5 transition-all shadow-sm hover:shadow active:scale-95 cursor-pointer text-left"
                        >
                          <FileText className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform" />
                          <span className="font-bold underline decoration-indigo-300 underline-offset-2">
                            {ref.lg_number}
                          </span>
                          {ref.expiry_date && (
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-normal">
                              (Exp: {ref.expiry_date})
                            </span>
                          )}
                          <ExternalLink className="w-3 h-3 text-indigo-500 ml-0.5 opacity-70 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Interactive In-Chat Clarification Chips */}
                {msg.suggestedChips && msg.suggestedChips.length > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-700/50 flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mr-1">
                      Quick Follow-ups:
                    </span>
                    {msg.suggestedChips.map((chip, chipIdx) => (
                      <button
                        key={chipIdx}
                        onClick={() => handleSend(chip.query)}
                        disabled={loading}
                        className="text-xs bg-indigo-50/90 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/80 text-indigo-700 dark:text-indigo-300 font-medium px-2.5 py-1 rounded-full border border-indigo-200/80 dark:border-indigo-800 hover:border-indigo-400 transition-all hover:scale-105 active:scale-95 flex items-center space-x-1 cursor-pointer shadow-2xs"
                      >
                        <span>{chip.label}</span>
                      </button>
                    ))}
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
              placeholder="Ask about your LGs, your recent activity, permissions, or system workflows..."
              disabled={loading}
              className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white placeholder-slate-400"
            />
            <button
              onClick={() => handleSend()}
              disabled={!question.trim() || loading}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white p-2.5 rounded-xl transition-colors flex items-center justify-center cursor-pointer active:scale-95"
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
