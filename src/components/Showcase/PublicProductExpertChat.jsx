// frontend/src/components/Showcase/PublicProductExpertChat.jsx
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Sparkles,
  X,
  Send,
  Play,
  Compass,
  Shield,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  Calendar,
  Loader2,
  MessageSquarePlus,
} from 'lucide-react';
import { API_BASE_URL } from '../../services/apiService';
import { getOrCreatePublicSessionId, trackPublicEvent } from '../../utils/publicTelemetry';

const MESSAGES_STORAGE_KEY = 'grow_public_expert_messages_v1';

const ARABIC_CHAR_RE = /[\u0600-\u06FF]/;

function loadStoredMessages() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.sessionStorage.getItem(MESSAGES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(-200) : [];
  } catch {
    return [];
  }
}

function saveStoredMessages(messages) {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(MESSAGES_STORAGE_KEY, JSON.stringify(messages.slice(-200)));
  } catch {
    // Ignore storage quota errors
  }
}

const CONTEXT_STARTERS = {
  default: {
    en: [
      'Do our relationship banks need any IT setup or software?',
      'How fast can we migrate existing Excel guarantees & PDFs?',
      'Can we subscribe to just one module first and expand later?',
      'How are our rates, bank statements, and scans encrypted?',
    ],
    ar: [
      'هل تحتاج البنوك المتعاملة معنا إلى أي ربط تقني أو برامج؟',
      'كم يستغرق ترحيل خطابات الضمان الحالية من الإكسيل والـ PDF؟',
      'هل يمكن الاشتراك في وحدة واحدة فقط ثم التوسع لاحقاً؟',
      'كيف يتم تشفير الأسعار وكشوف الحسابات وعزل بيانات شركتنا؟',
    ],
  },
  custody: {
    en: [
      'How does AI detect restrictive claim traps in supplier LGs?',
      'Why are Custody extensions fast-tracked while releases require Maker-Checker?',
      'How do banks verify our QR + Security Code instruction letters?',
      'What happens when an owner or bank delays an expiry action?',
    ],
    ar: [
      'كيف يكشف الذكاء الاصطناعي شروط التسييل المقيدة في ضمانات الموردين؟',
      'لماذا يتم تمديد الضمان الوارد مباشرة بينما يتطلب الإفراج اعتماداً مزدوجاً؟',
      'كيف يتحقق البنك من صحة خطاباتنا عبر رمز الـ QR وكود الأمان؟',
      'كيف تعمل التنبيهات الاستباقية والتصعيد الآلي قبل انتهاء الضمان؟',
    ],
  },
  issuance: {
    en: [
      'Can we customize the department LG request form & approval matrix?',
      'How does the 0–100 bank facility scoring handle urgent tenders?',
      'Can a treasurer override the top-ranked bank facility?',
      'How does Bank LG Position report reconciliation catch variances?',
    ],
    ar: [
      'هل يمكن تخصيص نموذج طلب الإصدار ومصفوفة الموافقات حسب إداراتنا؟',
      'كيف تفاضل المنصة بين التسهيلات البنكية (٠–١٠٠) في العطاءات العاجلة؟',
      'هل يملك مسؤول الخزانة صلاحية اختيار بنك مختلف عن توصية النظام؟',
      'كيف تطابق المنصة تقارير مراكز الضمانات البنكية (LG Position)؟',
    ],
  },
  quotations: {
    en: [
      'How does the RFQ cover Execution vs. Indicative CBE scenarios?',
      'How do bank quotes stay sealed until 00:00 and get benchmarked post-close?',
      'Can we cherry-pick different winning banks per currency leg?',
      'Does Quotations cover FX Spot & T-Bills or FX Forwards too?',
    ],
    ar: [
      'كيف تغطي الوحدة سيناريوهات التنفيذ والأسعار الاسترشادية المتوافقة مع البنك المركزي؟',
      'كيف تبقى عروض البنوك مشفرة حتى الإغلاق وتُقارن بالسوق والمركزي؟',
      'هل يمكن ترسية كل عملة على بنك مختلف في نفس السلة؟',
      'هل تشمل الوحدة العملات الفورية وأذون الخزانة فقط أم عقود الآجل؟',
    ],
  },
  reconciliation: {
    en: [
      'How does it pair cross-bank sweeps when wire fees are deducted?',
      'How does the system learn and evolve rules without exposing PII?',
      'What happens if an uploaded bank statement has missing rows?',
      'Which ERP systems (SAP, Oracle, Dynamics) can import the GL journals?',
    ],
    ar: [
      'كيف يربط النظام التحويلات البينية عند خصم عمولات التحويل في الطريق؟',
      'كيف يتعلم النظام القواعد المتكررة ويتطور مع حماية سرية البيانات؟',
      'كيف يكتشف النظام وجود أسطر ناقصة في كشف الحساب البنكي فور رفعه؟',
      'كيف يتم تصدير قيود اليومية المزدوجة إلى SAP أو Oracle أو Dynamics؟',
    ],
  },
};

