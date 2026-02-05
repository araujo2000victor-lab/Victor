import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { IntelData, SearchResult, QuizQuestion } from '../types';

// ============================================================================
// 1. CONFIGURAÇÃO E SEGURANÇA
// ============================================================================

const getAIClient = () => {
    // Prioriza VITE_API_KEY (padrão Vite), fallback para process.env injetado
    const apiKey = import.meta.env.VITE_API_KEY || process.env.API_KEY;
    
    if (!apiKey) {
        console.error("API Key não encontrada. Verifique o arquivo .env");
        throw new Error("Chave de Acesso (API KEY) não identificada. Abortar missão.");
    }
    return new GoogleGenerativeAI(apiKey);
};

// LISTA DE VETORES (MODELOS) - SEM PREFIXOS
// Ordem de Batalha: Velocidade (Flash) -> Capacidade (Pro) -> Economia (8b)
const MODELS_PRIORITY = [
  'gemini-1.5-flash',
  'gemini-1.5-pro',
  'gemini-1.5-flash-8b'
];

const SYSTEM_INSTRUCTION_TEXT = `
Você é o motor de inteligência do aplicativo "BOPE - Gestão de Estudos".
Sua missão: Atuar como especialista militar em concursos públicos.
Seja direto, tático e preciso.
Quando solicitado JSON, retorne APENAS o JSON, sem markdown.
`;

// ============================================================================
// 2. UTILITÁRIOS TÁTICOS
// ============================================================================

// Delay para Backoff Exponencial
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Limpeza de resposta (Remove ```json ... ``` se a IA incluir)
const cleanJsonText = (text: string): string => {
    return text.replace(/```json/g, '').replace(/```/g, '').trim();
};

/**
 * NÚCLEO DE EXECUÇÃO TÁTICA
 * Gerencia retry, alternância de modelos e ativação de ferramentas de busca.
 */
async function generateTacticalContent(params: { 
    contents: string, 
    config?: any 
}) {
  let lastError: any = null;
  const genAI = getAIClient();

  // LOOP DE ALTERNÂNCIA DE MODELOS (FAILOVER STRATEGY)
  for (const modelName of MODELS_PRIORITY) {
    try {
        console.log(`[BOPE INTEL] Acionando vetor: ${modelName}`);

        // A. Instanciação do Modelo com Grounding (Busca Web)
        const model = genAI.getGenerativeModel({
            model: modelName,
            systemInstruction: params.config?.systemInstruction || SYSTEM_INSTRUCTION_TEXT,
            // ATIVAÇÃO DA BUSCA WEB (GROUNDING)
            // Permite que a IA busque editais recentes na internet
            tools: [{ googleSearchRetrieval: {} }]
        });

        // B. Configuração de Geração
        const generationConfig: any = {};
        
        if (params.config?.responseMimeType) {
            generationConfig.responseMimeType = params.config.responseMimeType;
        }
        
        if (params.config?.responseSchema) {
            generationConfig.responseSchema = params.config.responseSchema;
        }

        // C. Execução da Missão
        const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: params.contents }] }],
            generationConfig
        });

        return result.response;

    } catch (error: any) {
        const errMsg = error.message || JSON.stringify(error);
        lastError = error;
        
        console.warn(`[ALERTA TÁTICO] Falha no modelo ${modelName}:`, errMsg);

        // --- TRATAMENTO DE ERROS TÁTICOS ---

        // Erro 429 (Cota Excedida): Aguarda e tenta o PRÓXIMO modelo (não o mesmo)
        if (errMsg.includes('429') || errMsg.includes('quota') || errMsg.includes('Exhausted')) {
            console.log(`[SOBRECARGA] Cota estourada no ${modelName}. Alternando vetor em 2s...`);
            await wait(2000); 
            continue; // Vai para o próximo modelo da lista
        }

        // Erro 404/503 (Modelo Indisponível): Pula imediatamente
        if (errMsg.includes('404') || errMsg.includes('not found') || errMsg.includes('503')) {
            console.log(`[VETOR INVÁLIDO] ${modelName} fora de combate. Alternando...`);
            continue; 
        }

        // Erros Críticos de Autenticação (Abortar)
        if (errMsg.includes('API key') || errMsg.includes('403')) {
            throw new Error("Credencial Inválida. Verifique sua API Key no .env");
        }

        // Outros erros: Tenta o próximo modelo por garantia
    }
  }

  console.error("[FALHA DE MISSÃO] Todos os vetores falharam.", lastError);
  throw new Error("Sistema de Inteligência offline. Tente novamente em instantes.");
}

// ============================================================================
// 3. FUNÇÕES DE INTELIGÊNCIA (EXPORTS)
// ============================================================================

