import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Edit, 
  Trash2, 
  ToggleLeft, 
  ToggleRight, 
  Search, 
  Filter,
  RefreshCw,
  AlertCircle,
  X,
  Save,
  Eye,
  EyeOff,
  FolderTree,
  Package,
  CheckCircle2,
  XCircle,
  ChevronDown
} from 'lucide-react';
import apiService from '../../services/api';
import ModalGerenciarCategoriasComplementos from './components/ModalGerenciarCategoriasComplementos';
import { useNotification } from '../../components/NotificationProvider';

interface Complement {
  id: number;
  name: string;
  imageUrl?: string;
  isActive: boolean;
  categoryId?: number | null;
  category?: {
    id: number;
    name: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}

interface ComplementCategory {
  id: number;
  name: string;
  complementsCount?: number;
}

interface ComplementFormData {
  name: string;
  isActive: boolean;
  categoryId?: number | null;
  image?: File;
}

const Complementos: React.FC = () => {
  const { notify } = useNotification();
  const [complements, setComplements] = useState<Complement[]>([]);
  const [categories, setCategories] = useState<ComplementCategory[]>([]);
  const [filteredComplements, setFilteredComplements] = useState<Complement[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('all');
  const [filterCategory, setFilterCategory] = useState<number | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingComplement, setEditingComplement] = useState<Complement | null>(null);
  const [formData, setFormData] = useState<ComplementFormData>({
    name: '',
    isActive: true,
    categoryId: null
  });
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [showInactive, setShowInactive] = useState(true);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showManageCategoriesModal, setShowManageCategoriesModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{ open: boolean; title: string; message: string; onConfirm: () => void }>({ open: false, title: '', message: '', onConfirm: () => {} });

  // Função para atualizar dados
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([loadComplements(), loadCategories()]);
    } catch (error) {
      console.error('Erro ao atualizar:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Calcular métricas
  const metrics = {
    total: complements.length,
    active: complements.filter(c => c.isActive).length,
    inactive: complements.filter(c => !c.isActive).length,
    filtered: filteredComplements.length
  };

  // Carregar categorias
  const loadCategories = async () => {
    try {
      const data = await apiService.getComplementCategories();
      setCategories(data);
    } catch (error) {
     
    }
  };

  // Carregar complementos
  const loadComplements = async () => {
    try {
      setLoading(true);
      const data = await apiService.getComplements(showInactive);
      setComplements(data);
    } catch (error) {
     
    } finally {
      setLoading(false);
    }
  };

  // Filtrar complementos
  useEffect(() => {
    let filtered = complements;

    // Filtro por busca
    if (searchTerm.trim()) {
      filtered = filtered.filter(complement =>
        complement.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtro por status
    if (filterActive !== 'all') {
      filtered = filtered.filter(complement =>
        filterActive === 'active' ? complement.isActive : !complement.isActive
      );
    }

    // Filtro por categoria
    if (filterCategory !== null) {
      if (filterCategory === 0) {
        // Filtro para complementos sem categoria (null ou undefined)
        filtered = filtered.filter(complement =>
          !complement.categoryId || complement.categoryId === null
        );
      } else {
        filtered = filtered.filter(complement =>
          complement.categoryId === filterCategory
        );
      }
    }

    setFilteredComplements(filtered);
  }, [complements, searchTerm, filterActive, filterCategory]);

  // Carregar dados ao montar o componente
  useEffect(() => {
    loadComplements();
    loadCategories();
  }, [showInactive]);

  // Resetar filtro de categoria se a categoria selecionada não existir mais
  useEffect(() => {
    if (filterCategory !== null && filterCategory !== 0) {
      const categoryExists = categories.some(cat => cat.id === filterCategory);
      if (!categoryExists) {
        setFilterCategory(null);
      }
    }
  }, [categories, filterCategory]);

  // Reset do formulário
  const resetForm = () => {
    setFormData({ name: '', isActive: true, categoryId: null });
    setImagePreview(null);
    setEditingComplement(null);
    setShowModal(false);
  };

  // Abrir modal para criar
  const handleCreate = () => {
    resetForm();
    setShowModal(true);
  };

  // Abrir modal para editar
  const handleEdit = (complement: Complement) => {
    setEditingComplement(complement);
    setFormData({
      name: complement.name,
      isActive: complement.isActive,
      categoryId: complement.categoryId || null
    });
    setImagePreview(complement.imageUrl ? complement.imageUrl : null);
    setShowModal(true);
  };

  // Manipular seleção de imagem
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData({ ...formData, image: file });
      
      // Criar preview da imagem
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Remover imagem
  const handleRemoveImage = () => {
    setFormData({ ...formData, image: undefined });
    setImagePreview(null);
    
    // Limpar o input de arquivo
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  };

  // Salvar complemento (criar ou editar) - envia como FormData para Cloudinary
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      notify('Nome do complemento é obrigatório!', 'warning');
      return;
    }
    try {
      setFormLoading(true);
      const dataToSend = {
        name: formData.name,
        isActive: formData.isActive,
        categoryId: formData.categoryId,
        image: formData.image
      };
      
      if (editingComplement) {
        await apiService.updateComplement(editingComplement.id, dataToSend);
      } else {
        await apiService.createComplement(dataToSend);
      }
      await loadComplements();
      resetForm();
      notify(`Complemento ${editingComplement ? 'atualizado' : 'criado'} com sucesso!`, 'success');
    } catch (error: any) {
     
      const message = error?.response?.data?.message || 'Erro ao salvar complemento';
      notify(message, 'error');
    } finally {
      setFormLoading(false);
    }
  };

  // Alternar status ativo/inativo
  const handleToggleStatus = async (complement: Complement) => {
    try {
      await apiService.toggleComplementStatus(complement.id);
      await loadComplements();
    } catch (error) {
     
      notify('Erro ao alterar status do complemento', 'error');
    }
  };

  // Deletar complemento
  const handleDelete = (complement: Complement) => {
    setConfirmModal({
      open: true,
      title: 'Deletar Complemento',
      message: `Tem certeza que deseja deletar o complemento "${complement.name}"? Esta ação não pode ser desfeita.`,
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, open: false }));
        try {
          await apiService.deleteComplement(complement.id);
          await loadComplements();
          notify('Complemento deletado com sucesso!', 'success');
        } catch (error) {
          notify('Erro ao deletar complemento', 'error');
        }
      }
    });
  };

  // Criar nova categoria
  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newCategoryName.trim()) {
      notify('Nome da categoria é obrigatório!', 'warning');
      return;
    }

    try {
      await apiService.createComplementCategory(newCategoryName.trim());
      await loadCategories();
      setNewCategoryName('');
      setShowCategoryModal(false);
      setShowModal(true);
      notify('Categoria criada com sucesso!', 'success');
    } catch (error: any) {
     
      const message = error.response?.data?.message || 'Erro ao criar categoria';
      notify(message, 'error');
    }
  };

  // Formatar data
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="page">
      {/* Cabeçalho */}
      <header className="mb-4 sm:mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2.5 mb-1">
              <div className="p-2 bg-gradient-to-br from-[#ea1d2c] to-[#b8151f] rounded-xl shadow-md shadow-red-200">
                <Package className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-800 tracking-tight">Complementos</h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 ml-[2.75rem]">
              Gerencie os complementos disponíveis para seus produtos.
              {filteredComplements.length !== complements.length && (
                <span className="ml-2 text-[#ea1d2c] font-semibold">
                  {filteredComplements.length} de {complements.length}
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setShowManageCategoriesModal(true)}
              className="border-2 border-slate-200 text-slate-700 px-3.5 py-2 rounded-xl font-semibold flex items-center gap-2 hover:border-[#ea1d2c] hover:text-[#ea1d2c] hover:bg-red-50 transition-all duration-200 whitespace-nowrap text-xs sm:text-sm"
            >
              <FolderTree className="w-4 h-4" />
              <span className="hidden sm:inline">Categorias</span>
            </button>
            <button
              onClick={handleCreate}
              className="bg-gradient-to-r from-[#ea1d2c] to-[#d61a28] text-white px-3.5 py-2 rounded-xl font-semibold flex items-center gap-2 hover:shadow-lg hover:shadow-red-200 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 whitespace-nowrap text-xs sm:text-sm"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Novo Complemento</span>
              <span className="sm:hidden">Novo</span>
            </button>
            <button 
              onClick={handleRefresh}
              disabled={isRefreshing}
              className={`p-2 rounded-xl text-slate-500 hover:text-[#ea1d2c] hover:bg-red-50 border-2 border-slate-200 hover:border-red-200 transition-all duration-200 ${
                isRefreshing ? 'opacity-75 cursor-not-allowed' : ''
              }`}
              title="Atualizar dados"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </header>

      {/* Cards de Métricas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
        {/* Total */}
        <div className="bg-white p-3.5 sm:p-4 rounded-xl shadow-sm border border-slate-100 hover:shadow-md hover:border-blue-100 transition-all duration-200 group cursor-default border-l-4 !border-l-blue-500">
          <div className="flex items-center gap-3">
            <div className="p-2 sm:p-2.5 bg-blue-50 rounded-xl flex-shrink-0 group-hover:bg-blue-100 transition-colors">
              <Package className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-[10px] sm:text-xs font-medium text-slate-500 uppercase tracking-wider mb-0.5">Total</h3>
              <p className="text-xl sm:text-2xl font-extrabold text-slate-800">{metrics.total}</p>
            </div>
          </div>
        </div>

        {/* Ativos */}
        <div className="bg-white p-3.5 sm:p-4 rounded-xl shadow-sm border border-slate-100 hover:shadow-md hover:border-green-100 transition-all duration-200 group cursor-default border-l-4 !border-l-emerald-500">
          <div className="flex items-center gap-3">
            <div className="p-2 sm:p-2.5 bg-emerald-50 rounded-xl flex-shrink-0 group-hover:bg-emerald-100 transition-colors">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-[10px] sm:text-xs font-medium text-slate-500 uppercase tracking-wider mb-0.5">Ativos</h3>
              <p className="text-xl sm:text-2xl font-extrabold text-emerald-600">{metrics.active}</p>
            </div>
          </div>
        </div>

        {/* Inativos */}
        <div className="bg-white p-3.5 sm:p-4 rounded-xl shadow-sm border border-slate-100 hover:shadow-md hover:border-red-100 transition-all duration-200 group cursor-default border-l-4 !border-l-red-400">
          <div className="flex items-center gap-3">
            <div className="p-2 sm:p-2.5 bg-red-50 rounded-xl flex-shrink-0 group-hover:bg-red-100 transition-colors">
              <XCircle className="w-5 h-5 text-red-500" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-[10px] sm:text-xs font-medium text-slate-500 uppercase tracking-wider mb-0.5">Inativos</h3>
              <p className="text-xl sm:text-2xl font-extrabold text-red-500">{metrics.inactive}</p>
            </div>
          </div>
        </div>

        {/* Filtrados */}
        <div className="bg-white p-3.5 sm:p-4 rounded-xl shadow-sm border border-slate-100 hover:shadow-md hover:border-amber-100 transition-all duration-200 group cursor-default border-l-4 !border-l-amber-500">
          <div className="flex items-center gap-3">
            <div className="p-2 sm:p-2.5 bg-amber-50 rounded-xl flex-shrink-0 group-hover:bg-amber-100 transition-colors">
              <Filter className="w-5 h-5 text-amber-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-[10px] sm:text-xs font-medium text-slate-500 uppercase tracking-wider mb-0.5">Filtrados</h3>
              <p className="text-xl sm:text-2xl font-extrabold text-slate-800">{metrics.filtered}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Painel de Filtros */}
      <div className="bg-white p-4 sm:p-5 rounded-xl shadow-sm mb-4 sm:mb-6 border border-slate-100">
        <div className="flex items-center gap-2 mb-3 sm:mb-4">
          <Search className="w-4 h-4 text-slate-400" />
          <h3 className="text-xs sm:text-sm font-semibold text-slate-600 uppercase tracking-wider">Filtros</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
          {/* Busca */}
          <div>
            <label className="block text-[11px] sm:text-xs font-medium text-slate-500 mb-1.5 uppercase tracking-wide">
              Buscar
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Nome do complemento..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2.5 text-xs sm:text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-100 focus:border-[#ea1d2c] outline-none transition-all bg-slate-50 hover:bg-white"
              />
            </div>
          </div>

          {/* Filtro por Categoria */}
          <div>
            <label className="block text-[11px] sm:text-xs font-medium text-slate-500 mb-1.5 uppercase tracking-wide">
              Categoria
            </label>
            <div className="relative">
              <select
                value={filterCategory !== null ? filterCategory : ''}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === '') {
                    setFilterCategory(null);
                  } else if (value === '0') {
                    setFilterCategory(0);
                  } else {
                    setFilterCategory(parseInt(value));
                  }
                }}
                className="w-full px-3 py-2.5 pr-10 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-100 focus:border-[#ea1d2c] appearance-none bg-slate-50 hover:bg-white text-xs sm:text-sm text-slate-700 cursor-pointer transition-all"
              >
                <option value="">Todas as categorias</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
                <option value="0">Sem Categoria</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* Filtro por Status */}
          <div>
            <label className="block text-[11px] sm:text-xs font-medium text-slate-500 mb-1.5 uppercase tracking-wide">
              Status
            </label>
            <div className="relative">
              <select
                value={filterActive}
                onChange={(e) => setFilterActive(e.target.value as 'all' | 'active' | 'inactive')}
                className="w-full px-3 py-2.5 pr-10 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-100 focus:border-[#ea1d2c] appearance-none bg-slate-50 hover:bg-white text-xs sm:text-sm text-slate-700 cursor-pointer transition-all"
              >
                <option value="all">Todos</option>
                <option value="active">Ativos</option>
                <option value="inactive">Inativos</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Toggle Mostrar Inativos */}
        <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-slate-100">
          <button
            onClick={() => setShowInactive(!showInactive)}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-medium transition-all duration-200 text-xs sm:text-sm ${
              showInactive 
                ? 'bg-red-50 text-[#ea1d2c] border border-red-200 shadow-sm shadow-red-100' 
                : 'bg-slate-50 text-slate-500 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            {showInactive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            <span>Carregar inativos</span>
            <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold ${
              showInactive ? 'bg-[#ea1d2c] text-white' : 'bg-slate-300 text-white'
            }`}>
              {showInactive ? '✓' : '✗'}
            </span>
          </button>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex flex-col justify-center items-center py-16 gap-3">
          <div className="relative">
            <div className="animate-spin rounded-full h-10 w-10 border-[3px] border-slate-200 border-t-[#ea1d2c]"></div>
          </div>
          <p className="text-xs text-slate-400 font-medium animate-pulse">Carregando complementos...</p>
        </div>
      )}

      {/* Lista de Complementos */}
      {!loading && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-slate-100">
          {filteredComplements.length === 0 ? (
            <div className="p-8 sm:p-16 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-50 rounded-2xl mb-4">
                <Package className="text-slate-300" size={32} />
              </div>
              <h3 className="text-base sm:text-lg font-semibold text-slate-600 mb-1.5">Nenhum complemento encontrado</h3>
              <p className="text-xs sm:text-sm text-slate-400 max-w-xs mx-auto">
                {searchTerm || filterActive !== 'all' 
                  ? 'Tente ajustar os filtros de busca'
                  : 'Comece criando seu primeiro complemento'
                }
              </p>
              {!searchTerm && filterActive === 'all' && (
                <button
                  onClick={handleCreate}
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-[#ea1d2c] text-white text-sm font-semibold rounded-xl hover:bg-[#d61a28] transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Criar Complemento
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Versão Desktop - Tabela */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gradient-to-r from-slate-50 to-slate-100/50 border-b border-slate-200">
                      <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Imagem</th>
                      <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Nome</th>
                      <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Categoria</th>
                      <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                      <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Criado em</th>
                      <th className="px-5 py-3.5 text-right text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredComplements.map((complement) => (
                      <tr key={complement.id} className={`group hover:bg-red-50/30 transition-colors duration-150 ${!complement.isActive ? 'opacity-60' : ''}`}>
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          {complement.imageUrl ? (
                            <img 
                              src={complement.imageUrl}
                              alt={complement.name}
                              className="w-11 h-11 object-cover rounded-xl border border-slate-200 shadow-sm group-hover:shadow-md group-hover:scale-105 transition-all duration-200"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                                target.parentElement!.innerHTML = '<div class="w-11 h-11 bg-slate-100 rounded-xl flex items-center justify-center"><span class="text-slate-400 text-[10px]">Erro</span></div>';
                              }}
                            />
                          ) : (
                            <div className="w-11 h-11 bg-slate-100 rounded-xl flex items-center justify-center">
                              <Package className="w-4 h-4 text-slate-300" />
                            </div>
                          )}
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <span className="text-sm font-semibold text-slate-800">{complement.name}</span>
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          {complement.category ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-red-50 text-[#ea1d2c] border border-red-100">
                              <FolderTree className="w-3 h-3" />
                              {complement.category.name}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400 italic">Sem categoria</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${
                            complement.isActive 
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                              : 'bg-red-50 text-red-600 border border-red-100'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              complement.isActive ? 'bg-emerald-500' : 'bg-red-400'
                            }`}></span>
                            {complement.isActive ? 'Ativo' : 'Inativo'}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <span className="text-xs text-slate-500">{formatDate(complement.createdAt)}</span>
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            <button
                              onClick={() => handleEdit(complement)}
                              className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-150"
                              title="Editar"
                            >
                              <Edit size={15} />
                            </button>
                            <button
                              onClick={() => handleToggleStatus(complement)}
                              className={`p-2 rounded-lg transition-all duration-150 ${
                                complement.isActive 
                                  ? 'text-slate-400 hover:text-amber-600 hover:bg-amber-50' 
                                  : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                              }`}
                              title={complement.isActive ? 'Desativar' : 'Ativar'}
                            >
                              {complement.isActive ? <ToggleRight size={15} /> : <ToggleLeft size={15} />}
                            </button>
                            <button
                              onClick={() => handleDelete(complement)}
                              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-150"
                              title="Deletar"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Versão Mobile - Cards */}
              <div className="md:hidden p-3 space-y-3">
                {filteredComplements.map((complement) => (
                  <div key={complement.id} className={`bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden transition-all duration-200 hover:shadow-md ${!complement.isActive ? 'opacity-60' : ''}`}>
                    <div className="p-3.5">
                      <div className="flex items-start gap-3 mb-3">
                        {complement.imageUrl ? (
                          <img 
                            src={complement.imageUrl}
                            alt={complement.name}
                            className="w-14 h-14 object-cover rounded-xl flex-shrink-0 border border-slate-200 shadow-sm"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              target.parentElement!.innerHTML = '<div class="w-14 h-14 bg-slate-100 rounded-xl flex items-center justify-center flex-shrink-0"><span class="text-slate-400 text-[10px]">Erro</span></div>';
                            }}
                          />
                        ) : (
                          <div className="w-14 h-14 bg-slate-50 rounded-xl flex items-center justify-center flex-shrink-0 border border-slate-100">
                            <Package className="w-5 h-5 text-slate-300" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-slate-800 text-sm mb-1.5 truncate">{complement.name}</h3>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold ${
                              complement.isActive 
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                                : 'bg-red-50 text-red-600 border border-red-100'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${
                                complement.isActive ? 'bg-emerald-500' : 'bg-red-400'
                              }`}></span>
                              {complement.isActive ? 'Ativo' : 'Inativo'}
                            </span>
                            {complement.category && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-red-50 text-[#ea1d2c] border border-red-100">
                                {complement.category.name}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-[11px] text-slate-400 mb-3 flex items-center gap-1">
                        <span>Criado em {formatDate(complement.createdAt)}</span>
                      </div>
                    </div>

                    <div className="flex items-center border-t border-slate-100 divide-x divide-slate-100">
                      <button
                        onClick={() => handleEdit(complement)}
                        className="flex-1 py-2.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors flex items-center justify-center gap-1.5 text-xs font-medium"
                      >
                        <Edit size={13} />
                        <span>Editar</span>
                      </button>
                      <button
                        onClick={() => handleToggleStatus(complement)}
                        className={`flex-1 py-2.5 transition-colors flex items-center justify-center gap-1.5 text-xs font-medium ${
                          complement.isActive 
                            ? 'text-slate-500 hover:text-amber-600 hover:bg-amber-50' 
                            : 'text-slate-500 hover:text-emerald-600 hover:bg-emerald-50'
                        }`}
                      >
                        {complement.isActive ? <ToggleRight size={13} /> : <ToggleLeft size={13} />}
                        <span>{complement.isActive ? 'Desativar' : 'Ativar'}</span>
                      </button>
                      <button
                        onClick={() => handleDelete(complement)}
                        className="flex-1 py-2.5 text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors flex items-center justify-center gap-1.5 text-xs font-medium"
                      >
                        <Trash2 size={13} />
                        <span>Deletar</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Modal de Nova Categoria */}
      {/* Modal de Gerenciamento de Categorias */}
      {showManageCategoriesModal && (
        <ModalGerenciarCategoriasComplementos
          categories={categories}
          onClose={() => setShowManageCategoriesModal(false)}
          onCategoriesChange={loadCategories}
        />
      )}

      {/* Modal antigo de categoria (mantido para compatibilidade, mas pode ser removido) */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-slate-100">
            <div className="p-5 sm:p-6">
              <div className="flex justify-between items-center mb-5">
                <h2 className="text-lg sm:text-xl font-bold text-slate-800">
                  Nova Categoria
                </h2>
                <button
                  onClick={() => {
                    setShowCategoryModal(false);
                    setShowModal(true);
                    setNewCategoryName('');
                  }}
                  className="text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-100 rounded-xl transition-all"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleCreateCategory} className="space-y-5">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">
                    Nome da Categoria *
                  </label>
                  <input
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="Ex: Frutas, Granolas, Cremes..."
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-100 focus:border-[#ea1d2c] outline-none transition-all bg-slate-50 hover:bg-white"
                    required
                    maxLength={100}
                  />
                  <div className="flex items-center justify-between mt-1.5">
                    <p className="text-[11px] text-slate-400">Máximo 100 caracteres</p>
                    <p className="text-[11px] text-slate-400">{newCategoryName.length}/100</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCategoryModal(false);
                      setShowModal(true);
                      setNewCategoryName('');
                    }}
                    className="flex-1 px-4 py-2.5 border-2 border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-all font-medium text-sm"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2.5 bg-gradient-to-r from-[#ea1d2c] to-[#d61a28] text-white rounded-xl hover:shadow-lg hover:shadow-red-200 transition-all duration-200 font-semibold flex items-center justify-center gap-2 text-sm"
                  >
                    <Save size={15} />
                    <span>Criar</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Criação/Edição */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto border border-slate-100">
            <div className="p-5 sm:p-6">
              <div className="flex justify-between items-center mb-5">
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-slate-800">
                    {editingComplement ? 'Editar Complemento' : 'Novo Complemento'}
                  </h2>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {editingComplement ? 'Atualize as informações abaixo' : 'Preencha os dados do novo complemento'}
                  </p>
                </div>
                <button
                  onClick={resetForm}
                  className="text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-100 rounded-xl transition-all"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSave} className="space-y-5">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">
                    Nome *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: Morango, Banana, Granola..."
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-100 focus:border-[#ea1d2c] outline-none transition-all bg-slate-50 hover:bg-white"
                    required
                    maxLength={100}
                  />
                  <div className="flex items-center justify-between mt-1.5">
                    <p className="text-[11px] text-slate-400">Nome exibido para o cliente</p>
                    <p className="text-[11px] text-slate-400">{formData.name.length}/100</p>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide">
                      Categoria
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setShowModal(false);
                        setShowManageCategoriesModal(true);
                      }}
                      className="text-[#ea1d2c] hover:text-[#d61a28] text-[11px] font-semibold flex items-center gap-1 hover:underline"
                    >
                      <FolderTree size={12} />
                      Gerenciar
                    </button>
                  </div>
                  <select
                    value={formData.categoryId || ''}
                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value ? parseInt(e.target.value) : null })}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-100 focus:border-[#ea1d2c] outline-none transition-all bg-slate-50 hover:bg-white appearance-none cursor-pointer"
                  >
                    <option value="">Sem categoria</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                  <p className="text-[11px] text-slate-400 mt-1.5">
                    Organiza complementos em grupos
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">
                    Imagem
                  </label>
                  {imagePreview && (
                    <div className="mb-3 relative group">
                      <img 
                        src={imagePreview} 
                        alt="Preview" 
                        className="w-full h-44 object-contain bg-slate-50 rounded-xl border border-slate-200"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect fill="%23ddd" width="200" height="200"/%3E%3Ctext fill="%23999" font-family="sans-serif" font-size="14" dy="105" font-weight="bold" x="50%25" y="50%25" text-anchor="middle"%3EImagem não encontrada%3C/text%3E%3C/svg%3E';
                        }}
                      />
                      <button
                        type="button"
                        onClick={handleRemoveImage}
                        className="absolute top-2 right-2 bg-red-500/90 text-white p-1.5 rounded-lg hover:bg-red-600 transition-all shadow-lg opacity-0 group-hover:opacity-100 backdrop-blur-sm"
                        title="Remover imagem"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )}
                  <div className="relative">
                    <input
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                      onChange={handleImageChange}
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-100 focus:border-[#ea1d2c] outline-none transition-all bg-slate-50 hover:bg-white file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-red-50 file:text-[#ea1d2c] hover:file:bg-red-100 file:cursor-pointer text-sm"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1.5">
                    JPG, PNG, GIF, WEBP • Máx. 5MB
                  </p>
                </div>

                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                  <label className="flex items-center justify-between cursor-pointer">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-6 rounded-full transition-colors duration-200 relative ${
                        formData.isActive ? 'bg-emerald-500' : 'bg-slate-300'
                      }`}>
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-200 ${
                          formData.isActive ? 'left-5' : 'left-1'
                        }`}></div>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-slate-700 block">Complemento ativo</span>
                        <span className="text-[11px] text-slate-400">Visível para os clientes</span>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="sr-only"
                    />
                  </label>
                </div>

                <div className="flex gap-3 pt-1">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="flex-1 px-4 py-2.5 border-2 border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-all font-medium text-sm"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={formLoading}
                    className="flex-1 px-4 py-2.5 bg-gradient-to-r from-[#ea1d2c] to-[#d61a28] text-white rounded-xl hover:shadow-lg hover:shadow-red-200 transition-all duration-200 font-semibold flex items-center justify-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {formLoading ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    ) : (
                      <>
                        <Save size={15} />
                        <span>{editingComplement ? 'Atualizar' : 'Criar'}</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      {/* Modal de Confirmação */}
      {confirmModal.open && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm border border-slate-100">
            <div className="p-5 sm:p-6">
              <div className="flex flex-col items-center text-center mb-5">
                <div className="p-3 bg-red-50 rounded-2xl mb-3">
                  <AlertCircle className="w-7 h-7 text-red-500" />
                </div>
                <h2 className="text-lg font-bold text-slate-800">{confirmModal.title}</h2>
              </div>
              <p className="text-sm text-slate-500 mb-6 text-center leading-relaxed">{confirmModal.message}</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmModal(prev => ({ ...prev, open: false }))}
                  className="flex-1 px-4 py-2.5 border-2 border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-all font-medium text-sm"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmModal.onConfirm}
                  className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 hover:shadow-lg hover:shadow-red-200 transition-all duration-200 font-semibold text-sm flex items-center justify-center gap-1.5"
                >
                  <Trash2 size={14} />
                  Deletar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Complementos;