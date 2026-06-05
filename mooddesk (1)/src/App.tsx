import { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, Brain, CheckCircle, Activity, ShieldAlert, History, Award, BookOpen, 
  Clock, Flame, Smile, CloudRain, ShieldCheck, Moon, RefreshCw, Plus, Trash2, 
  Calendar, Target, Play, Pause, RotateCcw, Wind, Music, Check, Settings, Send, ChevronRight
} from 'lucide-react';
import { MoodState, MoodAnalysis, WorkflowMode, Task, MoodLog, StreakData } from './types';
import { analyzeMoodLocally, DEFAULT_CURATED_TASKS } from './moodEngine';

const MOOD_THEMES = {
  Happy: {
    bg: 'from-amber-100/50 via-slate-50 to-slate-100/80',
    border: 'border-slate-200 hover:border-amber-300/60 shadow-xs',
    text: 'text-amber-600',
    glow: 'bg-amber-400/15',
    bgBadge: 'border-amber-100 bg-amber-50 text-amber-700',
    accent: 'from-amber-400 to-orange-500',
    solidResult: 'bg-gradient-to-br from-amber-500 via-orange-500 to-amber-600 text-white shadow-xl shadow-amber-200/60',
    primary: 'amber',
    emoji: '☀️',
    soundtrack: 'Upbeat Acoustic Lo-fi & Sunshine Beats',
    quote: 'Keep your face to the sunshine and you cannot see a shadow.'
  },
  Sad: {
    bg: 'from-blue-100/50 via-slate-50 to-slate-100/80',
    border: 'border-slate-200 hover:border-blue-300/60 shadow-xs',
    text: 'text-blue-600',
    glow: 'bg-blue-500/15',
    bgBadge: 'border-blue-150 bg-blue-50 text-blue-800',
    accent: 'from-blue-500 to-indigo-650',
    solidResult: 'bg-gradient-to-br from-blue-500 via-indigo-500 to-blue-600 text-white shadow-xl shadow-blue-200/60',
    primary: 'blue',
    emoji: '🌊',
    soundtrack: 'Calm Piano Melodies & Distant Rain Whispers',
    quote: 'The deeper that sorrow carves into your being, the more joy you can contain.'
  },
  Stressed: {
    bg: 'from-rose-100/40 via-slate-50 to-slate-100/80',
    border: 'border-slate-200 hover:border-rose-300/60 shadow-xs',
    text: 'text-rose-600',
    glow: 'bg-rose-500/15',
    bgBadge: 'border-rose-150 bg-rose-50 text-rose-800',
    accent: 'from-rose-500 to-pink-600',
    solidResult: 'bg-gradient-to-br from-rose-500 via-pink-500 to-rose-600 text-white shadow-xl shadow-rose-200/60',
    primary: 'rose',
    emoji: '🧘',
    soundtrack: 'Infinite Brown Noise & 432Hz Calm Waves',
    quote: 'You do not have to control your thoughts. You just have to stop letting them control you.'
  },
  Neutral: {
    bg: 'from-slate-200/30 via-slate-50 to-slate-100/80',
    border: 'border-slate-200 hover:border-slate-350 shadow-xs',
    text: 'text-slate-600',
    glow: 'bg-slate-400/10',
    bgBadge: 'border-slate-250 bg-slate-100 text-slate-700',
    accent: 'from-slate-600 to-zinc-700',
    solidResult: 'bg-gradient-to-br from-slate-705 via-slate-800 to-slate-900 text-white shadow-xl shadow-slate-200/60',
    primary: 'zinc',
    emoji: '☕',
    soundtrack: 'Minimal Coffeehouse Jazz & Mechanical Keys',
    quote: 'Simplicity is the ultimate sophistication. Find balance in the ordinary.'
  },
  Motivated: {
    bg: 'from-emerald-100/50 via-slate-50 to-slate-100/80',
    border: 'border-slate-200 hover:border-emerald-300/60 shadow-xs',
    text: 'text-emerald-600',
    glow: 'bg-emerald-500/15',
    bgBadge: 'border-emerald-150 bg-emerald-50 text-emerald-800',
    accent: 'from-emerald-500 to-teal-600',
    solidResult: 'bg-gradient-to-br from-emerald-505 via-teal-500 to-emerald-600 text-white shadow-xl shadow-emerald-250/60',
    primary: 'emerald',
    emoji: '⚡',
    soundtrack: 'Synthwave High-Octane Coding Beats',
    quote: 'Action is the foundational key to all success. Do it now.'
  }
};

