import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Store, Globe, User, Phone, Lock, ExternalLink, XCircle, Check, Crown } from 'lucide-react';
import { apiService } from '../services/api';

const BASE_DOMAIN = 'miradelivery.com.br';

export default function CadastroLojista() {
  const navigate = useNavigate();
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
  const [assinaturaId, setAssinaturaId] = useState<number | null>(null);

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
      // Criar preferência de pagamento no Mercado Pago
      const result = await apiService.createSubscriptionPreference({
        ...formData,
        planoMensal: selectedPlan,
      });

      // Salvar ID da assinatura no localStorage para verificação posterior
      if (result.assinaturaId) {
        setAssinaturaId(result.assinaturaId);
        localStorage.setItem('pending_subscription_id', result.assinaturaId.toString());
        localStorage.setItem('pending_subscription_data', JSON.stringify({
          nomeLoja: formData.nomeLoja,
          subdominioDesejado: formData.subdominioDesejado
        }));
      }

      // Redirecionar para o checkout do Mercado Pago
      if (result.initPoint) {
        window.location.href = result.initPoint;
      } else if (result.sandboxInitPoint) {
        // Em desenvolvimento, usar sandbox
        window.location.href = result.sandboxInitPoint;
      } else {
        throw new Error('URL de pagamento não retornada');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.response?.data?.error || 'Erro ao processar pagamento. Tente novamente.');
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
        <div className="absolute top-[-10%] left-[-5%] w-72 h-72 bg-green-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-5%] w-96 h-96 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-md w-full p-10 bg-white/5 backdrop-blur-xl rounded-2xl text-center shadow-2xl border border-white/10 relative z-10">
          <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-green-500/25">
            <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-3xl font-bold text-white mb-3">Loja Criada!</h2>
          <p className="mb-8 text-gray-400">
            Sua plataforma <span className="text-white font-semibold">{successData.loja.nome}</span> já está no ar.
          </p>
          <div className="bg-white/5 border border-white/10 p-5 rounded-xl mb-8 text-sm text-gray-400 break-all">
            <span className="block text-xs uppercase tracking-wider text-gray-500 mb-2">Seu link exclusivo</span>
            <span className="text-brand font-bold text-base">{storeUrl}</span>
          </div>
          <a 
            href={adminUrl}
            className="group flex items-center justify-center w-full bg-gradient-to-r from-[var(--primary-color)] to-[var(--primary-color-hover)] hover:from-[var(--primary-color-hover)] hover:to-[var(--primary-color-hover)] text-white font-bold py-3.5 px-4 rounded-xl transition-all duration-200 shadow-lg transform hover:-translate-y-0.5 active:translate-y-0"
          >
            Acessar Meu Painel Administrativo
            <ExternalLink className="ml-2 h-4 w-4 group-hover:translate-x-0.5 transition-transform duration-200" />
          </a>
        </div>
      </div>
    );
  }

  // FORMULÁRIO DE CADASTRO
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Decorative blurred circles */}
      <div className="absolute top-[-10%] left-[-5%] w-72 h-72 bg-orange-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-5%] w-96 h-96 bg-orange-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md sm:max-w-4xl relative z-10">
        <div className="flex justify-center">
          <div className="w-16 h-16 bg-gradient-to-br from-[var(--primary-color)] to-[var(--primary-color-hover)] rounded-2xl flex items-center justify-center shadow-lg transform hover:scale-105 transition-transform duration-300">
            <Store className="h-8 w-8 text-white" />
          </div>
        </div>
        <h2 className="mt-8 text-center text-3xl font-extrabold text-white tracking-tight">Crie seu Delivery</h2>
        <p className="mt-3 text-center text-sm text-gray-400">Comece a vender sem taxas abusivas.</p>

        {/* Planos */}
        <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
          {plans.map((plan) => {
            const isSelected = selectedPlan === plan.id;
            return (
              <button
                key={plan.id}
                type="button"
                onClick={() => setSelectedPlan(plan.id)}
                className={`relative text-left p-5 rounded-2xl border-2 transition-all duration-300 ${
                  isSelected
                    ? `${plan.border} bg-white/10 ${plan.shadow} shadow-xl scale-[1.03]`
                    : 'border-white/10 bg-white/5 hover:bg-white/[0.07] hover:border-white/20'
                }`}
              >
                {plan.badge && (
                  <span className={`absolute -top-3 right-4 bg-gradient-to-r ${plan.color} text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full shadow-lg`}>
                    {plan.badge}
                  </span>
                )}

                <div className="flex items-center gap-2 mb-3">
                  <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${plan.color} flex items-center justify-center`}>
                    {plan.id === 'plus' ? <Crown className="w-4 h-4 text-white" /> : <Store className="w-4 h-4 text-white" />}
                  </div>
                  <h3 className="text-lg font-bold text-white">{plan.name}</h3>
                </div>

                <div className="mb-4">
                  <span className="text-3xl font-extrabold text-white">R$ {plan.price}</span>
                  <span className="text-sm text-gray-400">/mês</span>
                </div>

                <ul className="space-y-2">
                  {plan.features.map((feat, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                      <Check className={`w-4 h-4 mt-0.5 flex-shrink-0 ${isSelected ? 'text-green-400' : 'text-gray-500'}`} />
                      {feat}
                    </li>
                  ))}
                </ul>

                {isSelected && (
                  <div className={`mt-4 text-center text-xs font-semibold uppercase tracking-wider bg-gradient-to-r ${plan.color} bg-clip-text text-transparent`}>
                    Selecionado
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-8 w-full max-w-md relative z-10">
        <div className="bg-white/5 backdrop-blur-xl py-10 px-6 shadow-2xl rounded-2xl sm:px-10 border border-white/10">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-sm flex items-center mb-6">
              <XCircle className="h-5 w-5 mr-2 shrink-0" />
              {error}
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-300">Nome do Restaurante</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Store className="h-5 w-5 text-gray-500 group-focus-within:text-brand transition-colors duration-200" />
                </div>
                <input required type="text" name="nomeLoja" value={formData.nomeLoja} onChange={handleChange} placeholder="Ex: Pizzaria do Mario" className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand transition-all duration-200 text-sm" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-gray-300">Seu Link (Subdomínio)</label>
              <div className="flex group">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Globe className="h-5 w-5 text-gray-500 group-focus-within:text-brand transition-colors duration-200" />
                  </div>
                  <input required type="text" name="subdominioDesejado" value={formData.subdominioDesejado} onChange={handleChange} className="w-full pl-12 pr-2 py-3 bg-white/5 border border-white/10 rounded-l-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand transition-all duration-200 text-sm text-right" />
                </div>
                <span className="py-3 px-4 bg-white/10 rounded-r-xl border border-white/10 border-l-0 text-gray-400 text-sm select-none flex items-center whitespace-nowrap">.miradelivery.com.br</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-gray-300">Seu Nome (Admin)</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-500 group-focus-within:text-brand transition-colors duration-200" />
                </div>
                <input required type="text" name="username" value={formData.username} onChange={handleChange} placeholder="Ex: Mario Bros" className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand transition-all duration-200 text-sm" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-gray-300">Telefone (WhatsApp)</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Phone className="h-5 w-5 text-gray-500 group-focus-within:text-brand transition-colors duration-200" />
                </div>
                <input required type="text" name="telefone" value={formData.telefone} onChange={handleChange} placeholder="(11) 99999-9999" className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand transition-all duration-200 text-sm" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-gray-300">Senha de Acesso</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-500 group-focus-within:text-brand transition-colors duration-200" />
                </div>
                <input required type="password" name="password" value={formData.password} onChange={handleChange} placeholder="Mínimo 6 caracteres" className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand transition-all duration-200 text-sm" />
              </div>
            </div>

            <div className="pt-2">
              <button disabled={loading} type="submit" className="w-full bg-gradient-to-r from-[var(--primary-color)] to-[var(--primary-color-hover)] hover:from-[var(--primary-color-hover)] hover:to-[var(--primary-color-hover)] disabled:from-gray-600 disabled:to-gray-700 text-white font-bold py-3 px-4 rounded-xl transition-all duration-200 shadow-lg transform hover:-translate-y-0.5 active:translate-y-0 disabled:transform-none disabled:shadow-none">
                {loading ? 'Processando pagamento...' : `Pagar R$ ${plans.find(p => p.id === selectedPlan)?.price}/mês`}
              </button>
            </div>
          </form>

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
      </div>
    </div>
  );
}