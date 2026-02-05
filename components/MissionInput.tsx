import React, { useState } from 'react';
import { ChevronRight, Plus, Trash2, Shield, Target, BookOpen, Layers, X, Search, Globe } from 'lucide-react';
import { IntelData } from '../types';

interface MissionInputProps {
  onStartMission: (data: IntelData) => void;
  onSearchRequest: (query: string) => void; // Nova prop para busca IA
  onCancel: () => void;
  hasSavedExams: boolean;
}

const MissionInput: React.FC<MissionInputProps> = ({ onStartMission, onSearchRequest, onCancel, hasSavedExams }) => {
  const [mode, setMode] = useState<'manual' | 'ai'>('ai');
  const [searchQuery, setSearchQuery] = useState('');

  // Passo 1: Dados Básicos (Manual)
  const [org, setOrg] = useState('');
  const [role, setRole] = useState('');
  const [banca, setBanca] = useState('');
  const [totalQuestions, setTotalQuestions] = useState('120');
  const [modality, setModality] = useState<'multipla' | 'certo_errado'>('certo_errado');
  
  // Passo 2: Disciplinas (Manual)
  const [subjects, setSubjects] = useState<string[]>([]);
  const [currentSubject, setCurrentSubject] = useState('');

  const handleAddSubject = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (currentSubject.trim()) {
      setSubjects([...subjects, currentSubject.trim().toUpperCase()]);
      setCurrentSubject('');
    }
  };

  const removeSubject = (index: number) => {
    setSubjects(subjects.filter((_, i) => i !== index));
  };

  const handleManualSubmit = () => {
    if (!org || !role || subjects.length === 0) return;

    const alternatives = modality === 'multipla' ? 5 : 2;
    const typeLabel = modality === 'multipla' ? 'Múltipla Escolha' : 'Certo/Errado';

    const missionData: IntelData = {
      concurso_info: {
        nome: `${org.toUpperCase()} - ${role.toUpperCase()}`,
        status: 'Edital Aberto (Manual)',
        banca: banca.toUpperCase() || 'NÃO INFORMADA',
        formato_prova: {
          tipo: typeLabel,
          alternativas: alternatives,
          total_questoes: parseInt(totalQuestions) || 0
        }
      },
      conteudo_programatico: subjects.map(sub => ({
        disciplina: sub,
        assuntos: [] // Inicia vazio para preenchimento posterior ou via edição
      }))
    };

    onStartMission(missionData);
  };

  const handleAiSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      onSearchRequest(searchQuery);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto my-8 px-4 animate-in fade-in zoom-in duration-300">
      
      <div className="text-center mb-8">
        <h2 className="text-2xl md:text-3xl font-stencil tracking-wider mb-2 text-gray-900 dark:text-white uppercase">
          Configurar Nova Operação
        </h2>
        <p className="text-gray-500 dark:text-gray-400 font-mono text-xs uppercase tracking-widest">
          Definição de Alvos e Inteligência
        </p>
      </div>

      <div className="bg-white dark:bg-bope-gray border border-gray-200 dark:border-gray-700 shadow-xl rounded-sm overflow-hidden">
        
        {/* TABS HEADER */}
        <div className="flex border-b border-gray-200 dark:border-gray-700">
             <button 
                onClick={() => setMode('ai')}
                className={`flex-1 py-4 text-sm font-bold uppercase flex items-center justify-center gap-2 transition-colors ${mode === 'ai' ? 'bg-emerald-50 dark:bg-emerald-900/10 text-emerald-700 dark:text-emerald-400 border-b-2 border-emerald-500' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 bg-gray-50 dark:bg-black/20'}`}
             >
                 <Globe className="w-4 h-4" /> Busca Automática (IA)
             </button>
             <button 
                onClick={() => setMode('manual')}
                className={`flex-1 py-4 text-sm font-bold uppercase flex items-center justify-center gap-2 transition-colors ${mode === 'manual' ? 'bg-blue-50 dark:bg-blue-900/10 text-blue-700 dark:text-blue-400 border-b-2 border-blue-500' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 bg-gray-50 dark:bg-black/20'}`}
             >
                 <Layers className="w-4 h-4" /> Entrada Manual
             </button>
        </div>

        {/* --- AI MODE --- */}
        {mode === 'ai' && (
            <div className="p-8 animate-in fade-in slide-in-from-left-4">
                 <div className="max-w-xl mx-auto text-center space-y-6">
                     <div className="p-4 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-800/30 rounded-sm">
                         <h3 className="text-sm font-bold text-emerald-800 dark:text-emerald-400 mb-2 flex items-center justify-center gap-2">
                             <Target className="w-4 h-4"/> Rastreamento de Edital
                         </h3>
                         <p className="text-xs text-emerald-700 dark:text-emerald-500/80">
                             A Inteligência Artificial irá varrer a web em busca do edital mais recente, extraindo a banca, formato da prova e todo o conteúdo programático automaticamente.
                         </p>
                     </div>

                     <form onSubmit={handleAiSubmit} className="relative">
                         <Search className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" />
                         <input 
                            type="text" 
                            className="w-full bg-gray-50 dark:bg-black/20 border border-gray-300 dark:border-gray-600 rounded-sm py-3 pl-12 pr-4 text-sm font-mono uppercase focus:border-emerald-500 outline-none shadow-inner"
                            placeholder="Ex: POLÍCIA FEDERAL AGENTE 2024"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            autoFocus
                         />
                         <button 
                            type="submit"
                            disabled={!searchQuery.trim()}
                            className="absolute right-2 top-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-1.5 rounded-sm text-xs font-bold uppercase transition-all disabled:opacity-50"
                         >
                             Investigar
                         </button>
                     </form>
                 </div>
            </div>
        )}

        {/* --- MANUAL MODE --- */}
        {mode === 'manual' && (
            <div className="animate-in fade-in slide-in-from-right-4">
                <div className="bg-gray-100 dark:bg-black/30 p-4 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2">
                    <Target className="w-5 h-5 text-blue-600 dark:text-blue-500" />
                    <h3 className="text-sm font-bold uppercase text-gray-700 dark:text-gray-300">Definição do Alvo (Manual)</h3>
                </div>

                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Órgão / Instituição</label>
                            <input type="text" className="w-full bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-gray-600 rounded-sm p-2 text-sm font-mono uppercase focus:border-emerald-500 outline-none" placeholder="Ex: POLÍCIA FEDERAL" value={org} onChange={e => setOrg(e.target.value)} />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Cargo / Patente</label>
                            <input type="text" className="w-full bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-gray-600 rounded-sm p-2 text-sm font-mono uppercase focus:border-emerald-500 outline-none" placeholder="Ex: AGENTE" value={role} onChange={e => setRole(e.target.value)} />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Banca Examinadora</label>
                            <input type="text" className="w-full bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-gray-600 rounded-sm p-2 text-sm font-mono uppercase focus:border-emerald-500 outline-none" placeholder="Ex: CEBRASPE" value={banca} onChange={e => setBanca(e.target.value)} />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex gap-4">
                            <div className="flex-1">
                                <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Total de Questões</label>
                                <input type="number" className="w-full bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-gray-600 rounded-sm p-2 text-sm font-mono focus:border-emerald-500 outline-none" value={totalQuestions} onChange={e => setTotalQuestions(e.target.value)} />
                            </div>
                            <div className="flex-1">
                                <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Modalidade</label>
                                <select className="w-full bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-gray-600 rounded-sm p-2 text-sm font-mono focus:border-emerald-500 outline-none" value={modality} onChange={e => setModality(e.target.value as any)}>
                                    <option value="certo_errado">CERTO / ERRADO</option>
                                    <option value="multipla">MÚLTIPLA ESCOLHA</option>
                                </select>
                            </div>
                        </div>

                        <div className="bg-blue-50 dark:bg-blue-900/10 p-3 rounded-sm border border-blue-100 dark:border-blue-800/30">
                            <label className="block text-[10px] font-bold uppercase text-blue-700 dark:text-blue-500 mb-2 flex items-center gap-2">
                                <Layers className="w-3 h-3"/> Adicionar Disciplinas
                            </label>
                            <form onSubmit={handleAddSubject} className="flex gap-2">
                                <input type="text" className="flex-1 bg-white dark:bg-black/40 border border-gray-200 dark:border-gray-600 rounded-sm p-2 text-xs font-mono uppercase focus:border-emerald-500 outline-none" placeholder="Ex: DIREITO PENAL" value={currentSubject} onChange={e => setCurrentSubject(e.target.value)} />
                                <button type="submit" disabled={!currentSubject.trim()} className="bg-blue-600 text-white px-3 rounded-sm disabled:opacity-50 hover:bg-blue-500"><Plus className="w-4 h-4"/></button>
                            </form>
                        </div>
                    </div>
                </div>

                <div className="bg-gray-50 dark:bg-black/20 p-4 border-t border-gray-200 dark:border-gray-700 min-h-[100px]">
                    <h4 className="text-[10px] font-bold uppercase text-gray-400 mb-3 flex items-center gap-2">
                        <BookOpen className="w-3 h-3"/> Conteúdo Programático ({subjects.length})
                    </h4>
                    
                    {subjects.length === 0 ? (
                        <div className="text-center text-gray-400 text-xs py-4 italic border border-dashed border-gray-300 dark:border-gray-700 rounded-sm">
                            Nenhuma disciplina alocada ao edital.
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                            {subjects.map((sub, idx) => (
                                <div key={idx} className="flex justify-between items-center bg-white dark:bg-bope-gray border border-gray-200 dark:border-gray-600 px-3 py-2 rounded-sm shadow-sm animate-in zoom-in duration-200">
                                    <span className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase truncate pr-2">{sub}</span>
                                    <button onClick={() => removeSubject(idx)} className="text-gray-400 hover:text-red-500"><Trash2 className="w-3 h-3" /></button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        )}

        {/* ACTION FOOTER */}
        <div className="p-4 bg-white dark:bg-bope-gray border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <button 
                onClick={onCancel}
                disabled={!hasSavedExams}
                className="text-gray-500 hover:text-red-500 text-xs font-mono font-bold uppercase flex items-center gap-1 disabled:opacity-30 disabled:cursor-not-allowed"
            >
                <X className="w-4 h-4"/> Cancelar
            </button>

            {mode === 'manual' && (
                <button
                    onClick={handleManualSubmit}
                    disabled={!org || !role || subjects.length === 0}
                    className="bg-blue-600 hover:bg-blue-500 text-white dark:text-black px-6 py-3 rounded-sm font-bold font-mono text-sm uppercase flex items-center gap-2 shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <Shield className="w-4 h-4"/> Confirmar Dados <ChevronRight className="w-4 h-4"/>
                </button>
            )}
            
            {/* O botão do modo AI já está dentro do form para suportar enter */}
        </div>

      </div>
    </div>
  );
};

export default MissionInput;