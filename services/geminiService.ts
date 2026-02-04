import { GoogleGenAI, Type } from "@google/genai";
import { IntelData, SearchResult, QuizQuestion, LawFlashResult } from '../types';

// ============================================================================
// CONFIGURAÇÃO INICIAL (NOVO SDK)
// ============================================================================

// Recupera a chave de API de forma segura (previne erro se import.meta.env for undefined)
// O fallback process.env.API_KEY é garantido pelo vite.config.ts
const apiKey = (import.meta.env && import.meta.env.VITE_API_KEY) ? import.meta.env.VITE_API_KEY : process.env.API_KEY || "";

const ai = new GoogleGenAI({ apiKey });

const SYSTEM_INSTRUCTION_TEXT = `
Você é o motor de inteligência do aplicativo "BOPE - Gestão de Estudos".
Sua missão: Atuar como especialista em concursos públicos.
Responda estritamente no formato JSON solicitado quando exigido.
`;

// === ESTRATÉGIA DE FALLBACK TÁTICO ===
// Prioridade: Modelos mais novos (2.0) -> Modelos estáveis (1.5)
const MODELS_PRIORITY = [
  'gemini-2.0-flash',        // V2 Flash (Alta performance)
  'gemini-2.0-flash-lite-preview-02-05', // V2 Lite (Velocidade)
  'gemini-1.5-flash',        // V1.5 Flash (Fallback estável)
  'gemini-1.5-pro'           // V1.5 Pro (Fallback inteligente)
];

/**
 * Função Wrapper Tática
 * Tenta gerar conteúdo iterando sobre a lista de modelos.
 */
async function generateTacticalContent(params: any) {
  let lastError = null;

  for (const modelName of MODELS_PRIORITY) {
    try {
      // Configuração para o novo SDK
      const response = await ai.models.generateContent({
        ...params,
        model: modelName
      });
      
      // Retorna a resposta se sucesso
      return response;

    } catch (error: any) {
      console.warn(`[ALERTA TÁTICO] Falha no modelo ${modelName}. Alternando munição...`, error.message);
      lastError = error;
      // Continua para o próximo modelo da lista
    }
  }

  // Se todos falharem
  console.error("[FALHA CRÍTICA] Todos os modelos táticos falharam.");
  throw lastError || new Error("Sistema de inteligência indisponível no momento. Tente novamente mais tarde.");
}

// ============================================================================
// 1. ANÁLISE DE EDITAL (IntelData)
// ============================================================================
export const fetchExamIntel = async (examName: string): Promise<SearchResult> => {
  try {
    const response = await generateTacticalContent({
      contents: `Analise o concurso: ${examName}. Se não encontrar dados exatos, gere uma estimativa baseada em editais anteriores deste órgão.`,
      config: {
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
    return { data, grounding: null };

  } catch (error) {
    console.error("Erro na Inteligência:", error);
    throw new Error("Falha ao analisar o edital. Verifique o nome do concurso e tente novamente.");
  }
};

// ============================================================================
// 2. GERAÇÃO DE CONTEÚDO DE ESTUDO (HTML)
// ============================================================================
export const generateStudyContent = async (subject: string, topic: string, type: 'summary' | 'full'): Promise<string> => {
  try {
    const prompt = type === 'summary' 
      ? `Crie um resumo tático e direto (HTML) sobre: ${topic} da disciplina ${subject}. Use tópicos e negrito.`
      : `Crie uma aula completa (HTML) sobre: ${topic} da disciplina ${subject}. Inclua conceitos, exemplos e jurisprudência se aplicável.`;

    const response = await generateTacticalContent({
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION_TEXT
      }
    });

    return response.text || "<p>Erro ao gerar conteúdo.</p>";
  } catch (error) {
    return "<p>Erro de comunicação com a base tática.</p>";
  }
};

// ============================================================================
// 3. GERADOR DE QUESTÕES (Quiz)
// ============================================================================
export const generateQuizQuestions = async (examName: string, bank: string, subject: string, topic: string): Promise<QuizQuestion[]> => {
  try {
    const response = await generateTacticalContent({
      contents: `Crie 5 questões de múltipla escolha estilo banca ${bank} para o concurso ${examName}, disciplina ${subject}, assunto ${topic}.`,
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
            contents: `Selecione um artigo importante e aleatório da lei: ${lawName} (${lawUrl}). Retorne o texto do artigo, uma explicação simplificada e uma dica de memorização.`,
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
        return { article: "Sistema indisponível", summary: "Verifique conexão", isLong: false, tip: "Erro" };
    }
};

export const generatePerformanceAnalysis = async (stats: any) => {
    try {
        const response = await generateTacticalContent({
            contents: `Analise o desempenho do aluno e dê dicas táticas (HTML): ${JSON.stringify(stats)}`,
            config: { systemInstruction: SYSTEM_INSTRUCTION_TEXT }
        });
        return response.text || "Análise indisponível.";
    } catch (e) {
        return "Erro na análise.";
    }
};