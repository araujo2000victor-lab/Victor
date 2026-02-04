import React, { useState, useEffect } from 'react';
import { Shield, ChevronRight, UserPlus, LogIn, Lock, User as UserIcon, Trash2, Camera } from 'lucide-react';
import { authService } from '../services/authService';
import { User } from '../types';

interface AuthScreenProps {
  onLoginSuccess: (user: User) => void;
}

const AuthScreen: React.FC<AuthScreenProps> = ({ onLoginSuccess }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [avatar, setAvatar] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [existingUsers, setExistingUsers] = useState<User[]>([]);

  useEffect(() => {
    setExistingUsers(authService.getUsers());
  }, []);

  const refreshUsers = () => {
    setExistingUsers(authService.getUsers());
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      if (isRegistering) {
        if (!username.trim()) throw new Error("Informe seu nome de guerra.");
        const user = authService.register(username, pin, avatar);
        // Auto login after register
        authService.login(user.username, user.pin);
        onLoginSuccess(user);
      } else {
        const user = authService.login(username, pin);
        onLoginSuccess(user);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteUser = (userId: string, name: string) => {
    if (confirm(`Tem certeza que deseja dar baixa no soldado ${name}? Todos os dados locais serão perdidos.`)) {
        authService.deleteUser(userId);
        refreshUsers();
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatar(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-bope-black text-gray-900 dark:text-white p-4 relative overflow-hidden">
       {/* Background Elements */}
       <div className="absolute inset-0 pointer-events-none z-0">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/5 dark:bg-bope-green/5 rounded-full blur-3xl"></div>
       </div>

       <div className="w-full max-w-md z-10 animate-in fade-in zoom-in duration-500">
         <div className="text-center mb-8">
            <div className="inline-block p-4 rounded-full bg-emerald-50 dark:bg-bope-green/10 border border-emerald-100 dark:border-bope-green/20 mb-4">
              <Shield className="w-12 h-12 text-emerald-600 dark:text-bope-green" />
            </div>
            <h1 className="text-3xl font-stencil tracking-wider uppercase">BOPE</h1>
            <p className="text-xs font-mono tracking-[0.3em] text-emerald-600 dark:text-bope-green uppercase mt-1">Gestão de Estudos Táticos</p>
         </div>

         <div className="bg-white dark:bg-bope-gray border border-gray-200 dark:border-gray-800 shadow-xl rounded-sm p-8">
            <h2 className="text-lg font-bold uppercase mb-6 flex items-center gap-2 border-b border-gray-100 dark:border-gray-700 pb-2">
              {isRegistering ? <UserPlus className="w-5 h-5" /> : <LogIn className="w-5 h-5" />}
              {isRegistering ? 'Alistamento Militar' : 'Apresentação ao Quartel'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
               {isRegistering && (
                   <div className="flex justify-center mb-4">
                       <label className="relative cursor-pointer group">
                           <div className="w-20 h-20 rounded-full bg-gray-100 dark:bg-black/30 border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center overflow-hidden">
                               {avatar ? (
                                   <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
                               ) : (
                                   <Camera className="w-8 h-8 text-gray-400" />
                               )}
                           </div>
                           <input type="file" id="avatar-upload" name="avatar" className="hidden" accept="image/*" onChange={handleAvatarChange} />
                           <div className="absolute bottom-0 right-0 bg-emerald-600 rounded-full p-1 text-white">
                               <UserIcon className="w-3 h-3" />
                           </div>
                       </label>
                   </div>
               )}

               <div>
                 <label className="block text-xs font-bold uppercase text-gray-500 mb-1" htmlFor="auth-username">Nome de Guerra</label>
                 <div className="relative">
                   <UserIcon className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                   <input 
                     type="text" 
                     id="auth-username"
                     name="username"
                     autoComplete="username"
                     className="w-full bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-gray-700 rounded-sm py-2 pl-10 pr-4 text-sm focus:border-emerald-500 dark:focus:border-bope-green outline-none uppercase font-mono"
                     placeholder="Ex: Soldado Silva"
                     value={username}
                     onChange={(e) => setUsername(e.target.value)}
                     autoFocus
                   />
                 </div>
               </div>

               <div>
                 <label className="block text-xs font-bold uppercase text-gray-500 mb-1" htmlFor="auth-pin">Senha Numérica (4 Dígitos)</label>
                 <div className="relative">
                   <Lock className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                   <input 
                     type="password"
                     id="auth-pin"
                     name="pin"
                     autoComplete="current-password"
                     inputMode="numeric"
                     maxLength={4}
                     className="w-full bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-gray-700 rounded-sm py-2 pl-10 pr-4 text-sm focus:border-emerald-500 dark:focus:border-bope-green outline-none font-mono tracking-widest"
                     placeholder="Ex: 1900"
                     value={pin}
                     onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                   />
                 </div>
               </div>

               {error && (
                 <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-sm text-xs text-red-600 dark:text-red-400 font-bold">
                   ⚠ {error}
                 </div>
               )}

               <button 
                 type="submit"
                 className="w-full bg-emerald-600 dark:bg-bope-green hover:bg-emerald-500 dark:hover:bg-emerald-400 text-white dark:text-black py-3 rounded-sm font-bold uppercase tracking-wider text-sm flex items-center justify-center gap-2 transition-all"
               >
                 {isRegistering ? 'Confirmar Alistamento' : 'Acessar Base'} <ChevronRight className="w-4 h-4" />
               </button>
            </form>

            <div className="mt-6 text-center">
              <button 
                onClick={() => { setIsRegistering(!isRegistering); setError(null); setUsername(''); setPin(''); setAvatar(undefined); }}
                className="text-xs text-gray-500 hover:text-emerald-600 dark:text-gray-400 dark:hover:text-bope-green font-mono uppercase underline"
              >
                {isRegistering ? 'Já possui cadastro? Entrar' : 'Novo por aqui? Alistar-se'}
              </button>
            </div>
         </div>
         
         {/* LISTA DE USUÁRIOS EXISTENTES */}
         {!isRegistering && existingUsers.length > 0 && (
             <div className="mt-8 bg-white dark:bg-bope-gray border border-gray-200 dark:border-gray-800 shadow-md rounded-sm p-4 animate-in slide-in-from-bottom-2">
                 <h3 className="text-xs font-bold uppercase text-gray-500 mb-3 text-center">Soldados Alistados</h3>
                 <div className="space-y-2 max-h-40 overflow-y-auto">
                     {existingUsers.map(u => (
                         <div key={u.id} className="flex justify-between items-center p-2 bg-gray-50 dark:bg-black/20 rounded-sm border border-gray-100 dark:border-gray-700 hover:border-emerald-500 transition-colors cursor-pointer" onClick={() => setUsername(u.username)}>
                             <div className="flex items-center gap-3">
                                 <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden border border-gray-300 dark:border-gray-600">
                                     {u.avatar ? <img src={u.avatar} className="w-full h-full object-cover"/> : <UserIcon className="w-4 h-4 m-2 text-gray-500"/>}
                                 </div>
                                 <span className="text-xs font-mono font-bold uppercase">{u.username}</span>
                             </div>
                             <button onClick={(e) => { e.stopPropagation(); handleDeleteUser(u.id, u.username); }} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded">
                                 <Trash2 className="w-4 h-4"/>
                             </button>
                         </div>
                     ))}
                 </div>
             </div>
         )}
         
         <div className="mt-8 text-center text-[10px] text-gray-400 font-mono">
           SISTEMA DE INTELIGÊNCIA V2.0 <br/> ACESSO RESTRITO
         </div>
       </div>
    </div>
  );
};

export default AuthScreen;