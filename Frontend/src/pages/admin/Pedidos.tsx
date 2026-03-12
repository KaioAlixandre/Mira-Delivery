import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Printer, ArrowRightCircle, RotateCw, Truck, MapPin, X, Eye, CreditCard, Smartphone, DollarSign, Edit, Trash2, Plus, Save, List, ChevronDown, ShoppingCart, TrendingUp, XCircle, Package, Clock, AlertCircle } from 'lucide-react';
import { Order, Product, Flavor } from '../../types';
import { printOrderReceipt } from '../../utils/printOrderReceipt';
import apiService from '../../services/api';
import { useNotification } from '../../components/NotificationProvider';

// Função para traduzir status para português
const getStatusInPortuguese = (status: string) => {
  const statusMap: { [key: string]: string } = {
    'pending_payment': 'Pagamento Pendente',
    'being_prepared': 'Preparando',
    'ready_for_pickup': 'Pronto para Retirada',
    'on_the_way': 'A Caminho',
    'delivered': 'Entregue',
    'canceled': 'Cancelado'
  };
  return statusMap[status] || status;
};

// Função para obter estilo do status
const getStatusStyle = (status: string) => {
  const statusStyles: { [key: string]: string } = {
    'pending_payment': 'bg-yellow-100 text-yellow-800 border border-yellow-200',
    'being_prepared': 'bg-blue-100 text-blue-800 border border-blue-200',
    'ready_for_pickup': 'bg-orange-100 text-orange-800 border border-orange-200',
    'on_the_way': 'bg-purple-100 text-purple-800 border border-purple-200',
    'delivered': 'bg-green-100 text-green-800 border border-green-200',
    'canceled': 'bg-red-100 text-red-800 border border-red-200'
  };
  return statusStyles[status] || 'bg-gray-100 text-gray-800 border border-gray-200';
};

