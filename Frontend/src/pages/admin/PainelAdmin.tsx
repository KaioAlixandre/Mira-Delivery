import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, ShoppingCart, Package, Users, Settings, LogOut, Truck, Store, X, Clipboard, ChefHat,
  ChevronDown, ChevronRight, Wallet, MapPin, CreditCard, Instagram, Image, Upload, Trash2, Type, Navigation
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
import Adicionais from './Adicionais';
import Cozinheiros from './Cozinheiros';
import FecharCaixa from './FecharCaixa';
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

const ConfiguracoesLoja: React.FC = () => {
  const { notify } = useNotification();
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedLogoFile, setSelectedLogoFile] = useState<File | null>(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);

  useEffect(() => {
    apiService.getStoreConfig().then((data) => {
      setConfig({
        nomeLoja: data.nomeLoja ?? '',
        logoUrl: data.logoUrl ?? null,
        slogan: data.slogan ?? '',
        instagramUrl: data.instagramUrl ?? '',
        chavePix: data.chavePix ?? data.telefoneWhatsapp ?? '',
        ruaLoja: data.ruaLoja ?? '',
        bairroLoja: data.bairroLoja ?? '',
        numeroLoja: data.numeroLoja ?? '',
        pontoReferenciaLoja: data.pontoReferenciaLoja ?? '',
        taxaEntrega: data.taxaEntrega ?? '',
        raioEntregaKm: data.raioEntregaKm ?? ''
      });
      setLoading(false);
    }).catch(() => {
      setLoading(false);
      notify('Erro ao carregar configurações da loja', 'error');
    });
  }, []);

  useEffect(() => {
    if (!selectedLogoFile) {
      setLogoPreviewUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(selectedLogoFile);
    setLogoPreviewUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [selectedLogoFile]);

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
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
        <p className="text-sm text-slate-500">Carregando configurações...</p>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="text-center py-16">
        <div className="bg-slate-100 p-4 rounded-full w-fit mx-auto mb-4">
          <Store className="w-10 h-10 text-slate-400" />
        </div>
        <p className="text-slate-500 font-medium">Erro ao carregar configurações.</p>
      </div>
    );
  }

  return (
    <div id="configuracoes-loja" className="page space-y-5">
      <header>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Configurações da Loja</h2>
        <p className="text-sm text-slate-500 mt-1">Ajuste dados e informações gerais da loja</p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Logo da Loja */}
        <div className="bg-white rounded-2xl shadow-md border border-slate-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
            <Image className="w-4 h-4 text-slate-500" />
            <h3 className="text-sm font-bold text-slate-800">Logo da Loja</h3>
          </div>
          <div className="p-5">
            <div className="flex flex-col sm:flex-row items-start gap-5">
              <div className="w-24 h-24 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 overflow-hidden flex items-center justify-center flex-shrink-0">
                {logoPreviewUrl ? (
                  <img src={logoPreviewUrl} alt="Preview da logo" className="w-full h-full object-cover" />
                ) : config.logoUrl ? (
                  <img src={config.logoUrl} alt="Logo da loja" className="w-full h-full object-cover" />
                ) : (
                  <Image className="w-8 h-8 text-slate-300" />
                )}
              </div>

              <div className="flex-1 space-y-3 w-full">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    setSelectedLogoFile(file);
                  }}
                  className="block w-full text-sm text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-600 hover:file:bg-indigo-100 file:cursor-pointer"
                />

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={!selectedLogoFile || logoUploading}
                    onClick={async () => {
                      if (!selectedLogoFile) return;
                      try {
                        setLogoUploading(true);
                        const result = await apiService.uploadStoreLogo(selectedLogoFile);
                        setConfig((prev: any) => ({
                          ...prev,
                          logoUrl: result.logoUrl,
                        }));
                        setSelectedLogoFile(null);
                        notify('Logo enviada com sucesso!', 'success');
                      } catch (err) {
                        notify('Erro ao enviar logo. Tente novamente.', 'error');
                      } finally {
                        setLogoUploading(false);
                      }
                    }}
                    className="inline-flex items-center gap-1.5 bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    {logoUploading ? 'Enviando...' : 'Enviar'}
                  </button>

                  <button
                    type="button"
                    disabled={logoUploading}
                    onClick={() => {
                      setSelectedLogoFile(null);
                    }}
                    className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-700 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-slate-200 transition-colors disabled:opacity-50"
                  >
                    <X className="w-3.5 h-3.5" />
                    Cancelar
                  </button>

                  <button
                    type="button"
                    disabled={logoUploading || loading}
                    onClick={async () => {
                      try {
                        setLogoUploading(true);
                        await apiService.updateStoreConfig({ logoUrl: null });
                        setConfig((prev: any) => ({
                          ...prev,
                          logoUrl: null,
                        }));
                        setSelectedLogoFile(null);
                        notify('Logo removida com sucesso!', 'success');
                      } catch (err) {
                        notify('Erro ao remover logo. Tente novamente.', 'error');
                      } finally {
                        setLogoUploading(false);
                      }
                    }}
                    className="inline-flex items-center gap-1.5 bg-white border border-slate-200 text-red-600 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-red-50 transition-colors disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Remover
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Identidade da Loja */}
        <div className="bg-white rounded-2xl shadow-md border border-slate-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
            <Store className="w-4 h-4 text-slate-500" />
            <h3 className="text-sm font-bold text-slate-800">Identidade da Loja</h3>
          </div>
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Nome da loja</label>
                <div className="relative">
                  <Store className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    name="nomeLoja"
                    value={config.nomeLoja}
                    onChange={handleChange}
                    placeholder="Ex: Minha Loja"
                    className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Slogan da loja</label>
                <div className="relative">
                  <Type className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    name="slogan"
                    value={config.slogan}
                    onChange={handleChange}
                    placeholder="Ex: O melhor sabor da cidade"
                    className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">URL do Instagram</label>
                <div className="relative">
                  <Instagram className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    name="instagramUrl"
                    value={config.instagramUrl}
                    onChange={handleChange}
                    placeholder="https://instagram.com/sualoja"
                    className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Chave Pix</label>
                <div className="relative">
                  <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    name="chavePix"
                    value={config.chavePix}
                    onChange={handleChange}
                    placeholder="CPF, CNPJ, e-mail ou telefone"
                    className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Endereço e Entrega */}
        <div className="bg-white rounded-2xl shadow-md border border-slate-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-slate-500" />
            <h3 className="text-sm font-bold text-slate-800">Endereço e Entrega</h3>
          </div>
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Rua</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    name="ruaLoja"
                    value={config.ruaLoja}
                    onChange={handleChange}
                    placeholder="Ex: Rua das Flores"
                    className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Número</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    name="numeroLoja"
                    value={config.numeroLoja}
                    onChange={handleChange}
                    placeholder="Ex: 123"
                    className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Bairro</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    name="bairroLoja"
                    value={config.bairroLoja}
                    onChange={handleChange}
                    placeholder="Ex: Centro"
                    className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Ponto de referência</label>
                <div className="relative">
                  <Navigation className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    name="pontoReferenciaLoja"
                    value={config.pontoReferenciaLoja}
                    onChange={handleChange}
                    placeholder="Ex: Próximo ao mercado"
                    className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Taxa de entrega (R$)</label>
                <div className="relative">
                  <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="number"
                    name="taxaEntrega"
                    value={config.taxaEntrega}
                    onChange={handleChange}
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Raio de entrega (km)</label>
                <div className="relative">
                  <Navigation className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="number"
                    name="raioEntregaKm"
                    value={config.raioEntregaKm}
                    onChange={handleChange}
                    min="0"
                    step="0.1"
                    placeholder="0.0"
                    className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Botão Salvar */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200/50 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            Salvar Alterações
          </button>
        </div>
      </form>
    </div>
  );
};

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
              <div className="mt-1 space-y-1">
                <button
                  onClick={() => {
                    setActivePage('complementos');
                    setIsMobileMenuOpen(false);
                  }}
                  className={`sidebar-item flex items-center gap-3 pl-12 pr-4 py-2 rounded-lg transition-all hover:bg-white/10 w-full text-left ${
                    activePage === 'complementos' ? 'active bg-brand text-white shadow' : ''
                  }`}
                >
                  <span className="text-sm font-medium">Complementos</span>
                </button>

                <button
                  onClick={() => {
                    setActivePage('sabores');
                    setIsMobileMenuOpen(false);
                  }}
                  className={`sidebar-item flex items-center gap-3 pl-12 pr-4 py-2 rounded-lg transition-all hover:bg-white/10 w-full text-left ${
                    activePage === 'sabores' ? 'active bg-brand text-white shadow' : ''
                  }`}
                >
                  <span className="text-sm font-medium">Sabores</span>
                </button>

                <button
                  onClick={() => {
                    setActivePage('adicionais');
                    setIsMobileMenuOpen(false);
                  }}
                  className={`sidebar-item flex items-center gap-3 pl-12 pr-4 py-2 rounded-lg transition-all hover:bg-white/10 w-full text-left ${
                    activePage === 'adicionais' ? 'active bg-brand text-white shadow' : ''
                  }`}
                >
                  <span className="text-sm font-medium">Adicionais</span>
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
                      const isConfigPage = current === 'config-funcionamento' || current === 'config-loja';
                      return isConfigPage ? current : 'config-funcionamento';
                    });
                  }
                  setIsMobileMenuOpen(false);
                  return next;
                });
              }}
              className={`sidebar-item flex items-center gap-3 px-4 py-3 rounded-lg transition-all hover:bg-white/10 w-full text-left ${
                (activePage === 'config-funcionamento' || activePage === 'config-loja') ? 'active bg-brand text-white shadow' : ''
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
                  className={`sidebar-item flex items-center gap-3 pl-12 pr-4 py-2 rounded-lg transition-all hover:bg-white/10 w-full text-left ${
                    activePage === 'config-funcionamento' ? 'active bg-brand text-white shadow' : ''
                  }`}
                >
                  <span className="text-sm font-medium">Funcionamento da loja</span>
                </button>

                <button
                  onClick={() => {
                    setActivePage('config-loja');
                    setIsMobileMenuOpen(false);
                  }}
                  className={`sidebar-item flex items-center gap-3 pl-12 pr-4 py-2 rounded-lg transition-all hover:bg-white/10 w-full text-left ${
                    activePage === 'config-loja' ? 'active bg-brand text-white shadow' : ''
                  }`}
                >
                  <span className="text-sm font-medium">Configurações da loja</span>
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