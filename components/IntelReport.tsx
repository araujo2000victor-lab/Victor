import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Shield, FileText, CheckCircle, AlertTriangle, BookOpen, Layers, Clock, RefreshCw, CircleDashed, BarChart3, Save, ArrowLeft, Trash2, Edit2, Plus, ChevronDown, ChevronUp, Youtube, Download, FileDown, Play, ExternalLink, X, FolderOpen, FilePlus, Eye, Target, Percent, GraduationCap, History, Bot, Sparkles, Copy, CheckSquare, Pencil, ClipboardList } from 'lucide-react';
import { IntelData, GroundingMetadata, StudyStatus, ProgressMap, ResourceMap, VideoLink, StoredDraft, QuestionSession, TopicResources, MockExam, MockExamResult, SubjectPrompts } from '../types';
import { generateStudyContent } from '../services/geminiService';

interface IntelReportProps {
  data: IntelData;
  grounding: GroundingMetadata | null;
  isSaved: boolean;
  onSave: () => void;
  onUpdate: (data: IntelData) => void;
  onRefresh: () => void;
  onDelete: () => void;
  onBack: () => void;
  onSyncTrigger: () => void;
  userId: string;
}

// Configuração Visual dos Status
const STATUS_CONFIG = {
  pending: { label: 'PENDENTE', color: 'text-gray-400 dark:text-gray-500', bg: 'bg-white dark:bg-transparent', border: 'border-gray-200 dark:border-gray-700', icon: CircleDashed, style: '' },
  summary: { label: 'RESUMO (AZUL)', color: 'text-blue-500 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/10', border: 'border-blue-200 dark:border-blue-800', icon: FileText, style: '' },
  questions: { label: 'QUESTÕES (AMARELO)', color: 'text-yellow-500 dark:text-yellow-400', bg: 'bg-yellow-50 dark:bg-yellow-900/10', border: 'border-yellow-200 dark:border-yellow-800', icon: Target, style: '' },
  review_24h: { label: 'REVISÃO 24H (VERDE)', color: 'text-emerald-500 dark:text-bope-green', bg: 'bg-emerald-50 dark:bg-emerald-900/10', border: 'border-emerald-200 dark:border-emerald-800', icon: Clock, style: 'font-bold' },
  mastered: { label: 'REVISÃO 7D (RISCADO)', color: 'text-emerald-600 dark:text-emerald-500', bg: 'bg-emerald-100 dark:bg-emerald-900/20', border: 'border-emerald-300 dark:border-emerald-700', icon: CheckCircle, style: 'line-through decoration-2 decoration-emerald-500/50 opacity-80' }
};

