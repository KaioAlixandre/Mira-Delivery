import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Lock, ArrowLeft, AlertCircle, CheckCircle, Eye, EyeOff } from 'lucide-react';
import Loading from '../components/Loading';
import { applyPhoneMask, validatePhoneLocal } from '../utils/phoneValidation';

const ResetPassword: React.FC = () => {
  const [formData, setFormData] = useState({
    telefone: '',
    code: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordReset, setPasswordReset] = useState(false);
  
  const navigate = useNavigate();
  const location = useLocation();

  // Pegar telefone do state se veio da página anterior
  useEffect(() => {
    if (location.state?.telefone) {
      setFormData(prev => ({ ...prev, telefone: location.state.telefone }));
    }
    
    // Se está em modo de desenvolvimento, preencher o código automaticamente
    if (location.state?.developmentCode) {
      setFormData(prev => ({ ...prev, code: location.state.developmentCode }));
    }
  }, [location.state]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    // Aplicar máscara de telefone
    if (name === 'telefone') {
      const maskedValue = applyPhoneMask(value);
      setFormData({ ...formData, [name]: maskedValue });
    } else {
      setFormData({ ...formData, [name]: value });
    }
    setError(''); // Limpar erro ao digitar
  };

  const validateForm = () => {
    if (!formData.telefone || !formData.code || !formData.newPassword || !formData.confirmPassword) {
      setError('Todos os campos são obrigatórios.');
      return false;
    }

    // Validar telefone
    const phoneValidation = validatePhoneLocal(formData.telefone);
    if (!phoneValidation.valid) {
      setError(phoneValidation.error || 'Digite um telefone válido.');
      return false;
    }

    if (formData.code.length !== 6) {
      setError('O código deve ter 6 dígitos.');
      return false;
    }

    if (formData.newPassword.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return false;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setError('As senhas não coincidem.');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    setError('');
    setMessage('');

    try {
      // 1. Captura o subdomínio da URL
      const hostname = window.location.hostname;
      const subdominio = hostname.split('.')[0];

      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // 2. Envia o subdomínio no cabeçalho
          'x-loja-subdominio': subdominio 
        },
        body: JSON.stringify({
          telefone: formData.telefone,
          code: formData.code,
          newPassword: formData.newPassword
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(data.message);
        setPasswordReset(true);
        // Redirecionar para login após 3 segundos
        setTimeout(() => {
          navigate('/login', { 
            state: { 
              message: 'Senha redefinida com sucesso! Faça login com sua nova senha.' 
            } 
          });
        }, 3000);
      } else {
        setError(data.message || 'Erro ao redefinir senha.');
      }
    } catch (err) {
     
      setError('Erro de conexão. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (!formData.telefone) {
      setError('Digite seu telefone primeiro.');
      return;
    }

    // Validar telefone
    const phoneValidation = validatePhoneLocal(formData.telefone);
    if (!phoneValidation.valid) {
      setError(phoneValidation.error || 'Digite um telefone válido.');
      return;
    }

    setLoading(true);
    try {
      // 1. Captura o subdomínio da URL
      const hostname = window.location.hostname;
      const subdominio = hostname.split('.')[0];

      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // 2. Envia o subdomínio no cabeçalho
          'x-loja-subdominio': subdominio 
        },
        body: JSON.stringify({ telefone: formData.telefone }),
      });

      const data = await response.json();
      if (response.ok) {
        setMessage('Novo código enviado! Verifique seu email ou WhatsApp.');
        setTimeout(() => setMessage(''), 5000);
      } else {
        setError(data.message || 'Erro ao reenviar código.');
      }
    } catch (err) {
      setError('Erro ao reenviar código.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <Loading />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-white flex items-center justify-center px-4">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <Link
            to="/forgot-password"
            className="inline-flex items-center text-purple-600 hover:text-purple-700 mb-6 transition-colors"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Link>
          
          <div className="mx-auto h-16 w-16 bg-purple-100 rounded-full flex items-center justify-center mb-6">
            <Lock className="h-8 w-8 text-purple-600" />
          </div>
          
          <h2 className="text-3xl font-bold text-gray-900">
            Redefinir Senha
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Digite o código recebido e sua nova senha
          </p>
        </div>

        {/* Form */}
        <div className="bg-white shadow-lg rounded-lg px-8 py-6">
          {!passwordReset ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="telefone" className="block text-sm font-medium text-gray-700">
                  Telefone
                </label>
                <input
                  id="telefone"
                  name="telefone"
                  type="tel"
                  autoComplete="tel"
                  required
                  value={formData.telefone}
                  onChange={handleChange}
                  className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                  placeholder="(00) 00000-0000"
                />
              </div>

              <div>
                <label htmlFor="code" className="block text-sm font-medium text-gray-700">
                  Código de Verificação
                </label>
                <input
                  id="code"
                  name="code"
                  type="text"
                  maxLength={6}
                  required
                  value={formData.code}
                  onChange={handleChange}
                  className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-purple-500 focus:border-purple-500 text-center text-lg font-mono tracking-widest"
                  placeholder="000000"
                />
                <div className="mt-2 text-center">
                  <button
                    type="button"
                    onClick={handleResendCode}
                    className="text-sm text-purple-600 hover:text-purple-700"
                  >
                    Não recebeu o código? Reenviar
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
                  Nova Senha
                </label>
                <div className="mt-1 relative">
                  <input
                    id="newPassword"
                    name="newPassword"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    value={formData.newPassword}
                    onChange={handleChange}
                    className="appearance-none relative block w-full px-3 py-2 pr-10 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                    placeholder="Nova senha (mín. 6 caracteres)"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                  Confirmar Nova Senha
                </label>
                <div className="mt-1 relative">
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className="appearance-none relative block w-full px-3 py-2 pr-10 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                    placeholder="Confirme sua nova senha"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>

              {error && (
                <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-3 rounded-md">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm">{error}</span>
                </div>
              )}

              {message && (
                <div className="flex items-center space-x-2 text-green-600 bg-green-50 p-3 rounded-md">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-sm">{message}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Redefinindo...' : 'Redefinir Senha'}
              </button>
            </form>
          ) : (
            <div className="text-center space-y-4">
              <div className="mx-auto h-16 w-16 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              
              <h3 className="text-lg font-medium text-gray-900">
                Senha redefinida com sucesso!
              </h3>
              
              {message && (
                <div className="flex items-center space-x-2 text-green-600 bg-green-50 p-3 rounded-md">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-sm">{message}</span>
                </div>
              )}
              
              <p className="text-sm text-gray-600">
                Sua senha foi alterada com sucesso. Você pode fazer login agora.
              </p>
              
              <p className="text-xs text-gray-500">
                Redirecionando para o login em alguns segundos...
              </p>

              <button
                onClick={() => navigate('/login')}
                className="w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors"
              >
                Ir para o login
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center">
          <p className="text-sm text-gray-600">
            Lembrou da senha?{' '}
            <Link to="/login" className="font-medium text-purple-600 hover:text-purple-500">
              Fazer login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
