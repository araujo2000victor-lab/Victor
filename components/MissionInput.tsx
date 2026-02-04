import React, { useState } from 'react';
import { ChevronRight, Plus, Trash2, Shield, Target, BookOpen, Layers, X } from 'lucide-react';
import { IntelData } from '../types';

interface MissionInputProps {
  onStartMission: (data: IntelData) => void;
  onCancel: () => void;
  hasSavedExams: boolean;
}

const MissionInput: React.FC<MissionInputProps> = ({ onStartMission, onCancel, hasSavedExams }) => {
  // Passo 1: Dados Básicos
  const [org, setOrg] = useState('');
  const [role, setRole] = useState('');
  const [banca, setBanca] = useState('');
  const [totalQuestions, setTotalQuestions] = useState('120');
  const [modality, setModality] = useState<'multipla' | 'certo_errado'>('certo_errado');
  
  // Passo 2: Disciplinas
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

  const handleSubmit = () => {
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

  return (
    <div className="w-full max-w-4xl mx-auto my-8 px-4 animate-in fade-in zoom-in duration-300">
      
      <div className="text-center mb-8">
        <h2 className="text-2xl md:text-3xl font-stencil tracking-wider mb-2 text-gray-900 dark:text-white uppercase">
          Configurar Nova Operação
        </h2>
        <p className="text-gray-500 dark:text-gray-400 font-mono text-xs uppercase tracking-widest">
          Entrada Manual de Inteligência
        </p>
      </div>

      <div className="bg-white dark:bg-bope-gray border border-gray-200 dark:border-gray-700 shadow-xl rounded-sm overflow-hidden">
        
        {/* HEADER FORM */}
        <div className="bg-gray-100 dark:bg-black/30 p-4 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2">
            <Target className="w-5 h-5 text-emerald-600 dark:text-bope-green" />
            <h3 className="text-sm font-bold uppercase text-gray-700 dark:text-gray-300">Definição do Alvo</h3>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* COLUNA 1: DADOS DO CONCURSO */}
            <div className="space-y-4">
                <div>
                    <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Órgão / Instituição</label>
                    <input 
                        type="text" 
                        className="w-full bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-gray-600 rounded-sm p-2 text-sm font-mono uppercase focus:border-emerald-500 outline-none"
                        placeholder="Ex: POLÍCIA FEDERAL"
                        value={org}
                        onChange={e => setOrg(e.target.value)}
                        autoFocus
                    />
                </div>
                <div>
                    <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Cargo / Patente</label>
                    <input 
                        type="text" 
                        className="w-full bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-gray-600 rounded-sm p-2 text-sm font-mono uppercase focus:border-emerald-500 outline-none"
                        placeholder="Ex: AGENTE"
                        value={role}
                        onChange={e => setRole(e.target.value)}
                    />
                </div>
                <div>
                    <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Banca Examinadora</label>
                    <input 
                        type="text" 
                        className="w-full bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-gray-600 rounded-sm p-2 text-sm font-mono uppercase focus:border-emerald-500 outline-none"
                        placeholder="Ex: CEBRASPE"
                        value={banca}
                        onChange={e => setBanca(e.target.value)}
                    />
                </div>
            </div>

            {/* COLUNA 2: FORMATO DA PROVA */}
            <div className="space-y-4">
                <div className="flex gap-4">
                    <div className="flex-1">
                        <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Total de Questões</label>
                        <input 
                            type="number" 
                            className="w-full bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-gray-600 rounded-sm p-2 text-sm font-mono focus:border-emerald-500 outline-none"
                            value={totalQuestions}
                            onChange={e => setTotalQuestions(e.target.value)}
                        />
                    </div>
                    <div className="flex-1">
                        <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Modalidade</label>
                        <select 
                            className="w-full bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-gray-600 rounded-sm p-2 text-sm font-mono focus:border-emerald-500 outline-none"
                            value={modality}
                            onChange={e => setModality(e.target.value as any)}
                        >
                            <option value="certo_errado">CERTO / ERRADO</option>
                            <option value="multipla">MÚLTIPLA ESCOLHA</option>
                        </select>
                    </div>
                </div>

                {/* DISCIPLINAS INPUT */}
                <div className="bg-emerald-50 dark:bg-emerald-900/10 p-3 rounded-sm border border-emerald-100 dark:border-emerald-800/30">
                    <label className="block text-[10px] font-bold uppercase text-emerald-700 dark:text-emerald-500 mb-2 flex items-center gap-2">
                        <Layers className="w-3 h-3"/> Adicionar Disciplinas
                    </label>
                    <form onSubmit={handleAddSubject} className="flex gap-2">
                        <input 
                            type="text" 
                            className="flex-1 bg-white dark:bg-black/40 border border-gray-200 dark:border-gray-600 rounded-sm p-2 text-xs font-mono uppercase focus:border-emerald-500 outline-none"
                            placeholder="Ex: DIREITO PENAL"
                            value={currentSubject}
                            onChange={e => setCurrentSubject(e.target.value)}
                        />
                        <button 
                            type="submit"
                            disabled={!currentSubject.trim()}
                            className="bg-emerald-600 text-white px-3 rounded-sm disabled:opacity-50 hover:bg-emerald-500"
                        >
                            <Plus className="w-4 h-4"/>
                        </button>
                    </form>
                </div>
            </div>
        </div>

        {/* LISTA DE DISCIPLINAS */}
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
                            <button onClick={() => removeSubject(idx)} className="text-gray-400 hover:text-red-500">
                                <Trash2 className="w-3 h-3" />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>

        {/* ACTION FOOTER */}
        <div className="p-4 bg-white dark:bg-bope-gray border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <button 
                onClick={onCancel}
                disabled={!hasSavedExams}
                className="text-gray-500 hover:text-red-500 text-xs font-mono font-bold uppercase flex items-center gap-1 disabled:opacity-30 disabled:cursor-not-allowed"
            >
                <X className="w-4 h-4"/> Cancelar
            </button>

            <button
                onClick={handleSubmit}
                disabled={!org || !role || subjects.length === 0}
                className="bg-emerald-600 hover:bg-emerald-500 text-white dark:text-black px-6 py-3 rounded-sm font-bold font-mono text-sm uppercase flex items-center gap-2 shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <Shield className="w-4 h-4"/> Confirmar Operação <ChevronRight className="w-4 h-4"/>
            </button>
        </div>

      </div>
    </div>
  );
};

export default MissionInput;