const Pedidos: React.FC<{ 
  orders: Order[], 
  handleAdvanceStatus: (order: Order) => void,
  onRefresh?: () => void
}> = ({ orders, handleAdvanceStatus, onRefresh }) => {
  const { notify } = useNotification();
  const navigate = useNavigate();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    if (onRefresh) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } finally {
        // Pequeno delay para mostrar o feedback visual
        setTimeout(() => setIsRefreshing(false), 500);
      }
    }
  };
  
  // Estados para os filtros
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('today');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  
  // Estados para edição
  const [isEditing, setIsEditing] = useState(false);
  const [editedTotal, setEditedTotal] = useState<string>('');
  const [products, setProducts] = useState<Product[]>([]);
  const [showAddItem, setShowAddItem] = useState(false);
  const [newItemProductId, setNewItemProductId] = useState<number>(0);
  const [newItemQuantity, setNewItemQuantity] = useState<number>(1);
  const [newItemPrice, setNewItemPrice] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [showComplementsModal, setShowComplementsModal] = useState<{ orderId: number, itemId: number, complements: any[] } | null>(null);
  const [flavors, setFlavors] = useState<Flavor[]>([]);
  const [deliveryEstimate, setDeliveryEstimate] = useState<string>(''); // Estimativa de entrega em minutos
  const [currentTime, setCurrentTime] = useState<Date>(new Date()); // Para atualizar o timer
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<Order | null>(null); // Modal de confirmação de exclusão

  // Carregar produtos quando abrir modal de edição
  useEffect(() => {
    if (isEditing && selectedOrder) {
      loadProducts();
      setEditedTotal(selectedOrder.totalPrice.toString());
    }
  }, [isEditing, selectedOrder]);

  // Carregar sabores
  useEffect(() => {
    const loadFlavors = async () => {
      try {
        const flavorsData = await apiService.getFlavors();
        setFlavors(flavorsData);
      } catch (error) {
        console.error('Erro ao carregar sabores:', error);
      }
    };
    loadFlavors();
  }, []);

  // Carregar estimativa de entrega das configurações
  useEffect(() => {
    const loadDeliveryEstimate = async () => {
      try {
        const config = await apiService.getStoreConfig();
        const estimativa = config?.estimativaEntrega || '';
        // Extrair todos os números da estimativa e pegar o maior (ex: "30-45 min" → 45, "20 a 30 minutos" → 30)
        const numbers = estimativa.match(/\d+/g);
        if (numbers && numbers.length > 0) {
          // Converter para números e pegar o maior
          const maxNumber = Math.max(...numbers.map((n: string) => parseInt(n, 10)));
          setDeliveryEstimate(maxNumber.toString());
        } else {
          // Valor padrão se não encontrar números
          setDeliveryEstimate('45');
        }
      } catch (error) {
        console.error('Erro ao carregar estimativa de entrega:', error);
        setDeliveryEstimate('45'); // Valor padrão
      }
    };
    loadDeliveryEstimate();
  }, []);

  // Atualizar tempo atual a cada segundo para o timer
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Função para obter sabores do item do pedido
  const getItemFlavors = (item: any): Flavor[] => {
    if (!item.selectedOptionsSnapshot || !flavors.length) return [];

    // Tentar diferentes formatos de estrutura
    let selectedFlavors: any = {};
    
    if (item.selectedOptionsSnapshot.selectedFlavors) {
      selectedFlavors = item.selectedOptionsSnapshot.selectedFlavors;
    } else if (item.selectedOptionsSnapshot.flavors) {
      selectedFlavors = item.selectedOptionsSnapshot.flavors;
    } else {
      return [];
    }

    // Se selectedFlavors está vazio, retornar array vazio
    if (Object.keys(selectedFlavors).length === 0) {
      return [];
    }

    // Coletar todos os IDs de sabores selecionados
    // As chaves podem vir como strings ou números do JSON
    const flavorIds: number[] = [];
    Object.values(selectedFlavors).forEach((ids: any) => {
      if (Array.isArray(ids)) {
        flavorIds.push(...ids.map((id: any) => Number(id)));
      }
    });

    // Buscar os sabores pelos IDs
    return flavors.filter(flavor => flavorIds.includes(flavor.id));
  };

  // Polling automático para verificar novos pedidos a cada 5 segundos
  useEffect(() => {
    if (!onRefresh) return;

    const intervalId = setInterval(() => {
      // Atualizar pedidos silenciosamente
      onRefresh();
    }, 5000); // Verificar a cada 5 segundos

    // Limpar intervalo quando o componente for desmontado
    return () => clearInterval(intervalId);
  }, [onRefresh]);

  const loadProducts = async () => {
    try {
      const prods = await apiService.getProducts();
      setProducts(prods.filter(p => p.isActive));
    } catch (error) {
      console.error('Erro ao carregar produtos:', error);
    }
  };

  const handleEditOrder = () => {
    setIsEditing(true);
    if (selectedOrder) {
      setEditedTotal(selectedOrder.totalPrice.toString());
    }
  };

  const handleSaveTotal = async () => {
    if (!selectedOrder) return;
    
    const newTotal = parseFloat(editedTotal);
    if (isNaN(newTotal) || newTotal <= 0) {
      notify('Valor inválido', 'error');
      return;
    }

    setIsLoading(true);
    try {
      const response = await apiService.updateOrderTotal(selectedOrder.id, newTotal);
      if (response.data) {
        if (onRefresh) onRefresh();
        notify('Valor atualizado com sucesso!', 'success');
        // Fechar modal e retornar para a lista
        setIsEditing(false);
        setSelectedOrder(null);
        setShowAddItem(false);
      }
    } catch (error: any) {
      notify(error.response?.data?.message || 'Erro ao atualizar valor', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddItem = async () => {
    if (!selectedOrder || !newItemProductId || newItemQuantity <= 0) {
      notify('Preencha todos os campos', 'error');
      return;
    }

    setIsLoading(true);
    try {
      const product = products.find(p => p.id === newItemProductId);
      const price = newItemPrice ? parseFloat(newItemPrice) : (product?.price || 0);
      
      const response = await apiService.addItemToOrder(selectedOrder.id, {
        productId: newItemProductId,
        quantity: newItemQuantity,
        price: price
      });

      if (response.data) {
        if (onRefresh) onRefresh();
        notify('Item adicionado com sucesso!', 'success');
        // Fechar modal e retornar para a lista
        setIsEditing(false);
        setSelectedOrder(null);
        setShowAddItem(false);
        setNewItemProductId(0);
        setNewItemQuantity(1);
        setNewItemPrice('');
      }
    } catch (error: any) {
      notify(error.response?.data?.message || 'Erro ao adicionar item', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveItem = async (itemId: number) => {
    if (!selectedOrder) return;
    
    if (!window.confirm('Tem certeza que deseja remover este item?')) return;

    setIsLoading(true);
    try {
      const response = await apiService.removeItemFromOrder(selectedOrder.id, itemId);
      if (response.data) {
        if (onRefresh) onRefresh();
        notify('Item removido com sucesso!', 'success');
        // Fechar modal e retornar para a lista
        setIsEditing(false);
        setSelectedOrder(null);
        setShowAddItem(false);
      }
    } catch (error: any) {
      notify(error.response?.data?.message || 'Erro ao remover item', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!selectedOrder) return;
    
    if (!window.confirm('Tem certeza que deseja cancelar este pedido?')) return;

    setIsLoading(true);
    try {
      const response = await apiService.cancelOrder(selectedOrder.id);
      if (response.data) {
        if (onRefresh) onRefresh();
        notify('Pedido cancelado com sucesso!', 'success');
        // Fechar modal e retornar para a lista
        setIsEditing(false);
        setSelectedOrder(null);
        setShowAddItem(false);
      }
    } catch (error: any) {
      notify(error.response?.data?.message || 'Erro ao cancelar pedido', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteOrder = async () => {
    if (!showDeleteConfirm) return;

    setIsLoading(true);
    try {
      await apiService.deleteOrder(showDeleteConfirm.id);
      window.dispatchEvent(new CustomEvent('admin-order-deleted'));
      if (onRefresh) onRefresh();
      notify('Pedido excluído permanentemente com sucesso!', 'success');
      setShowDeleteConfirm(null);
      // Se o pedido excluído estava sendo visualizado, fechar o modal
      if (selectedOrder?.id === showDeleteConfirm.id) {
        setIsEditing(false);
        setSelectedOrder(null);
        setShowAddItem(false);
      }
    } catch (error: any) {
      notify(error.response?.data?.message || 'Erro ao excluir pedido', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Função para verificar se uma data é hoje
  const isToday = (date: string) => {
    const orderDate = new Date(date);
    const today = new Date();
    orderDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    return orderDate.getTime() === today.getTime();
  };

  // Função para verificar se uma data é esta semana
  const isThisWeek = (date: string) => {
    const orderDate = new Date(date);
    const today = new Date();
    const dayOfWeek = today.getDay();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - dayOfWeek);
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);
    return orderDate >= startOfWeek && orderDate <= endOfWeek;
  };

  // Função para calcular tempo decorrido e restante com sistema de semáforo
  const getOrderTimeInfo = (order: Order) => {
    const orderDate = new Date(order.createdAt);
    const now = currentTime;
    const elapsedMinutes = Math.floor((now.getTime() - orderDate.getTime()) / (1000 * 60));
    const estimateMinutes = parseInt(deliveryEstimate) || 45;
    const remainingMinutes = Math.max(0, estimateMinutes - elapsedMinutes);
    
    // Sistema de semáforo com 3 estágios
    const halfTime = estimateMinutes / 2; // Metade do tempo estimado
    const isOverdue = elapsedMinutes > estimateMinutes; // Vermelho: tempo esgotado
    const needsAttention = elapsedMinutes >= halfTime && elapsedMinutes <= estimateMinutes; // Amarelo: na metade do tempo
    const isNormal = elapsedMinutes < halfTime; // Verde: tempo normal
    
    // Determinar estágio do semáforo
    let trafficLightStage: 'green' | 'yellow' | 'red' = 'green';
    let message = '';
    
    if (isOverdue) {
      trafficLightStage = 'red';
      message = 'Pedido Atrasado';
    } else if (needsAttention) {
      trafficLightStage = 'yellow';
      message = 'Pedido Precisa de Atenção';
    } else {
      trafficLightStage = 'green';
      message = `Restam: ${formatTime(remainingMinutes)}`;
    }
    
    return {
      elapsedMinutes,
      remainingMinutes,
      isOverdue,
      needsAttention,
      isNormal,
      trafficLightStage,
      message,
      elapsedTime: formatTime(elapsedMinutes),
      remainingTime: formatTime(remainingMinutes)
    };
  };

  // Função para formatar tempo em minutos para string legível
  const formatTime = (minutes: number): string => {
    if (minutes < 60) {
      return `${minutes}min`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
  };

  // Pedidos filtrados e ordenados por prioridade (mais antigos primeiro)
  const filteredOrders = useMemo(() => {
    const filtered = orders.filter(order => {
      // Filtro por status
      const statusMatch = statusFilter === 'all' || order.status === statusFilter;

      // Filtro por data
      let dateMatch = true;
      if (dateFilter === 'today') {
        dateMatch = isToday(order.createdAt);
      } else if (dateFilter === 'week') {
        dateMatch = isThisWeek(order.createdAt);
      }

      return statusMatch && dateMatch;
    });

    // Ordenar: pedidos ativos no topo (por data, mais antigos primeiro), finalizados no final
    return filtered.sort((a, b) => {
      const isAFinalized = a.status === 'delivered' || a.status === 'canceled';
      const isBFinalized = b.status === 'delivered' || b.status === 'canceled';
      
      // Se um está finalizado e o outro não, o não finalizado vem primeiro
      if (isAFinalized && !isBFinalized) {
        return 1; // a vai para o final
      }
      if (!isAFinalized && isBFinalized) {
        return -1; // b vai para o final, a fica no topo
      }
      
      // Se ambos estão no mesmo estado (ambos ativos ou ambos finalizados)
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      
      if (isAFinalized && isBFinalized) {
        // Ambos finalizados: mais recentes primeiro (ficam no final da lista)
        return dateB - dateA;
      } else {
        // Ambos ativos: mais antigos primeiro (ficam no topo)
        return dateA - dateB;
      }
    });
  }, [orders, statusFilter, dateFilter, currentTime]);

  // Limpar todos os filtros (exceto o filtro de data que sempre será 'today')
  const clearFilters = () => {
    setStatusFilter('all');
    setDateFilter('today'); // Sempre manter como 'today'
  };

  // Função para formatar valores em Real brasileiro
  const formatCurrencyBR = (value: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  // Contar filtros ativos (considerando 'today' como padrão, não conta como filtro ativo)
  const activeFiltersCount = (statusFilter !== 'all' ? 1 : 0) + (dateFilter !== 'today' && dateFilter !== 'all' ? 1 : 0);

  // Calcular métricas baseado no período selecionado
  const metrics = useMemo(() => {
    let filteredOrdersForMetrics = orders;

    // Filtrar por período se não for "all"
    if (dateFilter === 'today') {
      filteredOrdersForMetrics = orders.filter(order => isToday(order.createdAt));
    } else if (dateFilter === 'week') {
      filteredOrdersForMetrics = orders.filter(order => isThisWeek(order.createdAt));
    }

    const canceledOrders = filteredOrdersForMetrics.filter(order => order.status === 'canceled');
    
    const totalValue = filteredOrdersForMetrics
      .filter(order => order.status !== 'canceled')
      .reduce((sum, order) => sum + Number(order.totalPrice), 0);

    // Determinar o label do período
    const periodLabel = dateFilter === 'today' ? 'Hoje' : 
                       dateFilter === 'week' ? 'Esta Semana' : 
                       'Geral';

    return {
      totalOrders: filteredOrdersForMetrics.length,
      totalValue,
      totalCanceled: canceledOrders.length,
      totalOrdersAll: orders.length,
      periodLabel
    };
  }, [orders, dateFilter]);

  return (
    <div id="pedidos" className="page">
      {/* Cabeçalho */}
      <header className="mb-3 sm:mb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
          <div className="flex-1">
            <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-slate-800 mb-1">Pedidos</h2>
            <p className="text-xs sm:text-sm text-slate-500">
              Gerencie os pedidos recebidos.
              {filteredOrders.length !== orders.length && (
                <span className="ml-2 text-brand font-medium">
                  {filteredOrders.length} de {orders.length} pedidos
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate('/admin/novo-pedido-balcao')}
              className="bg-green-600 text-white px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 hover:bg-green-700 transition-colors whitespace-nowrap text-xs sm:text-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              Novo Pedido
            </button>
            <button 
              onClick={handleRefresh}
              disabled={isRefreshing}
              className={`bg-brand text-white px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 hover:bg-brand transition-colors whitespace-nowrap text-xs sm:text-sm ${
                isRefreshing ? 'opacity-75 cursor-not-allowed' : ''
              }`}
            >
              <RotateCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Atualizando...' : 'Atualizar'}
            </button>
          </div>
        </div>
      </header>

      {/* Cards de Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
        {/* Total de Pedidos */}
        <div className="bg-white p-3 rounded-lg shadow-sm border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-blue-100 rounded-md flex-shrink-0">
              <ShoppingCart className="w-4 h-4 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-[10px] sm:text-xs text-slate-600 mb-0.5">Pedidos {metrics.periodLabel}</h3>
              <p className="text-xl sm:text-2xl font-bold text-slate-800">{metrics.totalOrders}</p>
            </div>
          </div>
        </div>

        {/* Valor Total */}
        <div className="bg-white p-3 rounded-lg shadow-sm border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-green-100 rounded-md flex-shrink-0">
              <TrendingUp className="w-4 h-4 text-green-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-[10px] sm:text-xs text-slate-600 mb-0.5">Valor Total {metrics.periodLabel}</h3>
              <p className="text-xl sm:text-2xl font-bold text-slate-800">
                {formatCurrencyBR(metrics.totalValue)}
              </p>
            </div>
          </div>
        </div>

        {/* Cancelados */}
        <div className="bg-white p-3 rounded-lg shadow-sm border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-red-100 rounded-md flex-shrink-0">
              <XCircle className="w-4 h-4 text-red-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-[10px] sm:text-xs text-slate-600 mb-0.5">Cancelados {metrics.periodLabel}</h3>
              <p className="text-xl sm:text-2xl font-bold text-slate-800">{metrics.totalCanceled}</p>
            </div>
          </div>
        </div>

        {/* Total Geral */}
        <div className="bg-white p-3 rounded-lg shadow-sm border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-red-100 rounded-md flex-shrink-0">
              <Package className="w-4 h-4 text-brand" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-[10px] sm:text-xs text-slate-600 mb-0.5">Total de Pedidos</h3>
              <p className="text-xl sm:text-2xl font-bold text-slate-800">{metrics.totalOrdersAll}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Painel de Filtros Compacto */}
      <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-100 mb-4 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        <div className="relative flex-1">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-2 pr-10 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand focus:border-brand appearance-none bg-white text-sm text-slate-700 cursor-pointer"
          >
            <option value="all">Todos os status</option>
            <option value="pending_payment">Pagamento Pendente</option>
            <option value="being_prepared">Preparando</option>
            <option value="ready_for_pickup">Pronto para Retirada</option>
            <option value="on_the_way">A Caminho</option>
            <option value="delivered">Entregue</option>
            <option value="canceled">Cancelado</option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        </div>
        <div className="relative flex-1">
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="w-full px-3 py-2 pr-10 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand focus:border-brand appearance-none bg-white text-sm text-slate-700 cursor-pointer"
          >
            <option value="all">Todos os períodos</option>
            <option value="today">Hoje</option>
            <option value="week">Esta semana</option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        </div>
        {activeFiltersCount > 0 && (
          <button
            onClick={clearFilters}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 transition-colors whitespace-nowrap"
          >
            <X className="w-3.5 h-3.5" />
            Limpar
          </button>
        )}
        {filteredOrders.length !== orders.length && (
          <span className="text-xs text-slate-500 whitespace-nowrap self-center">
            {filteredOrders.length} de {orders.length}
          </span>
        )}
      </div>

      {/* Lista de Pedidos - Cards */}
      {filteredOrders.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-12 text-center">
          <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">Nenhum pedido encontrado</p>
          <p className="text-xs text-slate-400 mt-1">
            {activeFiltersCount > 0 ? 'Tente alterar os filtros.' : 'Não há pedidos para exibir.'}
          </p>
          {activeFiltersCount > 0 && (
            <button onClick={clearFilters} className="mt-3 bg-brand text-white px-4 py-2 rounded-lg text-sm hover:bg-brand transition-colors">
              Limpar Filtros
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredOrders.map(order => {
            const itemCount = (order.orderitem || []).reduce((sum, i) => sum + i.quantity, 0);
            const timeInfo = getOrderTimeInfo(order);
            const isActiveOrder = order.status !== 'delivered' && order.status !== 'canceled';
            
            return (
              <div
                key={order.id}
                className={`bg-white rounded-xl shadow-sm border overflow-hidden transition-all hover:shadow-md ${
                  order.status === 'canceled' 
                    ? 'border-red-200 opacity-70' 
                    : order.status === 'pending_payment'
                    ? 'border-slate-100'
                    : order.status === 'ready_for_pickup'
                    ? 'border-slate-100'
                    : timeInfo.trafficLightStage === 'red' && isActiveOrder
                    ? 'border-red-500 border-2 bg-red-50'
                    : timeInfo.trafficLightStage === 'yellow' && isActiveOrder
                    ? 'border-yellow-500 border-2 bg-yellow-50'
                    : timeInfo.trafficLightStage === 'green' && isActiveOrder
                    ? 'border-green-300 border-2 bg-green-50'
                    : 'border-slate-100'
                }`}
              >
                {/* Header do Card */}
                <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-100">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-sm font-bold text-slate-600 flex-shrink-0">
                      {((order as any).nomeClienteAvulso || order.user?.username || '?')[0].toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-slate-800 text-sm truncate">
                          {(order as any).nomeClienteAvulso || order.user?.username || 'Cliente'}
                          {(order as any).identificadorMesaSenha && (
                            <span className="text-[10px] text-slate-500 ml-1">({(order as any).identificadorMesaSenha})</span>
                          )}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono flex-shrink-0">#{order.dailyNumber ?? order.id}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap mt-0.5">
                        <span className="text-[11px] text-slate-400">
                          {new Date(order.createdAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {/* Timer de entrega com semáforo - ativo apenas a partir de "Preparando"; desativado em "Pagamento Pendente" e "Pronto para Retirada" */}
                        {isActiveOrder && deliveryEstimate && order.status !== 'ready_for_pickup' && order.status !== 'pending_payment' && (
                          <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-bold border-2 ${
                            timeInfo.trafficLightStage === 'red'
                              ? 'bg-red-100 text-red-800 border-red-400 shadow-sm'
                              : timeInfo.trafficLightStage === 'yellow'
                              ? 'bg-yellow-100 text-yellow-800 border-yellow-400 shadow-sm'
                              : 'bg-green-100 text-green-800 border-green-400 shadow-sm'
                          }`}>
                            {/* Indicador visual do semáforo */}
                            <div className={`w-2.5 h-2.5 rounded-full ${
                              timeInfo.trafficLightStage === 'red'
                                ? 'bg-red-500 animate-pulse'
                                : timeInfo.trafficLightStage === 'yellow'
                                ? 'bg-yellow-500 animate-pulse'
                                : 'bg-green-500'
                            }`}></div>
                            {timeInfo.trafficLightStage === 'red' ? (
                              <>
                                <AlertCircle className="w-3 h-3" />
                                <span>{timeInfo.message}: {timeInfo.elapsedTime}</span>
                              </>
                            ) : timeInfo.trafficLightStage === 'yellow' ? (
                              <>
                                <AlertCircle className="w-3 h-3" />
                                <span>{timeInfo.message} - Restam: {timeInfo.remainingTime}</span>
                              </>
                            ) : (
                              <>
                                <Clock className="w-3 h-3" />
                                <span>{timeInfo.message}</span>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`px-2 py-1 text-[10px] font-bold rounded-full whitespace-nowrap ${getStatusStyle(order.status)}`}>
                      {getStatusInPortuguese(order.status)}
                    </span>
                  </div>
                </div>

                {/* Corpo do Card */}
                <div className="px-4 py-3">
                  <div className="flex items-start justify-between gap-4">
                    {/* Itens */}
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-slate-600 space-y-1">
                        {(order.orderitem || []).slice(0, 3).map(item => {
                          if (!item.product) return null;
                          const customData = item.selectedOptionsSnapshot?.customAcai || item.selectedOptionsSnapshot?.customSorvete || item.selectedOptionsSnapshot?.customProduct;
                          return (
                            <div key={item.id} className="flex items-center gap-1.5">
                              <span className="w-1 h-1 rounded-full bg-slate-400 flex-shrink-0"></span>
                              <span className="truncate">
                                <span className="font-medium">{item.quantity}x</span> {item.product.name}
                              </span>
                              {customData && (
                                <span className="text-[9px] px-1 py-0.5 bg-purple-100 text-purple-700 rounded flex-shrink-0">Custom</span>
                              )}
                            </div>
                          );
                        })}
                        {(order.orderitem || []).length > 3 && (
                          <span className="text-[11px] text-slate-400 ml-3">+{(order.orderitem || []).length - 3} mais itens</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-2">
                        {order.deliveryType === 'delivery' ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-600">
                            <Truck className="w-3 h-3" /> Entrega
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-green-600">
                            <MapPin className="w-3 h-3" /> Retirada
                          </span>
                        )}
                        {(order as any).paymentMethod && (
                          <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
                            {(order as any).paymentMethod === 'CREDIT_CARD' && <><CreditCard className="w-3 h-3" /> Cartão</>}
                            {(order as any).paymentMethod === 'PIX' && <><Smartphone className="w-3 h-3" /> PIX</>}
                            {(order as any).paymentMethod === 'CASH_ON_DELIVERY' && <><DollarSign className="w-3 h-3" /> Dinheiro</>}
                          </span>
                        )}
                        <span className="text-[11px] text-slate-400">{itemCount} {itemCount === 1 ? 'item' : 'itens'}</span>
                      </div>
                      {/* Indicadores especiais */}
                      <div className="flex items-center gap-2 mt-1.5">
                        {order.notes && order.notes.trim() && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] text-yellow-700 bg-yellow-50 px-1.5 py-0.5 rounded border border-yellow-200">
                            📝 Obs
                          </span>
                        )}
                        {order.precisaTroco && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] text-orange-700 bg-orange-50 px-1.5 py-0.5 rounded border border-orange-200">
                            💰 Troco
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Preço + Ações */}
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      <span className="text-lg font-bold text-slate-800">
                        {formatCurrencyBR(Number(order.totalPrice))}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setShowDeleteConfirm(order)}
                          className="p-2 text-slate-400 rounded-lg hover:bg-red-50 hover:text-red-600 transition-colors"
                          title="Excluir Pedido"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setSelectedOrder(order)}
                          className="p-2 text-slate-400 rounded-lg hover:bg-slate-100 hover:text-brand transition-colors"
                          title="Ver Detalhes"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => printOrderReceipt({
                            order,
                            user: order.user ? {
                              nomeUsuario: order.user.username,
                              telefone: (order.user as any).telefone || (order.user as any).phone,
                              email: (order.user as any).email
                            } : undefined,
                            flavors: flavors
                          })}
                          className="p-2 text-slate-400 rounded-lg hover:bg-blue-50 hover:text-blue-600 transition-colors"
                          title="Imprimir"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        {order.status !== 'delivered' && order.status !== 'canceled' && (
                          <button
                            onClick={() => handleAdvanceStatus(order)}
                            className="p-2 text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
                            title="Avançar Status"
                          >
                            <ArrowRightCircle className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Detalhes do Pedido */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-2 sm:p-4">
          <div className="bg-white rounded-md shadow-2xl max-w-4xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
            {/* Header do Modal */}
            <div className="sticky top-0 bg-gradient-to-r from-[var(--primary-color)] to-[var(--primary-color-hover)] p-2.5 sm:p-3 md:p-4 text-white flex justify-between items-start sm:items-center gap-2 rounded-t-md z-10">
              <div className="flex-1 min-w-0">
                <h2 className="text-sm sm:text-base md:text-lg font-bold truncate">Pedido #{selectedOrder.dailyNumber ?? selectedOrder.id}</h2>
                <p className="text-red-100 text-[10px] sm:text-xs mt-0.5">
                  {new Date(selectedOrder.createdAt).toLocaleString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {!isEditing && (
                  <button 
                    onClick={handleEditOrder}
                    className="p-1.5 sm:p-2 hover:bg-red-700 rounded-lg transition-colors flex-shrink-0"
                    title="Editar Pedido"
                  >
                    <Edit className="w-5 h-5 sm:w-6 sm:h-6" />
                  </button>
                )}
                <button 
                  onClick={() => {
                    setIsEditing(false);
                    setSelectedOrder(null);
                    setShowAddItem(false);
                  }}
                  className="p-1.5 sm:p-2 hover:bg-red-700 rounded-lg transition-colors flex-shrink-0"
                >
                  <X className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
              </div>
            </div>

            {/* Conteúdo do Modal */}
            <div className="p-2.5 sm:p-3 md:p-4 space-y-2.5 sm:space-y-3">
              {/* Informações do Cliente */}
              <div className="bg-slate-50 rounded-lg p-2.5 sm:p-3 border border-slate-200">
                <h3 className="text-xs sm:text-sm md:text-base font-bold text-slate-800 mb-1.5 sm:mb-2 flex items-center gap-1 sm:gap-1.5">
                  <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-brand flex-shrink-0" />
                  Informações do Cliente
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-3">
                  <div>
                    <p className="text-[10px] sm:text-xs text-slate-600">Cliente</p>
                    <p className="font-semibold text-slate-800 text-xs sm:text-sm break-words">
                      {(selectedOrder as any).nomeClienteAvulso || selectedOrder.user?.username || '-'}
                      {(selectedOrder as any).identificadorMesaSenha && (
                        <span className="text-[10px] text-slate-500 ml-1">({(selectedOrder as any).identificadorMesaSenha})</span>
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] sm:text-xs text-slate-600">Telefone</p>
                    <p className="font-semibold text-slate-800 text-xs sm:text-sm">{(selectedOrder.user as any)?.telefone || (selectedOrder.user as any)?.phone || '-'}</p>
                  </div>
                  
                  {/* Endereço Principal do Cliente */}
                  {(selectedOrder.user as any)?.enderecos && (selectedOrder.user as any).enderecos.length > 0 && (
                    <div className="md:col-span-2">
                      <p className="text-[10px] sm:text-xs text-slate-600 mb-1">Endereço Principal</p>
                      <div className="bg-white rounded-lg p-2 border-l-4 border-brand">
                        <p className="font-semibold text-slate-800 text-[10px] sm:text-xs break-words">
                          {(selectedOrder.user as any).enderecos[0].street}, {(selectedOrder.user as any).enderecos[0].number}
                          {(selectedOrder.user as any).enderecos[0].complement && ` - ${(selectedOrder.user as any).enderecos[0].complement}`}
                        </p>
                        <p className="text-[10px] sm:text-xs text-slate-600 mt-0.5">
                          {(selectedOrder.user as any).enderecos[0].neighborhood}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Status e Tipo de Entrega */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                <div className="bg-slate-50 rounded-lg p-2 sm:p-2.5 border border-slate-200">
                  <p className="text-[10px] sm:text-xs text-slate-600 mb-1">Status do Pedido</p>
                  <span className={`inline-block px-1.5 sm:px-2 py-0.5 sm:py-1 text-[10px] sm:text-xs font-semibold rounded-full ${getStatusStyle(selectedOrder.status)}`}>
                    {getStatusInPortuguese(selectedOrder.status)}
                  </span>
                </div>
                <div className="bg-slate-50 rounded-lg p-2 sm:p-2.5 border border-slate-200">
                  <p className="text-[10px] sm:text-xs text-slate-600 mb-1">Tipo de Entrega</p>
                  <div className="flex items-center gap-1 sm:gap-1.5">
                    {selectedOrder.deliveryType === 'delivery' ? (
                      <>
                        <Truck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600 flex-shrink-0" />
                        <span className="font-semibold text-blue-600 text-xs sm:text-sm">Entrega</span>
                      </>
                    ) : (
                      <>
                        <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-600 flex-shrink-0" />
                        <span className="font-semibold text-green-600 text-xs sm:text-sm">Retirada</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="bg-slate-50 rounded-lg p-2 sm:p-2.5 border border-slate-200 sm:col-span-2 md:col-span-1">
                  <p className="text-[10px] sm:text-xs text-slate-600 mb-1">Forma de Pagamento</p>
                  <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
                    {(selectedOrder as any).paymentMethod === 'CREDIT_CARD' && (
                      <>
                        <CreditCard className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-600 flex-shrink-0" />
                        <span className="font-semibold text-purple-600 text-xs sm:text-sm">Cartão de Crédito</span>
                      </>
                    )}
                    {(selectedOrder as any).paymentMethod === 'PIX' && (
                      <>
                        <Smartphone className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-600 flex-shrink-0" />
                        <span className="font-semibold text-green-600 text-xs sm:text-sm">PIX</span>
                      </>
                    )}
                    {(selectedOrder as any).paymentMethod === 'CASH_ON_DELIVERY' && (
                      <>
                        <DollarSign className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-yellow-600 flex-shrink-0" />
                        <span className="font-semibold text-yellow-600 text-xs sm:text-sm">Dinheiro</span>
                      </>
                    )}
                    {!(selectedOrder as any).paymentMethod && (
                      <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
                        <span className="text-[10px] sm:text-xs text-slate-500">⚠️ Não registrado</span>
                        <span className="text-[9px] sm:text-[10px] text-slate-400">(pedido antigo)</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Informação de Troco */}
              {selectedOrder.paymentMethod === 'CASH_ON_DELIVERY' && selectedOrder.precisaTroco && (
                <div className="bg-yellow-50 rounded-lg p-2.5 sm:p-3 border-2 border-yellow-300">
                  <h3 className="text-xs sm:text-sm md:text-base font-bold text-yellow-900 mb-1.5 sm:mb-2 flex items-center gap-1 sm:gap-1.5">
                    <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-700" />
                    Troco Necessário
                  </h3>
                  <div className="bg-white rounded-lg p-2 sm:p-2.5 border border-yellow-200">
                    <p className="text-[10px] sm:text-xs md:text-sm text-slate-700 font-semibold">
                      {selectedOrder.valorTroco ? (
                        <>
                          Cliente pagará com: <span className="text-yellow-700">R$ {Number(selectedOrder.valorTroco).toFixed(2)}</span>
                          <br />
                          <span className="text-slate-600 text-[10px] sm:text-xs">
                            Troco de: R$ {(Number(selectedOrder.valorTroco) - Number(selectedOrder.totalPrice)).toFixed(2)}
                          </span>
                        </>
                      ) : (
                        <span className="text-yellow-700">Cliente precisa de troco</span>
                      )}
                    </p>
                  </div>
                </div>
              )}

              {/* Itens do Pedido */}
              <div className="bg-slate-50 rounded-lg p-2.5 sm:p-3 border border-slate-200">
                <h3 className="text-xs sm:text-sm md:text-base font-bold text-slate-800 mb-2">Itens do Pedido</h3>
                <div className="space-y-1.5 sm:space-y-2">
                  {(selectedOrder.orderitem || []).map(item => {
                    const isCustomAcai = item.selectedOptionsSnapshot?.customAcai;
                    const isCustomSorvete = item.selectedOptionsSnapshot?.customSorvete;
                    const isCustomProduct = item.selectedOptionsSnapshot?.customProduct;
                    const customData = isCustomAcai || isCustomSorvete || isCustomProduct;
                    const additionalsTotal = Array.isArray((item as any).additionals)
                      ? (item as any).additionals.reduce((acc: number, a: any) => acc + (Number(a.value || 0) * Number(a.quantity || 0)), 0)
                      : 0;
                    const unitPrice = Number(item.priceAtOrder || 0) + additionalsTotal;
                    
                    if (!item.product) return null;
                    
                    return (
                      <div key={item.id} className="bg-white rounded-lg p-2 sm:p-2.5 border border-slate-200">
                        <div className="flex justify-between items-start gap-2 mb-1">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1 sm:gap-1.5 mb-0.5 flex-wrap">
                              <span className="font-bold text-slate-800 text-[11px] sm:text-xs break-words">{item.product.name}</span>
                              {customData && (
                                <span className={`inline-flex items-center px-1 sm:px-1.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-medium flex-shrink-0 ${
                                  isCustomAcai ? 'bg-purple-100 text-purple-800' :
                                  isCustomSorvete ? 'bg-blue-100 text-blue-800' : 
                                  'bg-green-100 text-green-800'
                                }`}>
                                  Personalizado
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] sm:text-xs text-slate-600">
                              Qtd: {item.quantity} × R$ {unitPrice.toFixed(2)}
                            </p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="font-bold text-brand text-xs sm:text-sm">
                              R$ {(unitPrice * item.quantity).toFixed(2)}
                            </p>
                          </div>
                        </div>
                        
                        {/* Complementos de produtos personalizados */}
                        {customData && customData.complementNames && Array.isArray(customData.complementNames) && customData.complementNames.length > 0 && (
                          <div className="mt-1 pt-1 border-t border-slate-200">
                            <div className="flex items-center gap-2">
                              <p className="text-[9px] sm:text-[10px] font-semibold text-slate-600">Complementos:</p>
                              <button
                                onClick={() => setShowComplementsModal({ 
                                  orderId: selectedOrder.id, 
                                  itemId: item.id, 
                                  complements: customData.complementNames.map((name: string, idx: number) => ({ id: idx, name })) 
                                })}
                                className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[8px] sm:text-[9px] bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 transition-colors"
                                title="Ver complementos"
                              >
                                <List className="w-2.5 h-2.5" />
                                <span>{customData.complementNames.length}</span>
                              </button>
                            </div>
                          </div>
                        )}
                        
                        {/* Complementos regulares do produto */}
                        {item.complements && item.complements.length > 0 && (
                          <div className="mt-1 pt-1 border-t border-slate-200">
                            <div className="flex items-center gap-2">
                              <p className="text-[9px] sm:text-[10px] font-semibold text-slate-600">Complementos:</p>
                              <button
                                onClick={() => setShowComplementsModal({ orderId: selectedOrder.id, itemId: item.id, complements: item.complements || [] })}
                                className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[8px] sm:text-[9px] bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 transition-colors"
                                title="Ver complementos"
                              >
                                <List className="w-2.5 h-2.5" />
                                <span>{item.complements.length}</span>
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Adicionais */}
                        {(item as any).additionals && (item as any).additionals.length > 0 && (
                          <div className="mt-1 pt-1 border-t border-slate-200">
                            <div className="flex items-start gap-2 flex-wrap">
                              <p className="text-[9px] sm:text-[10px] font-semibold text-slate-600">Adicionais:</p>
                              <div className="inline-flex items-center gap-1 flex-wrap">
                                {(item as any).additionals.map((a: any) => (
                                  <span
                                    key={a.id}
                                    className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200"
                                    title={a.name}
                                  >
                                    {a.quantity}x {a.name} (+{formatCurrencyBR(Number(a.value) || 0)})
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Sabores */}
                        {(() => {
                          const itemFlavors = getItemFlavors(item);
                          if (itemFlavors.length > 0) {
                            return (
                              <div className="mt-1 pt-1 border-t border-slate-200">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="text-[9px] sm:text-[10px] font-semibold text-slate-600">Sabores:</p>
                                  <div className="inline-flex items-center gap-1 flex-wrap">
                                    {itemFlavors.map((flavor) => (
                                      <span
                                        key={flavor.id}
                                        className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] bg-pink-50 text-pink-700 border border-pink-200"
                                      >
                                        {flavor.name}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        })()}
                        {isEditing && (
                          <div className="mt-2 pt-2 border-t border-red-200">
                            <button
                              onClick={() => handleRemoveItem(item.id)}
                              disabled={isLoading}
                              className="w-full bg-red-500 text-white px-2 py-1 rounded text-xs font-semibold hover:bg-red-600 disabled:opacity-50 flex items-center justify-center gap-1"
                            >
                              <Trash2 className="w-3 h-3" />
                              Remover Item
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Observações do Pedido */}
              {selectedOrder.notes && selectedOrder.notes.trim() && (
                <div className="bg-yellow-50 rounded-lg p-2.5 sm:p-3 border-2 border-yellow-200">
                  <h3 className="text-xs sm:text-sm md:text-base font-bold text-yellow-900 mb-1.5 sm:mb-2 flex items-center gap-1 sm:gap-1.5">
                    <span className="text-base sm:text-lg">📝</span>
                    Observações do Cliente
                  </h3>
                  <div className="bg-white rounded-lg p-2 sm:p-2.5 border border-yellow-200">
                    <p className="text-[10px] sm:text-xs md:text-sm text-slate-700 whitespace-pre-wrap break-words">
                      {selectedOrder.notes}
                    </p>
                  </div>
                </div>
              )}

              {/* Resumo Financeiro */}
              <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-lg p-2.5 sm:p-3 border border-red-200">
                <div className="flex justify-between items-center mb-1.5 sm:mb-2">
                  <h3 className="text-xs sm:text-sm md:text-base font-bold text-slate-800">Resumo Financeiro</h3>
                  {isEditing && (
                    <button
                      onClick={handleSaveTotal}
                      disabled={isLoading}
                      className="text-xs bg-brand text-white px-2 py-1 rounded hover:bg-brand disabled:opacity-50"
                    >
                      <Save className="w-3 h-3 inline mr-1" />
                      Salvar
                    </button>
                  )}
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-slate-700 text-[10px] sm:text-xs">
                    <span>Subtotal:</span>
                    {isEditing ? (
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={editedTotal}
                        onChange={(e) => setEditedTotal(e.target.value)}
                        className="w-24 px-2 py-1 text-xs border rounded"
                      />
                    ) : (
                      <span className="font-semibold">R$ {Number(selectedOrder.totalPrice).toFixed(2)}</span>
                    )}
                  </div>
                  {selectedOrder.deliveryType === 'delivery' && (
                    <div className="flex justify-between text-slate-700 text-[10px] sm:text-xs">
                      <span>Taxa de Entrega:</span>
                      <span className="font-semibold">R$ {Number(selectedOrder.deliveryFee || 0).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="border-t border-red-300 pt-1 flex justify-between">
                    <span className="text-sm sm:text-base font-bold text-slate-900">Total:</span>
                    <span className="text-sm sm:text-base md:text-lg font-bold text-brand">
                      R$ {isEditing ? Number(editedTotal || 0).toFixed(2) : Number(selectedOrder.totalPrice).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Adicionar Item (modo edição) */}
              {isEditing && (
                <div className="bg-blue-50 rounded-lg p-2.5 sm:p-3 border border-blue-200">
                  {!showAddItem ? (
                    <button
                      onClick={() => setShowAddItem(true)}
                      className="w-full bg-blue-600 text-white px-3 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 text-xs sm:text-sm"
                    >
                      <Plus className="w-4 h-4" />
                      Adicionar Item
                    </button>
                  ) : (
                    <div className="space-y-2">
                      <h4 className="text-xs sm:text-sm font-bold text-slate-800">Adicionar Novo Item</h4>
                      <select
                        value={newItemProductId}
                        onChange={(e) => {
                          setNewItemProductId(Number(e.target.value));
                          const product = products.find(p => p.id === Number(e.target.value));
                          if (product) setNewItemPrice(product.price.toString());
                        }}
                        className="w-full px-2 py-1 text-xs border rounded"
                      >
                        <option value={0}>Selecione um produto</option>
                        {products.map(product => (
                          <option key={product.id} value={product.id}>
                            {product.name} - R$ {product.price.toFixed(2)}
                          </option>
                        ))}
                      </select>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          min="1"
                          value={newItemQuantity}
                          onChange={(e) => setNewItemQuantity(Number(e.target.value))}
                          placeholder="Quantidade"
                          className="flex-1 px-2 py-1 text-xs border rounded"
                        />
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={newItemPrice}
                          onChange={(e) => setNewItemPrice(e.target.value)}
                          placeholder="Preço"
                          className="flex-1 px-2 py-1 text-xs border rounded"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={handleAddItem}
                          disabled={isLoading}
                          className="flex-1 bg-green-600 text-white px-3 py-1 rounded text-xs font-semibold hover:bg-green-700 disabled:opacity-50"
                        >
                          Adicionar
                        </button>
                        <button
                          onClick={() => {
                            setShowAddItem(false);
                            setNewItemProductId(0);
                            setNewItemQuantity(1);
                            setNewItemPrice('');
                          }}
                          className="flex-1 bg-gray-400 text-white px-3 py-1 rounded text-xs font-semibold hover:bg-gray-500"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Ações */}
              <div className="flex flex-col sm:flex-row gap-1.5 sm:gap-2">
                {!isEditing ? (
                  <>
                    <button 
                      onClick={() => handleAdvanceStatus(selectedOrder)}
                      className="flex-1 bg-green-600 text-white px-2.5 sm:px-3 py-2 sm:py-2.5 rounded-lg font-semibold hover:bg-green-700 transition-colors flex items-center justify-center gap-1 sm:gap-1.5 text-xs sm:text-sm"
                    >
                      <ArrowRightCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                      <span>Avançar Status</span>
                    </button>
                    <button 
                      onClick={() => {
                        printOrderReceipt({
                          order: selectedOrder,
                          user: selectedOrder.user ? {
                            nomeUsuario: selectedOrder.user.username,
                            telefone: (selectedOrder.user as any).telefone || (selectedOrder.user as any).phone,
                            email: (selectedOrder.user as any).email
                          } : undefined,
                          flavors: flavors
                        });
                      }}
                      className="flex-1 bg-blue-600 text-white px-2.5 sm:px-3 py-2 sm:py-2.5 rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-1 sm:gap-1.5 text-xs sm:text-sm"
                    >
                      <Printer className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                      <span>Imprimir</span>
                    </button>
                    {selectedOrder.status !== 'canceled' && 
                     selectedOrder.status !== 'on_the_way' && 
                     selectedOrder.status !== 'ready_for_pickup' && 
                     selectedOrder.status !== 'delivered' && (
                      <button 
                        onClick={handleCancelOrder}
                        disabled={isLoading}
                        className="flex-1 bg-red-600 text-white px-2.5 sm:px-3 py-2 sm:py-2.5 rounded-lg font-semibold hover:bg-red-700 transition-colors flex items-center justify-center gap-1 sm:gap-1.5 text-xs sm:text-sm disabled:opacity-50"
                      >
                        <X className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                        <span>Cancelar Pedido</span>
                      </button>
                    )}
                    <button 
                      onClick={() => setShowDeleteConfirm(selectedOrder)}
                      disabled={isLoading}
                      className="flex-1 bg-red-700 text-white px-2.5 sm:px-3 py-2 sm:py-2.5 rounded-lg font-semibold hover:bg-red-800 transition-colors flex items-center justify-center gap-1 sm:gap-1.5 text-xs sm:text-sm disabled:opacity-50"
                    >
                      <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                      <span>Excluir</span>
                    </button>
                  </>
                ) : (
                  <button 
                    onClick={() => {
                      setIsEditing(false);
                      setShowAddItem(false);
                      setEditedTotal(selectedOrder.totalPrice.toString());
                    }}
                    className="flex-1 bg-gray-600 text-white px-2.5 sm:px-3 py-2 sm:py-2.5 rounded-lg font-semibold hover:bg-gray-700 transition-colors flex items-center justify-center gap-1 sm:gap-1.5 text-xs sm:text-sm"
                  >
                    <X className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                    <span>Sair da Edição</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Complementos */}
      {showComplementsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-4 sm:p-6 rounded-xl max-w-md w-full max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base sm:text-lg font-semibold text-slate-800 flex items-center gap-2">
                <List className="w-5 h-5 text-purple-600" />
                Complementos
              </h3>
              <button 
                onClick={() => setShowComplementsModal(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-2">
              {showComplementsModal.complements.map((complement: any) => (
                <div
                  key={complement.id}
                  className="p-2 sm:p-3 bg-purple-50 border border-purple-200 rounded-lg"
                >
                  <span className="text-sm sm:text-base font-medium text-purple-800">
                    {complement.name}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t border-slate-200">
              <button
                onClick={() => setShowComplementsModal(null)}
                className="w-full px-4 py-2 bg-brand text-white rounded-lg hover:bg-brand transition-colors text-sm font-medium"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000] p-4">
          <div className="bg-white p-4 sm:p-6 rounded-xl max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg sm:text-xl font-bold text-slate-800 flex items-center gap-2">
                <AlertCircle className="w-6 h-6 text-red-600" />
                Excluir Pedido
              </h3>
              <button 
                onClick={() => setShowDeleteConfirm(null)}
                className="text-slate-400 hover:text-slate-600"
                disabled={isLoading}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="mb-6">
              <p className="text-sm sm:text-base text-slate-700 mb-2">
                Tem certeza que deseja <strong className="text-red-600">excluir permanentemente</strong> o pedido <strong>#{showDeleteConfirm.id}</strong>?
              </p>
              <p className="text-xs sm:text-sm text-slate-500">
                Esta ação não pode ser desfeita. Todos os dados relacionados a este pedido serão removidos permanentemente.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                disabled={isLoading}
                className="flex-1 px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors text-sm font-medium disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteOrder}
                disabled={isLoading}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <RotateCw className="w-4 h-4 animate-spin" />
                    Excluindo...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Excluir Permanentemente
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Pedidos;