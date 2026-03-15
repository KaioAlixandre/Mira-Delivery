import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Store, Globe, User, Phone, Lock, ExternalLink, XCircle, Check, Crown, ChevronRight, ChevronLeft, Eye, EyeOff, Shield, Zap } from 'lucide-react';
import { apiService } from '../services/api';

const BASE_DOMAIN = 'miradelivery.com.br';

type Step = 1 | 2 | 3;

export default function CadastroLojista() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>(1);
  const [formData, setFormData] = useState({
    nomeLoja: '',
    subdominioDesejado: '',
    username: '',
    telefone: '',
    email: '',
    password: ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successData, setSuccessData] = useState<any>(null);
  const [selectedPlan, setSelectedPlan] = useState<'simples' | 'pro' | 'plus'>('simples');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const plans = [
    {
      id: 'simples' as const,
      name: 'Simples',
      price: 97,
      color: 'from-blue-500 to-cyan-500',
      shadow: 'shadow-blue-500/20',
      border: 'border-blue-500/40',
      badge: null,
      features: [
        'Gerenciamento de pedidos online',
        'Gerenciamento completo do cardápio',
      ],
    },
    {
      id: 'pro' as const,
      name: 'Pro',
      price: 197,
      color: 'from-orange-500 to-amber-500',
      shadow: 'shadow-orange-500/20',
      border: 'border-orange-500/40',
      badge: 'Popular',
      features: [
        'Gerenciamento de pedidos online',
        'Gerenciamento completo do cardápio',
        'Envio de mensagens via WhatsApp',
      ],
    },
    {
      id: 'plus' as const,
      name: 'Plus',
      price: 270,
      color: 'from-purple-500 to-pink-500',
      shadow: 'shadow-purple-500/20',
      border: 'border-purple-500/40',
      badge: 'Completo',
      features: [
        'Gerenciamento de pedidos online',
        'Gerenciamento completo do cardápio',
        'Envio de mensagens via WhatsApp',
        'Gerenciamento de pedidos no salão',
        'App do garçom',
      ],
    },
  ];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    // Mágica: Preenche o subdomínio automaticamente enquanto digita o nome da loja
    if (name === 'nomeLoja' && !successData) {
      const slug = value.toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Tira acentos
        .replace(/[^a-z0-9-]/g, '-') // Troca espaços por hífen
        .replace(/-+/g, '-') 
        .replace(/^-|-$/g, '');
        
      setFormData(prev => ({ ...prev, [name]: value, subdominioDesejado: slug }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const getStoreBaseUrl = (subdomain: string) => {
    const { protocol, hostname, port } = window.location;
    const isLocalhost = hostname === 'localhost' || /^(\d{1,3}\.){3}\d{1,3}$/.test(hostname);
    const baseHost = isLocalhost ? hostname : BASE_DOMAIN;
    const portPart = isLocalhost && port ? `:${port}` : '';
    return `${protocol}//${subdomain}.${baseHost}${portPart}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await apiService.registerStore({
        ...formData,
        planoMensal: selectedPlan,
      });
      setSuccessData(result);
    } catch (err: any) {
      setError(err.response?.data?.message || err.response?.data?.error || 'Erro ao criar loja. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // TELA DE SUCESSO: O usuário é redirecionado para a própria loja para fazer login
  if (successData) {
    const storeUrl = getStoreBaseUrl(successData.loja.subdominio);
    const token = successData.token;
    const adminUrl = token
      ? `${storeUrl}/admin?token=${encodeURIComponent(token)}`
      : `${storeUrl}/login`;
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center px-4 relative overflow-hidden">
        <div className="max-w-xl w-full p-8 sm:p-12 bg-white/5 backdrop-blur-xl rounded-2xl text-center shadow-2xl border border-white/10 relative z-10 ring-1 ring-white/5">
          <div className="w-24 h-24 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-8 shadow-lg shadow-green-500/25">
            <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Loja Criada!</h2>
          <p className="mb-8 text-gray-400 text-base sm:text-lg">
            Sua plataforma <span className="text-white font-semibold">{successData.loja.nome}</span> já está no ar.
          </p>
          <div className="bg-white/5 border border-white/10 p-6 rounded-xl mb-10 text-sm text-gray-400 break-all">
            <span className="block text-xs uppercase tracking-wider text-gray-500 mb-2">Seu link exclusivo</span>
            <span className="text-brand font-bold text-lg">{storeUrl}</span>
          </div>
          <a 
            href={adminUrl}
            className="group flex items-center justify-center w-full bg-gradient-to-r from-[var(--primary-color)] to-[var(--primary-color-hover)] hover:from-[var(--primary-color-hover)] hover:to-[var(--primary-color-hover)] text-white font-bold py-4 px-5 rounded-xl transition-all duration-200 shadow-lg transform hover:-translate-y-0.5 active:translate-y-0 text-base sm:text-lg"
          >
            Acessar Meu Painel Administrativo
            <ExternalLink className="ml-2 h-5 w-5 group-hover:translate-x-0.5 transition-transform duration-200" />
          </a>
        </div>
      </div>
    );
  }

  const canGoStep2 = formData.nomeLoja.trim() && formData.username.trim() && formData.telefone.trim();
  const passwordValid = formData.password.length >= 6;
  const passwordsMatch = formData.password === confirmPassword && confirmPassword.length > 0;
  const canGoStep3 = passwordValid && passwordsMatch;

  const goNext = () => {
    setError('');
    if (step === 1 && canGoStep2) setStep(2);
    else if (step === 2 && canGoStep3) setStep(3);
  };

  const goBack = () => {
    setError('');
    if (step === 2) setStep(1);
    else if (step === 3) setStep(2);
  };

  // FORMULÁRIO DE CADASTRO (fluxo em 3 etapas)
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className={`w-full relative z-10 flex flex-col lg:flex-row lg:items-start gap-8 lg:gap-10 ${step === 3 ? 'max-w-6xl lg:justify-center' : 'max-w-4xl'}`}>
        {/* Coluna esquerda: indicador de etapas + card do formulário */}
        <div className={`w-full flex-1 min-w-0 lg:order-1 ${step === 3 ? 'lg:max-w-4xl' : 'lg:max-w-md'}`}>
          {/* Indicador de etapas - em cima do card */}
          <div className="mb-4 flex items-center justify-center gap-2">
            {([1, 2, 3] as Step[]).map((s) => (
              <React.Fragment key={s}>
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                    step === s
                      ? 'bg-[var(--primary-color)] text-white shadow-lg'
                      : step > s
                      ? 'bg-green-500/30 text-green-300'
                      : 'bg-white/10 text-gray-400'
                  }`}
                >
                  {step > s ? <Check className="w-4 h-4" /> : s}
                </div>
                {s < 3 && <div className="w-8 h-0.5 bg-white/20 rounded" />}
              </React.Fragment>
            ))}
          </div>
        <div className={`bg-white/5 backdrop-blur-xl py-10 px-6 shadow-2xl rounded-2xl sm:px-10 border border-white/10 w-full ${step === 3 ? 'min-h-[380px] max-w-4xl' : 'min-h-[420px] max-w-md'}`}>
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-sm flex items-center mb-6">
              <XCircle className="h-5 w-5 mr-2 shrink-0" />
              {error}
            </div>
          )}

          {/* Etapa 1: Nome do restaurante, seu nome, WhatsApp */}
          {step === 1 && (
            <div className="space-y-5">
              <p className="text-gray-400 text-sm text-center mb-2">Dados do seu negócio e contato</p>
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-300">Nome do Restaurante</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Store className="h-5 w-5 text-gray-500 group-focus-within:text-brand transition-colors duration-200" />
                  </div>
                  <input
                    type="text"
                    name="nomeLoja"
                    value={formData.nomeLoja}
                    onChange={handleChange}
                    placeholder="Ex: Pizzaria do Mario"
                    className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand transition-all duration-200 text-sm"
                  />
                </div>
                {formData.subdominioDesejado && (
                  <p className="mt-1.5 text-xs text-gray-500 flex items-center gap-1">
                    <Globe className="w-3.5 h-3.5" />
                    Seu link: <span className="text-gray-400">{formData.subdominioDesejado}.miradelivery.com.br</span>
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-gray-300">Seu Nome</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-500 group-focus-within:text-brand transition-colors duration-200" />
                  </div>
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    placeholder="Ex: Mario Bros"
                    className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand transition-all duration-200 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-gray-300">WhatsApp</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Phone className="h-5 w-5 text-gray-500 group-focus-within:text-brand transition-colors duration-200" />
                  </div>
                  <input
                    type="text"
                    name="telefone"
                    value={formData.telefone}
                    onChange={handleChange}
                    placeholder="(11) 99999-9999"
                    className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand transition-all duration-200 text-sm"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={goNext}
                  disabled={!canGoStep2}
                  className="w-full bg-gradient-to-r from-[var(--primary-color)] to-[var(--primary-color-hover)] hover:from-[var(--primary-color-hover)] hover:to-[var(--primary-color-hover)] disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-xl transition-all duration-200 shadow-lg flex items-center justify-center gap-2"
                >
                  Continuar <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {/* Etapa 2: Criação de senha */}
          {step === 2 && (
            <div className="space-y-5">
              <p className="text-gray-400 text-sm text-center mb-2">Crie uma senha segura para acessar o painel</p>
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-300">Senha de Acesso</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-500 group-focus-within:text-brand transition-colors duration-200" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full pl-12 pr-12 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand transition-all duration-200 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((p) => !p)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-500 hover:text-gray-300 transition-colors"
                    aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                {formData.password && formData.password.length < 6 && (
                  <p className="mt-1.5 text-xs text-amber-400">Use pelo menos 6 caracteres.</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-gray-300">Confirmar Senha</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-500 group-focus-within:text-brand transition-colors duration-200" />
                  </div>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Digite a senha novamente"
                    className="w-full pl-12 pr-12 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand transition-all duration-200 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((p) => !p)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-500 hover:text-gray-300 transition-colors"
                    aria-label={showConfirmPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  >
                    {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                {confirmPassword && formData.password !== confirmPassword && (
                  <p className="mt-1.5 text-xs text-red-400">As senhas não coincidem.</p>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={goBack}
                  className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white font-semibold py-3 px-4 rounded-xl transition-all duration-200 flex items-center justify-center gap-1"
                >
                  <ChevronLeft className="w-5 h-5" /> Voltar
                </button>
                <button
                  type="button"
                  onClick={goNext}
                  disabled={!canGoStep3}
                  className="flex-1 bg-gradient-to-r from-[var(--primary-color)] to-[var(--primary-color-hover)] disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-xl transition-all duration-200 shadow-lg flex items-center justify-center gap-2"
                >
                  Continuar <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {/* Etapa 3: Escolha do plano */}
          {step === 3 && (
            <>
              <p className="text-gray-400 text-sm text-center mb-6">Escolha o plano ideal para você</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5 mb-8">
                {plans.map((plan) => {
                  const isSelected = selectedPlan === plan.id;
                  return (
                    <button
                      key={plan.id}
                      type="button"
                      onClick={() => setSelectedPlan(plan.id)}
                      className={`relative text-left p-5 sm:p-6 rounded-2xl border-2 transition-all duration-300 min-h-[220px] flex flex-col ${
                        isSelected
                          ? `${plan.border} bg-white/10 ${plan.shadow} shadow-xl scale-[1.02] ring-2 ring-white/20`
                          : 'border-white/10 bg-white/5 hover:bg-white/[0.08] hover:border-white/20'
                      }`}
                    >
                      {plan.badge && (
                        <span className={`absolute -top-2.5 right-4 bg-gradient-to-r ${plan.color} text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full shadow-lg`}>
                          {plan.badge}
                        </span>
                      )}
                      <div className="flex items-center gap-2 mb-4">
                        <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${plan.color} flex items-center justify-center flex-shrink-0`}>
                          {plan.id === 'plus' ? <Crown className="w-5 h-5 text-white" /> : <Store className="w-5 h-5 text-white" />}
                        </div>
                        <h3 className="text-lg font-bold text-white">{plan.name}</h3>
                      </div>
                      <div className="mb-4">
                        <span className="text-2xl sm:text-3xl font-extrabold text-white">R$ {plan.price}</span>
                        <span className="text-sm text-gray-400">/mês</span>
                      </div>
                      <ul className="space-y-2 flex-1">
                        {plan.features.map((feat, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                            <Check className={`w-4 h-4 mt-0.5 flex-shrink-0 ${isSelected ? 'text-green-400' : 'text-gray-500'}`} />
                            <span>{feat}</span>
                          </li>
                        ))}
                      </ul>
                      {isSelected && (
                        <div className={`mt-4 pt-3 border-t border-white/10 text-center text-xs font-semibold uppercase tracking-wider bg-gradient-to-r ${plan.color} bg-clip-text text-transparent`}>
                          Selecionado
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={goBack}
                    className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white font-semibold py-3 px-4 rounded-xl transition-all duration-200 flex items-center justify-center gap-1"
                  >
                    <ChevronLeft className="w-5 h-5" /> Voltar
                  </button>
                  <button
                    disabled={loading}
                    type="submit"
                    className="flex-1 bg-gradient-to-r from-[var(--primary-color)] to-[var(--primary-color-hover)] hover:from-[var(--primary-color-hover)] hover:to-[var(--primary-color-hover)] disabled:from-gray-600 disabled:to-gray-700 text-white font-bold py-3 px-4 rounded-xl transition-all duration-200 shadow-lg"
                  >
                    {loading ? 'Criando loja...' : 'Criar Minha Loja'}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>

        <div className="mt-8 pt-6 border-t border-white/10">
          <p className="text-gray-400 font-medium mb-3 text-center text-sm">Já possui login?</p>
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="w-full bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-gray-300 hover:text-white font-semibold py-3 px-4 rounded-xl transition-all duration-200"
          >
            Ir para login da loja
          </button>
        </div>
        </div>

        {/* Coluna direita: card com logo, título e benefícios (oculto na etapa 3) */}
        {step !== 3 && (
        <div className="w-full lg:w-auto lg:flex-shrink-0 lg:order-2 lg:self-stretch">
          <div className="h-full bg-white/5 backdrop-blur-xl py-10 px-6 shadow-2xl rounded-2xl sm:px-10 border border-white/10 flex flex-col lg:min-w-[280px]">
            <div className="flex justify-center lg:justify-end">
              <img
                src="/logo.jpeg"
                alt="MIRA Delivery"
                className="w-16 h-16 rounded-2xl object-contain shadow-lg shadow-orange-500/20 bg-white"
              />
            </div>
            <h2 className="mt-6 text-center lg:text-right text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Crie seu Delivery</h2>
            <p className="mt-2 text-center lg:text-right text-sm text-gray-400">Comece a vender sem taxas abusivas.</p>

            {/* Badge destaque */}
            <div className="mt-4 flex justify-center lg:justify-end">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 text-xs font-medium text-gray-200">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                Planos a partir de R$ 97/mês
              </span>
            </div>

            <div className="mt-6 pt-6 border-t border-white/10 space-y-3 flex flex-col lg:items-end">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 text-center lg:text-right mb-1 w-full">Por que escolher?</p>
              <div className="flex items-start gap-2.5 text-sm text-gray-300 max-w-[260px] lg:max-w-none">
                <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                <span>Valor fixo mensal, sem taxa por pedido</span>
              </div>
              <div className="flex items-start gap-2.5 text-sm text-gray-300 max-w-[260px] lg:max-w-none">
                <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                <span>Cardápio e pedidos online no seu link</span>
              </div>
              <div className="flex items-start gap-2.5 text-sm text-gray-300 max-w-[260px] lg:max-w-none">
                <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                <span>Configure em minutos e comece a vender</span>
              </div>
              <div className="flex items-start gap-2.5 text-sm text-gray-300 max-w-[260px] lg:max-w-none">
                <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                <span>Sem fidelidade: cancele quando quiser</span>
              </div>
            </div>

            {/* Linha de confiança */}
            <div className="mt-6 pt-6 border-t border-white/10 flex items-center justify-center lg:justify-end gap-2 text-xs text-gray-500">
              <Shield className="w-4 h-4 text-green-400/80 flex-shrink-0" />
              <span>Pagamento seguro e dados protegidos</span>
            </div>
          </div>
        </div>
        )}
      </div>
    </div>
  );
}