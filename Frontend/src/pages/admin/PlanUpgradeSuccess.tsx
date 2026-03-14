import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, Loader2, XCircle } from 'lucide-react';
import { apiService } from '../../services/api';
import { useNotification } from '../../components/NotificationProvider';

export default function PlanUpgradeSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { notify } = useNotification();
  const [status, setStatus] = useState<'checking' | 'paid' | 'pending' | 'error'>('checking');
  const [error, setError] = useState('');

  useEffect(() => {
    const checkPaymentStatus = async () => {
      try {
        // Buscar ID da assinatura do localStorage
        const assinaturaId = localStorage.getItem('pending_upgrade_id');
        const novoPlano = localStorage.getItem('pending_upgrade_plan');

        if (!assinaturaId) {
          setError('ID da assinatura não encontrado. Por favor, entre em contato com o suporte.');
          setStatus('error');
          return;
        }

        // Verificar status da assinatura (com polling para atualizar)
        let attempts = 0;
        const maxAttempts = 15; // 15 tentativas = 45 segundos
        const checkInterval = setInterval(async () => {
          attempts++;
          console.log(`🔄 Verificando status do pagamento (tentativa ${attempts}/${maxAttempts})...`);
          
          try {
            const statusData = await apiService.getSubscriptionStatus(parseInt(assinaturaId));
            
            console.log('📊 Status verificado:', statusData);
            
            if (statusData.status === 'PAID') {
              clearInterval(checkInterval);
              
              // Limpar dados temporários
              localStorage.removeItem('pending_upgrade_id');
              localStorage.removeItem('pending_upgrade_plan');
              
              // Recarregar configurações para atualizar o plano
              try {
                const config = await apiService.getStoreConfig();
                setStatus('paid');
                notify('Plano atualizado com sucesso!', 'success');
                
                // Redirecionar após 2 segundos
                setTimeout(() => {
                  navigate('/admin/plano');
                }, 2000);
              } catch (err: any) {
                console.error('Erro ao recarregar configurações:', err);
                setStatus('paid');
                notify('Pagamento confirmado! Recarregue a página para ver as mudanças.', 'success');
                setTimeout(() => {
                  navigate('/admin/plano');
                }, 2000);
              }
            } else if (statusData.status === 'FAILED') {
              clearInterval(checkInterval);
              setError('Pagamento foi recusado. Tente novamente com outro cartão.');
              setStatus('error');
            } else if (attempts >= maxAttempts) {
              clearInterval(checkInterval);
              setError('Tempo de espera esgotado. O pagamento pode estar sendo processado. Verifique novamente em alguns minutos.');
              setStatus('error');
            }
            // Se ainda está PENDING, continua verificando
          } catch (err: any) {
            console.error('Erro ao verificar status:', err);
            if (attempts >= maxAttempts) {
              clearInterval(checkInterval);
              setError('Erro ao verificar status do pagamento. Tente novamente mais tarde.');
              setStatus('error');
            }
          }
        }, 3000); // Verificar a cada 3 segundos

        // Limpar intervalo quando componente desmontar
        return () => clearInterval(checkInterval);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Erro ao verificar status do pagamento.');
        setStatus('error');
      }
    };

    checkPaymentStatus();
  }, [searchParams, navigate, notify]);

  if (status === 'checking') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center px-4">
        <div className="max-w-md w-full p-10 bg-white/5 backdrop-blur-xl rounded-2xl text-center shadow-2xl border border-white/10">
          <Loader2 className="w-16 h-16 text-orange-500 animate-spin mx-auto mb-6" />
          <h2 className="text-2xl font-bold text-white mb-3">Verificando pagamento...</h2>
          <p className="text-gray-400">Aguarde enquanto confirmamos seu pagamento.</p>
          <p className="text-gray-500 text-sm mt-2">Isso pode levar alguns segundos.</p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center px-4">
        <div className="max-w-md w-full p-10 bg-white/5 backdrop-blur-xl rounded-2xl text-center shadow-2xl border border-white/10">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <XCircle className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">Erro no pagamento</h2>
          <p className="text-gray-400 mb-6">{error}</p>
          <button
            onClick={() => navigate('/admin/plano')}
            className="w-full bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold py-3 px-4 rounded-xl transition-all duration-200"
          >
            Voltar para Meu Plano
          </button>
        </div>
      </div>
    );
  }

  // Status: paid - Plano atualizado com sucesso
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-5%] w-72 h-72 bg-green-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-5%] w-96 h-96 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md w-full p-10 bg-white/5 backdrop-blur-xl rounded-2xl text-center shadow-2xl border border-white/10 relative z-10">
        <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-green-500/25">
          <CheckCircle className="w-10 h-10 text-white" />
        </div>
        <h2 className="text-3xl font-bold text-white mb-3">Plano Atualizado!</h2>
        <p className="mb-8 text-gray-400">
          Pagamento confirmado! Seu plano foi atualizado com sucesso.
        </p>
        <button
          onClick={() => navigate('/admin/plano')}
          className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold py-3.5 px-4 rounded-xl transition-all duration-200 shadow-lg transform hover:-translate-y-0.5 active:translate-y-0"
        >
          Voltar para Meu Plano
        </button>
      </div>
    </div>
  );
}

