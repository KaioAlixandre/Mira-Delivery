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
  CheckCircle,
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
      <header className="mb-3 sm:mb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
          <div className="flex-1">
            <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-slate-800 mb-1">Complementos</h2>
            <p className="text-xs sm:text-sm text-slate-500">
              Gerencie os complementos disponíveis.
              {filteredComplements.length !== complements.length && (
                <span className="ml-2 text-[#ea1d2c] font-medium">
                  {filteredComplements.length} de {complements.length} complementos
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowManageCategoriesModal(true)}
              className="bg-[#ea1d2c] text-white px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 hover:bg-[#d61a28] transition-colors whitespace-nowrap text-xs sm:text-sm"
            >
              <FolderTree className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Categorias</span>
            </button>
            <button
              onClick={handleCreate}
              className="bg-[#ea1d2c] text-white px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 hover:bg-[#d61a28] transition-colors whitespace-nowrap text-xs sm:text-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Novo Complemento</span>
              <span className="sm:hidden">Novo</span>
            </button>
            <button 
              onClick={handleRefresh}
              disabled={isRefreshing}
              className={`bg-[#ea1d2c] text-white px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 hover:bg-[#d61a28] transition-colors whitespace-nowrap text-xs sm:text-sm ${
                isRefreshing ? 'opacity-75 cursor-not-allowed' : ''
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Atualizando...' : 'Atualizar'}
            </button>
          </div>
        </div>
      </header>

      {/* Cards de Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
        {/* Total */}
        <div className="bg-white p-3 rounded-lg shadow-sm border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-blue-100 rounded-md flex-shrink-0">
              <Package className="w-4 h-4 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-[10px] sm:text-xs text-slate-600 mb-0.5">Total</h3>
              <p className="text-xl sm:text-2xl font-bold text-slate-800">{metrics.total}</p>
            </div>
          </div>
        </div>

        {/* Ativos */}
        <div className="bg-white p-3 rounded-lg shadow-sm border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-green-100 rounded-md flex-shrink-0">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-[10px] sm:text-xs text-slate-600 mb-0.5">Ativos</h3>
              <p className="text-xl sm:text-2xl font-bold text-slate-800">{metrics.active}</p>
            </div>
          </div>
        </div>

        {/* Inativos */}
        <div className="bg-white p-3 rounded-lg shadow-sm border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-red-100 rounded-md flex-shrink-0">
              <XCircle className="w-4 h-4 text-red-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-[10px] sm:text-xs text-slate-600 mb-0.5">Inativos</h3>
              <p className="text-xl sm:text-2xl font-bold text-slate-800">{metrics.inactive}</p>
            </div>
          </div>
        </div>

        {/* Filtrados */}
        <div className="bg-white p-3 rounded-lg shadow-sm border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-red-100 rounded-md flex-shrink-0">
              <Filter className="w-4 h-4 text-[#ea1d2c]" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-[10px] sm:text-xs text-slate-600 mb-0.5">Filtrados</h3>
              <p className="text-xl sm:text-2xl font-bold text-slate-800">{metrics.filtered}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Painel de Filtros - Sempre Visível */}
      <div className="bg-white p-3 sm:p-4 rounded-xl shadow-md mb-6 border border-slate-200">
        {/* Seção de Filtros */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Busca */}
          <div>
            <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1.5">
              Buscar Complemento
            </label>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-2.5 py-1.5 text-xs sm:text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#ea1d2c] focus:border-[#ea1d2c] outline-none transition-colors"
              />
            </div>
          </div>

          {/* Filtro por Categoria e Status */}
          <div className="grid grid-cols-2 gap-2">
            {/* Filtro por Categoria */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1.5">
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
                  className="w-full px-2.5 py-1.5 pr-10 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#ea1d2c] focus:border-[#ea1d2c] appearance-none bg-white text-xs sm:text-sm text-slate-700 cursor-pointer"
                >
                  <option value="">Todas</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                  <option value="0">Sem Categoria</option>
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* Filtro por Status */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1.5">
                Status
              </label>
              <div className="relative">
                <select
                  value={filterActive}
                  onChange={(e) => setFilterActive(e.target.value as 'all' | 'active' | 'inactive')}
                  className="w-full px-2.5 py-1.5 pr-10 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#ea1d2c] focus:border-[#ea1d2c] appearance-none bg-white text-xs sm:text-sm text-slate-700 cursor-pointer"
                >
                  <option value="all">Todos</option>
                  <option value="active">Ativos</option>
                  <option value="inactive">Inativos</option>
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>

        {/* Toggle Mostrar Inativos */}
        <div className="mt-3 pt-3 border-t border-slate-200">
          <button
            onClick={() => setShowInactive(!showInactive)}
            className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors text-xs sm:text-sm ${
              showInactive 
                ? 'bg-red-100 text-[#ea1d2c] border border-red-300' 
                : 'bg-slate-100 text-slate-600 border border-slate-300'
            }`}
          >
            {showInactive ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span>Mostrar Inativos no Carregamento</span>
          </button>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#ea1d2c] border-t-transparent"></div>
        </div>
      )}

      {/* Lista de Complementos */}
      {!loading && (
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          {filteredComplements.length === 0 ? (
            <div className="p-6 sm:p-12 text-center">
              <AlertCircle className="mx-auto text-gray-400 mb-3 sm:mb-4" size={36} />
              <h3 className="text-base sm:text-xl font-semibold text-gray-600 mb-2">Nenhum complemento encontrado</h3>
              <p className="text-xs sm:text-sm text-gray-500">
                {searchTerm || filterActive !== 'all' 
                  ? 'Tente ajustar os filtros de busca'
                  : 'Comece criando seu primeiro complemento'
                }
              </p>
            </div>
          ) : (
            <>
              {/* Versão Desktop - Tabela */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Imagem
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Nome
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Categoria
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Criado em
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredComplements.map((complement) => (
                      <tr key={complement.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap">
                          {complement.imageUrl ? (
                            <img 
                              src={complement.imageUrl}
                              alt={complement.name}
                              className="w-12 h-12 object-cover rounded-lg border border-gray-200"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                                target.parentElement!.innerHTML = '<div class="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center"><span class="text-gray-400 text-xs">Erro</span></div>';
                              }}
                            />
                          ) : (
                            <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
                              <span className="text-gray-400 text-xs">Sem img</span>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{complement.name}</div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {complement.category ? (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-[#ea1d2c]">
                              {complement.category.name}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400 italic">Sem categoria</span>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            complement.isActive 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {complement.isActive ? (
                              <>
                                <CheckCircle size={12} className="mr-1" />
                                Ativo
                              </>
                            ) : (
                              <>
                                <X size={12} className="mr-1" />
                                Inativo
                              </>
                            )}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(complement.createdAt)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleEdit(complement)}
                              className="text-blue-600 hover:text-blue-900 p-1.5 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Editar"
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              onClick={() => handleToggleStatus(complement)}
                              className={`p-1.5 rounded-lg transition-colors ${
                                complement.isActive 
                                  ? 'text-green-600 hover:text-green-900 hover:bg-green-50' 
                                  : 'text-red-600 hover:text-red-900 hover:bg-red-50'
                              }`}
                              title={complement.isActive ? 'Ativo' : 'Inativo'}
                            >
                              {complement.isActive ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                            </button>
                            <button
                              onClick={() => handleDelete(complement)}
                              className="text-red-600 hover:text-red-900 p-1.5 hover:bg-red-50 rounded-lg transition-colors"
                              title="Deletar"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Versão Mobile - Cards */}
              <div className="md:hidden divide-y divide-gray-200">
                {filteredComplements.map((complement) => (
                  <div key={complement.id} className="p-3 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start gap-3 mb-2">
                      {complement.imageUrl ? (
                        <img 
                          src={complement.imageUrl}
                          alt={complement.name}
                          className="w-16 h-16 object-cover rounded-lg flex-shrink-0 border border-gray-200"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            target.parentElement!.innerHTML = '<div class="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center flex-shrink-0"><span class="text-gray-400 text-xs text-center">Erro ao carregar</span></div>';
                          }}
                        />
                      ) : (
                        <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center flex-shrink-0">
                          <span className="text-gray-400 text-xs text-center">Sem imagem</span>
                        </div>
                      )}
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900 text-sm mb-1">{complement.name}</h3>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            complement.isActive 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {complement.isActive ? (
                              <>
                                <CheckCircle size={10} className="mr-1" />
                                Ativo
                              </>
                            ) : (
                              <>
                                <X size={10} className="mr-1" />
                                Inativo
                              </>
                            )}
                          </span>
                          {complement.category && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-[#ea1d2c]">
                              {complement.category.name}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-xs text-gray-500 space-y-1 mb-3">
                      <div>Criado: {formatDate(complement.createdAt)}</div>
                      {complement.category ? (
                        <div>Categoria: {complement.category.name}</div>
                      ) : (
                        <div className="italic text-gray-400">Sem categoria</div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEdit(complement)}
                        className="flex-1 text-blue-600 hover:text-blue-900 p-2 hover:bg-blue-50 rounded-lg transition-colors flex items-center justify-center gap-1 text-xs font-medium"
                      >
                        <Edit size={14} />
                        <span>Editar</span>
                      </button>
                      <button
                        onClick={() => handleToggleStatus(complement)}
                        className={`flex-1 p-2 rounded-lg transition-colors flex items-center justify-center gap-1 text-xs font-medium ${
                          complement.isActive 
                            ? 'text-green-600 hover:text-green-900 hover:bg-green-50' 
                            : 'text-red-600 hover:text-red-900 hover:bg-red-50'
                        }`}
                      >
                        {complement.isActive ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                        <span>{complement.isActive ? 'Ativo' : 'Inativo'}</span>
                      </button>
                      <button
                        onClick={() => handleDelete(complement)}
                        className="flex-1 text-red-600 hover:text-red-900 p-2 hover:bg-red-50 rounded-lg transition-colors flex items-center justify-center gap-1 text-xs font-medium"
                      >
                        <Trash2 size={14} />
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-4 sm:p-6">
              <div className="flex justify-between items-center mb-4 sm:mb-6">
                <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-800">
                  Nova Categoria de Complemento
                </h2>
                <button
                  onClick={() => {
                    setShowCategoryModal(false);
                    setShowModal(true);
                    setNewCategoryName('');
                  }}
                  className="text-gray-400 hover:text-gray-600 p-1.5 sm:p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X size={20} className="sm:w-6 sm:h-6" />
                </button>
              </div>

              <form onSubmit={handleCreateCategory} className="space-y-4 sm:space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nome da Categoria *
                  </label>
                  <input
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="Ex: Frutas, Granolas, Cremes..."
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#ea1d2c] focus:outline-none transition-colors"
                    required
                    maxLength={100}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Máximo 100 caracteres ({newCategoryName.length}/100)
                  </p>
                </div>

                <div className="flex space-x-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCategoryModal(false);
                      setShowModal(true);
                      setNewCategoryName('');
                    }}
                    className="flex-1 px-4 py-3 border-2 border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-[#ea1d2c] to-[#d61a28] text-white rounded-xl hover:from-[#d61a28] hover:to-[#b8151f] transition-all duration-300 font-semibold flex items-center justify-center space-x-2"
                  >
                    <Save size={16} />
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-4 sm:p-6">
              <div className="flex justify-between items-center mb-4 sm:mb-6">
                <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-800">
                  {editingComplement ? 'Editar Complemento' : 'Novo Complemento'}
                </h2>
                <button
                  onClick={resetForm}
                  className="text-gray-400 hover:text-gray-600 p-1.5 sm:p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X size={20} className="sm:w-6 sm:h-6" />
                </button>
              </div>

              <form onSubmit={handleSave} className="space-y-4 sm:space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nome do Complemento *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: Morango, Banana, Granola..."
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#ea1d2c] focus:outline-none transition-colors"
                    required
                    maxLength={100}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Máximo 100 caracteres ({formData.name.length}/100)
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Categoria do Complemento
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setShowModal(false);
                        setShowManageCategoriesModal(true);
                      }}
                      className="text-[#ea1d2c] hover:text-[#d61a28] text-xs font-medium flex items-center gap-1"
                    >
                      <FolderTree size={14} />
                      Gerenciar Categorias
                    </button>
                  </div>
                  <select
                    value={formData.categoryId || ''}
                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value ? parseInt(e.target.value) : null })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#ea1d2c] focus:outline-none transition-colors bg-white"
                  >
                    <option value="">Sem categoria</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Categorias ajudam a organizar os complementos
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Imagem do Complemento
                  </label>
                  {imagePreview && (
                    <div className="mb-3 relative group">
                      <img 
                        src={imagePreview} 
                        alt="Preview" 
                        className="w-full h-48 object-contain bg-gray-50 rounded-lg border-2 border-gray-200"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect fill="%23ddd" width="200" height="200"/%3E%3Ctext fill="%23999" font-family="sans-serif" font-size="14" dy="105" font-weight="bold" x="50%25" y="50%25" text-anchor="middle"%3EImagem não encontrada%3C/text%3E%3C/svg%3E';
                        }}
                      />
                      <button
                        type="button"
                        onClick={handleRemoveImage}
                        className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition-colors shadow-lg opacity-0 group-hover:opacity-100"
                        title="Remover imagem"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  )}
                  <div className="relative">
                    <input
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                      onChange={handleImageChange}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#ea1d2c] focus:outline-none transition-colors file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-red-50 file:text-[#ea1d2c] hover:file:bg-red-100"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Formatos aceitos: JPG, PNG, GIF, WEBP. Tamanho máximo: 5MB
                  </p>
                </div>

                <div>
                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="w-5 h-5 text-[#ea1d2c] rounded focus:ring-[#ea1d2c]"
                    />
                    <span className="text-sm font-medium text-gray-700">Complemento ativo</span>
                  </label>
                  <p className="text-xs text-gray-500 mt-1">
                    Complementos inativos não aparecerão para os clientes
                  </p>
                </div>

                <div className="flex space-x-4">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="flex-1 px-4 py-3 border-2 border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={formLoading}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-[#ea1d2c] to-[#d61a28] text-white rounded-xl hover:from-[#d61a28] hover:to-[#b8151f] transition-all duration-300 font-semibold flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {formLoading ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                    ) : (
                      <>
                        <Save size={16} />
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="p-4 sm:p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-red-100 rounded-full">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                </div>
                <h2 className="text-lg font-bold text-gray-800">{confirmModal.title}</h2>
              </div>
              <p className="text-sm text-gray-600 mb-6">{confirmModal.message}</p>
              <div className="flex space-x-3">
                <button
                  onClick={() => setConfirmModal(prev => ({ ...prev, open: false }))}
                  className="flex-1 px-4 py-2.5 border-2 border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium text-sm"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmModal.onConfirm}
                  className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors font-semibold text-sm"
                >
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