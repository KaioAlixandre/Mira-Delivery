import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, AuthContextType } from '../types';
import { apiService } from '../services/api';
import { removePhoneMask } from '../utils/phoneValidation';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

/** Garante que user sempre tenha funcao e role definidos (admin/master/user) para login e painel admin. */
function normalizeUser(u: Partial<User> & { id: number }): User {
  const roleOrFuncao = (u.funcao ?? u.role ?? 'user') as string;
  const normalized = (roleOrFuncao === 'admin' || roleOrFuncao === 'master' ? roleOrFuncao : 'user') as 'user' | 'admin' | 'master';
  return {
    ...u,
    id: u.id,
    nomeUsuario: u.nomeUsuario ?? (u as any).username ?? '',
    telefone: u.telefone ?? '',
    email: u.email,
    enderecos: u.enderecos,
    order: u.order,
    funcao: normalized,
    role: normalized,
  };
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const params = new URLSearchParams(window.location.search);
      const tokenFromUrl = params.get('token');

      if (tokenFromUrl) {
        localStorage.setItem('token', tokenFromUrl);
        setToken(tokenFromUrl);
        params.delete('token');
        const nextQuery = params.toString();
        const nextUrl = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ''}${window.location.hash || ''}`;
        window.history.replaceState({}, document.title, nextUrl);
      }

      const storedToken = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');
          
      if (storedToken) {
        try {
          setToken(storedToken);
          
          try {
            const userProfile = await apiService.getProfile();
            const normalized = normalizeUser(userProfile as Partial<User> & { id: number });
            setUser(normalized);
            localStorage.setItem('user', JSON.stringify(normalized));
          } catch (_profileError: any) {
            if (storedUser) {
              try {
                const parsed = JSON.parse(storedUser) as Partial<User> & { id: number };
                const normalized = normalizeUser(parsed);
                setUser(normalized);
                localStorage.setItem('user', JSON.stringify(normalized));
              } catch (_e) {
                setToken(null);
                setUser(null);
                localStorage.removeItem('token');
                localStorage.removeItem('user');
              }
            } else {
              setToken(null);
              setUser(null);
              localStorage.removeItem('token');
              localStorage.removeItem('user');
            }
          }
        } catch (error) {
          console.error('Erro ao inicializar autenticação:', error);
          setToken(null);
          setUser(null);
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (telefone: string, password: string) => {
    try {
      setLoading(true);
      const telefoneSemMascara = removePhoneMask(telefone);
      const response = await apiService.login({ telefone: telefoneSemMascara, password });

      localStorage.setItem('token', response.token);
      setToken(response.token);

      // Backend retorna { id, username, role }; normalizar para User com funcao/role
      const loginUser = response.user as User & { username?: string };
      const userFromLogin = normalizeUser({
        id: response.user.id,
        nomeUsuario: loginUser.username ?? (response.user as any).nomeUsuario ?? '',
        telefone: telefoneSemMascara,
        funcao: (response.user.role ?? (response.user as any).funcao ?? 'user') as 'user' | 'admin' | 'master',
        role: response.user.role ?? (response.user as any).funcao ?? 'user',
        enderecos: []
      });
      setUser(userFromLogin);
      localStorage.setItem('user', JSON.stringify(userFromLogin));

      try {
        const userProfile = await apiService.getProfile();
        const normalized = normalizeUser(userProfile as Partial<User> & { id: number });
        setUser(normalized);
        localStorage.setItem('user', JSON.stringify(normalized));
      } catch (_profileErr) {
        // Mantém usuário do login
      }
    } catch (error: any) {
      if (!error.response && (error.code === 'ERR_NETWORK' || error.message?.includes('Network'))) {
        throw new Error('BLOCKED_OR_NETWORK');
      }
      throw new Error(error.response?.data?.message || 'Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  };

  const register = async (username: string, telefone: string, password: string) => {
    try {
      setLoading(true);
      // Remover máscara antes de enviar ao backend
      const telefoneSemMascara = removePhoneMask(telefone);
      await apiService.register({ username, telefone: telefoneSemMascara, password });
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Erro ao criar conta');
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  const refreshUserProfile = async () => {
    try {
      const userProfile = await apiService.getProfile();
      const normalized = normalizeUser(userProfile as Partial<User> & { id: number });
      setUser(normalized);
      localStorage.setItem('user', JSON.stringify(normalized));
    } catch (_error) {
      // mantém usuário atual
    }
  };

  const value: AuthContextType = {
    user,
    token,
    login,
    register,
    logout,
    loading,
    setUser, // Add setUser to match AuthContextType
    refreshUserProfile, // Add refresh function
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
