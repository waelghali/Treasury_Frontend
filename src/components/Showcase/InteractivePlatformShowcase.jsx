// frontend/src/components/Showcase/InteractivePlatformShowcase.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Shield,
  Send,
  TrendingUp,
  FileSpreadsheet,
  Play,
  Pause,
  Square,
  Volume2,
  VolumeX,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  FileText,
  ExternalLink,
  Sparkles,
  Maximize2,
  Minimize2,
  PanelLeftClose,
  PanelLeftOpen,
  Lock,
  QrCode,
  Users,
  MousePointerClick,
  RotateCcw,
  X,
  Layers,
  Clock,
  BookOpen,
} from 'lucide-react';
import {
  PLATFORM_FOUNDATION_PILLARS,
  PLATFORM_MODULES,
  PILOT_BRANCH_STEPS,
} from './showcaseCatalog';
import pilotManifest from './pilotManifest.json';

const MODULE_ICONS = {
  custody: Shield,
  issuance: Send,
  quotations: TrendingUp,
  reconciliation: FileSpreadsheet,
};

const FOUNDATION_ICONS = {
  users: Users,
  lock: Lock,
  qrcode: QrCode,
  layers: Layers,
};

const ACCENT_STYLES = {
  blue: {
    pill: 'bg-blue-50 text-blue-700 border-blue-200',
    iconBg: 'bg-blue-600 text-white shadow-blue-600/25',
    trunkBorder: 'border-blue-200/90 hover:border-blue-400',
    topBar: 'from-blue-600 to-indigo-600',
    spine: 'border-blue-200',
    liveCard: 'bg-white border-slate-200/90 hover:border-blue-400 hover:bg-blue-50/35 hover:shadow-sm hover:shadow-blue-600/10',
    hoverPill: 'bg-blue-600 text-white',
    liveBtn: 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs shadow-blue-600/20',
    pitchBtn: 'bg-blue-50/80 hover:bg-blue-100/80 text-blue-900 border-blue-200/90',
    codeBadge: 'bg-blue-50 text-blue-700 border border-blue-200/90 group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600',
    durationText: 'text-slate-500',
    hoverTitle: 'group-hover:text-blue-700',
    divider: 'border-blue-200/60',
    iconText: 'text-blue-600',
    actionBox: 'bg-blue-50/90 border-blue-200 text-blue-950',
    doneStep: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100',
  },
  purple: {
    pill: 'bg-purple-50 text-purple-700 border-purple-200',
    iconBg: 'bg-purple-600 text-white shadow-purple-600/25',
    trunkBorder: 'border-purple-200/90 hover:border-purple-400',
    topBar: 'from-purple-600 to-fuchsia-600',
    spine: 'border-purple-200',
    liveCard: 'bg-white border-slate-200/90 hover:border-purple-400 hover:bg-purple-50/35 hover:shadow-sm hover:shadow-purple-600/10',
    hoverPill: 'bg-purple-600 text-white',
    liveBtn: 'bg-purple-600 hover:bg-purple-700 text-white shadow-xs shadow-purple-600/20',
    pitchBtn: 'bg-purple-50/80 hover:bg-purple-100/80 text-purple-900 border-purple-200/90',
    codeBadge: 'bg-purple-50 text-purple-700 border border-purple-200/90 group-hover:bg-purple-600 group-hover:text-white group-hover:border-purple-600',
    durationText: 'text-slate-500',
    hoverTitle: 'group-hover:text-purple-700',
    divider: 'border-purple-200/60',
    iconText: 'text-purple-600',
    actionBox: 'bg-purple-50/90 border-purple-200 text-purple-950',
    doneStep: 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100',
  },
  emerald: {
    pill: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    iconBg: 'bg-emerald-600 text-white shadow-emerald-600/25',
    trunkBorder: 'border-emerald-200/90 hover:border-emerald-400',
    topBar: 'from-emerald-600 to-teal-600',
    spine: 'border-emerald-200',
    liveCard: 'bg-white border-slate-200/90 hover:border-emerald-400 hover:bg-emerald-50/35 hover:shadow-sm hover:shadow-emerald-600/10',
    hoverPill: 'bg-emerald-600 text-white',
    liveBtn: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs shadow-emerald-600/20',
    pitchBtn: 'bg-emerald-50/80 hover:bg-emerald-100/80 text-emerald-900 border-emerald-200/90',
    codeBadge: 'bg-emerald-50 text-emerald-700 border border-emerald-200/90 group-hover:bg-emerald-600 group-hover:text-white group-hover:border-emerald-600',
    durationText: 'text-slate-500',
    hoverTitle: 'group-hover:text-emerald-700',
    divider: 'border-emerald-200/60',
    iconText: 'text-emerald-600',
    actionBox: 'bg-emerald-50/90 border-emerald-200 text-emerald-950',
    doneStep: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100',
  },
  amber: {
    pill: 'bg-amber-50 text-amber-800 border-amber-200',
    iconBg: 'bg-amber-500 text-white shadow-amber-500/25',
    trunkBorder: 'border-amber-200/90 hover:border-amber-400',
    topBar: 'from-amber-500 to-orange-500',
    spine: 'border-amber-200',
    liveCard: 'bg-white border-slate-200/90 hover:border-amber-400 hover:bg-amber-50/35 hover:shadow-sm hover:shadow-amber-500/10',
    hoverPill: 'bg-amber-600 text-white',
    liveBtn: 'bg-amber-600 hover:bg-amber-700 text-white shadow-xs shadow-amber-600/20',
    pitchBtn: 'bg-amber-50/80 hover:bg-amber-100/80 text-amber-950 border-amber-200/90',
    codeBadge: 'bg-amber-50 text-amber-800 border border-amber-200/90 group-hover:bg-amber-600 group-hover:text-white group-hover:border-amber-600',
    durationText: 'text-slate-500',
    hoverTitle: 'group-hover:text-amber-800',
    divider: 'border-amber-200/60',
    iconText: 'text-amber-600',
    actionBox: 'bg-amber-50/90 border-amber-200 text-amber-950',
    doneStep: 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100',
  },
};

const STEP_URLS = {
  1: 'app.growbusinessdevelopment.com/end-user/lg-records/new',
  2: 'app.growbusinessdevelopment.com/end-user/lg-records/new',
  3: 'app.growbusinessdevelopment.com/end-user/lg-records/new#main-lg-data',
  4: 'app.growbusinessdevelopment.com/end-user/lg-records/new#bank-data',
  5: 'app.growbusinessdevelopment.com/end-user/lg-records/new#internal-data',
  6: 'app.growbusinessdevelopment.com/end-user/lg-records',
  7: 'app.growbusinessdevelopment.com/end-user/lg-records/details',
};

const BRANCH_AUDIO_DIRS = {
  'custody-scan-record': 'custody_scan',
  'custody-action-center': 'custody_action_center',
  'custody-lifecycle-letter': 'custody_lifecycle',
  'custody-delivery-reply': 'custody_delivery_reply',
  'issuance-intake': 'issuance_intake',
  'issuance-facility-scoring': 'issuance_scoring',
  'issuance-bank-form': 'issuance_bank_form',
  'issuance-position-recon': 'issuance_recon',
  'quotations-rfq-broadcast': 'quotations_rfq',
  'quotations-dealer-desk': 'quotations_dealer',
  'quotations-net-award': 'quotations_award',
  'recon-zero-config': 'recon_import',
  'recon-sweeps-reversals': 'recon_sweeps',
  'recon-rules-privacy': 'recon_rules',
  'recon-erp-export': 'recon_export',
};

const AUDIO_CACHE_VER = 'v6';
const BRIEF_AUTO_ADVANCE_DELAY_MS = 1600;

function resolveBriefTarget(kind, id) {
  if (kind === 'module') {
    const mod = PLATFORM_MODULES.find((m) => m.id === id) || PLATFORM_MODULES[0];
    if (!mod?.executivePitch) return null;
    return {
      kind: 'module',
      id: mod.id,
      mod,
      accent: mod.accent,
      audioKey: mod.executivePitch.audioKey,
      titleEn: mod.titleEn,
      titleAr: mod.titleAr,
      tagEn: mod.executivePitch.tagEn,
      tagAr: mod.executivePitch.tagAr,
      headlineEn: mod.executivePitch.headlineEn,
      headlineAr: mod.executivePitch.headlineAr,
      pitchEn: mod.executivePitch.pitchEn,
      pitchAr: mod.executivePitch.pitchAr,
      outcomesEn: mod.executivePitch.outcomesEn,
      outcomesAr: mod.executivePitch.outcomesAr,
    };
  }
  const pillar =
    PLATFORM_FOUNDATION_PILLARS.find((p) => p.id === id) || PLATFORM_FOUNDATION_PILLARS[0];
  return {
    kind: 'foundation',
    id: pillar.id,
    pillar,
    accent: 'blue',
    audioKey: pillar.audioKey,
    titleEn: pillar.shortEn,
    titleAr: pillar.shortAr,
    tagEn: pillar.tagEn,
    tagAr: pillar.tagAr,
    headlineEn: pillar.headlineEn,
    headlineAr: pillar.headlineAr,
    pitchEn: pillar.pitchEn,
    pitchAr: pillar.pitchAr,
    outcomesEn: pillar.outcomesEn,
    outcomesAr: pillar.outcomesAr,
  };
}

export default function InteractivePlatformShowcase({ embedded = false, initialLang = 'en' }) {
  const [lang, setLang] = useState(initialLang);
  const [view, setView] = useState('tree'); // 'tree' | 'stage'
  const [activeBranchId, setActiveBranchId] = useState('custody-scan-record');
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [hideNotesInFullScreen, setHideNotesInFullScreen] = useState(false);
  const [sideTab, setSideTab] = useState('guide'); // 'guide' | 'pdf'
  const [nudgeHotspot, setNudgeHotspot] = useState(false);
  const [plannedModalBranch, setPlannedModalBranch] = useState(null);
  const [briefModal, setBriefModal] = useState(null); // { kind: 'module' | 'foundation', id: string } | null
  const rootRef = useRef(null);

  // Text-to-Voice Reader State
  const [speechState, setSpeechState] = useState('idle'); // 'idle' | 'playing' | 'paused'
  const [voiceChannel, setVoiceChannel] = useState('step'); // 'step' | 'brief'
  const [autoRead, setAutoRead] = useState(false); // Persistent continuous voice mode across steps & tours
  const [stepAutoAdvance, setStepAutoAdvance] = useState(true); // Auto-advance through steps & module tours (1.1 -> 1.2 -> ...)
  const [stepAutoNextCountdown, setStepAutoNextCountdown] = useState(false);
  const [briefAutoAdvance, setBriefAutoAdvance] = useState(true);
  const [autoNextCountdown, setAutoNextCountdown] = useState(false);
  const [speechRate, setSpeechRate] = useState(1.0);
  const audioRef = useRef(null);
  const synthActiveRef = useRef(false);
  const stepAutoTimerRef = useRef(null);
  const briefAutoTimerRef = useRef(null);
  const briefVisitedRef = useRef(new Set());
  const autoReadRef = useRef(autoRead);
  const stepAutoAdvanceRef = useRef(stepAutoAdvance);
  const viewRef = useRef(view);
  const currentStepIdxRef = useRef(currentStepIdx);
  const totalStepsRef = useRef(0);
  const nextLiveBranchRef = useRef(null);
  const briefModalRef = useRef(briefModal);
  const briefAutoAdvanceRef = useRef(briefAutoAdvance);
  const langRef = useRef(lang);
  const speechRateRef = useRef(speechRate);
  const playBriefVoiceRef = useRef(null);

  autoReadRef.current = autoRead;
  stepAutoAdvanceRef.current = stepAutoAdvance;
  viewRef.current = view;
  currentStepIdxRef.current = currentStepIdx;
  briefModalRef.current = briefModal;
  briefAutoAdvanceRef.current = briefAutoAdvance;
  langRef.current = lang;
  speechRateRef.current = speechRate;

  const isAr = lang === 'ar';
  const dir = isAr ? 'rtl' : 'ltr';

  // Load Cairo font for crisp Arabic typography
  useEffect(() => {
    const id = 'grow-showcase-cairo-font';
    if (!document.getElementById(id)) {
      const link = document.createElement('link');
      link.id = id;
      link.rel = 'stylesheet';
      link.href = 'https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap';
      document.head.appendChild(link);
    }
  }, []);

  // Preload Web Speech API voices in background
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.getVoices();
      const onVoices = () => window.speechSynthesis.getVoices();
      window.speechSynthesis.addEventListener?.('voiceschanged', onVoices);
      return () => window.speechSynthesis.removeEventListener?.('voiceschanged', onVoices);
    }
    return undefined;
  }, []);

  const stepsNarrative = PILOT_BRANCH_STEPS[activeBranchId] || [];
  const activeBranchMeta = pilotManifest?.branches?.[activeBranchId] || null;
  const capturedSteps = activeBranchMeta?.capturedSteps || pilotManifest?.capturedSteps || [];
  const activeDocument = activeBranchMeta?.document || pilotManifest?.document || {};
  const totalSteps = stepsNarrative.length;
  const activeNarrative = stepsNarrative[currentStepIdx] || stepsNarrative[0];
  const activeCapture =
    capturedSteps.find((s) => s.step === activeNarrative?.step) || capturedSteps[currentStepIdx] || {};

  // Active Module & Live Tour chaining metadata for Stage View
  const activeStageModule =
    PLATFORM_MODULES.find((m) => m.branches.some((b) => b.id === activeBranchId)) || PLATFORM_MODULES[0];
  const activeStageStyle = ACCENT_STYLES[activeStageModule.accent] || ACCENT_STYLES.blue;
  const activeBranchObj =
    activeStageModule.branches.find((b) => b.id === activeBranchId) || activeStageModule.branches[0];
  const moduleLiveBranches = activeStageModule.branches.filter((b) => b.status === 'live');
  const activeLiveBranchIdx = moduleLiveBranches.findIndex((b) => b.id === activeBranchId);
  const nextLiveBranch =
    activeLiveBranchIdx >= 0 && activeLiveBranchIdx < moduleLiveBranches.length - 1
      ? moduleLiveBranches[activeLiveBranchIdx + 1]
      : null;

  totalStepsRef.current = totalSteps;
  nextLiveBranchRef.current = nextLiveBranch;

  const clearStepAutoTimer = useCallback(() => {
    if (stepAutoTimerRef.current) {
      clearTimeout(stepAutoTimerRef.current);
      stepAutoTimerRef.current = null;
    }
    setStepAutoNextCountdown(false);
  }, []);

  const clearBriefAutoTimer = useCallback(() => {
    if (briefAutoTimerRef.current) {
      clearTimeout(briefAutoTimerRef.current);
      briefAutoTimerRef.current = null;
    }
    setAutoNextCountdown(false);
  }, []);

  // Stop any ongoing audio / speech synthesis cleanly (preserves persistent `autoRead` preference)
  const stopVoice = useCallback(() => {
    clearStepAutoTimer();
    clearBriefAutoTimer();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    synthActiveRef.current = false;
    setSpeechState('idle');
  }, [clearBriefAutoTimer, clearStepAutoTimer]);

  // Handle end-of-narration auto-advance for BOTH Stage Steps/Tours AND Executive Pitch Modal
  const handleVoiceChannelEnded = useCallback(
    (channel) => {
      setSpeechState('idle');

      if (channel === 'step') {
        if (
          viewRef.current !== 'stage' ||
          briefModalRef.current ||
          !autoReadRef.current ||
          !stepAutoAdvanceRef.current
        ) {
          return;
        }
        const hasMoreSteps = currentStepIdxRef.current < totalStepsRef.current - 1;
        const hasNextTour = !hasMoreSteps && Boolean(nextLiveBranchRef.current);
        if (!hasMoreSteps && !hasNextTour) {
          return;
        }

        setStepAutoNextCountdown(true);
        stepAutoTimerRef.current = setTimeout(() => {
          stepAutoTimerRef.current = null;
          setStepAutoNextCountdown(false);
          if (
            viewRef.current !== 'stage' ||
            briefModalRef.current ||
            !autoReadRef.current ||
            !stepAutoAdvanceRef.current
          ) {
            return;
          }
          if (currentStepIdxRef.current < totalStepsRef.current - 1) {
            setSideTab('guide');
            setCurrentStepIdx((prev) => prev + 1);
          } else if (nextLiveBranchRef.current) {
            setSideTab('guide');
            setActiveBranchId(nextLiveBranchRef.current.id);
            setCurrentStepIdx(0);
          }
        }, BRIEF_AUTO_ADVANCE_DELAY_MS);
        return;
      }

      if (channel !== 'brief') return;
      const currentModal = briefModalRef.current;
      if (!currentModal || !briefAutoAdvanceRef.current) return;

      const list =
        currentModal.kind === 'module' ? PLATFORM_MODULES : PLATFORM_FOUNDATION_PILLARS;
      const curIdx = list.findIndex((item) => item.id === currentModal.id);
      if (curIdx === -1) return;

      const nextItem = list[(curIdx + 1) % list.length];
      if (!nextItem || briefVisitedRef.current.has(nextItem.id)) {
        briefVisitedRef.current.clear();
        return;
      }

      setAutoNextCountdown(true);
      briefAutoTimerRef.current = setTimeout(() => {
        briefAutoTimerRef.current = null;
        setAutoNextCountdown(false);
        if (!briefModalRef.current || !briefAutoAdvanceRef.current) return;

        briefVisitedRef.current.add(nextItem.id);
        const nextModal = { kind: currentModal.kind, id: nextItem.id };
        briefModalRef.current = nextModal;
        setBriefModal(nextModal);

        const nextTarget = resolveBriefTarget(currentModal.kind, nextItem.id);
        if (nextTarget && playBriefVoiceRef.current) {
          playBriefVoiceRef.current(nextTarget, langRef.current, speechRateRef.current);
        }
      }, BRIEF_AUTO_ADVANCE_DELAY_MS);
    },
    []
  );

  // Speak arbitrary text via Web Speech API fallback if static neural MP3 is unavailable
  const speakRawTextWithWebSpeech = useCallback((rawText, targetLang, rate, channel = 'step') => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window) || !rawText) {
      setSpeechState('idle');
      return;
    }
    window.speechSynthesis.cancel();
    const ar = targetLang === 'ar';
    const cleanedText = ar
      ? rawText
          .replace(/ج\.م/g, 'جنيه مصري')
          .replace(/\bGrow\b/gi, 'جرو')
          .replace(/\bPDF\b/gi, 'بي دي إف')
          .replace(/\bQR\b/gi, 'كيو آر')
          .replace(/\bERP\b/gi, 'إي آر بي')
      : rawText
          .replace(/\bWORM-audited\b/gi, 'tamper-proof')
          .replace(/\bCFOs\b/g, 'Chief Financial Officers')
          .replace(/\bLGs\b/g, 'Letters of Guarantee');

    const utter = new SpeechSynthesisUtterance(cleanedText);
    utter.lang = ar ? 'ar-EG' : 'en-US';
    utter.rate = rate;

    const voices = window.speechSynthesis.getVoices() || [];
    const langPrefix = ar ? 'ar' : 'en';
    const preferred =
      voices.find((v) => v.lang?.toLowerCase().startsWith(langPrefix) && /ava|andrew|multilingual|natural|online|google|salma|shakir|aria/i.test(v.name)) ||
      voices.find((v) => v.lang?.toLowerCase().startsWith(langPrefix));
    if (preferred) utter.voice = preferred;

    utter.onstart = () => {
      synthActiveRef.current = true;
      setVoiceChannel(channel);
      setSpeechState('playing');
    };
    utter.onend = () => {
      synthActiveRef.current = false;
      handleVoiceChannelEnded(channel);
    };
    utter.onerror = () => {
      synthActiveRef.current = false;
      setSpeechState('idle');
    };
    synthActiveRef.current = true;
    setVoiceChannel(channel);
    setSpeechState('playing');
    window.speechSynthesis.speak(utter);
  }, [handleVoiceChannelEnded]);

  const playAudioWithFallback = useCallback(
    ({ mp3Url, fallbackText, targetLang = lang, rate = speechRate, channel = 'step' }) => {
      stopVoice();
      setVoiceChannel(channel);
      if (mp3Url) {
        const audio = new Audio(mp3Url);
        audio.playbackRate = rate;
        audioRef.current = audio;

        audio.onended = () => {
          if (audioRef.current === audio) {
            audioRef.current = null;
            handleVoiceChannelEnded(channel);
          }
        };
        audio.onerror = () => {
          if (audioRef.current === audio) {
            audioRef.current = null;
            speakRawTextWithWebSpeech(fallbackText, targetLang, rate, channel);
          }
        };

        setSpeechState('playing');
        audio.play().catch(() => {
          if (audioRef.current === audio) {
            audioRef.current = null;
            speakRawTextWithWebSpeech(fallbackText, targetLang, rate, channel);
          }
        });
      } else {
        speakRawTextWithWebSpeech(fallbackText, targetLang, rate, channel);
      }
    },
    [lang, speechRate, speakRawTextWithWebSpeech, stopVoice, handleVoiceChannelEnded]
  );

  // Start reading current step notes (Neural MP3 primary -> Web Speech API fallback)
  const playStepVoice = useCallback(
    (stepObj = activeNarrative, targetLang = lang, rate = speechRate) => {
      if (!stepObj) return;
      const ar = targetLang === 'ar';
      const fallbackText = ar
        ? `${stepObj.headlineAr}. ${stepObj.guideAr}. ${stepObj.actionLabelAr}.`
        : `${stepObj.headlineEn}. ${stepObj.guideEn} ${stepObj.actionLabelEn}.`;
      const folder = activeBranchMeta?.audioDir || BRANCH_AUDIO_DIRS[activeBranchId];
      const mp3Url = folder
        ? `/demo/audio/${folder}/step${stepObj.step}_${targetLang}.mp3?v=${AUDIO_CACHE_VER}`
        : null;
      playAudioWithFallback({ mp3Url, fallbackText, targetLang, rate, channel: 'step' });
    },
    [activeBranchId, activeBranchMeta, activeNarrative, lang, playAudioWithFallback, speechRate]
  );

  // Resolve current Brief Modal object (either Module Executive Pitch or Foundation Pillar)
  const activeBriefData = briefModal ? resolveBriefTarget(briefModal.kind, briefModal.id) : null;

  const playBriefVoice = useCallback(
    (briefObj = activeBriefData, targetLang = lang, rate = speechRate) => {
      if (!briefObj) return;
      const ar = targetLang === 'ar';
      const fallbackText = ar
        ? `${briefObj.headlineAr}. ${briefObj.pitchAr}`
        : `${briefObj.headlineEn}. ${briefObj.pitchEn}`;
      const mp3Url = briefObj.audioKey
        ? `/demo/audio/pitches/${briefObj.audioKey}_${targetLang}.mp3?v=${AUDIO_CACHE_VER}`
        : null;
      playAudioWithFallback({ mp3Url, fallbackText, targetLang, rate, channel: 'brief' });
    },
    [activeBriefData, lang, playAudioWithFallback, speechRate]
  );

  playBriefVoiceRef.current = playBriefVoice;

  const turnOffStepVoice = useCallback(() => {
    autoReadRef.current = false;
    setAutoRead(false);
    stopVoice();
  }, [stopVoice]);

  const togglePlayPauseVoice = useCallback(() => {
    if (stepAutoNextCountdown) {
      clearStepAutoTimer();
      return;
    }
    if (voiceChannel === 'step' && speechState === 'playing') {
      if (audioRef.current) {
        audioRef.current.pause();
        setSpeechState('paused');
      } else if (synthActiveRef.current && typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.pause();
        setSpeechState('paused');
      } else {
        stopVoice();
      }
    } else if (voiceChannel === 'step' && speechState === 'paused') {
      autoReadRef.current = true;
      setAutoRead(true);
      if (audioRef.current) {
        audioRef.current.playbackRate = speechRate;
        audioRef.current.play().catch(() => setSpeechState('idle'));
        setSpeechState('playing');
      } else if (synthActiveRef.current && typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.resume();
        setSpeechState('playing');
      } else {
        playStepVoice();
      }
    } else {
      // Turning Read Notes ON keeps continuous voice active across all steps & module tours (1.1, 1.2, ...)
      autoReadRef.current = true;
      setAutoRead(true);
      playStepVoice();
    }
  }, [
    stepAutoNextCountdown,
    clearStepAutoTimer,
    voiceChannel,
    speechState,
    speechRate,
    playStepVoice,
    stopVoice,
  ]);

  const toggleBriefVoice = useCallback(() => {
    if (autoNextCountdown) {
      stopVoice();
      return;
    }
    if (voiceChannel === 'brief' && speechState === 'playing') {
      if (audioRef.current) {
        audioRef.current.pause();
        setSpeechState('paused');
      } else if (synthActiveRef.current && typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.pause();
        setSpeechState('paused');
      } else {
        stopVoice();
      }
    } else if (voiceChannel === 'brief' && speechState === 'paused') {
      if (audioRef.current) {
        audioRef.current.playbackRate = speechRate;
        audioRef.current.play().catch(() => setSpeechState('idle'));
        setSpeechState('playing');
      } else if (synthActiveRef.current && typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.resume();
        setSpeechState('playing');
      } else {
        if (briefModal?.id) briefVisitedRef.current = new Set([briefModal.id]);
        playBriefVoice();
      }
    } else {
      if (briefModal?.id) briefVisitedRef.current = new Set([briefModal.id]);
      playBriefVoice();
    }
  }, [autoNextCountdown, briefModal, voiceChannel, speechState, speechRate, playBriefVoice, stopVoice]);

  const openBrief = useCallback(
    (kind, id, autoPlay = false) => {
      stopVoice();
      const nextModal = { kind, id };
      briefModalRef.current = nextModal;
      setBriefModal(nextModal);
      if (autoPlay) {
        briefVisitedRef.current = new Set([id]);
        const target = resolveBriefTarget(kind, id);
        if (target) {
          playBriefVoice(target, langRef.current, speechRateRef.current);
        }
      } else {
        briefVisitedRef.current.clear();
      }
    },
    [playBriefVoice, stopVoice]
  );

  const closeBrief = useCallback(() => {
    briefVisitedRef.current.clear();
    stopVoice();
    briefModalRef.current = null;
    setBriefModal(null);
  }, [stopVoice]);

  const cycleSpeechRate = useCallback(() => {
    const nextRate = speechRate === 1.0 ? 1.2 : 1.0;
    setSpeechRate(nextRate);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextRate;
    }
  }, [speechRate]);

  // Stop voice on unmount or when leaving stage; auto-read on step/lang change if enabled
  useEffect(() => () => stopVoice(), [stopVoice]);

  useEffect(() => {
    if (briefModal) {
      stopVoice();
      return;
    }
    if (view !== 'stage') {
      stopVoice();
      return;
    }
    if (autoRead && activeNarrative) {
      playStepVoice(activeNarrative, lang, speechRate);
    } else {
      stopVoice();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, currentStepIdx, lang, activeBranchId]);

  const openBranch = useCallback(
    (branch, moduleObj) => {
      if (branch.status === 'live') {
        stopVoice();
        setActiveBranchId(branch.id);
        setCurrentStepIdx(0);
        setSideTab('guide');
        setView('stage');
        setPlannedModalBranch(null);
      } else {
        setPlannedModalBranch({ branch, moduleObj });
      }
    },
    [stopVoice]
  );

  const handleNextStep = useCallback(() => {
    if (currentStepIdx < totalSteps - 1) {
      setCurrentStepIdx((prev) => prev + 1);
    } else if (nextLiveBranch) {
      stopVoice();
      setActiveBranchId(nextLiveBranch.id);
      setCurrentStepIdx(0);
      setSideTab('guide');
    } else {
      stopVoice();
      setView('tree');
      setSideTab('guide');
    }
  }, [currentStepIdx, nextLiveBranch, totalSteps, stopVoice]);

  const handlePrevStep = useCallback(() => {
    if (currentStepIdx > 0) {
      setCurrentStepIdx((prev) => prev - 1);
    }
  }, [currentStepIdx]);

  // Keyboard navigation for smooth live presenting
  useEffect(() => {
    if (view !== 'stage') return undefined;
    const onKey = (e) => {
      if (e.key === 'ArrowRight') {
        isAr ? handlePrevStep() : handleNextStep();
      } else if (e.key === 'ArrowLeft') {
        isAr ? handleNextStep() : handlePrevStep();
      } else if (e.key === 'Escape') {
        if (sideTab === 'pdf') setSideTab('guide');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [view, isAr, handleNextStep, handlePrevStep, sideTab]);

  // Sync native browser Fullscreen state (including Esc key exit)
  useEffect(() => {
    const onFsChange = () => {
      const active = Boolean(document.fullscreenElement);
      setIsFullScreen(active);
      if (!active) setHideNotesInFullScreen(false);
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const toggleFullScreen = useCallback(async () => {
    try {
      if (!isFullScreen) {
        if (rootRef.current?.requestFullscreen) {
          await rootRef.current.requestFullscreen();
        }
        setIsFullScreen(true);
      } else {
        if (document.fullscreenElement && document.exitFullscreen) {
          await document.exitFullscreen();
        }
        setIsFullScreen(false);
        setHideNotesInFullScreen(false);
      }
    } catch {
      // Fallback to viewport-filling overlay if native Fullscreen is restricted
      setIsFullScreen((prev) => {
        const next = !prev;
        if (!next) setHideNotesInFullScreen(false);
        return next;
      });
    }
  }, [isFullScreen]);

  const showSidePanel = !(isFullScreen && hideNotesInFullScreen);

  const triggerScreenOutsideClick = () => {
    setNudgeHotspot(true);
    setTimeout(() => setNudgeHotspot(false), 750);
  };

  const hotspot = activeCapture?.hotspot || { xPct: 50, yPct: 50, wPct: 12, hPct: 5 };
  const placeTooltipAbove = hotspot.yPct > 72;
  const placeTooltipRightAligned = hotspot.xPct > 68;
  const placeTooltipLeftAligned = hotspot.xPct < 28;

  const fontFamily = isAr
    ? "'Cairo', 'Segoe UI', Tahoma, sans-serif"
    : "'Inter', 'Segoe UI', sans-serif";

  return (
    <div
      ref={rootRef}
      dir={dir}
      style={{ fontFamily }}
      className={`w-full ${
        isFullScreen
          ? `fixed inset-0 z-50 h-screen w-screen overflow-hidden flex flex-col ${
              view === 'stage' ? 'bg-[#0b1120]' : 'bg-slate-50'
            }`
          : embedded
          ? 'py-6 bg-slate-50 rounded-3xl border border-slate-200/80'
          : 'min-h-[calc(100vh-44px)] bg-slate-50'
      }`}
    >
      {/* ═══════ UNIFIED COMPACT TOP BAR ═══════ */}
      <div className="bg-gradient-to-r from-[#162038] via-[#1e2a4a] to-[#0f172a] text-white border-b border-slate-800 shrink-0">
        <div
          className={`${
            isFullScreen && view === 'stage'
              ? 'w-full px-3 h-9 flex items-center'
              : `max-w-[1840px] mx-auto px-4 sm:px-6 lg:px-7 ${
                  view === 'stage' ? 'py-2' : 'py-3.5 lg:py-4'
                }`
          }`}
        >
          {view === 'tree' ? (
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 w-full">
              <div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-500/15 text-blue-300 border border-blue-400/25">
                    <Layers className="w-3 h-3" />
                    {isAr ? 'جولة تفاعلية من النظام الفعلي' : 'Interactive Tour · Real System Captures'}
                  </span>
                  <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white">
                    {isAr
                      ? 'استكشف كيف يعمل نظام Grow خطوة بخطوة'
                      : 'See How Grow Works — Step by Step on Real Screens'}
                  </h1>
                </div>
                <p className="text-xs sm:text-sm text-slate-300 mt-1">
                  {isAr
                    ? 'اختر أي وحدة أو مسار عمل أدناه للتفاعل مع شاشات النظام الفعلية والمستندات البنكية مع شرح صوتي مبسط.'
                    : 'Select any module or workflow below to explore real system screens, sample bank documents, and voice-guided notes.'}
                </p>
              </div>

              {/* Language Switcher */}
              <div className="inline-flex items-center rounded-xl bg-slate-900/80 p-1 border border-slate-700 self-start lg:self-center shrink-0">
                <button
                  type="button"
                  onClick={() => setLang('en')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    !isAr ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-300 hover:text-white'
                  }`}
                >
                  English
                </button>
                <button
                  type="button"
                  onClick={() => setLang('ar')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    isAr ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-300 hover:text-white'
                  }`}
                  style={{ fontFamily: "'Cairo', sans-serif" }}
                >
                  العربية
                </button>
              </div>
            </div>
          ) : (
            /* Single Ultra-Compact Stage Toolbar (All Controls in One Line!) */
            <div className="flex items-center justify-between gap-2 w-full">
              <div className="flex items-center gap-2.5 min-w-0">
                <button
                  type="button"
                  onClick={() => {
                    stopVoice();
                    setView('tree');
                    setSideTab('guide');
                  }}
                  className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs font-bold bg-white/10 hover:bg-white/20 text-white border border-white/15 transition-all shrink-0"
                >
                  {isAr ? <ArrowRight className="w-3.5 h-3.5" /> : <ArrowLeft className="w-3.5 h-3.5" />}
                  <span>{isAr ? 'كافة الوحدات' : 'All Modules'}</span>
                </button>

                <div className="flex items-center gap-2 text-xs truncate">
                  <span className={`px-2 py-0.5 rounded-md font-extrabold text-[11px] shrink-0 ${activeStageStyle.hoverPill}`}>
                    {activeBranchObj?.code || '1.1'}
                  </span>
                  <span className="font-bold text-white truncate">
                    {isAr ? activeBranchObj?.titleAr : activeBranchObj?.titleEn}
                  </span>
                  <span className="hidden xl:inline text-slate-400 shrink-0">
                    ({isAr ? `الخطوة ${activeNarrative?.step} من ${totalSteps}` : `Step ${activeNarrative?.step} of ${totalSteps}`})
                  </span>
                </div>

                {/* Quick Tour Switcher within Current Module (e.g., 1.1 | 1.2 | 1.3 | 1.4) */}
                {moduleLiveBranches.length > 1 && (
                  <div className="hidden md:inline-flex items-center gap-1 p-0.5 rounded-lg bg-slate-900/75 border border-white/10 shrink-0">
                    {moduleLiveBranches.map((b) => {
                      const isCurrent = b.id === activeBranchId;
                      return (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() => openBranch(b, activeStageModule)}
                          title={isAr ? b.titleAr : b.titleEn}
                          className={`px-2 py-0.5 rounded-md text-[11px] font-extrabold transition-all ${
                            isCurrent
                              ? `${activeStageStyle.hoverPill} shadow-2xs`
                              : 'text-slate-300 hover:text-white hover:bg-white/10'
                          }`}
                        >
                          {b.code}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Quick Decision-Maker Module Pitch inside Stage */}
                <button
                  type="button"
                  onClick={() => openBrief('module', activeStageModule.id, false)}
                  className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-bold bg-indigo-500/20 hover:bg-indigo-500/35 text-indigo-200 border border-indigo-400/30 transition-all shrink-0"
                >
                  <Sparkles className="w-3 h-3 text-amber-300" />
                  <span>{isAr ? 'ملخص الوحدة لصانع القرار' : 'Module Pitch'}</span>
                </button>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {/* Optional Side-Notes Collapse ONLY when inside Full Screen */}
                {isFullScreen && (
                  <button
                    type="button"
                    onClick={() => setHideNotesInFullScreen((v) => !v)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs font-bold bg-white/10 text-slate-200 border border-white/15 hover:bg-white/20 transition-all"
                  >
                    {hideNotesInFullScreen ? (
                      <PanelLeftOpen className="w-3.5 h-3.5" />
                    ) : (
                      <PanelLeftClose className="w-3.5 h-3.5" />
                    )}
                    <span>
                      {hideNotesInFullScreen
                        ? isAr
                          ? 'إظهار الشرح'
                          : 'Show Notes'
                        : isAr
                        ? 'إخفاء الشرح'
                        : 'Hide Notes'}
                    </span>
                  </button>
                )}

                {/* True Browser Full Screen Toggle */}
                <button
                  type="button"
                  onClick={toggleFullScreen}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs font-bold border transition-all ${
                    isFullScreen
                      ? 'bg-amber-500 text-slate-950 border-amber-400 hover:bg-amber-400'
                      : 'bg-blue-600/90 text-white border-blue-400/40 hover:bg-blue-500 shadow-xs'
                  }`}
                >
                  {isFullScreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                  <span>
                    {isFullScreen
                      ? isAr
                        ? 'إنهاء ملء الشاشة'
                        : 'Exit Full Screen'
                      : isAr
                      ? 'ملء الشاشة'
                      : 'Full Screen'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setCurrentStepIdx(0)}
                  className="p-1 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
                  title={isAr ? 'إعادة من الخطوة الأولى' : 'Restart tour'}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>

                {/* Language Switcher */}
                <div className="inline-flex items-center rounded-lg bg-slate-900/90 p-0.5 border border-slate-700">
                  <button
                    type="button"
                    onClick={() => setLang('en')}
                    className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition-all ${
                      !isAr ? 'bg-blue-600 text-white' : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    EN
                  </button>
                  <button
                    type="button"
                    onClick={() => setLang('ar')}
                    className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition-all ${
                      isAr ? 'bg-blue-600 text-white' : 'text-slate-300 hover:text-white'
                    }`}
                    style={{ fontFamily: "'Cairo', sans-serif" }}
                  >
                    عربي
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ═══════ VIEW 1: COMPACT ABOVE-THE-FOLD 4-MODULE TREE ═══════ */}
      {view === 'tree' && (
        <div className={`max-w-[1840px] mx-auto px-4 sm:px-6 lg:px-7 py-4 lg:py-5 w-full ${isFullScreen ? 'flex-1 overflow-y-auto' : ''}`}>
          {/* Interactive Root Platform Governance & Control Foundation Hub */}
          <div className="w-full text-center">
            <div className="inline-flex flex-wrap items-center justify-center gap-2.5 bg-white rounded-2xl px-3.5 py-2 shadow-sm border border-slate-200/90">
              <button
                type="button"
                onClick={() => openBrief('foundation', 'governance', false)}
                className="flex items-center gap-2 group text-start"
                title={
                  isAr
                    ? 'استعرض أساسيات الحوكمة والأمان وإدارة المجموعات'
                    : 'Explore Platform Governance, Security & Enterprise Foundation'
                }
              >
                <div className="w-7 h-7 rounded-lg bg-[#1e2a4a] group-hover:bg-blue-700 transition-colors text-white flex items-center justify-center font-extrabold text-xs shrink-0">
                  G
                </div>
                <div className="flex flex-col">
                  <span className="text-xs sm:text-sm font-extrabold text-slate-900 group-hover:text-blue-700 transition-colors leading-tight">
                    {isAr ? 'أساسيات الحوكمة والأمان الموحدة' : 'Platform Governance & Control Foundation'}
                  </span>
                  <span className="text-[10px] text-blue-600 font-semibold leading-tight">
                    {isAr ? 'اضغط على أي ركيزة للشرح الصوتي ←' : 'Click any pillar for executive brief & audio →'}
                  </span>
                </div>
              </button>

              <span className="hidden md:inline text-slate-300">|</span>

              <div className="flex flex-wrap justify-center gap-1.5">
                {PLATFORM_FOUNDATION_PILLARS.map((p) => {
                  const PillarIcon = FOUNDATION_ICONS[p.iconKey] || Shield;
                  return (
                    <div
                      key={p.id}
                      className="inline-flex items-center rounded-full text-[11px] font-bold bg-slate-100/90 hover:bg-blue-50 text-slate-700 hover:text-blue-800 border border-slate-200/90 hover:border-blue-300 transition-all shadow-2xs overflow-hidden"
                    >
                      <button
                        type="button"
                        onClick={() => openBrief('foundation', p.id, false)}
                        className="inline-flex items-center gap-1.5 ps-2.5 pe-1.5 py-1 cursor-pointer"
                      >
                        <PillarIcon className="w-3 h-3 text-blue-600 shrink-0" />
                        <span>{isAr ? p.shortAr : p.shortEn}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => openBrief('foundation', p.id, true)}
                        className="pe-2.5 ps-1 py-1 text-slate-400 hover:text-blue-700 cursor-pointer transition-colors"
                        title={isAr ? 'استمع للشرح مباشرة' : 'Listen directly'}
                      >
                        <Volume2 className="w-3 h-3 shrink-0" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Sleek Tree Connector Lines (1:1 Centered Over Each of the 4 Module Columns) */}
          <div className="hidden lg:block w-full">
            <div className="w-0.5 h-3 bg-slate-300 mx-auto" />
            <div className="grid grid-cols-4 gap-4">
              {[0, 1, 2, 3].map((col) => (
                <div key={col} className="relative flex justify-center">
                  <div
                    className="absolute top-0 border-t-2 border-slate-300"
                    style={{
                      insetInlineStart: col === 0 ? '50%' : '-0.5rem',
                      insetInlineEnd: col === 3 ? '50%' : '-0.5rem',
                    }}
                  />
                  <div className="w-0.5 h-3 bg-slate-300" />
                </div>
              ))}
            </div>
          </div>

          {/* 4 Equal Module Trunks + Sub-Function Branches (Subgrid Locks All 4 Module Headers & CTAs to Identical Height) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4 lg:mt-0">
            {PLATFORM_MODULES.map((mod) => {
              const IconComp = MODULE_ICONS[mod.id] || Layers;
              const style = ACCENT_STYLES[mod.accent] || ACCENT_STYLES.blue;
              const firstLiveBranch =
                mod.branches.find((b) => b.status === 'live') || mod.branches[0];
              const moduleTopicCount = mod.branches.length;

              return (
                <div
                  key={mod.id}
                  className={`bg-white rounded-2xl border ${style.trunkBorder} shadow-xs hover:shadow-md transition-all overflow-hidden flex flex-col md:row-span-2 md:grid md:grid-rows-subgrid md:gap-y-0`}
                >
                  {/* Row 1: Unified-Height Module Trunk Header + Single Module CTA + Decision-Maker Pitch */}
                  <div className="relative pt-4 px-3.5 pb-3 border-b border-slate-100 flex flex-col h-full">
                    <div className={`absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${style.topBar}`} />

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${style.pill}`}>
                          {isAr ? mod.badgeAr : mod.badgeEn}
                        </span>
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shadow-xs ${style.iconBg}`}>
                          <IconComp className="w-3.5 h-3.5" />
                        </div>
                      </div>
                      <h3 className="text-base font-extrabold text-slate-900 leading-snug">
                        {isAr ? mod.titleAr : mod.titleEn}
                      </h3>
                      <p className="text-[11.5px] text-slate-500 mt-0.5 leading-snug">
                        {isAr ? mod.summaryAr : mod.summaryEn}
                      </p>
                    </div>

                    {/* Pinned Bottom Action Band: Identical Y-Height Across All 4 Columns */}
                    <div className="mt-auto pt-2.5 space-y-1.5">
                      {/* Primary Module-Level CTA (1 per Module Column instead of 15 repeated buttons) */}
                      {firstLiveBranch && (
                        <button
                          type="button"
                          onClick={() => openBranch(firstLiveBranch, mod)}
                          className={`w-full flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${style.liveBtn}`}
                        >
                          <span className="inline-flex items-center gap-1.5">
                            <Play className="w-3 h-3 fill-current shrink-0" />
                            <span>{isAr ? 'ابدأ جولة الوحدة' : 'Start Module Tour'}</span>
                          </span>
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold opacity-90">
                            <span>
                              {isAr
                                ? `${moduleTopicCount} مواضيع`
                                : `${moduleTopicCount} Topics`}
                            </span>
                            {isAr ? (
                              <ArrowLeft className="w-3 h-3 shrink-0" />
                            ) : (
                              <ArrowRight className="w-3 h-3 shrink-0" />
                            )}
                          </span>
                        </button>
                      )}

                      {/* Decision-Maker Executive Pitch Bar: Left opens text, Right ("Listen") plays sound directly! */}
                      {mod.executivePitch && (
                        <div
                          className={`w-full flex items-center justify-between gap-1.5 ps-2.5 pe-1.5 py-1 rounded-xl border text-[11px] font-extrabold transition-all ${style.pitchBtn}`}
                        >
                          <button
                            type="button"
                            onClick={() => openBrief('module', mod.id, false)}
                            className="inline-flex items-center gap-1.5 text-start flex-1 py-0.5 cursor-pointer hover:opacity-80"
                          >
                            <Sparkles className="w-3.5 h-3.5 shrink-0" />
                            <span>
                              {isAr ? 'ملخص لصانع القرار' : 'Executive Pitch'}
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() => openBrief('module', mod.id, true)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white hover:bg-slate-900 hover:text-white text-slate-800 text-[10px] font-extrabold shadow-2xs border border-slate-200/80 transition-all shrink-0 cursor-pointer"
                            title={isAr ? 'استمع للملخص الصوتي مباشرة' : 'Play executive pitch audio directly'}
                          >
                            <Volume2 className="w-3 h-3 shrink-0" />
                            <span>{isAr ? 'استمع' : 'Listen'}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Row 2: Clean Clickable Sub-Process Topic Cards (Hover-Only Play Cue) */}
                  <div className="p-3 bg-slate-50/60 flex-1">
                    <div
                      className={`space-y-2 ${
                        isAr ? 'border-r-2 pr-2.5 mr-1' : 'border-l-2 pl-2.5 ml-1'
                      } ${style.spine}`}
                    >
                      {mod.branches.map((branch) => {
                        const isLive = branch.status === 'live';
                        return (
                          <div key={branch.id} className="relative">
                            <span
                              className={`absolute top-4 w-2.5 border-t-2 ${style.spine} ${
                                isAr ? '-right-2.5' : '-left-2.5'
                              }`}
                            />

                            <button
                              type="button"
                              onClick={() => openBranch(branch, mod)}
                              className={`w-full text-start rounded-xl p-2.5 border transition-all duration-150 cursor-pointer group ${
                                isLive
                                  ? style.liveCard
                                  : 'bg-white border-slate-200/90 hover:border-slate-300 hover:bg-slate-50/80'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-1.5 mb-1">
                                <span
                                  className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-md transition-colors ${
                                    isLive ? style.codeBadge : 'bg-slate-100 text-slate-500'
                                  }`}
                                >
                                  {branch.code}
                                </span>
                                {isLive ? (
                                  <div className="flex items-center gap-1.5">
                                    <span className={`text-[10px] font-medium ${style.durationText} group-hover:hidden`}>
                                      {isAr
                                        ? branch.durationAr.replace(' خطوات تفاعلية', ' خطوات')
                                        : branch.durationEn.replace(' Interactive Steps', ' Steps')}
                                    </span>
                                    <span className="text-slate-300 group-hover:hidden">
                                      {isAr ? (
                                        <ArrowLeft className="w-3 h-3" />
                                      ) : (
                                        <ArrowRight className="w-3 h-3" />
                                      )}
                                    </span>
                                    <span
                                      className={`hidden group-hover:inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold shadow-2xs ${style.hoverPill}`}
                                    >
                                      <Play className="w-2.5 h-2.5 fill-current shrink-0" />
                                      <span>{isAr ? 'ابدأ الموضوع' : 'Open Topic'}</span>
                                    </span>
                                  </div>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-500">
                                    <Clock className="w-2.5 h-2.5" />
                                    {isAr ? 'قريباً' : 'Next'}
                                  </span>
                                )}
                              </div>

                              <p className={`text-xs font-bold text-slate-900 ${style.hoverTitle} transition-colors leading-snug`}>
                                {isAr ? branch.titleAr : branch.titleEn}
                              </p>

                              <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                                {isAr ? branch.descAr : branch.descEn}
                              </p>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══════ VIEW 2: SIDE-BY-SIDE INTERACTIVE STAGE (ZERO-SCROLL & TRUE EDGE-TO-EDGE FULLSCREEN) ═══════ */}
      {view === 'stage' && activeNarrative && (
        <div
          dir={isFullScreen ? 'ltr' : dir}
          className={
            isFullScreen
              ? `flex-1 min-h-0 w-full relative flex items-center ${
                  showSidePanel ? 'justify-end' : 'justify-center'
                } overflow-hidden bg-[#0b1120]`
              : 'max-w-[1840px] mx-auto px-3 sm:px-6 lg:px-7 py-2.5 w-full'
          }
        >
          <div
            className={
              isFullScreen
                ? 'contents'
                : 'flex flex-col lg:flex-row items-stretch lg:justify-center gap-4'
            }
          >
            {/* ── SIDE-BY-SIDE GUIDE (NORMAL) OR FLOATING GLASS OVERLAY (FULL SCREEN) ── */}
            {showSidePanel && (
              <aside
                dir={dir}
                style={{ fontFamily }}
                className={
                  isFullScreen
                    ? 'absolute top-2.5 bottom-2.5 left-2.5 w-[335px] max-w-[92vw] z-30 flex flex-col bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/90 shadow-2xl overflow-hidden'
                    : 'w-full lg:w-[375px] xl:w-[410px] 2xl:w-[435px] shrink-0 flex flex-col bg-white rounded-2xl border border-slate-200/90 shadow-md overflow-hidden lg:max-h-[calc(100vh-98px)]'
                }
              >
                {/* Side Panel Top Tabs: Step Guide vs. Real Bank LG PDF */}
                <div className="flex items-center gap-1 bg-slate-100/90 p-1 border-b border-slate-200 shrink-0">
                  <div className="grid grid-cols-2 flex-1 gap-1">
                    <button
                      type="button"
                      onClick={() => setSideTab('guide')}
                      className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl text-xs font-extrabold transition-all ${
                        sideTab === 'guide'
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <BookOpen className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span className="truncate">
                        {isAr
                          ? `شرح (${activeNarrative.step}/${totalSteps})`
                          : `Guide (${activeNarrative.step}/${totalSteps})`}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSideTab('pdf')}
                      className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl text-xs font-extrabold transition-all relative ${
                        sideTab === 'pdf'
                          ? 'bg-amber-500 text-white shadow-xs'
                          : 'text-amber-900 hover:bg-amber-100/60'
                      }`}
                    >
                      <FileText className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">
                        {isAr
                          ? activeDocument?.tabLabelAr || 'أصل المستند'
                          : activeDocument?.tabLabelEn || 'Bank PDF'}
                      </span>
                      {activeNarrative.suggestDocPreview && sideTab !== 'pdf' && (
                        <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping shrink-0" />
                      )}
                    </button>
                  </div>

                  {isFullScreen && (
                    <button
                      type="button"
                      onClick={() => setHideNotesInFullScreen(true)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200/80 transition-colors shrink-0"
                      title={isAr ? 'إخفاء الشرح' : 'Hide Notes'}
                    >
                      <PanelLeftClose className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {sideTab === 'guide' ? (
                  <>
                    {/* ── TEXT-TO-VOICE READER BAR (Persistent Across Steps & Module Tours) ── */}
                    <div className="px-3.5 py-2 bg-gradient-to-r from-slate-900 to-[#1e2a4a] text-white flex items-center justify-between gap-2 shrink-0">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={togglePlayPauseVoice}
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                            (voiceChannel === 'step' && speechState === 'playing') ||
                            stepAutoNextCountdown ||
                            autoRead
                              ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-xs'
                              : 'bg-blue-600 hover:bg-blue-500 text-white shadow-xs'
                          }`}
                        >
                          {(voiceChannel === 'step' && speechState === 'playing') || stepAutoNextCountdown ? (
                            <>
                              <Pause className="w-3.5 h-3.5 fill-current" />
                              <span>
                                {stepAutoNextCountdown
                                  ? isAr
                                    ? 'التالي تلقائياً…'
                                    : 'Next in 1.5s…'
                                  : isAr
                                  ? 'إيقاف مؤقت'
                                  : 'Pause Voice'}
                              </span>
                            </>
                          ) : (
                            <>
                              <Volume2 className="w-3.5 h-3.5" />
                              <span>
                                {voiceChannel === 'step' && speechState === 'paused'
                                  ? isAr
                                    ? 'استكمال'
                                    : 'Resume'
                                  : autoRead
                                  ? isAr
                                    ? 'الصوت مفعّل'
                                    : 'Voice On'
                                  : isAr
                                  ? 'استمع للشرح'
                                  : 'Read Notes'}
                              </span>
                            </>
                          )}
                        </button>

                        {(autoRead ||
                          (voiceChannel === 'step' && speechState !== 'idle') ||
                          stepAutoNextCountdown) && (
                          <button
                            type="button"
                            onClick={turnOffStepVoice}
                            className="p-1.5 rounded-lg bg-white/10 hover:bg-rose-500/30 text-slate-200 hover:text-white transition-colors"
                            title={
                              isAr
                                ? 'إيقاف القراءة الصوتية التلقائية'
                                : 'Turn off voice reader'
                            }
                          >
                            <VolumeX className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        {/* Speed Toggle */}
                        <button
                          type="button"
                          onClick={cycleSpeechRate}
                          className="px-2 py-0.5 rounded-md text-[11px] font-mono font-bold bg-white/10 hover:bg-white/20 text-slate-200"
                          title={isAr ? 'سرعة القراءة الصوتية' : 'Voice playback speed'}
                        >
                          {speechRate}x
                        </button>

                        {/* Auto-Advance Steps & Module Tours (1.1 -> 1.2 -> 1.3 -> 1.4) Toggle */}
                        <button
                          type="button"
                          onClick={() => {
                            const next = !stepAutoAdvance;
                            stepAutoAdvanceRef.current = next;
                            setStepAutoAdvance(next);
                            if (!next) {
                              clearStepAutoTimer();
                            }
                          }}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold border transition-all ${
                            stepAutoAdvance
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40'
                              : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/15'
                          }`}
                          title={
                            isAr
                              ? 'الانتقال التلقائي للخطوة والجولة التالية بعد انتهاء القراءة الصوتية'
                              : 'Automatically advance through steps and module tours (1.1 → 1.2 → …) when voice finishes'
                          }
                        >
                          <Play className="w-2.5 h-2.5 fill-current" />
                          <span>{isAr ? 'انتقال تلقائي' : 'Auto-Next'}</span>
                        </button>
                      </div>
                    </div>

                    {/* ── CURRENT STEP STORY & GUIDE NOTES (Eye-Level Side-by-Side!) ── */}
                    <div className="px-4 py-3 flex-1 overflow-y-auto space-y-2.5">
                      <div className="flex flex-wrap items-center justify-between gap-1.5">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${activeStageStyle.pill}`}>
                          <Users className={`w-3 h-3 ${activeStageStyle.iconText}`} />
                          {isAr ? activeNarrative.roleAr : activeNarrative.roleEn}
                        </span>
                        <span className="text-[11px] font-bold text-slate-400">
                          {isAr
                            ? `خطوة ${activeNarrative.step} / ${totalSteps}`
                            : `Step ${activeNarrative.step} / ${totalSteps}`}
                        </span>
                      </div>

                      <h3 className="text-[15px] sm:text-base font-extrabold text-slate-900 leading-snug">
                        {isAr ? activeNarrative.headlineAr : activeNarrative.headlineEn}
                      </h3>

                      <p className="text-xs text-slate-600 leading-relaxed">
                        {isAr ? activeNarrative.guideAr : activeNarrative.guideEn}
                      </p>

                      {/* Key Value Highlights */}
                      <div className="space-y-1 pt-0.5">
                        {(isAr ? activeNarrative.highlightsAr : activeNarrative.highlightsEn).map((h, i) => (
                          <div
                            key={i}
                            className="flex items-center gap-2 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-emerald-50/80 text-emerald-900 border border-emerald-200/70"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span>{h}</span>
                          </div>
                        ))}
                      </div>

                      {/* Interactive Screen Action Prompt */}
                      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold ${activeStageStyle.actionBox}`}>
                        <MousePointerClick className={`w-3.5 h-3.5 ${activeStageStyle.iconText} shrink-0 animate-bounce`} />
                        <span>
                          {isAr ? activeNarrative.actionLabelAr : activeNarrative.actionLabelEn}
                        </span>
                      </div>
                    </div>

                    {/* ── PINNED FOOTER: BACK / NEXT + 1-ROW STEP PROGRESS BAR ── */}
                    <div className="px-3.5 py-2.5 bg-slate-50 border-t border-slate-200/90 space-y-2 shrink-0">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handlePrevStep}
                          disabled={currentStepIdx === 0}
                          className="px-3.5 py-1.5 rounded-xl text-xs font-bold border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                        >
                          {isAr ? 'السابق' : 'Back'}
                        </button>
                        <button
                          type="button"
                          onClick={handleNextStep}
                          className={`flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-extrabold shadow-xs transition-all ${activeStageStyle.liveBtn}`}
                        >
                          <span>
                            {currentStepIdx === totalSteps - 1
                              ? nextLiveBranch
                                ? isAr
                                  ? `الجولة التالية (${nextLiveBranch.code})`
                                  : `Next Tour (${nextLiveBranch.code})`
                                : isAr
                                ? 'العودة لكافة الوحدات'
                                : 'Back to All Modules'
                              : isAr
                              ? 'الخطوة التالية'
                              : 'Next Step'}
                          </span>
                          {isAr ? <ArrowLeft className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
                        </button>
                      </div>

                      {/* Single-Row Step Jump Bar (Dynamic Column Count) */}
                      <div
                        className="grid gap-1"
                        style={{
                          gridTemplateColumns: `repeat(${Math.max(1, totalSteps)}, minmax(0, 1fr))`,
                        }}
                      >
                        {stepsNarrative.map((item, idx) => {
                          const isActive = idx === currentStepIdx;
                          const isDone = idx < currentStepIdx;
                          const label = isAr ? item.shortTabAr : item.shortTabEn;
                          return (
                            <button
                              key={item.step}
                              type="button"
                              onClick={() => setCurrentStepIdx(idx)}
                              title={label}
                              className={`h-7 rounded-lg text-[11px] font-extrabold border flex items-center justify-center gap-0.5 transition-all ${
                                isActive
                                  ? 'bg-[#1e2a4a] text-white border-[#1e2a4a] shadow-xs scale-[1.03]'
                                  : isDone
                                  ? activeStageStyle.doneStep
                                  : 'bg-white text-slate-500 border-slate-200 hover:text-slate-800 hover:border-slate-300'
                              }`}
                            >
                              {isDone ? <CheckCircle2 className={`w-3 h-3 ${activeStageStyle.iconText}`} /> : item.step}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </>
                ) : (
                  /* ── TAB 2: REAL CORPORATE / BANK PDF PREVIEW SIDE-BY-SIDE ── */
                  <div className="flex-1 flex flex-col overflow-hidden">
                    <div className="px-3.5 py-2 bg-amber-50 border-b border-amber-200 flex items-center justify-between gap-2 shrink-0">
                      <div className="min-w-0">
                        <p className="text-[10px] font-extrabold uppercase tracking-wider text-amber-800 truncate">
                          {isAr
                            ? activeDocument?.badgeAr || 'نموذج المستند البنكي للتجربة'
                            : activeDocument?.badgeEn || 'Sample Bank Document'}
                        </p>
                        <p className="text-xs font-bold text-slate-900 truncate">
                          {isAr
                            ? activeDocument?.titleAr ||
                              activeDocument?.titleEn ||
                              'FNCB Performance LG · EGP 4,500,000'
                            : activeDocument?.titleEn || 'FNCB Performance LG · EGP 4,500,000'}
                        </p>
                      </div>
                      <a
                        href={activeDocument?.pdfUrl || '/demo/docs/FNCB_Performance_LG_8840.pdf'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-white text-amber-900 border border-amber-300 hover:bg-amber-100 shrink-0"
                      >
                        <span>{isAr ? 'فتح PDF' : 'Full PDF'}</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>

                    <div className="p-2.5 bg-slate-100 flex-1 overflow-y-auto">
                      <img
                        src={
                          activeDocument?.previewImageUrl ||
                          '/demo/docs/FNCB_Performance_LG_8840_preview.png'
                        }
                        alt={activeDocument?.titleEn || 'Sample Corporate Banking Document'}
                        className="w-full rounded-lg shadow-xs border border-slate-300 bg-white"
                      />
                    </div>

                    <div className="p-2.5 bg-white border-t border-slate-200 flex items-center justify-between gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => setSideTab('guide')}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800"
                      >
                        {isAr ? '← العودة للشرح' : '← Back to Notes'}
                      </button>
                      <button
                        type="button"
                        onClick={handleNextStep}
                        className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        <span>{isAr ? 'الخطوة التالية' : 'Next Step'}</span>
                        {isAr ? <ArrowLeft className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                )}
              </aside>
            )}

            {/* ── INTERACTIVE REAL SYSTEM SCREEN (TRUE 0-GAP EDGE-TO-EDGE HEIGHT IN FULL SCREEN!) ── */}
            <div
              className={
                isFullScreen
                  ? 'h-full flex items-center justify-center'
                  : 'flex-1 min-w-0 flex flex-col items-center justify-start'
              }
            >
              <div
                dir="ltr"
                className={
                  isFullScreen
                    ? 'flex items-center justify-center'
                    : 'w-full lg:w-[min(100%,calc((100vh-142px)*1.6))] bg-slate-900 rounded-2xl p-1.5 shadow-2xl border border-slate-800'
                }
              >
                {/* Compact Browser Chrome Header (Hidden in Full Screen so Screen Fills 100% Height!) */}
                {!isFullScreen && (
                  <div className="flex items-center justify-between px-3 py-1.5 bg-slate-900 text-slate-300 text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500/90" />
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-400/90" />
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/90" />
                    </div>

                    <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-slate-800/90 text-slate-300 text-[11px] font-mono border border-slate-700/80 max-w-md truncate">
                      <Lock className="w-3 h-3 text-emerald-400 shrink-0" />
                      <span className="truncate">
                        {activeCapture?.url ||
                          STEP_URLS[activeNarrative.step] ||
                          'app.growbusinessdevelopment.com'}
                      </span>
                    </div>

                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      Real System Capture
                    </span>
                  </div>
                )}

                {/* Strict 1440:900 Stage Box — Zero Letterboxing = 100% Pixel-Exact Hotspots */}
                <div
                  onClick={triggerScreenOutsideClick}
                  className={`relative overflow-hidden bg-slate-100 select-none cursor-pointer ${
                    isFullScreen ? 'shadow-2xl' : 'w-full rounded-xl'
                  }`}
                  style={
                    isFullScreen
                      ? {
                          aspectRatio: '1440 / 900',
                          height: 'min(calc(100vh - 37px), calc(100vw * 900 / 1440))',
                        }
                      : { aspectRatio: '1440 / 900' }
                  }
                >
                  {activeCapture?.image && (
                    <img
                      key={activeCapture.image}
                      src={activeCapture.image}
                      alt={activeNarrative.headlineEn}
                      className="w-full h-full object-contain block transition-opacity duration-300"
                      draggable={false}
                    />
                  )}

                  {/* Interactive Hotspot Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleNextStep();
                    }}
                    style={{
                      left: `${Math.max(0.5, hotspot.xPct - 0.6)}%`,
                      top: `${Math.max(0.5, hotspot.yPct - 0.8)}%`,
                      width: `${Math.min(98, hotspot.wPct + 1.2)}%`,
                      height: `${Math.min(98, hotspot.hPct + 1.6)}%`,
                    }}
                    className={`absolute z-20 rounded-xl border-2 border-blue-500 bg-blue-500/10 hover:bg-blue-500/20 transition-all duration-200 focus:outline-none group ${
                      nudgeHotspot
                        ? 'ring-8 ring-amber-400/70 scale-105'
                        : 'ring-4 ring-blue-500/30 shadow-[0_0_25px_rgba(37,99,235,0.45)]'
                    }`}
                    aria-label={isAr ? activeNarrative.actionLabelAr : activeNarrative.actionLabelEn}
                  >
                    <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-85" />
                      <span className="relative inline-flex rounded-full h-4 w-4 bg-blue-600 border-2 border-white" />
                    </span>

                    <div
                      dir={dir}
                      style={{ fontFamily }}
                      className={`absolute ${
                        placeTooltipAbove ? 'bottom-full mb-2' : 'top-full mt-2'
                      } ${
                        placeTooltipRightAligned
                          ? 'right-0'
                          : placeTooltipLeftAligned
                          ? 'left-0'
                          : 'left-1/2 -translate-x-1/2'
                      } whitespace-nowrap px-3 py-1.5 rounded-xl bg-[#162038] text-white text-xs font-bold shadow-xl border border-blue-400/50 flex items-center gap-1.5 pointer-events-none group-hover:scale-105 transition-transform`}
                    >
                      <MousePointerClick className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                      <span>{isAr ? activeNarrative.actionLabelAr : activeNarrative.actionLabelEn}</span>
                    </div>
                  </button>
                </div>
              </div>
            </div>

            {/* Zero-Height Floating Corner Control Pill when Notes are Hidden in Full Screen */}
            {isFullScreen && !showSidePanel && (
              <div
                dir={dir}
                style={{ fontFamily }}
                className="absolute bottom-3 left-3 z-30 flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-900/90 backdrop-blur-md text-white border border-slate-700/80 shadow-2xl text-xs"
              >
                <button
                  type="button"
                  onClick={() => setHideNotesInFullScreen(false)}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-slate-100 font-bold"
                >
                  <PanelLeftOpen className="w-3.5 h-3.5 text-blue-400" />
                  <span>{isAr ? 'الشرح' : 'Notes'}</span>
                </button>
                <button
                  type="button"
                  onClick={togglePlayPauseVoice}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-emerald-300 font-bold"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>{speechState === 'playing' ? (isAr ? 'إيقاف' : 'Pause') : (isAr ? 'صوت' : 'Voice')}</span>
                </button>
                <button
                  type="button"
                  onClick={handlePrevStep}
                  disabled={currentStepIdx === 0}
                  className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-40 font-bold"
                >
                  {isAr ? 'السابق' : 'Prev'}
                </button>
                <button
                  type="button"
                  onClick={handleNextStep}
                  className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold"
                >
                  {isAr ? 'التالي' : 'Next'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════ MODAL FOR PLANNED BRANCHES ═══════ */}
      {plannedModalBranch && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setPlannedModalBranch(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
                {plannedModalBranch.branch.code} ·{' '}
                {isAr ? plannedModalBranch.moduleObj.titleAr : plannedModalBranch.moduleObj.titleEn}
              </span>
              <button
                type="button"
                onClick={() => setPlannedModalBranch(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <h3 className="text-lg font-extrabold text-slate-900 mb-2">
              {isAr ? plannedModalBranch.branch.titleAr : plannedModalBranch.branch.titleEn}
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed mb-5">
              {isAr ? plannedModalBranch.branch.descAr : plannedModalBranch.branch.descEn}
            </p>

            <div className="rounded-xl bg-blue-50 border border-blue-200 p-3.5 text-xs text-blue-900 leading-relaxed mb-5">
              {isAr
                ? 'جاري تجهيز الشاشات التفاعلية والشرح الصوتي لهذا المسار قريباً. يمكنك الآن تجربة كافة الجولات التفاعلية لوحدة حفظ خطابات الضمان الواردة (١.١ إلى ١.٤).'
                : 'Interactive step-by-step screens and voice narration for this workflow are coming next. Meanwhile, you can explore all 4 live LG Custody tours (1.1 – 1.4).'}
            </div>

            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setPlannedModalBranch(null)}
                className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                {isAr ? 'إغلاق' : 'Close'}
              </button>
              <button
                type="button"
                onClick={() => {
                  const modId = plannedModalBranch.moduleObj.id;
                  setPlannedModalBranch(null);
                  openBrief('module', modId, false);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                <span>{isAr ? 'ملخص الوحدة لصانع القرار' : 'Module Executive Pitch'}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setPlannedModalBranch(null);
                  setActiveBranchId('custody-scan-record');
                  setCurrentStepIdx(0);
                  setView('stage');
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Play className="w-3 h-3 fill-current" />
                <span>{isAr ? 'جرّب الجولة الحية (١.١)' : 'Try Live Tour (1.1)'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════ EXECUTIVE DECISION-MAKER PITCH & GOVERNANCE FOUNDATION MODAL ═══════ */}
      {briefModal && activeBriefData && (() => {
        const isBriefVoiceActive =
          voiceChannel === 'brief' && (speechState === 'playing' || autoNextCountdown);
        return (
          <div
            dir={dir}
            style={{ fontFamily }}
            className="fixed inset-0 z-50 bg-slate-950/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4"
            onClick={closeBrief}
          >
            <div
              className="bg-white rounded-3xl max-w-5xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[94vh]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Top Dark Executive Header + Category Switcher */}
              <div className="bg-gradient-to-r from-[#162038] via-[#1e2a4a] to-[#0f172a] text-white px-5 sm:px-6 py-3 shrink-0">
                <div className="flex items-center justify-between gap-3 mb-2.5">
                  {/* Switch between 4 Module Pitches vs 4 Foundation Pillars */}
                  <div className="inline-flex items-center rounded-xl bg-slate-900/80 p-1 border border-slate-700/90">
                    <button
                      type="button"
                      onClick={() =>
                        openBrief('module', activeBriefData.mod?.id || 'custody', isBriefVoiceActive)
                      }
                      className={`px-3 py-1 rounded-lg text-xs font-extrabold transition-all ${
                        briefModal.kind === 'module'
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      {isAr ? 'ملخص الوحدات الـ ٤ لصانع القرار' : '4 Module Executive Pitches'}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        openBrief(
                          'foundation',
                          activeBriefData.pillar?.id || 'governance',
                          isBriefVoiceActive
                        )
                      }
                      className={`px-3 py-1 rounded-lg text-xs font-extrabold transition-all ${
                        briefModal.kind === 'foundation'
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      {isAr ? 'أساسيات الحوكمة والأمان' : 'Platform Foundation'}
                    </button>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {/* Inline EN / AR Switcher inside Brief Modal */}
                    <div className="inline-flex items-center rounded-lg bg-slate-900/90 p-0.5 border border-slate-700">
                      <button
                        type="button"
                        onClick={() => {
                          const keepReading = isBriefVoiceActive;
                          stopVoice();
                          langRef.current = 'en';
                          setLang('en');
                          if (keepReading && briefModal) {
                            briefVisitedRef.current = new Set([briefModal.id]);
                            const target = resolveBriefTarget(briefModal.kind, briefModal.id);
                            if (target) playBriefVoice(target, 'en', speechRate);
                          }
                        }}
                        className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
                          !isAr ? 'bg-blue-600 text-white' : 'text-slate-300 hover:text-white'
                        }`}
                      >
                        EN
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const keepReading = isBriefVoiceActive;
                          stopVoice();
                          langRef.current = 'ar';
                          setLang('ar');
                          if (keepReading && briefModal) {
                            briefVisitedRef.current = new Set([briefModal.id]);
                            const target = resolveBriefTarget(briefModal.kind, briefModal.id);
                            if (target) playBriefVoice(target, 'ar', speechRate);
                          }
                        }}
                        className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
                          isAr ? 'bg-blue-600 text-white' : 'text-slate-300 hover:text-white'
                        }`}
                        style={{ fontFamily: "'Cairo', sans-serif" }}
                      >
                        عربي
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={closeBrief}
                      className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
                      title={isAr ? 'إغلاق' : 'Close'}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Sub-Navigation Cards across the 4 Modules OR 4 Foundation Pillars — FULL TEXT (No Truncation) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 items-stretch">
                  {briefModal.kind === 'module'
                    ? PLATFORM_MODULES.map((m, idx) => {
                        const active = m.id === activeBriefData.mod?.id;
                        return (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => openBrief('module', m.id, isBriefVoiceActive)}
                            className={`px-3 py-2 rounded-xl text-xs font-bold border text-start whitespace-normal leading-snug h-full flex items-center gap-1.5 transition-all ${
                              active
                                ? 'bg-white text-slate-900 border-white shadow-xs'
                                : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/15 hover:text-white'
                            }`}
                          >
                            <span className="opacity-70 shrink-0">0{idx + 1}</span>
                            <span className="flex-1">{isAr ? m.titleAr : m.titleEn}</span>
                            {active && isBriefVoiceActive && (
                              <Volume2 className="w-3.5 h-3.5 text-blue-600 animate-pulse shrink-0" />
                            )}
                          </button>
                        );
                      })
                    : PLATFORM_FOUNDATION_PILLARS.map((p) => {
                        const active = p.id === activeBriefData.pillar?.id;
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => openBrief('foundation', p.id, isBriefVoiceActive)}
                            className={`px-3 py-2 rounded-xl text-xs font-bold border text-start whitespace-normal leading-snug h-full flex items-center justify-between gap-1.5 transition-all ${
                              active
                                ? 'bg-white text-slate-900 border-white shadow-xs'
                                : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/15 hover:text-white'
                            }`}
                          >
                            <span>{isAr ? p.shortAr : p.shortEn}</span>
                            {active && isBriefVoiceActive && (
                              <Volume2 className="w-3.5 h-3.5 text-blue-600 animate-pulse shrink-0" />
                            )}
                          </button>
                        );
                      })}
                </div>
              </div>

              {/* Voice Reader Strip for the Executive Pitch + Auto-Advance Controls */}
              <div className="px-5 sm:px-6 py-2 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-2 border-t border-slate-800 shrink-0">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={toggleBriefVoice}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all ${
                      isBriefVoiceActive
                        ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-xs'
                        : 'bg-blue-600 hover:bg-blue-500 text-white shadow-xs'
                    }`}
                  >
                    {isBriefVoiceActive ? (
                      <>
                        <Pause className="w-3.5 h-3.5 fill-current" />
                        <span>
                          {autoNextCountdown
                            ? isAr
                              ? 'جاري الانتقال للتالي…'
                              : 'Moving to next…'
                            : isAr
                            ? 'إيقاف مؤقت'
                            : 'Pause Audio'}
                        </span>
                      </>
                    ) : (
                      <>
                        <Volume2 className="w-3.5 h-3.5" />
                        <span>
                          {voiceChannel === 'brief' && speechState === 'paused'
                            ? isAr
                              ? 'استكمال الاستماع'
                              : 'Resume Audio'
                            : isAr
                            ? 'استمع للملخص الصوتي'
                            : 'Listen to Executive Pitch'}
                        </span>
                      </>
                    )}
                  </button>

                  {(voiceChannel === 'brief' && speechState !== 'idle') || autoNextCountdown ? (
                    <button
                      type="button"
                      onClick={() => {
                        briefVisitedRef.current.clear();
                        stopVoice();
                      }}
                      className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200"
                      title={isAr ? 'إيقاف الصوت' : 'Stop audio'}
                    >
                      <Square className="w-3 h-3 fill-current" />
                    </button>
                  ) : null}

                  {autoNextCountdown && (
                    <span className="text-[11px] font-semibold text-emerald-300 animate-pulse">
                      {isAr ? 'الانتقال للنقطة التالية…' : 'Next point in 1.5s…'}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {/* Auto-Advance between Modal Points Toggle (ON by default) */}
                  <button
                    type="button"
                    onClick={() => {
                      const next = !briefAutoAdvance;
                      briefAutoAdvanceRef.current = next;
                      setBriefAutoAdvance(next);
                      if (!next) {
                        clearBriefAutoTimer();
                      }
                    }}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all ${
                      briefAutoAdvance
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40'
                        : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/15'
                    }`}
                    title={
                      isAr
                        ? 'الانتقال التلقائي وقراءة النقطة التالية بعد انتهاء الشرح'
                        : 'Automatically switch to the next card and read it after 1.5 seconds'
                    }
                  >
                    <Play className="w-3 h-3 fill-current" />
                    <span>{isAr ? 'انتقال تلقائي' : 'Auto-Advance'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={cycleSpeechRate}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold bg-white/10 hover:bg-white/20 text-slate-200"
                    title={isAr ? 'سرعة القراءة الصوتية' : 'Voice playback speed'}
                  >
                    {speechRate}x
                  </button>
                </div>
              </div>

            {/* Executive Selling Pitch Body */}
            <div className="px-6 py-4 overflow-y-auto space-y-3 flex-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-800 border border-blue-200">
                <Sparkles className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>{isAr ? activeBriefData.tagAr : activeBriefData.tagEn}</span>
              </div>

              <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 leading-snug">
                {isAr ? activeBriefData.headlineAr : activeBriefData.headlineEn}
              </h2>

              <p className="text-sm text-slate-600 leading-relaxed">
                {isAr ? activeBriefData.pitchAr : activeBriefData.pitchEn}
              </p>

              {/* 3 Decision-Maker Value Pillars */}
              <div className="pt-0.5 space-y-1.5">
                <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                  {isAr ? 'القيمة المباشرة لصانع القرار' : 'Key Decision-Maker Outcomes'}
                </p>
                {(isAr ? activeBriefData.outcomesAr : activeBriefData.outcomesEn).map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-emerald-50/80 border border-emerald-200/80 text-xs sm:text-sm font-semibold text-emerald-950"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer Navigation: Launch Live Workflow or Step to Next Pitch */}
            <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 shrink-0">
              <button
                type="button"
                onClick={closeBrief}
                className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200/70 transition-colors"
              >
                {isAr ? 'العودة للوحدات' : 'Back to Modules'}
              </button>

              <div className="flex flex-wrap items-center gap-2">
                {/* Cycle to Next Pitch in current category */}
                <button
                  type="button"
                  onClick={() => {
                    if (briefModal.kind === 'module') {
                      const idx = PLATFORM_MODULES.findIndex((m) => m.id === activeBriefData.mod?.id);
                      const nextMod = PLATFORM_MODULES[(idx + 1) % PLATFORM_MODULES.length];
                      openBrief('module', nextMod.id, isBriefVoiceActive);
                    } else {
                      const idx = PLATFORM_FOUNDATION_PILLARS.findIndex(
                        (p) => p.id === activeBriefData.pillar?.id
                      );
                      const nextPillar =
                        PLATFORM_FOUNDATION_PILLARS[(idx + 1) % PLATFORM_FOUNDATION_PILLARS.length];
                      openBrief('foundation', nextPillar.id, isBriefVoiceActive);
                    }
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 transition-all"
                >
                  <span>
                    {briefModal.kind === 'module'
                      ? isAr
                        ? 'الوحدة التالية'
                        : 'Next Module Pitch'
                      : isAr
                      ? 'الركيزة التالية'
                      : 'Next Pillar'}
                  </span>
                  {isAr ? <ArrowLeft className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
                </button>

                {/* Launch Live Workflow if available on this module */}
                {briefModal.kind === 'module' &&
                  activeBriefData.mod?.branches?.some((b) => b.status === 'live') && (
                    <button
                      type="button"
                      onClick={() => {
                        const liveBranch = activeBriefData.mod.branches.find((b) => b.status === 'live');
                        closeBrief();
                        openBranch(liveBranch, activeBriefData.mod);
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-extrabold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-all"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      <span>{isAr ? 'ابدأ التجربة التفاعلية للوحدة' : 'Start Live Module Tour'}</span>
                    </button>
                  )}
              </div>
            </div>
          </div>
        </div>
        );
      })()}
    </div>
  );
}
