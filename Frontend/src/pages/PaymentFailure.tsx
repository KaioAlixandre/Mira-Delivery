import React from 'react';
import { useNavigate } from 'react-router-dom';
import { XCircle, ArrowLeft } from 'lucide-react';

export default function PaymentFailure() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full p-10 bg-white/5 backdrop-blur-xl rounded-2xl text-center shadow-2xl border border-white/10">
        <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <XCircle className="w-10 h-10 text-red-500" />
        </div>
        <h2 className="text-3xl font-bold text-white mb-3">Pagamento não realizado</h2>
        <p className="mb-8 text-gray-400">
          O pagamento não foi processado. Verifique os dados do cartão e tente novamente.
        </p>
        <button
          onClick={() => navigate('/cadastro')}
          className="group flex items-center justify-center w-full bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold py-3.5 px-4 rounded-xl transition-all duration-200"
        >
          <ArrowLeft className="mr-2 h-4 w-4 group-hover:-translate-x-0.5 transition-transform duration-200" />
          Voltar ao cadastro
        </button>
      </div>
    </div>
  );
}

