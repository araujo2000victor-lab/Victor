
import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import MissionInput from './components/MissionInput';
import TacticalLoader from './components/TacticalLoader';
import IntelReport from './components/IntelReport';
import Dashboard from './components/Dashboard';
import AuthScreen from './components/AuthScreen';
import SyncModal from './components/SyncModal';
import TacticalSaveFab from './components/TacticalSaveFab';
import { fetchExamIntel } from './services/geminiService';
import { authService } from './services/authService';
// syncService importado mas usado apenas passivamente nos modais, não inicializado globalmente
import { SearchResult, IntelData, User } from './types';
import { AlertTriangle } from 'lucide-react';

type ViewState = 'dashboard' | 'search' | 'study';

const App: React.FC = () => {
  // Auth State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // App State
  const [view, setView] = useState<ViewState>('dashboard');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [dashboardBg, setDashboardBg] = useState<string | null>(localStorage.getItem('bope_dashboard_bg'));
  
  // Data State (User Specific)
  const [activeResult, setActiveResult] = useState<SearchResult | null>(null);
  const [savedExams, setSavedExams] = useState<IntelData[]>([]);

  // Theme State
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme');
      return (savedTheme === 'light' || savedTheme === 'dark') ? savedTheme : 'light';
    }
    return 'light';
  });

  // --- BOOTSTRAP ---
  useEffect(() => {
    const sessionUser = authService.getSession();
    if (sessionUser) {
      setCurrentUser(sessionUser);
    }
    setAuthLoading(false);
  }, []);

  // Effect: Persist Saved Exams to LocalStorage
  useEffect(() => {
    if (currentUser) {
      // Load
      const userKey = `bope_user_${currentUser.id}_exams`;
      const saved = localStorage.getItem(userKey);
      if (saved) {
          const parsed = JSON.parse(saved);
          if (JSON.stringify(parsed) !== JSON.stringify(savedExams)) {
            setSavedExams(parsed);
          }
      }
    }
  }, [currentUser]); // Run on login

  // Save changes
  useEffect(() => {
    if (currentUser) {
       const userKey = `bope_user_${currentUser.id}_exams`;
       const currentStored = localStorage.getItem(userKey);
       const newDataStr = JSON.stringify(savedExams);
       
       if (currentStored !== newDataStr) {
           localStorage.setItem(userKey, newDataStr);
       }
    }
  }, [savedExams, currentUser]);

  const handleUpdateDashboardBg = (newBg: string | null) => {
      setDashboardBg(newBg);
      if (newBg) {
          localStorage.setItem('bope_dashboard_bg', newBg);
      } else {
          localStorage.removeItem('bope_dashboard_bg');
      }
  };

  const handleManualSave = () => {
      // Apenas feedback visual e garantia de escrita no disco (já acontece pelos efeitos, mas reforça)
      console.log("Salvamento manual acionado.");
  };

  // Effect: Apply Theme
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    setView('dashboard');
  };

  const handleLogout = () => {
    authService.logout();
    setCurrentUser(null);
    setActiveResult(null);
    setSavedExams([]);
    setView('dashboard');
  };

  // Logic: Actions
  // SUBSTIUIÇÃO: Função de busca removida. Agora usa entrada manual.
  const handleManualMissionStart = (data: IntelData) => {
    setActiveResult({ data, grounding: null });
    setView('study');
  };

  const handleRefreshExam = async () => {
    if (!activeResult?.data) return;
    
    // Mantemos a função de refresh via IA caso o usuário queira tentar atualizar um edital antigo,
    // mas o fluxo inicial agora é manual.
    const examName = activeResult.data.concurso_info.nome;
    setLoading(true);
    setError(null);

    try {
      const newData = await fetchExamIntel(examName);
      setActiveResult(newData);
      const idx = savedExams.findIndex(e => e.concurso_info.nome === examName);
      if (idx >= 0) {
        const newSaved = [...savedExams];
        newSaved[idx] = newData.data!;
        setSavedExams(newSaved);
      }
    } catch (err: any) {
      setError("Falha ao atualizar o edital. Verifique a conexão.");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveExam = () => {
    if (activeResult && activeResult.data) {
      const exists = savedExams.some(e => e.concurso_info.nome === activeResult.data?.concurso_info.nome);
      if (!exists) {
        setSavedExams([...savedExams, activeResult.data]);
      }
    }
  };

  const handleUpdateExam = (updatedData: IntelData) => {
    if (activeResult) {
      setActiveResult({ ...activeResult, data: updatedData });
    }
    const idx = savedExams.findIndex(e => e.concurso_info.nome === updatedData.concurso_info.nome);
    if (idx >= 0) {
      const newSaved = [...savedExams];
      newSaved[idx] = updatedData;
      setSavedExams(newSaved);
    }
  };

  const handleDeleteExam = (examName: string) => {
    const updated = savedExams.filter(e => e.concurso_info.nome !== examName);
    setSavedExams(updated);
    if (activeResult?.data?.concurso_info.nome === examName) {
      setView('dashboard');
      setActiveResult(null);
    }
  };

  const handleOpenExam = (exam: IntelData) => {
    setActiveResult({ data: exam, grounding: null });
    setView('study');
  };

  const handleBackToDashboard = () => {
    setView('dashboard');
    setActiveResult(null);
    setError(null);
  };

  const isCurrentExamSaved = activeResult?.data 
    ? savedExams.some(e => e.concurso_info.nome === activeResult.data?.concurso_info.nome)
    : false;

  const wrappedUpdate = (data: IntelData) => {
      handleUpdateExam(data);
  };
  
  if (authLoading) return null;

  if (!currentUser) {
    return (
      <AuthScreen onLoginSuccess={handleLogin} />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-bope-black text-gray-900 dark:text-gray-100 font-sans selection:bg-emerald-200 dark:selection:bg-bope-green selection:text-emerald-900 dark:selection:text-black transition-colors duration-300 pb-20">
      <Header 
        theme={theme} 
        toggleTheme={toggleTheme} 
        onOpenSync={() => setIsSyncModalOpen(true)}
        showSync={!!currentUser}
        syncStatus={'connected'} // Sempre conectado localmente agora
        peerCount={0}
      />
      
      <main className="container mx-auto relative">
        
        {view === 'dashboard' && (
          <Dashboard 
            savedExams={savedExams}
            onOpenExam={handleOpenExam}
            onDeleteExam={handleDeleteExam}
            onNewSearch={() => setView('search')}
            userId={currentUser.id}
            currentUser={currentUser}
            onLogout={handleLogout}
            background={dashboardBg}
            onUpdateBackground={handleUpdateDashboardBg}
          />
        )}

        {view === 'search' && !activeResult && (
           <div className="flex flex-col items-center justify-center min-h-[60vh]">
             <MissionInput 
                onStartMission={handleManualMissionStart} 
                onCancel={handleBackToDashboard}
                hasSavedExams={savedExams.length > 0}
             />
           </div>
        )}

        {loading && <TacticalLoader />}

        {error && (
          <div className="max-w-2xl mx-auto mt-12 p-4 bg-red-100 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-sm flex items-start gap-3 animate-in fade-in slide-in-from-bottom-2">
            <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-500 shrink-0" />
            <div>
              <h3 className="text-red-700 dark:text-red-500 font-bold font-mono">FALHA NA MISSÃO</h3>
              <p className="text-red-600 dark:text-red-400 text-sm mt-1">{error}</p>
              <button 
                onClick={() => setError(null)}
                className="mt-4 text-xs bg-red-200 hover:bg-red-300 dark:bg-red-900/40 dark:hover:bg-red-900/60 text-red-800 dark:text-red-200 px-3 py-1 rounded border border-red-300 dark:border-red-800 transition-colors"
              >
                REINICIAR SISTEMA
              </button>
            </div>
          </div>
        )}

        {view === 'study' && activeResult && activeResult.data && !loading && (
           <div className="pt-8">
             <IntelReport 
                data={activeResult.data} 
                grounding={activeResult.grounding}
                isSaved={isCurrentExamSaved}
                onSave={handleSaveExam}
                onUpdate={wrappedUpdate}
                onRefresh={handleRefreshExam}
                onDelete={() => handleDeleteExam(activeResult.data!.concurso_info.nome)}
                onBack={handleBackToDashboard}
                onSyncTrigger={() => {}} // No-op, sync é manual agora
                userId={currentUser.id}
             />
           </div>
        )}
      </main>

      {/* Floating Action Button for Manual Save (Local) */}
      {currentUser && (
        <TacticalSaveFab 
          onManualSync={handleManualSave}
          peerCount={0}
        />
      )}

      {currentUser && (
        <SyncModal 
          isOpen={isSyncModalOpen} 
          onClose={() => setIsSyncModalOpen(false)} 
          userId={currentUser.id}
        />
      )}

      {/* BACKGROUND EFFECTS */}
      <div className="fixed inset-0 pointer-events-none z-[-1] overflow-hidden">
        <div className="hidden dark:block absolute top-[20%] left-[10%] w-64 h-64 bg-bope-green/5 rounded-full blur-3xl"></div>
        <div className="hidden dark:block absolute bottom-[20%] right-[10%] w-96 h-96 bg-bope-green/5 rounded-full blur-3xl"></div>
        <div className="hidden dark:block absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-gray-800 to-transparent opacity-20"></div>
        <div className="hidden dark:block absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-gray-800 to-transparent opacity-20"></div>
      </div>
    </div>
  );
};

export default App;
