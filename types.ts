
export interface User {
  id: string;
  username: string;
  email?: string; // Novo campo para login Google
  apiKey?: string; // Chave Gemini vinculada à conta
  pin: string; // 4 digits
  createdAt: string;
  rank?: string; // e.g., "Recruta", "Soldado", "Cabo"
  avatar?: string; // Base64 image string or URL
}

export interface ExamFormat {
  tipo: string;
  alternativas: number;
  total_questoes: number;
}

export interface ExamInfo {
  nome: string;
  status: string;
  banca: string;
  formato_prova: ExamFormat;
}

export interface Subject {
  disciplina: string;
  assuntos: string[];
}

export interface IntelData {
  concurso_info: ExamInfo;
  conteudo_programatico: Subject[];
}

export interface GroundingMetadata {
  groundingChunks?: Array<{
    web?: {
      uri?: string;
      title?: string;
    };
  }>;
}

export interface SearchResult {
  data: IntelData | null;
  grounding: GroundingMetadata | null;
}

export type StudyStatus = 'pending' | 'summary' | 'questions' | 'review_24h' | 'mastered';

export interface ProgressMap {
  [subject: string]: {
    [topic: string]: StudyStatus;
  };
}

export interface SubjectPrompts {
  [subject: string]: string;
}

export interface VideoLink {
  id: string;
  title: string;
  url: string;
}

export interface StoredDraft {
  id: string;
  title: string;
  content: string;
  createdAt: string;
}

export interface QuestionSession {
  id: string;
  date: string;
  total: number;
  correct: number;
}

export interface MockExamResult {
  subject: string;
  total: number;
  correct: number;
}

export interface MockExam {
  id: string;
  name: string;
  date: string;
  results: MockExamResult[];
}

export interface TopicResources {
  videoLinks: VideoLink[];
  summary?: string;
  fullMaterial?: string;
  drafts?: StoredDraft[];
  questionHistory?: QuestionSession[];
  // Revision Control
  lastStudiedAt?: string; // ISO Date
  nextRevisionDate?: string; // ISO Date
  revisionPhase?: '24h' | '7d' | '30d' | 'maintenance';
}

export interface ResourceMap {
  [subject: string]: {
    [topic: string]: TopicResources;
  };
}

export interface QuizQuestion {
  statement: string;
  options: string[];
  correctIndex: number; // 0-based index
  justification: string;
}

export interface SyncPacket {
  type: 'FULL_SYNC' | 'UPDATE' | 'REQUEST_FULL_SYNC';
  payload: Record<string, any>; // Chave-valor do localStorage
  timestamp: number;
}

// --- FLASHES CAVEIRA TYPES ---

export interface FlashCard {
  id: string;
  type: 'text' | 'image';
  content: string; // Texto ou Base64/URL da imagem
  title?: string;
}

export interface FlashDeck {
  id: string;
  title: string;
  type: 'general' | 'law';
  lawUrl?: string; // URL do Planalto
  cards: FlashCard[]; // Apenas para 'general', 'law' usa IA
}

export interface DailyFlashProgress {
  date: string; // YYYY-MM-DD
  count: number;
  unlocked: boolean; // Se atingiu a meta de 5
}

export interface LawFlashResult {
  article: string; // Texto completo do artigo
  summary: string; // Resumo simplificado
  isLong: boolean; // Flag se é longo para perguntar ao usuário
  tip: string; // Dica do especialista
}

// --- NOVAS METAS DIÁRIAS ---
export interface DailyTaskMetrics {
  date: string; // YYYY-MM-DD
  flashCount: number; // Meta: 5
  questionsPortuguese: number; // Meta: 10
  questionsMath: number; // Meta: 10
  questionsLaw: number; // Meta: 10
  videoWatched: number; // Meta: 1
}