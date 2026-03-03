import React, { useState, useEffect } from 'react';
import { X, Plus, Pencil, Trash2, Save } from 'lucide-react';
import apiService from '../../../services/api';

interface FlavorCategory {
  id: number;
  name: string;
  flavorsCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

interface Props {
  categories: FlavorCategory[];
  onClose: () => void;
  onCategoriesChange: () => void;
}

const ModalGerenciarCategoriasSabores: React.FC<Props> = ({ categories: initialCategories, onClose, onCategoriesChange }) => {
  const [categories, setCategories] = useState<FlavorCategory[]>(initialCategories);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Atualizar categorias quando initialCategories mudar
  useEffect(() => {
    setCategories(initialCategories);
  }, [initialCategories]);

  const handleStartEdit = (category: FlavorCategory) => {
    setEditingId(category.id);
    setEditName(category.name);
    setError('');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditName('');
    setError('');
  };

  const handleSaveEdit = async (id: number) => {
    if (!editName.trim()) {
      setError('O nome da categoria não pode estar vazio');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const updatedCategory = await apiService.updateFlavorCategory(id, editName.trim());
      // Atualizar a lista local
      setCategories(categories.map(cat => 
        cat.id === id ? { ...cat, name: updatedCategory.name } : cat
      ));
      setEditingId(null);
      setEditName('');
      onCategoriesChange(); // Notificar o componente pai para recarregar
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao atualizar categoria');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    const category = categories.find(cat => cat.id === id);
    const hasFlavors = category?.flavorsCount && category.flavorsCount > 0;

    if (hasFlavors) {
      alert(`Não é possível excluir esta categoria. Ela possui ${category?.flavorsCount} sabor(es) associado(s).`);
      return;
    }

    if (!window.confirm('Tem certeza que deseja excluir esta categoria?')) {
      return;
    }

    try {
      setLoading(true);
      setError('');
      await apiService.deleteFlavorCategory(id);
      // Remover da lista local
      setCategories(categories.filter(cat => cat.id !== id));
      onCategoriesChange(); // Notificar o componente pai para recarregar
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao excluir categoria');
    } finally {
      setLoading(false);
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) {
      setError('O nome da categoria não pode estar vazio');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const newCategory = await apiService.createFlavorCategory(newCategoryName.trim());
      // Adicionar à lista local
      setCategories([...categories, newCategory]);
      setNewCategoryName('');
      onCategoriesChange(); // Notificar o componente pai para recarregar
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao adicionar categoria');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col border border-slate-100 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 sm:p-6 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-slate-100/40">
          <div>
            <h3 className="text-lg sm:text-xl font-bold text-slate-800">Categorias de Sabores</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Crie, edite e remova categorias</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-200/60 rounded-xl transition-colors"
            title="Fechar"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Formulário para adicionar nova categoria */}
          <form onSubmit={handleAddCategory} className="mb-6 p-4 bg-slate-50 rounded-xl border border-slate-100">
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Nome da nova categoria"
                className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-100 focus:border-[#ea1d2c] bg-white"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading || !newCategoryName.trim()}
                className="px-4 py-2.5 bg-gradient-to-r from-[#ea1d2c] to-[#d61a28] text-white rounded-xl font-semibold flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-red-200 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="w-4 h-4" />
                <span>Adicionar</span>
              </button>
            </div>
          </form>

          {/* Lista de categorias */}
          <div className="space-y-2">
            {categories.length === 0 ? (
              <div className="text-center py-10 text-slate-400">
                <p className="font-medium text-slate-500">Nenhuma categoria cadastrada</p>
                <p className="text-sm mt-2">Adicione uma nova categoria acima</p>
              </div>
            ) : (
              categories.map((category) => (
                <div
                  key={category.id}
                  className="flex items-center justify-between p-3.5 sm:p-4 bg-white border border-slate-100 rounded-xl hover:shadow-md hover:border-red-100 transition-all duration-200"
                >
                  {editingId === category.id ? (
                    <div className="flex-1 flex items-center gap-2">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="flex-1 px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-100 focus:border-[#ea1d2c] bg-slate-50"
                        autoFocus
                        disabled={loading}
                      />
                      <button
                        onClick={() => handleSaveEdit(category.id)}
                        disabled={loading || !editName.trim()}
                        className="p-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Salvar"
                      >
                        <Save className="w-4 h-4" />
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        disabled={loading}
                        className="p-2.5 bg-slate-200 text-slate-700 rounded-xl hover:bg-slate-300 transition-colors disabled:opacity-50"
                        title="Cancelar"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex-1">
                        <span className="font-semibold text-slate-800 text-sm sm:text-base">
                          {category.name}
                        </span>
                        {category.flavorsCount !== undefined && (
                          <span className="ml-2 text-xs text-slate-400">
                            ({category.flavorsCount} sabor{category.flavorsCount !== 1 ? 'es' : ''})
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleStartEdit(category)}
                          disabled={loading}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors disabled:opacity-50"
                          title="Editar"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(category.id)}
                          disabled={loading || (category.flavorsCount !== undefined && category.flavorsCount > 0)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                          title={category.flavorsCount && category.flavorsCount > 0 ? 'Não é possível excluir categoria com sabores' : 'Excluir'}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-6 border-t border-slate-100 flex justify-end bg-slate-50/40">
          <button
            onClick={onClose}
            className="px-5 py-2.5 border-2 border-slate-200 text-slate-600 rounded-xl font-semibold hover:bg-white hover:border-red-200 hover:text-[#ea1d2c] transition-all"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalGerenciarCategoriasSabores;

