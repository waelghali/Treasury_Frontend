// frontend/src/components/Showcase/InteractivePlatformShowcase.jsx
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
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
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  PLATFORM_FOUNDATION_PILLARS,
  PLATFORM_MODULES,
  VISUAL_STORIES,
  PILOT_BRANCH_STEPS,
} from './showcaseCatalog';
import pilotManifest from './pilotManifest.json';
import PublicProductExpertChat from './PublicProductExpertChat';

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

const STORY_NAV_ORDER = ['platform_intro', 'custody', 'issuance', 'quotations', 'reconciliation'];
const MODULE_ORDER = ['custody', 'issuance', 'quotations', 'reconciliation'];
const toArNum = (n) => String(n).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[d]);

const ACCENT_STYLES = {
  blue: {
    pill: 'bg-blue-50 text-blue-700 border-blue-200',
    iconBg: 'bg-blue-600 text-white shadow-blue-600/25',
    trunkBorder: 'border-blue-200/90 hover:border-blue-400',
    activeTrunk: 'ring-2 ring-blue-500/40 border-blue-500 shadow-md',
    topBar: 'from-blue-600 to-indigo-600',
    spine: 'border-blue-200',
    liveCard: 'bg-white border-slate-200/90 hover:border-blue-400 hover:bg-blue-50/35 hover:shadow-sm hover:shadow-blue-600/10',
    hoverPill: 'bg-blue-600 text-white',
    liveBtn: 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs shadow-blue-600/20',
    secondaryBtn: 'bg-blue-50/75 hover:bg-blue-100/80 text-blue-900 border-blue-200/90',
    activeSecondaryBtn: 'bg-slate-900 text-white border-slate-900 hover:bg-slate-800',
    codeBadge: 'bg-blue-50 text-blue-700 border border-blue-200/90 group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600',
    durationText: 'text-slate-500',
    hoverTitle: 'group-hover:text-blue-700',
    iconText: 'text-blue-600',
    actionBox: 'bg-blue-50/90 border-blue-200 text-blue-950',
    doneStep: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100',
    trayBg: 'bg-gradient-to-br from-blue-50/70 via-white to-slate-50 border-blue-200/90',
    storyBarFill: 'bg-blue-400',
    storyChip: 'bg-blue-500/20 text-blue-200 border-blue-400/35',
  },
  purple: {
    pill: 'bg-purple-50 text-purple-700 border-purple-200',
    iconBg: 'bg-purple-600 text-white shadow-purple-600/25',
    trunkBorder: 'border-purple-200/90 hover:border-purple-400',
    activeTrunk: 'ring-2 ring-purple-500/40 border-purple-500 shadow-md',
    topBar: 'from-purple-600 to-fuchsia-600',
    spine: 'border-purple-200',
    liveCard: 'bg-white border-slate-200/90 hover:border-purple-400 hover:bg-purple-50/35 hover:shadow-sm hover:shadow-purple-600/10',
    hoverPill: 'bg-purple-600 text-white',
    liveBtn: 'bg-purple-600 hover:bg-purple-700 text-white shadow-xs shadow-purple-600/20',
    secondaryBtn: 'bg-purple-50/75 hover:bg-purple-100/80 text-purple-900 border-purple-200/90',
    activeSecondaryBtn: 'bg-slate-900 text-white border-slate-900 hover:bg-slate-800',
    codeBadge: 'bg-purple-50 text-purple-700 border border-purple-200/90 group-hover:bg-purple-600 group-hover:text-white group-hover:border-purple-600',
    durationText: 'text-slate-500',
    hoverTitle: 'group-hover:text-purple-700',
    iconText: 'text-purple-600',
    actionBox: 'bg-purple-50/90 border-purple-200 text-purple-950',
    doneStep: 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100',
    trayBg: 'bg-gradient-to-br from-purple-50/70 via-white to-slate-50 border-purple-200/90',
    storyBarFill: 'bg-purple-400',
    storyChip: 'bg-purple-500/20 text-purple-200 border-purple-400/35',
  },
  emerald: {
    pill: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    iconBg: 'bg-emerald-600 text-white shadow-emerald-600/25',
    trunkBorder: 'border-emerald-200/90 hover:border-emerald-400',
    activeTrunk: 'ring-2 ring-emerald-500/40 border-emerald-500 shadow-md',
    topBar: 'from-emerald-600 to-teal-600',
    spine: 'border-emerald-200',
    liveCard: 'bg-white border-slate-200/90 hover:border-emerald-400 hover:bg-emerald-50/35 hover:shadow-sm hover:shadow-emerald-600/10',
    hoverPill: 'bg-emerald-600 text-white',
    liveBtn: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs shadow-emerald-600/20',
    secondaryBtn: 'bg-emerald-50/75 hover:bg-emerald-100/80 text-emerald-900 border-emerald-200/90',
    activeSecondaryBtn: 'bg-slate-900 text-white border-emerald-900 hover:bg-slate-800',
    codeBadge: 'bg-emerald-50 text-emerald-700 border border-emerald-200/90 group-hover:bg-emerald-600 group-hover:text-white group-hover:border-emerald-600',
    durationText: 'text-slate-500',
    hoverTitle: 'group-hover:text-emerald-700',
    iconText: 'text-emerald-600',
    actionBox: 'bg-emerald-50/90 border-emerald-200 text-emerald-950',
    doneStep: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100',
    trayBg: 'bg-gradient-to-br from-emerald-50/70 via-white to-slate-50 border-emerald-200/90',
    storyBarFill: 'bg-emerald-400',
    storyChip: 'bg-emerald-500/20 text-emerald-200 border-emerald-400/35',
  },
  amber: {
    pill: 'bg-amber-50 text-amber-800 border-amber-200',
    iconBg: 'bg-amber-500 text-white shadow-amber-500/25',
    trunkBorder: 'border-amber-200/90 hover:border-amber-400',
    activeTrunk: 'ring-2 ring-amber-500/40 border-amber-500 shadow-md',
    topBar: 'from-amber-500 to-orange-500',
    spine: 'border-amber-200',
    liveCard: 'bg-white border-slate-200/90 hover:border-amber-400 hover:bg-amber-50/35 hover:shadow-sm hover:shadow-amber-500/10',
    hoverPill: 'bg-amber-600 text-white',
    liveBtn: 'bg-amber-600 hover:bg-amber-700 text-white shadow-xs shadow-amber-600/20',
    secondaryBtn: 'bg-amber-50/75 hover:bg-amber-100/80 text-amber-950 border-amber-200/90',
    activeSecondaryBtn: 'bg-slate-900 text-white border-slate-900 hover:bg-slate-800',
    codeBadge: 'bg-amber-50 text-amber-800 border border-amber-200/90 group-hover:bg-amber-600 group-hover:text-white group-hover:border-amber-600',
    durationText: 'text-slate-500',
    hoverTitle: 'group-hover:text-amber-800',
    iconText: 'text-amber-600',
    actionBox: 'bg-amber-50/90 border-amber-200 text-amber-950',
    doneStep: 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100',
    trayBg: 'bg-gradient-to-br from-amber-50/70 via-white to-slate-50 border-amber-200/90',
    storyBarFill: 'bg-amber-400',
    storyChip: 'bg-amber-500/20 text-amber-200 border-amber-400/35',
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

const AUDIO_CACHE_VER = 'v13';
const BRIEF_AUTO_ADVANCE_DELAY_MS = 1600;
const STORY_CHAPTER_BREATH_MS = 520;
const STORY_SILENT_FALLBACK_MS = 15500;

function resolveFoundationTarget(id) {
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
  const location = useLocation();
  const [lang, setLang] = useState(initialLang);
  const [view, setView] = useState('tree'); // 'tree' | 'stage'
  const [expandedModuleId, setExpandedModuleId] = useState(null); // Progressive disclosure tray on /demo
  const [activeBranchId, setActiveBranchId] = useState('custody-scan-record');
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [hideNotesInFullScreen, setHideNotesInFullScreen] = useState(false);
  const [sideTab, setSideTab] = useState('guide'); // 'guide' | 'pdf'
  const [nudgeHotspot, setNudgeHotspot] = useState(false);
  const [readyImageSrc, setReadyImageSrc] = useState('');
  const [decodedImageSrc, setDecodedImageSrc] = useState('');
  const [plannedModalBranch, setPlannedModalBranch] = useState(null);
  const [briefModal, setBriefModal] = useState(null); // { id: string } | null (Foundation pillars)
  const [expertChatOpen, setExpertChatOpen] = useState(false);
  const handledQueryRef = useRef('');

  // Visual Executive Story Cinema Player State
  const [storyModal, setStoryModal] = useState(null); // { storyId, chapterIdx, phase: 'chapters' | 'handoff' } | null
  const [storyPlaying, setStoryPlaying] = useState(false);
  const [storyMuted, setStoryMuted] = useState(false);
  const [storyProgress, setStoryProgress] = useState(0); // 0..100
  const [storyDecodedSrc, setStoryDecodedSrc] = useState('');

  const rootRef = useRef(null);
  const workflowTrayRef = useRef(null);
  const stageImgRef = useRef(null);
  const storyImgRef = useRef(null);
  const hotspotRevealTimerRef = useRef(null);
  const preloadedImagesRef = useRef(new Set());

  // Step & Foundation Voice Reader State
  const [speechState, setSpeechState] = useState('idle'); // 'idle' | 'playing' | 'paused'
  const [voiceChannel, setVoiceChannel] = useState('step'); // 'step' | 'brief'
  const [autoRead, setAutoRead] = useState(false); // Persistent continuous voice mode across steps & tours
  const [stepAutoAdvance, setStepAutoAdvance] = useState(true);
  const [stepAutoNextCountdown, setStepAutoNextCountdown] = useState(false);
  const [briefAutoAdvance, setBriefAutoAdvance] = useState(true);
  const [autoNextCountdown, setAutoNextCountdown] = useState(false);
  const [speechRate, setSpeechRate] = useState(1.0);

  const audioRef = useRef(null);
  const synthActiveRef = useRef(false);
  const stepAutoTimerRef = useRef(null);
  const briefAutoTimerRef = useRef(null);
  const briefVisitedRef = useRef(new Set());

  // Dedicated Story Player Audio & Timers
  const storyAudioRef = useRef(null);
  const storyFallbackIntervalRef = useRef(null);
  const storyBreathTimerRef = useRef(null);
  const storyModalRef = useRef(storyModal);
  const storyMutedRef = useRef(storyMuted);
  const playStoryChapterRef = useRef(null);

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
  storyModalRef.current = storyModal;
  storyMutedRef.current = storyMuted;

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
  const capturedSteps = useMemo(
    () => activeBranchMeta?.capturedSteps || pilotManifest?.capturedSteps || [],
    [activeBranchMeta]
  );
  const activeDocument = useMemo(
    () => activeBranchMeta?.document || pilotManifest?.document || {},
    [activeBranchMeta]
  );
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

  // Preload helper so screenshots arrive in browser cache BEFORE user clicks
  const preloadImageUrl = useCallback((url) => {
    if (!url || typeof window === 'undefined' || preloadedImagesRef.current.has(url)) return;
    preloadedImagesRef.current.add(url);
    const img = new window.Image();
    img.decoding = 'async';
    img.src = url;
  }, []);

  const preloadBranchFirstShot = useCallback(
    (branchId) => {
      const firstShot = pilotManifest?.branches?.[branchId]?.capturedSteps?.[0]?.image;
      if (firstShot) preloadImageUrl(firstShot);
    },
    [preloadImageUrl]
  );

  const preloadStoryShots = useCallback(
    (storyId) => {
      const story = VISUAL_STORIES[storyId];
      if (!story) return;
      story.chapters.forEach((ch) => {
        if (ch.image) preloadImageUrl(ch.image);
      });
    },
    [preloadImageUrl]
  );

  // Warm the Platform Overview + 4 Module Chapter-1 screenshots shortly after landing on `/demo`
  useEffect(() => {
    const timer = setTimeout(() => {
      preloadStoryShots('platform_intro');
      PLATFORM_MODULES.forEach((m) => {
        const st = VISUAL_STORIES[m.id];
        if (st?.chapters?.[0]?.image) preloadImageUrl(st.chapters[0].image);
      });
    }, 300);
    return () => clearTimeout(timer);
  }, [preloadImageUrl, preloadStoryShots]);

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

  // Stop Story Player audio/timers cleanly
  const stopStoryPlayback = useCallback(() => {
    if (storyBreathTimerRef.current) {
      clearTimeout(storyBreathTimerRef.current);
      storyBreathTimerRef.current = null;
    }
    if (storyFallbackIntervalRef.current) {
      clearInterval(storyFallbackIntervalRef.current);
      storyFallbackIntervalRef.current = null;
    }
    if (storyAudioRef.current) {
      storyAudioRef.current.pause();
      storyAudioRef.current.onended = null;
      storyAudioRef.current.ontimeupdate = null;
      storyAudioRef.current.onerror = null;
      storyAudioRef.current = null;
    }
    setStoryPlaying(false);
  }, []);

  // Stop any ongoing step/foundation audio cleanly
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

  // Advance story when a chapter finishes playing
  const handleStoryChapterEnded = useCallback((storyId, finishedChapterIdx) => {
    const story = VISUAL_STORIES[storyId];
    if (!story) return;
    setStoryProgress(100);
    storyBreathTimerRef.current = setTimeout(() => {
      storyBreathTimerRef.current = null;
      const cur = storyModalRef.current;
      if (!cur || cur.storyId !== storyId || cur.phase !== 'chapters') return;

      if (finishedChapterIdx < story.chapters.length - 1) {
        const nextIdx = finishedChapterIdx + 1;
        const nextState = { storyId, chapterIdx: nextIdx, phase: 'chapters' };
        storyModalRef.current = nextState;
        setStoryModal(nextState);
        setStoryProgress(0);
        if (playStoryChapterRef.current) {
          playStoryChapterRef.current(storyId, nextIdx, langRef.current, speechRateRef.current);
        }
      } else {
        setStoryPlaying(false);
        const handoffState = { storyId, chapterIdx: finishedChapterIdx, phase: 'handoff' };
        storyModalRef.current = handoffState;
        setStoryModal(handoffState);
      }
    }, STORY_CHAPTER_BREATH_MS);
  }, []);

  // Start silent progress timer fallback (used ONLY if MP3 cannot play)
  const startSilentStoryFallback = useCallback(
    (storyId, chapterIdx, rate) => {
      if (storyFallbackIntervalRef.current) {
        clearInterval(storyFallbackIntervalRef.current);
      }
      const durationMs = STORY_SILENT_FALLBACK_MS / Math.max(0.8, rate || 1.0);
      const startedAt = Date.now();
      setStoryPlaying(true);
      storyFallbackIntervalRef.current = setInterval(() => {
        const elapsed = Date.now() - startedAt;
        const pct = Math.min(100, (elapsed / durationMs) * 100);
        setStoryProgress(pct);
        if (pct >= 100) {
          clearInterval(storyFallbackIntervalRef.current);
          storyFallbackIntervalRef.current = null;
          handleStoryChapterEnded(storyId, chapterIdx);
        }
      }, 80);
    },
    [handleStoryChapterEnded]
  );

  // Play a specific chapter MP3 with real-time progress bar sync
  const playStoryChapter = useCallback(
    (storyId, chapterIdx, targetLang = langRef.current, rate = speechRateRef.current) => {
      stopStoryPlayback();
      const story = VISUAL_STORIES[storyId];
      const chapter = story?.chapters?.[chapterIdx];
      if (!chapter) return;

      setStoryProgress(0);
      const mp3Url = `/demo/audio/stories/${storyId}/ch${chapter.chapter}_${targetLang}.mp3?v=${AUDIO_CACHE_VER}`;
      const audio = new Audio(mp3Url);
      audio.playbackRate = rate;
      audio.muted = storyMutedRef.current;
      storyAudioRef.current = audio;

      audio.ontimeupdate = () => {
        if (storyAudioRef.current === audio && audio.duration > 0) {
          setStoryProgress(Math.min(100, (audio.currentTime / audio.duration) * 100));
        }
      };

      audio.onended = () => {
        if (storyAudioRef.current === audio) {
          storyAudioRef.current = null;
          handleStoryChapterEnded(storyId, chapterIdx);
        }
      };

      audio.onerror = () => {
        if (storyAudioRef.current === audio) {
          storyAudioRef.current = null;
          startSilentStoryFallback(storyId, chapterIdx, rate);
        }
      };

      setStoryPlaying(true);
      audio.play().catch(() => {
        if (storyAudioRef.current === audio) {
          storyAudioRef.current = null;
          startSilentStoryFallback(storyId, chapterIdx, rate);
        }
      });
    },
    [handleStoryChapterEnded, startSilentStoryFallback, stopStoryPlayback]
  );

  playStoryChapterRef.current = playStoryChapter;

  const openStory = useCallback(
    (storyId, chapterIdx = 0, autoStart = true) => {
      stopVoice();
      stopStoryPlayback();
      briefModalRef.current = null;
      setBriefModal(null);

      preloadStoryShots(storyId);
      if (storyId !== 'platform_intro') {
        const modIdx = MODULE_ORDER.indexOf(storyId);
        const nextModId = MODULE_ORDER[(modIdx + 1) % MODULE_ORDER.length];
        if (VISUAL_STORIES[nextModId]?.chapters?.[0]?.image) {
          preloadImageUrl(VISUAL_STORIES[nextModId].chapters[0].image);
        }
      }

      const nextModal = { storyId, chapterIdx, phase: 'chapters' };
      storyModalRef.current = nextModal;
      setStoryModal(nextModal);
      setStoryProgress(0);

      if (autoStart) {
        playStoryChapter(storyId, chapterIdx, langRef.current, speechRateRef.current);
      }
    },
    [playStoryChapter, preloadImageUrl, preloadStoryShots, stopStoryPlayback, stopVoice]
  );

  const closeStory = useCallback(() => {
    stopStoryPlayback();
    storyModalRef.current = null;
    setStoryModal(null);
    setStoryProgress(0);
  }, [stopStoryPlayback]);

  const toggleStoryPlayPause = useCallback(() => {
    const cur = storyModalRef.current;
    if (!cur) return;
    if (cur.phase === 'handoff') {
      openStory(cur.storyId, 0, true);
      return;
    }
    if (storyPlaying) {
      if (storyBreathTimerRef.current) {
        clearTimeout(storyBreathTimerRef.current);
        storyBreathTimerRef.current = null;
      }
      if (storyFallbackIntervalRef.current) {
        clearInterval(storyFallbackIntervalRef.current);
        storyFallbackIntervalRef.current = null;
      }
      if (storyAudioRef.current) {
        storyAudioRef.current.pause();
      }
      setStoryPlaying(false);
    } else if (storyAudioRef.current) {
      storyAudioRef.current.playbackRate = speechRateRef.current;
      storyAudioRef.current.muted = storyMutedRef.current;
      storyAudioRef.current.play().catch(() => {});
      setStoryPlaying(true);
    } else {
      playStoryChapter(cur.storyId, cur.chapterIdx, langRef.current, speechRateRef.current);
    }
  }, [openStory, playStoryChapter, storyPlaying]);

  const jumpStoryChapter = useCallback(
    (targetIdx) => {
      const cur = storyModalRef.current;
      if (!cur) return;
      const story = VISUAL_STORIES[cur.storyId];
      if (!story || targetIdx < 0 || targetIdx >= story.chapters.length) return;
      const nextModal = { storyId: cur.storyId, chapterIdx: targetIdx, phase: 'chapters' };
      storyModalRef.current = nextModal;
      setStoryModal(nextModal);
      setStoryProgress(0);
      playStoryChapter(cur.storyId, targetIdx, langRef.current, speechRateRef.current);
    },
    [playStoryChapter]
  );

  const openStoryHandoff = useCallback(() => {
    const cur = storyModalRef.current;
    if (!cur) return;
    stopStoryPlayback();
    const story = VISUAL_STORIES[cur.storyId];
    const lastIdx = (story?.chapters?.length || 4) - 1;
    const nextModal = { storyId: cur.storyId, chapterIdx: lastIdx, phase: 'handoff' };
    storyModalRef.current = nextModal;
    setStoryModal(nextModal);
    setStoryProgress(100);
  }, [stopStoryPlayback]);

  const toggleStoryMute = useCallback(() => {
    const nextMuted = !storyMutedRef.current;
    storyMutedRef.current = nextMuted;
    setStoryMuted(nextMuted);
    if (storyAudioRef.current) {
      storyAudioRef.current.muted = nextMuted;
    }
  }, []);

  // Handle end-of-narration auto-advance for Stage Steps/Tours AND Foundation Brief Modal
  const handleVoiceChannelEnded = useCallback((channel) => {
    setSpeechState('idle');

    if (channel === 'step') {
      if (
        viewRef.current !== 'stage' ||
        briefModalRef.current ||
        storyModalRef.current ||
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
          storyModalRef.current ||
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

    const curIdx = PLATFORM_FOUNDATION_PILLARS.findIndex((item) => item.id === currentModal.id);
    if (curIdx === -1) return;

    const nextItem = PLATFORM_FOUNDATION_PILLARS[(curIdx + 1) % PLATFORM_FOUNDATION_PILLARS.length];
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
      const nextModal = { id: nextItem.id };
      briefModalRef.current = nextModal;
      setBriefModal(nextModal);

      const nextTarget = resolveFoundationTarget(nextItem.id);
      if (nextTarget && playBriefVoiceRef.current) {
        playBriefVoiceRef.current(nextTarget, langRef.current, speechRateRef.current);
      }
    }, BRIEF_AUTO_ADVANCE_DELAY_MS);
  }, []);

  // Speak arbitrary text via Web Speech API fallback if static neural MP3 is unavailable
  const speakRawTextWithWebSpeech = useCallback(
    (rawText, targetLang, rate, channel = 'step') => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window) || !rawText) {
        setSpeechState('idle');
        return;
      }
      window.speechSynthesis.cancel();
      const ar = targetLang === 'ar';
      const cleanedText = ar
        ? rawText
            .replace(/ج\.م/g, 'جنيه مصري')
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
        voices.find(
          (v) =>
            v.lang?.toLowerCase().startsWith(langPrefix) &&
            /ava|andrew|multilingual|natural|online|google|salma|shakir|aria/i.test(v.name)
        ) || voices.find((v) => v.lang?.toLowerCase().startsWith(langPrefix));
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
    },
    [handleVoiceChannelEnded]
  );

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

  const activeBriefData = briefModal ? resolveFoundationTarget(briefModal.id) : null;

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

  const openFoundationBrief = useCallback(
    (pillarId, autoPlay = false) => {
      stopStoryPlayback();
      storyModalRef.current = null;
      setStoryModal(null);
      stopVoice();
      const nextModal = { id: pillarId };
      briefModalRef.current = nextModal;
      setBriefModal(nextModal);
      if (autoPlay) {
        briefVisitedRef.current = new Set([pillarId]);
        const target = resolveFoundationTarget(pillarId);
        if (target) {
          playBriefVoice(target, langRef.current, speechRateRef.current);
        }
      } else {
        briefVisitedRef.current.clear();
      }
    },
    [playBriefVoice, stopStoryPlayback, stopVoice]
  );

  const closeBrief = useCallback(() => {
    briefVisitedRef.current.clear();
    stopVoice();
    briefModalRef.current = null;
    setBriefModal(null);
  }, [stopVoice]);

  const cycleSpeechRate = useCallback(() => {
    const nextRate = speechRate === 1.0 ? 1.25 : speechRate === 1.25 ? 1.5 : 1.0;
    speechRateRef.current = nextRate;
    setSpeechRate(nextRate);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextRate;
    }
    if (storyAudioRef.current) {
      storyAudioRef.current.playbackRate = nextRate;
    }
  }, [speechRate]);

  // Clean up audio on unmount
  useEffect(
    () => () => {
      stopVoice();
      stopStoryPlayback();
    },
    [stopStoryPlayback, stopVoice]
  );

  // Auto-read step notes when in Stage View (and no modal is open)
  useEffect(() => {
    if (briefModal || storyModal) {
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
  }, [view, currentStepIdx, lang, activeBranchId, Boolean(briefModal), Boolean(storyModal)]);

  const openBranch = useCallback(
    (branch, moduleObj, initialStepIdx = 0) => {
      if (branch.status === 'live') {
        stopStoryPlayback();
        storyModalRef.current = null;
        setStoryModal(null);
        briefModalRef.current = null;
        setBriefModal(null);
        stopVoice();
        if (moduleObj?.id) {
          setExpandedModuleId(moduleObj.id);
        }
        const targetSteps = PILOT_BRANCH_STEPS[branch.id] || [];
        const clampedStep = Math.max(0, Math.min(initialStepIdx, Math.max(0, targetSteps.length - 1)));
        setActiveBranchId(branch.id);
        setCurrentStepIdx(clampedStep);
        setSideTab('guide');
        setView('stage');
        setPlannedModalBranch(null);
      } else {
        setPlannedModalBranch({ branch, moduleObj });
      }
    },
    [stopStoryPlayback, stopVoice]
  );

  const openBranchById = useCallback(
    (moduleId, branchId, initialStepIdx = 0) => {
      const mod =
        PLATFORM_MODULES.find((m) => m.id === moduleId) ||
        PLATFORM_MODULES.find((m) => m.branches.some((b) => b.id === branchId)) ||
        PLATFORM_MODULES[0];
      const br = mod.branches.find((b) => b.id === branchId) || mod.branches[0];
      if (br) openBranch(br, mod, initialStepIdx);
    },
    [openBranch]
  );

  const handleExpertOpenChange = useCallback(
    (nextOpen) => {
      if (nextOpen) {
        stopVoice();
        if (storyPlaying && storyAudioRef.current) {
          storyAudioRef.current.pause();
          setStoryPlaying(false);
        }
      }
      setExpertChatOpen(nextOpen);
    },
    [stopVoice, storyPlaying]
  );

  const handleExpertShowcaseAction = useCallback(
    (action) => {
      if (!action) return;
      if (action.type === 'story' && VISUAL_STORIES[action.id]) {
        openStory(action.id, 0, true);
      } else if (action.type === 'foundation') {
        openFoundationBrief(action.id, false);
      } else if (action.type === 'tour') {
        const stepIdx = Math.max(0, (Number(action.step) || 1) - 1);
        openBranchById(action.module_id, action.id, stepIdx);
      }
    },
    [openBranchById, openFoundationBrief, openStory]
  );

  // Support deep-link URL query parameters (?story=..., ?branch=...&step=..., ?foundation=..., ?lang=ar, ?ask=1)
  useEffect(() => {
    const search = location?.search || '';
    if (!search || handledQueryRef.current === search) return;
    handledQueryRef.current = search;

    const params = new URLSearchParams(search);
    const qLang = params.get('lang');
    if (qLang === 'ar' || qLang === 'en') {
      langRef.current = qLang;
      setLang(qLang);
    }

    const qStory = params.get('story');
    const qFoundation = params.get('foundation');
    const qBranch = params.get('branch');
    const qStep = Math.max(0, (parseInt(params.get('step') || '1', 10) || 1) - 1);
    const qAsk = params.get('ask');

    if (qStory && VISUAL_STORIES[qStory]) {
      openStory(qStory, 0, true);
    } else if (qFoundation && PLATFORM_FOUNDATION_PILLARS.some((p) => p.id === qFoundation)) {
      openFoundationBrief(qFoundation, false);
    } else if (qBranch) {
      const targetMod = PLATFORM_MODULES.find((m) => m.branches.some((b) => b.id === qBranch));
      const targetBr = targetMod?.branches.find((b) => b.id === qBranch);
      if (targetBr && targetMod) {
        openBranch(targetBr, targetMod, qStep);
      }
    }

    if (qAsk === '1' || qAsk === 'true') {
      setExpertChatOpen(true);
    }
  }, [location?.search, openBranch, openFoundationBrief, openStory]);

  const toggleExpandModuleWorkflows = useCallback(
    (moduleId) => {
      setExpandedModuleId((prev) => {
        const next = prev === moduleId ? null : moduleId;
        if (next) {
          const mod = PLATFORM_MODULES.find((m) => m.id === next);
          mod?.branches?.forEach((b) => preloadBranchFirstShot(b.id));
          setTimeout(() => {
            workflowTrayRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }, 60);
        }
        return next;
      });
    },
    [preloadBranchFirstShot]
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

  // Keyboard navigation for Story Player & Stage View
  useEffect(() => {
    if (storyModal) {
      const onStoryKey = (e) => {
        if (e.key === 'Escape') {
          closeStory();
        } else if (e.key === ' ') {
          e.preventDefault();
          toggleStoryPlayPause();
        } else if (e.key === 'ArrowRight') {
          const delta = isAr ? -1 : 1;
          if (storyModal.phase === 'chapters') {
            const next = storyModal.chapterIdx + delta;
            if (next >= 0 && next < 4) jumpStoryChapter(next);
            else if (next >= 4) openStoryHandoff();
          }
        } else if (e.key === 'ArrowLeft') {
          const delta = isAr ? 1 : -1;
          if (storyModal.phase === 'chapters') {
            const next = storyModal.chapterIdx + delta;
            if (next >= 0 && next < 4) jumpStoryChapter(next);
          } else if (storyModal.phase === 'handoff' && delta < 0) {
            jumpStoryChapter(3);
          }
        }
      };
      window.addEventListener('keydown', onStoryKey);
      return () => window.removeEventListener('keydown', onStoryKey);
    }

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
  }, [
    storyModal,
    closeStory,
    toggleStoryPlayPause,
    jumpStoryChapter,
    openStoryHandoff,
    view,
    isAr,
    handleNextStep,
    handlePrevStep,
    sideTab,
  ]);

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
  const currentShotSrc = activeCapture?.image || '';
  const isImageDecoded = Boolean(currentShotSrc && decodedImageSrc === currentShotSrc);
  const isHotspotVisible = Boolean(currentShotSrc && readyImageSrc === currentShotSrc);

  // Whenever inside Stage View, eagerly preload all remaining screenshots in the active tour + next tour's Step 1
  useEffect(() => {
    if (view !== 'stage') return undefined;
    const orderedUrls = [];
    for (let offset = 1; offset < capturedSteps.length; offset += 1) {
      const nextCapture = capturedSteps[(currentStepIdx + offset) % capturedSteps.length];
      if (nextCapture?.image) orderedUrls.push(nextCapture.image);
    }
    if (nextLiveBranch?.id) {
      const nextTourFirst = pilotManifest?.branches?.[nextLiveBranch.id]?.capturedSteps?.[0]?.image;
      if (nextTourFirst) orderedUrls.push(nextTourFirst);
    }
    if (activeDocument?.previewImageUrl) {
      orderedUrls.push(activeDocument.previewImageUrl);
    }
    orderedUrls.forEach((u) => preloadImageUrl(u));
    return undefined;
  }, [view, activeBranchId, currentStepIdx, capturedSteps, nextLiveBranch, activeDocument, preloadImageUrl]);

  // Synchronize screenshot GPU decode -> THEN reveal blue hotspot 180ms later (never before the image!)
  const finalizeShotReveal = useCallback((imgEl, targetSrc) => {
    if (!targetSrc) return;
    if (hotspotRevealTimerRef.current) {
      clearTimeout(hotspotRevealTimerRef.current);
      hotspotRevealTimerRef.current = null;
    }
    const reveal = () => {
      setDecodedImageSrc(targetSrc);
      hotspotRevealTimerRef.current = setTimeout(() => {
        hotspotRevealTimerRef.current = null;
        setReadyImageSrc(targetSrc);
      }, 180);
    };
    if (imgEl && typeof imgEl.decode === 'function') {
      imgEl.decode().then(reveal).catch(reveal);
    } else {
      reveal();
    }
  }, []);

  useEffect(() => {
    if (hotspotRevealTimerRef.current) {
      clearTimeout(hotspotRevealTimerRef.current);
      hotspotRevealTimerRef.current = null;
    }
    if (!currentShotSrc) return undefined;
    const el = stageImgRef.current;
    if (el && el.complete && el.naturalWidth > 0) {
      finalizeShotReveal(el, currentShotSrc);
    }
    return () => {
      if (hotspotRevealTimerRef.current) {
        clearTimeout(hotspotRevealTimerRef.current);
        hotspotRevealTimerRef.current = null;
      }
    };
  }, [currentShotSrc, view, finalizeShotReveal]);

  // Decode Story Cinema screenshot cleanly
  const activeStoryObj = storyModal ? VISUAL_STORIES[storyModal.storyId] : null;
  const activeStoryChapter =
    activeStoryObj?.chapters?.[storyModal?.chapterIdx || 0] || activeStoryObj?.chapters?.[0] || null;
  const activeStoryImageSrc = activeStoryChapter?.image || '';

  useEffect(() => {
    if (!activeStoryImageSrc || storyModal?.phase !== 'chapters') return;
    const el = storyImgRef.current;
    if (el && el.complete && el.naturalWidth > 0) {
      setStoryDecodedSrc(activeStoryImageSrc);
    }
  }, [activeStoryImageSrc, storyModal?.phase]);

  const expandedModuleObj = expandedModuleId
    ? PLATFORM_MODULES.find((m) => m.id === expandedModuleId) || null
    : null;

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
      {/* ═══════ DOCKED SIDE-PUSH FLEX SHELL (SQUEEZES PAGE CLEANLY ON DESKTOP) ═══════ */}
      <div
        className={
          isFullScreen
            ? 'flex-1 min-h-0 flex items-stretch overflow-hidden w-full'
            : 'flex items-start w-full'
        }
      >
        <div
          className={`flex-1 min-w-0 transition-all duration-200 ${
            isFullScreen ? 'flex flex-col h-full overflow-hidden' : ''
          }`}
        >
      {/* ═══════ UNIFIED EXECUTIVE HERO & STAGE TOP BAR ═══════ */}
      <div className="bg-gradient-to-r from-[#11192e] via-[#1b2848] to-[#0f172a] text-white border-b border-slate-800 shrink-0">
        <div
          className={`${
            isFullScreen && view === 'stage'
              ? 'w-full px-3 h-9 flex items-center'
              : `max-w-[1840px] mx-auto px-4 sm:px-6 lg:px-7 ${
                  view === 'stage' ? 'py-2' : 'py-4 lg:py-5'
                }`
          }`}
        >
          {view === 'tree' ? (
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 w-full">
              <div className="max-w-4xl">
                <div className="flex flex-wrap items-center gap-2 mb-1.5">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-500/15 text-blue-300 border border-blue-400/25">
                    <Sparkles className="w-3 h-3 text-amber-300" />
                    {isAr
                      ? 'تجربة تفاعلية لصنّاع القرار · شاشات فعلية'
                      : 'Executive Product Experience · Real System Screens'}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-400/25">
                    {isAr ? 'بدون تسجيل مسبق' : 'Ungated · Instant Access'}
                  </span>
                </div>
                <h1 className="text-xl sm:text-2xl lg:text-[25px] font-extrabold tracking-tight text-white leading-snug">
                  {isAr
                    ? 'تحكم شامل بالخزانة — القيمة في دقيقة، والتفاصيل عند الطلب'
                    : 'Corporate Treasury Control — Value in 65s, Depth on Demand'}
                </h1>
                <p className="text-xs sm:text-sm text-slate-300 mt-1 leading-relaxed">
                  {isAr
                    ? 'شاهد عرض المنصة أو قصة أي وحدة صوتياً، ثم جرّب المسارات خطوة بخطوة.'
                    : 'Watch the 65s overview or any voiced module story, then try step-by-step workflows.'}
                </p>
              </div>

              {/* Hero Right Controls: 65s Platform Overview CTA + Language Switcher */}
              <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-center shrink-0">
                <button
                  type="button"
                  onMouseEnter={() => preloadStoryShots('platform_intro')}
                  onClick={() => openStory('platform_intro', 0, true)}
                  className="inline-flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-600/30 border border-blue-400/40 transition-all cursor-pointer group"
                >
                  <span className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Play className="w-3 h-3 fill-current text-white" />
                  </span>
                  <div className="flex flex-col text-start leading-tight">
                    <span>
                      {isAr ? 'شاهد عرض المنصة الكامل' : 'Watch Platform Overview'}
                    </span>
                    <span className="text-[10px] font-semibold text-blue-200">
                      {isAr ? '٦٥ ثانية · ٤ وحدات بالصوت والصورة' : '65 sec · All 4 Modules with Voice'}
                    </span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleExpertOpenChange(!expertChatOpen)}
                  className={`inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold border transition-all cursor-pointer ${
                    expertChatOpen
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-400 shadow-md shadow-emerald-950/30'
                      : 'bg-slate-900/90 hover:bg-slate-800 text-white border-slate-600/90 hover:border-blue-400/60'
                  }`}
                >
                  <Sparkles className="w-4 h-4 text-amber-300 shrink-0" />
                  <span>
                    {expertChatOpen
                      ? isAr
                        ? 'إخفاء خبير Grow الذكي'
                        : 'Hide Grow AI'
                      : isAr
                      ? 'اسأل خبير Grow الذكي'
                      : 'Ask Grow AI'}
                  </span>
                </button>

                {/* Language Switcher */}
                <div className="inline-flex items-center rounded-xl bg-slate-900/90 p-1 border border-slate-700">
                  <button
                    type="button"
                    onClick={() => setLang('en')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      !isAr ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    English
                  </button>
                  <button
                    type="button"
                    onClick={() => setLang('ar')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      isAr ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-300 hover:text-white'
                    }`}
                    style={{ fontFamily: "'Cairo', sans-serif" }}
                  >
                    العربية
                  </button>
                </div>
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

                {/* Visual Executive Story Trigger inside Stage */}
                <button
                  type="button"
                  onClick={() => openStory(activeStageModule.id, 0, true)}
                  className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-[11px] font-bold bg-indigo-500/20 hover:bg-indigo-500/35 text-indigo-200 border border-indigo-400/30 transition-all shrink-0 cursor-pointer"
                >
                  <Sparkles className="w-3 h-3 text-amber-300" />
                  <span>{isAr ? 'القصة التنفيذية للوحدة (٧٥ ث)' : 'Watch 75s Module Story'}</span>
                </button>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
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
                  onClick={() => handleExpertOpenChange(!expertChatOpen)}
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                    expertChatOpen
                      ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                      : 'bg-emerald-500/20 hover:bg-emerald-500/35 text-emerald-200 border-emerald-400/35'
                  }`}
                  title={isAr ? 'اسأل خبير Grow الذكي' : 'Ask Grow AI Product Expert'}
                >
                  <Sparkles className={`w-3 h-3 ${expertChatOpen ? 'text-slate-950' : 'text-amber-300'}`} />
                  <span>{isAr ? 'اسأل الذكي' : 'Ask AI'}</span>
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

      {/* ═══════ VIEW 1: CALM PROGRESSIVE-DISCLOSURE 4-MODULE SHOWROOM ═══════ */}
      {view === 'tree' && (
        <div
          className={`max-w-[1840px] mx-auto px-4 sm:px-6 lg:px-7 py-5 lg:py-6 w-full space-y-5 ${
            isFullScreen ? 'flex-1 overflow-y-auto' : ''
          }`}
        >
          {/* Compact Cross-Platform Governance & Security Foundation Strip */}
          <div className="w-full text-center">
            <div className="inline-flex flex-wrap items-center justify-center gap-2.5 bg-white rounded-2xl px-4 py-2 shadow-2xs border border-slate-200/90">
              <button
                type="button"
                onClick={() => openFoundationBrief('governance', false)}
                className="flex items-center gap-2 group text-start cursor-pointer"
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
                    {isAr ? 'أساسيات الحوكمة والأمان المشتركة' : 'Enterprise Governance & Security Foundation'}
                  </span>
                  <span className="text-[10px] text-blue-600 font-semibold leading-tight">
                    {isAr ? 'تعمل تلقائياً عبر الوحدات الأربع ←' : 'Built into all 4 modules · Click any pillar →'}
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
                        onClick={() => openFoundationBrief(p.id, false)}
                        className="inline-flex items-center gap-1.5 ps-2.5 pe-1.5 py-1 cursor-pointer"
                      >
                        <PillarIcon className="w-3 h-3 text-blue-600 shrink-0" />
                        <span>{isAr ? p.shortAr : p.shortEn}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => openFoundationBrief(p.id, true)}
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

          {/* 4 Equal-Height Executive Module Cards (Reflows cleanly to 2x2 when Docked AI Side Panel is open on laptops!) */}
          <div
            className={`grid grid-cols-1 md:grid-cols-2 ${
              expertChatOpen ? '2xl:grid-cols-4' : 'lg:grid-cols-4'
            } gap-4 lg:gap-5 items-stretch`}
          >
            {PLATFORM_MODULES.map((mod) => {
              const IconComp = MODULE_ICONS[mod.id] || Layers;
              const style = ACCENT_STYLES[mod.accent] || ACCENT_STYLES.blue;
              const moduleTopicCount = mod.branches.length;
              const isExpanded = expandedModuleId === mod.id;
              const bullets = (isAr ? mod.cardBulletsAr : mod.cardBulletsEn) || [];

              return (
                <div
                  key={mod.id}
                  className={`relative bg-white rounded-2xl border transition-all duration-200 overflow-hidden flex flex-col h-full ${
                    isExpanded
                      ? style.activeTrunk
                      : `${style.trunkBorder} shadow-xs hover:shadow-md`
                  }`}
                >
                  <div className={`h-1.5 w-full bg-gradient-to-r ${style.topBar} shrink-0`} />

                  <div className="p-5 flex flex-col flex-1">
                    {/* Top Meta Row: Module Badge + Story Time + Icon */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-full border ${style.pill}`}>
                          {isAr ? mod.badgeAr : mod.badgeEn}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                          <Volume2 className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>{isAr ? mod.storyDurationAr || '٧٥ ثانية' : mod.storyDurationEn || '75s Story'}</span>
                        </span>
                      </div>
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shadow-xs shrink-0 ${style.iconBg}`}>
                        <IconComp className="w-4 h-4" />
                      </div>
                    </div>

                    {/* Module Title & Clear Role Distinction Subtitle */}
                    <h2 className="text-lg font-extrabold text-slate-900 leading-snug">
                      {isAr ? mod.titleAr : mod.titleEn}
                    </h2>
                    <p className={`text-xs font-bold mt-0.5 ${style.iconText}`}>
                      {isAr ? mod.subtitleAr : mod.subtitleEn}
                    </p>

                    {/* Executive Outcome Hook */}
                    <p className="text-xs sm:text-[13px] text-slate-600 mt-2.5 leading-relaxed">
                      {isAr ? mod.summaryAr : mod.summaryEn}
                    </p>

                    {/* 3 Scannable CFO Outcome Bullets */}
                    <div className="mt-3.5 pt-3 border-t border-slate-100 space-y-2">
                      {bullets.map((bText, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs font-semibold text-slate-700 leading-snug">
                          <CheckCircle2 className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${style.iconText}`} />
                          <span>{bText}</span>
                        </div>
                      ))}
                    </div>

                    {/* Pinned Equal-Height Bottom Action Stack */}
                    <div className="mt-auto pt-5 space-y-2">
                      {/* Primary CTA: Auto-Playing 4-Chapter Visual Executive Story */}
                      <button
                        type="button"
                        onMouseEnter={() => preloadStoryShots(mod.id)}
                        onClick={() => openStory(mod.id, 0, true)}
                        className={`w-full flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl text-xs sm:text-[13px] font-extrabold transition-all cursor-pointer ${style.liveBtn}`}
                      >
                        <span className="inline-flex items-center gap-2">
                          <Play className="w-3.5 h-3.5 fill-current shrink-0" />
                          <span>
                            {isAr ? 'شاهد القصة التنفيذية' : 'Watch Executive Story'}
                          </span>
                        </span>
                        <span className="text-[10.5px] font-semibold px-2 py-0.5 rounded-md bg-black/15">
                          {isAr ? '٤ مشاهد · صوت' : '4 Chapters'}
                        </span>
                      </button>

                      {/* Secondary Progressive Disclosure CTA: Reveal Hands-On Workflows */}
                      <button
                        type="button"
                        onMouseEnter={() => {
                          const firstLive = mod.branches[0];
                          if (firstLive) preloadBranchFirstShot(firstLive.id);
                        }}
                        onClick={() => toggleExpandModuleWorkflows(mod.id)}
                        className={`w-full flex items-center justify-between gap-2 px-3.5 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                          isExpanded ? style.activeSecondaryBtn : style.secondaryBtn
                        }`}
                      >
                        <span>
                          {isExpanded
                            ? isAr
                              ? `إخفاء المسارات التفاعلية (${toArNum(moduleTopicCount)})`
                              : `Hide Hands-On Workflows (${moduleTopicCount})`
                            : isAr
                            ? `استكشف ${toArNum(moduleTopicCount)} مسارات تفاعلية خطوة بخطوة`
                            : `Explore ${moduleTopicCount} Hands-On Workflows`}
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 shrink-0" />
                        ) : (
                          <ChevronDown className="w-4 h-4 shrink-0" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── PROGRESSIVE-DISCLOSURE HANDS-ON WORKFLOWS TRAY (Revealed On Demand!) ── */}
          {expandedModuleObj && (() => {
            const trayStyle = ACCENT_STYLES[expandedModuleObj.accent] || ACCENT_STYLES.blue;
            const TrayIcon = MODULE_ICONS[expandedModuleObj.id] || Layers;
            const firstBranch = expandedModuleObj.branches[0];
            const colsClass =
              expandedModuleObj.branches.length === 3
                ? 'grid-cols-1 md:grid-cols-3'
                : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4';

            return (
              <div
                ref={workflowTrayRef}
                className={`rounded-2xl border p-4 sm:p-5 shadow-md transition-all ${trayStyle.trayBg}`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 pb-4 mb-4 border-b border-slate-200/80">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shadow-xs shrink-0 ${trayStyle.iconBg}`}>
                      <TrayIcon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`text-[10.5px] font-extrabold px-2 py-0.5 rounded-full border ${trayStyle.pill}`}>
                          {isAr ? expandedModuleObj.badgeAr : expandedModuleObj.badgeEn}
                        </span>
                        <h3 className="text-base sm:text-lg font-extrabold text-slate-900">
                          {isAr
                            ? `المسارات التفاعلية خطوة بخطوة · ${expandedModuleObj.titleAr}`
                            : `Hands-On Interactive Workflows · ${expandedModuleObj.titleEn}`}
                        </h3>
                      </div>
                      <p className="text-xs text-slate-600 mt-0.5">
                        {isAr
                          ? 'اضغط على أي مسار لتجربة شاشات النظام الفعلية والمستندات البنكية والشرح الصوتي.'
                          : 'Select any workflow below to click through real system captures, sample bank PDFs, and guided audio.'}
                      </p>
                    </div>
                  </div>

                  {/* Quick Module Switcher Pills + Full Guided Tour + Close */}
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="inline-flex flex-wrap items-center gap-1 bg-white/90 p-1 rounded-xl border border-slate-200/90">
                      {PLATFORM_MODULES.map((m, idx) => {
                        const active = m.id === expandedModuleObj.id;
                        return (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => setExpandedModuleId(m.id)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold transition-all cursor-pointer ${
                              active
                                ? 'bg-slate-900 text-white shadow-2xs'
                                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                            }`}
                          >
                            {isAr ? `٠${toArNum(idx + 1)}` : `0${idx + 1}`} · {isAr ? m.titleAr : m.titleEn}
                          </button>
                        );
                      })}
                    </div>

                    {firstBranch && (
                      <button
                        type="button"
                        onClick={() => openBranch(firstBranch, expandedModuleObj)}
                        className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-extrabold cursor-pointer transition-all ${trayStyle.liveBtn}`}
                      >
                        <Play className="w-3 h-3 fill-current" />
                        <span>
                          {isAr ? 'تشغيل كافة مسارات الوحدة بالتتابع' : 'Run Full Module Tour'}
                        </span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setExpandedModuleId(null)}
                      className="p-2 rounded-xl bg-white hover:bg-slate-100 text-slate-500 hover:text-slate-800 border border-slate-200 cursor-pointer"
                      title={isAr ? 'إغلاق المسارات' : 'Close workflows'}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Horizontal Workflow Cards */}
                <div className={`grid ${colsClass} gap-3.5`}>
                  {expandedModuleObj.branches.map((branch) => {
                    const isLive = branch.status === 'live';
                    return (
                      <button
                        key={branch.id}
                        type="button"
                        onMouseEnter={() => preloadBranchFirstShot(branch.id)}
                        onClick={() => openBranch(branch, expandedModuleObj)}
                        className={`text-start rounded-xl p-3.5 border transition-all duration-150 cursor-pointer group flex flex-col justify-between h-full ${
                          isLive
                            ? trayStyle.liveCard
                            : 'bg-white border-slate-200/90 hover:border-slate-300'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <span
                              className={`text-[11px] font-extrabold px-2 py-0.5 rounded-md transition-colors ${
                                isLive ? trayStyle.codeBadge : 'bg-slate-100 text-slate-500'
                              }`}
                            >
                              {branch.code}
                            </span>
                            <span className="text-[11px] font-medium text-slate-500">
                              {isAr
                                ? branch.durationAr.replace(' خطوات تفاعلية', ' خطوات')
                                : branch.durationEn.replace(' Interactive Steps', ' Steps')}
                            </span>
                          </div>

                          <h4 className={`text-xs sm:text-sm font-extrabold text-slate-900 ${trayStyle.hoverTitle} transition-colors leading-snug`}>
                            {isAr ? branch.titleAr : branch.titleEn}
                          </h4>

                          <p className="text-[11.5px] text-slate-600 mt-1.5 leading-relaxed">
                            {isAr ? branch.descAr : branch.descEn}
                          </p>
                        </div>

                        <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs font-extrabold">
                          <span className={trayStyle.iconText}>
                            {isAr ? 'ابدأ التجربة التفاعلية' : 'Try Interactive Workflow'}
                          </span>
                          {isAr ? (
                            <ArrowLeft className={`w-3.5 h-3.5 ${trayStyle.iconText} group-hover:-translate-x-0.5 transition-transform`} />
                          ) : (
                            <ArrowRight className={`w-3.5 h-3.5 ${trayStyle.iconText} group-hover:translate-x-0.5 transition-transform`} />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* Subtle Executive Conversion Footer Strip */}
          <div className="bg-white rounded-2xl border border-slate-200/90 px-5 py-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-2.5 text-xs sm:text-sm text-slate-700">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
              <span className="font-semibold">
                {isAr
                  ? 'هل ترغب في رؤية المنصة على نماذج خطابات الضمان وكشوف البنوك الخاصة بشركتكم؟'
                  : 'Want to see Grow running on your own guarantee templates, bank facilities, or statement formats?'}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => handleExpertOpenChange(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-extrabold bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 transition-colors cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <span>{isAr ? 'لديك سيناريو خاص؟ اسأل Grow الذكي' : 'Specific scenario? Ask Grow AI'}</span>
              </button>
              <Link
                to="/#book-meeting"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-extrabold bg-slate-100 hover:bg-slate-200 text-slate-900 border border-slate-200 transition-colors"
              >
                <span>{isAr ? 'احجز جلسة تنفيذية (٢٠ دقيقة)' : 'Book a 20-Min Executive Walkthrough'}</span>
              </Link>
              <Link
                to="/free-trial-register"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-extrabold bg-blue-600 hover:bg-blue-700 text-white shadow-2xs transition-colors"
              >
                <span>{isAr ? 'ابدأ تجربة مجانية' : 'Start Free Trial'}</span>
                {isAr ? <ArrowLeft className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
              </Link>
            </div>
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
                        <button
                          type="button"
                          onClick={cycleSpeechRate}
                          className="px-2 py-0.5 rounded-md text-[11px] font-mono font-bold bg-white/10 hover:bg-white/20 text-slate-200"
                          title={isAr ? 'سرعة القراءة الصوتية' : 'Voice playback speed'}
                        >
                          {speechRate}x
                        </button>

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

                    {/* ── CURRENT STEP STORY & GUIDE NOTES ── */}
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

            {/* ── INTERACTIVE REAL SYSTEM SCREEN ── */}
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
                  {!isImageDecoded && (
                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-slate-100/95">
                      <div className="w-7 h-7 rounded-full border-2 border-slate-300 border-t-blue-600 animate-spin" />
                      <span className="text-[11px] font-semibold text-slate-500">
                        {isAr ? 'جاري تحميل شاشة النظام…' : 'Loading system screen…'}
                      </span>
                    </div>
                  )}

                  {activeCapture?.image && (
                    <img
                      ref={stageImgRef}
                      key={activeCapture.image}
                      src={activeCapture.image}
                      alt={activeNarrative.headlineEn}
                      onLoad={(e) => finalizeShotReveal(e.currentTarget, activeCapture.image)}
                      className={`w-full h-full object-contain block transition-opacity duration-150 ${
                        isImageDecoded ? 'opacity-100' : 'opacity-0'
                      }`}
                      draggable={false}
                    />
                  )}

                  {/* Interactive Hotspot Button — Strictly Hidden Until Screenshot Finishes Decoding */}
                  <button
                    key={`${activeBranchId}-${currentStepIdx}-${currentShotSrc}`}
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
                    className={`absolute z-20 rounded-xl border-2 border-blue-500 bg-blue-500/10 hover:bg-blue-500/20 focus:outline-none group ${
                      !isHotspotVisible
                        ? 'opacity-0 scale-95 pointer-events-none'
                        : nudgeHotspot
                        ? 'transition-[opacity,transform,box-shadow] duration-200 opacity-100 ring-8 ring-amber-400/70 scale-105'
                        : 'transition-[opacity,transform,box-shadow] duration-200 opacity-100 scale-100 ring-4 ring-blue-500/30 shadow-[0_0_25px_rgba(37,99,235,0.45)]'
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
        </div>

        {/* ═══════ DOCKED SIDE-PUSH GROW AI PANEL (ZERO OVERLAP, SQUEEZES PAGE CLEANLY) ═══════ */}
        <PublicProductExpertChat
          lang={lang}
          pageContext={
            storyModal
              ? `demo:story:${storyModal.storyId}`
              : view === 'stage'
              ? `demo:tour:${activeBranchId}:step-${activeNarrative?.step || 1}`
              : expandedModuleId
              ? `demo:module:${expandedModuleId}`
              : 'demo:showroom'
          }
          activeModuleId={
            storyModal && storyModal.storyId !== 'platform_intro'
              ? storyModal.storyId
              : view === 'stage'
              ? activeStageModule?.id || null
              : expandedModuleId || null
          }
          isOpen={expertChatOpen}
          onOpenChange={handleExpertOpenChange}
          onShowcaseAction={handleExpertShowcaseAction}
          stickyClassName={
            isFullScreen
              ? 'lg:top-0 lg:h-screen'
              : embedded
              ? 'lg:top-4 lg:h-[740px]'
              : 'lg:top-[44px] lg:h-[calc(100vh-44px)]'
          }
        />
      </div>

      {/* ═══════ VISUAL EXECUTIVE STORY CINEMA PLAYER (4 AUTO-PLAYING CHAPTERS + GO-DEEPER HANDOFF) ═══════ */}
      {storyModal && activeStoryObj && (() => {
        const stStyle = ACCENT_STYLES[activeStoryObj.accent] || ACCENT_STYLES.blue;
        const storyModuleObj =
          activeStoryObj.kind === 'module'
            ? PLATFORM_MODULES.find((m) => m.id === activeStoryObj.moduleId) || PLATFORM_MODULES[0]
            : null;
        const nextModuleObj = storyModuleObj
          ? PLATFORM_MODULES[
              (PLATFORM_MODULES.findIndex((m) => m.id === storyModuleObj.id) + 1) %
                PLATFORM_MODULES.length
            ]
          : PLATFORM_MODULES[0];

        return (
          <div
            dir={dir}
            style={{ fontFamily }}
            className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-2.5 sm:p-4"
            onClick={closeStory}
          >
            <div
              className="bg-[#0b1222] text-white rounded-3xl max-w-[1320px] w-full shadow-2xl border border-slate-700/80 overflow-hidden flex flex-col max-h-[95vh]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* 1. Top Cinema Story Switcher & Utility Controls */}
              <div className="px-4 sm:px-6 py-2.5 bg-[#080e1c] border-b border-slate-800/90 flex flex-wrap items-center justify-between gap-2 shrink-0">
                <div className="flex flex-wrap items-center gap-1">
                  {STORY_NAV_ORDER.map((sId) => {
                    const sObj = VISUAL_STORIES[sId];
                    if (!sObj) return null;
                    const isCurrent = sId === storyModal.storyId;
                    return (
                      <button
                        key={sId}
                        type="button"
                        onMouseEnter={() => preloadStoryShots(sId)}
                        onClick={() => openStory(sId, 0, true)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold transition-all cursor-pointer ${
                          isCurrent
                            ? 'bg-white text-slate-950 shadow-xs'
                            : 'text-slate-300 hover:text-white hover:bg-white/10'
                        }`}
                      >
                        {isAr ? sObj.navLabelAr : sObj.navLabelEn}
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {/* Direct Jump to Hands-On Workflows Handoff */}
                  <button
                    type="button"
                    onClick={openStoryHandoff}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                      storyModal.phase === 'handoff'
                        ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                        : 'bg-white/10 hover:bg-white/20 text-slate-200 border-white/15'
                    }`}
                  >
                    <Layers className="w-3 h-3" />
                    <span>{isAr ? 'المسارات التفاعلية' : 'Hands-On Workflows'}</span>
                  </button>

                  {/* Playback Speed */}
                  <button
                    type="button"
                    onClick={cycleSpeechRate}
                    className="px-2 py-1 rounded-lg text-[11px] font-mono font-bold bg-white/10 hover:bg-white/20 text-slate-200 cursor-pointer"
                    title={isAr ? 'سرعة الصوت' : 'Playback speed'}
                  >
                    {speechRate}x
                  </button>

                  {/* Mute / Unmute */}
                  <button
                    type="button"
                    onClick={toggleStoryMute}
                    className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                      storyMuted
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                        : 'bg-white/10 hover:bg-white/20 text-slate-200 border-white/10'
                    }`}
                    title={storyMuted ? (isAr ? 'تشغيل الصوت' : 'Unmute') : (isAr ? 'كتم الصوت' : 'Mute')}
                  >
                    {storyMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                  </button>

                  {/* Inline Language Switcher (Seamlessly switches voiceover mid-story!) */}
                  <div className="inline-flex items-center rounded-lg bg-slate-900 p-0.5 border border-slate-700">
                    <button
                      type="button"
                      onClick={() => {
                        langRef.current = 'en';
                        setLang('en');
                        if (storyModal.phase === 'chapters') {
                          playStoryChapter(storyModal.storyId, storyModal.chapterIdx, 'en', speechRate);
                        }
                      }}
                      className={`px-2 py-0.5 rounded-md text-[11px] font-bold cursor-pointer ${
                        !isAr ? 'bg-blue-600 text-white' : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      EN
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        langRef.current = 'ar';
                        setLang('ar');
                        if (storyModal.phase === 'chapters') {
                          playStoryChapter(storyModal.storyId, storyModal.chapterIdx, 'ar', speechRate);
                        }
                      }}
                      className={`px-2 py-0.5 rounded-md text-[11px] font-bold cursor-pointer ${
                        isAr ? 'bg-blue-600 text-white' : 'text-slate-300 hover:text-white'
                      }`}
                      style={{ fontFamily: "'Cairo', sans-serif" }}
                    >
                      عربي
                    </button>
                  </div>

                  {/* Close Modal */}
                  <button
                    type="button"
                    onClick={closeStory}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                    title={isAr ? 'إغلاق (Esc)' : 'Close (Esc)'}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* 2. 4-Segment Interactive Chapter Progress Bar */}
              <div className="px-4 sm:px-6 py-2.5 bg-[#0e172c] border-b border-slate-800/90 shrink-0">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {activeStoryObj.chapters.map((ch, idx) => {
                    const isDone =
                      storyModal.phase === 'handoff' || idx < storyModal.chapterIdx;
                    const isCurrent =
                      storyModal.phase === 'chapters' && idx === storyModal.chapterIdx;
                    const fillPct = isDone ? 100 : isCurrent ? storyProgress : 0;

                    return (
                      <button
                        key={ch.chapter}
                        type="button"
                        onClick={() => jumpStoryChapter(idx)}
                        className={`group text-start rounded-xl px-3 py-2 border transition-all cursor-pointer ${
                          isCurrent
                            ? 'bg-white/10 border-white/30 shadow-xs'
                            : isDone
                            ? 'bg-white/[0.04] border-white/10 hover:bg-white/10'
                            : 'bg-white/[0.02] border-white/5 hover:bg-white/10 opacity-75 hover:opacity-100'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1.5 mb-1.5">
                          <span className="text-[11px] font-extrabold text-white truncate">
                            {isAr ? ch.shortTabAr : ch.shortTabEn}
                          </span>
                          {isDone ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          ) : isCurrent && storyPlaying ? (
                            <Volume2 className="w-3.5 h-3.5 text-blue-400 animate-pulse shrink-0" />
                          ) : null}
                        </div>
                        <div className="h-1 w-full rounded-full bg-white/15 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-[width] duration-100 ${
                              isDone ? 'bg-emerald-400' : stStyle.storyBarFill
                            }`}
                            style={{ width: `${fillPct}%` }}
                          />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. Cinema Body: Either Live 4-Chapter Story OR End-of-Story "Go Deeper" Handoff */}
              {storyModal.phase === 'chapters' && activeStoryChapter ? (
                <div className="p-4 sm:p-6 overflow-y-auto flex-1 grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
                  {/* Narrative & Executive Outcome Column (5 cols) */}
                  <div className="lg:col-span-5 flex flex-col justify-between h-full space-y-4">
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${stStyle.storyChip}`}>
                          <Sparkles className="w-3 h-3 text-amber-300 shrink-0" />
                          <span>{isAr ? activeStoryChapter.badgeAr : activeStoryChapter.badgeEn}</span>
                        </span>
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-emerald-500/15 text-emerald-300 border border-emerald-400/30">
                          <CheckCircle2 className="w-3 h-3 shrink-0" />
                          <span>{isAr ? activeStoryChapter.metricAr : activeStoryChapter.metricEn}</span>
                        </span>
                      </div>

                      <h2 className="text-lg sm:text-xl lg:text-[22px] font-extrabold text-white leading-snug">
                        {isAr ? activeStoryChapter.headlineAr : activeStoryChapter.headlineEn}
                      </h2>

                      <p className="text-xs sm:text-sm text-slate-300 leading-relaxed bg-white/[0.04] border border-white/10 rounded-2xl p-3.5">
                        {isAr ? activeStoryChapter.captionAr : activeStoryChapter.captionEn}
                      </p>
                    </div>

                    {/* Transport Controls + Contextual "Try This Workflow Hands-On" Micro-CTA */}
                    <div className="space-y-3 pt-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={toggleStoryPlayPause}
                          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                            storyPlaying
                              ? 'bg-emerald-500 hover:bg-emerald-600 text-slate-950'
                              : 'bg-blue-600 hover:bg-blue-500 text-white'
                          }`}
                        >
                          {storyPlaying ? (
                            <>
                              <Pause className="w-3.5 h-3.5 fill-current" />
                              <span>{isAr ? 'إيقاف مؤقت' : 'Pause Story'}</span>
                            </>
                          ) : (
                            <>
                              <Play className="w-3.5 h-3.5 fill-current" />
                              <span>{isAr ? 'استكمال العرض' : 'Resume Story'}</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            if (storyModal.chapterIdx < activeStoryObj.chapters.length - 1) {
                              jumpStoryChapter(storyModal.chapterIdx + 1);
                            } else {
                              openStoryHandoff();
                            }
                          }}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white border border-white/15 transition-all cursor-pointer"
                        >
                          <span>
                            {storyModal.chapterIdx < activeStoryObj.chapters.length - 1
                              ? isAr
                                ? 'المشهد التالي'
                                : 'Next Chapter'
                              : isAr
                              ? 'استكشف المسارات التفاعلية'
                              : 'Explore Workflows'}
                          </span>
                          {isAr ? <ArrowLeft className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
                        </button>
                      </div>

                      {/* Contextual Hands-On Deep-Dive Box */}
                      {activeStoryChapter.deepDiveBranchId && (
                        <div className="rounded-2xl bg-gradient-to-r from-slate-900 to-[#16223d] border border-slate-700/90 p-3 flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-[10.5px] font-bold text-slate-400">
                              {isAr
                                ? 'هل ترغب بتجربة هذه الشاشة بنفسك الآن؟'
                                : 'Want to test this exact workflow hands-on?'}
                            </p>
                            <p className="text-xs font-extrabold text-white truncate">
                              {isAr
                                ? activeStoryChapter.deepDiveLabelAr
                                : activeStoryChapter.deepDiveLabelEn}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              openBranchById(
                                activeStoryChapter.deepDiveModuleId,
                                activeStoryChapter.deepDiveBranchId
                              )
                            }
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold bg-white text-slate-950 hover:bg-blue-50 transition-colors shrink-0 cursor-pointer"
                          >
                            <span>{isAr ? 'جرّب الآن' : 'Try Hands-On'}</span>
                            {isAr ? <ArrowLeft className="w-3 h-3" /> : <ArrowRight className="w-3 h-3" />}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Real System Screen Cinema Column (7 cols) */}
                  <div className="lg:col-span-7">
                    <div
                      dir="ltr"
                      onClick={toggleStoryPlayPause}
                      className="rounded-2xl bg-slate-900 p-1.5 border border-slate-700/90 shadow-2xl cursor-pointer select-none"
                      title={isAr ? 'اضغط للإيقاف المؤقت أو الاستكمال' : 'Click screen to pause or resume'}
                    >
                      {/* Authentic Browser Chrome */}
                      <div className="flex items-center justify-between px-3 py-1.5 bg-slate-900 text-slate-300 text-xs">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-rose-500/90" />
                          <span className="w-2.5 h-2.5 rounded-full bg-amber-400/90" />
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/90" />
                        </div>
                        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-slate-800 text-slate-300 text-[11px] font-mono border border-slate-700 max-w-md truncate">
                          <Lock className="w-3 h-3 text-emerald-400 shrink-0" />
                          <span className="truncate">{activeStoryChapter.url}</span>
                        </div>
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          Live Capture
                        </span>
                      </div>

                      {/* 1440:900 Screen Stage with Subtle Ken Burns Motion + Spotlight Highlight */}
                      <div
                        className="relative overflow-hidden rounded-xl bg-slate-950"
                        style={{ aspectRatio: '1440 / 900' }}
                      >
                        <img
                          ref={storyImgRef}
                          key={activeStoryChapter.image}
                          src={activeStoryChapter.image}
                          alt={activeStoryChapter.headlineEn}
                          onLoad={() => setStoryDecodedSrc(activeStoryChapter.image)}
                          style={{
                            transformOrigin: activeStoryChapter.focusOrigin || '50% 50%',
                            transform: storyPlaying ? 'scale(1.04)' : 'scale(1.0)',
                            transition: 'transform 16s ease-out, opacity 180ms ease-out',
                          }}
                          className={`w-full h-full object-contain block ${
                            storyDecodedSrc === activeStoryChapter.image ? 'opacity-100' : 'opacity-0'
                          }`}
                          draggable={false}
                        />

                        {/* Spotlight Proof Frame */}
                        {activeStoryChapter.spotlight &&
                          storyDecodedSrc === activeStoryChapter.image && (
                            <div
                              style={{
                                left: `${Math.max(0.5, activeStoryChapter.spotlight.xPct)}%`,
                                top: `${Math.max(0.5, activeStoryChapter.spotlight.yPct)}%`,
                                width: `${Math.min(98, activeStoryChapter.spotlight.wPct)}%`,
                                height: `${Math.min(98, activeStoryChapter.spotlight.hPct)}%`,
                              }}
                              className="absolute z-10 rounded-xl border-2 border-amber-400/90 bg-amber-400/[0.06] shadow-[0_0_28px_rgba(251,191,36,0.35)] pointer-events-none transition-all duration-300"
                            >
                              <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-300 opacity-85" />
                                <span className="relative inline-flex rounded-full h-4 w-4 bg-amber-400 border-2 border-slate-950" />
                              </span>
                            </div>
                          )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* ── END-OF-STORY "GO DEEPER" HANDOFF SCREEN (Reveals Workflows at End of Pitch!) ── */
                <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-500/15 text-emerald-300 border border-emerald-400/30 mb-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>
                          {isAr ? 'اكتمل الملخص التنفيذي · اختر خطوتك التالية' : 'Executive Story Complete · Choose Your Next Step'}
                        </span>
                      </span>
                      <h2 className="text-xl sm:text-2xl font-extrabold text-white leading-snug">
                        {isAr ? activeStoryObj.handoffTitleAr : activeStoryObj.handoffTitleEn}
                      </h2>
                      <p className="text-xs sm:text-sm text-slate-300 mt-0.5">
                        {isAr ? activeStoryObj.handoffSubtitleAr : activeStoryObj.handoffSubtitleEn}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => openStory(activeStoryObj.id, 0, true)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white border border-white/15 self-start sm:self-center shrink-0 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>{isAr ? 'إعادة القصة' : 'Replay Story'}</span>
                    </button>
                  </div>

                  {activeStoryObj.kind === 'platform' ? (
                    /* Platform Overview Handoff: 4 Module Cards (Watch Module Story OR Explore Workflows) */
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                      {PLATFORM_MODULES.map((m) => {
                        const MIcon = MODULE_ICONS[m.id] || Layers;
                        const mStyle = ACCENT_STYLES[m.accent] || ACCENT_STYLES.blue;
                        return (
                          <div
                            key={m.id}
                            className="rounded-2xl bg-slate-900/90 border border-slate-700/90 p-4 flex flex-col justify-between gap-3"
                          >
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-[10.5px] font-bold text-slate-400">
                                  {isAr ? m.badgeAr : m.badgeEn}
                                </span>
                                <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${mStyle.iconBg}`}>
                                  <MIcon className="w-3.5 h-3.5" />
                                </div>
                              </div>
                              <h3 className="text-sm font-extrabold text-white">
                                {isAr ? m.titleAr : m.titleEn}
                              </h3>
                              <p className="text-[11.5px] text-slate-400 mt-1 leading-relaxed">
                                {isAr ? m.subtitleAr : m.subtitleEn}
                              </p>
                            </div>

                            <div className="space-y-1.5 pt-2 border-t border-slate-800">
                              <button
                                type="button"
                                onClick={() => openStory(m.id, 0, true)}
                                className={`w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-extrabold cursor-pointer ${mStyle.liveBtn}`}
                              >
                                <Play className="w-3 h-3 fill-current" />
                                <span>{isAr ? 'قصة الوحدة (٧٥ ث)' : 'Watch 75s Story'}</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  closeStory();
                                  setExpandedModuleId(m.id);
                                  setTimeout(() => {
                                    workflowTrayRef.current?.scrollIntoView({
                                      behavior: 'smooth',
                                      block: 'nearest',
                                    });
                                  }, 80);
                                }}
                                className="w-full inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-xl text-[11.5px] font-bold bg-white/10 hover:bg-white/20 text-slate-200 cursor-pointer"
                              >
                                <span>
                                  {isAr
                                    ? `استكشف المسارات (${toArNum(m.branches.length)})`
                                    : `Explore ${m.branches.length} Workflows`}
                                </span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    /* Module Story Handoff: Reveal All Interactive Workflows of This Module! */
                    storyModuleObj && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        {storyModuleObj.branches.map((br) => (
                          <button
                            key={br.id}
                            type="button"
                            onMouseEnter={() => preloadBranchFirstShot(br.id)}
                            onClick={() => openBranch(br, storyModuleObj)}
                            className="text-start rounded-2xl bg-slate-900/90 hover:bg-slate-800/95 border border-slate-700/90 hover:border-blue-400/60 p-4 transition-all group flex flex-col justify-between gap-2.5 cursor-pointer"
                          >
                            <div>
                              <div className="flex items-center justify-between gap-2 mb-1.5">
                                <span className={`px-2 py-0.5 rounded-md text-[11px] font-extrabold ${stStyle.hoverPill}`}>
                                  {br.code}
                                </span>
                                <span className="text-[11px] font-medium text-slate-400">
                                  {isAr ? br.durationAr : br.durationEn}
                                </span>
                              </div>
                              <h3 className="text-sm sm:text-[15px] font-extrabold text-white group-hover:text-blue-300 transition-colors">
                                {isAr ? br.titleAr : br.titleEn}
                              </h3>
                              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                                {isAr ? br.descAr : br.descEn}
                              </p>
                            </div>

                            <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs font-extrabold text-blue-400">
                              <span>
                                {isAr ? 'ابدأ التجربة التفاعلية خطوة بخطوة' : 'Launch Interactive Step-by-Step Tour'}
                              </span>
                              {isAr ? <ArrowLeft className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
                            </div>
                          </button>
                        ))}
                      </div>
                    )
                  )}

                  {/* Bottom Conversion & Next-Module Bar */}
                  <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      {storyModuleObj && (
                        <button
                          type="button"
                          onClick={() => {
                            const modId = storyModuleObj.id;
                            closeStory();
                            setExpandedModuleId(modId);
                            setTimeout(() => {
                              workflowTrayRef.current?.scrollIntoView({
                                behavior: 'smooth',
                                block: 'nearest',
                              });
                            }, 80);
                          }}
                          className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-slate-200 cursor-pointer"
                        >
                          {isAr ? 'عرض المسارات في الصفحة الرئيسية' : 'Show Workflows on Page'}
                        </button>
                      )}
                      {storyModuleObj && nextModuleObj && (
                        <button
                          type="button"
                          onClick={() => openStory(nextModuleObj.id, 0, true)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-extrabold bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer"
                        >
                          <Play className="w-3 h-3 fill-current" />
                          <span>
                            {isAr
                              ? `القصة التالية: ${nextModuleObj.titleAr}`
                              : `Next Story: ${nextModuleObj.titleEn}`}
                          </span>
                        </button>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (storyModuleObj?.id) {
                            setExpandedModuleId(storyModuleObj.id);
                          }
                          closeStory();
                          handleExpertOpenChange(true);
                        }}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-extrabold bg-emerald-500/20 hover:bg-emerald-500/35 text-emerald-200 border border-emerald-400/35 transition-colors cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                        <span>{isAr ? 'اسأل الذكي عن سيناريو خاص' : 'Ask Grow AI a Question'}</span>
                      </button>
                      <Link
                        to="/#book-meeting"
                        onClick={closeStory}
                        className="px-3.5 py-2 rounded-xl text-xs font-extrabold bg-white/10 hover:bg-white/20 text-white border border-white/15 transition-colors"
                      >
                        {isAr ? 'احجز اجتماعاً مع خبير' : 'Book a Meeting'}
                      </Link>
                      <Link
                        to="/free-trial-register"
                        onClick={closeStory}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-extrabold bg-blue-600 hover:bg-blue-500 text-white transition-colors"
                      >
                        <span>{isAr ? 'ابدأ تجربة مجانية' : 'Start Free Trial'}</span>
                        {isAr ? <ArrowLeft className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
                      </Link>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })()}

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
              {isAr ? (
                <span>
                  <Clock className="w-3.5 h-3.5 inline me-1" />
                  جاري تجهيز الشاشات التفاعلية لهذا المسار قريباً.
                </span>
              ) : (
                <span>
                  <Clock className="w-3.5 h-3.5 inline me-1" />
                  Interactive screens for this workflow are coming soon.
                </span>
              )}
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
                  openStory(modId, 0, true);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Play className="w-3 h-3 fill-current" />
                <span>{isAr ? 'شاهد القصة التنفيذية للوحدة' : 'Watch Module Story'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════ PLATFORM GOVERNANCE & SECURITY FOUNDATION MODAL ═══════ */}
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
              className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-gradient-to-r from-[#162038] via-[#1e2a4a] to-[#0f172a] text-white px-5 sm:px-6 py-3.5 shrink-0">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center font-extrabold text-xs">
                      G
                    </div>
                    <span className="text-xs sm:text-sm font-extrabold text-white">
                      {isAr
                        ? 'أساسيات الحوكمة والأمان وإدارة المجموعات'
                        : 'Enterprise Governance & Security Foundation'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
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
                            const target = resolveFoundationTarget(briefModal.id);
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
                            const target = resolveFoundationTarget(briefModal.id);
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

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 items-stretch">
                  {PLATFORM_FOUNDATION_PILLARS.map((p) => {
                    const active = p.id === activeBriefData.pillar?.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => openFoundationBrief(p.id, isBriefVoiceActive)}
                        className={`px-3 py-2 rounded-xl text-xs font-bold border text-start whitespace-normal leading-snug h-full flex items-center justify-between gap-1.5 transition-all cursor-pointer ${
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

              {/* Voice Reader Strip */}
              <div className="px-5 sm:px-6 py-2 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-2 border-t border-slate-800 shrink-0">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={toggleBriefVoice}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
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
                            ? 'استمع للشرح الصوتي'
                            : 'Listen to Foundation Brief'}
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
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const next = !briefAutoAdvance;
                      briefAutoAdvanceRef.current = next;
                      setBriefAutoAdvance(next);
                      if (!next) clearBriefAutoTimer();
                    }}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all ${
                      briefAutoAdvance
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40'
                        : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/15'
                    }`}
                  >
                    <Play className="w-3 h-3 fill-current" />
                    <span>{isAr ? 'انتقال تلقائي' : 'Auto-Advance'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={cycleSpeechRate}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold bg-white/10 hover:bg-white/20 text-slate-200"
                  >
                    {speechRate}x
                  </button>
                </div>
              </div>

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

                <div className="pt-0.5 space-y-1.5">
                  <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                    {isAr ? 'الضوابط والنتائج المباشرة' : 'Key Governance & Security Guarantees'}
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

              <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 shrink-0">
                <button
                  type="button"
                  onClick={closeBrief}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200/70 transition-colors"
                >
                  {isAr ? 'العودة للوحدات' : 'Back to Modules'}
                </button>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const idx = PLATFORM_FOUNDATION_PILLARS.findIndex(
                        (p) => p.id === activeBriefData.pillar?.id
                      );
                      const nextPillar =
                        PLATFORM_FOUNDATION_PILLARS[(idx + 1) % PLATFORM_FOUNDATION_PILLARS.length];
                      openFoundationBrief(nextPillar.id, isBriefVoiceActive);
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 transition-all"
                  >
                    <span>{isAr ? 'الركيزة التالية' : 'Next Pillar'}</span>
                    {isAr ? <ArrowLeft className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => openStory('platform_intro', 0, true)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-extrabold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-all"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    <span>{isAr ? 'شاهد عرض المنصة (٦٥ ث)' : 'Watch 65s Platform Overview'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