function renderInlineBold(text) {
  if (!text) return null;
  const parts = String(text).split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return (
        <strong key={idx} className="font-extrabold text-slate-900">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <React.Fragment key={idx}>{part}</React.Fragment>;
  });
}

function FormattedAnswer({ text, isRtl }) {
  const lines = String(text || '')
    .split('\n')
    .map((l) => l.trim())
    .filter((l, i, arr) => l !== '' || (i > 0 && arr[i - 1] !== ''));

  const blocks = [];
  let currentList = [];

  const flushList = () => {
    if (currentList.length > 0) {
      blocks.push({ type: 'list', items: currentList });
      currentList = [];
    }
  };

  lines.forEach((line) => {
    if (!line) {
      flushList();
      return;
    }
    const bulletMatch = line.match(/^(?:[-*•]|\d+[.)])\s+(.*)$/);
    if (bulletMatch) {
      currentList.push(bulletMatch[1]);
    } else {
      flushList();
      blocks.push({ type: 'p', content: line });
    }
  });
  flushList();

  return (
    <div
      dir={isRtl ? 'rtl' : 'ltr'}
      className="space-y-2 text-[12.5px] sm:text-[13px] text-slate-700 leading-relaxed"
    >
      {blocks.map((b, idx) => {
        if (b.type === 'list') {
          return (
            <ul key={idx} className="space-y-1.5 ps-1">
              {b.items.map((item, li) => (
                <li key={li} className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-1.5 shrink-0" />
                  <span>{renderInlineBold(item)}</span>
                </li>
              ))}
            </ul>
          );
        }
        return <p key={idx}>{renderInlineBold(b.content)}</p>;
      })}
    </div>
  );
}

