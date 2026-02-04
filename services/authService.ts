import { User } from '../types';

const USERS_STORAGE_KEY = 'bope_users_db';
const ACTIVE_SESSION_KEY = 'bope_active_session';

export const authService = {
  // Retorna todos os usuários cadastrados
  getUsers: (): User[] => {
    const usersStr = localStorage.getItem(USERS_STORAGE_KEY);
    return usersStr ? JSON.parse(usersStr) : [];
  },

  // Cria um novo usuário (Recruta)
  register: (username: string, pin: string, avatar?: string): User => {
    const users = authService.getUsers();
    
    // Normaliza para comparação (Case Insensitive)
    const normalizedUsername = username.trim().toLowerCase();

    // Validação: Verifica se já existe (ignorando case)
    if (users.some(u => u.username.toLowerCase() === normalizedUsername)) {
      throw new Error("Este nome de guerra já está em uso por outro soldado.");
    }
    if (!/^\d{4}$/.test(pin)) {
      throw new Error("O PIN deve conter exatamente 4 números.");
    }

    const newUser: User = {
      id: Date.now().toString(),
      username: username.trim(), // Salva como digitado para exibição
      pin,
      createdAt: new Date().toISOString(),
      rank: 'Recruta',
      avatar
    };

    const updatedUsers = [...users, newUser];
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(updatedUsers));
    return newUser;
  },

  // Autentica o usuário (Case Insensitive)
  login: (usernameInput: string, pin: string): User => {
    const users = authService.getUsers();
    const normalizedInput = usernameInput.trim().toLowerCase();
    
    const user = users.find(u => u.username.toLowerCase() === normalizedInput && u.pin === pin);
    
    if (!user) {
      throw new Error("Credenciais inválidas. Verifique nome e PIN.");
    }
    
    localStorage.setItem(ACTIVE_SESSION_KEY, user.id);
    return user;
  },

  // Excluir usuário
  deleteUser: (userId: string) => {
    const users = authService.getUsers();
    const updatedUsers = users.filter(u => u.id !== userId);
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(updatedUsers));
    
    // Se o usuário excluído era o ativo, faz logout
    if (localStorage.getItem(ACTIVE_SESSION_KEY) === userId) {
        localStorage.removeItem(ACTIVE_SESSION_KEY);
    }
  },

  // Recupera a sessão ativa
  getSession: (): User | null => {
    const userId = localStorage.getItem(ACTIVE_SESSION_KEY);
    if (!userId) return null;
    
    const users = authService.getUsers();
    return users.find(u => u.id === userId) || null;
  },

  // Encerra a sessão
  logout: () => {
    localStorage.removeItem(ACTIVE_SESSION_KEY);
  },

  // Removemos a verificação de link tático (legacy)
  checkForIncomingMission: (): string | null => {
    return null;
  }
};
