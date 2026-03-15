import React, { useEffect, useState } from 'react';
import { Crown, Check, Store } from 'lucide-react';
import apiService from '../../services/api';
import { useNotification } from '../../components/NotificationProvider';

const planOptions = [
  {
    id: 'simples' as const,
    name: 'Simples',
    price: 97,
    color: 'from-blue-500 to-cyan-500',
    border: 'border-blue-500',
    bg: 'bg-blue-50',
    features: ['Gerenciamento de pedidos online', 'Gerenciamento completo do cardápio'],
  },
  {
    id: 'pro' as const,
    name: 'Pro',
    price: 197,
    color: 'from-orange-500 to-amber-500',
    border: 'border-orange-500',
    bg: 'bg-orange-50',
    badge: 'Popular',
    features: ['Gerenciamento de pedidos online', 'Gerenciamento completo do cardápio', 'Envio de mensagens via WhatsApp'],
  },
  {
    id: 'plus' as const,
    name: 'Plus',
    price: 270,
    color: 'from-purple-500 to-pink-500',
    border: 'border-purple-500',
    bg: 'bg-purple-50',
    badge: 'Completo',
    features: ['Gerenciamento de pedidos online', 'Gerenciamento completo do cardápio', 'Envio de mensagens via WhatsApp', 'Gerenciamento de pedidos no salão', 'App do garçom'],
  },
];

export interface MeuPlanoProps {
  /** Chamado quando o plano é alterado com sucesso (atualiza a sidebar na hora) */
  onPlanUpdated?: (plan: 'simples' | 'pro' | 'plus') => void;
}

const MeuPlano: React.FC<MeuPlanoProps> = ({ onPlanUpdated }) => {
  const { notify } = useNotification();

  const [currentPlan, setCurrentPlan] = useState<'simples' | 'pro' | 'plus'>('simples');
  const [savingPlan, setSavingPlan] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiService
      .getStoreConfig()
      .then((data) => {
        setCurrentPlan((['simples', 'pro', 'plus'].includes(data.planoMensal) ? data.planoMensal : 'simples') as 'simples' | 'pro' | 'plus');
      })
      .catch(() => notify('Erro ao carregar configurações', 'error'))
      .finally(() => setLoading(false));
  }, [notify]);

  const handleUpdatePlan = async (planId: 'simples' | 'pro' | 'plus') => {
    setSavingPlan(true);
    try {
      await apiService.updateStoreConfig({ planoMensal: planId });
      setCurrentPlan(planId);
      onPlanUpdated?.(planId);
      notify('Plano atualizado com sucesso!', 'success');
    } catch {
      notify('Erro ao atualizar plano.', 'error');
    } finally {
      setSavingPlan(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
        <p className="text-sm text-slate-500">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="page space-y-5">
      <header>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Meu plano</h2>
        <p className="text-sm text-slate-500 mt-1">Escolha o plano que melhor atende sua operação</p>
      </header>

      <div className="space-y-6">
        {/* Seção: Plano Mensal */}
        <div className="bg-white p-3 sm:p-4 md:p-6 rounded-xl shadow-md">
          <h3 className="text-lg font-semibold text-slate-800 mb-1 flex items-center gap-2">
            <Crown className="w-5 h-5 text-amber-500" />
            Plano Mensal
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 mb-4">Escolha o plano que melhor atende sua operação.</p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            {planOptions.map((plan) => {
              const isActive = currentPlan === plan.id;
              return (
                <button
                  key={plan.id}
                  type="button"
                  disabled={savingPlan}
                  onClick={() => handleUpdatePlan(plan.id)}
                  className={`relative text-left p-4 rounded-xl border-2 transition-all duration-200 ${
                    isActive ? `${plan.border} ${plan.bg} shadow-md` : 'border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white'
                  } ${savingPlan ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                  {(plan as any).badge && (
                    <span className={`absolute -top-2.5 right-3 bg-gradient-to-r ${plan.color} text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full shadow`}>
                      {(plan as any).badge}
                    </span>
                  )}
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${plan.color} flex items-center justify-center`}>
                      {plan.id === 'plus' ? <Crown className="w-3.5 h-3.5 text-white" /> : <Store className="w-3.5 h-3.5 text-white" />}
                    </div>
                    <span className="text-base font-bold text-slate-800">{plan.name}</span>
                  </div>
                  <div className="mb-3">
                    <span className="text-2xl font-extrabold text-slate-900">R$ {plan.price}</span>
                    <span className="text-xs text-slate-500">/mês</span>
                  </div>
                  <ul className="space-y-1.5">
                    {plan.features.map((feat, i) => (
                      <li key={i} className="flex items-start gap-1.5 text-xs text-slate-600">
                        <Check className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${isActive ? 'text-green-500' : 'text-slate-400'}`} />
                        {feat}
                      </li>
                    ))}
                  </ul>
                  {isActive && (
                    <div className={`mt-3 text-center text-xs font-bold uppercase tracking-wider bg-gradient-to-r ${plan.color} bg-clip-text text-transparent`}>
                      Plano Atual
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MeuPlano;
