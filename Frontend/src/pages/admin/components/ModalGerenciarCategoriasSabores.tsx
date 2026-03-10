import React, { useState, useEffect } from 'react';
import { X, Plus, Pencil, Trash2, Save, Sparkles, AlertCircle } from 'lucide-react';
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
      setCategories(categories.map(cat =>
        cat.id === id ? { ...cat, name: updatedCategory.name } : cat
      ));
      setEditingId(null);
      setEditName('');
      onCategoriesChange();
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
      setCategories(categories.filter(cat => cat.id !== id));
      onCategoriesChange();
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
      setCategories([...categories, newCategory]);
      setNewCategoryName('');
      onCategoriesChange();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao adicionar categoria');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 p-5 sm:p-6 border-b border-slate-200 bg-gradient-to-br from-slate-50 via-white to-slate-50/80">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 bg-brand-light rounded-xl flex-shrink-0">
              <Sparkles className="w-5 h-5 text-brand" />
            </div>
            <div className="min-w-0">
              <h3 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">Categorias de Sabores</h3>
              <p className="text-xs text-slate-500 mt-0.5">Crie, edite e remova categorias de sabores</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors flex-shrink-0"
            title="Fechar"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {error && (
            <div className="mb-4 flex items-start gap-3 p-3.5 bg-red-50 border border-red-100 rounded-xl text-red-700 text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleAddCategory} className="mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">Nova categoria</label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Ex: Frutas, Cremes, Especiais..."
                className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none transition-all text-slate-900 placeholder:text-slate-400"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading || !newCategoryName.trim()}
                className="px-4 py-2.5 bg-brand text-white rounded-xl font-semibold flex items-center justify-center gap-2 hover:opacity-95 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity shadow-sm min-w-[120px]"
              >
                <Plus className="w-4 h-4" />
                Adicionar
              </button>
            </div>
          </form>

          <div>
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
              {categories.length} {categories.length === 1 ? 'categoria' : 'categorias'}
            </h4>
            <div className="space-y-2">
              {categories.length === 0 ? (
                <div className="text-center py-12 px-4 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50">
                  <Sparkles className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                  <p className="font-medium text-slate-500">Nenhuma categoria cadastrada</p>
                  <p className="text-sm text-slate-400 mt-1">Use o campo acima para criar a primeira</p>
                </div>
              ) : (
                categories.map((category) => (
                  <div
                    key={category.id}
                    className="flex items-center justify-between gap-3 p-3.5 sm:p-4 bg-white border border-slate-200 rounded-xl hover:border-slate-300 hover:bg-slate-50/50 transition-all group"
                  >
                    {editingId === category.id ? (
                      <div className="flex-1 flex items-center gap-2 min-w-0">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="flex-1 min-w-0 px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand bg-slate-50 text-slate-900"
                          autoFocus
                          disabled={loading}
                        />
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            type="button"
                            onClick={() => handleSaveEdit(category.id)}
                            disabled={loading || !editName.trim()}
                            className="p-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Salvar"
                          >
                            <Save className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={handleCancelEdit}
                            disabled={loading}
                            className="p-2.5 bg-slate-200 text-slate-600 rounded-lg hover:bg-slate-300 transition-colors disabled:opacity-50"
                            title="Cancelar"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0 group-hover:bg-brand-light transition-colors">
                            <Sparkles className="w-4 h-4 text-slate-500 group-hover:text-brand transition-colors" />
                          </div>
                          <div className="min-w-0">
                            <span className="font-semibold text-slate-800 truncate block">{category.name}</span>
                            {category.flavorsCount !== undefined && (
                              <span className="text-xs text-slate-400">
                                {category.flavorsCount} sabor{category.flavorsCount !== 1 ? 'es' : ''}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            type="button"
                            onClick={() => handleStartEdit(category)}
                            disabled={loading}
                            className="p-2 text-slate-400 hover:text-brand hover:bg-brand-light rounded-lg transition-colors disabled:opacity-50"
                            title="Editar"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(category.id)}
                            disabled={loading || (category.flavorsCount !== undefined && category.flavorsCount > 0)}
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
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
        </div>

        <div className="p-4 sm:p-5 border-t border-slate-200 flex items-center justify-between gap-4 bg-slate-50/60">
          <p className="text-xs text-slate-500">
            {categories.length} {categories.length === 1 ? 'categoria' : 'categorias'} no total
          </p>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 border border-slate-200 text-slate-700 rounded-xl font-semibold hover:bg-white hover:border-slate-300 hover:shadow-sm transition-all bg-white"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalGerenciarCategoriasSabores;
