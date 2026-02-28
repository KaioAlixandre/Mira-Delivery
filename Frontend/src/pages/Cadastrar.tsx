import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Phone, Lock, User, CheckCircle, XCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import Loading from '../components/Loading';
import { validatePhoneWithAPI, applyPhoneMask, removePhoneMask } from '../utils/phoneValidation';

const Register: React.FC = () => {
  const [formData, setFormData] = useState({
    username: '',
    telefone: '',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [phoneValidating, setPhoneValidating] = useState(false);
  const [phoneValidationStatus, setPhoneValidationStatus] = useState<'idle' | 'valid' | 'invalid'>('idle');
  const [phoneValidationMessage, setPhoneValidationMessage] = useState('');
  const { register, loading } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    // Aplicar máscara de telefone
    if (name === 'telefone') {
      const maskedValue = applyPhoneMask(value);
      setFormData({
        ...formData,
        [name]: maskedValue
      });
      // Resetar status de validação quando o usuário digitar
      if (phoneValidationStatus !== 'idle') {
        setPhoneValidationStatus('idle');
        setPhoneValidationMessage('');
      }
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
    setPhoneValidationStatus('idle');
    setPhoneValidationMessage('');

    // Validações básicas
    if (formData.password !== formData.confirmPassword) {
      setError('As senhas não coincidem');
      return;
    }

    if (formData.password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres');
      return;
    }

    // Validar telefone
    if (!formData.telefone || formData.telefone.replace(/\D/g, '').length < 10) {
      setError('Por favor, informe um número de telefone válido');
      return;
    }

    // Validar telefone com API
    setPhoneValidating(true);
    try {
      const validation = await validatePhoneWithAPI(formData.telefone);
      
      if (!validation.valid) {
        setPhoneValidationStatus('invalid');
        setPhoneValidationMessage(validation.error || 'Número de telefone inválido');
        setError(validation.error || 'Número de telefone inválido. Por favor, verifique e tente novamente.');
        setPhoneValidating(false);
        return;
      }

      setPhoneValidationStatus('valid');
      setPhoneValidationMessage('Número de telefone válido!');
      
      // Aguardar um pouco para mostrar o feedback positivo
      await new Promise(resolve => setTimeout(resolve, 500));

      // Criar conta - remover máscara antes de enviar
      const telefoneSemMascara = removePhoneMask(formData.telefone);
      await register(formData.username, telefoneSemMascara, formData.password);
      navigate('/login');
    } catch (err: any) {
      setError(err.message || 'Erro ao criar conta');
      setPhoneValidationStatus('invalid');
    } finally {
      setPhoneValidating(false);
    }
  };

  if (loading) {
    return <Loading fullScreen text="Criando conta..." />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Decorative blurred circles */}
      <div className="absolute top-[-10%] right-[-5%] w-72 h-72 bg-[#ea1d2c]/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-5%] w-96 h-96 bg-[#ff3b47]/10 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex justify-center">
          <div className="w-16 h-16 bg-gradient-to-br from-[#ea1d2c] to-[#ff3b47] rounded-2xl flex items-center justify-center shadow-lg shadow-[#ea1d2c]/30 transform hover:scale-105 transition-transform duration-300">
            <span className="text-white font-bold text-2xl">A</span>
          </div>
        </div>
        <h2 className="mt-8 text-center text-3xl font-extrabold text-white tracking-tight">
          Crie sua conta
        </h2>
        <p className="mt-3 text-center text-sm text-gray-400">
          Ou{' '}
          <Link
            to="/login"
            className="font-semibold text-[#ff5b65] hover:text-[#ff7a82] transition-colors duration-200"
          >
            entre na sua conta existente
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-white/5 backdrop-blur-xl py-10 px-6 shadow-2xl rounded-2xl sm:px-10 border border-white/10">
          <form className="space-y-5" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-sm flex items-center">
                <XCircle className="h-5 w-5 mr-2 shrink-0" />
                {error}
              </div>
            )}

            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-300 mb-2">
                Nome de usuário
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-500 group-focus-within:text-[#ea1d2c] transition-colors duration-200" />
                </div>
                <input
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  required
                  value={formData.username}
                  onChange={handleChange}
                  className="appearance-none block w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#ea1d2c]/50 focus:border-[#ea1d2c] transition-all duration-200 text-sm"
                  placeholder="Seu nome de usuário"
                />
              </div>
            </div>

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
                  className={`appearance-none block w-full pl-12 pr-12 py-3 bg-white/5 border rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#ea1d2c]/50 focus:border-[#ea1d2c] transition-all duration-200 text-sm ${
                    phoneValidationStatus === 'valid' 
                      ? 'border-green-500/40 bg-green-500/5' 
                      : phoneValidationStatus === 'invalid'
                      ? 'border-red-500/40 bg-red-500/5'
                      : 'border-white/10'
                  }`}
                  placeholder="(00) 00000-0000"
                  disabled={phoneValidating}
                />
                <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
                  {phoneValidating ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-[#ea1d2c] border-t-transparent"></div>
                  ) : phoneValidationStatus === 'valid' ? (
                    <CheckCircle className="h-5 w-5 text-green-400" />
                  ) : phoneValidationStatus === 'invalid' ? (
                    <XCircle className="h-5 w-5 text-red-400" />
                  ) : null}
                </div>
              </div>
              {phoneValidationMessage && (
                <p className={`mt-1.5 text-xs ${
                  phoneValidationStatus === 'valid' ? 'text-green-400' : 'text-red-400'
                }`}>
                  {phoneValidationMessage}
                </p>
              )}
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
                  autoComplete="new-password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="appearance-none block w-full pl-12 pr-12 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#ea1d2c]/50 focus:border-[#ea1d2c] transition-all duration-200 text-sm"
                  placeholder="Mínimo 6 caracteres"
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

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-2">
                Confirmar senha
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-500 group-focus-within:text-[#ea1d2c] transition-colors duration-200" />
                </div>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="appearance-none block w-full pl-12 pr-12 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#ea1d2c]/50 focus:border-[#ea1d2c] transition-all duration-200 text-sm"
                  placeholder="Confirme sua senha"
                />
                <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
                  <button
                    type="button"
                    className="text-gray-500 hover:text-gray-300 focus:outline-none transition-colors duration-200"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center">
              <input
                id="agree-terms"
                name="agree-terms"
                type="checkbox"
                required
                className="h-4 w-4 text-[#ea1d2c] bg-white/5 border-white/20 rounded focus:ring-[#ea1d2c] focus:ring-offset-0"
              />
              <label htmlFor="agree-terms" className="ml-2 block text-sm text-gray-400">
                Eu concordo com os{' '}
                <a href="#" className="text-[#ff5b65] hover:text-[#ff7a82] transition-colors duration-200">
                  Termos de Uso
                </a>{' '}
                e{' '}
                <a href="#" className="text-[#ff5b65] hover:text-[#ff7a82] transition-colors duration-200">
                  Política de Privacidade
                </a>
              </label>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-semibold rounded-xl text-white bg-gradient-to-r from-[#ea1d2c] to-[#ff3b47] hover:from-[#d61a28] hover:to-[#ea1d2c] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-[#ea1d2c] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#ea1d2c]/25 hover:shadow-[#ea1d2c]/40 transform hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
              >
                {loading ? 'Criando conta...' : 'Criar conta'}
              </button>
            </div>
          </form>

          <div className="mt-8">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-3 bg-transparent text-gray-500 backdrop-blur-sm">Ou continue com</span>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <button className="w-full inline-flex justify-center items-center py-2.5 px-4 border border-white/10 rounded-xl bg-white/5 text-sm font-medium text-gray-300 hover:bg-white/10 hover:border-white/20 transition-all duration-200">
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                <span className="ml-2">Google</span>
              </button>

              <button className="w-full inline-flex justify-center items-center py-2.5 px-4 border border-white/10 rounded-xl bg-white/5 text-sm font-medium text-gray-300 hover:bg-white/10 hover:border-white/20 transition-all duration-200">
                <svg className="w-5 h-5" fill="#1877F2" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
                <span className="ml-2">Facebook</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
