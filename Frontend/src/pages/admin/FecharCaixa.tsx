import React, { useState, useEffect, useCallback } from 'react';
import { 
  DollarSign, 
  CreditCard, 
  Smartphone, 
  Banknote, 
  X, 
  Calculator,
  CheckCircle,
  Clock,
  ShoppingCart,
  LockOpen,
  Lock
} from 'lucide-react';
import apiService from '../../services/api';
import { Order } from '../../types';

interface PaymentSummary {
  method: string;
  label: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  borderColor: string;
  orders: Order[];
  total: number;
  count: number;
}

interface FecharCaixaProps {
  isCaixaOpen: boolean;
  onToggleCaixa: (open: boolean) => void;
}

const FecharCaixa: React.FC<FecharCaixaProps> = ({ isCaixaOpen, onToggleCaixa }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showOpenModal, setShowOpenModal] = useState(false);
  const [lastClosed, setLastClosed] = useState<string | null>(() => {
    try {
      return localStorage.getItem('caixaLastClosed');
    } catch {
      return null;
    }
  });
  const [openedAt, setOpenedAt] = useState<string | null>(() => {
    try {
      return localStorage.getItem('caixaOpenedAt');
    } catch {
      return null;
    }
  });

  const fetchOrders = useCallback(async () => {
    try {
      const allOrders = await apiService.getOrdersAdmin();
      setOrders(allOrders);
    } catch (err) {
      console.error('Erro ao buscar pedidos:', err);
    }
  }, []);

  useEffect(() => {
    if (!isCaixaOpen) {
      setOrders([]);
      return;
    }

    fetchOrders();
  }, [fetchOrders, isCaixaOpen]);

  const getTodayOrders = (): Order[] => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return orders.filter(order => {
      const orderDate = new Date(order.createdAt);
      return orderDate >= today && orderDate < tomorrow && order.status === 'delivered';
    });
  };

  const getPaymentSummary = (): PaymentSummary[] => {
    const todayOrders = getTodayOrders();

    const cashOrders = todayOrders.filter(o => o.paymentMethod === 'CASH_ON_DELIVERY');
    const pixOrders = todayOrders.filter(o => o.paymentMethod === 'PIX');
    const cardOrders = todayOrders.filter(o => o.paymentMethod === 'CREDIT_CARD');

    const sumTotal = (orderList: Order[]) =>
      orderList.reduce((acc, o) => acc + Number(o.totalPrice), 0);

    return [
      {
        method: 'CASH_ON_DELIVERY',
        label: 'Dinheiro',
        icon: <Banknote className="w-6 h-6" />,
        color: 'text-green-700',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
        orders: cashOrders,
        total: sumTotal(cashOrders),
        count: cashOrders.length,
      },
      {
        method: 'PIX',
        label: 'PIX',
        icon: <Smartphone className="w-6 h-6" />,
        color: 'text-teal-700',
        bgColor: 'bg-teal-50',
        borderColor: 'border-teal-200',
        orders: pixOrders,
        total: sumTotal(pixOrders),
        count: pixOrders.length,
      },
      {
        method: 'CREDIT_CARD',
        label: 'Cartão',
        icon: <CreditCard className="w-6 h-6" />,
        color: 'text-blue-700',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
        orders: cardOrders,
        total: sumTotal(cardOrders),
        count: cardOrders.length,
      },
    ];
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const handleFecharCaixa = () => {
    setShowModal(true);
  };

  const handleConfirmClose = () => {
    const now = new Date();
    const formatted = new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(now);

    setLastClosed(formatted);
    try {
      localStorage.setItem('caixaLastClosed', formatted);
      localStorage.removeItem('caixaOpenedAt');
    } catch {
      // ignore
    }
    onToggleCaixa(false);
    setOrders([]);
    setOpenedAt(null);
    setShowModal(false);
  };

  const handleAbrirCaixa = () => {
    setShowOpenModal(true);
  };

  const handleConfirmOpen = () => {
    const now = new Date();
    const formatted = new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(now);
    setOpenedAt(formatted);
    try {
      localStorage.setItem('caixaOpenedAt', formatted);
    } catch {
      // ignore
    }
    onToggleCaixa(true);
    setShowOpenModal(false);
  };

  const summary = getPaymentSummary();
  const grandTotal = summary.reduce((acc, s) => acc + s.total, 0);
  const totalOrders = summary.reduce((acc, s) => acc + s.count, 0);

  return (
    <div>
      <header className="mb-4 sm:mb-6">
        <div className="flex items-center gap-3 mb-1">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-800">Caixa</h2>
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
            isCaixaOpen
              ? 'bg-green-100 text-green-700 border border-green-300'
              : 'bg-red-100 text-red-700 border border-red-300'
          }`}>
            {isCaixaOpen ? <LockOpen className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
            {isCaixaOpen ? 'Aberto' : 'Fechado'}
          </span>
        </div>
        <p className="text-xs sm:text-sm text-slate-500">
          {isCaixaOpen
            ? `Caixa aberto${openedAt ? ` desde ${openedAt}` : ''}. Resumo dos pagamentos dos pedidos entregues hoje.`
            : 'O caixa está fechado. Abra o caixa para iniciar o expediente.'}
        </p>
      </header>

      {/* Cards resumo rápido */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <div className="bg-white rounded-xl shadow-md p-4 flex items-center gap-4">
          <div className="p-3 bg-slate-100 rounded-lg">
            <ShoppingCart className="w-6 h-6 text-slate-600" />
          </div>
          <div>
            <p className="text-xs text-slate-500">Pedidos Entregues Hoje</p>
            <p className="text-2xl font-bold text-slate-800">{totalOrders}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-4 flex items-center gap-4">
          <div className="p-3 bg-green-100 rounded-lg">
            <DollarSign className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <p className="text-xs text-slate-500">Total do Dia</p>
            <p className="text-2xl font-bold text-green-700">{formatCurrency(grandTotal)}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-4 flex items-center gap-4">
          <div className="p-3 bg-blue-100 rounded-lg">
            <Calculator className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <p className="text-xs text-slate-500">Ticket Médio</p>
            <p className="text-2xl font-bold text-blue-700">
              {totalOrders > 0 ? formatCurrency(grandTotal / totalOrders) : 'R$ 0,00'}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-4 flex items-center gap-4">
          <div className="p-3 bg-purple-100 rounded-lg">
            <Clock className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <p className="text-xs text-slate-500">Último Fechamento</p>
            <p className="text-sm font-semibold text-purple-700">
              {lastClosed || 'Nenhum hoje'}
            </p>
          </div>
        </div>
      </div>

      {/* Resumo por forma de pagamento */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {summary.map((s) => (
          <div
            key={s.method}
            className={`bg-white rounded-xl shadow-md border ${s.borderColor} overflow-hidden`}
          >
            <div className={`${s.bgColor} p-4 flex items-center gap-3`}>
              <div className={s.color}>{s.icon}</div>
              <div>
                <h3 className={`text-lg font-bold ${s.color}`}>{s.label}</h3>
                <p className="text-xs text-slate-500">{s.count} pedido(s)</p>
              </div>
            </div>
            <div className="p-4">
              <p className={`text-2xl font-bold ${s.color}`}>{formatCurrency(s.total)}</p>
              {s.orders.length > 0 && (
                <div className="mt-3 space-y-1 max-h-40 overflow-y-auto">
                  {s.orders.map((order) => (
                    <div
                      key={order.id}
                      className="flex justify-between text-xs text-slate-600 py-1 border-b border-slate-100 last:border-0"
                    >
                      <span>Pedido #{order.id}</span>
                      <span className="font-medium">{formatCurrency(Number(order.totalPrice))}</span>
                    </div>
                  ))}
                </div>
              )}
              {s.orders.length === 0 && (
                <p className="text-xs text-slate-400 mt-2">Nenhum pedido com esta forma de pagamento.</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Botões de ação */}
      <div className="flex flex-wrap gap-3">
        {isCaixaOpen ? (
          <button
            onClick={handleFecharCaixa}
            className="flex items-center gap-2 px-6 py-3 bg-[#ea1d2c] text-white rounded-lg font-semibold hover:bg-[#d61a28] transition-colors shadow-md"
          >
            <Lock className="w-5 h-5" />
            Fechar Caixa
          </button>
        ) : (
          <button
            onClick={handleAbrirCaixa}
            className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors shadow-md"
          >
            <LockOpen className="w-5 h-5" />
            Abrir Caixa
          </button>
        )}
      </div>

      {/* Modal de Abrir Caixa */}
      {showOpenModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000] p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-5 rounded-t-2xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <LockOpen className="w-7 h-7 text-white" />
                <div>
                  <h3 className="text-xl font-bold text-white">Abrir Caixa</h3>
                  <p className="text-green-100 text-sm">
                    {new Intl.DateTimeFormat('pt-BR', {
                      weekday: 'long',
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                    }).format(new Date())}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowOpenModal(false)}
                className="text-white hover:bg-white/20 rounded-full p-1.5 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                <p className="text-sm text-green-800">
                  Ao abrir o caixa, você inicia o controle financeiro do expediente de hoje. 
                  Todos os pedidos entregues a partir de agora serão contabilizados.
                </p>
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowOpenModal(false)}
                  className="px-5 py-2.5 rounded-lg bg-slate-100 text-slate-700 font-semibold hover:bg-slate-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmOpen}
                  className="px-5 py-2.5 rounded-lg bg-green-600 text-white font-semibold hover:bg-green-700 transition-colors shadow-md flex items-center gap-2"
                >
                  <LockOpen className="w-4 h-4" />
                  Confirmar Abertura
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Fechar Caixa */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000] p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header do modal */}
            <div className="bg-gradient-to-r from-[#ea1d2c] to-red-600 p-5 rounded-t-2xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Calculator className="w-7 h-7 text-white" />
                <div>
                  <h3 className="text-xl font-bold text-white">Fechamento de Caixa</h3>
                  <p className="text-red-100 text-sm">
                    {new Intl.DateTimeFormat('pt-BR', {
                      weekday: 'long',
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                    }).format(new Date())}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-white hover:bg-white/20 rounded-full p-1.5 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Corpo do modal */}
            <div className="p-5 space-y-5">
              {/* Resumo geral */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold text-slate-600 uppercase tracking-wide">
                    Resumo Geral
                  </h4>
                  <span className="bg-slate-200 text-slate-700 text-xs font-semibold px-2 py-1 rounded-full">
                    {totalOrders} pedido(s)
                  </span>
                </div>
                <p className="text-3xl font-bold text-slate-900">{formatCurrency(grandTotal)}</p>
              </div>

              {/* Detalhamento por forma de pagamento */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-slate-600 uppercase tracking-wide">
                  Por Forma de Pagamento
                </h4>

                {summary.map((s) => (
                  <div
                    key={s.method}
                    className={`${s.bgColor} rounded-xl p-4 border ${s.borderColor}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={s.color}>{s.icon}</div>
                        <div>
                          <p className={`font-bold ${s.color}`}>{s.label}</p>
                          <p className="text-xs text-slate-500">{s.count} pedido(s)</p>
                        </div>
                      </div>
                      <p className={`text-xl font-bold ${s.color}`}>{formatCurrency(s.total)}</p>
                    </div>

                    {s.orders.length > 0 && (
                      <div className="mt-3 bg-white rounded-lg p-3 space-y-1.5">
                        {s.orders.map((order) => (
                          <div
                            key={order.id}
                            className="flex items-center justify-between text-sm text-slate-600 py-1.5 border-b border-slate-100 last:border-0"
                          >
                            <div className="flex items-center gap-2">
                              <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                              <span>Pedido #{order.id}</span>
                              {order.user?.username && (
                                <span className="text-xs text-slate-400">
                                  — {order.user.username}
                                </span>
                              )}
                            </div>
                            <span className="font-semibold">
                              {formatCurrency(Number(order.totalPrice))}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Rodapé do modal */}
              <div className="border-t border-slate-200 pt-4 flex flex-col sm:flex-row gap-3 justify-end">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-5 py-2.5 rounded-lg bg-slate-100 text-slate-700 font-semibold hover:bg-slate-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmClose}
                  className="px-5 py-2.5 rounded-lg bg-[#ea1d2c] text-white font-semibold hover:bg-[#d61a28] transition-colors shadow-md flex items-center justify-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  Confirmar Fechamento
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FecharCaixa;
