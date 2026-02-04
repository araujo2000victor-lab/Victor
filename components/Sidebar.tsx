import React, { useState, useEffect } from 'react';
import { Target, Zap, ChevronRight, CheckCircle, Clock, Repeat, User, LogOut, BookOpen, Save, Skull, Plus, Trash2, Link, Play, AlertTriangle, FileText, Image as ImageIcon, RefreshCw, X, BarChart3, TrendingUp, BrainCircuit, ChevronDown, Radio, Type, ListTodo, CheckSquare } from 'lucide-react';
import { IntelData, QuizQuestion, ResourceMap, ProgressMap, StudyStatus, User as UserType, FlashDeck, FlashCard, DailyFlashProgress, LawFlashResult, TopicResources, DailyTaskMetrics } from '../types';
import { generateLawFlash, generatePerformanceAnalysis, generateQuizQuestions } from '../services/geminiService';

interface SidebarProps {
  savedExams: IntelData[];
  userId: string;
  currentUser: UserType | null;
  onLogout: () => void;
}

interface PerformanceMetric {
    subject: string;
    total: number;
    correct: number;
    percentage: number;
    status: 'good' | 'medium' | 'bad';
    topics: {
        name: string;
        total: number;
        correct: number;
        percentage: number;
        status: 'good' | 'medium' | 'bad';
    }[];
}

interface RevisionItem {
    examName: string;
    subject: string;
    topic: string;
    phase: '24h' | '7d' | '30d' | 'maintenance';
    dueDate: Date;
    resource: TopicResources;
}

