import React from 'react';
import { Plus, Trash2, Trophy, BarChart3, ChevronRight, PenTool, ImageMinus } from 'lucide-react';
import { IntelData, User } from '../types';
import Sidebar from './Sidebar';

interface DashboardProps {
  savedExams: IntelData[];
  onOpenExam: (exam: IntelData) => void;
  onDeleteExam: (examName: string) => void;
  onNewSearch: () => void;
  userId: string;
  currentUser: User | null;
  onLogout: () => void;
  background: string | null;
  onUpdateBackground: (newBg: string | null) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ savedExams, onOpenExam, onDeleteExam, onNewSearch, userId, currentUser, onLogout, background, onUpdateBackground }) => {
  
  // Helper to calculate progress directly from storage for the card view
  const getProgress = (examName: string, totalTopics: number) => {
    if (totalTopics === 0) return 0;
    try {
      // Use user-specific key
      const storageKey = `bope_user_${userId}_progress_${examName.replace(/\s+/g, '_').toLowerCase()}`;
      const saved = localStorage.getItem(storageKey);
      if (!saved) return 0;
      
      const progressMap = JSON.parse(saved);
      let completedCount = 0;
      
      // Flatten the map to count completed items
      Object.values(progressMap).forEach((subjectTopics: any) => {
        Object.values(subjectTopics).forEach((status) => {
          if (status === 'completed' || status === 'mastered') completedCount++;
        });
      });
      
      return Math.round((completedCount / totalTopics) * 100);
    } catch (e) {
      return 0;
    }
  };

  const handleBgChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
              onUpdateBackground(reader.result as string);
          };
          reader.readAsDataURL(file);
      }
  };

  const handleRemoveBg = () => {
      if(confirm("Remover imagem de fundo e voltar ao padrão tático?")) {
          onUpdateBackground(null);
      }
  };

  return (
    <div className="relative flex flex-col md:flex-row min-h-[calc(100vh-64px)]">
      
      {/* BACKGROUND RENDERER - NITIDEZ 90% */}
      {background && (
          <div className="absolute inset-0 z-0 pointer-events-none opacity-90 transition-opacity duration-500" style={{
              backgroundImage: `url(${background})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundAttachment: 'fixed'
          }}>
              {/* Leve overlay para garantir leitura do texto, mas mantendo imagem nítida */}
              <div className="absolute inset-0 bg-white/10 dark:bg-black/20"></div>
          </div>
      )}

      {/* FLOATING TOOLS FOR BG CHANGE */}
      <div className="absolute bottom-6 left-6 z-50 flex gap-2">
          <label className="cursor-pointer bg-white dark:bg-bope-gray border border-gray-200 dark:border-gray-700 p-3 rounded-full shadow-lg hover:shadow-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all flex items-center justify-center group" title="Alterar Plano de Fundo">
              <PenTool className="w-5 h-5 text-gray-500 group-hover:text-emerald-600 dark:text-gray-400 dark:group-hover:text-bope-green" />
              <input type="file" id="bg-upload" name="background" className="hidden" accept="image/*" onChange={handleBgChange} />
          </label>
          
          {background && (
              <button 
                onClick={handleRemoveBg}
                className="bg-white dark:bg-bope-gray border border-gray-200 dark:border-gray-700 p-3 rounded-full shadow-lg hover:shadow-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-all flex items-center justify-center group" 
                title="Remover Fundo"
              >
                  <ImageMinus className="w-5 h-5 text-gray-500 group-hover:text-red-600 dark:text-gray-400 dark:group-hover:text-red-500" />
              </button>
          )}
      </div>

      {/* SIDEBAR AREA */}
      <div className="w-full md:w-80 flex-shrink-0 border-r border-gray-200 dark:border-gray-800 bg-white/95 dark:bg-bope-black/80 backdrop-blur-md relative z-10">
         <Sidebar savedExams={savedExams} userId={userId} currentUser={currentUser} onLogout={onLogout} />
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 p-4 md:p-8 overflow-y-auto relative z-10">
        <div className="flex flex-col md:flex-row justify-between items-end mb-8 gap-4">
          <div className="bg-white/90 dark:bg-black/60 backdrop-blur-md p-4 rounded-sm border border-gray-100 dark:border-gray-800 shadow-sm">
            <h2 className="text-3xl font-stencil text-gray-900 dark:text-white uppercase tracking-wider shadow-black drop-shadow-sm">
              Quartel General
            </h2>
            <p className="text-gray-500 dark:text-gray-400 font-mono text-sm mt-1">
              {savedExams.length} {savedExams.length === 1 ? 'MISSÃO ATIVA' : 'MISSÕES ATIVAS'}
            </p>
          </div>
          
          <button
            onClick={onNewSearch}
            className="bg-emerald-600 dark:bg-bope-green hover:bg-emerald-500 dark:hover:bg-emerald-400 text-white dark:text-black font-bold font-mono text-sm px-6 py-3 rounded-sm uppercase tracking-wider flex items-center gap-2 transition-all shadow-md hover:shadow-lg backdrop-blur-sm"
          >
            <Plus className="w-5 h-5" />
            Nova Operação
          </button>
        </div>

        {savedExams.length === 0 ? (
          <div className="border-2 border-dashed border-gray-300 dark:border-gray-700/50 rounded-lg p-12 text-center flex flex-col items-center justify-center bg-gray-50/90 dark:bg-bope-gray/80 backdrop-blur-md shadow-xl">
            <Trophy className="w-16 h-16 text-gray-400 dark:text-gray-600 mb-4" />
            <h3 className="text-xl font-bold text-gray-700 dark:text-gray-300 font-mono mb-2">NENHUMA MISSÃO EM ANDAMENTO</h3>
            <p className="text-gray-500 dark:text-gray-500 max-w-md mx-auto mb-6">
              O banco de dados tático está vazio. Inicie uma nova operação para rastrear editais e planejar seus estudos.
            </p>
            <button
              onClick={onNewSearch}
              className="text-emerald-600 dark:text-bope-green hover:underline font-mono uppercase text-sm"
            >
              + Iniciar Rastreamento
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {savedExams.map((exam, idx) => {
              // Calculate total topics for percentage
              let totalTopics = 0;
              exam.conteudo_programatico.forEach(s => totalTopics += s.assuntos.length);
              const progress = getProgress(exam.concurso_info.nome, totalTopics);

              return (
                <div 
                  key={idx}
                  className="group relative bg-white/95 dark:bg-bope-gray/90 backdrop-blur-md border border-gray-200 dark:border-gray-800 hover:border-emerald-500 dark:hover:border-bope-green rounded-sm transition-all duration-300 shadow-sm dark:shadow-none hover:shadow-md flex flex-col"
                >
                  <div className="p-6 flex-1 cursor-pointer" onClick={() => onOpenExam(exam)}>
                    <div className="flex justify-between items-start mb-4">
                      <span className="inline-block px-2 py-1 text-[10px] font-mono font-bold uppercase rounded bg-gray-100 dark:bg-black/40 text-gray-600 dark:text-gray-400">
                        {exam.concurso_info.banca}
                      </span>
                      <span className={`text-[10px] font-mono font-bold uppercase ${exam.concurso_info.status.includes('Aberto') ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-bope-gold'}`}>
                        {exam.concurso_info.status}
                      </span>
                    </div>
                    
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white leading-tight mb-2 line-clamp-2 group-hover:text-emerald-600 dark:group-hover:text-bope-green transition-colors uppercase">
                      {exam.concurso_info.nome}
                    </h3>
                    
                    <div className="mt-6">
                      <div className="flex justify-between text-xs font-mono text-gray-500 mb-1">
                        <span className="flex items-center gap-1"><BarChart3 className="w-3 h-3" /> PROGRESSO</span>
                        <span className="text-gray-900 dark:text-white font-bold">{progress}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-emerald-500 dark:bg-bope-green transition-all duration-500" 
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-gray-100 dark:border-gray-800 p-3 flex justify-between items-center bg-gray-50/50 dark:bg-black/20">
                    <button 
                      onClick={(e) => { e.stopPropagation(); onDeleteExam(exam.concurso_info.nome); }}
                      className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                      title="Abortar Missão (Excluir)"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => onOpenExam(exam)}
                      className="flex items-center gap-1 text-xs font-bold font-mono text-emerald-600 dark:text-bope-green uppercase hover:underline"
                    >
                      Acessar Área <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;