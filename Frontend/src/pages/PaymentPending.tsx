import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, ArrowLeft } from 'lucide-react';
import { apiService } from '../services/api';

export default function PaymentPending() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Verificar status após alguns segundos
    const checkStatus = async () => {
      const assinaturaId = localStorage.getItem('pending_subscription_id');
      if (assinaturaId) {
        try {
          const statusData = await apiService.getSubscriptionStatus(parseInt(assinaturaId));
          if (statusData.status === 'PAID') {
            // Redirecionar para success
            window.location.href = '/cadastro/success';
            return;
          }
        } catch (err) {
          console.error('Erro ao verificar status:', err);
        }
      }
      setChecking(false);
    };

    // Verificar após 3 segundos
    const timer = setTimeout(checkStatus, 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full p-10 bg-white/5 backdrop-blur-xl rounded-2xl text-center shadow-2xl border border-white/10">
        <Loader2 className="w-16 h-16 text-yellow-500 animate-spin mx-auto mb-6" />
        <h2 className="text-2xl font-bold text-white mb-3">Pagamento pendente</h2>
        <p className="text-gray-400 mb-6">
          Seu pagamento está sendo processado. Isso pode levar alguns minutos.
          <br />
          <br />
          Você receberá um email quando o pagamento for confirmado.
        </p>
        {!checking && (
          <button
            onClick={() => navigate('/cadastro')}
            className="group flex items-center justify-center w-full bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold py-3.5 px-4 rounded-xl transition-all duration-200"
          >
            <ArrowLeft className="mr-2 h-4 w-4 group-hover:-translate-x-0.5 transition-transform duration-200" />
            Voltar ao cadastro
          </button>
        )}
      </div>
    </div>
  );
}

