
import React, { useState } from 'react';
import { X, UploadCloud, DownloadCloud, Copy, Check, ArrowRight, Database } from 'lucide-react';
import { syncService } from '../services/syncService';

interface SyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
}

const SyncModal: React.FC<SyncModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'send' | 'receive'>('send');
  const [generatedCode, setGeneratedCode] = useState('');
  const [inputCode, setInputCode] = useState('');
  const [statusMsg, setStatusMsg] = useState<{type: 'success'|'error', text: string} | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleGenerate = () => {
      const code = syncService.generateTransferCode();
      setGeneratedCode(code);
      setCopied(false);
  };

  const handleCopy = () => {
      navigator.clipboard.writeText(generatedCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
  };

  const handleImport = () => {
      if (!inputCode.trim()) return;
      
      const result = syncService.processTransferCode(inputCode.trim());
      if (result.success) {
          setStatusMsg({ type: 'success', text: `${result.message} Recarregando sistema...` });
      } else {
          setStatusMsg({ type: 'error', text: result.message });
      }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-bope-gray w-full max-w-2xl rounded-sm shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="p-4 bg-gray-50 dark:bg-black/40 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <div>
             <h3 className="text-lg font-bold uppercase text-gray-900 dark:text-white flex items-center gap-2">
               <Database className="w-5 h-5 text-emerald-600 dark:text-bope-green" />
               Uplink de Dados Táticos
             </h3>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-red-500">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700">
            <button 
              onClick={() => setActiveTab('send')}
              className={`flex-1 py-4 text-sm font-bold uppercase flex items-center justify-center gap-2 transition-colors ${activeTab === 'send' ? 'bg-emerald-50 dark:bg-emerald-900/10 text-emerald-700 dark:text-emerald-400 border-b-2 border-emerald-500' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
            >
                <UploadCloud className="w-4 h-4" /> Enviar Dados (Gerar Link)
            </button>
            <button 
              onClick={() => setActiveTab('receive')}
              className={`flex-1 py-4 text-sm font-bold uppercase flex items-center justify-center gap-2 transition-colors ${activeTab === 'receive' ? 'bg-blue-50 dark:bg-blue-900/10 text-blue-700 dark:text-blue-400 border-b-2 border-blue-500' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
            >
                <DownloadCloud className="w-4 h-4" /> Receber Dados (Importar)
            </button>
        </div>

        {/* Content */}
        <div className="p-6 min-h-[300px]">
            
            {/* ENVIAR */}
            {activeTab === 'send' && (
                <div className="space-y-4 animate-in fade-in slide-in-from-left-4">
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                        Esta função gera um <strong>Código Tático</strong> contendo todo o seu progresso atual. Copie este código e use a função "Receber Dados" em outro dispositivo.
                    </p>
                    
                    {!generatedCode ? (
                        <button onClick={handleGenerate} className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold uppercase rounded-sm shadow-md transition-all">
                            Gerar Código de Transferência
                        </button>
                    ) : (
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase text-emerald-600 dark:text-bope-green">Código Gerado com Sucesso</label>
                            <div className="relative">
                                <textarea 
                                    readOnly 
                                    value={generatedCode} 
                                    className="w-full h-32 p-3 bg-gray-100 dark:bg-black/30 border border-gray-300 dark:border-gray-600 rounded-sm font-mono text-[10px] text-gray-600 dark:text-gray-400 resize-none focus:outline-none"
                                />
                                <button 
                                  onClick={handleCopy}
                                  className="absolute top-2 right-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 p-2 rounded shadow-sm hover:bg-gray-50"
                                >
                                    {copied ? <Check className="w-4 h-4 text-emerald-500"/> : <Copy className="w-4 h-4 text-gray-500"/>}
                                </button>
                            </div>
                            <p className="text-[10px] text-gray-400 italic text-center">Copie e cole este código na aba "Receber Dados" do outro dispositivo.</p>
                        </div>
                    )}
                </div>
            )}

            {/* RECEBER */}
            {activeTab === 'receive' && (
                <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                         Cole aqui o código gerado em outro dispositivo. O sistema irá processar e atualizar seu banco de dados local manualmente (Sem IA).
                    </p>

                    <textarea 
                        value={inputCode}
                        onChange={(e) => setInputCode(e.target.value)}
                        placeholder="Cole o código tático aqui..."
                        className="w-full h-32 p-3 bg-white dark:bg-black/30 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-sm font-mono text-xs focus:border-blue-500 focus:ring-0 transition-colors resize-none"
                    />

                    {statusMsg && (
                        <div className={`p-3 rounded-sm text-xs font-bold ${statusMsg.type === 'success' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                            {statusMsg.text}
                        </div>
                    )}

                    <button 
                        onClick={handleImport}
                        disabled={!inputCode.trim()}
                        className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-400 text-white font-bold uppercase rounded-sm shadow-md transition-all flex items-center justify-center gap-2"
                    >
                        Processar e Sincronizar <ArrowRight className="w-4 h-4"/>
                    </button>
                </div>
            )}

        </div>
      </div>
    </div>
  );
};

export default SyncModal;
