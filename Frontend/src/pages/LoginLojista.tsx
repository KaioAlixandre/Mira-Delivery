import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Phone, Lock, ArrowLeft, XCircle } from 'lucide-react';
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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Voltar - visível só no mobile (no desktop fica abaixo da área de marca) */}
      <button
        type="button"
        onClick={() => navigate('/')}
        className="lg:hidden absolute top-6 left-6 z-20 flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm"
      >
        <ArrowLeft className="h-4 w-4" />
        <span className="hidden sm:inline">Voltar</span>
      </button>

      {/* Container único: formulário + área de marca */}
      <div className="w-full max-w-4xl flex flex-col lg:flex-row lg:items-center lg:justify-center gap-10 lg:gap-16 relative z-10">
        {/* Layout/card em volta do formulário de login */}
        <div className="w-full max-w-sm mx-auto lg:max-w-md lg:mx-0">
          <div className="bg-white/5 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/10 p-6 sm:p-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Entrar na sua loja
            </h1>
            <p className="mt-2 text-sm text-gray-400">
              Use seu telefone e senha para acessar o painel.
            </p>

            <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
                <XCircle className="h-5 w-5 flex-shrink-0" />
                {error}
              </div>
            )}

            <div>
              <label htmlFor="telefone" className="block text-sm font-medium text-gray-300 mb-2">
                Número de Celular
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-500">
                  <Phone className="h-5 w-5" />
                </div>
                <input
                  id="telefone"
                  name="telefone"
                  type="tel"
                  autoComplete="tel"
                  required
                  value={formData.telefone}
                  onChange={handleChange}
                  placeholder="(00) 00000-0000"
                  className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)] focus:border-transparent transition-all text-sm"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                Senha
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-500">
                  <Lock className="h-5 w-5" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Sua senha"
                  className="w-full pl-12 pr-12 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)] focus:border-transparent transition-all text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-500 hover:text-gray-300"
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 rounded-xl text-white font-semibold bg-[var(--primary-color)] hover:bg-[var(--primary-color-hover)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-[var(--primary-color)] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              Entrar
            </button>
          </form>
          </div>

          <div className="mt-8 pt-6 border-t border-white/10">
            <p className="text-gray-400 font-medium mb-3 text-center text-sm">Não tem uma loja ainda?</p>
            <button
              type="button"
              onClick={() => navigate('/cadastro')}
              className="w-full bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-gray-300 hover:text-white font-semibold py-3 px-4 rounded-xl transition-all duration-200"
            >
              Criar minha loja
            </button>
          </div>
        </div>

        {/* Área de marca */}
        <div className="hidden lg:flex flex-col items-center justify-center text-center max-w-md">
          <img
            src="/logo.jpeg"
            alt="MIRA Delivery"
            className="w-36 h-36 xl:w-40 xl:h-40 mx-auto rounded-2xl object-contain shadow-xl bg-white/90"
          />
          <h2 className="mt-10 text-3xl xl:text-4xl font-bold text-white">
            MIRA Delivery
          </h2>
          <p className="mt-4 text-gray-400 text-base xl:text-lg leading-relaxed max-w-xs xl:max-w-sm">
            Acesse o painel da sua loja e gerencie pedidos, cardápio e muito mais em um só lugar.
          </p>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="mt-8 flex items-center justify-center gap-2 text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 font-medium py-3 px-5 rounded-xl transition-all duration-200 text-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginLojista;
