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
import ModalGerenciarCategoriasAdicionais from './components/ModalGerenciarCategoriasAdicionais';
import { useNotification } from '../../components/NotificationProvider';

interface Additional {
  id: number;
  name: string;
  value: number;
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

interface AdditionalCategory {
  id: number;
  name: string;
  additionalsCount?: number;
}

interface AdditionalFormData {
  name: string;
  value: string;
  isActive: boolean;
  categoryId?: number | null;
  image?: File;
}

const Adicionais: React.FC = () => {
  const { notify } = useNotification();
  const [additionals, setAdditionals] = useState<Additional[]>([]);
  const [categories, setCategories] = useState<AdditionalCategory[]>([]);
  const [filteredAdditionals, setFilteredAdditionals] = useState<Additional[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('all');
  const [filterCategory, setFilterCategory] = useState<number | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingAdditional, setEditingAdditional] = useState<Additional | null>(null);
  const [formData, setFormData] = useState<AdditionalFormData>({
    name: '',
    value: '0',
    isActive: true,
    categoryId: null
  });
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [showInactive, setShowInactive] = useState(true);
  const [showManageCategoriesModal, setShowManageCategoriesModal] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([loadAdditionals(), loadCategories()]);
    } catch (error) {
      console.error('Erro ao atualizar:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const metrics = {
    total: additionals.length,
    active: additionals.filter(c => c.isActive).length,
    inactive: additionals.filter(c => !c.isActive).length,
    filtered: filteredAdditionals.length
  };

  const loadCategories = async () => {
    try {
      const data = await apiService.getAdditionalCategories();
      setCategories(data);
    } catch (error) {
      
    }
  };

  const loadAdditionals = async () => {
    try {
      setLoading(true);
      const data = await apiService.getAdditionals(showInactive);
      setAdditionals(data);
    } catch (error) {
      
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let filtered = additionals;

    if (searchTerm.trim()) {
      filtered = filtered.filter(additional =>
        additional.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterActive !== 'all') {
      filtered = filtered.filter(additional =>
        filterActive === 'active' ? additional.isActive : !additional.isActive
      );
    }

    if (filterCategory !== null) {
      if (filterCategory === 0) {
        filtered = filtered.filter(additional =>
          !additional.categoryId || additional.categoryId === null
        );
      } else {
        filtered = filtered.filter(additional =>
          additional.categoryId === filterCategory
        );
      }
    }

    setFilteredAdditionals(filtered);
  }, [additionals, searchTerm, filterActive, filterCategory]);

  useEffect(() => {
    loadAdditionals();
    loadCategories();
  }, [showInactive]);

  useEffect(() => {
    if (filterCategory !== null && filterCategory !== 0) {
      const categoryExists = categories.some(cat => cat.id === filterCategory);
      if (!categoryExists) {
        setFilterCategory(null);
      }
    }
  }, [categories, filterCategory]);

  const resetForm = () => {
    setFormData({ name: '', value: '0', isActive: true, categoryId: null });
    setImagePreview(null);
    setEditingAdditional(null);
    setShowModal(false);
  };

  const handleCreate = () => {
    resetForm();
    setShowModal(true);
  };

  const handleEdit = (additional: Additional) => {
    setEditingAdditional(additional);
    setFormData({
      name: additional.name,
      value: String(additional.value ?? 0),
      isActive: additional.isActive,
      categoryId: additional.categoryId || null
    });
    setImagePreview(additional.imageUrl ? additional.imageUrl : null);
    setShowModal(true);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData({ ...formData, image: file });

      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setFormData({ ...formData, image: undefined });
    setImagePreview(null);

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      notify('Nome do adicional é obrigatório!', 'error');
      return;
    }

    const parsedValue = Number(formData.value);
    if (Number.isNaN(parsedValue) || parsedValue < 0) {
      notify('Valor inválido!', 'error');
      return;
    }

    try {
      setFormLoading(true);
      const dataToSend = {
        name: formData.name,
        value: parsedValue,
        isActive: formData.isActive,
        categoryId: formData.categoryId,
        image: formData.image
      };

      if (editingAdditional) {
        await apiService.updateAdditional(editingAdditional.id, dataToSend);
      } else {
        await apiService.createAdditional(dataToSend);
      }

      await loadAdditionals();
      resetForm();
      notify(`Adicional ${editingAdditional ? 'atualizado' : 'criado'} com sucesso!`, 'success');
    } catch (error: any) {
      const message = error?.response?.data?.message || 'Erro ao salvar adicional';
      notify(message, 'error');
    } finally {
      setFormLoading(false);
    }
  };

  const handleToggleStatus = async (additional: Additional) => {
    try {
      await apiService.toggleAdditionalStatus(additional.id);
      await loadAdditionals();
    } catch (error) {
      notify('Erro ao alterar status do adicional', 'error');
    }
  };

  const handleDelete = async (additional: Additional) => {
    if (!window.confirm(`Tem certeza que deseja deletar o adicional "${additional.name}"? Esta ação não pode ser desfeita.`)) {
      return;
    }

    try {
      await apiService.deleteAdditional(additional.id);
      await loadAdditionals();
      notify('Adicional deletado com sucesso!', 'success');
    } catch (error) {
      notify('Erro ao deletar adicional', 'error');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatValue = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  return (
    <div className="page">
      <header className="mb-4 sm:mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2.5 mb-1">
              <div className="p-2 bg-gradient-to-br from-[var(--primary-color)] to-[var(--primary-color-hover)] rounded-xl shadow-md shadow-red-200">
                <Package className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-800 tracking-tight">Adicionais</h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 ml-[2.75rem]">
              Gerencie os adicionais disponíveis para seus produtos.
              {filteredAdditionals.length !== additionals.length && (
                <span className="ml-2 text-brand font-semibold">
                  {filteredAdditionals.length} de {additionals.length}
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setShowManageCategoriesModal(true)}
              className="border-2 border-slate-200 text-slate-700 px-3.5 py-2 rounded-xl font-semibold flex items-center gap-2 hover:border-brand hover:text-brand hover:bg-red-50 transition-all duration-200 whitespace-nowrap text-xs sm:text-sm"
            >
              <FolderTree className="w-4 h-4" />
              <span className="hidden sm:inline">Categorias</span>
            </button>
            <button
              onClick={handleCreate}
              className="bg-gradient-to-r from-[var(--primary-color)] to-[var(--primary-color-hover)] text-white px-3.5 py-2 rounded-xl font-semibold flex items-center gap-2 hover:shadow-lg hover:shadow-red-200 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 whitespace-nowrap text-xs sm:text-sm"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Novo Adicional</span>
              <span className="sm:hidden">Novo</span>
            </button>
            <button 
              onClick={handleRefresh}
              disabled={isRefreshing}
              className={`p-2 rounded-xl text-slate-500 hover:text-brand hover:bg-red-50 border-2 border-slate-200 hover:border-red-200 transition-all duration-200 ${
                isRefreshing ? 'opacity-75 cursor-not-allowed' : ''
              }`}
              title="Atualizar dados"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
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

      <div className="bg-white p-4 sm:p-5 rounded-xl shadow-sm mb-4 sm:mb-6 border border-slate-100">
        <div className="flex items-center gap-2 mb-3 sm:mb-4">
          <Search className="w-4 h-4 text-slate-400" />
          <h3 className="text-xs sm:text-sm font-semibold text-slate-600 uppercase tracking-wider">Filtros</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
          <div>
            <label className="block text-[11px] sm:text-xs font-medium text-slate-500 mb-1.5 uppercase tracking-wide">
              Buscar
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Nome do adicional..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2.5 text-xs sm:text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-100 focus:border-brand outline-none transition-all bg-slate-50 hover:bg-white"
              />
            </div>
          </div>

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
                className="w-full px-3 py-2.5 pr-10 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-100 focus:border-brand appearance-none bg-slate-50 hover:bg-white text-xs sm:text-sm text-slate-700 cursor-pointer transition-all"
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

          <div>
            <label className="block text-[11px] sm:text-xs font-medium text-slate-500 mb-1.5 uppercase tracking-wide">
              Status
            </label>
            <div className="relative">
              <select
                value={filterActive}
                onChange={(e) => setFilterActive(e.target.value as 'all' | 'active' | 'inactive')}
                className="w-full px-3 py-2.5 pr-10 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-100 focus:border-brand appearance-none bg-slate-50 hover:bg-white text-xs sm:text-sm text-slate-700 cursor-pointer transition-all"
              >
                <option value="all">Todos</option>
                <option value="active">Ativos</option>
                <option value="inactive">Inativos</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>
        </div>

        <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-slate-100">
          <button
            onClick={() => setShowInactive(!showInactive)}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-medium transition-all duration-200 text-xs sm:text-sm ${
              showInactive 
                ? 'bg-red-50 text-brand border border-red-200 shadow-sm shadow-red-100' 
                : 'bg-slate-50 text-slate-500 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            {showInactive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            <span>Carregar inativos</span>
            <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold ${
              showInactive ? 'bg-brand text-white' : 'bg-slate-300 text-white'
            }`}>
              {showInactive ? '✓' : '✗'}
            </span>
          </button>
        </div>
      </div>

      {loading && (
        <div className="flex flex-col justify-center items-center py-16 gap-3">
          <div className="relative">
            <div className="animate-spin rounded-full h-10 w-10 border-[3px] border-slate-200 border-t-brand"></div>
          </div>
          <p className="text-xs text-slate-400 font-medium animate-pulse">Carregando adicionais...</p>
        </div>
      )}

      {!loading && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-slate-100">
          {filteredAdditionals.length === 0 ? (
            <div className="p-8 sm:p-16 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-50 rounded-2xl mb-4">
                <Package className="text-slate-300" size={32} />
              </div>
              <h3 className="text-base sm:text-lg font-semibold text-slate-600 mb-1.5">Nenhum adicional encontrado</h3>
              <p className="text-xs sm:text-sm text-slate-400 max-w-xs mx-auto">
                {searchTerm || filterActive !== 'all' 
                  ? 'Tente ajustar os filtros de busca'
                  : 'Comece criando seu primeiro adicional'
                }
              </p>
              {!searchTerm && filterActive === 'all' && (
                <button
                  onClick={handleCreate}
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-brand text-white text-sm font-semibold rounded-xl hover:bg-brand transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Criar Adicional
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gradient-to-r from-slate-50 to-slate-100/50 border-b border-slate-200">
                      <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Imagem</th>
                      <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Nome</th>
                      <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Valor</th>
                      <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Categoria</th>
                      <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                      <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Criado em</th>
                      <th className="px-5 py-3.5 text-right text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredAdditionals.map((additional) => (
                      <tr key={additional.id} className={`group hover:bg-red-50/30 transition-colors duration-150 ${!additional.isActive ? 'opacity-60' : ''}`}>
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          {additional.imageUrl ? (
                            <img 
                              src={additional.imageUrl}
                              alt={additional.name}
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
                          <span className="text-sm font-semibold text-slate-800">{additional.name}</span>
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-100">
                            {formatValue(additional.value)}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          {additional.category ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-red-50 text-brand border border-red-100">
                              <FolderTree className="w-3 h-3" />
                              {additional.category.name}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400 italic">Sem categoria</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${
                            additional.isActive 
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                              : 'bg-red-50 text-red-600 border border-red-100'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              additional.isActive ? 'bg-emerald-500' : 'bg-red-400'
                            }`}></span>
                            {additional.isActive ? 'Ativo' : 'Inativo'}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <span className="text-xs text-slate-500">{formatDate(additional.createdAt)}</span>
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            <button
                              onClick={() => handleEdit(additional)}
                              className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-150"
                              title="Editar"
                            >
                              <Edit size={15} />
                            </button>
                            <button
                              onClick={() => handleToggleStatus(additional)}
                              className={`p-2 rounded-lg transition-all duration-150 ${
                                additional.isActive 
                                  ? 'text-slate-400 hover:text-amber-600 hover:bg-amber-50' 
                                  : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                              }`}
                              title={additional.isActive ? 'Desativar' : 'Ativar'}
                            >
                              {additional.isActive ? <ToggleRight size={15} /> : <ToggleLeft size={15} />}
                            </button>
                            <button
                              onClick={() => handleDelete(additional)}
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

              <div className="md:hidden p-3 space-y-3">
                {filteredAdditionals.map((additional) => (
                  <div key={additional.id} className={`bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden transition-all duration-200 hover:shadow-md ${!additional.isActive ? 'opacity-60' : ''}`}>
                    <div className="p-3.5">
                      <div className="flex items-start gap-3 mb-3">
                        {additional.imageUrl ? (
                          <img 
                            src={additional.imageUrl}
                            alt={additional.name}
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
                          <h3 className="font-semibold text-slate-800 text-sm mb-1 truncate">{additional.name}</h3>
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 mb-1.5">
                            {formatValue(additional.value)}
                          </span>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold ${
                              additional.isActive 
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                                : 'bg-red-50 text-red-600 border border-red-100'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${
                                additional.isActive ? 'bg-emerald-500' : 'bg-red-400'
                              }`}></span>
                              {additional.isActive ? 'Ativo' : 'Inativo'}
                            </span>
                            {additional.category && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-red-50 text-brand border border-red-100">
                                {additional.category.name}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-[11px] text-slate-400 mb-3 flex items-center gap-1">
                        <span>Criado em {formatDate(additional.createdAt)}</span>
                      </div>
                    </div>

                    <div className="flex items-center border-t border-slate-100 divide-x divide-slate-100">
                      <button
                        onClick={() => handleEdit(additional)}
                        className="flex-1 py-2.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors flex items-center justify-center gap-1.5 text-xs font-medium"
                      >
                        <Edit size={13} />
                        <span>Editar</span>
                      </button>
                      <button
                        onClick={() => handleToggleStatus(additional)}
                        className={`flex-1 py-2.5 transition-colors flex items-center justify-center gap-1.5 text-xs font-medium ${
                          additional.isActive 
                            ? 'text-slate-500 hover:text-amber-600 hover:bg-amber-50' 
                            : 'text-slate-500 hover:text-emerald-600 hover:bg-emerald-50'
                        }`}
                      >
                        {additional.isActive ? <ToggleRight size={13} /> : <ToggleLeft size={13} />}
                        <span>{additional.isActive ? 'Desativar' : 'Ativar'}</span>
                      </button>
                      <button
                        onClick={() => handleDelete(additional)}
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

      {showManageCategoriesModal && (
        <ModalGerenciarCategoriasAdicionais
          categories={categories}
          onClose={() => setShowManageCategoriesModal(false)}
          onCategoriesChange={loadCategories}
        />
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto border border-slate-100">
            <div className="p-5 sm:p-6">
              <div className="flex justify-between items-center mb-5">
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-slate-800">
                    {editingAdditional ? 'Editar Adicional' : 'Novo Adicional'}
                  </h2>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {editingAdditional ? 'Atualize as informações abaixo' : 'Preencha os dados do novo adicional'}
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
                    placeholder="Ex: Leite em pó, Nutella..."
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-100 focus:border-brand outline-none transition-all bg-slate-50 hover:bg-white"
                    required
                    maxLength={100}
                  />
                  <div className="flex items-center justify-between mt-1.5">
                    <p className="text-[11px] text-slate-400">Nome exibido para o cliente</p>
                    <p className="text-[11px] text-slate-400">{formData.name.length}/100</p>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">
                    Valor (R$) *
                  </label>
                  <input
                    type="number"
                    value={formData.value}
                    onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                    min="0"
                    step="0.01"
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-100 focus:border-brand outline-none transition-all bg-slate-50 hover:bg-white"
                    required
                  />
                  <p className="text-[11px] text-slate-400 mt-1.5">Valor cobrado por unidade</p>
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
                      className="text-brand hover:text-brand text-[11px] font-semibold flex items-center gap-1 hover:underline"
                    >
                      <FolderTree size={12} />
                      Gerenciar
                    </button>
                  </div>
                  <select
                    value={formData.categoryId || ''}
                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value ? parseInt(e.target.value) : null })}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-100 focus:border-brand outline-none transition-all bg-slate-50 hover:bg-white appearance-none cursor-pointer"
                  >
                    <option value="">Sem categoria</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                  <p className="text-[11px] text-slate-400 mt-1.5">
                    Organiza adicionais em grupos
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
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-100 focus:border-brand outline-none transition-all bg-slate-50 hover:bg-white file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-red-50 file:text-brand hover:file:bg-red-100 file:cursor-pointer text-sm"
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
                        <span className="text-sm font-medium text-slate-700 block">Adicional ativo</span>
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
                    className="flex-1 px-4 py-2.5 bg-gradient-to-r from-[var(--primary-color)] to-[var(--primary-color-hover)] text-white rounded-xl hover:shadow-lg hover:shadow-red-200 transition-all duration-200 font-semibold flex items-center justify-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {formLoading ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    ) : (
                      <>
                        <Save size={15} />
                        <span>{editingAdditional ? 'Atualizar' : 'Criar'}</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Adicionais;
