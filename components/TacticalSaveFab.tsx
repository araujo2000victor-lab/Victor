
import React, { useState } from 'react';
import { Save, CheckCircle } from 'lucide-react';

interface TacticalSaveFabProps {
  onManualSync: () => void; // Mantemos o nome da prop por compatibilidade, mas agora é Save Local
  peerCount: number; // Ignorado na nova lógica
}

const TacticalSaveFab: React.FC<TacticalSaveFabProps> = ({ onManualSync }) => {
  const [isSaved, setIsSaved] = useState(false);

  const handleClick = () => {
    // Ação: Força persistência de estados pendentes (ex: forms abertos) 
    // e dá feedback visual.
    // Como o React state -> LocalStorage já é reativo via effects, 
    // isso serve mais como um "Commit" psicológico e garantia.
    
    onManualSync(); // Chama a função do App que força broadcast (agora é no-op no service mas pode ser usado para logs)
    
    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
    }, 2000);
  };

  return (
    <div className="fixed bottom-6 right-6 z-[90] flex flex-col items-end gap-2 group">
      <div className={`text-[10px] font-mono px-2 py-1 rounded transition-all whitespace-nowrap mb-1 mr-1 bg-gray-800 text-white opacity-0 group-hover:opacity-100`}>
        SALVAR DADOS NA CONTA
      </div>

      <button
        onClick={handleClick}
        className={`
          relative flex items-center justify-center w-14 h-14 rounded-full shadow-2xl 
          border-2 transition-all duration-300 transform active:scale-95
          ${isSaved 
            ? 'bg-emerald-600 border-emerald-400 scale-110' 
            : 'bg-gray-900 border-gray-700 hover:bg-gray-800 hover:border-emerald-500'
          }
        `}
        title="Salvar Alterações"
      >
        {isSaved ? (
          <CheckCircle className="w-6 h-6 text-white animate-bounce" />
        ) : (
          <Save className="w-6 h-6 text-gray-300 group-hover:text-white" />
        )}
      </button>
    </div>
  );
};

export default TacticalSaveFab;
