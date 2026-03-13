import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Phone, Lock, Store, ArrowLeft } from 'lucide-react';
import { apiService } from '../services/api';
import Loading from '../components/Loading';
import { applyPhoneMask, validatePhoneLocal } from '../utils/phoneValidation';

const LoginLojista: React.FC = () => {
  const [formData, setFormData] = useState({
    telefone: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    if (name === 'telefone') {
      const maskedValue = applyPhoneMask(value);
      setFormData(prev => ({ ...prev, [name]: maskedValue }));
      return;
    }

    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.telefone) {
      const cleaned = formData.telefone.replace(/\D/g, '');
      if (cleaned.length < 10 || cleaned.length > 11) {
        setError('Por favor, informe um número de telefone válido (10 ou 11 dígitos)');
        return;
      }

      const validation = validatePhoneLocal(formData.telefone);
      if (!validation.valid) {
        setError(validation.error || 'Número de telefone inválido');
        return;
      }
    }

    try {
      setLoading(true);
      const response = await apiService.loginStoreAdmin({
        telefone: formData.telefone,
        password: formData.password,
      });

      const userRole = (response as any).user?.role || (response as any).user?.funcao;
      
      // Se for master, redireciona para o painel master
      if (userRole === 'master') {
        localStorage.setItem('token', response.token);
        localStorage.setItem('user', JSON.stringify(response.user));
        navigate('/master');
        return;
      }

      const subdomain = (response as any).subdominio;
      if (!subdomain) {
        throw new Error('Não foi possível identificar a loja deste usuário.');
      }

      const { protocol, hostname, port } = window.location;
      const isLocalhost = hostname === 'localhost' || /^(\d{1,3}\.){3}\d{1,3}$/.test(hostname);
      const baseHost = isLocalhost ? hostname : 'miradelivery.com.br';
      const portPart = isLocalhost && port ? `:${port}` : '';
      const storeBaseUrl = `${protocol}//${subdomain}.${baseHost}${portPart}`;
      const targetUrl = `${storeBaseUrl}/?token=${encodeURIComponent(response.token)}`;
      window.location.href = targetUrl;
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <Loading fullScreen text="Fazendo login..." />;
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="mb-6 flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="text-sm">Voltar para a página inicial</span>
        </button>
        <div className="flex justify-center">
          <div className="w-12 h-12 bg-[var(--primary-color)] rounded-lg flex items-center justify-center">
            <Store className="text-white" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold">
          Entrar na sua loja
        </h2>
        <p className="mt-2 text-center text-sm text-slate-300">
          Não tem uma loja ainda?{' '}
          <button
            type="button"
            onClick={() => navigate('/cadastro')}
            className="font-medium text-[var(--primary-color)] hover:text-[var(--primary-color-hover)]"
          >
            Criar loja
          </button>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-slate-800 py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-slate-700">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-500/20 border border-red-500 text-red-200 px-4 py-3 rounded-md">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="telefone" className="block text-sm font-medium text-slate-200">
                Número de Celular
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Phone className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  id="telefone"
                  name="telefone"
                  type="tel"
                  autoComplete="tel"
                  required
                  value={formData.telefone}
                  onChange={handleChange}
                  className="appearance-none block w-full pl-10 pr-3 py-2 border border-slate-700 rounded-md placeholder-slate-500 bg-slate-900 focus:outline-none focus:ring-[var(--primary-color)] focus:border-[var(--primary-color)] sm:text-sm"
                  placeholder="(00) 00000-0000"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-200">
                Senha
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="appearance-none block w-full pl-10 pr-10 py-2 border border-slate-700 rounded-md placeholder-slate-500 bg-slate-900 focus:outline-none focus:ring-[var(--primary-color)] focus:border-[var(--primary-color)] sm:text-sm"
                  placeholder="Sua senha"
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                  <button
                    type="button"
                    className="text-slate-400 hover:text-slate-300 focus:outline-none"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-[var(--primary-color)] hover:bg-[var(--primary-color-hover)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--primary-color)] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Entrar
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginLojista;
