import { GoogleGenAI, Type } from "@google/genai";
import { IntelData, SearchResult, QuizQuestion, LawFlashResult } from '../types';

// ============================================================================
// CONFIGURAÇÃO TÁTICA E INICIALIZAÇÃO
// ============================================================================

const getAIClient = () => {
    // Garante leitura correta da variável de ambiente injetada pelo Vite
    const apiKey = process.env.API_KEY; 
    if (!apiKey) {
        throw new Error("Chave Gemini não detectada. Verifique suas credenciais.");
    }
    return new GoogleGenAI({ apiKey });
};

const SYSTEM_INSTRUCTION_TEXT = `
Você é o motor de inteligência do aplicativo "BOPE - Gestão de Estudos".
Sua missão: Atuar como especialista em concursos públicos.
Responda estritamente no formato JSON solicitado quando exigido.
`;

// LISTA DE MUNIÇÃO (MODELOS)
// Removido prefixo 'models/' conforme solicitado.
// Focando na série 1.5 que é mais estável para o Free Tier atualmente.
const MODELS_PRIORITY = [
  'gemini-1.5-flash',
  'gemini-1.5-pro',
  'gemini-1.5-flash-8b'
];

// Função de espera tática (Backoff)
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function generateTacticalContent(params: any) {
  let lastError: any = null;
  
  // LOOP TÁTICO: Tenta cada modelo na lista de prioridade
  for (const modelName of MODELS_PRIORITY) {
    // Tenta até 2 vezes o mesmo modelo em caso de sobrecarga momentânea
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const ai = getAIClient();
        
        console.log(`[BOPE INTEL] Acionando modelo: ${modelName} (Tentativa ${attempt})`);
        
        // Configuração de ferramentas (Tools)
        const config = { ...params.config };
        
        // Ajuste específico para garantir que a busca funcione
        // Na lib @google/genai, a propriedade correta é 'googleSearch', não 'googleSearchRetrieval'
        if (config.tools) {
            // Garante a sintaxe correta para a lib instalada
            config.tools = config.tools.map((t: any) => t.googleSearchRetrieval ? { googleSearch: {} } : t);
        }

        const response = await ai.models.generateContent({
          ...params,
          model: modelName,
          config
        });

        // Se chegou aqui, sucesso! Retorna a resposta.
        return response;

      } catch (error: any) {
        const errMsg = error.message || JSON.stringify(error);
        lastError = error;
        
        console.warn(`[ALERTA TÁTICO] Falha no modelo ${modelName}:`, errMsg);

        // --- TRATAMENTO DE ERROS ESPECÍFICOS ---

        // 1. Erro de Autenticação (Para tudo imediatamente)
        if (errMsg.includes('API key') || errMsg.includes('403')) {
           throw new Error("Chave de Acesso Inválida ou Expirada. Verifique a API Key.");
        }

        // 2. Erro de Cota (429) - Faz Backoff e tenta novamente ou troca modelo
        if (errMsg.includes('429') || errMsg.includes('quota') || errMsg.includes('Exhausted')) {
           const delay = attempt * 2000; // 2s, 4s...
           console.log(`[ESPERA TÁTICA] Recarregando munição... Aguardando ${delay}ms.`);
           await wait(delay);
           continue; // Tenta o loop interno (mesmo modelo) novamente
        }

        // 3. Erro de Modelo Não Encontrado (404) - Troca para o próximo da lista
        if (errMsg.includes('404') || errMsg.includes('not found')) {
           console.log(`[MODELO INDISPONÍVEL] ${modelName} não encontrado. Trocando munição.`);
           break; // Sai do loop interno e vai para o próximo modelo da MODELS_PRIORITY
        }
        
        // Outros erros: Tenta próximo modelo por segurança
        break;
      }
    }
  }

  // Se chegou aqui, todos os modelos falharam
  console.error("[FALHA CRÍTICA] Todos os modelos falharam.", lastError);
  throw new Error("Sistema de Inteligência indisponível no momento. Tente novamente em 1 minuto.");
}

