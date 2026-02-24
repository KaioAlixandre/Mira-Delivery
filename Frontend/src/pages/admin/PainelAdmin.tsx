import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, ShoppingCart, Package, Users, Settings, LogOut, Plus, Truck, Store, X, ChefHat,
  IceCream, ChevronDown, ChevronRight
} from 'lucide-react';
import apiService from '../../services/api';

import { Product, ProductCategory, User, Order } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../components/NotificationProvider';
import Dashboard from './Dashboard';
import Pedidos from './Pedidos';
import Produtos from './Produtos';
import Clientes from './Clientes';
import Configuracoes from './Configuracoes';
import Entregadores from './Entregadores';
import Complementos from './Complementos';
import Sabores from './Sabores';
import Cozinheiros from './Cozinheiros';
import ModalSelecaoEntregador from './components/ModalSelecaoEntregador';

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

const pages = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard /> },
  { id: 'pedidos', label: 'Pedidos', icon: <ShoppingCart /> },
  { id: 'produtos', label: 'Produtos', icon: <Package /> },
  { id: 'complementos', label: 'Complementos', icon: <Plus /> },
  { id: 'sabores', label: 'Sabores', icon: <IceCream /> },
  { id: 'clientes', label: 'Clientes', icon: <Users /> },
  { id: 'entregadores', label: 'Entregadores', icon: <Truck /> },
  { id: 'cozinheiros', label: 'Cozinheiros', icon: <ChefHat /> },
];

