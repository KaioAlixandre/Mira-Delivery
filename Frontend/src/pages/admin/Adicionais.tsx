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
import ModalGerenciarCategoriasAdicionais from './components/ModalGerenciarCategoriasAdicionais';

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
      alert('Nome do adicional é obrigatório!');
      return;
    }

    const parsedValue = Number(formData.value);
    if (Number.isNaN(parsedValue) || parsedValue < 0) {
      alert('Valor inválido!');
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
      alert(`Adicional ${editingAdditional ? 'atualizado' : 'criado'} com sucesso!`);
    } catch (error: any) {
      const message = error?.response?.data?.message || 'Erro ao salvar adicional';
      alert(message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleToggleStatus = async (additional: Additional) => {
    try {
      await apiService.toggleAdditionalStatus(additional.id);
      await loadAdditionals();
    } catch (error) {
      alert('Erro ao alterar status do adicional');
    }
  };

  const handleDelete = async (additional: Additional) => {
    if (!window.confirm(`Tem certeza que deseja deletar o adicional "${additional.name}"? Esta ação não pode ser desfeita.`)) {
      return;
    }

    try {
      await apiService.deleteAdditional(additional.id);
      await loadAdditionals();
      alert('Adicional deletado com sucesso!');
    } catch (error) {
      alert('Erro ao deletar adicional');
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
      <header className="mb-3 sm:mb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
          <div className="flex-1">
            <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-slate-800 mb-1">Adicionais</h2>
            <p className="text-xs sm:text-sm text-slate-500">
              Gerencie os adicionais disponíveis.
              {filteredAdditionals.length !== additionals.length && (
                <span className="ml-2 text-indigo-600 font-medium">
                  {filteredAdditionals.length} de {additionals.length} adicionais
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowManageCategoriesModal(true)}
              className="bg-purple-600 text-white px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 hover:bg-purple-700 transition-colors whitespace-nowrap text-xs sm:text-sm"
            >
              <FolderTree className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Categorias</span>
            </button>
            <button
              onClick={handleCreate}
              className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 hover:bg-indigo-700 transition-colors whitespace-nowrap text-xs sm:text-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Novo Adicional</span>
              <span className="sm:hidden">Novo</span>
            </button>
            <button 
              onClick={handleRefresh}
              disabled={isRefreshing}
              className={`bg-indigo-600 text-white px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 hover:bg-indigo-700 transition-colors whitespace-nowrap text-xs sm:text-sm ${
                isRefreshing ? 'opacity-75 cursor-not-allowed' : ''
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Atualizando...' : 'Atualizar'}
            </button>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
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

        <div className="bg-white p-3 rounded-lg shadow-sm border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-purple-100 rounded-md flex-shrink-0">
              <Filter className="w-4 h-4 text-purple-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-[10px] sm:text-xs text-slate-600 mb-0.5">Filtrados</h3>
              <p className="text-xl sm:text-2xl font-bold text-slate-800">{metrics.filtered}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white p-3 sm:p-4 rounded-xl shadow-md mb-6 border border-slate-200">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1.5">
              Buscar Adicional
            </label>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-2.5 py-1.5 text-xs sm:text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
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
                  className="w-full px-2.5 py-1.5 pr-10 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 appearance-none bg-white text-xs sm:text-sm text-slate-700 cursor-pointer"
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

            <div>
              <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1.5">
                Status
              </label>
              <div className="relative">
                <select
                  value={filterActive}
                  onChange={(e) => setFilterActive(e.target.value as 'all' | 'active' | 'inactive')}
                  className="w-full px-2.5 py-1.5 pr-10 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 appearance-none bg-white text-xs sm:text-sm text-slate-700 cursor-pointer"
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

        <div className="mt-3 pt-3 border-t border-slate-200">
          <button
            onClick={() => setShowInactive(!showInactive)}
            className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors text-xs sm:text-sm ${
              showInactive 
                ? 'bg-purple-100 text-purple-700 border border-purple-300' 
                : 'bg-slate-100 text-slate-600 border border-slate-300'
            }`}
          >
            {showInactive ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span>Mostrar Inativos no Carregamento</span>
          </button>
        </div>
      </div>

      {loading && (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-transparent"></div>
        </div>
      )}

      {!loading && (
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          {filteredAdditionals.length === 0 ? (
            <div className="p-6 sm:p-12 text-center">
              <AlertCircle className="mx-auto text-gray-400 mb-3 sm:mb-4" size={36} />
              <h3 className="text-base sm:text-xl font-semibold text-gray-600 mb-2">Nenhum adicional encontrado</h3>
              <p className="text-xs sm:text-sm text-gray-500">
                {searchTerm || filterActive !== 'all' 
                  ? 'Tente ajustar os filtros de busca'
                  : 'Comece criando seu primeiro adicional'
                }
              </p>
            </div>
          ) : (
            <>
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Imagem</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Valor</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Categoria</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Criado em</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredAdditionals.map((additional) => (
                      <tr key={additional.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap">
                          {additional.imageUrl ? (
                            <img 
                              src={additional.imageUrl}
                              alt={additional.name}
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
                          <div className="text-sm font-medium text-gray-900">{additional.name}</div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{formatValue(additional.value)}</div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {additional.category ? (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                              {additional.category.name}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400 italic">Sem categoria</span>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            additional.isActive 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {additional.isActive ? (
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
                          {formatDate(additional.createdAt)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleEdit(additional)}
                              className="text-blue-600 hover:text-blue-900 p-1.5 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Editar"
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              onClick={() => handleToggleStatus(additional)}
                              className={`p-1.5 rounded-lg transition-colors ${
                                additional.isActive 
                                  ? 'text-green-600 hover:text-green-900 hover:bg-green-50' 
                                  : 'text-red-600 hover:text-red-900 hover:bg-red-50'
                              }`}
                              title={additional.isActive ? 'Ativo' : 'Inativo'}
                            >
                              {additional.isActive ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                            </button>
                            <button
                              onClick={() => handleDelete(additional)}
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

              <div className="md:hidden divide-y divide-gray-200">
                {filteredAdditionals.map((additional) => (
                  <div key={additional.id} className="p-3 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start gap-3 mb-2">
                      {additional.imageUrl ? (
                        <img 
                          src={additional.imageUrl}
                          alt={additional.name}
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
                        <h3 className="font-medium text-gray-900 text-sm mb-1">{additional.name}</h3>
                        <div className="text-xs text-slate-600 mb-1">{formatValue(additional.value)}</div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            additional.isActive 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {additional.isActive ? (
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
                          {additional.category && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                              {additional.category.name}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-xs text-gray-500 space-y-1 mb-3">
                      <div>Criado: {formatDate(additional.createdAt)}</div>
                      {additional.category ? (
                        <div>Categoria: {additional.category.name}</div>
                      ) : (
                        <div className="italic text-gray-400">Sem categoria</div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEdit(additional)}
                        className="flex-1 text-blue-600 hover:text-blue-900 p-2 hover:bg-blue-50 rounded-lg transition-colors flex items-center justify-center gap-1 text-xs font-medium"
                      >
                        <Edit size={14} />
                        <span>Editar</span>
                      </button>
                      <button
                        onClick={() => handleToggleStatus(additional)}
                        className={`flex-1 p-2 rounded-lg transition-colors flex items-center justify-center gap-1 text-xs font-medium ${
                          additional.isActive 
                            ? 'text-green-600 hover:text-green-900 hover:bg-green-50' 
                            : 'text-red-600 hover:text-red-900 hover:bg-red-50'
                        }`}
                      >
                        {additional.isActive ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                        <span>{additional.isActive ? 'Ativo' : 'Inativo'}</span>
                      </button>
                      <button
                        onClick={() => handleDelete(additional)}
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

      {showManageCategoriesModal && (
        <ModalGerenciarCategoriasAdicionais
          categories={categories}
          onClose={() => setShowManageCategoriesModal(false)}
          onCategoriesChange={loadCategories}
        />
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-4 sm:p-6">
              <div className="flex justify-between items-center mb-4 sm:mb-6">
                <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-800">
                  {editingAdditional ? 'Editar Adicional' : 'Novo Adicional'}
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
                    Nome do Adicional *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: Leite em pó, Nutella..."
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none transition-colors"
                    required
                    maxLength={100}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Máximo 100 caracteres ({formData.name.length}/100)
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Valor (R$) *
                  </label>
                  <input
                    type="number"
                    value={formData.value}
                    onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                    min="0"
                    step="0.01"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none transition-colors"
                    required
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Categoria do Adicional
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setShowModal(false);
                        setShowManageCategoriesModal(true);
                      }}
                      className="text-purple-600 hover:text-purple-700 text-xs font-medium flex items-center gap-1"
                    >
                      <FolderTree size={14} />
                      Gerenciar Categorias
                    </button>
                  </div>
                  <select
                    value={formData.categoryId || ''}
                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value ? parseInt(e.target.value) : null })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none transition-colors bg-white"
                  >
                    <option value="">Sem categoria</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Categorias ajudam a organizar os adicionais
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Imagem do Adicional
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
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none transition-colors file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
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
                      className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
                    />
                    <span className="text-sm font-medium text-gray-700">Adicional ativo</span>
                  </label>
                  <p className="text-xs text-gray-500 mt-1">
                    Adicionais inativos não aparecerão para os clientes
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
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all duration-300 font-semibold flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {formLoading ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                    ) : (
                      <>
                        <Save size={16} />
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