export const fetchExamIntel = async (query: string): Promise<SearchResult> => {
  try {
    const response = await generateTacticalContent({
      contents: `Pesquise na web pelo edital mais recente e oficial para: "${query}". 
      Extraia os dados exatos do concurso (Status, Banca, Formato).
      Se não houver edital aberto, baseie-se no último edital ou notícias recentes de 2024/2025/2026.
      
      IMPORTANTE:
      - 'status' deve ser um destes: 'Edital Publicado', 'Banca Definida', 'Autorizado' ou 'Previsto'.
      `,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            concurso_info: {
              type: SchemaType.OBJECT,
              properties: {
                nome: { type: SchemaType.STRING },
                status: { type: SchemaType.STRING },
                banca: { type: SchemaType.STRING },
                formato_prova: {
                  type: SchemaType.OBJECT,
                  properties: {
                    tipo: { type: SchemaType.STRING },
                    alternativas: { type: SchemaType.NUMBER },
                    total_questoes: { type: SchemaType.NUMBER }
                  },
                  required: ['tipo', 'alternativas', 'total_questoes']
                }
              },
              required: ['nome', 'status', 'banca', 'formato_prova']
            },
            conteudo_programatico: {
              type: SchemaType.ARRAY,
              items: {
                type: SchemaType.OBJECT,
                properties: {
                  disciplina: { type: SchemaType.STRING },
                  assuntos: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } }
                },
                required: ['disciplina', 'assuntos']
              }
            }
          },
          required: ['concurso_info', 'conteudo_programatico']
        }
      }
    });

    const text = response.text();
    if (!text) throw new Error("Resposta nula da Inteligência.");

    // Sanitização do JSON para evitar erros com markdown
    const cleanText = cleanJsonText(text);
    const data: IntelData = JSON.parse(cleanText);
    
    // Extração de metadados de Grounding (Fontes da pesquisa)
    const grounding = response.candidates?.[0]?.groundingMetadata || null;

    return { data, grounding: grounding as any };

  } catch (error: any) {
    console.error("Erro na Inteligência:", error);
    throw new Error(error.message || "Falha ao analisar o edital via Web.");
  }
};

export const generateStudyContent = async (subject: string, topic: string, type: 'summary' | 'full'): Promise<string> => {
  try {
    const prompt = type === 'summary' 
      ? `Crie um resumo tático (HTML) sobre: ${topic} da disciplina ${subject}. Use tags <h3>, <ul>, <li>, <b> para formatar. Seja conciso.`
      : `Crie uma aula completa (HTML) sobre: ${topic} da disciplina ${subject}. Seja detalhado, inclua exemplos práticos e jurisprudência se aplicável.`;

    const response = await generateTacticalContent({
      contents: prompt
    });

    return response.text();
  } catch (error: any) {
    return `<p class="text-red-500 font-bold">⚠️ Falha na comunicação tática: ${error.message}</p>`;
  }
};

export const generateQuizQuestions = async (examName: string, bank: string, subject: string, topic: string): Promise<QuizQuestion[]> => {
  try {
    const response = await generateTacticalContent({
      contents: `Crie 5 questões de múltipla escolha estilo banca ${bank} sobre ${subject}, tópico: ${topic}.
      Retorne apenas o JSON.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: SchemaType.ARRAY,
          items: {
            type: SchemaType.OBJECT,
            properties: {
              statement: { type: SchemaType.STRING },
              options: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
              correctIndex: { type: SchemaType.NUMBER },
              justification: { type: SchemaType.STRING }
            },
            required: ['statement', 'options', 'correctIndex', 'justification']
          }
        }
      }
    });

    const text = response.text();
    const cleanText = cleanJsonText(text);
    return text ? JSON.parse(cleanText) : [];
  } catch (error) {
    console.error(error);
    return [];
  }
};

export const generateLawFlash = async (lawName: string, lawUrl?: string) => {
    try {
        const response = await generateTacticalContent({
            contents: `Selecione um artigo importante de: ${lawName}. Retorne JSON com artigo, resumo e dica.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: SchemaType.OBJECT,
                    properties: {
                        article: { type: SchemaType.STRING },
                        summary: { type: SchemaType.STRING },
                        isLong: { type: SchemaType.BOOLEAN },
                        tip: { type: SchemaType.STRING }
                    },
                    required: ['article', 'summary', 'isLong', 'tip']
                }
            }
        });
        
        const text = response.text();
        const cleanText = cleanJsonText(text);
        return text ? JSON.parse(cleanText) : { article: "Erro", summary: "Tente novamente", isLong: false, tip: "Erro" };
    } catch (e) {
        return { article: "Sistema Indisponível", summary: "Aguarde recarga de cota.", isLong: false, tip: "Erro" };
    }
};

export const generatePerformanceAnalysis = async (stats: any) => {
    try {
        const response = await generateTacticalContent({
            contents: `Analise este desempenho e dê 3 dicas táticas (use HTML básico): ${JSON.stringify(stats)}`
        });
        return response.text();
    } catch (e) {
        return "Análise indisponível (Cota excedida).";
    }
};