import { GoogleGenAI, Type } from "@google/genai";
import { IntelData, SearchResult, QuizQuestion, LawFlashResult } from '../types';

// ============================================================================
// CONFIGURAÇÃO TÁTICA
// ============================================================================

const getAIClient = () => {
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

// Lista de modelos priorizando velocidade e estabilidade (Free Tier)
// Se o 2.0-flash falhar (429/404), tentamos o 1.5-flash
const MODELS_PRIORITY = [
  'gemini-2.0-flash', 
  'gemini-1.5-flash',
  'gemini-1.5-pro'
];

// Função de espera tática (Backoff)
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function generateTacticalContent(params: any) {
  let lastError: any = null;
  
  // Tenta cada modelo na lista de prioridade
  for (const modelName of MODELS_PRIORITY) {
    // Tentativas por modelo (Retry Logic)
    // Tenta 3 vezes o mesmo modelo se der erro de Cota (429) antes de trocar
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const ai = getAIClient();
        
        console.log(`[BOPE INTEL] Disparando requisição. Modelo: ${modelName} (Tentativa ${attempt})`);
        
        // Configuração específica para busca se solicitada
        const config = { ...params.config };
        
        // Se usar googleSearch, garante que está configurado corretamente para o modelo
        if (config.tools && config.tools.some((t: any) => t.googleSearch)) {
            // Ajuste fino se necessário para modelos específicos
        }

        const response = await ai.models.generateContent({
          ...params,
          model: modelName,
          config
        });

        // Sucesso na extração
        return response;

      } catch (error: any) {
        const errMsg = error.message || '';
        lastError = error;
        
        console.warn(`[ALERTA TÁTICO] Erro no modelo ${modelName}:`, errMsg);

        // Se for erro de COTA (429) ou Serviço Indisponível (503)
        if (errMsg.includes('429') || errMsg.includes('503') || errMsg.includes('quota')) {
           const delay = attempt * 2000; // 2s, 4s, 6s...
           console.log(`[ESPERA TÁTICA] Recarregando munição... Aguardando ${delay}ms.`);
           await wait(delay);
           continue; // Tenta o mesmo modelo novamente
        }

        // Se for 404 (Modelo não encontrado ou API Key sem acesso a ele), aborta este modelo e vai para o próximo
        if (errMsg.includes('404') || errMsg.includes('not found')) {
           console.log(`[MODELO INCOMPATÍVEL] ${modelName} não disponível. Trocando munição.`);
           break; // Sai do loop de tentativas deste modelo e vai para o próximo modelo da lista
        }

        // Se for erro de autenticação, para tudo
        if (errMsg.includes('API key') || errMsg.includes('403')) {
           throw new Error("Chave de Acesso Inválida. Verifique a API Key.");
        }
        
        // Outros erros, tenta próximo modelo
        break;
      }
    }
  }

  // Se chegou aqui, todos os modelos falharam
  console.error("[FALHA CRÍTICA] Todos os modelos falharam.", lastError);
  throw new Error("Sistema de Inteligência sobrecarregado. Tente novamente em 1 minuto.");
}

// ============================================================================
// 1. ANÁLISE DE EDITAL (IntelData)
// ============================================================================
export const fetchExamIntel = async (query: string): Promise<SearchResult> => {
  try {
    const response = await generateTacticalContent({
      contents: `Pesquise na web pelo edital mais recente e oficial para: "${query}". 
      Extraia os dados exatos do concurso.
      Se não houver edital aberto, baseie-se no último edital.
      
      IMPORTANTE:
      - 'status' deve ser: 'Edital Publicado', 'Banca Definida', 'Autorizado' ou 'Previsto'.
      `,
      config: {
        tools: [{ googleSearch: {} }], // Ferramenta de busca oficial do @google/genai
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