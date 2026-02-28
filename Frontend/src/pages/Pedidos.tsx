import React, { useState, useEffect } from 'react';
import { 
  Package, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Truck, 
  MapPin,
  Phone,
  CreditCard,
  Calendar,
  Eye,
  EyeOff,
  Bike,
  Home
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Order } from '../types';
import { apiService } from '../services/api';
import Loading from '../components/Loading';

interface ToastMessage {
  id: number;
  message: string;
  type: 'success' | 'error';
}

const Orders: React.FC = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelingOrders, setCancelingOrders] = useState<Set<number>>(new Set());
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [expandedOrders, setExpandedOrders] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (user) {
      loadOrders();
    }
  }, [user]);

  const showToast = (message: string, type: 'success' | 'error') => {
    const id = Date.now();
    const newToast = { id, message, type };
    setToasts(prev => [...prev, newToast]);
    
    // Remover toast após 5 segundos
    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id));
    }, 5000);
  };

  const removeToast = (id: number) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const toggleOrderExpansion = (orderId: number) => {
    setExpandedOrders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(orderId)) {
        newSet.delete(orderId);
      } else {
        newSet.add(orderId);
      }
      return newSet;
    });
  };

  const getDeliveryTypeInfo = (deliveryType?: string) => {
    switch (deliveryType) {
      case 'pickup':
        return {
          label: 'Retirada no Local',
          icon: <Home className="w-4 h-4" />,
          color: 'text-blue-600',
          bgColor: 'bg-blue-100'
        };
      case 'delivery':
      default:
        return {
          label: 'Entrega',
          icon: <Bike className="w-4 h-4" />,
          color: 'text-green-600',
          bgColor: 'bg-green-100'
        };
    }
  };

  const getOrderSummary = (order: Order) => {
    const totalItems = order.orderitem?.reduce((sum, item) => sum + item.quantity, 0) || 0;
    const deliveryInfo = getDeliveryTypeInfo(order.deliveryType);
    return { totalItems, deliveryInfo };
  };

  useEffect(() => {
    if (user) {
      loadOrders();
    }
  }, [user]);

  const loadOrders = async () => {
    try {
      const ordersData = await apiService.getOrderHistory();
     
      setOrders(ordersData);
    } catch (error) {
    
      showToast('Erro ao carregar pedidos. Tente novamente.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelOrder = async (orderId: number) => {
    // Confirmar cancelamento
    const confirmed = window.confirm(
      'Tem certeza que deseja cancelar este pedido? Esta ação não pode ser desfeita.'
    );
    
    if (!confirmed) return;

    try {
      // Adicionar pedido à lista de cancelamentos em progresso
      setCancelingOrders(prev => new Set([...prev, orderId]));
      
      // Chamar API para cancelar pedido
      await apiService.cancelOrder(orderId);
      
      // Atualizar lista de pedidos
      await loadOrders();
      
      // Mostrar mensagem de sucesso
      showToast('Pedido cancelado com sucesso!', 'success');
    } catch (error) {
     
      showToast('Erro ao cancelar pedido. Tente novamente.', 'error');
    } finally {
      // Remover pedido da lista de cancelamentos em progresso
      setCancelingOrders(prev => {
        const newSet = new Set(prev);
        newSet.delete(orderId);
        return newSet;
      });
    }
  };

  // const getStatusIcon = (status: string) => {
  //   switch (status) {
  //     case 'pending_payment':
  //       return <Clock size={20} className="text-yellow-500" />;
  //     case 'being_prepared':
  //       return <Package size={20} className="text-blue-500" />;
  //     case 'ready_for_pickup':
  //       return <Package size={20} className="text-orange-500" />;
  //     case 'on_the_way':
  //       return <Truck size={20} className="text-purple-500" />;
  //     case 'delivered':
  //       return <CheckCircle size={20} className="text-green-500" />;
  //     case 'canceled':
  //       return <XCircle size={20} className="text-red-500" />;
  //     default:
  //       return <Clock size={20} className="text-gray-500" />;
  //   }
  // };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending_payment':
        return 'Aguardando Pagamento';
      case 'being_prepared':
        return 'Preparando';
      case 'ready_for_pickup':
        return 'Pronto para Retirada';
      case 'on_the_way':
        return 'Saiu para Entrega';
      case 'delivered':
        return 'Entregue';
      case 'canceled':
        return 'Cancelado';
      default:
        return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending_payment':
        return 'bg-yellow-100 text-yellow-800';
      case 'being_prepared':
        return 'bg-blue-100 text-blue-800';
      case 'ready_for_pickup':
        return 'bg-orange-100 text-orange-800';
      case 'on_the_way':
        return 'bg-rose-100 text-rose-800';
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'canceled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return <Loading fullScreen text="Carregando pedidos..." />;
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Acesso Negado
          </h2>
          <p className="text-gray-600">
            Você precisa estar logado para acessar esta página.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 md:py-8">
        {/* Barra de Progresso dos Pedidos Ativos */}
        {orders.length > 0 && orders.filter(o => !['delivered', 'canceled'].includes(o.status)).length > 0 && (
          <div className="mb-3 md:mb-6 space-y-3 md:space-y-4">
            {orders.filter(o => !['delivered', 'canceled'].includes(o.status)).map((activeOrder) => {
              
              const getProgressStep = (status: string) => {
                switch (status) {
                  case 'pending_payment':
                    return 1;
                  case 'being_prepared':
                  case 'ready_for_pickup':
                    return 2;
                  case 'on_the_way':
                    return 3;
                  case 'delivered':
                    return 4;
                  default:
                    return 0;
                }
              };

              const currentStep = getProgressStep(activeOrder.status);
              const steps = [
                { 
                  number: 1, 
                  label: 'Aguardando', 
                  sublabel: 'Pagamento',
                  icon: <Clock className="w-3 h-3 md:w-5 md:h-5" />,
                  status: 'pending_payment'
                },
                { 
                  number: 2, 
                  label: 'Preparando', 
                  sublabel: 'Pedido',
                  icon: <Package className="w-3 h-3 md:w-5 md:h-5" />,
                  status: 'being_prepared'
                },
                { 
                  number: 3, 
                  label: 'A Caminho', 
                  sublabel: activeOrder.deliveryType === 'pickup' ? 'Pronto' : 'Entregando',
                  icon: activeOrder.deliveryType === 'pickup' ? <Home className="w-3 h-3 md:w-5 md:h-5" /> : <Truck className="w-3 h-3 md:w-5 md:h-5" />,
                  status: 'on_the_way'
                },
                { 
                  number: 4, 
                  label: 'Finalizado', 
                  sublabel: 'Concluído',
                  icon: <CheckCircle className="w-3 h-3 md:w-5 md:h-5" />,
                  status: 'delivered'
                }
              ];

              return (
                <div key={activeOrder.id} className="bg-white rounded-lg shadow-md border border-slate-200 p-3 md:p-6">
                  <div className="flex items-center justify-between mb-3 md:mb-6">
                    <div>
                      <h3 className="text-xs md:text-lg font-bold text-slate-900">
                        Pedido #{activeOrder.id.toString().padStart(4, '0')} em andamento
                      </h3>
                      <p className="text-[10px] md:text-sm text-slate-600 mt-0.5">
                        Acompanhe o status do seu pedido
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm md:text-xl font-bold text-[#ea1d2c]">
                        R$ {Number(activeOrder.totalPrice).toFixed(2)}
                      </p>
                      <p className="text-[9px] md:text-xs text-slate-500">
                        {formatDate(activeOrder.createdAt)}
                      </p>
                    </div>
                  </div>

                  {/* Barra de Progresso */}
                  <div className="relative">
                    {/* Linha de conexão */}
                    <div className="absolute top-5 md:top-7 left-0 right-0 h-0.5 md:h-1 bg-slate-200">
                      <div 
                        className="h-full bg-gradient-to-r from-[#ea1d2c] to-[#d61a28] transition-all duration-500"
                        style={{ width: `${((currentStep - 1) / 3) * 100}%` }}
                      />
                    </div>

                    {/* Steps */}
                    <div className="relative grid grid-cols-4 gap-0.5 md:gap-2">
                      {steps.map((step) => {
                        const isCompleted = step.number < currentStep;
                        const isCurrent = step.number === currentStep;
                        const isActive = isCompleted || isCurrent;

                        return (
                          <div key={step.number} className="flex flex-col items-center">
                            {/* Círculo do step */}
                            <div
                              className={`relative z-10 w-10 h-10 md:w-14 md:h-14 rounded-full flex items-center justify-center transition-all duration-300 ${
                                isActive
                                  ? 'bg-[#ea1d2c] shadow-lg shadow-rose-200'
                                  : 'bg-slate-200'
                              }`}
                            >
                              {isCompleted ? (
                                <CheckCircle className="w-4 h-4 md:w-6 md:h-6 text-white" />
                              ) : (
                                <div className={`${isActive ? 'text-white' : 'text-slate-400'}`}>
                                  {step.icon}
                                </div>
                              )}
                              
                              {/* Animação de pulso no step atual */}
                              {isCurrent && (
                                <span className="absolute inset-0 rounded-full bg-[#ea1d2c] animate-ping opacity-75" />
                              )}
                            </div>

                            {/* Labels */}
                            <div className="mt-1.5 md:mt-3 text-center">
                              <p className={`text-[9px] md:text-xs font-bold leading-tight ${
                                isActive ? 'text-[#ea1d2c]' : 'text-slate-400'
                              }`}>
                                {step.label}
                              </p>
                              <p className={`text-[8px] md:text-[10px] leading-tight ${
                                isActive ? 'text-slate-600' : 'text-slate-400'
                              }`}>
                                {step.sublabel}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Mensagem de status */}
                  <div className="mt-3 md:mt-6 p-2 md:p-4 bg-rose-50 border border-rose-200 rounded-lg">
                    <p className="text-[10px] md:text-sm text-rose-900 text-center font-medium leading-relaxed">
                      {currentStep === 1 && ' Aguardando confirmação do pagamento...'}
                      {currentStep === 2 && ' Seu pedido está sendo preparado com carinho!'}
                      {currentStep === 3 && (activeOrder.deliveryType === 'pickup' ? ' Seu pedido está pronto para retirada!' : ' Seu pedido saiu para entrega!')}
                      {currentStep === 4 && ' Pedido finalizado! Obrigado pela preferência!'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Header */}
        <div className="mb-4 md:mb-6">
          <div>
            <h1 className="text-xl md:text-3xl font-bold text-slate-900 mb-1">Meus Pedidos</h1>
            <p className="text-xs md:text-base text-slate-600">
              Acompanhe o status de todos os seus pedidos
            </p>
          </div>
          
          {orders.length > 0 && (
            <div className="mt-3 md:mt-4 grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
              <div className="bg-white rounded-lg p-2 md:p-3 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center gap-1.5 md:gap-2">
                  <div className="w-8 h-8 md:w-10 md:h-10 bg-yellow-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Clock className="w-4 h-4 md:w-5 md:h-5 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-[10px] md:text-xs text-slate-600 font-medium">Pendentes</p>
                    <p className="text-sm md:text-lg font-bold text-slate-900">
                      {orders.filter(o => o.status === 'pending_payment').length}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg p-2 md:p-3 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center gap-1.5 md:gap-2">
                  <div className="w-8 h-8 md:w-10 md:h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Package className="w-4 h-4 md:w-5 md:h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-[10px] md:text-xs text-slate-600 font-medium">Preparando</p>
                    <p className="text-sm md:text-lg font-bold text-slate-900">
                      {orders.filter(o => ['being_prepared', 'ready_for_pickup'].includes(o.status)).length}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg p-2 md:p-3 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center gap-1.5 md:gap-2">
                  <div className="w-8 h-8 md:w-10 md:h-10 bg-rose-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Truck className="w-4 h-4 md:w-5 md:h-5 text-[#ea1d2c]" />
                  </div>
                  <div>
                    <p className="text-[10px] md:text-xs text-slate-600 font-medium">Em Trânsito</p>
                    <p className="text-sm md:text-lg font-bold text-slate-900">
                      {orders.filter(o => o.status === 'on_the_way').length}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg p-2 md:p-3 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center gap-1.5 md:gap-2">
                  <div className="w-8 h-8 md:w-10 md:h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="w-4 h-4 md:w-5 md:h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-[10px] md:text-xs text-slate-600 font-medium">Concluídos</p>
                    <p className="text-sm md:text-lg font-bold text-slate-900">
                      {orders.filter(o => o.status === 'delivered').length}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {orders.length === 0 ? (
          <div className="text-center py-8 md:py-12">
            <Package size={48} className="md:w-16 md:h-16 text-gray-400 mx-auto mb-3 md:mb-4" />
            <h2 className="text-lg md:text-2xl font-bold text-gray-900 mb-2">
              Nenhum pedido encontrado
            </h2>
            <p className="text-sm md:text-base text-gray-600 mb-5 md:mb-8 px-4">
              Você ainda não fez nenhum pedido. Que tal começar agora?
            </p>
            <a
              href="/products"
              className="inline-flex items-center px-5 py-2.5 md:px-6 md:py-3 bg-[#ea1d2c] text-white text-sm md:text-base font-semibold rounded-lg hover:bg-[#d61a28] transition-colors"
            >
              Ver Produtos
            </a>
          </div>
        ) : (
          <div className="space-y-3 md:space-y-6">
            {orders.map((order) => {
              const { totalItems, deliveryInfo } = getOrderSummary(order);
              const isExpanded = expandedOrders.has(order.id);
              
              return (
                <div key={order.id} className="bg-white rounded-lg shadow-md overflow-hidden border border-slate-200 hover:shadow-lg transition-all duration-200">
                  {/* Card compacto - sempre visível */}
                  <div className="px-3 md:px-4 py-3 md:py-4">
                    <div className="flex items-start justify-between mb-2 md:mb-3">
                      <div className="flex-1">
                        <h3 className="text-sm md:text-lg font-bold text-slate-900 mb-1.5 md:mb-2">
                          Pedido #{order.id.toString().padStart(4, '0')}
                        </h3>
                        <div className="flex flex-wrap items-center gap-1.5 md:gap-2 mb-1.5 md:mb-2">
                          <span className={`inline-flex items-center px-2 md:px-2.5 py-0.5 md:py-1 rounded-md text-[10px] md:text-xs font-semibold ${getStatusColor(order.status)}`}>
                            {getStatusText(order.status)}
                          </span>
                          <span className={`inline-flex items-center px-2 md:px-2.5 py-0.5 md:py-1 rounded-md text-[10px] md:text-xs font-semibold ${deliveryInfo.bgColor} ${deliveryInfo.color}`}>
                            {deliveryInfo.label}
                          </span>
                        </div>
                      </div>
                      <div className="text-right ml-3 md:ml-4">
                        <p className="text-base md:text-2xl font-bold text-[#ea1d2c] mb-0.5 md:mb-1">
                          R$ {order.totalPrice != null ? Number(order.totalPrice).toFixed(2) : '--'}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between pt-2 md:pt-3 border-t border-slate-200">
                      <div className="flex flex-col md:flex-row md:items-center gap-1.5 md:gap-4 text-xs md:text-sm text-slate-600">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 md:w-4 md:h-4" />
                          <span className="text-[10px] md:text-sm">{formatDate(order.createdAt)}</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <Package className="w-3 h-3 md:w-4 md:h-4" />
                          <span className="text-[10px] md:text-sm">{totalItems} {totalItems === 1 ? 'item' : 'itens'}</span>
                        </span>
                      </div>
                      <button
                        onClick={() => toggleOrderExpansion(order.id)}
                        className="flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-1.5 md:py-2 rounded-lg bg-[#ea1d2c] text-white text-xs md:text-sm font-semibold hover:bg-[#d61a28] transition-all"
                      >
                        {isExpanded ? (
                          <>
                            <EyeOff className="w-3 h-3 md:w-4 md:h-4" />
                            <span className="hidden sm:inline">Ocultar</span>
                          </>
                        ) : (
                          <>
                            <Eye className="w-3 h-3 md:w-4 md:h-4" />
                            <span className="hidden sm:inline">Ver Mais</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Informações detalhadas - só quando expandido */}
                  {isExpanded && (
                    <>
                      {/* Endereço e Contato */}
                      <div className="px-3 md:px-4 py-2.5 md:py-3 bg-slate-50 border-t border-slate-200">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 md:gap-3">
                          <div className="flex items-start gap-2 md:gap-3">
                            <div className="w-8 h-8 md:w-10 md:h-10 bg-rose-100 rounded-lg flex items-center justify-center flex-shrink-0">
                              <MapPin className="w-4 h-4 md:w-5 md:h-5 text-[#ea1d2c]" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[10px] md:text-xs text-slate-500 font-medium mb-0.5 md:mb-1">Endereço</p>
                              <p className="text-xs md:text-sm font-semibold text-slate-900">
                                {order.shippingStreet}, {order.shippingNumber}
                              </p>
                              {order.shippingComplement && (
                                <p className="text-[10px] md:text-xs text-slate-600">{order.shippingComplement}</p>
                              )}
                              <p className="text-[10px] md:text-xs text-slate-600">{order.shippingNeighborhood}</p>
                            </div>
                          </div>
                          
                          {order.shippingPhone && (
                            <div className="flex items-start gap-2 md:gap-3">
                              <div className="w-8 h-8 md:w-10 md:h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                <Phone className="w-4 h-4 md:w-5 md:h-5 text-blue-600" />
                              </div>
                              <div>
                                <p className="text-[10px] md:text-xs text-slate-500 font-medium mb-0.5 md:mb-1">Contato</p>
                                <p className="text-xs md:text-sm font-semibold text-slate-900">{order.shippingPhone}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Itens do Pedido */}
                      <div className="px-3 md:px-4 py-2.5 md:py-4 border-t border-slate-200">
                        <h4 className="text-sm md:text-base font-bold text-slate-900 mb-2 md:mb-3 flex items-center">
                          <Package className="w-4 h-4 md:w-5 md:h-5 mr-1.5 md:mr-2" />
                          Itens do Pedido
                        </h4>
                        <div className="space-y-1.5 md:space-y-2">
                          {(order.orderitem || []).map((item) => {
                            const isCustomAcai = item.selectedOptionsSnapshot?.customAcai;
                            const isCustomSorvete = item.selectedOptionsSnapshot?.customSorvete;
                            const isCustomProduct = item.selectedOptionsSnapshot?.customProduct;
                            const customData = isCustomAcai || isCustomSorvete || isCustomProduct;
                            
                            if (!item.product) {
                              return null;
                            }
                            
                            return (
                              <div key={item.id} className="flex items-start justify-between p-2 md:p-3 bg-slate-50 rounded-lg border border-slate-200">
                                <div className="flex items-start gap-2 md:gap-3 flex-1">
                                  <div className="w-10 h-10 md:w-12 md:h-12 bg-slate-100 rounded-lg flex items-center justify-center shadow-sm flex-shrink-0 overflow-hidden">
                                    {item.product.images && item.product.images.length > 0 && item.product.images[0]?.url ? (
                                      <img
                                        src={item.product.images[0].url}
                                        alt={item.product.name}
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                          e.currentTarget.style.display = 'none';
                                        }}
                                      />
                                    ) : (
                                      <Package className="w-4 h-4 md:w-5 md:h-5 text-slate-400" />
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5 md:gap-2 mb-0.5 md:mb-1">
                                      <p className="font-bold text-slate-900 text-xs md:text-sm">{item.product.name}</p>
                                      {customData && (
                                        <span className={`inline-flex items-center px-1.5 md:px-2 py-0.5 rounded-md text-[9px] md:text-xs font-semibold ${
                                          isCustomAcai ? 'bg-[#ea1d2c]/10 text-[#ea1d2c]' :
                                          isCustomSorvete ? 'bg-blue-100 text-blue-700' : 
                                          'bg-green-100 text-green-700'
                                        }`}>
                                          Personalizado
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-[10px] md:text-xs text-slate-600 mb-1 md:mb-2">
                                      Qtd: {item.quantity} × R$ {Number(item.priceAtOrder ?? 0).toFixed(2)}
                                    </p>
                                    
                                    {/* Complementos de produtos personalizados (açaí/sorvete personalizados) */}
                                    {customData && customData.complementNames && Array.isArray(customData.complementNames) && customData.complementNames.length > 0 && (
                                      <div className="mt-1 md:mt-2">
                                        <p className="text-[9px] md:text-xs font-semibold text-slate-600 mb-0.5 md:mb-1">Complementos:</p>
                                        <div className="flex flex-wrap gap-0.5 md:gap-1">
                                          {customData.complementNames.map((complement: string, idx: number) => (
                                            <span 
                                              key={idx}
                                              className="inline-flex items-center px-1.5 md:px-2 py-0.5 md:py-1 rounded-md text-[9px] md:text-xs font-medium bg-green-100 text-green-700 border border-green-200"
                                            >
                                              {complement}
                                            </span>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                    
                                    {/* Complementos regulares do produto */}
                                    {item.complements && item.complements.length > 0 && (
                                      <div className="mt-1 md:mt-2">
                                        <p className="text-[9px] md:text-xs font-semibold text-slate-600 mb-0.5 md:mb-1">Complementos:</p>
                                        <div className="flex flex-wrap gap-0.5 md:gap-1">
                                          {item.complements.map((complement) => (
                                            <span 
                                              key={complement.id}
                                              className="inline-flex items-center gap-1 px-1.5 md:px-2 py-0.5 md:py-1 rounded-md text-[9px] md:text-xs font-medium bg-[#ea1d2c]/10 text-[#ea1d2c] border border-[#ea1d2c]/20"
                                            >
                                              {complement.imageUrl && (
                                                <img
                                                  src={complement.imageUrl.startsWith('http') ? complement.imageUrl : complement.imageUrl}
                                                  alt={complement.name}
                                                  className="w-3 h-3 rounded-full object-cover"
                                                  onError={(e) => {
                                                    e.currentTarget.style.display = 'none';
                                                  }}
                                                />
                                              )}
                                              {complement.name}
                                            </span>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <div className="text-right ml-2 md:ml-3 flex-shrink-0">
                                  <p className="text-xs md:text-sm font-bold text-[#ea1d2c]">
                                    R$ {(Number(item.priceAtOrder ?? 0) * item.quantity).toFixed(2)}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Resumo Financeiro */}
                      <div className="px-3 md:px-4 py-2.5 md:py-4 bg-green-50 border-t border-slate-200">
                        <h4 className="text-sm md:text-base font-bold text-slate-900 mb-2 md:mb-3 flex items-center">
                          <CreditCard className="w-4 h-4 md:w-5 md:h-5 mr-1.5 md:mr-2" />
                          Resumo Financeiro
                        </h4>
                        <div className="space-y-1.5 md:space-y-2">
                          <div className="flex justify-between text-xs md:text-sm">
                            <span className="text-slate-700">Subtotal:</span>
                            <span className="text-slate-900 font-semibold">
                              R$ {(order.orderitem || []).reduce((sum, item) => 
                                sum + (Number(item.priceAtOrder ?? 0) * item.quantity), 0
                              ).toFixed(2)}
                            </span>
                          </div>
                          {order.deliveryType === 'delivery' && (
                            <div className="flex justify-between text-xs md:text-sm">
                              <span className="text-slate-700">Taxa de entrega:</span>
                              <span className="text-slate-900 font-semibold">
                                R$ {Number(order.deliveryFee ?? 0).toFixed(2)}
                              </span>
                            </div>
                          )}
                          <div className="border-t border-slate-300 pt-1.5 md:pt-2 mt-1.5 md:mt-2">
                            <div className="flex justify-between items-center">
                              <span className="text-base md:text-lg font-bold text-slate-900">Total:</span>
                              <span className="text-xl md:text-2xl font-bold text-green-600">
                                R$ {Number(order.totalPrice).toFixed(2)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Ações */}
                      {order.status === 'pending_payment' && (
                        <div className="px-3 md:px-4 py-2.5 md:py-3 border-t border-slate-200 bg-slate-50">
                          <button 
                            onClick={() => handleCancelOrder(order.id)}
                            disabled={cancelingOrders.has(order.id)}
                            className="w-full flex items-center justify-center gap-1.5 md:gap-2 px-3 md:px-4 py-2 md:py-2.5 bg-red-600 text-white text-xs md:text-sm font-semibold rounded-lg hover:bg-red-700 transition-all disabled:bg-red-400 disabled:cursor-not-allowed"
                          >
                            <XCircle className="w-3.5 h-3.5 md:w-4 md:h-4" />
                            {cancelingOrders.has(order.id) ? 'Cancelando...' : 'Cancelar Pedido'}
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
      
      {/* Toast Messages */}
      <div className="fixed bottom-4 right-4 z-50 space-y-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`p-4 rounded-lg shadow-lg text-white max-w-sm ${
              toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {toast.type === 'success' ? (
                  <CheckCircle size={16} />
                ) : (
                  <XCircle size={16} />
                )}
                <span className="text-sm font-medium">{toast.message}</span>
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="text-white hover:text-gray-200"
              >
                <XCircle size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Orders;