const DUMMY_JOURNAL_PROMPTS = [
  "Overwhelmed with a critical project deadline. Too many browser tabs, feeling restless...",
  "Extremely motivated! Woke up early, got coffee, ready to focus on my main coding goals today.",
  "Woke up feeling down. Gloomy weather, lonely atmosphere, a bit sad about recent updates.",
  "Nice day, having a regular morning routine. Calm and balanced, normal workflow ahead."
];

export default function App() {
  const [journalInput, setJournalInput] = useState('');
  const [useAI, setUseAI] = useState(false);
  const [hasGeminiKey, setHasGeminiKey] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  // Current State
  const [currentAnalysis, setCurrentAnalysis] = useState<MoodAnalysis>({
    mood: 'Neutral',
    confidence: 85,
    scores: { Happy: 0, Sad: 0, Stressed: 0, Neutral: 1, Motivated: 0 },
    wordMatches: [],
    explanation: 'Write details of your day above to adapt the desk settings, widgets, and workflow themes.'
  });
  
  const [activeMode, setActiveMode] = useState<WorkflowMode>('Planning');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [customTaskText, setCustomTaskText] = useState('');
  const [history, setHistory] = useState<MoodLog[]>([]);
  const [streak, setStreak] = useState<StreakData>({ currentStreak: 1, bestStreak: 1, lastLoggedDate: null });
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Breathing Box States
  const [breathPhase, setBreathPhase] = useState<'In' | 'Hold' | 'Out'>('In');
  const [breathTimer, setBreathTimer] = useState(4);

  // Pomodoro States
  const [pomodoroTime, setPomodoroTime] = useState(1500); // 25 mins
  const [pomodoroIsActive, setPomodoroIsActive] = useState(false);
  const pomodoroIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize data on mount
  useEffect(() => {
    // Check backend connection and Gemini key metadata
    fetch('/api/config')
      .then(res => res.json())
      .then((data: { hasGeminiKey: boolean }) => {
        setHasGeminiKey(data.hasGeminiKey);
        if (data.hasGeminiKey) {
          setUseAI(true); // Default to AI if key represents a valid configuration
        }
      })
      .catch((err) => {
        console.warn('Config endpoint not reached, running offline mode:', err);
      });

    // Load Local Storage
    const savedLogs = localStorage.getItem('mooddesk_history_logs');
    if (savedLogs) {
      try {
        setHistory(JSON.parse(savedLogs));
      } catch (e) { console.error(e); }
    }

    const savedTasks = localStorage.getItem('mooddesk_tasks');
    if (savedTasks) {
      try {
        setTasks(JSON.parse(savedTasks));
      } catch (e) { console.error(e); }
    } else {
      // Auto populate with initial Neutral tasks
      populateDefaultTasks('Neutral');
    }

    const savedStreak = localStorage.getItem('mooddesk_streak_record');
    if (savedStreak) {
      try {
        setStreak(JSON.parse(savedStreak));
      } catch (e) { console.error(e); }
    }
  }, []);

  // Sync tasks on modification
  const saveTasks = (updatedTasks: Task[]) => {
    setTasks(updatedTasks);
    localStorage.setItem('mooddesk_tasks', JSON.stringify(updatedTasks));
  };

  // Helper: auto-populates system tasks for the registered mood
  const populateDefaultTasks = (mood: MoodState, keepCustom = true) => {
    const curated = DEFAULT_CURATED_TASKS[mood] || DEFAULT_CURATED_TASKS['Neutral'];
    const systemTasks: Task[] = curated.map((txt, index) => ({
      id: `sys-${mood}-${index}`,
      text: txt,
      type: 'system',
      completed: false,
      moodCategory: mood,
      createdAt: new Date().toISOString()
    }));

    if (keepCustom) {
      const existingCustom = tasks.filter(t => t.type === 'custom');
      saveTasks([...systemTasks, ...existingCustom]);
    } else {
      saveTasks(systemTasks);
    }
  };

  // Breath controller cycle
  useEffect(() => {
    if (activeMode !== 'Recovery') return;
    const interval = setInterval(() => {
      setBreathTimer((prev) => {
        if (prev <= 1) {
          // transition phase
          setBreathPhase((current) => {
            if (current === 'In') return 'Hold';
            if (current === 'Hold') return 'Out';
            return 'In';
          });
          return 4; // Reset to 4s
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [activeMode, breathPhase]);

  // Pomodoro controller cycle
  useEffect(() => {
    if (pomodoroIsActive) {
      pomodoroIntervalRef.current = setInterval(() => {
        setPomodoroTime((prev) => {
          if (prev <= 1) {
            setPomodoroIsActive(false);
            if (pomodoroIntervalRef.current) clearInterval(pomodoroIntervalRef.current);
            // Flash notification or audio sound
            try {
              const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2568/2568-84.wav');
              audio.volume = 0.3;
              audio.play();
            } catch (e) {}
            setToastMessage("🎯 Focus session completed! Stretch out, take a deep breath, and check off your tasks.");
            setShowToast(true);
            return 1500;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (pomodoroIntervalRef.current) {
        clearInterval(pomodoroIntervalRef.current);
      }
    }
    return () => {
      if (pomodoroIntervalRef.current) clearInterval(pomodoroIntervalRef.current);
    };
  }, [pomodoroIsActive]);

  const handlePomodoroReset = () => {
    setPomodoroIsActive(false);
    setPomodoroTime(1500);
  };

  const currentTheme = MOOD_THEMES[currentAnalysis.mood] || MOOD_THEMES['Neutral'];

  // Trigger main mood analysis
  const triggerAnalysis = async (textToAnalyze: string) => {
    const textBuffer = textToAnalyze.trim();
    if (!textBuffer) return;

    setAnalyzing(true);
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: textBuffer, useAI })
      });

      if (!response.ok) {
        throw new Error('Analysis failed');
      }

      const results = await response.json();
      setCurrentAnalysis(results);

      // Map workflow modes automatically based on mood:
      // Motivated -> Focus
      // Sad, Stressed -> Recovery
      // Happy, Neutral -> Planning
      let autoMode: WorkflowMode = 'Planning';
      if (results.mood === 'Motivated') autoMode = 'Focus';
      else if (results.mood === 'Sad' || results.mood === 'Stressed') autoMode = 'Recovery';
      else autoMode = 'Planning';
      setActiveMode(autoMode);

      // Populate tasks
      populateDefaultTasks(results.mood, true);

      // Update history logs
      const newLog: MoodLog = {
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString(),
        text: textBuffer,
        mood: results.mood,
        confidence: results.confidence,
        mode: autoMode
      };
      
      const updatedHistory = [newLog, ...history];
      setHistory(updatedHistory);
      localStorage.setItem('mooddesk_history_logs', JSON.stringify(updatedHistory));

      // Calculate streak updating
      updateStreak();

    } catch (err) {
      console.error(err);
      // Fallback local classification on fetch errors
      const localResult = analyzeMoodLocally(textBuffer);
      setCurrentAnalysis(localResult);
      populateDefaultTasks(localResult.mood, true);
    } finally {
      setAnalyzing(false);
    }
  };

  // Streak calibration rules
  const updateStreak = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    if (streak.lastLoggedDate === todayStr) return; // already counted today

    let newCurrent = streak.currentStreak;
    if (streak.lastLoggedDate) {
      const lastDate = new Date(streak.lastLoggedDate);
      const today = new Date(todayStr);
      const diffTime = Math.abs(today.getTime() - lastDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        newCurrent += 1;
      } else if (diffDays > 1) {
        newCurrent = 1; // broken gap, reset
      }
    } else {
      newCurrent = 1; // first log
    }

    const newBest = Math.max(newCurrent, streak.bestStreak);
    const updatedStreak: StreakData = {
      currentStreak: newCurrent,
      bestStreak: newBest,
      lastLoggedDate: todayStr
    };
    setStreak(updatedStreak);
    localStorage.setItem('mooddesk_streak_record', JSON.stringify(updatedStreak));
  };

  // Manual tasks manipulation
  const toggleTaskStatus = (id: string) => {
    const nextTasks = tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t);
    saveTasks(nextTasks);
  };

  const deleteCustomTask = (id: string) => {
    const nextTasks = tasks.filter(t => t.id !== id);
    saveTasks(nextTasks);
  };

  const handleAddCustomTask = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanText = customTaskText.trim();
    if (!cleanText) return;

    const newTask: Task = {
      id: `custom-${Date.now()}`,
      text: cleanText,
      type: 'custom',
      completed: false,
      moodCategory: currentAnalysis.mood,
      createdAt: new Date().toISOString()
    };

    saveTasks([newTask, ...tasks]);
    setCustomTaskText('');
  };

  const clearJournalHistory = () => {
    if (window.confirm("Are you sure you want to clear your local workspace logs?")) {
      setHistory([]);
      localStorage.removeItem('mooddesk_history_logs');
      setStreak({ currentStreak: 1, bestStreak: 1, lastLoggedDate: null });
      localStorage.removeItem('mooddesk_streak_record');
    }
  };

  const timeFormatted = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`mood-transition min-h-screen bg-slate-50 relative overflow-hidden pb-16 text-slate-800`}>
      {/* Toast Notification Alert - Styled in premium bento banner */}
      {showToast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 max-w-md w-full px-4 animate-bounce" id="alert_toast">
          <div className="bg-white border-2 border-emerald-500 text-slate-800 rounded-2xl p-4 shadow-xl flex items-center justify-between gap-4 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <Check className="w-4 h-4 stroke-[3]" />
              </div>
              <span className="text-xs font-semibold text-slate-800">{toastMessage}</span>
            </div>
            <button
              onClick={() => setShowToast(false)}
              className="text-slate-400 hover:text-slate-600 text-xs font-mono font-bold cursor-pointer shrink-0"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Background ambient light element */}
      <div className={`mood-transition absolute top-10 right-10 w-96 h-96 rounded-full ${currentTheme.glow} blur-3xl -z-10 animate-ambient-glow`} />
      <div className={`mood-transition absolute -left-10 bottom-10 w-96 h-96 rounded-full bg-violet-500/5 blur-3xl -z-10 animate-ambient-glow`} style={{ animationDelay: '4s' }} />

      {/* Main Header styled as Bento Navbar */}
      <header className="border-b border-slate-200 bg-white/70 backdrop-blur-md sticky top-0 z-30" id="main_header">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Logo Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center text-white shadow-lg shadow-emerald-200">
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-800">
                MoodDesk <span className="font-light text-slate-400 text-sm">v2.4.0</span>
              </h1>
              <p className="text-xs text-slate-400 font-mono tracking-wider uppercase">WORKSPACE MATRIX ENGINE</p>
            </div>
          </div>

          {/* Quick Stats Header */}
          <div className="flex flex-wrap items-center gap-4">
            {/* Active System Mode */}
            <div className={`px-3 py-1.5 rounded-full text-xs font-semibold border flex items-center gap-1.5 ${currentTheme.bgBadge}`}>
              <Activity className="w-3.5 h-3.5 animate-pulse" />
              <span>Configured: {currentAnalysis.mood}</span>
            </div>

            {/* AI Network Indicator */}
            {hasGeminiKey ? (
              <div className="px-3 py-1.5 rounded-full text-xs font-semibold border border-emerald-100 bg-emerald-50/65 text-emerald-700 flex items-center gap-1.5" title="Server-side Gemini 3.5 API connections are online">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>AI Core Live</span>
              </div>
            ) : (
              <div className="px-3 py-1.5 rounded-full text-xs font-semibold border border-amber-100 bg-amber-50/65 text-amber-700 flex items-center gap-1.5" title="Operating via local offline sentiment matching rules. Add GEMINI_API_KEY to unlock EQ coaching.">
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Local NLP</span>
              </div>
            )}

            {/* Streak Counter styled with emerald pill badge */}
            <div className="bg-emerald-50 border border-emerald-100 rounded-full px-4 py-1.5 flex items-center gap-1.5 text-emerald-850 text-xs font-bold">
              <Flame className="w-4 h-4 text-emerald-500 fill-emerald-500 animate-pulse" />
              <span>{streak.currentStreak} Day Streak</span>
              <span className="text-emerald-500/80 ml-1 text-[10px] font-normal">Best: {streak.bestStreak}d</span>
            </div>
          </div>

        </div>
      </header>

      {/* Main Workspace Frame Container in Bento Layout */}
      <main className="max-w-7xl mx-auto px-6 sm:px-8 mt-8 grid grid-cols-1 lg:grid-cols-12 gap-6" id="dashboard_grid">
        
        {/* LEFT COLUMN: Input Vibe & Reflective Space (col-span-5) */}
        <div className="lg:col-span-5 space-y-6 flex flex-col">
          
          {/* Card: Diary / Sentiment Journal Box */}
          <div className="bg-white border border-slate-200 shadow-sm rounded-[32px] p-8 relative overflow-hidden flex flex-col" id="journal_card">
            
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-slate-600" />
                <h2 className="text-xl font-bold text-slate-800">Mental Check-in</h2>
              </div>
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">Journal Input</span>
            </div>

            <p className="text-sm text-slate-500 mb-4 leading-relaxed">
              How is your workspace feeling today? Describe your thoughts, stresses, successes, or simply select a preset state below.
            </p>

            <textarea
              className="w-full h-40 bg-slate-50 border border-slate-200/80 focus:border-slate-350 focus:ring-4 focus:ring-slate-500/5 rounded-2xl p-4 text-base text-slate-700 placeholder-slate-300 focus:outline-none resize-none transition-all"
              placeholder="I feel highly energized and ready to tackle the new product feature. My coffee is hitting just right..."
              value={journalInput}
              onChange={(e) => setJournalInput(e.target.value)}
              id="mood_textarea"
            />

            {/* Presets and Controls */}
            <div className="mt-6 space-y-5">
              
              {/* Preset quick buttons */}
              <div>
                <span className="text-[10px] uppercase tracking-wider font-mono text-slate-400 block mb-2">Preset ideas</span>
                <div className="flex flex-wrap gap-2">
                  {DUMMY_JOURNAL_PROMPTS.map((prompt, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setJournalInput(prompt)}
                      className="text-xs bg-slate-50 hover:bg-slate-100/80 text-secondary border border-slate-200/60 px-3 py-2 rounded-xl text-left truncate max-w-full transition-all cursor-pointer"
                    >
                      {prompt.substring(0, 36)}...
                    </button>
                  ))}
                </div>
              </div>

              {/* Engine Toggle Settings */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-700">Advanced EQ Coaching AI</span>
                  {!hasGeminiKey && (
                    <span className="text-[9px] bg-slate-100 text-slate-400 px-2 py-0.5 rounded-full">Local Sentiment Mode</span>
                  )}
                </div>
                
                <button
                  type="button"
                  disabled={!hasGeminiKey}
                  onClick={() => setUseAI(!useAI)}
                  className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    useAI ? 'bg-emerald-500' : 'bg-slate-200'
                  } ${!hasGeminiKey ? 'opacity-40 cursor-not-allowed' : ''}`}
                  title={hasGeminiKey ? "Incorporate server-side Gemini 3.5 analyzer" : "GEMINI_API_KEY is required in server environment"}
                  id="ai_toggle"
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                      useAI ? 'translate-x-[18px]' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Analyzer submit */}
              <div className="flex justify-between items-center pt-2">
                <span className="text-[11px] font-mono text-slate-400">Last analysis: Just now</span>
                <button
                  type="button"
                  onClick={() => triggerAnalysis(journalInput)}
                  disabled={analyzing || !journalInput.trim()}
                  className={`px-8 py-3 rounded-xl text-base font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg ${
                    journalInput.trim()
                      ? 'bg-slate-900 text-white shadow-slate-200 hover:bg-slate-800 hover:scale-[1.02]'
                      : 'bg-slate-100 text-slate-350 cursor-not-allowed shadow-none'
                  }`}
                  id="analyze_button"
                >
                  {analyzing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Analyzing vibe...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Analyze Mood</span>
                    </>
                  )}
                </button>
              </div>

            </div>
          </div>
          {/* Card: Mood Log History (LocalStorage based) */}
          <div className="bg-white border border-slate-200 shadow-sm rounded-[32px] p-8 flex-1" id="history_card">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-slate-500" />
                <h3 className="text-base font-bold text-slate-800">History Archives</h3>
              </div>
              {history.length > 0 && (
                <button
                  type="button"
                  onClick={clearJournalHistory}
                  className="text-xs text-red-500 hover:text-red-700 font-medium flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear Logs</span>
                </button>
              )}
            </div>

            {history.length === 0 ? (
              <div className="h-44 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center p-6 text-center">
                <BookOpen className="w-8 h-8 text-slate-350 mb-2" />
                <p className="text-xs text-slate-400">Your historical workspace mood records appear here once you log your first entry.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                {history.map((log) => {
                  const logTheme = MOOD_THEMES[log.mood] || MOOD_THEMES['Neutral'];
                  return (
                    <div key={log.id} className="p-3 bg-slate-50 border border-slate-150 rounded-xl hover:border-slate-200 transition-colors">
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-base">{logTheme.emoji}</span>
                          <span className="text-xs font-bold text-slate-700">{log.mood}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {new Date(log.timestamp).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 italic line-clamp-2">&ldquo;{log.text}&rdquo;</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

        {/* RIGHT COLUMN: Adapting Deck Theme, Calibration Statistics & Curated widgets (col-span-12 on mobile, col-span-7 on desktop) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Card: Current Mood Diagnostics Board - Styled in full solid-filled high-contrast Bento aesthetic */}
          <div className={`mood-transition ${currentTheme.solidResult} rounded-[32px] p-8 relative overflow-hidden`} id="diagnostics_card">
            
            <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
              <div>
                <span className="text-[10px] uppercase tracking-widest font-mono text-white/70 block mb-1">Atmosphere Diagnostics</span>
                <div className="flex items-center gap-3">
                  <span className="text-4xl">{currentTheme.emoji}</span>
                  <div>
                    <h3 className="text-3xl font-black tracking-tight">{currentAnalysis.mood} Workspace</h3>
                    <p className="text-xs text-white/80 font-mono mt-0.5">Statistical confidence: {currentAnalysis.confidence}%</p>
                  </div>
                </div>
              </div>

              {/* Highlight Circle for current mood confidence */}
              <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md rounded-2xl px-4 py-2 border border-white/20">
                <div className="relative w-9 h-9">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle cx="18" cy="18" r="14" fill="transparent" stroke="rgba(255, 255, 255, 0.25)" strokeWidth="3" />
                    <circle cx="18" cy="18" r="14" fill="transparent" 
                      stroke="#ffffff" 
                      strokeWidth="3" 
                      strokeDasharray={2 * Math.PI * 14}
                      strokeDashoffset={(1 - (currentAnalysis.confidence / 100)) * (2 * Math.PI * 14)}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center text-[10px] font-black font-mono text-white">
                    {currentAnalysis.confidence}%
                  </div>
                </div>
                <div>
                  <span className="text-[9px] text-white/70 font-mono block uppercase tracking-wider">Analysis Engine</span>
                  <span className="text-xs text-white font-bold">{useAI ? 'Gemini AI Model' : 'Local NLP Module'}</span>
                </div>
              </div>
            </div>

            {/* EQ Coaching Note Box */}
            <div className="bg-white/10 backdrop-blur-xs rounded-2xl p-5 mb-6 relative overflow-hidden border border-white/10">
              <div className="flex gap-2">
                <Sparkles className="w-5 h-5 shrink-0 mt-0.5 text-white" />
                <p className="text-sm text-white/95 leading-relaxed italic font-serif">
                  &ldquo;{currentAnalysis.explanation}&rdquo;
                </p>
              </div>
              <div className="mt-3 text-[11px] text-white/75 pl-7 border-t border-white/10 pt-2 flex items-center gap-1.5">
                <Music className="w-3.5 h-3.5" />
                <span>Ambient Soundtrack suggestion: <strong className="text-white font-bold">{currentTheme.soundtrack}</strong></span>
              </div>
            </div>

            {/* Mood Scores spectrum breakdown */}
            <div className="space-y-3">
              <span className="text-[10px] uppercase tracking-wider font-mono text-white/70 block">Affinity Spectrum Mapping</span>
              
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                {Object.entries(currentAnalysis.scores).map(([moodKey, score]) => {
                  const isCurrent = moodKey === currentAnalysis.mood;
                  const scoreLabel = typeof score === 'number' ? score.toFixed(1) : score;
                  const themeConfig = MOOD_THEMES[moodKey as MoodState] || MOOD_THEMES['Neutral'];
                  
                  return (
                    <div 
                      key={moodKey} 
                      className={`p-2.5 rounded-2xl border text-center transition-all ${
                        isCurrent 
                          ? 'bg-white text-slate-800 border-white shadow-md' 
                          : 'bg-white/10 border-white/10 hover:border-white/20 text-white'
                      }`}
                    >
                      <span className="text-base block mb-0.5">{themeConfig.emoji}</span>
                      <span className="text-[11px] font-bold block truncate">{moodKey}</span>
                      <span className={`text-[10px] font-mono font-bold mt-1 block ${isCurrent ? 'text-slate-500' : 'text-white/70'}`}>
                        {scoreLabel}%
                      </span>
                    </div>
                  );
                })}
              </div>

            </div>

          </div>

          {/* Card: Workflow Mode Panel (Pomodoro, Breathing, Checklist) */}
          <div className="bg-white border border-slate-200 shadow-sm rounded-[32px] overflow-hidden" id="workflow_container">
            
            {/* Mode selection tabs */}
            <div className="flex border-b border-slate-150">
              {(['Focus', 'Recovery', 'Planning'] as WorkflowMode[]).map((tab) => {
                const isSelected = activeMode === tab;
                let tabIcon = <Clock className="w-4 h-4" />;
                if (tab === 'Recovery') tabIcon = <Wind className="w-4 h-4" />;
                if (tab === 'Planning') tabIcon = <Target className="w-4 h-4" />;

                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveMode(tab)}
                    className={`flex-1 py-4 text-xs font-bold flex items-center justify-center gap-2 border-b-2 transition-all cursor-pointer ${
                      isSelected 
                        ? 'border-slate-900 bg-slate-50 text-slate-900' 
                        : 'border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-50/50'
                    }`}
                  >
                    {tabIcon}
                    <span>{tab} Mode</span>
                  </button>
                );
              })}
            </div>

            {/* Tab contents */}
            <div className="p-8">
              
              {/* Focus Mode - Pomodoro Timer */}
              {activeMode === 'Focus' && (
                <div className="text-center space-y-4" id="pomodoro_widget">
                  <div className="flex items-center justify-center gap-1.5">
                    <Award className="w-4 h-4 text-slate-700" />
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Pomodoro Matrix</span>
                  </div>
                  
                  <div className="relative inline-flex items-center justify-center my-2">
                    {/* SVG progress display */}
                    <svg className="w-40 h-40 transform -rotate-90">
                      <circle cx="80" cy="80" r="72" fill="transparent" stroke="#f1f5f9" strokeWidth="6" />
                      <circle cx="80" cy="80" r="72" fill="transparent" 
                        stroke="#0f172a" 
                        strokeWidth="6" 
                        strokeDasharray={2 * Math.PI * 72}
                        strokeDashoffset={(1 - (pomodoroTime / 1500)) * (2 * Math.PI * 72)}
                        className="transition-all duration-1000"
                      />
                    </svg>
                    <div className="absolute text-3xl font-black text-slate-800 font-mono tracking-tight">
                      {timeFormatted(pomodoroTime)}
                    </div>
                  </div>

                  <p className="text-sm text-slate-500 max-w-sm mx-auto leading-relaxed">
                    Set notifications away. Commit fully for the next 25-minute deep work shift.
                  </p>

                  <div className="flex items-center justify-center gap-3 mt-2">
                    <button
                      type="button"
                      onClick={() => setPomodoroIsActive(!pomodoroIsActive)}
                      className={`px-6 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                        pomodoroIsActive 
                          ? 'bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800' 
                          : 'bg-slate-900 hover:bg-slate-800 text-white shadow-lg'
                      }`}
                    >
                      {pomodoroIsActive ? (
                        <>
                          <Pause className="w-3.5 h-3.5" />
                          <span>Pause Session</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5" />
                          <span>Start Focus Shift</span>
                        </>
                      )}
                    </button>
                    
                    <button
                      type="button"
                      onClick={handlePomodoroReset}
                      className="px-4 py-2.5 border border-slate-200 bg-white hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-600 transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Reset</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Recovery Mode - Breathing guide bubbles */}
              {activeMode === 'Recovery' && (
                <div className="text-center space-y-4" id="breathing_widget">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono block">Diaphragmatic Breather</span>
                  
                  <div className="py-6 flex items-center justify-center">
                    <div className={`mood-transition w-32 h-32 rounded-full bg-slate-50 border-2 border-slate-200 flex flex-col items-center justify-center shadow-xs ${
                      breathPhase === 'In' ? 'scale-115 border-emerald-300 bg-emerald-50/50' : ''
                    } ${
                      breathPhase === 'Hold' ? 'border-amber-200 bg-amber-50/40' : ''
                    } ${
                      breathPhase === 'Out' ? 'scale-90 border-teal-200 bg-teal-50/30' : ''
                    }`} style={{ transitionDuration: '4000ms' }}>
                      <Wind className="w-7 h-7 text-slate-550 animate-pulse mb-1" />
                      <span className="text-[10px] tracking-wider font-mono text-slate-400">Pace: {breathTimer}s</span>
                    </div>
                  </div>

                  <div className="max-w-sm mx-auto">
                    <h4 className="text-lg font-bold text-slate-800 tracking-tight">
                      {breathPhase === 'In' && 'Breathe In... fill your lungs'}
                      {breathPhase === 'Hold' && 'Hold... suspend thoughts'}
                      {breathPhase === 'Out' && 'Exhale... let go of tension'}
                    </h4>
                    <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                      Follow standard rhythmic pacing to balance and restore your energy levels.
                    </p>
                  </div>
                </div>
              )}

              {/* Planning Mode - Tasks organizer planner */}
              {activeMode === 'Planning' && (
                <div id="planner_widget">
                  <div className="flex items-center justify-between gap-4 mb-4">
                    <div>
                      <h4 className="text-sm font-bold text-slate-800">Routine Workspace Checklist</h4>
                      <p className="text-xs text-slate-400">Draft micro-steps to gain mental velocity.</p>
                    </div>
                    <span className="text-xs font-mono bg-slate-50 border border-slate-200 rounded px-2.5 py-1 text-slate-500">
                      Done: {tasks.filter(t => t.completed).length}/{tasks.length}
                    </span>
                  </div>

                  {/* Tasks lists */}
                  {tasks.length === 0 ? (
                    <div className="text-center p-6 border border-dashed border-slate-200 rounded-2xl">
                      <p className="text-xs text-slate-400">No tasks currently recorded. Put together a target below.</p>
                    </div>
                  ) : (
                    <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                      {tasks.map((task) => (
                        <div 
                          key={task.id} 
                          className={`flex items-center justify-between gap-3 p-3 rounded-xl border transition-all ${
                            task.completed 
                              ? 'bg-slate-50/60 border-slate-100 opacity-60' 
                              : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <button
                              type="button"
                              onClick={() => toggleTaskStatus(task.id)}
                              className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                                task.completed 
                                  ? 'border-slate-800 bg-slate-900 text-white' 
                                  : 'border-slate-300 hover:border-slate-400 bg-white'
                              }`}
                            >
                              {task.completed && <Check className="w-3 h-3 stroke-[3]" />}
                            </button>
                            <span className={`text-xs font-medium text-slate-700 truncate ${task.completed ? 'line-through text-slate-400' : ''}`}>
                              {task.text}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            {task.type === 'system' ? (
                              <span className="text-[9px] bg-slate-100 border border-slate-200 font-mono text-slate-500 px-1.5 py-0.5 rounded uppercase font-bold">Curated</span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => deleteCustomTask(task.id)}
                                className="text-slate-400 hover:text-red-500 p-1 cursor-pointer transition-colors"
                                title="Delete task"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add microtask form */}
                  <form onSubmit={handleAddCustomTask} className="mt-4 flex gap-2">
                    <input
                      type="text"
                      className="flex-1 bg-slate-50 border border-slate-200 focus:border-slate-350 focus:ring-4 focus:ring-slate-500/5 rounded-xl px-3.5 py-2 text-xs text-slate-700 placeholder-slate-300 focus:outline-none"
                      placeholder="Add an actionable micro-step..."
                      value={customTaskText}
                      onChange={(e) => setCustomTaskText(e.target.value)}
                    />
                    <button
                      type="submit"
                      disabled={!customTaskText.trim()}
                      className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 cursor-pointer transition-all ${
                        customTaskText.trim()
                          ? 'bg-slate-900 hover:bg-slate-850 text-white shadow-md'
                          : 'bg-slate-100 text-slate-300 cursor-not-allowed'
                      }`}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add</span>
                    </button>
                  </form>
                </div>
              )}

            </div>

          </div>

          {/* Inspirational block */}
          <div className="bg-white border border-slate-200 rounded-[32px] p-6 text-center relative overflow-hidden shadow-sm">
            <span className="text-[10px] uppercase tracking-widest font-mono text-slate-400 block">Inspirational Zen Reflection</span>
            <p className="text-sm text-slate-600 italic mt-3 font-serif leading-relaxed px-4">
              &ldquo;{currentTheme.quote}&rdquo;
            </p>
          </div>

        </div>

      </main>

      {/* Footer metadata details */}
      <footer className="mt-16 text-center text-slate-400 text-[11px] font-mono leading-relaxed max-w-xl mx-auto px-6" id="main_footer_section">
        <p>MoodDesk Workspace Calibrator Engine v2.4</p>
        <p className="mt-1">Persisted in Client Workspace via secure standard key-value storage. Client-side HMR is paused.</p>
        <p className="mt-2 text-[10px] text-slate-350">Refined sentiment maps target approximate emotional accuracy. AI connections proxied cleanly server-side.</p>
      </footer>
    </div>
  );
}
