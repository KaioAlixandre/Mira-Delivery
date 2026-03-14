import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, Loader2, ExternalLink } from 'lucide-react';
import { apiService } from '../services/api';

const BASE_DOMAIN = 'miradelivery.com.br';

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'checking' | 'paid' | 'pending' | 'error'>('checking');
  const [lojaData, setLojaData] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const checkPaymentStatus = async () => {
      try {
        // Buscar ID da assinatura do localStorage
        const assinaturaId = localStorage.getItem('pending_subscription_id');

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
              // Pagamento confirmado, finalizar cadastro
              try {
                const finalizeData = await apiService.finalizeSubscription(parseInt(assinaturaId));
                setLojaData(finalizeData);
                setStatus('paid');

                // Limpar dados temporários
                localStorage.removeItem('pending_subscription_id');
                localStorage.removeItem('pending_subscription_data');

                // Salvar token se fornecido
                if (finalizeData.token) {
                  localStorage.setItem('token', finalizeData.token);
                }
              } catch (err: any) {
                console.error('Erro ao finalizar:', err);
                setError(err.response?.data?.message || 'Erro ao finalizar cadastro. Tente novamente.');
                setStatus('error');
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
  }, [searchParams]);

  const getStoreBaseUrl = (subdomain: string) => {
    const { protocol, hostname, port } = window.location;
    const isLocalhost = hostname === 'localhost' || /^(\d{1,3}\.){3}\d{1,3}$/.test(hostname);
    const baseHost = isLocalhost ? hostname : BASE_DOMAIN;
    const portPart = isLocalhost && port ? `:${port}` : '';
    return `${protocol}//${subdomain}.${baseHost}${portPart}`;
  };

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

  if (status === 'pending') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center px-4">
        <div className="max-w-md w-full p-10 bg-white/5 backdrop-blur-xl rounded-2xl text-center shadow-2xl border border-white/10">
          <Loader2 className="w-16 h-16 text-yellow-500 animate-spin mx-auto mb-6" />
          <h2 className="text-2xl font-bold text-white mb-3">Pagamento em processamento</h2>
          <p className="text-gray-400 mb-6">
            Seu pagamento está sendo processado. Você receberá um email quando for confirmado.
          </p>
          <button
            onClick={() => navigate('/cadastro')}
            className="w-full bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold py-3 px-4 rounded-xl transition-all duration-200"
          >
            Voltar ao cadastro
          </button>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center px-4">
        <div className="max-w-md w-full p-10 bg-white/5 backdrop-blur-xl rounded-2xl text-center shadow-2xl border border-white/10">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">Erro no pagamento</h2>
          <p className="text-gray-400 mb-6">{error}</p>
          <button
            onClick={() => navigate('/cadastro')}
            className="w-full bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold py-3 px-4 rounded-xl transition-all duration-200"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  // Status: paid - Loja criada com sucesso
  if (lojaData && lojaData.loja) {
    const storeUrl = getStoreBaseUrl(lojaData.loja.subdominio);
    const adminUrl = lojaData.token
      ? `${storeUrl}/admin?token=${encodeURIComponent(lojaData.token)}`
      : `${storeUrl}/login`;

    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center px-4 relative overflow-hidden">
        <div className="absolute top-[-10%] left-[-5%] w-72 h-72 bg-green-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-5%] w-96 h-96 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-md w-full p-10 bg-white/5 backdrop-blur-xl rounded-2xl text-center shadow-2xl border border-white/10 relative z-10">
          <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-green-500/25">
            <CheckCircle className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-3">Loja Criada!</h2>
          <p className="mb-8 text-gray-400">
            Pagamento confirmado! Sua plataforma <span className="text-white font-semibold">{lojaData.loja.nome}</span> já está no ar.
          </p>
          <div className="bg-white/5 border border-white/10 p-5 rounded-xl mb-8 text-sm text-gray-400 break-all">
            <span className="block text-xs uppercase tracking-wider text-gray-500 mb-2">Seu link exclusivo</span>
            <span className="text-orange-400 font-bold text-base">{storeUrl}</span>
          </div>
          <a
            href={adminUrl}
            className="group flex items-center justify-center w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold py-3.5 px-4 rounded-xl transition-all duration-200 shadow-lg transform hover:-translate-y-0.5 active:translate-y-0"
          >
            Acessar Meu Painel Administrativo
            <ExternalLink className="ml-2 h-4 w-4 group-hover:translate-x-0.5 transition-transform duration-200" />
          </a>
        </div>
      </div>
    );
  }

  return null;
}
