import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, Phone, Lock, CheckCircle, XCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import Loading from '../components/Loading';
import { applyPhoneMask, validatePhoneLocal } from '../utils/phoneValidation';

const Login: React.FC = () => {
  const [formData, setFormData] = useState({
    telefone: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const { login, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Verificar se há uma mensagem de sucesso vinda do reset de senha
  useEffect(() => {
    if (location.state?.message) {
      setSuccessMessage(location.state.message);
      // Limpar a mensagem após 5 segundos
      setTimeout(() => setSuccessMessage(''), 5000);
    }
  }, [location.state]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    // Aplicar máscara de telefone
    if (name === 'telefone') {
      const maskedValue = applyPhoneMask(value);
      setFormData({
        ...formData,
        [name]: maskedValue
      });
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validação básica de formato do telefone (sem chamar API)
    if (formData.telefone) {
      const cleaned = formData.telefone.replace(/\D/g, '');
      if (cleaned.length < 10 || cleaned.length > 11) {
        setError('Por favor, informe um número de telefone válido (10 ou 11 dígitos)');
        return;
      }
      
      // Validação local rápida
      const validation = validatePhoneLocal(formData.telefone);
      if (!validation.valid) {
        setError(validation.error || 'Número de telefone inválido');
        return;
      }
    }

    try {
      await login(formData.telefone, formData.password);
      
      // Aguardar um pouco para o contexto ser atualizado
      setTimeout(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          const userData = JSON.parse(storedUser);
          const isAdmin = userData.funcao === 'admin' || userData.funcao === 'master' ||
            userData.role === 'admin' || userData.role === 'master';
          navigate(isAdmin ? '/admin' : '/');
        } else {
          navigate('/');
        }
      }, 100);
    } catch (err: any) {
      const msg = err?.message || '';
      if (msg === 'BLOCKED_OR_NETWORK') {
        setError(
          'A requisição foi bloqueada (ex.: bloqueador de anúncios). Desative extensões para este site ou use uma aba anônima e tente novamente.'
        );
      } else {
        setError(msg || 'Erro ao fazer login');
      }
    }
  };

  if (loading) {
    return <Loading fullScreen text="Fazendo login..." />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Decorative blurred circles */}
      <div className="absolute top-[-10%] left-[-5%] w-72 h-72 bg-[#ea1d2c]/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-5%] w-96 h-96 bg-[#ff3b47]/10 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex justify-center">
          <div className="w-16 h-16 bg-gradient-to-br from-[#ea1d2c] to-[#ff3b47] rounded-2xl flex items-center justify-center shadow-lg shadow-[#ea1d2c]/30 transform hover:scale-105 transition-transform duration-300">
            <span className="text-white font-bold text-2xl">A</span>
          </div>
        </div>
        <h2 className="mt-8 text-center text-3xl font-extrabold text-white tracking-tight">
          Entre na sua conta
        </h2>
        <p className="mt-3 text-center text-sm text-gray-400">
          Ou{' '}
          <Link
            to="/register"
            className="font-semibold text-[#ff5b65] hover:text-[#ff7a82] transition-colors duration-200"
          >
            crie uma nova conta
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-white/5 backdrop-blur-xl py-10 px-6 shadow-2xl rounded-2xl sm:px-10 border border-white/10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-sm flex items-center">
                <XCircle className="h-5 w-5 mr-2 shrink-0" />
                {error}
              </div>
            )}

            {successMessage && (
              <div className="bg-green-500/10 border border-green-500/30 text-green-400 px-4 py-3 rounded-xl text-sm flex items-center">
                <CheckCircle className="h-5 w-5 mr-2 shrink-0" />
                {successMessage}
              </div>
            )}

            <div>
              <label htmlFor="telefone" className="block text-sm font-medium text-gray-300 mb-2">
                Número de Celular
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Phone className="h-5 w-5 text-gray-500 group-focus-within:text-[#ea1d2c] transition-colors duration-200" />
                </div>
                <input
                  id="telefone"
                  name="telefone"
                  type="tel"
                  autoComplete="tel"
                  required
                  value={formData.telefone}
                  onChange={handleChange}
                  className="appearance-none block w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#ea1d2c]/50 focus:border-[#ea1d2c] transition-all duration-200 text-sm"
                  placeholder="(00) 00000-0000"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                Senha
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-500 group-focus-within:text-[#ea1d2c] transition-colors duration-200" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="appearance-none block w-full pl-12 pr-12 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#ea1d2c]/50 focus:border-[#ea1d2c] transition-all duration-200 text-sm"
                  placeholder="Sua senha"
                />
                <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
                  <button
                    type="button"
                    className="text-gray-500 hover:text-gray-300 focus:outline-none transition-colors duration-200"
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

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-[#ea1d2c] bg-white/5 border-white/20 rounded focus:ring-[#ea1d2c] focus:ring-offset-0"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-400">
                  Lembrar de mim
                </label>
              </div>

              <div className="text-sm">
                <Link to="/forgot-password" className="font-medium text-[#ff5b65] hover:text-[#ff7a82] transition-colors duration-200">
                  Esqueceu sua senha?
                </Link>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-semibold rounded-xl text-white bg-gradient-to-r from-[#ea1d2c] to-[#ff3b47] hover:from-[#d61a28] hover:to-[#ea1d2c] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-[#ea1d2c] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#ea1d2c]/25 hover:shadow-[#ea1d2c]/40 transform hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
              >
                {loading ? 'Entrando...' : 'Entrar'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
