import React from 'react';

const TacticalLoader: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="relative w-24 h-24">
        {/* Outer Ring */}
        <div className="absolute inset-0 border-4 border-gray-200 dark:border-gray-800 rounded-full"></div>
        {/* Spinning Ring */}
        <div className="absolute inset-0 border-t-4 border-emerald-500 dark:border-bope-green rounded-full animate-spin"></div>
        {/* Inner Crosshair */}
        <div className="absolute inset-0 flex items-center justify-center">
           <div className="w-2 h-2 bg-emerald-500 dark:bg-bope-green rounded-full animate-pulse"></div>
        </div>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -mt-1 w-0.5 h-2 bg-emerald-500/50 dark:bg-bope-green/50"></div>
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 -mb-1 w-0.5 h-2 bg-emerald-500/50 dark:bg-bope-green/50"></div>
        <div className="absolute left-0 top-1/2 -translate-y-1/2 -ml-1 w-2 h-0.5 bg-emerald-500/50 dark:bg-bope-green/50"></div>
        <div className="absolute right-0 top-1/2 -translate-y-1/2 -mr-1 w-2 h-0.5 bg-emerald-500/50 dark:bg-bope-green/50"></div>
      </div>
      <div className="mt-6 font-mono text-emerald-600 dark:text-bope-green animate-pulse tracking-widest text-sm">
        ANALISANDO EDITAL...
      </div>
      <div className="mt-2 font-mono text-gray-500 dark:text-gray-600 text-xs">
        VARRENDO BASES DE DADOS
      </div>
    </div>
  );
};

export default TacticalLoader;