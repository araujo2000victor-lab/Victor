import { GoogleGenAI, Type } from "@google/genai";
import { IntelData, SearchResult, QuizQuestion, LawFlashResult } from '../types';

// ============================================================================
// CONFIGURAÇÃO DINÂMICA (LINK COM CONTA DO USUÁRIO)
// ============================================================================

// Helper para obter a instância da IA usando a chave de ambiente
const getAIClient = () => {
    // API Key must be obtained exclusively from process.env.API_KEY
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

// === ESTRATÉGIA DE FALLBACK TÁTICO ===
// Lista de modelos em ordem de prioridade para evitar falhas de disponibilidade (404)
const MODELS_PRIORITY = [
  'gemini-2.0-flash-exp',    // Experimental com suporte a tools avançado
  'gemini-2.0-flash',        // Modelo V2 padrão
  'gemini-1.5-pro',          // Fallback robusto para pesquisa
  'gemini-1.5-flash'         // Fallback rápido
];

/**
 * Função Wrapper Tática
 * Tenta gerar conteúdo iterando sobre a lista de modelos (Fallback Strategy).
 */
async function generateTacticalContent(params: any) {
  let lastError = null;
  let ai: GoogleGenAI;

  try {
      ai = getAIClient();
  } catch (e: any) {
      throw new Error(e.message);
  }

  // Loop de Fallback: Tenta cada modelo da lista sequencialmente
  for (const modelName of MODELS_PRIORITY) {
    try {
      const response = await ai.models.generateContent({
        ...params,
        model: modelName
      });
      
      return response;

    } catch (error: any) {
      console.warn(`[ALERTA TÁTICO] Falha no modelo ${modelName}. Alternando munição...`, error.message);
      lastError = error;
      
      // Se o erro for de autenticação (403) ou Chave Inválida, paramos imediatamente.
      // Erros 404 (Not Found) ou 503 (Unavailable) continuam o loop.
      if (error.message && (error.message.includes('API key') || error.message.includes('403') || error.message.includes('INVALID_ARGUMENT'))) {
          // Verificação extra: Se for explicitamente "Not Found", permitimos tentar o próximo (pode ser modelo inexistente para aquela chave/região)
          if (!error.message.includes('404') && !error.message.includes('Not Found')) {
             throw new Error("Chave Gemini inválida ou erro de permissão. Verifique suas credenciais de ambiente.");
          }
      }
    }
  }

  console.error("[FALHA CRÍTICA] Todos os modelos táticos falharam.");
  throw lastError || new Error("Sistema de inteligência indisponível no momento. Tente novamente mais tarde.");
}

// ============================================================================
// 1. ANÁLISE DE EDITAL (IntelData)
// ============================================================================
export const fetchExamIntel = async (query: string): Promise<SearchResult> => {
  try {
    const response = await generateTacticalContent({
      contents: `Pesquise na web pelo edital mais recente e oficial para: "${query}". 
      Extraia os dados exatos do concurso. 
      Se o edital ainda não saiu, baseie-se no último edital publicado ou notícias confiáveis recentes sobre a autorização.
      
      IMPORTANTE:
      - 'status' deve ser algo como: 'Edital Publicado', 'Banca Definida', 'Autorizado' ou 'Previsto'.
      - Liste todas as disciplinas (conteúdo programático) com seus principais tópicos.
      `,
      config: {
        tools: [{ googleSearch: {} }], // ATIVA A BUSCA NA WEB
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
    
    // Captura metadados de fontes (Grounding)
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
    return "<p>Erro de comunicação com a base tática. Verifique sua chave Gemini.</p>";
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
        return { article: "Sistema indisponível", summary: "Verifique sua conexão e chave Gemini.", isLong: false, tip: "Erro" };
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
        return "Erro na análise. Verifique sua chave Gemini.";
    }
};