export default function PublicProductExpertChat({
  lang = 'en',
  pageContext = 'landing',
  activeModuleId = null,
  isOpen = false,
  onOpenChange,
  onShowcaseAction = null,
  onBookMeeting = null,
  stickyClassName = 'lg:top-[44px] lg:h-[calc(100vh-44px)]',
}) {
  const navigate = useNavigate();
  const [messages, setMessages] = useState(() => loadStoredMessages());
  const [inputValue, setInputValue] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const scrollBodyRef = useRef(null);
  const latestTurnTopRef = useRef(null);
  const prevMsgCountRef = useRef(messages.length);
  const inputRef = useRef(null);

  const setOpen = useCallback(
    (nextVal) => {
      if (typeof onOpenChange === 'function') {
        onOpenChange(nextVal);
      }
    },
    [onOpenChange]
  );

  // Ensure Cairo font is available for crisp Arabic rendering even on LandingPage (`/`)
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const id = 'grow-showcase-cairo-font';
    if (!document.getElementById(id)) {
      const link = document.createElement('link');
      link.id = id;
      link.rel = 'stylesheet';
      link.href = 'https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap';
      document.head.appendChild(link);
    }
  }, []);

  useEffect(() => {
    saveStoredMessages(messages);
  }, [messages]);

  // Smart scroll:
  // - When user submits a question -> show user bubble + loading spinner
  // - When AI replies -> scroll strictly to the TOP (beginning) of the new AI answer!
  useEffect(() => {
    if (!isOpen || !scrollBodyRef.current) return;
    const container = scrollBodyRef.current;
    const countChanged = messages.length !== prevMsgCountRef.current;
    prevMsgCountRef.current = messages.length;

    if (!countChanged && !isLoading) return;

    const lastMsg = messages[messages.length - 1];
    if (!lastMsg) return;

    const rafId = window.requestAnimationFrame(() => {
      if (!scrollBodyRef.current) return;
      if (lastMsg.role === 'assistant' && latestTurnTopRef.current) {
        const cRect = container.getBoundingClientRect();
        const tRect = latestTurnTopRef.current.getBoundingClientRect();
        const targetScrollTop = container.scrollTop + (tRect.top - cRect.top) - 12;
        container.scrollTo({
          top: Math.max(0, targetScrollTop),
          behavior: 'smooth',
        });
      } else {
        container.scrollTo({
          top: container.scrollHeight,
          behavior: 'smooth',
        });
      }
    });

    return () => window.cancelAnimationFrame(rafId);
  }, [isOpen, messages, isLoading]);

  useEffect(() => {
    if (isOpen) {
      trackPublicEvent('chatbot_open', {
        page: String(pageContext || '').includes('landing') ? 'landing' : 'demo',
        lang,
        metadata: { page_context: pageContext || 'demo' },
      });
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 140);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [isOpen, lang, pageContext]);

  const isAr = lang === 'ar';
  const dir = isAr ? 'rtl' : 'ltr';
  const fontFamily = isAr ? "'Cairo', 'Inter', sans-serif" : undefined;

  const starterQuestions = useMemo(() => {
    const bucket = CONTEXT_STARTERS[activeModuleId] || CONTEXT_STARTERS.default;
    return isAr ? bucket.ar : bucket.en;
  }, [activeModuleId, isAr]);

  const latestAssistantTurn = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      if (messages[i].role === 'assistant') return messages[i];
    }
    return null;
  }, [messages]);

  const handleActionClick = useCallback(
    (action) => {
      if (!action) return;
      if (typeof onShowcaseAction === 'function') {
        // Close docked panel when opening a centered modal (story/foundation) or on narrower screens;
        // keep docked panel open alongside interactive tour steps on wide desktops!
        const isWideDesktop = typeof window !== 'undefined' && window.innerWidth >= 1360;
        if (action.type !== 'tour' || !isWideDesktop) {
          setOpen(false);
        }
        onShowcaseAction(action);
        return;
      }

      // Navigating from Landing Page (`/`) straight into `/demo` target screen
      const params = new URLSearchParams();
      if (action.type === 'story') {
        params.set('story', action.id);
      } else if (action.type === 'foundation') {
        params.set('foundation', action.id);
      } else if (action.type === 'tour') {
        params.set('branch', action.id);
        if (action.step && action.step > 1) {
          params.set('step', String(action.step));
        }
      }
      const lastLang = latestAssistantTurn?.lang || lang;
      if (lastLang === 'ar') {
        params.set('lang', 'ar');
      }
      setOpen(false);
      navigate(`/demo?${params.toString()}`);
    },
    [lang, latestAssistantTurn, navigate, onShowcaseAction, setOpen]
  );

  const handleBookDemoClick = useCallback(() => {
    setOpen(false);
    if (typeof onBookMeeting === 'function') {
      onBookMeeting();
      return;
    }
    navigate('/#book-meeting');
  }, [navigate, onBookMeeting, setOpen]);

  const sendQuestion = useCallback(
    async (rawText) => {
      const clean = String(rawText || '').trim();
      if (!clean || isLoading) return;

      const detectedAr = ARABIC_CHAR_RE.test(clean);
      const effectiveLang = detectedAr ? 'ar' : isAr ? 'ar' : 'en';

      setErrorMsg('');
      setInputValue('');

      const historyPayload = messages.slice(-6).map((m) => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: String(m.content || '').slice(0, 800),
      }));

      const userTurn = {
        id: `u_${Date.now()}`,
        role: 'user',
        content: clean,
        lang: effectiveLang,
      };
      setMessages((prev) => [...prev, userTurn]);
      setIsLoading(true);

      try {
        const resp = await fetch(`${API_BASE_URL}/public-demo/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question: clean,
            history: historyPayload,
            preferred_lang: effectiveLang,
            page_context: pageContext,
            session_id: getOrCreatePublicSessionId(),
            website_url: honeypot,
          }),
        });

        const data = await resp.json().catch(() => ({}));
        if (!resp.ok) {
          const rawDetail = data?.detail;
          const readableDetail =
            typeof rawDetail === 'string'
              ? rawDetail
              : Array.isArray(rawDetail)
                ? rawDetail.map((d) => d?.msg || JSON.stringify(d)).join('; ')
                : '';
          throw new Error(
            readableDetail ||
              (effectiveLang === 'ar'
                ? 'تعذر الاتصال بالمساعد الذكي حالياً. يرجى المحاولة بعد لحظات.'
                : 'Could not reach Grow AI right now. Please try again in a moment.')
          );
        }

        const aiTurn = {
          id: `a_${Date.now()}`,
          role: 'assistant',
          content: data.answer || '',
          lang: data.lang || effectiveLang,
          actions: Array.isArray(data.actions) ? data.actions : [],
          followUps: Array.isArray(data.follow_ups) ? data.follow_ups : [],
          showCommercialCta: Boolean(data.show_commercial_cta),
        };
        setMessages((prev) => [...prev, aiTurn]);
      } catch (err) {
        setErrorMsg(
          err?.message ||
            (effectiveLang === 'ar'
              ? 'حدث خطأ في الاتصال. يرجى المحاولة مرة أخرى.'
              : 'Connection error. Please try again.')
        );
      } finally {
        setIsLoading(false);
      }
    },
    [honeypot, isAr, isLoading, messages, pageContext]
  );

  const handleClearChat = useCallback(() => {
    setMessages([]);
    setErrorMsg('');
    if (typeof window !== 'undefined') {
      try {
        window.sessionStorage.removeItem(MESSAGES_STORAGE_KEY);
      } catch {
        // Ignore
      }
    }
  }, []);

  if (!isOpen) {
    return null;
  }

  return (
    <>
      {/* Mobile/Tablet Backdrop (<1024px only; Desktop >=1024px squeezes page side-by-side) */}
      <div
        className="fixed inset-0 z-40 bg-slate-950/45 backdrop-blur-[1px] lg:hidden"
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />

      {/* Docked Side-Push Column on Desktop (`lg:sticky`) + Full-Height Drawer on Mobile */}
      <aside
        dir={dir}
        style={{ fontFamily }}
        aria-label={isAr ? 'خبير منصة Grow الذكي' : 'Grow AI Product Expert'}
        className={`fixed inset-y-0 right-0 z-50 w-full max-w-[410px] lg:z-30 lg:static lg:sticky ${stickyClassName} lg:w-[385px] xl:w-[415px] shrink-0 flex flex-col bg-white border-s border-slate-200/95 shadow-2xl lg:shadow-lg overflow-hidden`}
      >
        {/* Header (Clean — zero duplicate EN/AR toggle; synced with page & auto-detects typed language) */}
        <div className="bg-gradient-to-r from-[#121b30] via-[#1e2a4a] to-[#172554] text-white px-4 py-3 shrink-0 border-b border-slate-800">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-blue-500/20 border border-blue-400/35 flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4 text-amber-300" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm font-extrabold text-white truncate">
                    {isAr ? 'خبير منصة Grow الذكي' : 'Grow AI Product Expert'}
                  </h3>
                  <span className="px-1.5 py-0.5 rounded-full text-[9.5px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                    {isAr ? 'مباشر' : 'LIVE'}
                  </span>
                </div>
                <p className="text-[11px] text-blue-200/90 truncate">
                  {isAr
                    ? 'إجابات موثقة + انتقال فوري لشاشات الإثبات'
                    : 'Verified answers + 1-click jump to live screens'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {messages.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearChat}
                  title={isAr ? 'بدء محادثة جديدة' : 'Clear conversation'}
                  className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}

              <button
                type="button"
                onClick={() => setOpen(false)}
                title={isAr ? 'إغلاق اللوحة الجانبية' : 'Close panel'}
                className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Conversation Scroll Body */}
        <div
          ref={scrollBodyRef}
          className="flex-1 min-h-0 overflow-y-auto px-4 py-3.5 space-y-3.5 bg-slate-50/75"
        >
          {messages.length === 0 ? (
            <div className="space-y-3">
              <div className="bg-white rounded-2xl p-3.5 border border-slate-200/90 shadow-2xs">
                <p className="text-xs sm:text-[13px] font-semibold text-slate-800 leading-relaxed">
                  {isAr
                    ? 'اسألني عن أي سيناريو تشغيلي غير مغطى في العرض السريع—ضوابط البنك المركزي، الأمان والتشفير، ترحيل شيتات الإكسيل، أو قيود الـ ERP.'
                    : 'Ask any specific scenario or edge case—CBE workflows, security & cloud isolation, Excel migration, bank onboarding, or ERP exports.'}
                </p>
              </div>

              <div className="space-y-1.5">
                <p className="text-[10.5px] font-extrabold uppercase tracking-wider text-slate-400 px-1">
                  {isAr ? 'أسئلة مقترحة حسب القسم الحالي' : 'Suggested Scenarios & Edge Cases'}
                </p>
                <div className="grid grid-cols-1 gap-1.5">
                  {starterQuestions.map((qText, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => sendQuestion(qText)}
                      className="text-start px-3 py-2.5 rounded-xl bg-white hover:bg-blue-50/90 border border-slate-200/90 hover:border-blue-300 text-xs font-semibold text-slate-700 hover:text-blue-900 transition-all flex items-center justify-between gap-2 group cursor-pointer shadow-2xs"
                    >
                      <span className="leading-snug">{qText}</span>
                      {isAr ? (
                        <ArrowLeft className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 shrink-0" />
                      ) : (
                        <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            messages.map((msg, idx) => {
              const isLatest = idx === messages.length - 1;
              const msgRtl = msg.lang === 'ar' || ARABIC_CHAR_RE.test(msg.content);

              if (msg.role === 'user') {
                return (
                  <div
                    key={msg.id}
                    ref={isLatest ? latestTurnTopRef : undefined}
                    className="flex justify-end"
                  >
                    <div
                      dir={msgRtl ? 'rtl' : 'ltr'}
                      style={msgRtl ? { fontFamily: "'Cairo', 'Inter', sans-serif" } : undefined}
                      className="max-w-[86%] rounded-2xl rounded-ee-sm bg-[#1e2a4a] text-white px-3.5 py-2.5 text-xs sm:text-[13px] font-medium leading-relaxed shadow-2xs"
                    >
                      {msg.content}
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={msg.id}
                  ref={isLatest ? latestTurnTopRef : undefined}
                  style={msgRtl ? { fontFamily: "'Cairo', 'Inter', sans-serif" } : undefined}
                  className="space-y-2 scroll-mt-3"
                >
                  <div className="bg-white rounded-2xl rounded-es-sm border border-slate-200/95 p-3.5 shadow-2xs space-y-3">
                    <FormattedAnswer text={msg.content} isRtl={msgRtl} />

                    {/* 1-Click Validated Showcase Proof Chips */}
                    {msg.actions && msg.actions.length > 0 && (
                      <div
                        dir={msgRtl ? 'rtl' : 'ltr'}
                        className="pt-2 border-t border-slate-100 space-y-1.5"
                      >
                        <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                          {msgRtl ? 'شاهد الإثبات العملي داخل المنصة' : 'See It Live in the Showcase'}
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {msg.actions.map((act, i) => {
                            const ActionIcon =
                              act.type === 'story'
                                ? Play
                                : act.type === 'foundation'
                                ? Shield
                                : Compass;
                            return (
                              <button
                                key={`${act.type}-${act.id}-${i}`}
                                type="button"
                                onClick={() => handleActionClick(act)}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11.5px] font-extrabold bg-blue-50 hover:bg-blue-600 text-blue-800 hover:text-white border border-blue-200 hover:border-blue-600 transition-all cursor-pointer text-start"
                              >
                                <ActionIcon className="w-3 h-3 shrink-0" />
                                <span>{act.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Commercial / Tailored Demo Handoff Card */}
                    {msg.showCommercialCta && (
                      <div
                        dir={msgRtl ? 'rtl' : 'ltr'}
                        className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-2"
                      >
                        <button
                          type="button"
                          onClick={handleBookDemoClick}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors cursor-pointer"
                        >
                          <Calendar className="w-3.5 h-3.5 shrink-0" />
                          <span>{msgRtl ? 'احجز عرضاً مخصصاً لشركتك' : 'Book a Tailored Demo'}</span>
                        </button>
                        <Link
                          to="/free-trial-register"
                          onClick={() => setOpen(false)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 transition-colors"
                        >
                          <span>{msgRtl ? 'ابدأ تجربة مجانية' : 'Start Free Trial'}</span>
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}

          {/* Follow-up Suggestion Chips for Latest Answer */}
          {!isLoading &&
            latestAssistantTurn &&
            latestAssistantTurn.followUps &&
            latestAssistantTurn.followUps.length > 0 && (
              <div
                dir={latestAssistantTurn.lang === 'ar' ? 'rtl' : dir}
                style={
                  latestAssistantTurn.lang === 'ar'
                    ? { fontFamily: "'Cairo', 'Inter', sans-serif" }
                    : undefined
                }
                className="space-y-1 pt-0.5"
              >
                <p className="text-[10px] font-bold text-slate-400 px-1">
                  {latestAssistantTurn.lang === 'ar' || isAr ? 'أسئلة ذات صلة:' : 'Suggested follow-ups:'}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {latestAssistantTurn.followUps.slice(0, 2).map((fq, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => sendQuestion(fq)}
                      className="text-start px-2.5 py-1.5 rounded-xl bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-300 text-[11.5px] font-semibold text-slate-600 hover:text-blue-800 transition-colors cursor-pointer"
                    >
                      {fq}
                    </button>
                  ))}
                </div>
              </div>
            )}

          {/* Loading Indicator */}
          {isLoading && (
            <div className="flex items-center gap-2 bg-white rounded-2xl border border-slate-200 px-3.5 py-2.5 w-fit shadow-2xs">
              <Loader2 className="w-3.5 h-3.5 text-blue-600 animate-spin" />
              <span className="text-xs font-semibold text-slate-600">
                {isAr ? 'يجري تحضير الإجابة الدقيقة...' : 'Checking platform architecture...'}
              </span>
            </div>
          )}

          {/* Error Banner */}
          {errorMsg && (
            <div className="rounded-xl bg-rose-50 border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-800">
              {errorMsg}
            </div>
          )}
        </div>

        {/* Input Composer */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendQuestion(inputValue);
          }}
          className="p-3 bg-white border-t border-slate-200 shrink-0 space-y-2"
        >
          {/* Hidden Honeypot Trap */}
          <input
            type="text"
            name="website_url"
            tabIndex={-1}
            autoComplete="off"
            value={honeypot}
            onChange={(e) => setHoneypot(e.target.value)}
            style={{ position: 'absolute', left: '-9999px', width: '1px', height: '1px', opacity: 0 }}
            aria-hidden="true"
          />

          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              maxLength={2000}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={
                isAr
                  ? 'اكتب سؤالك بالعربية أو English...'
                  : 'Ask in English or بالعربية...'
              }
              className="flex-1 min-w-0 px-3.5 py-2 rounded-xl bg-slate-100/90 focus:bg-white border border-slate-200 focus:border-blue-500 text-xs sm:text-[13px] text-slate-900 placeholder:text-slate-400 focus:outline-none transition-colors"
            />
            <button
              type="submit"
              disabled={!inputValue.trim() || isLoading}
              className="p-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white transition-colors shrink-0 cursor-pointer disabled:cursor-not-allowed"
              title={isAr ? 'إرسال' : 'Send'}
            >
              <Send className={`w-4 h-4 ${isAr ? '-scale-x-100' : ''}`} />
            </button>
          </div>

          <div className="flex items-center justify-between text-[10.5px] text-slate-400 px-0.5">
            <span className="inline-flex items-center gap-1">
              <MessageSquarePlus className="w-3 h-3 text-slate-400" />
              {isAr ? 'يرد تلقائياً بلغة سؤالك' : 'Auto-replies in your typed language'}
            </span>
            <button
              type="button"
              onClick={handleBookDemoClick}
              className="font-bold text-blue-600 hover:text-blue-800 cursor-pointer"
            >
              {isAr ? 'احجز جلسة مباشرة ←' : 'Book a Live Session →'}
            </button>
          </div>
        </form>
      </aside>
    </>
  );
}
