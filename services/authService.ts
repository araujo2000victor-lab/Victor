import { User } from '../types';

const USERS_STORAGE_KEY = 'bope_users_db';
const ACTIVE_SESSION_KEY = 'bope_active_session';

export const authService = {
  // Retorna todos os usuários cadastrados
  getUsers: (): User[] => {
    const usersStr = localStorage.getItem(USERS_STORAGE_KEY);
    return usersStr ? JSON.parse(usersStr) : [];
  },

  // Cria um novo usuário (Agora com Email) - API Key removida conforme guidelines
  register: (username: string, email: string, pin: string, avatar?: string): User => {
    const users = authService.getUsers();
    
    const normalizedEmail = email.trim().toLowerCase();

    // Validação: Verifica se já existe email
    if (users.some(u => (u.email || '').toLowerCase() === normalizedEmail)) {
      throw new Error("Este email já está vinculado a uma conta.");
    }
    if (!/^\d{4}$/.test(pin)) {
      throw new Error("O PIN deve conter exatamente 4 números.");
    }

    const newUser: User = {
      id: Date.now().toString(),
      username: username.trim(), 
      email: normalizedEmail,
      pin,
      createdAt: new Date().toISOString(),
      rank: 'Recruta',
      avatar
    };

    const updatedUsers = [...users, newUser];
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(updatedUsers));
    return newUser;
  },

  // Autentica o usuário (Por Email)
  login: (emailInput: string, pin: string): User => {
    const users = authService.getUsers();
    const normalizedInput = emailInput.trim().toLowerCase();
    
    // Tenta encontrar por email (novo método) ou username (legado)
    const user = users.find(u => 
        ((u.email && u.email.toLowerCase() === normalizedInput) || u.username.toLowerCase() === normalizedInput) 
        && u.pin === pin
    );
    
    if (!user) {
      throw new Error("Credenciais inválidas. Verifique Email e PIN.");
    }
    
    localStorage.setItem(ACTIVE_SESSION_KEY, user.id);
    return user;
  },

  // Excluir usuário
  deleteUser: (userId: string) => {
    const users = authService.getUsers();
    const updatedUsers = users.filter(u => u.id !== userId);
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(updatedUsers));
    
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

  checkForIncomingMission: (): string | null => {
    return null;
  }
};