const Sidebar: React.FC<SidebarProps> = ({ savedExams, userId, currentUser, onLogout }) => {
  const [activeTab, setActiveTab] = useState<'flash' | 'performance' | 'revision' | 'quiz' | 'soldier'>('flash');

  // --- CAVEIRA FLASH STATE & DAILY TASKS ---
  const [decks, setDecks] = useState<FlashDeck[]>([]);
  // dailyProgress (old simple one) replaced by dailyTasks below, but keeping state for compatibility/migration if needed, 
  // though we will display dailyTasks primarily.
  const [selectedDeckId, setSelectedDeckId] = useState<string | null>(null);
  
  // NEW: Daily Tasks State
  const [dailyTasks, setDailyTasks] = useState<DailyTaskMetrics>({
      date: new Date().toLocaleDateString(),
      flashCount: 0,
      questionsPortuguese: 0,
      questionsMath: 0,
      questionsLaw: 0,
      videoWatched: 0
  });
  const [tasksExpanded, setTasksExpanded] = useState(true);

  // UI Inputs for Decks & Cards
  const [newDeckName, setNewDeckName] = useState('');
  const [newDeckType, setNewDeckType] = useState<'general' | 'law'>('general');
  const [newDeckUrl, setNewDeckUrl] = useState('');
  
  // New Card UI State
  const [newCardType, setNewCardType] = useState<'text' | 'image'>('text');
  const [newCardContent, setNewCardContent] = useState('');
  const [newCardImage, setNewCardImage] = useState('');
  const [newCardTitle, setNewCardTitle] = useState('');

  // Active Flash State
  const [currentFlash, setCurrentFlash] = useState<{ type: 'law' | 'general' | 'image'; content: string | LawFlashResult; title?: string; } | null>(null);
  const [loadingFlash, setLoadingFlash] = useState(false);
  const [showFullLaw, setShowFullLaw] = useState(false);

  // --- PERFORMANCE STATE ---
  const [performanceData, setPerformanceData] = useState<PerformanceMetric[]>([]);
  const [expandedPerfSubject, setExpandedPerfSubject] = useState<string | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);

  // --- REVISION STATE (RADAR) ---
  const [revisionQueue, setRevisionQueue] = useState<RevisionItem[]>([]);
  const [selectedRevision, setSelectedRevision] = useState<RevisionItem | null>(null);
  const [revQuestions, setRevQuestions] = useState({ total: '', correct: '' });
  const [currentSummary, setCurrentSummary] = useState<string | null>(null);

  // --- QUIZ STATE ---
  const [quizExamIdx, setQuizExamIdx] = useState<string>('');
  const [quizSubjectIdx, setQuizSubjectIdx] = useState<string>('');
  const [quizTopicIdx, setQuizTopicIdx] = useState<string>('');
  const [quizLoading, setQuizLoading] = useState(false);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
  const [quizResult, setQuizResult] = useState<{ score: number; total: number } | null>(null);

  // Helpers for Quiz Selection
  const selectedQuizExam = quizExamIdx !== '' ? savedExams[parseInt(quizExamIdx)] : null;
  const selectedQuizSubject = selectedQuizExam && quizSubjectIdx !== '' ? selectedQuizExam.conteudo_programatico[parseInt(quizSubjectIdx)] : null;
  const selectedQuizTopic = selectedQuizSubject && quizTopicIdx !== '' ? selectedQuizSubject.assuntos[parseInt(quizTopicIdx)] : null;


  // --- INITIAL DATA LOAD & DAILY RESET ---
  useEffect(() => {
    if (userId) {
      // Load Decks
      const decksStr = localStorage.getItem(`bope_user_${userId}_flash_decks`);
      if (decksStr) setDecks(JSON.parse(decksStr));

      // Load Daily Tasks & Check Reset
      const today = new Date().toLocaleDateString();
      const tasksStr = localStorage.getItem(`bope_user_${userId}_daily_tasks`);
      
      if (tasksStr) {
        const storedTasks: DailyTaskMetrics = JSON.parse(tasksStr);
        if (storedTasks.date === today) {
            setDailyTasks(storedTasks);
        } else {
            // New day reset
            const newDayTasks = {
                date: today,
                flashCount: 0,
                questionsPortuguese: 0,
                questionsMath: 0,
                questionsLaw: 0,
                videoWatched: 0
            };
            setDailyTasks(newDayTasks);
            localStorage.setItem(`bope_user_${userId}_daily_tasks`, JSON.stringify(newDayTasks));
        }
      }
    }
  }, [userId]);

  // --- PERSIST DAILY TASKS ---
  useEffect(() => {
      if (userId) {
          localStorage.setItem(`bope_user_${userId}_daily_tasks`, JSON.stringify(dailyTasks));
      }
  }, [dailyTasks, userId]);

  // --- EVENT LISTENER FOR GLOBAL UPDATES (From IntelReport) ---
  useEffect(() => {
      const handleTaskUpdate = (e: CustomEvent) => {
          const { type, subject, count } = e.detail;
          updateDailyTasks(type, subject, count);
      };

      window.addEventListener('bope_task_update' as any, handleTaskUpdate);
      return () => window.removeEventListener('bope_task_update' as any, handleTaskUpdate);
  }, [userId]); // Re-bind if user changes, though effect internal logic relies on setter

  // --- INTELLIGENT CATEGORIZATION HELPER ---
  const categorizeSubject = (subjectName: string): 'portuguese' | 'math' | 'law' | 'other' => {
      const s = subjectName.toLowerCase();
      if (s.includes('portugu') || s.includes('gramática') || s.includes('texto') || s.includes('redação') || s.includes('sintaxe')) return 'portuguese';
      if (s.includes('matemática') || s.includes('raciocínio') || s.includes('lógico') || s.includes('estatística') || s.includes('geometria') || s.includes('exatas')) return 'math';
      if (s.includes('direito') || s.includes('lei') || s.includes('constitucional') || s.includes('penal') || s.includes('processo') || s.includes('administrativo') || s.includes('legislação') || s.includes('criminologia')) return 'law';
      return 'other';
  };

  const updateDailyTasks = (type: 'flash' | 'question' | 'video', subject: string, count: number) => {
      setDailyTasks(prev => {
          const newState = { ...prev };
          if (type === 'flash') {
              newState.flashCount += count;
          } else if (type === 'video') {
              newState.videoWatched += count; // Usually 1
          } else if (type === 'question') {
              const category = categorizeSubject(subject);
              if (category === 'portuguese') newState.questionsPortuguese += count;
              else if (category === 'math') newState.questionsMath += count;
              else if (category === 'law') newState.questionsLaw += count;
              // 'Other' subjects don't have a specific daily goal in this spec, but contribute to global stats
          }
          return newState;
      });
  };

  // --- PERFORMANCE CALCULATION ---
  useEffect(() => {
    if (activeTab === 'performance' && userId) calculatePerformance();
  }, [activeTab, savedExams, userId]);

  // --- REVISION RADAR CALCULATION ---
  useEffect(() => {
    if (activeTab === 'revision' && userId) calculateRevisionRadar();
  }, [activeTab, savedExams, userId]);

  // --- UTILS: SAVE & UPDATES ---
  const persistResources = (examName: string, subject: string, resources: ResourceMap) => {
      const slug = examName.replace(/\s+/g, '_').toLowerCase();
      const key = `bope_user_${userId}_resources_${slug}`;
      localStorage.setItem(key, JSON.stringify(resources));
      window.dispatchEvent(new StorageEvent('storage', { key, newValue: JSON.stringify(resources) }));
  };

  const getResources = (examName: string): ResourceMap => {
      const slug = examName.replace(/\s+/g, '_').toLowerCase();
      const key = `bope_user_${userId}_resources_${slug}`;
      const str = localStorage.getItem(key);
      return str ? JSON.parse(str) : {};
  };

  // --- REVISION LOGIC ---
  const calculateRevisionRadar = () => {
    const queue: RevisionItem[] = [];
    const now = new Date();
    savedExams.forEach(exam => {
        const resMap = getResources(exam.concurso_info.nome);
        Object.entries(resMap).forEach(([subject, topics]) => {
            Object.entries(topics).forEach(([topic, data]) => {
                if (data.nextRevisionDate) {
                    const dueDate = new Date(data.nextRevisionDate);
                    if (dueDate <= now) queue.push({ examName: exam.concurso_info.nome, subject, topic, phase: data.revisionPhase || '24h', dueDate, resource: data });
                } else if (data.questionHistory && data.questionHistory.length > 0 && !data.nextRevisionDate) {
                    queue.push({ examName: exam.concurso_info.nome, subject, topic, phase: '24h', dueDate: now, resource: data });
                }
            });
        });
    });
    setRevisionQueue(queue);
  };

  const handleCompleteRevision = (type: 'questions' | 'summary') => {
      if (!selectedRevision) return;
      const { examName, subject, topic, phase } = selectedRevision;
      const resMap = getResources(examName);
      const now = new Date();
      let nextDate = new Date();
      let nextPhase: '24h' | '7d' | '30d' | 'maintenance' = '24h';
      if (phase === '24h') { nextDate.setDate(now.getDate() + 7); nextPhase = '7d'; } 
      else if (phase === '7d') { nextDate.setDate(now.getDate() + 30); nextPhase = '30d'; } 
      else { nextDate.setDate(now.getDate() + 30); nextPhase = 'maintenance'; }

      if (!resMap[subject]) resMap[subject] = {};
      if (!resMap[subject][topic]) resMap[subject][topic] = { videoLinks: [] };
      const topicRes = resMap[subject][topic];
      topicRes.lastStudiedAt = now.toISOString();
      topicRes.nextRevisionDate = nextDate.toISOString();
      topicRes.revisionPhase = nextPhase;

      if (type === 'questions') {
          const t = parseInt(revQuestions.total);
          const c = parseInt(revQuestions.correct);
          if (!isNaN(t) && !isNaN(c)) {
              if (!topicRes.questionHistory) topicRes.questionHistory = [];
              topicRes.questionHistory.push({ id: Date.now().toString(), date: now.toLocaleDateString(), total: t, correct: c });
              
              // TRIGGER DAILY TASK UPDATE HERE
              updateDailyTasks('question', subject, t);
          }
      }
      persistResources(examName, subject, resMap);
      setRevQuestions({ total: '', correct: '' });
      setSelectedRevision(null);
      calculateRevisionRadar();
      alert(`Revisão concluída! Próxima revisão agendada para: ${nextDate.toLocaleDateString()}`);
  };

  // --- QUIZ LOGIC ---
  const handleGenerateQuiz = async () => {
      if (!selectedQuizExam || !selectedQuizSubject || !selectedQuizTopic) return;
      setQuizLoading(true);
      setQuizQuestions([]);
      setQuizResult(null);
      setQuizAnswers({});
      const qs = await generateQuizQuestions(selectedQuizExam.concurso_info.nome, selectedQuizExam.concurso_info.banca, selectedQuizSubject.disciplina, selectedQuizTopic);
      setQuizQuestions(qs);
      setQuizLoading(false);
  };

  const handleSubmitQuiz = () => {
      let correctCount = 0;
      quizQuestions.forEach((q, idx) => { if (quizAnswers[idx] === q.correctIndex) correctCount++; });
      setQuizResult({ score: correctCount, total: quizQuestions.length });

      if (selectedQuizExam && selectedQuizSubject && selectedQuizTopic) {
          const resMap = getResources(selectedQuizExam.concurso_info.nome);
          const subj = selectedQuizSubject.disciplina;
          const top = selectedQuizTopic;
          if (!resMap[subj]) resMap[subj] = {};
          if (!resMap[subj][top]) resMap[subj][top] = { videoLinks: [] };
          if (!resMap[subj][top].questionHistory) resMap[subj][top].questionHistory = [];
          resMap[subj][top].questionHistory.push({ id: Date.now().toString(), date: new Date().toLocaleDateString(), total: quizQuestions.length, correct: correctCount });
          persistResources(selectedQuizExam.concurso_info.nome, subj, resMap);

          // TRIGGER DAILY TASK UPDATE HERE
          updateDailyTasks('question', subj, quizQuestions.length);
      }
  };

  // --- HELPERS FOR PERF ---
  const calculatePerformance = () => {
      const metricsMap: Record<string, { total: number, correct: number, topics: Record<string, { total: number, correct: number }> }> = {};
      savedExams.forEach(exam => {
          const resMap = getResources(exam.concurso_info.nome);
          Object.entries(resMap).forEach(([subject, topicsMap]) => {
              const normSub = subject.trim();
              if (!metricsMap[normSub]) metricsMap[normSub] = { total: 0, correct: 0, topics: {} };
              Object.entries(topicsMap).forEach(([topic, data]) => {
                  data.questionHistory?.forEach(session => {
                      metricsMap[normSub].total += session.total;
                      metricsMap[normSub].correct += session.correct;
                      if (!metricsMap[normSub].topics[topic]) metricsMap[normSub].topics[topic] = { total: 0, correct: 0 };
                      metricsMap[normSub].topics[topic].total += session.total;
                      metricsMap[normSub].topics[topic].correct += session.correct;
                  });
              });
          });
      });
      const finalMetrics: PerformanceMetric[] = Object.entries(metricsMap).map(([subject, data]) => {
        const pct = data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0;
        const status: 'good' | 'medium' | 'bad' = pct >= 80 ? 'good' : pct >= 65 ? 'medium' : 'bad';
        return { subject, total: data.total, correct: data.correct, percentage: pct, status: status, topics: Object.entries(data.topics).map(([tName, tData]) => {
                const tPct = tData.total > 0 ? Math.round((tData.correct / tData.total) * 100) : 0;
                const tStatus: 'good' | 'medium' | 'bad' = tPct >= 80 ? 'good' : tPct >= 65 ? 'medium' : 'bad';
                return { name: tName, total: tData.total, correct: tData.correct, percentage: tPct, status: tStatus };
            }).sort((a,b) => a.percentage - b.percentage)
        };
    }).sort((a,b) => a.percentage - b.percentage);
    setPerformanceData(finalMetrics);
  };
  const handleAiAnalysis = async () => {
    setLoadingAnalysis(true);
    try {
        const simplifiedStats = performanceData.map(p => ({ materia: p.subject, aproveitamento: p.percentage + '%', topicos_criticos: p.topics.filter(t => t.percentage < 65).map(t => t.name) }));
        const analysis = await generatePerformanceAnalysis(simplifiedStats);
        setAiAnalysis(analysis);
    } catch(e) { setAiAnalysis("Falha na comunicação com o comando."); } finally { setLoadingAnalysis(false); }
  };
  const getRatingColor = (status: 'good' | 'medium' | 'bad') => { switch(status) { case 'good': return 'text-emerald-600 dark:text-bope-green bg-emerald-100 dark:bg-emerald-900/20'; case 'medium': return 'text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/20'; case 'bad': return 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/20'; } };
  const getRatingLabel = (status: 'good' | 'medium' | 'bad') => { switch(status) { case 'good': return 'DOMINADO'; case 'medium': return 'ATENÇÃO'; case 'bad': return 'CRÍTICO'; } };

  // --- COMMON UI HANDLERS ---
  const handleAddDeck = () => { if (!newDeckName) return; setDecks([...decks, { id: Date.now().toString(), title: newDeckName, type: newDeckType, lawUrl: newDeckType === 'law' ? newDeckUrl : undefined, cards: [] }]); setNewDeckName(''); setNewDeckUrl(''); };
  const handleDeleteDeck = (id: string) => { if (confirm("Excluir?")) setDecks(decks.filter(d => d.id !== id)); };
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (file) { const reader = new FileReader(); reader.onloadend = () => { setNewCardImage(reader.result as string); }; reader.readAsDataURL(file); } };
  const handleAddCard = () => { if (!selectedDeckId) return; if (newCardType === 'text' && !newCardContent) return; if (newCardType === 'image' && !newCardImage) return; const finalContent = newCardType === 'image' ? newCardImage : newCardContent; setDecks(decks.map(d => d.id === selectedDeckId ? { ...d, cards: [...d.cards, { id: Date.now().toString(), type: newCardType, content: finalContent, title: newCardTitle }] } : d)); setNewCardContent(''); setNewCardImage(''); setNewCardTitle(''); };
  const handleDeleteCard = (deckId: string, cardId: string) => { const updatedDecks = decks.map(d => { if (d.id === deckId) { return { ...d, cards: d.cards.filter(c => c.id !== cardId) }; } return d; }); setDecks(updatedDecks); };
  
  const handleExecuteFlash = async (deck: FlashDeck) => { 
      setLoadingFlash(true); setCurrentFlash(null); 
      try { 
          if (deck.type === 'law') { const r = await generateLawFlash(deck.title, deck.lawUrl || ''); setCurrentFlash({ type: 'law', content: r, title: `Artigo: ${deck.title}` }); } 
          else { 
              if (deck.cards.length === 0) throw new Error(); 
              const c = deck.cards[Math.floor(Math.random() * deck.cards.length)]; 
              setCurrentFlash({ type: c.type === 'image' ? 'image' : 'general', content: c.content, title: c.title }); 
          } 
          
          // TRIGGER DAILY TASK UPDATE HERE
          updateDailyTasks('flash', '', 1);

      } catch (e) { alert("Deck vazio ou erro ao carregar."); } finally { setLoadingFlash(false); } 
  };
  
  // --- PERSISTENCE ---
  useEffect(() => { if (userId) localStorage.setItem(`bope_user_${userId}_flash_decks`, JSON.stringify(decks)); }, [decks, userId]);

  return (
    <div className="h-full flex flex-col bg-white dark:bg-bope-black/50 overflow-hidden border-r border-gray-200 dark:border-gray-800">
      {/* TABS HEADER */}
      <div className="flex border-b border-gray-200 dark:border-gray-800 overflow-x-auto">
        <button onClick={() => setActiveTab('flash')} className={`flex-1 min-w-[60px] py-3 text-[10px] font-bold uppercase tracking-wider flex flex-col items-center justify-center gap-1 ${activeTab === 'flash' ? 'text-gray-900 dark:text-white border-b-2 border-emerald-500 bg-gray-50 dark:bg-white/5' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}><Skull className="w-4 h-4" /> Caveira</button>
        <button onClick={() => setActiveTab('revision')} className={`flex-1 min-w-[60px] py-3 text-[10px] font-bold uppercase tracking-wider flex flex-col items-center justify-center gap-1 ${activeTab === 'revision' ? 'text-amber-600 dark:text-amber-400 border-b-2 border-amber-600 dark:border-amber-400 bg-amber-50 dark:bg-amber-900/10' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}><Repeat className="w-4 h-4" /> Revisão</button>
        <button onClick={() => setActiveTab('quiz')} className={`flex-1 min-w-[60px] py-3 text-[10px] font-bold uppercase tracking-wider flex flex-col items-center justify-center gap-1 ${activeTab === 'quiz' ? 'text-purple-600 dark:text-purple-400 border-b-2 border-purple-600 dark:border-purple-400 bg-purple-50 dark:bg-purple-900/10' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}><Zap className="w-4 h-4" /> Quiz</button>
        <button onClick={() => setActiveTab('performance')} className={`flex-1 min-w-[60px] py-3 text-[10px] font-bold uppercase tracking-wider flex flex-col items-center justify-center gap-1 ${activeTab === 'performance' ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/10' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}><BarChart3 className="w-4 h-4" /> Desemp.</button>
        <button onClick={() => setActiveTab('soldier')} className={`flex-1 min-w-[60px] py-3 text-[10px] font-bold uppercase tracking-wider flex flex-col items-center justify-center gap-1 ${activeTab === 'soldier' ? 'text-emerald-600 dark:text-bope-green border-b-2 border-emerald-600 dark:border-bope-green bg-emerald-50 dark:bg-emerald-900/10' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}><User className="w-4 h-4" /> Perfil</button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        
        {/* ================= CAVEIRA FLASHES & DAILY TASKS ================= */}
        {activeTab === 'flash' && (
           <div className="space-y-6">
              
              {/* PAINEL DE OPERAÇÕES DIÁRIAS (SUBSTITUINDO META SIMPLES) */}
              <div className="bg-gray-900 dark:bg-black rounded-sm border border-gray-800 relative overflow-hidden">
                 <div onClick={() => setTasksExpanded(!tasksExpanded)} className="p-3 flex justify-between items-center cursor-pointer relative z-10 bg-black/20 hover:bg-black/30 transition-colors">
                     <div>
                        <h4 className="text-white font-stencil tracking-wider text-sm flex items-center gap-2"><ListTodo className="w-4 h-4 text-emerald-500"/> OPERAÇÕES DIÁRIAS</h4>
                        <p className="text-[10px] text-gray-400 font-mono">Reinicia às 23:59</p>
                     </div>
                     <ChevronDown className={`w-4 h-4 text-gray-400 transform transition-transform ${tasksExpanded ? 'rotate-180' : ''}`} />
                 </div>
                 
                 {tasksExpanded && (
                     <div className="p-3 pt-0 space-y-2 relative z-10">
                        <div className="h-px bg-gray-800 w-full mb-3"></div>
                        
                        {/* Task Item Helper */}
                        {[
                            { label: '5 Flashes Caveira', current: dailyTasks.flashCount, target: 5 },
                            { label: '10 Qst. Português', current: dailyTasks.questionsPortuguese, target: 10 },
                            { label: '10 Qst. Matemática', current: dailyTasks.questionsMath, target: 10 },
                            { label: '10 Qst. Direito/Leis', current: dailyTasks.questionsLaw, target: 10 },
                            { label: '1 Vídeo Aula', current: dailyTasks.videoWatched, target: 1 }
                        ].map((task, idx) => {
                            const isDone = task.current >= task.target;
                            const progress = Math.min((task.current / task.target) * 100, 100);
                            
                            return (
                                <div key={idx} className="flex flex-col gap-1">
                                    <div className="flex justify-between items-center text-[10px] font-mono uppercase">
                                        <span className={isDone ? 'text-emerald-400 font-bold' : 'text-gray-400'}>{task.label}</span>
                                        <span className={isDone ? 'text-emerald-400' : 'text-gray-500'}>
                                            {isDone && <CheckCircle className="w-3 h-3 inline mr-1" />}
                                            {task.current}/{task.target}
                                        </span>
                                    </div>
                                    <div className="w-full h-1 bg-gray-800 rounded-full overflow-hidden">
                                        <div className={`h-full transition-all duration-500 ${isDone ? 'bg-emerald-500' : 'bg-yellow-600'}`} style={{ width: `${progress}%` }}></div>
                                    </div>
                                </div>
                            );
                        })}
                     </div>
                 )}
              </div>

              <div className="bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-gray-800 p-3 rounded-sm">
                 <h5 className="text-[10px] font-bold uppercase text-gray-500 mb-2">Adicionar Deck</h5>
                 <div className="space-y-2"><input type="text" placeholder="Nome" className="w-full text-xs p-2 border rounded-sm dark:bg-black/20 dark:border-gray-700" value={newDeckName} onChange={e => setNewDeckName(e.target.value)} /><div className="flex gap-2"><select className="text-xs p-2 border rounded-sm bg-white dark:bg-black/20 dark:border-gray-700" value={newDeckType} onChange={e => setNewDeckType(e.target.value as any)}><option value="general">Geral</option><option value="law">Lei (IA)</option></select>{newDeckType === 'law' && <input type="text" placeholder="Link Lei" className="flex-1 text-xs p-2 border rounded-sm dark:bg-black/20 dark:border-gray-700" value={newDeckUrl} onChange={e => setNewDeckUrl(e.target.value)} />}<button onClick={handleAddDeck} className="bg-emerald-600 text-white p-2 rounded-sm"><Plus className="w-4 h-4"/></button></div></div>
              </div>
              <div className="space-y-2">{decks.map(deck => (<div key={deck.id} className="border border-gray-200 dark:border-gray-800 rounded-sm overflow-hidden"><div onClick={() => setSelectedDeckId(selectedDeckId === deck.id ? null : deck.id)} className={`p-3 flex justify-between items-center cursor-pointer transition-colors ${selectedDeckId === deck.id ? 'bg-emerald-50 dark:bg-emerald-900/10' : 'bg-white dark:bg-black/20'}`}><div className="flex items-center gap-2">{deck.type === 'law' ? <Link className="w-4 h-4 text-blue-500"/> : <BookOpen className="w-4 h-4 text-amber-500"/>}<span className="text-xs font-bold uppercase text-gray-800 dark:text-gray-200">{deck.title}</span></div><div className="flex items-center gap-2"><button onClick={(e) => { e.stopPropagation(); handleDeleteDeck(deck.id); }} className="text-gray-400 hover:text-red-500"><Trash2 className="w-3 h-3"/></button><ChevronRight className={`w-4 h-4 text-gray-400 ${selectedDeckId === deck.id ? 'rotate-90' : ''}`} /></div></div>
              
              {selectedDeckId === deck.id && (
                  <div className="bg-gray-50 dark:bg-black/40 border-t border-gray-200 dark:border-gray-800 p-3">
                     <button onClick={() => handleExecuteFlash(deck)} disabled={loadingFlash} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-sm font-bold font-mono text-sm uppercase flex items-center justify-center gap-2 mb-4 shadow-sm">{loadingFlash ? <RefreshCw className="w-4 h-4 animate-spin"/> : <Play className="w-4 h-4 fill-current"/>} Iniciar Flash</button>
                     
                     {currentFlash && (
                         <div className="mb-4 bg-white dark:bg-gray-900 border border-emerald-500/30 rounded-sm p-4 shadow-sm">
                             <div className="flex justify-between items-start mb-2 border-b pb-2"><h5 className="text-xs font-bold text-emerald-600 uppercase">{currentFlash.title}</h5><button onClick={() => setCurrentFlash(null)}><X className="w-3 h-3"/></button></div>
                             
                             {/* DISPLAY FLASH CONTENT (IMAGE OR TEXT) */}
                             {currentFlash.type === 'image' ? (
                                 <div className="flex flex-col items-center">
                                     <img src={currentFlash.content as string} alt="Flash Card" className="max-w-full h-auto rounded border border-gray-200 dark:border-gray-800" />
                                 </div>
                             ) : (
                                 <div className="text-sm font-mono">{(typeof currentFlash.content === 'string') ? currentFlash.content : (!showFullLaw ? (currentFlash.content as LawFlashResult).summary : (currentFlash.content as LawFlashResult).article)}</div>
                             )}
                         </div>
                     )}

                     {deck.type === 'general' && (
                        <div className="border-t pt-3">
                           <div className="flex gap-2 mb-2">
                               <button onClick={() => setNewCardType('text')} className={`flex-1 text-[10px] py-1 border rounded uppercase ${newCardType === 'text' ? 'bg-gray-200 dark:bg-gray-700 border-gray-400' : 'border-gray-200 dark:border-gray-800'}`}>
                                  <Type className="w-3 h-3 inline mr-1"/> Texto
                               </button>
                               <button onClick={() => setNewCardType('image')} className={`flex-1 text-[10px] py-1 border rounded uppercase ${newCardType === 'image' ? 'bg-gray-200 dark:bg-gray-700 border-gray-400' : 'border-gray-200 dark:border-gray-800'}`}>
                                  <ImageIcon className="w-3 h-3 inline mr-1"/> Imagem
                               </button>
                           </div>
                           
                           <input className="w-full mb-2 text-xs p-1.5 border rounded-sm dark:bg-black/20 dark:border-gray-700" placeholder="Título (Opcional)" value={newCardTitle} onChange={e => setNewCardTitle(e.target.value)} />
                           
                           {newCardType === 'text' ? (
                               <textarea className="w-full mb-2 text-xs p-1.5 border rounded-sm dark:bg-black/20 dark:border-gray-700 h-16" placeholder="Conteúdo do flash..." value={newCardContent} onChange={e => setNewCardContent(e.target.value)}></textarea>
                           ) : (
                               <div className="mb-2">
                                   <input type="file" accept="image/*" onChange={handleImageUpload} className="w-full text-xs" />
                                   {newCardImage && <img src={newCardImage} className="mt-2 w-full h-24 object-cover rounded border" />}
                               </div>
                           )}
                           
                           <button onClick={handleAddCard} className="w-full bg-gray-200 dark:bg-gray-800 hover:bg-emerald-600 hover:text-white text-gray-600 dark:text-gray-300 py-1.5 rounded-sm text-xs font-bold uppercase transition-colors">Salvar no Deck</button>
                           
                           {/* List Cards */}
                           {deck.cards.length > 0 && (
                                <div className="mt-3 space-y-1">
                                    {deck.cards.map(card => (
                                    <div key={card.id} className="flex justify-between items-center bg-white dark:bg-black/10 px-2 py-1 border border-gray-100 dark:border-gray-800 rounded-sm">
                                        <div className="flex items-center gap-2">
                                            {card.type === 'image' ? <ImageIcon className="w-3 h-3 text-purple-500"/> : <FileText className="w-3 h-3 text-gray-400"/>}
                                            <span className="text-[10px] text-gray-600 dark:text-gray-400 truncate w-32">{card.title || (card.type === 'image' ? 'Imagem' : card.content.substring(0, 15) + '...')}</span>
                                        </div>
                                        <button onClick={() => handleDeleteCard(deck.id, card.id)} className="text-gray-400 hover:text-red-500"><X className="w-3 h-3"/></button>
                                    </div>
                                    ))}
                                </div>
                            )}
                        </div>
                     )}
                  </div>
              )}</div>))}</div>
           </div>
        )}

        {/* ... (Rest of tabs remain the same) ... */}
        {activeTab === 'revision' && (
           <div className="space-y-6">
              <div className="bg-amber-50 dark:bg-amber-900/10 p-4 rounded-sm border border-amber-200 dark:border-amber-800">
                  <h4 className="text-xs font-bold uppercase text-amber-700 dark:text-amber-500 mb-2 flex items-center gap-2">
                      <Clock className="w-4 h-4" /> Radar de Retenção
                  </h4>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400">
                      A IA monitora seus estudos e alerta quando uma revisão é necessária para evitar o esquecimento.
                  </p>
              </div>

              {revisionQueue.length === 0 ? (
                  <div className="text-center py-10 opacity-50">
                      <CheckCircle className="w-12 h-12 mx-auto text-emerald-500 mb-2" />
                      <p className="text-xs font-mono text-gray-500">NENHUMA PENDÊNCIA NO RADAR.</p>
                      <p className="text-[10px] text-gray-400">Suas revisões estão em dia, soldado.</p>
                  </div>
              ) : (
                  <div className="space-y-3">
                      {revisionQueue.map((item, idx) => (
                          <div key={idx} className="bg-white dark:bg-black/20 border border-gray-200 dark:border-gray-800 rounded-sm overflow-hidden shadow-sm hover:border-amber-400 transition-colors">
                              <div 
                                onClick={() => {
                                    setSelectedRevision(selectedRevision === item ? null : item);
                                    if (item.resource.summary || item.resource.fullMaterial) {
                                        setCurrentSummary(item.resource.summary || item.resource.fullMaterial);
                                    } else {
                                        setCurrentSummary(null);
                                    }
                                }}
                                className="p-3 flex justify-between items-center cursor-pointer"
                              >
                                  <div>
                                      <div className="text-[9px] text-gray-400 uppercase font-mono mb-1">{item.examName} &bull; {item.subject}</div>
                                      <div className="font-bold text-sm text-gray-800 dark:text-gray-200">{item.topic}</div>
                                  </div>
                                  <div className="flex flex-col items-end">
                                      <span className="text-[10px] font-bold text-red-500 uppercase animate-pulse">REVISÃO {item.phase}</span>
                                      <span className="text-[9px] text-gray-400">Venceu: {item.dueDate.toLocaleDateString()}</span>
                                  </div>
                              </div>
                              
                              {/* ACTIONS AREA */}
                              {selectedRevision === item && (
                                  <div className="bg-amber-50 dark:bg-amber-900/5 p-3 border-t border-amber-100 dark:border-amber-800/50 animate-in slide-in-from-top-1">
                                      
                                      {/* Resumo */}
                                      <div className="mb-4">
                                          <h5 className="text-[10px] font-bold uppercase text-gray-500 mb-1 flex items-center gap-1"><BookOpen className="w-3 h-3"/> Material Tático</h5>
                                          {currentSummary ? (
                                              <div className="bg-white dark:bg-black/20 p-2 text-xs max-h-32 overflow-y-auto border border-gray-100 dark:border-gray-700 prose dark:prose-invert">
                                                  <div dangerouslySetInnerHTML={{__html: currentSummary}} />
                                                  <button 
                                                    onClick={() => handleCompleteRevision('summary')}
                                                    className="mt-2 w-full bg-blue-100 text-blue-700 text-[10px] font-bold py-1 rounded hover:bg-blue-200"
                                                  >
                                                      CONFIRMAR LEITURA (CONCLUIR)
                                                  </button>
                                              </div>
                                          ) : (
                                              <div className="text-[10px] text-gray-400 italic">Sem resumo salvo. Use a IA na aba de Estudo para gerar.</div>
                                          )}
                                      </div>

                                      {/* Questões */}
                                      <div>
                                          <h5 className="text-[10px] font-bold uppercase text-gray-500 mb-1 flex items-center gap-1"><Target className="w-3 h-3"/> Validar com Questões</h5>
                                          <div className="flex gap-2">
                                              <input type="number" placeholder="Total" className="w-16 p-1 text-xs border rounded" value={revQuestions.total} onChange={e => setRevQuestions({...revQuestions, total: e.target.value})}/>
                                              <input type="number" placeholder="Acertos" className="w-16 p-1 text-xs border rounded" value={revQuestions.correct} onChange={e => setRevQuestions({...revQuestions, correct: e.target.value})}/>
                                              <button 
                                                onClick={() => handleCompleteRevision('questions')}
                                                className="flex-1 bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-bold py-1 rounded"
                                              >
                                                  SALVAR E CONCLUIR
                                              </button>
                                          </div>
                                      </div>
                                  </div>
                              )}
                          </div>
                      ))}
                  </div>
              )}
           </div>
        )}

        {/* ================= QUIZ ================= */}
        {activeTab === 'quiz' && (
            <div className="space-y-6">
                {!quizResult && quizQuestions.length === 0 ? (
                    <div className="space-y-4">
                        <div className="bg-purple-50 dark:bg-purple-900/10 p-4 rounded-sm border border-purple-200 dark:border-purple-800">
                             <h4 className="text-xs font-bold uppercase text-purple-700 dark:text-purple-400 mb-2 flex items-center gap-2"><Zap className="w-4 h-4"/> Gerador de Simulado Tático</h4>
                             <p className="text-[10px] text-gray-500 dark:text-gray-400">A IA criará questões objetivas baseadas no estilo da banca do concurso selecionado.</p>
                        </div>
                        
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase text-gray-500">1. Alvo (Concurso)</label>
                            <select value={quizExamIdx} onChange={e => { setQuizExamIdx(e.target.value); setQuizSubjectIdx(''); setQuizTopicIdx(''); }} className="w-full text-xs p-3 rounded bg-white dark:bg-black/20 border border-gray-300 dark:border-gray-700">
                                <option value="">Selecione...</option>
                                {savedExams.map((e, i) => <option key={i} value={i}>{e.concurso_info.nome} ({e.concurso_info.banca})</option>)}
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase text-gray-500">2. Disciplina</label>
                            <select value={quizSubjectIdx} onChange={e => { setQuizSubjectIdx(e.target.value); setQuizTopicIdx(''); }} disabled={!selectedQuizExam} className="w-full text-xs p-3 rounded bg-white dark:bg-black/20 border border-gray-300 dark:border-gray-700 disabled:opacity-50">
                                <option value="">Selecione...</option>
                                {selectedQuizExam?.conteudo_programatico.map((s, i) => <option key={i} value={i}>{s.disciplina}</option>)}
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase text-gray-500">3. Assunto Específico</label>
                            <select value={quizTopicIdx} onChange={e => setQuizTopicIdx(e.target.value)} disabled={!selectedQuizSubject} className="w-full text-xs p-3 rounded bg-white dark:bg-black/20 border border-gray-300 dark:border-gray-700 disabled:opacity-50">
                                <option value="">Selecione...</option>
                                {selectedQuizSubject?.assuntos.map((t, i) => <option key={i} value={i}>{t}</option>)}
                            </select>
                        </div>

                        <button 
                          onClick={handleGenerateQuiz}
                          disabled={!selectedQuizTopic || quizLoading}
                          className="w-full mt-4 bg-purple-600 hover:bg-purple-500 text-white py-3 rounded-sm font-bold font-mono text-sm uppercase flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
                        >
                           {quizLoading ? <RefreshCw className="w-4 h-4 animate-spin"/> : <Target className="w-4 h-4"/>}
                           {quizLoading ? 'Gerando Questões...' : 'Gerar Quiz Tático'}
                        </button>
                    </div>
                ) : !quizResult ? (
                    // QUIZ PLAYING INTERFACE
                    <div className="space-y-6 animate-in slide-in-from-right">
                        <div className="flex justify-between items-center border-b border-gray-200 dark:border-gray-800 pb-2">
                            <h4 className="text-xs font-bold uppercase text-gray-500">Simulado em Andamento</h4>
                            <button onClick={() => { setQuizQuestions([]); }} className="text-xs text-red-500 underline">Cancelar</button>
                        </div>

                        {quizQuestions.map((q, qIdx) => (
                            <div key={qIdx} className="bg-white dark:bg-black/20 p-4 rounded-sm border border-gray-200 dark:border-gray-800">
                                <p className="text-sm font-bold text-gray-800 dark:text-gray-200 mb-3"><span className="text-purple-600 mr-2">Q{qIdx+1}.</span>{q.statement}</p>
                                <div className="space-y-2">
                                    {q.options.map((opt, oIdx) => (
                                        <label key={oIdx} className={`flex items-start gap-2 p-2 rounded cursor-pointer border ${quizAnswers[qIdx] === oIdx ? 'bg-purple-50 dark:bg-purple-900/20 border-purple-300' : 'border-transparent hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
                                            <input 
                                              type="radio" 
                                              name={`q-${qIdx}`} 
                                              className="mt-1"
                                              checked={quizAnswers[qIdx] === oIdx}
                                              onChange={() => setQuizAnswers({...quizAnswers, [qIdx]: oIdx})}
                                            />
                                            <span className="text-xs text-gray-700 dark:text-gray-300">{opt}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        ))}

                        <button 
                          onClick={handleSubmitQuiz}
                          disabled={Object.keys(quizAnswers).length < quizQuestions.length}
                          className="w-full bg-emerald-600 text-white py-3 rounded-sm font-bold uppercase text-sm disabled:opacity-50"
                        >
                            Encerrar Missão (Corrigir)
                        </button>
                    </div>
                ) : (
                    // QUIZ RESULT
                    <div className="text-center py-8 animate-in zoom-in">
                         <div className="inline-flex justify-center items-center w-24 h-24 rounded-full bg-gray-100 dark:bg-gray-800 mb-4 border-4 border-emerald-500">
                             <span className="text-3xl font-bold font-mono text-emerald-600">{quizResult.score}/{quizResult.total}</span>
                         </div>
                         <h3 className="text-xl font-bold uppercase text-gray-900 dark:text-white mb-2">Missão Cumprida</h3>
                         <p className="text-sm text-gray-500 mb-6">Resultado salvo no histórico de desempenho e contabilizado nas Operações Diárias.</p>

                         {/* Review Answers */}
                         <div className="text-left space-y-4 mb-6 max-h-60 overflow-y-auto p-2 bg-gray-50 dark:bg-black/10 rounded">
                             {quizQuestions.map((q, idx) => (
                                 <div key={idx} className={`p-2 rounded text-xs border ${quizAnswers[idx] === q.correctIndex ? 'border-emerald-200 bg-emerald-50/50' : 'border-red-200 bg-red-50/50'}`}>
                                     <div className="font-bold mb-1">Q{idx+1}: {quizAnswers[idx] === q.correctIndex ? <span className="text-emerald-600">Correto</span> : <span className="text-red-600">Incorreto</span>}</div>
                                     <div className="text-gray-600 dark:text-gray-400 italic">{q.justification}</div>
                                 </div>
                             ))}
                         </div>
                         
                         <button 
                           onClick={() => { setQuizResult(null); setQuizQuestions([]); setQuizAnswers({}); }}
                           className="bg-gray-800 text-white px-6 py-2 rounded-sm text-xs font-bold uppercase"
                         >
                             Voltar ao Painel
                         </button>
                    </div>
                )}
            </div>
        )}

        {/* ... Performance & Soldier Tabs (Unchanged in logic, just re-rendered if necessary) ... */}
        {activeTab === 'performance' && (
            <div className="space-y-6">
                <div className="bg-gray-50 dark:bg-black/20 p-4 rounded-sm border border-gray-200 dark:border-gray-800">
                    <h4 className="text-xs font-bold uppercase text-gray-500 mb-2 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4" /> Inteligência de Combate
                    </h4>
                    <p className="text-[10px] text-gray-400 mb-4">Análise agregada de todas as operações realizadas.</p>
                    {performanceData.length === 0 ? (<div className="text-center py-6 text-gray-400 text-xs">Sem dados suficientes.</div>) : (
                        <div className="space-y-3">
                            <button onClick={handleAiAnalysis} disabled={loadingAnalysis} className="w-full mb-4 bg-indigo-600 hover:bg-indigo-500 text-white py-2 rounded-sm text-xs font-bold uppercase flex items-center justify-center gap-2 shadow-sm">{loadingAnalysis ? <RefreshCw className="w-3 h-3 animate-spin"/> : <BrainCircuit className="w-3 h-3"/>} Solicitar Análise (IA)</button>
                            {aiAnalysis && (<div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 p-3 rounded-sm mb-4"><div className="text-[10px] text-gray-700 dark:text-gray-300 prose prose-sm dark:prose-invert" dangerouslySetInnerHTML={{__html: aiAnalysis}} /></div>)}
                            {performanceData.map((perf, idx) => (
                                <div key={idx} className="border border-gray-200 dark:border-gray-800 rounded-sm bg-white dark:bg-black/10"><div onClick={() => setExpandedPerfSubject(expandedPerfSubject === perf.subject ? null : perf.subject)} className="p-3 flex justify-between items-center cursor-pointer hover:bg-gray-50"><div className="flex-1"><div className="flex justify-between items-center mb-1"><span className="text-xs font-bold uppercase text-gray-800 dark:text-gray-200 truncate w-32">{perf.subject}</span><span className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold uppercase ${getRatingColor(perf.status)}`}>{getRatingLabel(perf.status)} ({perf.percentage}%)</span></div><div className="w-full h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden"><div className={`h-full ${getRatingColor(perf.status).split(' ')[0]}`} style={{ width: `${perf.percentage}%` }}></div></div></div><ChevronDown className={`w-4 h-4 text-gray-400 ml-2 ${expandedPerfSubject === perf.subject ? 'rotate-180' : ''}`} /></div>{expandedPerfSubject === perf.subject && (<div className="bg-gray-50 dark:bg-black/30 border-t p-2 space-y-1">{perf.topics.map((topic, tIdx) => (<div key={tIdx} className="flex justify-between items-center px-2 py-1"><span className="text-[10px] text-gray-600 dark:text-gray-400 truncate w-24">{topic.name}</span><div className="flex items-center gap-2"><span className="text-[9px] text-gray-500">{topic.correct}/{topic.total}</span><span className={`text-[9px] w-12 text-center py-0.5 rounded font-bold ${getRatingColor(topic.status)}`}>{topic.percentage}%</span></div></div>))}</div>)}</div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        )}

        {/* ================= SOLDIER TAB ================= */}
        {activeTab === 'soldier' && currentUser && (
           <div className="flex flex-col h-full animate-in fade-in">
              <div className="flex flex-col items-center justify-center py-6">
                 <div className="w-20 h-20 bg-gray-200 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4 border-2 border-emerald-500 dark:border-bope-green">
                    <User className="w-10 h-10 text-gray-500 dark:text-gray-400" />
                 </div>
                 <h3 className="text-lg font-bold uppercase text-gray-900 dark:text-white mb-1">{currentUser.username}</h3>
                 <span className="bg-emerald-100 dark:bg-bope-green/20 text-emerald-800 dark:text-bope-green text-[10px] font-mono px-3 py-1 rounded-full uppercase">{currentUser.rank || 'Recruta'}</span>
              </div>
              <button onClick={onLogout} className="mt-auto w-full bg-red-50 text-red-600 py-3 rounded-sm font-bold uppercase text-xs flex items-center justify-center gap-2"><LogOut className="w-4 h-4" /> Sair</button>
           </div>
        )}

      </div>
    </div>
  );
};

export default Sidebar;