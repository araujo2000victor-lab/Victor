import { GoogleGenAI, Type } from "@google/genai";
import { IntelData, SearchResult, QuizQuestion, LawFlashResult } from '../types';

// ============================================================================
// CONFIGURAÇÃO DINÂMICA (LINK COM CONTA DO USUÁRIO)
// ============================================================================

const getAIClient = () => {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
        throw new Error("Chave Gemini não configurada no ambiente (process.env.API_KEY).");
    }
    return new GoogleGenAI({ apiKey });
};

const SYSTEM_INSTRUCTION_TEXT = `
Você é o motor de inteligência do aplicativo "BOPE - Gestão de Estudos".
Sua missão: Atuar como especialista em concursos públicos.
Responda estritamente no formato JSON solicitado quando exigido.
`;

// === ESTRATÉGIA DE MUNIÇÃO INFINITA (FREE TIER) ===
// Lista de modelos estáveis. Evitamos versões com data específica (-02-05) que expiram rápido.
const MODELS_PRIORITY = [
  'gemini-2.0-flash',        // O mais rápido e moderno
  'gemini-1.5-flash',        // O "cavalo de batalha" confiável (Fallback principal)
  'gemini-1.5-flash-latest', // Alias para garantir a última versão do 1.5
  'gemini-1.5-pro-latest'    // Último recurso (mais lento, mas potente)
];

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function generateTacticalContent(params: any) {
  let lastError = null;
  let ai: GoogleGenAI;

  try {
      ai = getAIClient();
  } catch (e: any) {
      throw new Error(e.message);
  }

  for (const modelName of MODELS_PRIORITY) {
    try {
      // Pequena pausa tática inicial para não bombardear a API
      if (modelName !== MODELS_PRIORITY[0]) {
          await sleep(1000); 
      }

      console.log(`[BOPE INTEL] Tentando contato via frequência: ${modelName}...`);
      
      const response = await ai.models.generateContent({
        ...params,
        model: modelName
      });
      
      return response;

    } catch (error: any) {
      const errMsg = error.message || '';
      
      console.warn(`[ALERTA TÁTICO] Falha no modelo ${modelName}.`, errMsg);
      lastError = error;
      
      // Tratamento de Cota Excedida (429)
      if (errMsg.includes('429') || errMsg.includes('quota')) {
         console.warn("Cota excedida no modelo. Aguardando recarga tática (3s)...");
         await sleep(3000); // Espera 3 segundos antes de tentar o próximo modelo
         continue; 
      }

      // Tratamento de Modelo não encontrado (404)
      if (errMsg.includes('404') || errMsg.includes('not found')) {
          console.warn(`Modelo ${modelName} não disponível nesta região/chave. Pulando...`);
          continue; // Tenta o próximo imediatamente
      }

      // Se erro de autenticação, abortar missão
      if (errMsg.includes('API key') || errMsg.includes('403')) {
         throw new Error("Chave Gemini inválida ou permissão negada. Verifique suas credenciais.");
      }
    }
  }

  console.error("[FALHA CRÍTICA] Todos os modelos táticos falharam.");
  
  if (lastError?.message?.includes('429') || lastError?.message?.includes('quota')) {
      throw new Error("Sobrecarga de tráfego tático (Erro 429). Aguarde 1 minuto e tente novamente.");
  }
  
  throw lastError || new Error("Sistema de inteligência indisponível. Verifique sua conexão.");
}

// ============================================================================
// 1. ANÁLISE DE EDITAL (IntelData)
// ============================================================================
export const fetchExamIntel = async (query: string): Promise<SearchResult> => {
  try {
    const response = await generateTacticalContent({
      contents: `Pesquise na web pelo edital mais recente e oficial para: "${query}". 
      Extraia os dados exatos do concurso. 
      Se o edital ainda não saiu, baseie-se no último edital publicado ou notícias confiáveis recentes.
      
      IMPORTANTE:
      - 'status' deve ser: 'Edital Publicado', 'Banca Definida', 'Autorizado' ou 'Previsto'.
      - Liste todas as disciplinas principais e seus tópicos.
      `,
      config: {
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
    if (!text) throw new Error("Resposta vazia da IA");

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
      ? `Crie um resumo tático (HTML) sobre: ${topic} da disciplina ${subject}. Use tópicos, negrito e seja direto.`
      : `Crie uma aula completa (HTML) sobre: ${topic} da disciplina ${subject}. Inclua conceitos, exemplos práticos e jurisprudência se aplicável.`;

    const response = await generateTacticalContent({
      contents: prompt,
      config: { systemInstruction: SYSTEM_INSTRUCTION_TEXT }
    });

    return response.text || "<p>Erro ao gerar conteúdo.</p>";
  } catch (error: any) {
    if (error.message.includes('Cota') || error.message.includes('429')) return `<p class="text-red-500 font-bold">⚠️ Sistema sobrecarregado (Cota). Tente novamente em alguns segundos.</p>`;
    return `<p>Erro de comunicação com a base tática: ${error.message}</p>`;
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
            contents: `Selecione um artigo importante de: ${lawName}. Retorne JSON com o artigo, resumo e dica.`,
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
            contents: `Analise este desempenho de estudo e dê 3 dicas táticas (HTML curto): ${JSON.stringify(stats)}`,
            config: { systemInstruction: SYSTEM_INSTRUCTION_TEXT }
        });
        return response.text || "Análise indisponível.";
    } catch (e) {
        return "Análise indisponível (Cota excedida).";
    }
};