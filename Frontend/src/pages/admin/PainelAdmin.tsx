import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, ShoppingCart, Package, Users, Settings, LogOut, Truck, Store, X, Clipboard, ChefHat,
  ChevronDown, ChevronRight, Wallet, Crown, UtensilsCrossed, Palette
} from 'lucide-react';
import apiService from '../../services/api';

import { Product, ProductCategory, User, Order } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import Dashboard from './Dashboard';
import Pedidos from './Pedidos';
import Produtos from './Produtos';
import Clientes from './Clientes';
import Configuracoes from './Configuracoes';
import Entregadores from './Entregadores';
import Complementos from './Complementos';
import Sabores from './Sabores';
import Adicionais from './Adicionais';
import Cozinheiros from './Cozinheiros';
import FecharCaixa from './FecharCaixa';
import Tema from './Tema';
import MeuPlano from './MeuPlano';
import ConfiguracoesLoja from './ConfiguracoesLoja';
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
  { id: 'fechar-caixa', label: 'Fechar Caixa', icon: <Wallet /> },
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard /> },
  { id: 'pedidos', label: 'Pedidos', icon: <ShoppingCart /> },
  { id: 'produtos', label: 'Produtos', icon: <Package /> },
  { id: 'clientes', label: 'Clientes', icon: <Users /> },
  { id: 'entregadores', label: 'Entregadores', icon: <Truck /> },
  { id: 'cozinheiros', label: 'Cozinheiros', icon: <ChefHat /> },
];