// ============================================================================
// 1. ANÁLISE DE EDITAL (IntelData)
// ============================================================================
export const fetchExamIntel = async (query: string): Promise<SearchResult> => {
  try {
    const response = await generateTacticalContent({
      contents: `Pesquise na web pelo edital mais recente e oficial para: "${query}". 
      Extraia os dados exatos do concurso.
      Se não houver edital aberto, baseie-se no último edital ou notícias recentes.
      
      IMPORTANTE:
      - 'status' deve ser: 'Edital Publicado', 'Banca Definida', 'Autorizado' ou 'Previsto'.
      `,
      config: {
        // Habilita a busca na web (Grounding)
        tools: [{ googleSearch: {} }], 
        systemInstruction: SYSTEM_INSTRUCTION_TEXT,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            concurso_info: {
              type: Type.OBJECT,
              properties: {
                nome: { type: Type.STRING },
                status: { type: Type.STRING },
                banca: { type: Type.STRING },
                formato_prova: {
                  type: Type.OBJECT,
                  properties: {
                    tipo: { type: Type.STRING },
                    alternativas: { type: Type.NUMBER },
                    total_questoes: { type: Type.NUMBER }
                  },
                  required: ['tipo', 'alternativas', 'total_questoes']
                }
              },
              required: ['nome', 'status', 'banca', 'formato_prova']
            },
            conteudo_programatico: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  disciplina: { type: Type.STRING },
                  assuntos: { type: Type.ARRAY, items: { type: Type.STRING } }
                },
                required: ['disciplina', 'assuntos']
              }
            }
          },
          required: ['concurso_info', 'conteudo_programatico']
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("A IA não retornou dados legíveis.");

    const data: IntelData = JSON.parse(text);
    const grounding = response.candidates?.[0]?.groundingMetadata || null;

    return { data, grounding };

  } catch (error: any) {
    console.error("Erro na Inteligência:", error);
    throw new Error(error.message || "Falha ao analisar o edital via Web.");
  }
};

// ============================================================================
// 2. GERAÇÃO DE CONTEÚDO DE ESTUDO (HTML)
// ============================================================================
export const generateStudyContent = async (subject: string, topic: string, type: 'summary' | 'full'): Promise<string> => {
  try {
    const prompt = type === 'summary' 
      ? `Crie um resumo tático (HTML) sobre: ${topic} da disciplina ${subject}. Use <h3>, <ul>, <li>, <b>.`
      : `Crie uma aula completa (HTML) sobre: ${topic} da disciplina ${subject}. Seja detalhado.`;

    const response = await generateTacticalContent({
      contents: prompt,
      config: { systemInstruction: SYSTEM_INSTRUCTION_TEXT }
    });

    return response.text || "<p>Erro ao gerar conteúdo.</p>";
  } catch (error: any) {
    return `<p class="text-red-500 font-bold">⚠️ Falha na comunicação tática: ${error.message}</p>`;
  }
};

// ============================================================================
// 3. GERADOR DE QUESTÕES (Quiz)
// ============================================================================
export const generateQuizQuestions = async (examName: string, bank: string, subject: string, topic: string): Promise<QuizQuestion[]> => {
  try {
    const response = await generateTacticalContent({
      contents: `Crie 5 questões de múltipla escolha estilo banca ${bank} sobre ${subject}, tópico: ${topic}.`,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION_TEXT,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              statement: { type: Type.STRING },
              options: { type: Type.ARRAY, items: { type: Type.STRING } },
              correctIndex: { type: Type.NUMBER },
              justification: { type: Type.STRING }
            },
            required: ['statement', 'options', 'correctIndex', 'justification']
          }
        }
      }
    });

    const text = response.text;
    return text ? JSON.parse(text) : [];
  } catch (error) {
    console.error(error);
    return [];
  }
};

// ============================================================================
// 4. FLASHCARDS DE LEI (Law Flash)
// ============================================================================
export const generateLawFlash = async (lawName: string, lawUrl?: string) => {
    try {
        const response = await generateTacticalContent({
            contents: `Selecione um artigo importante de: ${lawName}. Retorne JSON com artigo, resumo e dica.`,
            config: {
                systemInstruction: SYSTEM_INSTRUCTION_TEXT,
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        article: { type: Type.STRING },
                        summary: { type: Type.STRING },
                        isLong: { type: Type.BOOLEAN },
                        tip: { type: Type.STRING }
                    },
                    required: ['article', 'summary', 'isLong', 'tip']
                }
            }
        });
        
        const text = response.text;
        return text ? JSON.parse(text) : { article: "Erro", summary: "Tente novamente", isLong: false, tip: "Erro" };
    } catch (e) {
        return { article: "Sistema Indisponível", summary: "Aguarde recarga de cota.", isLong: false, tip: "Erro" };
    }
};

export const generatePerformanceAnalysis = async (stats: any) => {
    try {
        const response = await generateTacticalContent({
            contents: `Analise este desempenho e dê 3 dicas táticas (HTML curto): ${JSON.stringify(stats)}`,
            config: { systemInstruction: SYSTEM_INSTRUCTION_TEXT }
        });
        return response.text || "Análise indisponível.";
    } catch (e) {
        return "Análise indisponível (Cota excedida).";
    }
};