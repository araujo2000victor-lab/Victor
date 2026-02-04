
import React from 'react';
import { Sun, Moon, Database } from 'lucide-react';

interface HeaderProps {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  onOpenSync: () => void;
  showSync: boolean;
  syncStatus: 'disconnected' | 'connecting' | 'connected';
  peerCount: number;
}

const Header: React.FC<HeaderProps> = ({ theme, toggleTheme, onOpenSync, showSync }) => {
  return (
    <header className="border-b border-gray-200 dark:border-bope-gray bg-white/80 dark:bg-bope-black/90 backdrop-blur-md sticky top-0 z-50 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* LOGO TIGRE SIBERIANO 3D */}
          <div className="relative group cursor-pointer overflow-hidden rounded-full border-2 border-gray-200 dark:border-gray-700 w-12 h-12 bg-black">
             <img 
               src="https://img.freepik.com/premium-photo/tiger-face-logo-emblem-template-mascot-lion-tiger-generative-ai_159242-23743.jpg" 
               alt="BOPE Tiger Logo" 
               className="w-full h-full object-cover hover:scale-110 transition-transform duration-300 opacity-90 hover:opacity-100"
             />
             <div className="absolute inset-0 bg-emerald-500/10 rounded-full blur-lg opacity-0 group-hover:opacity-50 transition-opacity"></div>
          </div>
          
          <div className="flex flex-col">
            <h1 className="text-xl font-stencil tracking-wider text-gray-900 dark:text-white leading-none">BOPE</h1>
            <span className="text-[10px] uppercase font-mono tracking-[0.2em] text-emerald-600 dark:text-bope-green">Gestão de Estudos</span>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
           {showSync && (
             <button
               onClick={onOpenSync}
               className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-sm transition-all border bg-gray-100 dark:bg-gray-800 border-transparent hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 group"
               title="Transferência de Dados (Uplink)"
             >
               <Database className="w-4 h-4 text-gray-500 group-hover:text-blue-500" />
               <div className="flex flex-col items-start leading-none">
                  <span className="text-[10px] font-bold uppercase text-gray-600 dark:text-gray-300 group-hover:text-blue-600">Uplink</span>
               </div>
             </button>
           )}

           <div className="hidden md:flex items-center gap-2">
             <span className="text-xs font-mono text-gray-500 dark:text-gray-500">SISTEMA: <span className="text-emerald-600 dark:text-emerald-500 font-bold">ONLINE</span></span>
           </div>
           
           <div className="h-6 w-px bg-gray-200 dark:bg-gray-800 mx-1"></div>

           <button 
             onClick={toggleTheme}
             className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-600 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-bope-green"
             title={theme === 'dark' ? "Ativar Modo Claro" : "Ativar Modo Noturno"}
           >
             {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
           </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