const Admin: React.FC = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [activePage, setActivePage] = useState(() => {
    try {
      return localStorage.getItem('adminActivePage') || 'dashboard';
    } catch {
      return 'dashboard';
    }
  });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isConfigExpanded, setIsConfigExpanded] = useState(false);
  const [isMenuExpanded, setIsMenuExpanded] = useState(false);
  const [storeName, setStoreName] = useState('Mira Delivery');
  const [storePlan, setStorePlan] = useState<'simples' | 'pro' | 'plus'>('simples');
  const [isCaixaOpen, setIsCaixaOpen] = useState(() => {
    try {
      return localStorage.getItem('caixaOpen') === 'true';
    } catch {
      return false;
    }
  });

  // Persistir página ativa no localStorage
  useEffect(() => {
    try {
      localStorage.setItem('adminActivePage', activePage);
    } catch (error) {
      console.error('Erro ao salvar página ativa:', error);
    }
  }, [activePage]);

  useEffect(() => {
    localStorage.setItem('caixaOpen', String(isCaixaOpen));
  }, [isCaixaOpen]);
  const [products, setProducts] = useState<Product[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [users, setUsers] = useState<User[]>([]); // Lista de usuários

  // Modal de confirmação para excluir produto
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [confirmDeleteProductId, setConfirmDeleteProductId] = useState<number | null>(null);
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

  // Verificar se o usuário tem permissão de admin (aceita funcao ou role)
  const isAdmin = user && (user.funcao === 'admin' || user.funcao === 'master' || user.role === 'admin' || user.role === 'master');

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate('/login');
      return;
    }
    if (!isAdmin) {
      navigate('/');
      return;
    }
  }, [user, loading, isAdmin, navigate]);

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
    const isMenuPage = activePage === 'complementos' || activePage === 'sabores' || activePage === 'adicionais';
    if (isMenuPage) {
      setIsMenuExpanded(true);
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
      if (data?.planoMensal && ['simples', 'pro', 'plus'].includes(data.planoMensal)) {
        setStorePlan(data.planoMensal);
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
    setConfirmDeleteProductId(id);
    setConfirmDeleteOpen(true);
  };

  const performDeleteProduct = async (): Promise<void> => {
    if (!confirmDeleteProductId) return;
    const productId = confirmDeleteProductId;
    setConfirmDeleteOpen(false);
    setConfirmDeleteProductId(null);
    await apiService.deleteProduct(productId);
    setProducts(await apiService.getProducts());
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
    dailyNumber?: number | null;
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

  if (loading || !user || !isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand mx-auto mb-4"></div>
          <p className="text-gray-600">Verificando permissões...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-100 font-inter">
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-slate-900 text-white flex items-center justify-between px-4 z-50">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Store className="w-5 h-5" />
          <span>{storeName}</span>
        </h1>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 hover:bg-white/10 rounded-lg transition-colors"
        >
          {isMobileMenuOpen ? <X className="w-6 h-6" /> : <LayoutDashboard className="w-6 h-6" />}
        </button>
      </div>

      {/* Sidebar */}
      <aside className={`w-64 bg-slate-900 text-slate-200 flex flex-col fixed h-full z-40 transition-transform duration-300 ${
        isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
      } lg:translate-x-0`}>
        <div className="h-20 flex items-center justify-center border-b border-white/10">
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
              className={`sidebar-item flex items-center gap-3 px-4 py-3 rounded-lg transition-all hover:bg-white/10 w-full text-left ${
                activePage === page.id ? 'active bg-brand text-white shadow' : ''
              }`}
            >
              <span className="w-5 h-5">{page.icon}</span>
              <span className="font-medium">{page.label}</span>
              {page.id === 'fechar-caixa' && (
                <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  isCaixaOpen
                    ? 'bg-green-500 text-white'
                    : 'bg-red-500 text-white'
                }`}>
                  {isCaixaOpen ? 'Aberto' : 'Fechado'}
                </span>
              )}
            </button>
          ))}

          {/* Mesas */}
          <button
            onClick={() => {
              if (storePlan === 'plus') {
                setActivePage('mesas');
                setIsMobileMenuOpen(false);
              }
            }}
            className={`sidebar-item flex items-center gap-3 px-4 py-3 rounded-lg transition-all w-full text-left ${
              activePage === 'mesas' ? 'active bg-brand text-white shadow' : ''
            } ${storePlan !== 'plus' ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white/10'}`}
          >
            <span className="w-5 h-5"><UtensilsCrossed /></span>
            <span className="font-medium flex-1">Mesas</span>
            {storePlan !== 'plus' && (
              <span className="ml-auto flex items-center gap-1 text-amber-400" title="Requer plano Plus">
                <Crown className="w-4 h-4" />
                <span className="text-[10px] font-bold">Plus</span>
              </span>
            )}
          </button>

          {/* Garçons */}
          <button
            onClick={() => {
              if (storePlan === 'plus') {
                setActivePage('garcons');
                setIsMobileMenuOpen(false);
              }
            }}
            className={`sidebar-item flex items-center gap-3 px-4 py-3 rounded-lg transition-all w-full text-left ${
              activePage === 'garcons' ? 'active bg-brand text-white shadow' : ''
            } ${storePlan !== 'plus' ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white/10'}`}
          >
            <span className="w-5 h-5"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 5l7 7-7 7V5z"/><path d="M20 5l-7 7 7 7V5z"/><rect x="10" y="10" width="4" height="4" rx="1"/></svg></span>
            <span className="font-medium flex-1">Garçons</span>
            {storePlan !== 'plus' && (
              <span className="ml-auto flex items-center gap-1 text-amber-400" title="Requer plano Plus">
                <Crown className="w-4 h-4" />
                <span className="text-[10px] font-bold">Plus</span>
              </span>
            )}
          </button>

          <div>
            <button
              onClick={() => {
                setIsMenuExpanded(prev => {
                  const next = !prev;
                  if (next) {
                    setActivePage((current) => {
                      const isMenuPage = current === 'complementos' || current === 'sabores' || current === 'adicionais';
                      return isMenuPage ? current : 'complementos';
                    });
                  }
                  setIsMobileMenuOpen(false);
                  return next;
                });
              }}
              className={`sidebar-item flex items-center gap-3 px-4 py-3 rounded-lg transition-all hover:bg-white/10 w-full text-left ${
                (activePage === 'complementos' || activePage === 'sabores' || activePage === 'adicionais') ? 'active bg-brand text-white shadow' : ''
              }`}
            >
              <span className="w-5 h-5"><Clipboard /></span>
              <span className="font-medium flex-1">Gestão de Cardápio</span>
              <span className="w-5 h-5">
                {isMenuExpanded ? <ChevronDown /> : <ChevronRight />}
              </span>
            </button>

            {isMenuExpanded && (
              <div className="mt-1 ml-2 pl-3 border-l-2 border-white/25 space-y-1">
                <button
                  onClick={() => {
                    setActivePage('complementos');
                    setIsMobileMenuOpen(false);
                  }}
                  className={`sidebar-item flex items-center gap-2 pl-3 pr-3 py-2 rounded-md transition-all hover:bg-white/10 w-full text-left text-sm ${
                    activePage === 'complementos' ? 'active bg-brand text-white shadow' : 'text-slate-300'
                  }`}
                >
                  <span className="font-medium">Complementos</span>
                </button>

                <button
                  onClick={() => {
                    setActivePage('sabores');
                    setIsMobileMenuOpen(false);
                  }}
                  className={`sidebar-item flex items-center gap-2 pl-3 pr-3 py-2 rounded-md transition-all hover:bg-white/10 w-full text-left text-sm ${
                    activePage === 'sabores' ? 'active bg-brand text-white shadow' : 'text-slate-300'
                  }`}
                >
                  <span className="font-medium">Sabores</span>
                </button>

                <button
                  onClick={() => {
                    setActivePage('adicionais');
                    setIsMobileMenuOpen(false);
                  }}
                  className={`sidebar-item flex items-center gap-2 pl-3 pr-3 py-2 rounded-md transition-all hover:bg-white/10 w-full text-left text-sm ${
                    activePage === 'adicionais' ? 'active bg-brand text-white shadow' : 'text-slate-300'
                  }`}
                >
                  <span className="font-medium">Adicionais</span>
                </button>
              </div>
            )}
          </div>

          <div>
            <button
              onClick={() => {
                setIsConfigExpanded(prev => {
                  const next = !prev;
                  if (next) {
                    setActivePage((current) => {
                      const isConfigPage = current === 'config-funcionamento' || current === 'config-loja' || current === 'config-tema' || current === 'config-conta';
                      return isConfigPage ? current : 'config-funcionamento';
                    });
                  }
                  setIsMobileMenuOpen(false);
                  return next;
                });
              }}
              className={`sidebar-item flex items-center gap-3 px-4 py-3 rounded-lg transition-all hover:bg-white/10 w-full text-left ${
                (activePage === 'config-funcionamento' || activePage === 'config-loja' || activePage === 'config-tema' || activePage === 'config-conta') ? 'active bg-brand text-white shadow' : ''
              }`}
            >
              <span className="w-5 h-5"><Settings /></span>
              <span className="font-medium flex-1">Configurações</span>
              <span className="w-5 h-5">
                {isConfigExpanded ? <ChevronDown /> : <ChevronRight />}
              </span>
            </button>

            {isConfigExpanded && (
              <div className="mt-1 ml-2 pl-3 border-l-2 border-white/25 space-y-1">
                <button
                  onClick={() => {
                    setActivePage('config-funcionamento');
                    setIsMobileMenuOpen(false);
                  }}
                  className={`sidebar-item flex items-center gap-2 pl-3 pr-3 py-2 rounded-md transition-all hover:bg-white/10 w-full text-left text-sm ${
                    activePage === 'config-funcionamento' ? 'active bg-brand text-white shadow' : 'text-slate-300'
                  }`}
                >
                  <span className="font-medium">Funcionamento da loja</span>
                </button>

                <button
                  onClick={() => {
                    setActivePage('config-loja');
                    setIsMobileMenuOpen(false);
                  }}
                  className={`sidebar-item flex items-center gap-2 pl-3 pr-3 py-2 rounded-md transition-all hover:bg-white/10 w-full text-left text-sm ${
                    activePage === 'config-loja' ? 'active bg-brand text-white shadow' : 'text-slate-300'
                  }`}
                >
                  <span className="font-medium">Configurações da loja</span>
                </button>

                <button
                  onClick={() => {
                    setActivePage('config-tema');
                    setIsMobileMenuOpen(false);
                  }}
                  className={`sidebar-item flex items-center gap-2 pl-3 pr-3 py-2 rounded-md transition-all hover:bg-white/10 w-full text-left text-sm ${
                    activePage === 'config-tema' ? 'active bg-brand text-white shadow' : 'text-slate-300'
                  }`}
                >
                  <Palette className="w-4 h-4 flex-shrink-0" />
                  <span className="font-medium">Tema</span>
                </button>

                <button
                  onClick={() => {
                    setActivePage('config-conta');
                    setIsMobileMenuOpen(false);
                  }}
                  className={`sidebar-item flex items-center gap-2 pl-3 pr-3 py-2 rounded-md transition-all hover:bg-white/10 w-full text-left text-sm ${
                    activePage === 'config-conta' ? 'active bg-brand text-white shadow' : 'text-slate-300'
                  }`}
                >
                  <Crown className="w-4 h-4 flex-shrink-0" />
                  <span className="font-medium">Meu plano</span>
                </button>
              </div>
            )}
          </div>

        </nav>
        <div className="p-4 border-t border-white/10">
          <button 
            onClick={() => {
              navigate('/');
            }}
            className="flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-red-400 hover:bg-red-900/50 w-full"
          >
            <LogOut />
            <span className="font-medium">Voltar</span>
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
        {/* Fechar Caixa */}
        {activePage === 'fechar-caixa' && <FecharCaixa isCaixaOpen={isCaixaOpen} onToggleCaixa={setIsCaixaOpen} />}

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

        {/* Adicionais */}
        {activePage === 'adicionais' && <Adicionais />}

        {/* Clientes */}
        {activePage === 'clientes' && <Clientes user={users} />}

        {/* Entregadores */}
        {activePage === 'entregadores' && <Entregadores />}

        {/* Cozinheiros */}
        {activePage === 'cozinheiros' && <Cozinheiros />}

        {/* Configurações */}
        {activePage === 'config-funcionamento' && <Configuracoes />}
        {activePage === 'config-loja' && <ConfiguracoesLoja />}
        {activePage === 'config-tema' && <Tema />}
        {activePage === 'config-conta' && <MeuPlano onPlanUpdated={setStorePlan} />}

        {/* Mesas */}
        {activePage === 'mesas' && (
          <div className="page space-y-5">
            <header>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Mesas</h2>
              <p className="text-sm text-slate-500 mt-1">Gerencie as mesas do seu estabelecimento</p>
            </header>
            <div className="bg-white rounded-2xl shadow-md border border-slate-100 p-8 text-center">
              <UtensilsCrossed className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-700 mb-2">Em breve</h3>
              <p className="text-sm text-slate-500">O gerenciamento de mesas estará disponível em breve.</p>
            </div>
          </div>
        )}

        {/* Garçons */}
        {activePage === 'garcons' && (
          <div className="page space-y-5">
            <header>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Garçons</h2>
              <p className="text-sm text-slate-500 mt-1">Gerencie os garçons do seu estabelecimento</p>
            </header>
            <div className="bg-white rounded-2xl shadow-md border border-slate-100 p-8 text-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-300 mx-auto mb-4">
                <path d="M4 5l7 7-7 7V5z"/>
                <path d="M20 5l-7 7 7 7V5z"/>
                <rect x="10" y="10" width="4" height="4" rx="1"/>
              </svg>
              <h3 className="text-lg font-semibold text-slate-700 mb-2">Em breve</h3>
              <p className="text-sm text-slate-500">O gerenciamento de garçons estará disponível em breve.</p>
            </div>
          </div>
        )}
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
              Deseja realmente avançar o status do pedido #{confirmOrder.dailyNumber ?? confirmOrder.id} para "{getStatusInPortuguese(confirmNextStatus)}"?
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
              Confirma que o pedido #{confirmDeliveryOrder.dailyNumber ?? confirmDeliveryOrder.id} foi entregue ao cliente?
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

      {/* Modal de Confirmação para Excluir Produto */}
      {confirmDeleteOpen && confirmDeleteProductId !== null && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000] p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Remover produto</h3>
            <p className="text-sm text-slate-700 mb-4">
              Tem certeza que deseja remover o produto{' '}
              <span className="font-semibold">
                {products.find(p => p.id === confirmDeleteProductId)?.name || `#${confirmDeleteProductId}`}
              </span>
              ?
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => { setConfirmDeleteOpen(false); setConfirmDeleteProductId(null); }}
                className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200"
              >
                Cancelar
              </button>
              <button
                onClick={async () => { await performDeleteProduct(); }}
                className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700"
              >
                Remover
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .sidebar-item.active {
          background-color: var(--primary-color);
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