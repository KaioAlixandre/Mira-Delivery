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
  Lock,
  Minus,
  Plus,
  Trash2
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

interface Sangria {
  id: string;
  valor: number;
  data: string;
  observacao?: string;
}

interface FecharCaixaProps {
  isCaixaOpen: boolean;
  onToggleCaixa: (open: boolean) => void;
}

const FecharCaixa: React.FC<FecharCaixaProps> = ({ isCaixaOpen, onToggleCaixa }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showOpenModal, setShowOpenModal] = useState(false);
  const [initialCashValue, setInitialCashValue] = useState<string>('');
  const [finalCashValue, setFinalCashValue] = useState<string>('');
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
  const [savedInitialCash, setSavedInitialCash] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('caixaInitialCash');
      return saved ? parseFloat(saved) : 0;
    } catch {
      return 0;
    }
  });
  const [sangrias, setSangrias] = useState<Sangria[]>(() => {
    try {
      const saved = localStorage.getItem('caixaSangrias');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [showSangriaModal, setShowSangriaModal] = useState(false);
  const [sangriaValue, setSangriaValue] = useState<string>('');
  const [sangriaObservacao, setSangriaObservacao] = useState<string>('');

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

  // Persistir sangrias no localStorage
  useEffect(() => {
    try {
      localStorage.setItem('caixaSangrias', JSON.stringify(sangrias));
    } catch {
      // ignore
    }
  }, [sangrias]);

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

  const getOrderDisplayNumber = (order: Order): string => {
    // Usar dailyNumber se disponível, caso contrário usar o ID
    return order.dailyNumber ? `#${order.dailyNumber}` : `#${order.id}`;
  };

  const getOrderDisplayName = (order: Order): string => {
    // Priorizar nomeClienteAvulso para pedidos de balcão
    if (order.nomeClienteAvulso) {
      return order.nomeClienteAvulso;
    }
    
    // Se o username for USUARIO_BALCAO, mostrar "Avulço"
    if (order.user?.username === 'USUARIO_BALCAO') {
      return 'Avulço';
    }
    
    // Caso contrário, usar o username ou "Cliente"
    return order.user?.username || 'Cliente';
  };

  const formatCurrencyInput = (value: string): string => {
    // Remove tudo exceto números
    const numbers = value.replace(/\D/g, '');
    if (!numbers) return '';
    
    // Converte para número e divide por 100 para ter centavos
    const amount = parseFloat(numbers) / 100;
    
    // Formata como moeda brasileira
    return amount.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const parseCurrencyInput = (value: string): number => {
    const numbers = value.replace(/\D/g, '');
    if (!numbers) return 0;
    return parseFloat(numbers) / 100;
  };

  const handleFecharCaixa = () => {
    setShowModal(true);
  };

  const handleConfirmClose = () => {
    const finalValue = parseCurrencyInput(finalCashValue);
    
    if (finalValue < 0) {
      alert('Por favor, informe um valor válido para o caixa final.');
      return;
    }

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
      localStorage.removeItem('caixaInitialCash');
    } catch {
      // ignore
    }
    
    setFinalCashValue('');
    setSavedInitialCash(0);
    setSangrias([]);
    try {
      localStorage.removeItem('caixaSangrias');
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
    const cashValue = parseCurrencyInput(initialCashValue);
    
    if (cashValue <= 0) {
      alert('Por favor, informe um valor válido maior que zero para o caixa inicial.');
      return;
    }

    const now = new Date();
    const formatted = new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(now);
    
    setOpenedAt(formatted);
    setSavedInitialCash(cashValue);
    setSangrias([]); // Limpar sangrias ao abrir novo caixa
    
    try {
      localStorage.setItem('caixaOpenedAt', formatted);
      localStorage.setItem('caixaInitialCash', cashValue.toString());
      localStorage.removeItem('caixaSangrias');
    } catch {
      // ignore
    }
    
    setInitialCashValue('');
    onToggleCaixa(true);
    setShowOpenModal(false);
  };

  const summary = getPaymentSummary();
  const grandTotal = summary.reduce((acc, s) => acc + s.total, 0);
  const totalOrders = summary.reduce((acc, s) => acc + s.count, 0);

  const getTotalSangrias = (): number => {
    return sangrias.reduce((acc, sangria) => acc + sangria.valor, 0);
  };

  const getExpectedCashValue = (): number => {
    const cashSummary = summary.find(s => s.method === 'CASH_ON_DELIVERY');
    const cashTotal = cashSummary ? cashSummary.total : 0;
    const totalSangrias = getTotalSangrias();
    return savedInitialCash + cashTotal - totalSangrias;
  };

  const handleAddSangria = () => {
    const valor = parseCurrencyInput(sangriaValue);
    
    if (valor <= 0) {
      alert('Por favor, informe um valor válido maior que zero para a sangria.');
      return;
    }

    const novaSangria: Sangria = {
      id: Date.now().toString(),
      valor: valor,
      data: new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date()),
      observacao: sangriaObservacao.trim() || undefined,
    };

    setSangrias([...sangrias, novaSangria]);
    setSangriaValue('');
    setSangriaObservacao('');
    setShowSangriaModal(false);
  };

  const handleRemoveSangria = (id: string) => {
    if (confirm('Tem certeza que deseja remover esta sangria?')) {
      setSangrias(sangrias.filter(s => s.id !== id));
    }
  };

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
                      <div className="flex items-center gap-2">
                        <span>Pedido {getOrderDisplayNumber(order)}</span>
                        <span className="text-slate-400">— {getOrderDisplayName(order)}</span>
                      </div>
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

      {/* Sangrias */}
      {isCaixaOpen && (
        <div className="bg-white rounded-xl shadow-md p-4 mb-6 border border-orange-200">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Minus className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800">Sangrias</h3>
                <p className="text-xs text-slate-500">Retiradas de dinheiro durante o expediente</p>
              </div>
            </div>
            <button
              onClick={() => setShowSangriaModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700 transition-colors shadow-md text-sm"
            >
              <Plus className="w-4 h-4" />
              Adicionar Sangria
            </button>
          </div>
          
          {sangrias.length > 0 ? (
            <div className="space-y-2">
              {sangrias.map((sangria) => (
                <div
                  key={sangria.id}
                  className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-200"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-orange-900">
                        {formatCurrency(sangria.valor)}
                      </span>
                      <span className="text-xs text-slate-500">— {sangria.data}</span>
                    </div>
                    {sangria.observacao && (
                      <p className="text-xs text-slate-600 mt-1">{sangria.observacao}</p>
                    )}
                  </div>
                  <button
                    onClick={() => handleRemoveSangria(sangria.id)}
                    className="p-1.5 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                    title="Remover sangria"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <div className="pt-2 border-t border-orange-200">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-700">Total de Sangrias:</span>
                  <span className="text-lg font-bold text-orange-700">
                    {formatCurrency(getTotalSangrias())}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-400 text-center py-4">
              Nenhuma sangria registrada ainda.
            </p>
          )}
        </div>
      )}

      {/* Botões de ação */}
      <div className="flex flex-wrap gap-3">
        {isCaixaOpen ? (
          <button
            onClick={handleFecharCaixa}
            className="flex items-center gap-2 px-6 py-3 bg-brand text-white rounded-lg font-semibold hover:bg-brand transition-colors shadow-md"
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
                <p className="text-sm text-green-800 mb-3">
                  Ao abrir o caixa, você inicia o controle financeiro do expediente de hoje. 
                  Todos os pedidos entregues a partir de agora serão contabilizados.
                </p>
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-green-900">
                    Valor Inicial em Caixa *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-green-700 font-semibold">
                      R$
                    </span>
                    <input
                      type="text"
                      value={initialCashValue}
                      onChange={(e) => {
                        const formatted = formatCurrencyInput(e.target.value);
                        setInitialCashValue(formatted);
                      }}
                      placeholder="0,00"
                      className="w-full pl-10 pr-4 py-2.5 border border-green-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-lg"
                      autoFocus
                    />
                  </div>
                  <p className="text-xs text-green-600">
                    Informe o valor em dinheiro que está no caixa no início do expediente.
                  </p>
                </div>
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => {
                    setShowOpenModal(false);
                    setInitialCashValue('');
                  }}
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
            <div className="bg-gradient-to-r from-[var(--primary-color)] to-[var(--primary-color-hover)] p-5 rounded-t-2xl flex items-center justify-between">
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

              {/* Informações do caixa */}
              <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                <h4 className="text-sm font-semibold text-blue-900 uppercase tracking-wide mb-3">
                  Informações do Caixa
                </h4>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-blue-700">Valor Inicial:</span>
                    <span className="font-semibold text-blue-900">{formatCurrency(savedInitialCash)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-blue-700">Vendas em Dinheiro:</span>
                    <span className="font-semibold text-blue-900">
                      {formatCurrency(summary.find(s => s.method === 'CASH_ON_DELIVERY')?.total || 0)}
                    </span>
                  </div>
                  {sangrias.length > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-orange-700">Sangrias:</span>
                      <span className="font-semibold text-orange-900">
                        - {formatCurrency(getTotalSangrias())}
                      </span>
                    </div>
                  )}
                  <div className="border-t border-blue-300 pt-2 mt-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-semibold text-blue-900">Valor Esperado:</span>
                      <span className="text-lg font-bold text-blue-900">
                        {formatCurrency(getExpectedCashValue())}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Lista de sangrias no modal */}
              {sangrias.length > 0 && (
                <div className="bg-orange-50 rounded-xl p-4 border border-orange-200">
                  <h4 className="text-sm font-semibold text-orange-900 uppercase tracking-wide mb-3">
                    Sangrias Registradas
                  </h4>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {sangrias.map((sangria) => (
                      <div
                        key={sangria.id}
                        className="flex items-center justify-between p-2 bg-white rounded-lg border border-orange-200"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-orange-900 text-sm">
                              {formatCurrency(sangria.valor)}
                            </span>
                            <span className="text-xs text-slate-500">{sangria.data}</span>
                          </div>
                          {sangria.observacao && (
                            <p className="text-xs text-slate-600 mt-1">{sangria.observacao}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Campo para valor final */}
              <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-200">
                <label className="block text-sm font-semibold text-yellow-900 mb-2">
                  Valor Final em Caixa *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-yellow-700 font-semibold">
                    R$
                  </span>
                  <input
                    type="text"
                    value={finalCashValue}
                    onChange={(e) => {
                      const formatted = formatCurrencyInput(e.target.value);
                      setFinalCashValue(formatted);
                    }}
                    placeholder="0,00"
                    className="w-full pl-10 pr-4 py-2.5 border border-yellow-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-lg"
                    autoFocus
                  />
                </div>
                {finalCashValue && (() => {
                  const finalValue = parseCurrencyInput(finalCashValue);
                  const expectedValue = getExpectedCashValue();
                  const difference = finalValue - expectedValue;
                  const isMatch = Math.abs(difference) < 0.01; // Tolerância de 1 centavo
                  
                  return (
                    <div className={`mt-3 p-3 rounded-lg ${isMatch ? 'bg-green-100 border border-green-300' : 'bg-red-100 border border-red-300'}`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-sm font-semibold ${isMatch ? 'text-green-800' : 'text-red-800'}`}>
                          {isMatch ? '✓ Caixa bateu!' : '⚠ Diferença encontrada'}
                        </span>
                        <span className={`text-lg font-bold ${isMatch ? 'text-green-900' : 'text-red-900'}`}>
                          {difference >= 0 ? '+' : ''}{formatCurrency(difference)}
                        </span>
                      </div>
                      <p className={`text-xs ${isMatch ? 'text-green-700' : 'text-red-700'}`}>
                        {isMatch 
                          ? 'O valor informado corresponde ao valor esperado.'
                          : difference > 0 
                            ? `Há R$ ${formatCurrency(Math.abs(difference))} a mais no caixa.`
                            : `Faltam R$ ${formatCurrency(Math.abs(difference))} no caixa.`
                        }
                      </p>
                    </div>
                  );
                })()}
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
                              <span>Pedido {getOrderDisplayNumber(order)}</span>
                              <span className="text-xs text-slate-400">
                                — {getOrderDisplayName(order)}
                              </span>
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
                  onClick={() => {
                    setShowModal(false);
                    setFinalCashValue('');
                  }}
                  className="px-5 py-2.5 rounded-lg bg-slate-100 text-slate-700 font-semibold hover:bg-slate-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmClose}
                  disabled={!finalCashValue}
                  className="px-5 py-2.5 rounded-lg bg-brand text-white font-semibold hover:bg-brand transition-colors shadow-md flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <CheckCircle className="w-4 h-4" />
                  Confirmar Fechamento
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Adicionar Sangria */}
      {showSangriaModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000] p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="bg-gradient-to-r from-orange-600 to-orange-700 p-5 rounded-t-2xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Minus className="w-7 h-7 text-white" />
                <div>
                  <h3 className="text-xl font-bold text-white">Adicionar Sangria</h3>
                  <p className="text-orange-100 text-sm">
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
                onClick={() => {
                  setShowSangriaModal(false);
                  setSangriaValue('');
                  setSangriaObservacao('');
                }}
                className="text-white hover:bg-white/20 rounded-full p-1.5 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-orange-50 rounded-xl p-4 border border-orange-200">
                <p className="text-sm text-orange-800 mb-3">
                  Registre uma retirada de dinheiro do caixa durante o expediente. 
                  Este valor será subtraído do valor esperado no fechamento.
                </p>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-semibold text-orange-900 mb-2">
                      Valor da Sangria *
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-orange-700 font-semibold">
                        R$
                      </span>
                      <input
                        type="text"
                        value={sangriaValue}
                        onChange={(e) => {
                          const formatted = formatCurrencyInput(e.target.value);
                          setSangriaValue(formatted);
                        }}
                        placeholder="0,00"
                        className="w-full pl-10 pr-4 py-2.5 border border-orange-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-lg"
                        autoFocus
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-orange-900 mb-2">
                      Observação (opcional)
                    </label>
                    <input
                      type="text"
                      value={sangriaObservacao}
                      onChange={(e) => setSangriaObservacao(e.target.value)}
                      placeholder="Ex: Retirada para troco, compra de material..."
                      className="w-full px-4 py-2.5 border border-orange-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      maxLength={100}
                    />
                  </div>
                </div>
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => {
                    setShowSangriaModal(false);
                    setSangriaValue('');
                    setSangriaObservacao('');
                  }}
                  className="px-5 py-2.5 rounded-lg bg-slate-100 text-slate-700 font-semibold hover:bg-slate-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleAddSangria}
                  className="px-5 py-2.5 rounded-lg bg-orange-600 text-white font-semibold hover:bg-orange-700 transition-colors shadow-md flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Adicionar Sangria
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
