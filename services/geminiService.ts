import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { IntelData, SearchResult, QuizQuestion } from '../types';

// ============================================================================
// CONFIGURAÇÃO TÁTICA (ARQUITETURA V2)
// ============================================================================

const getAIClient = () => {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
        throw new Error("Chave de Acesso (API KEY) não identificada. Abortar missão.");
    }
    return new GoogleGenerativeAI(apiKey);
};

// MUNIÇÃO PADRÃO (SEM PREFIXO 'models/')
// Prioridade: Velocidade -> Capacidade -> Economia
const MODELS_PRIORITY = [
  'gemini-1.5-flash',
  'gemini-1.5-pro',
  'gemini-1.5-flash-8b'
];

const SYSTEM_INSTRUCTION_TEXT = `
Você é o motor de inteligência do aplicativo "BOPE - Gestão de Estudos".
Sua missão: Atuar como especialista em concursos públicos.
Responda estritamente no formato JSON solicitado quando exigido.
`;

// Função de Espera Tática (Backoff Exponencial)
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Núcleo de Execução Tática
 * Gerencia a alternância de modelos e tratamento de erros de cota/rede.
 */
async function generateTacticalContent(params: { 
    contents: string, 
    config?: any 
}) {
  let lastError: any = null;
  const genAI = getAIClient();

  // LOOP DE TENTATIVAS (MODELO POR MODELO)
  for (const modelName of MODELS_PRIORITY) {
    // Tenta 2 vezes por modelo para mitigar soluços de rede
    for (let attempt = 1; attempt <= 2; attempt++) {
        try {
            console.log(`[BOPE INTEL] Acionando vetor: ${modelName} (Tentativa ${attempt})`);

            // 1. Instanciação do Modelo com Ferramentas
            // A ferramenta de busca é injetada aqui obrigatoriamente para garantir acesso à web
            const model = genAI.getGenerativeModel({
                model: modelName,
                systemInstruction: params.config?.systemInstruction || SYSTEM_INSTRUCTION_TEXT,
                // REGRA ESTRITA: Adiciona googleSearchRetrieval para permitir busca dinâmica
                tools: [{ googleSearchRetrieval: {} }]
            });

            // 2. Configuração de Geração
            const generationConfig: any = {};
            if (params.config?.responseMimeType) {
                generationConfig.responseMimeType = params.config.responseMimeType;
            }
            if (params.config?.responseSchema) {
                generationConfig.responseSchema = params.config.responseSchema;
            }

            // 3. Execução
            const result = await model.generateContent({
                contents: [{ role: 'user', parts: [{ text: params.contents }] }],
                generationConfig
            });

            const response = result.response;
            return response;

        } catch (error: any) {
            const errMsg = error.message || JSON.stringify(error);
            lastError = error;
            console.warn(`[ALERTA TÁTICO] Falha no modelo ${modelName}:`, errMsg);

            // TRATAMENTO DE ERROS

            // Erro 404 (Modelo não encontrado ou incorreto) -> Break para trocar de modelo
            if (errMsg.includes('404') || errMsg.includes('not found')) {
                console.log(`[VETOR INVÁLIDO] ${modelName} indisponível. Alternando...`);
                break; // Sai do loop de tentativas deste modelo e vai para o próximo
            }

            // Erro 429 (Cota) -> Wait e Retry no mesmo modelo
            if (errMsg.includes('429') || errMsg.includes('quota') || errMsg.includes('Exhausted')) {
                const delay = attempt * 2500;
                console.log(`[SOBRECARGA] Recarregando munição... Aguardando ${delay}ms.`);
                await wait(delay);
                continue; // Tenta o mesmo modelo novamente
            }

            // Erros Críticos (Auth) -> Throw
            if (errMsg.includes('API key') || errMsg.includes('403')) {
                throw new Error("Credencial Inválida. Verifique sua API Key.");
            }

            // Outros erros -> Tenta próximo modelo por segurança
            break; 
        }
    }
  }

  console.error("[FALHA DE MISSÃO] Todos os vetores falharam.", lastError);
  throw new Error("Sistema de Inteligência offline. Verifique conexão ou cota.");
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
        responseMimeType: "application/json",
        // Schema adaptado para @google/generative-ai
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

    const data: IntelData = JSON.parse(text);
    // Adaptação: Na Web SDK, metadados de grounding vêm em candidate.groundingMetadata
    const grounding = response.candidates?.[0]?.groundingMetadata || null;

    return { data, grounding: grounding as any };

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
      ? `Crie um resumo tático (HTML) sobre: ${topic} da disciplina ${subject}. Use <h3>, <ul>, <li>, <b> para formatar.`
      : `Crie uma aula completa (HTML) sobre: ${topic} da disciplina ${subject}. Seja detalhado, inclua exemplos e jurisprudência se aplicável.`;

    const response = await generateTacticalContent({
      contents: prompt
    });

    return response.text();
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
        return text ? JSON.parse(text) : { article: "Erro", summary: "Tente novamente", isLong: false, tip: "Erro" };
    } catch (e) {
        return { article: "Sistema Indisponível", summary: "Aguarde recarga de cota.", isLong: false, tip: "Erro" };
    }
};

export const generatePerformanceAnalysis = async (stats: any) => {
    try {
        const response = await generateTacticalContent({
            contents: `Analise este desempenho e dê 3 dicas táticas (HTML curto): ${JSON.stringify(stats)}`
        });
        return response.text();
    } catch (e) {
        return "Análise indisponível (Cota excedida).";
    }
};