const ConfiguracoesLoja: React.FC = () => {
  const { notify } = useNotification();
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiService.getStoreConfig().then((data) => {
      setConfig({
        nomeLoja: data.nomeLoja ?? '',
        chavePix: data.chavePix ?? data.telefoneWhatsapp ?? '',
        enderecoLoja: data.enderecoLoja ?? '',
        taxaEntrega: data.taxaEntrega ?? '',
        raioEntregaKm: data.raioEntregaKm ?? ''
      });
      setLoading(false);
    }).catch(() => {
      setLoading(false);
      notify('Erro ao carregar configurações da loja', 'error');
    });
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setConfig((prev: any) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await apiService.updateStoreConfig({
        ...config,
        taxaEntrega: config.taxaEntrega === '' ? null : config.taxaEntrega,
        raioEntregaKm: config.raioEntregaKm === '' ? null : config.raioEntregaKm,
      });
      setLoading(false);
      notify('Configurações da loja salvas com sucesso!', 'success');
    } catch {
      setLoading(false);
      notify('Erro ao salvar configurações da loja. Tente novamente.', 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600">Carregando configurações...</div>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Erro ao carregar configurações.</p>
      </div>
    );
  }

  return (
    <div id="configuracoes-loja" className="page">
      <header className="mb-4 sm:mb-6">
        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-800">Configurações da Loja</h2>
        <p className="text-xs sm:text-sm text-slate-500">Ajuste dados e informações gerais da loja.</p>
      </header>
      <div className="bg-white p-3 sm:p-4 md:p-6 rounded-xl shadow-md">
        <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Nome da loja</label>
              <input
                type="text"
                name="nomeLoja"
                value={config.nomeLoja}
                onChange={handleChange}
                className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Chave Pix</label>
              <input
                type="text"
                name="chavePix"
                value={config.chavePix}
                onChange={handleChange}
                className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Endereço</label>
            <input
              type="text"
              name="enderecoLoja"
              value={config.enderecoLoja}
              onChange={handleChange}
              className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Taxa de entrega (R$)</label>
              <input
                type="number"
                name="taxaEntrega"
                value={config.taxaEntrega}
                onChange={handleChange}
                min="0"
                step="0.01"
                className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Raio de entrega (km)</label>
              <input
                type="number"
                name="raioEntregaKm"
                value={config.raioEntregaKm}
                onChange={handleChange}
                min="0"
                step="0.1"
                className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="pt-4">
            <button
              type="submit"
              className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors w-full sm:w-auto"
              disabled={loading}
            >
              Salvar Alterações
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const Admin: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activePage, setActivePage] = useState('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isConfigExpanded, setIsConfigExpanded] = useState(false);
  const [storeName, setStoreName] = useState('Loja');
  const [products, setProducts] = useState<Product[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [users, setUsers] = useState<User[]>([]); // Lista de usuários
  const [orders, setOrders] = useState<Order[]>([]); // Estado para pedidos
  
  // Estados do modal de seleção de entregador
  const [showDelivererModal, setShowDelivererModal] = useState(false);
  const [selectedOrderForDelivery, setSelectedOrderForDelivery] = useState<Order | null>(null);
  // Modal de confirmação para avançar status
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmOrder, setConfirmOrder] = useState<AdvanceStatusOrder | null>(null);
  const [confirmNextStatus, setConfirmNextStatus] = useState<string>('');
  // Modal específico para confirmação de entrega
  const [confirmDeliveryOpen, setConfirmDeliveryOpen] = useState(false);
  const [confirmDeliveryOrder, setConfirmDeliveryOrder] = useState<AdvanceStatusOrder | null>(null);

  // Verificar se o usuário tem permissão de admin
  useEffect(() => {
    if (!user) {
     
      navigate('/login');
      return;
    }
    
    if (user.funcao !== 'admin' && user.funcao !== 'master') {
     
      navigate('/');
      return;
    }
    
   
  }, [user, navigate]);

  // Se não há usuário ou não tem permissão, não renderizar nada
  if (!user || (user.funcao !== 'admin' && user.funcao !== 'master')) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verificando permissões...</p>
        </div>
      </div>
    );
  }

  useEffect(() => {
    if (activePage === 'produtos') {
      apiService.getProducts().then(setProducts);
    }
  }, [activePage, showAddModal, editProduct]);

  useEffect(() => {
    const isConfigPage = activePage === 'config-funcionamento' || activePage === 'config-loja';
    if (isConfigPage) {
      setIsConfigExpanded(true);
    }
  }, [activePage]);

  useEffect(() => {
    apiService.getCategories().then(setCategories);
  }, []); // Busca as categorias quando o componente Admin é montado

  useEffect(() => {
    if (activePage === 'clientes') {
      apiService.getUsers().then(setUsers);
    }
  }, [activePage]);

  useEffect(() => {
    if (activePage === 'pedidos') {
      apiService.getOrdersAdmin().then(setOrders);
    }
  }, [activePage]);

  useEffect(() => {
    apiService.getStoreConfig().then((data) => {
      const nome = (data?.nomeLoja || '').trim();
      if (nome) {
        setStoreName(nome);
      }
    }).catch(() => {
      // manter fallback
    });
  }, []);

  const handleRefreshOrders = async () => {
    const refreshedOrders = await apiService.getOrdersAdmin();
    setOrders(refreshedOrders);
  };

  const handleAddProduct = async (data: any) => {
    await apiService.createProduct(data);
    setShowAddModal(false);
    // Recarregar produtos e categorias após adicionar
    setProducts(await apiService.getProducts());
    setCategories(await apiService.getCategories());
  };

  const handleCategoriesChange = async () => {
    // Recarregar categorias quando houver mudanças
    setCategories(await apiService.getCategories());
    // Também recarregar produtos para atualizar as categorias nos produtos
    if (activePage === 'produtos') {
      setProducts(await apiService.getProducts());
    }
  };

  const handleEdit = (product: Product) => setEditProduct(product);

  const handleUpdateProduct = async (id: number, data: any) => {
    try {
      await apiService.updateProduct(id, data);
      setEditProduct(null);
      // Recarregar a lista de produtos após atualização
      const updatedProducts = await apiService.getProducts();
      setProducts(updatedProducts);
    } catch (error) {
     
      alert('Erro ao atualizar produto. Tente novamente.');
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Deseja remover este produto?')) {
      await apiService.deleteProduct(id);
      setProducts(await apiService.getProducts());
    }
  };

  const getNextStatus = (current: string, deliveryType: string = 'delivery') => {
    if (current === 'being_prepared') {
      // Para retirada: being_prepared -> ready_for_pickup
      if (deliveryType === 'pickup') {
        return 'ready_for_pickup';
      }
      // Para entrega: being_prepared -> on_the_way
      return 'on_the_way';
    }
    
    // Para outros status, seguir ordem normal
    const statusFlow = deliveryType === 'pickup' 
      ? ['pending_payment', 'being_prepared', 'ready_for_pickup', 'delivered', 'canceled']
      : ['pending_payment', 'being_prepared', 'on_the_way', 'delivered', 'canceled'];
    
    const idx = statusFlow.indexOf(current);
    return idx >= 0 && idx < statusFlow.length - 2 ? statusFlow[idx + 1] : statusFlow[idx];
  };

  interface AdvanceStatusOrder {
    id: number;
    status: string;
    deliveryType?: string;
  }

  // Abre modal de confirmação antes de avançar o status
  const handleAdvanceStatus = (order: AdvanceStatusOrder): void => {
    const nextStatus = getNextStatus(order.status, order.deliveryType);
    setConfirmOrder(order);
    setConfirmNextStatus(nextStatus);
    setConfirmOpen(true);
  };

  // Função que executa o avanço de status após confirmação
  const performAdvanceStatus = async (): Promise<void> => {
    if (!confirmOrder) return;
    const order = confirmOrder;
    const nextStatus = confirmNextStatus || getNextStatus(order.status, order.deliveryType);

    // Fechar modal de confirmação
    setConfirmOpen(false);

    // Se o próximo status for 'delivered', abrir modal específico para confirmar entrega
    if (nextStatus === 'delivered') {
      setConfirmDeliveryOrder(order);
      setConfirmDeliveryOpen(true);
      // limpar confirmOrder para evitar duplicidade
      setConfirmOrder(null);
      setConfirmNextStatus('');
      return;
    }

    // Se está mudando de "being_prepared" para "on_the_way" E é entrega (delivery), mostrar modal de seleção de entregador
    if (order.status === 'being_prepared' && nextStatus === 'on_the_way' && order.deliveryType === 'delivery') {
      setSelectedOrderForDelivery(order as Order);
      setShowDelivererModal(true);
      // limpar confirmOrder quando o modal de entregador for exibido
      setConfirmOrder(null);
      setConfirmNextStatus('');
      return;
    }

    // Para outros casos (incluindo retirada), avançar status normalmente sem entregador
    try {
      await apiService.advanceOrderStatus(order.id, nextStatus);
      setOrders(await apiService.getOrdersAdmin());
    } catch (err) {
   
    } finally {
      setConfirmOrder(null);
      setConfirmNextStatus('');
    }
  };

  const handleDelivererSelected = async (delivererId: number) => {
    if (!selectedOrderForDelivery) return;
  
    try {
      await apiService.advanceOrderStatus(selectedOrderForDelivery.id, 'on_the_way', delivererId);
      setOrders(await apiService.getOrdersAdmin());
      setShowDelivererModal(false);
      setSelectedOrderForDelivery(null);
    } catch (error) {
   
    }
  };

  // Executa confirmação de entrega (quando o próximo status for 'delivered')
  const performConfirmDelivery = async (): Promise<void> => {
    if (!confirmDeliveryOrder) return;
    const order = confirmDeliveryOrder;
    setConfirmDeliveryOpen(false);
    try {
      await apiService.advanceOrderStatus(order.id, 'delivered');
      setOrders(await apiService.getOrdersAdmin());
    } catch (err) {
   
    } finally {
      setConfirmDeliveryOrder(null);
    }
  };

  return (
    <div className="flex h-screen bg-slate-100 font-inter">
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-slate-800 text-white flex items-center justify-between px-4 z-50">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Store className="w-5 h-5" />
          <span>{storeName}</span>
        </h1>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
        >
          {isMobileMenuOpen ? <X className="w-6 h-6" /> : <LayoutDashboard className="w-6 h-6" />}
        </button>
      </div>

      {/* Sidebar */}
      <aside className={`w-64 bg-slate-800 text-slate-300 flex flex-col fixed h-full z-40 transition-transform duration-300 ${
        isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
      } lg:translate-x-0`}>
        <div className="h-20 flex items-center justify-center border-b border-slate-700">
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Store />
            <span>{storeName}</span>
          </h1>
        </div>
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {pages.map(page => (
            <button
              key={page.id}
              onClick={() => {
                setActivePage(page.id);
                setIsMobileMenuOpen(false);
              }}
              className={`sidebar-item flex items-center gap-3 px-4 py-3 rounded-lg transition-all hover:bg-slate-700 w-full text-left ${
                activePage === page.id ? 'active bg-indigo-600 text-white shadow' : ''
              }`}
            >
              <span className="w-5 h-5">{page.icon}</span>
              <span className="font-medium">{page.label}</span>
            </button>
          ))}

          <div>
            <button
              onClick={() => {
                setIsConfigExpanded(prev => {
                  const next = !prev;
                  if (next) {
                    setActivePage((current) => {
                      const isConfigPage = current === 'config-funcionamento' || current === 'config-loja';
                      return isConfigPage ? current : 'config-funcionamento';
                    });
                  }
                  setIsMobileMenuOpen(false);
                  return next;
                });
              }}
              className={`sidebar-item flex items-center gap-3 px-4 py-3 rounded-lg transition-all hover:bg-slate-700 w-full text-left ${
                (activePage === 'config-funcionamento' || activePage === 'config-loja') ? 'active bg-indigo-600 text-white shadow' : ''
              }`}
            >
              <span className="w-5 h-5"><Settings /></span>
              <span className="font-medium flex-1">Configurações</span>
              <span className="w-5 h-5">
                {isConfigExpanded ? <ChevronDown /> : <ChevronRight />}
              </span>
            </button>

            {isConfigExpanded && (
              <div className="mt-1 space-y-1">
                <button
                  onClick={() => {
                    setActivePage('config-funcionamento');
                    setIsMobileMenuOpen(false);
                  }}
                  className={`sidebar-item flex items-center gap-3 pl-12 pr-4 py-2 rounded-lg transition-all hover:bg-slate-700 w-full text-left ${
                    activePage === 'config-funcionamento' ? 'active bg-indigo-600 text-white shadow' : ''
                  }`}
                >
                  <span className="text-sm font-medium">Funcionamento da loja</span>
                </button>

                <button
                  onClick={() => {
                    setActivePage('config-loja');
                    setIsMobileMenuOpen(false);
                  }}
                  className={`sidebar-item flex items-center gap-3 pl-12 pr-4 py-2 rounded-lg transition-all hover:bg-slate-700 w-full text-left ${
                    activePage === 'config-loja' ? 'active bg-indigo-600 text-white shadow' : ''
                  }`}
                >
                  <span className="text-sm font-medium">Configurações da loja</span>
                </button>
              </div>
            )}
          </div>
        </nav>
        <div className="p-4 border-t border-slate-700">
          <button 
            onClick={() => {
              logout();
              navigate('/');
            }}
            className="flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-red-400 hover:bg-red-900/50 w-full"
          >
            <LogOut />
            <span className="font-medium">Sair</span>
          </button>
        </div>
      </aside>

      {/* Overlay para mobile */}
      {isMobileMenuOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className="lg:ml-64 flex-1 p-4 sm:p-6 md:p-8 overflow-y-auto pt-20 lg:pt-6">
        {/* Dashboard */}
        {activePage === 'dashboard' && <Dashboard />}

        {/* Pedidos */}
        {activePage === 'pedidos' && (
          <Pedidos 
            orders={orders} 
            handleAdvanceStatus={handleAdvanceStatus}
            onRefresh={handleRefreshOrders}
          />
        )}

        {/* Produtos */}
        {activePage === 'produtos' && (
          <Produtos
            products={products}
            categories={categories}
            showAddModal={showAddModal}
            setShowAddModal={setShowAddModal}
            showAddCategoryModal={showAddCategoryModal}
            setShowAddCategoryModal={setShowAddCategoryModal}
            editProduct={editProduct}
            setEditProduct={setEditProduct}
            handleAddProduct={handleAddProduct}
            handleEdit={handleEdit}
            handleUpdateProduct={handleUpdateProduct}
            handleDelete={handleDelete}
            onCategoriesChange={handleCategoriesChange}
          />
        )}

        {/* Complementos */}
        {activePage === 'complementos' && <Complementos />}

        {/* Sabores */}
        {activePage === 'sabores' && <Sabores />}

        {/* Clientes */}
        {activePage === 'clientes' && <Clientes user={users} />}

        {/* Entregadores */}
        {activePage === 'entregadores' && <Entregadores />}

        {/* Cozinheiros */}
        {activePage === 'cozinheiros' && <Cozinheiros />}

        {/* Configurações */}
        {activePage === 'config-funcionamento' && <Configuracoes />}
        {activePage === 'config-loja' && <ConfiguracoesLoja />}
      </main>

      {/* Modal de Seleção de Entregador */}
      <ModalSelecaoEntregador
        isOpen={showDelivererModal}
        onClose={() => setShowDelivererModal(false)}
        onSelect={handleDelivererSelected}
        orderId={selectedOrderForDelivery?.id || 0}
        customerName={selectedOrderForDelivery?.user?.username || 'Cliente'}
      />

      {/* Modal de Confirmação para Avançar Status */}
      {confirmOpen && confirmOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000] p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-lg w-full p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Confirmar ação</h3>
            <p className="text-sm text-slate-700 mb-4">
              Deseja realmente avançar o status do pedido #{confirmOrder.id} para "{getStatusInPortuguese(confirmNextStatus)}"?
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => { setConfirmOpen(false); setConfirmOrder(null); setConfirmNextStatus(''); }}
                className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200"
              >
                Cancelar
              </button>
              <button
                onClick={async () => { await performAdvanceStatus(); }}
                className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal específico para Confirmar Entrega */}
      {confirmDeliveryOpen && confirmDeliveryOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000] p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-lg w-full p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Confirmar Entrega</h3>
            <p className="text-sm text-slate-700 mb-4">
              Confirma que o pedido #{confirmDeliveryOrder.id} foi entregue ao cliente?
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => { setConfirmDeliveryOpen(false); setConfirmDeliveryOrder(null); }}
                className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200"
              >
                Cancelar
              </button>
              <button
                onClick={async () => { await performConfirmDelivery(); }}
                className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700"
              >
                Confirmar Entrega
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .sidebar-item.active {
          background-color: #4f46e5;
          color: white;
          box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
        }
        .sidebar-item.active svg {
          color: white;
        }
        .status-received { background-color: #dbeafe; color: #1e40af; }
        .status-in_preparation { background-color: #fef9c3; color: #854d0e; }
        .status-out_for_delivery { background-color: #e0e7ff; color: #4338ca; }
        .status-completed { background-color: #dcfce7; color: #166534; }
        .status-canceled { background-color: #fee2e2; color: #991b1b; }
        ::-webkit-scrollbar { width: 8px; }
        ::-webkit-scrollbar-track { background: #f1f5f9; }
        ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        ::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `}</style>
    </div>
  );
};

export default Admin;