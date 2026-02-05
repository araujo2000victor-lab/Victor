import { User } from '../types';

const USERS_STORAGE_KEY = 'bope_users_db';
const ACTIVE_SESSION_KEY = 'bope_active_session';

export const authService = {
  // Retorna todos os usuários cadastrados
  getUsers: (): User[] => {
    const usersStr = localStorage.getItem(USERS_STORAGE_KEY);
    return usersStr ? JSON.parse(usersStr) : [];
  },

  // Cria um novo usuário (Apenas Username + PIN)
  register: (username: string, pin: string, avatar?: string): User => {
    const users = authService.getUsers();
    
    const normalizedUsername = username.trim().toUpperCase();

    // Validação: Verifica se já existe nome de guerra
    if (users.some(u => u.username.toUpperCase() === normalizedUsername)) {
      throw new Error("Este Nome de Guerra já está em uso.");
    }
    if (!/^\d{4}$/.test(pin)) {
      throw new Error("O PIN deve conter exatamente 4 números.");
    }

    const newUser: User = {
      id: Date.now().toString(),
      username: normalizedUsername, 
      email: '', // Deprecated/Unused
      pin,
      createdAt: new Date().toISOString(),
      rank: 'Recruta',
      avatar
    };

    const updatedUsers = [...users, newUser];
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(updatedUsers));
    return newUser;
  },

  // Autentica o usuário (Por Username + PIN)
  login: (usernameInput: string, pin: string): User => {
    const users = authService.getUsers();
    const normalizedInput = usernameInput.trim().toUpperCase();
    
    // Tenta encontrar por username apenas
    const user = users.find(u => 
        u.username.toUpperCase() === normalizedInput && u.pin === pin
    );
    
    if (!user) {
      throw new Error("Credenciais inválidas. Verifique Nome de Guerra e PIN.");
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