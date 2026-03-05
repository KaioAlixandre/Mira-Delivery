import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, AuthContextType } from '../types';
import { apiService } from '../services/api';
import { removePhoneMask } from '../utils/phoneValidation';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
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
          
          // Tentar verificar se o token ainda é válido e carregar perfil completo
          // Se falhar, usar os dados do localStorage como fallback
          try {
            const userProfile = await apiService.getProfile();
            setUser(userProfile);
            // Atualizar o usuário no localStorage com dados completos
            localStorage.setItem('user', JSON.stringify(userProfile));
          } catch (profileError: any) {
            // Se o erro for 401 (não autorizado), o token realmente expirou
            if (profileError.response?.status === 401) {
              // Token inválido, limpar storage
              localStorage.removeItem('token');
              localStorage.removeItem('user');
              setToken(null);
              setUser(null);
            } else {
              // Se for outro erro (rede, servidor, etc), usar dados do localStorage
              // Isso mantém o usuário logado mesmo com problemas temporários
              if (storedUser) {
                const parsedUser = JSON.parse(storedUser);
                setUser(parsedUser);
                console.warn('Erro ao carregar perfil, usando dados do localStorage:', profileError.message);
              }
            }
        }
      } catch (error) {
          // Erro ao parsear ou acessar localStorage, manter como não autenticado
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

      // Definir usuário imediatamente com dados do login (evita deslogar se getProfile falhar)
      // Backend retorna { id, username, role }; User no front usa nomeUsuario
      const loginUser = response.user as User & { username?: string };
      const userFromLogin: User = {
        id: response.user.id,
        nomeUsuario: loginUser.username ?? response.user.nomeUsuario ?? '',
        funcao: (response.user.role ?? response.user.funcao ?? 'user') as 'user' | 'admin' | 'master',
        role: response.user.role ?? response.user.funcao ?? 'user',
        telefone: telefoneSemMascara,
        enderecos: []
      };
      setUser(userFromLogin);
      localStorage.setItem('user', JSON.stringify(userFromLogin));

      // Atualizar com perfil completo em segundo plano (endereços, etc.)
      try {
        const userProfile = await apiService.getProfile();
        setUser(userProfile);
        localStorage.setItem('user', JSON.stringify(userProfile));
      } catch (_profileErr) {
        // Mantém usuário do login; perfil completo será carregado quando necessário
      }
    } catch (error: any) {
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
      setUser(userProfile);
      localStorage.setItem('user', JSON.stringify(userProfile));
    } catch (error) {
    
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
