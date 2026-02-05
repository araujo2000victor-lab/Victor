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
// Lista de modelos otimizados para o plano gratuito.
// Se um falhar (cota ou erro), o sistema puxa o próximo da lista automaticamente.
const MODELS_PRIORITY = [
  'gemini-2.0-flash',                  // 1. O mais novo, rápido e inteligente (Free)
  'gemini-2.0-flash-lite-preview-02-05', // 2. Versão Lite ultra-rápida
  'gemini-1.5-flash',                  // 3. O clássico confiável (Backup robusto)
  'gemini-1.5-flash-8b',               // 4. Versão compacta para emergências
];

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
      // Pequena pausa tática apenas se já tiver falhado o principal, para dar fôlego
      if (modelName !== MODELS_PRIORITY[0]) {
          await new Promise(resolve => setTimeout(resolve, 500));
      }

      const response = await ai.models.generateContent({
        ...params,
        model: modelName
      });
      
      return response;

    } catch (error: any) {
      console.warn(`[ALERTA TÁTICO] Falha no modelo ${modelName}. Alternando munição...`, error.message);
      lastError = error;
      
      // Se erro de autenticação, para tudo imediatamente.
      if (error.message && (error.message.includes('API key') || error.message.includes('403'))) {
         throw new Error("Chave Gemini inválida. Verifique suas credenciais.");
      }
      
      // Para erros de cota (429) ou servidor (503), o loop continua e tenta o próximo modelo da lista
    }
  }

  console.error("[FALHA CRÍTICA] Todos os modelos táticos falharam.");
  
  if (lastError?.message?.includes('429') || lastError?.message?.includes('quota')) {
      throw new Error("Sistema sobrecarregado. Aguarde 30 segundos e tente novamente (Recarregando Munição).");
  }
  throw lastError || new Error("Sistema de inteligência indisponível no momento.");
}

// ============================================================================
// 1. ANÁLISE DE EDITAL (IntelData)
// ============================================================================
export const fetchExamIntel = async (query: string): Promise<SearchResult> => {
  try {
    const response = await generateTacticalContent({
      contents: `Pesquise na web pelo edital mais recente e oficial para: "${query}". 
      Extraia os dados exatos do concurso. 
      Se o edital ainda não saiu, baseie-se no último edital publicado.
      
      IMPORTANTE:
      - 'status' deve ser: 'Edital Publicado', 'Banca Definida', 'Autorizado' ou 'Previsto'.
      - Liste todas as disciplinas principais.
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
      ? `Crie um resumo tático (HTML) sobre: ${topic} da disciplina ${subject}. Use tópicos.`
      : `Crie uma aula completa (HTML) sobre: ${topic} da disciplina ${subject}.`;

    const response = await generateTacticalContent({
      contents: prompt,
      config: { systemInstruction: SYSTEM_INSTRUCTION_TEXT }
    });

    return response.text || "<p>Erro ao gerar conteúdo.</p>";
  } catch (error: any) {
    if (error.message.includes('Cota')) return `<p class="text-red-500 font-bold">⚠️ ${error.message}</p>`;
    return "<p>Erro de comunicação com a base tática.</p>";
  }
};

// ============================================================================
// 3. GERADOR DE QUESTÕES (Quiz)
// ============================================================================
export const generateQuizQuestions = async (examName: string, bank: string, subject: string, topic: string): Promise<QuizQuestion[]> => {
  try {
    const response = await generateTacticalContent({
      contents: `Crie 5 questões múltipla escolha (${bank}) sobre ${subject}: ${topic}.`,
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
            contents: `Selecione um artigo importante de: ${lawName}. Retorne JSON.`,
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
            contents: `Analise o desempenho e dê dicas táticas (HTML curto): ${JSON.stringify(stats)}`,
            config: { systemInstruction: SYSTEM_INSTRUCTION_TEXT }
        });
        return response.text || "Análise indisponível.";
    } catch (e) {
        return "Análise indisponível (Cota excedida).";
    }
};