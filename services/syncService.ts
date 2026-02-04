
// Serviço de Sincronização Manual (Uplink)
// Funciona 100% Offline via transferência de código Base64.
// NÃO utiliza Inteligência Artificial para evitar sobrecarga de API.

export const syncService = {
  /**
   * Coleta TODOS os dados do LocalStorage relacionados ao BOPE
   * Compacta em uma string Base64 para transferência.
   */
  generateTransferCode: (): string => {
    const data: Record<string, any> = {};
    
    // Varre o storage em busca de chaves do sistema
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('bope_') || key === 'theme')) {
            const val = localStorage.getItem(key);
            if (val) {
                try {
                    // Tenta parsear JSON para minificar se possível, senão guarda string
                    data[key] = JSON.parse(val);
                } catch {
                    data[key] = val;
                }
            }
        }
    }

    // Adiciona metadados de controle
    const packet = {
        timestamp: Date.now(),
        version: '2.1', // Versão manual atualizada
        payload: data
    };

    // Serializa e codifica em Base64 (Simulando um hash/link)
    // UTF-8 Safe Base64 encoding
    const jsonString = JSON.stringify(packet);
    const encoded = btoa(unescape(encodeURIComponent(jsonString)));
    
    return encoded;
  },

  /**
   * Recebe o código, decodifica e funde com os dados atuais.
   * Processamento puramente local (Algoritmo de Mesclagem).
   */
  processTransferCode: (code: string): { success: boolean, message: string, count: number } => {
    try {
        if (!code) throw new Error("Código vazio.");

        // Decode
        const jsonString = decodeURIComponent(escape(atob(code)));
        const packet = JSON.parse(jsonString);

        if (!packet.payload) throw new Error("Formato de código inválido.");

        let updateCount = 0;
        const incomingData = packet.payload;

        // Algoritmo de Mesclagem Local
        // Itera sobre os dados recebidos e atualiza o storage
        Object.keys(incomingData).forEach(key => {
            const incomingValue = incomingData[key];
            
            // Sobrescreve localmente com os dados do código (Prioridade para o Uplink)
            localStorage.setItem(key, typeof incomingValue === 'string' ? incomingValue : JSON.stringify(incomingValue));
            updateCount++;
        });

        // Disparar evento para atualizar a UI
        window.dispatchEvent(new Event('storage'));
        window.location.reload(); // Recarregar para garantir estado limpo

        return { success: true, message: "Dados processados localmente com sucesso.", count: updateCount };

    } catch (e: any) {
        console.error("Erro ao processar código:", e);
        return { success: false, message: "Código inválido ou corrompido.", count: 0 };
    }
  },

  // Stubs para compatibilidade
  initialize: (user: any) => {},
  onStatusChange: (cb: any) => { cb('disconnected', 0); return () => {}; },
  onSync: (cb: any) => { return () => {}; },
  broadcastUpdate: () => {} 
};