const IntelReport: React.FC<IntelReportProps> = ({ data, grounding, isSaved, onSave, onUpdate, onRefresh, onDelete, onBack, onSyncTrigger, userId }) => {
  const { concurso_info, conteudo_programatico } = data;
  const [progress, setProgress] = useState<ProgressMap>({});
  const [resources, setResources] = useState<ResourceMap>({});
  const [mockExams, setMockExams] = useState<MockExam[]>([]);
  const [subjectPrompts, setSubjectPrompts] = useState<SubjectPrompts>({});
  
  const [isEditing, setIsEditing] = useState(false);
  const [expandedTopic, setExpandedTopic] = useState<{subject: string, topic: string} | null>(null);
  
  // UI States
  const [videoInput, setVideoInput] = useState({ title: '', url: '' });
  const [draftEditor, setDraftEditor] = useState<{ isOpen: boolean; id: string | null; title: string; content: string; subject: string; topic: string } | null>(null);
  const [questionInput, setQuestionInput] = useState({ total: '', correct: '' });
  const [generating, setGenerating] = useState<string | null>(null);
  
  // Mock & Prompt Modal States
  const [isMockModalOpen, setIsMockModalOpen] = useState(false);
  const [newMockName, setNewMockName] = useState('');
  const [mockInputs, setMockInputs] = useState<Record<string, { total: string, correct: string }>>({});
  const [promptModal, setPromptModal] = useState<{ isOpen: boolean; subject: string; content: string } | null>(null);

  const isFirstRender = useRef(true);

  // Storage Prefixes
  const STORAGE_PREFIX = `bope_user_${userId}_progress_`;
  const RESOURCE_PREFIX = `bope_user_${userId}_resources_`;
  const MOCK_PREFIX = `bope_user_${userId}_mocks_`;
  const PROMPT_PREFIX = `bope_user_${userId}_prompts_`;

  // --- INITIALIZATION ---
  useEffect(() => {
    const slug = concurso_info.nome.replace(/\s+/g, '_').toLowerCase();
    const savedProgress = localStorage.getItem(`${STORAGE_PREFIX}${slug}`);
    if (savedProgress) setProgress(JSON.parse(savedProgress));
    
    const savedResources = localStorage.getItem(`${RESOURCE_PREFIX}${slug}`);
    if (savedResources) setResources(JSON.parse(savedResources));

    const savedMocks = localStorage.getItem(`${MOCK_PREFIX}${slug}`);
    if (savedMocks) setMockExams(JSON.parse(savedMocks));

    const savedPrompts = localStorage.getItem(`${PROMPT_PREFIX}${slug}`);
    if (savedPrompts) setSubjectPrompts(JSON.parse(savedPrompts));
  }, [concurso_info.nome, userId]);

  // --- PERSISTENCE ---
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    const slug = concurso_info.nome.replace(/\s+/g, '_').toLowerCase();
    if (Object.keys(progress).length > 0) localStorage.setItem(`${STORAGE_PREFIX}${slug}`, JSON.stringify(progress));
    if (Object.keys(resources).length > 0) localStorage.setItem(`${RESOURCE_PREFIX}${slug}`, JSON.stringify(resources));
    localStorage.setItem(`${MOCK_PREFIX}${slug}`, JSON.stringify(mockExams));
    if (Object.keys(subjectPrompts).length > 0) localStorage.setItem(`${PROMPT_PREFIX}${slug}`, JSON.stringify(subjectPrompts));
    onSyncTrigger();
  }, [progress, resources, mockExams, subjectPrompts, concurso_info.nome, userId, onSyncTrigger]);

  const updateStatus = (subject: string, topic: string, newStatus: StudyStatus) => {
    setProgress(prev => {
       const sub = prev[subject] || {};
       return { ...prev, [subject]: { ...sub, [topic]: newStatus } };
    });
  };

  const toggleStatus = (subject: string, topic: string) => {
    setProgress(prev => {
      const currentSubject = prev[subject] || {};
      const currentStatus = currentSubject[topic] || 'pending';
      let nextStatus: StudyStatus = 'pending';
      if (currentStatus === 'pending') nextStatus = 'summary';
      else if (currentStatus === 'summary') nextStatus = 'questions';
      else if (currentStatus === 'questions') nextStatus = 'review_24h';
      else if (currentStatus === 'review_24h') nextStatus = 'mastered';
      else if (currentStatus === 'mastered') nextStatus = 'pending';
      return { ...prev, [subject]: { ...currentSubject, [topic]: nextStatus } };
    });
  };

  const generateContent = async (subject: string, topic: string, type: 'summary' | 'full') => {
    setGenerating(type);
    try {
      const content = await generateStudyContent(subject, topic, type);
      setResources(prev => {
        const sub = prev[subject] || {}; const top = sub[topic] || { videoLinks: [] };
        return { ...prev, [subject]: { ...sub, [topic]: { ...top, [type === 'summary' ? 'summary' : 'fullMaterial']: content } } };
      });
      const currentStatus = progress[subject]?.[topic] || 'pending';
      if (currentStatus === 'pending') updateStatus(subject, topic, 'summary');
    } catch (e) { alert("Erro ao gerar conteúdo."); } finally { setGenerating(null); }
  };

  const addQuestionSession = (subject: string, topic: string) => {
    const total = parseInt(questionInput.total); const correct = parseInt(questionInput.correct);
    if (isNaN(total) || isNaN(correct) || total <= 0) return;
    setResources(prev => {
      const sub = prev[subject] || {}; const top = sub[topic] || { videoLinks: [] }; const history = top.questionHistory || [];
      return { ...prev, [subject]: { ...sub, [topic]: { ...top, questionHistory: [...history, { id: Date.now().toString(), date: new Date().toLocaleDateString(), total, correct }] } } };
    });
    setQuestionInput({ total: '', correct: '' });
    const currentStatus = progress[subject]?.[topic] || 'pending';
    if (currentStatus === 'pending' || currentStatus === 'summary') updateStatus(subject, topic, 'questions');
    
    // DISPATCH EVENT TO SIDEBAR FOR DAILY TASKS
    window.dispatchEvent(new CustomEvent('bope_task_update', { 
        detail: { type: 'question', subject, count: total } 
    }));
  };

  const addVideo = (s:string, t:string) => { 
      if(!videoInput.url || !videoInput.title) return; 
      setResources(prev => { 
          const sub = prev[s]||{}; const top = sub[t]||{videoLinks:[]}; 
          return {...prev, [s]:{...sub, [t]:{...top, videoLinks:[...(top.videoLinks||[]), {id:Date.now().toString(), title:videoInput.title, url:videoInput.url}]}}} 
      });
      setVideoInput({title:'', url:''});
  };
  
  const removeVideo = (s:string, t:string, id:string) => { 
      if(confirm("Excluir este vídeo?")) {
        setResources(prev => { const sub = prev[s] || {}; const top = sub[t] || { videoLinks: [] }; return {...prev, [s]:{...sub, [t]:{...top, videoLinks: top.videoLinks.filter(v=>v.id!==id)}}} });
      }
  };

  const editVideo = (s:string, t:string, id:string, currentTitle: string) => {
      const newTitle = prompt("Novo título do vídeo:", currentTitle);
      if (newTitle && newTitle !== currentTitle) {
          setResources(prev => {
              const sub = prev[s]||{}; const top = sub[t]||{ videoLinks: [] }; const links = top.videoLinks || [];
              const updatedLinks = links.map(v => v.id === id ? { ...v, title: newTitle } : v);
              return {...prev, [s]:{...sub, [t]:{...top, videoLinks: updatedLinks}}};
          });
      }
  };

  const handleVideoClick = () => {
      // DISPATCH EVENT TO SIDEBAR FOR VIDEO WATCHED
      window.dispatchEvent(new CustomEvent('bope_task_update', { 
          detail: { type: 'video', subject: '', count: 1 } 
      }));
  };

  // --- STATS HELPER ---
  const getTopicStatus = (s:string, t:string) => progress[s]?.[t] || 'pending';
  const getTopicStats = (s:string, t:string) => {
    const history = resources[s]?.[t]?.questionHistory || [];
    let total = 0; let correct = 0;
    history.forEach(h => { total += h.total; correct += h.correct; });
    return { total, correct, accuracy: total > 0 ? Math.round((correct / total) * 100) : 0 };
  };
  const getSubjectStats = (s:string) => {
    let total = 0; let correct = 0;
    const subjectResources = resources[s];
    if (subjectResources) {
      Object.values(subjectResources).forEach((t: any) => {
        if (t.questionHistory) t.questionHistory.forEach((h: any) => { total += h.total; correct += h.correct; });
      });
    }
    return { total, correct, accuracy: total > 0 ? Math.round((correct / total) * 100) : 0 };
  };

  // Calcula estatísticas globais para exibição no topo
  const globalStats = (() => {
      let totalQuestionsDone = 0;
      let totalCorrectDone = 0;
      let totalTopics = 0;
      let completedTopics = 0;

      conteudo_programatico.forEach(sub => {
          sub.assuntos.forEach(topic => {
              totalTopics++;
              if (progress[sub.disciplina]?.[topic] === 'mastered') completedTopics++;
              
              const history = resources[sub.disciplina]?.[topic]?.questionHistory || [];
              history.forEach(h => {
                  totalQuestionsDone += h.total;
                  totalCorrectDone += h.correct;
              });
          });
      });

      const percent = totalTopics === 0 ? 0 : Math.round((completedTopics / totalTopics) * 100);
      const accuracy = totalQuestionsDone === 0 ? 0 : Math.round((totalCorrectDone / totalQuestionsDone) * 100);

      return { percent, totalQuestionsDone, totalCorrectDone, accuracy };
  })();

  const getStatusColor = (status: string) => {
    const s = status.toLowerCase();
    if (s.includes('aberto')) return 'text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/50 bg-emerald-50 dark:bg-emerald-950/30';
    if (s.includes('previsto')) return 'text-amber-700 dark:text-yellow-400 border-amber-200 dark:border-yellow-500/50 bg-amber-50 dark:bg-yellow-950/30';
    return 'text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-600/50 bg-gray-100 dark:bg-gray-900/50';
  };

  // --- OMITTED UTILS (Prompt, Drafts, etc kept same logic) ---
  const handleExpand = (s:string, t:string) => {
    if (expandedTopic?.subject === s && expandedTopic?.topic === t) setExpandedTopic(null);
    else { setExpandedTopic({ subject: s, topic: t }); setVideoInput({ title: '', url: '' }); setQuestionInput({ total: '', correct: '' }); }
  };
  
  const getFormattedPrompt = (subject: string) => {
    return `Atue como um especialista na banca ${concurso_info.banca} e prepare-me para a prova de ${concurso_info.nome}.\n\nEstou estudando a disciplina de ${subject}.\nSobre o assunto: ( )\n\nPor favor, gere 10 questões no estilo da banca...`;
  };
  const openPromptModal = (s:string) => { const ep = subjectPrompts[s]; const dt = getFormattedPrompt(s); setPromptModal({ isOpen: true, subject: s, content: ep || dt }); };
  const handleOpenTopicGemini = (s:string, t:string) => { let p = subjectPrompts[s]; if (!p) p = getFormattedPrompt(s); const f = p.replace(/\(\s*\)/g, t); window.open(`https://gemini.google.com/app?text=${encodeURIComponent(f)}`, '_blank'); };
  const saveSubjectPrompt = () => { if(promptModal) { setSubjectPrompts(prev => ({...prev, [promptModal.subject]: promptModal.content})); setPromptModal(null); } };
  const copyPromptToClipboard = () => { if(promptModal) navigator.clipboard.writeText(promptModal.content); };
  const addSubject = () => { const n = prompt("Nome:"); if(n) onUpdate({...data, conteudo_programatico: [...data.conteudo_programatico, {disciplina: n, assuntos: []}]}); };
  const removeSubject = (i:number) => { if(confirm("Remover?")) { const c = [...data.conteudo_programatico]; c.splice(i,1); onUpdate({...data, conteudo_programatico: c}); } };
  const addTopic = (i:number) => { const n = prompt("Assunto:"); if(n) { const c = [...data.conteudo_programatico]; c[i].assuntos.push(n); onUpdate({...data, conteudo_programatico: c}); } };
  const removeTopic = (i:number, ti:number) => { if(confirm("Remover?")) { const c = [...data.conteudo_programatico]; c[i].assuntos.splice(ti,1); onUpdate({...data, conteudo_programatico: c}); } };
  
  // Draft Utils
  const openDraftEditor = (s:string, t:string, d?:StoredDraft) => { setDraftEditor({isOpen:true, subject:s, topic:t, id:d?.id||null, title:d?.title||'', content:d?.content||''}) };
  const saveDraft = () => { 
      if(!draftEditor) return; 
      setResources(prev => { 
          const sub = prev[draftEditor.subject]||{}; const top = sub[draftEditor.topic]||{videoLinks:[]}; const d = top.drafts||[];
          const nd = draftEditor.id ? d.map(x=>x.id===draftEditor.id?{...x, title:draftEditor.title, content:draftEditor.content}:x) : [...d, {id:Date.now().toString(), title:draftEditor.title, content:draftEditor.content, createdAt: new Date().toLocaleDateString()}];
          return {...prev, [draftEditor.subject]:{...sub, [draftEditor.topic]:{...top, drafts:nd}}};
      });
      setDraftEditor(null);
  };
  const deleteDraft = (s:string, t:string, id:string) => { if(confirm("Excluir?")) setResources(prev => { const sub = prev[s]; const top = sub[t]; return {...prev, [s]:{...sub, [t]:{...top, drafts:top.drafts?.filter(x=>x.id!==id)}}} }) };
  const downloadContent = (c:string, f:string, e:'doc'|'pdf') => { 
      if(e==='pdf') { const w = window.open('','','width=800,height=600'); w?.document.write(`<html><body><h1>${f}</h1>${c}<script>window.onload=function(){window.print();window.close();}</script></body></html>`); w?.document.close(); }
      else { const h = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'></head><body>${c}</body></html>`; const s = 'data:application/vnd.ms-word;charset=utf-8,' + encodeURIComponent(h); const a = document.createElement("a"); a.href=s; a.download=`${f}.doc`; a.click(); }
  };
  const handleSaveMock = () => { if(!newMockName.trim()) return; const res: MockExamResult[] = []; Object.entries(mockInputs).forEach(([s,v]) => { const val = v as { total: string; correct: string }; if(val.total && val.correct) res.push({subject:s, total:parseInt(val.total), correct:parseInt(val.correct)}) }); if(res.length===0) return; setMockExams(p=>[...p, {id:Date.now().toString(), name:newMockName, date:new Date().toLocaleDateString(), results:res}]); setIsMockModalOpen(false); setNewMockName(''); setMockInputs({}); };

  return (
    <div className="w-full max-w-6xl mx-auto px-4 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700 relative">
      
      {/* Navigation */}
      <div className="flex flex-col lg:flex-row justify-between items-center mb-6 gap-4">
        <button onClick={onBack} className="text-gray-600 dark:text-gray-400 hover:text-gray-900 flex items-center gap-2 font-mono text-sm uppercase"><ArrowLeft className="w-4 h-4" /> Voltar ao Quartel</button>
        <div className="flex gap-3 w-full lg:w-auto justify-end flex-wrap">
           <button onClick={() => setIsMockModalOpen(true)} className="px-4 py-2 rounded-sm font-mono text-xs font-bold uppercase flex items-center gap-2 border bg-white dark:bg-gray-800 text-purple-600 border-purple-200 hover:bg-purple-50"><GraduationCap className="w-3 h-3"/> Simulados</button>
           <button onClick={onRefresh} className="px-4 py-2 rounded-sm font-mono text-xs font-bold uppercase flex items-center gap-2 border bg-white dark:bg-gray-800 text-gray-600 border-gray-200 hover:text-emerald-600"><RefreshCw className="w-3 h-3"/> Atualizar</button>
           <button onClick={() => setIsEditing(!isEditing)} className="px-4 py-2 rounded-sm font-mono text-xs font-bold uppercase flex items-center gap-2 border bg-gray-100 dark:bg-gray-800 text-gray-600 border-gray-200"><Edit2 className="w-3 h-3"/> {isEditing ? 'Fechar' : 'Editar'}</button>
          {isSaved ? ( <button onClick={onDelete} className="bg-red-50 text-red-600 border border-red-200 px-4 py-2 rounded-sm font-mono text-xs font-bold uppercase flex items-center gap-2"><Trash2 className="w-4 h-4"/> Abortar</button> ) : ( <button onClick={onSave} className="bg-emerald-600 text-white px-6 py-2 rounded-sm font-mono text-sm font-bold uppercase flex items-center gap-2 shadow-sm"><Save className="w-4 h-4"/> Aceitar</button> )}
        </div>
      </div>

      <div className="bg-white dark:bg-bope-gray border border-gray-200 dark:border-gray-800 rounded-sm p-6 mb-8 relative overflow-hidden shadow-sm">
        <div className="absolute top-0 right-0 p-2 opacity-5 dark:opacity-10"><Shield className="w-32 h-32 text-black dark:text-white" /></div>
        <div className="relative z-10">
           <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white uppercase tracking-tight">{concurso_info.nome}</h2>
           <div className={`inline-flex items-center gap-2 mt-2 px-3 py-1 rounded-sm border text-xs font-mono uppercase font-bold ${getStatusColor(concurso_info.status)}`}>{concurso_info.status.includes('Aberto') ? <CheckCircle className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />} {concurso_info.status}</div>
           
           <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6">
               {/* Gráfico de Progresso de Tópicos */}
               <div className="bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-gray-700/50 rounded-sm p-4">
                   <div className="flex justify-between items-end mb-2"><span className="text-xs font-mono text-emerald-600 dark:text-bope-green uppercase flex items-center gap-2"><BarChart3 className="w-4 h-4" /> Progresso (Edital)</span><span className="text-xl font-bold font-mono text-gray-900 dark:text-white">{globalStats.percent}%</span></div>
                   <div className="w-full h-2 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden"><div className="h-full bg-emerald-500 dark:bg-bope-green transition-all duration-500 ease-out relative" style={{ width: `${globalStats.percent}%` }}></div></div>
               </div>
               
               {/* Cálculo de Questões Resolvidas */}
               <div className="bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-gray-700/50 rounded-sm p-4">
                   <div className="flex justify-between items-end mb-2">
                       <span className="text-xs font-mono text-yellow-600 dark:text-yellow-500 uppercase flex items-center gap-2">
                           <ClipboardList className="w-4 h-4" /> Questões Resolvidas
                       </span>
                       <span className="text-xl font-bold font-mono text-gray-900 dark:text-white">
                           {globalStats.totalQuestionsDone} <span className="text-xs text-gray-400 font-normal">/ {concurso_info.formato_prova.total_questoes} (Prova)</span>
                       </span>
                   </div>
                   <div className="flex justify-between text-[10px] text-gray-500 font-mono uppercase">
                       <span>Aproveitamento: {globalStats.accuracy}%</span>
                       <span>Acertos: {globalStats.totalCorrectDone}</span>
                   </div>
               </div>
           </div>

        </div>
      </div>

      <div className="flex justify-between items-center mb-6"><h3 className="flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-white uppercase tracking-wider"><span className="w-2 h-6 bg-emerald-600 dark:bg-bope-green block"></span> Conteúdo Programático</h3>{isEditing && <button onClick={addSubject} className="text-xs bg-emerald-100 text-emerald-700 px-3 py-1 rounded border border-emerald-200 flex items-center gap-1 font-mono uppercase"><Plus className="w-3 h-3"/> Nova</button>}</div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {conteudo_programatico.map((materia, idx) => {
          const subStats = getSubjectStats(materia.disciplina);
          
          return (
            <div key={idx} className="bg-white dark:bg-bope-gray/50 border border-gray-200 dark:border-gray-800 rounded-sm flex flex-col h-full relative overflow-hidden">
              <div className="p-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-black/20">
                 <div className="flex justify-between items-start mb-1">
                    <h4 className="font-bold text-gray-800 dark:text-emerald-400 font-mono uppercase truncate flex-1 pr-2">{idx + 1}. {materia.disciplina}</h4>
                    <div className="flex items-center gap-1"><button onClick={() => openPromptModal(materia.disciplina)} className="text-blue-500 hover:text-blue-700 p-1"><Bot className="w-4 h-4" /></button>{isEditing && <button onClick={() => removeSubject(idx)} className="text-red-500 hover:text-red-700"><Trash2 className="w-4 h-4" /></button>}</div>
                 </div>
                 {subStats.total > 0 && <div className="text-[10px] font-mono text-gray-500 uppercase">{subStats.total} Questões | {subStats.accuracy}% Aproveitamento</div>}
              </div>
              <div className="p-2 flex-1">
                {isEditing && <button onClick={() => addTopic(idx)} className="w-full text-center py-2 text-xs font-mono uppercase text-gray-500 border border-dashed border-gray-300 mb-2">+ Assunto</button>}
                <ul className="space-y-1">
                  {materia.assuntos.map((assunto, aIdx) => {
                    const statusKey = getTopicStatus(materia.disciplina, assunto);
                    const config = STATUS_CONFIG[statusKey];
                    const isExpanded = expandedTopic?.subject === materia.disciplina && expandedTopic?.topic === assunto;
                    const topicStats = getTopicStats(materia.disciplina, assunto);
                    const topicResources = resources[materia.disciplina]?.[assunto] || { videoLinks: [], drafts: [], questionHistory: [] };

                    return (
                      <li key={aIdx} className="relative">
                        <div className={`flex items-start gap-0 rounded-sm border transition-all duration-200 ${isExpanded ? 'bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-600' : `${config.bg} ${config.border}`}`}>
                           <button onClick={() => toggleStatus(materia.disciplina, assunto)} className="p-3 text-left flex-1 flex flex-col items-start gap-1">
                              <div className="flex items-start gap-3 w-full"><config.icon className={`w-4 h-4 mt-0.5 shrink-0 ${config.color}`} /><span className={`text-sm ${config.color} ${config.style} ${statusKey === 'pending' ? 'text-gray-700 dark:text-gray-300' : ''}`}>{assunto}</span></div>
                              <div className="ml-7"><span className={`text-[9px] font-bold font-mono uppercase px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/10 ${config.color}`}>{config.label}</span></div>
                            </button>
                            <div className="flex items-center border-l border-gray-200 dark:border-gray-700">
                              <button onClick={() => handleOpenTopicGemini(materia.disciplina, assunto)} className="p-3 text-gray-400 hover:text-blue-600 transition-colors"><Sparkles className="w-4 h-4" /></button>
                              {isEditing && <button onClick={() => removeTopic(idx, aIdx)} className="p-3 text-gray-400 hover:text-red-500 border-l border-gray-200 dark:border-gray-700"><X className="w-3 h-3" /></button>}
                              <button onClick={() => handleExpand(materia.disciplina, assunto)} className="p-3 text-gray-400 hover:text-emerald-600 border-l border-gray-200 dark:border-gray-700">{isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}</button>
                            </div>
                        </div>

                        {isExpanded && (
                          <div className="border-x border-b border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 p-4 rounded-b-sm animate-in slide-in-from-top-2">
                             <div className="space-y-6">
                                {/* QUESTÕES */}
                                <div>
                                    <h5 className="text-xs font-mono font-bold text-yellow-600 dark:text-yellow-500 uppercase mb-2 flex items-center gap-2"><Target className="w-3 h-3"/> Registrar Questões (Ativa Amarelo)</h5>
                                    <div className="bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-gray-800 p-3 rounded-sm">
                                        <div className="flex gap-2 mb-2">
                                            <input type="number" placeholder="Total" className="w-full bg-white dark:bg-gray-800 border rounded-sm px-3 py-1 text-sm" value={questionInput.total} onChange={e => setQuestionInput({...questionInput, total: e.target.value})} />
                                            <input type="number" placeholder="Acertos" className="w-full bg-white dark:bg-gray-800 border rounded-sm px-3 py-1 text-sm" value={questionInput.correct} onChange={e => setQuestionInput({...questionInput, correct: e.target.value})} />
                                            <button onClick={() => addQuestionSession(materia.disciplina, assunto)} className="bg-yellow-600 hover:bg-yellow-500 text-white px-4 py-1 text-xs uppercase font-bold rounded-sm">Salvar</button>
                                        </div>
                                        <div className="text-[10px] text-gray-500 font-mono">Total: {topicStats.correct}/{topicStats.total} ({topicStats.accuracy}%)</div>
                                    </div>
                                </div>
                                
                                {/* RESUMO */}
                                <div>
                                   <h5 className="text-xs font-mono font-bold text-blue-600 dark:text-blue-500 uppercase mb-2 flex items-center gap-2"><FileText className="w-3 h-3"/> Material Tático (Ativa Azul)</h5>
                                   <div className="flex gap-2 mb-2">
                                      <button onClick={() => generateContent(materia.disciplina, assunto, 'summary')} className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-sm hover:bg-blue-700 flex items-center gap-1">{generating === 'summary' ? 'Gerando...' : 'Gerar Resumo'}</button>
                                      <button onClick={() => generateContent(materia.disciplina, assunto, 'full')} className="text-xs bg-gray-600 text-white px-3 py-1.5 rounded-sm hover:bg-gray-700 flex items-center gap-1">Material Completo</button>
                                   </div>
                                </div>

                                {/* VIDEO MANAGER */}
                                <div>
                                   <h5 className="text-xs font-mono font-bold text-red-600 dark:text-red-500 uppercase mb-2 flex items-center gap-2">
                                     <Youtube className="w-3 h-3" /> Vídeo Aulas
                                   </h5>
                                   
                                   <div className="flex flex-col sm:flex-row gap-2 mb-3">
                                      <input type="text" placeholder="Título da Aula" className="flex-1 bg-gray-100 dark:bg-gray-800 border-none rounded-sm px-3 py-1 text-sm" value={videoInput.title} onChange={e => setVideoInput({...videoInput, title: e.target.value})} />
                                      <input type="text" placeholder="URL do YouTube" className="flex-1 bg-gray-100 dark:bg-gray-800 border-none rounded-sm px-3 py-1 text-sm" value={videoInput.url} onChange={e => setVideoInput({...videoInput, url: e.target.value})} />
                                      <button onClick={() => addVideo(materia.disciplina, assunto)} className="bg-red-600 text-white px-3 py-1 text-xs uppercase font-bold rounded-sm hover:bg-red-700">Add</button>
                                   </div>

                                   {topicResources.videoLinks && topicResources.videoLinks.length > 0 ? (
                                     <ul className="space-y-1">
                                       {topicResources.videoLinks.map(vid => (
                                         <li key={vid.id} className="flex justify-between items-center bg-gray-50 dark:bg-black/20 px-3 py-2 rounded-sm border border-gray-100 dark:border-gray-800">
                                            <div className="flex items-center gap-2 truncate flex-1">
                                              <Play className="w-3 h-3 text-red-500 shrink-0" />
                                              <a href={vid.url} onClick={handleVideoClick} target="_blank" rel="noopener noreferrer" className="text-sm text-gray-700 dark:text-gray-300 hover:text-red-500 truncate" title="Assistir no YouTube">
                                                {vid.title}
                                              </a>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <button onClick={() => editVideo(materia.disciplina, assunto, vid.id, vid.title)} className="p-1.5 text-gray-400 hover:text-blue-500" title="Renomear">
                                                    <Pencil className="w-3 h-3" />
                                                </button>
                                                <button onClick={() => removeVideo(materia.disciplina, assunto, vid.id)} className="p-1.5 text-gray-400 hover:text-red-500" title="Excluir">
                                                    <Trash2 className="w-3 h-3" />
                                                </button>
                                            </div>
                                         </li>
                                       ))}
                                     </ul>
                                   ) : (
                                     <p className="text-[10px] text-gray-400 italic">Nenhum vídeo adicionado.</p>
                                   )}
                                </div>

                                {/* DOCUMENTOS */}
                                <div>
                                  <div className="flex justify-between items-center mb-2">
                                    <h5 className="text-xs font-mono font-bold text-gray-500 uppercase flex items-center gap-2"><FolderOpen className="w-3 h-3"/> Documentos</h5>
                                    <button onClick={() => openDraftEditor(materia.disciplina, assunto)} className="text-[10px] bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded border flex items-center gap-1"><FilePlus className="w-3 h-3"/> Novo</button>
                                  </div>
                                  {topicResources.drafts && topicResources.drafts.length > 0 && (
                                     <div className="space-y-1">
                                        {topicResources.drafts.map(d => (
                                           <div key={d.id} className="flex justify-between items-center bg-white dark:bg-black/10 px-2 py-1 border border-gray-100 dark:border-gray-800 rounded-sm">
                                              <div className="flex items-center gap-2 truncate"><FileText className="w-3 h-3 text-blue-500"/><span className="text-xs truncate">{d.title}</span></div>
                                              <div className="flex gap-1">
                                                 <button onClick={() => openDraftEditor(materia.disciplina, assunto, d)} className="text-gray-400 hover:text-blue-500"><Eye className="w-3 h-3"/></button>
                                                 <button onClick={() => deleteDraft(materia.disciplina, assunto, d.id)} className="text-gray-400 hover:text-red-500"><Trash2 className="w-3 h-3"/></button>
                                              </div>
                                           </div>
                                        ))}
                                     </div>
                                  )}
                                </div>
                             </div>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Modals */}
      {isMockModalOpen && <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80"><div className="bg-white dark:bg-bope-gray w-full max-w-2xl rounded-sm p-4"><div className="flex justify-between mb-4"><h3 className="font-bold">NOVO SIMULADO</h3><button onClick={()=>setIsMockModalOpen(false)}><X/></button></div><input className="w-full border p-2 mb-4" placeholder="Nome" value={newMockName} onChange={e=>setNewMockName(e.target.value)}/><div className="space-y-2">{conteudo_programatico.map((m,i)=>(<div key={i} className="flex gap-2"><span className="flex-1">{m.disciplina}</span><input type="number" placeholder="Total" className="w-20 border p-1" onChange={e=>setMockInputs({...mockInputs, [m.disciplina]:{...(mockInputs[m.disciplina]||{correct:''}), total:e.target.value}})}/><input type="number" placeholder="Acertos" className="w-20 border p-1" onChange={e=>setMockInputs({...mockInputs, [m.disciplina]:{...(mockInputs[m.disciplina]||{total:''}), correct:e.target.value}})}/></div>))}</div><button onClick={handleSaveMock} className="mt-4 bg-emerald-600 text-white px-4 py-2 rounded font-bold w-full">SALVAR</button></div></div>}
      {draftEditor && draftEditor.isOpen && <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80"><div className="bg-white dark:bg-bope-gray w-full max-w-4xl h-[80vh] rounded-sm p-4 flex flex-col"><div className="flex justify-between mb-4"><input className="font-bold w-full bg-transparent" value={draftEditor.title} onChange={e=>setDraftEditor({...draftEditor, title:e.target.value})} placeholder="Título"/><div className="flex gap-2"><button onClick={saveDraft}><Save/></button><button onClick={()=>setDraftEditor(null)}><X/></button></div></div><textarea className="flex-1 p-4 bg-gray-50 dark:bg-black/20" value={draftEditor.content} onChange={e=>setDraftEditor({...draftEditor, content:e.target.value})}></textarea></div></div>}
      {promptModal && promptModal.isOpen && <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80"><div className="bg-white dark:bg-bope-gray w-full max-w-lg rounded-sm p-4"><div className="flex justify-between mb-4"><h3 className="font-bold">CONFIGURAR PROMPT</h3><button onClick={()=>setPromptModal(null)}><X/></button></div><textarea className="w-full h-40 border p-2 mb-4 dark:bg-black/20" value={promptModal.content} onChange={e=>setPromptModal({...promptModal, content:e.target.value})}></textarea><div className="flex justify-end gap-2"><button onClick={copyPromptToClipboard} className="border px-3 py-1">Copiar</button><button onClick={saveSubjectPrompt} className="bg-emerald-600 text-white px-3 py-1">Salvar</button></div></div></div>}
    </div>
  );
};

export default IntelReport;