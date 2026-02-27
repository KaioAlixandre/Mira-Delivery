import React, { useState, useEffect } from 'react';
import { X, Plus, Pencil, Trash2, Save } from 'lucide-react';
import apiService from '../../../services/api';

interface AdditionalCategory {
  id: number;
  name: string;
  additionalsCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

interface Props {
  categories: AdditionalCategory[];
  onClose: () => void;
  onCategoriesChange: () => void;
}

const ModalGerenciarCategoriasAdicionais: React.FC<Props> = ({ categories: initialCategories, onClose, onCategoriesChange }) => {
  const [categories, setCategories] = useState<AdditionalCategory[]>(initialCategories);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setCategories(initialCategories);
  }, [initialCategories]);

  const handleStartEdit = (category: AdditionalCategory) => {
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
      const updatedCategory = await apiService.updateAdditionalCategory(id, editName.trim());
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
    const hasAdditionals = category?.additionalsCount && category.additionalsCount > 0;

    if (hasAdditionals) {
      alert(`Não é possível excluir esta categoria. Ela possui ${category?.additionalsCount} adicional(is) associado(s).`);
      return;
    }

    if (!window.confirm('Tem certeza que deseja excluir esta categoria?')) {
      return;
    }

    try {
      setLoading(true);
      setError('');
      await apiService.deleteAdditionalCategory(id);
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
      const newCategory = await apiService.createAdditionalCategory(newCategoryName.trim());
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
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200">
          <h3 className="text-lg sm:text-xl font-bold text-gray-800">Gerenciar Categorias de Adicionais</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Fechar"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleAddCategory} className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Nome da nova categoria"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading || !newCategoryName.trim()}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg font-semibold flex items-center justify-center gap-2 hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="w-4 h-4" />
                <span>Adicionar</span>
              </button>
            </div>
          </form>

          <div className="space-y-2">
            {categories.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>Nenhuma categoria cadastrada</p>
                <p className="text-sm mt-2">Adicione uma nova categoria acima</p>
              </div>
            ) : (
              categories.map((category) => (
                <div
                  key={category.id}
                  className="flex items-center justify-between p-3 sm:p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
                >
                  {editingId === category.id ? (
                    <div className="flex-1 flex items-center gap-2">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                        autoFocus
                        disabled={loading}
                      />
                      <button
                        onClick={() => handleSaveEdit(category.id)}
                        disabled={loading || !editName.trim()}
                        className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Salvar"
                      >
                        <Save className="w-4 h-4" />
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        disabled={loading}
                        className="p-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50"
                        title="Cancelar"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex-1">
                        <span className="font-medium text-gray-800 text-sm sm:text-base">
                          {category.name}
                        </span>
                        {category.additionalsCount !== undefined && (
                          <span className="ml-2 text-xs text-gray-500">
                            ({category.additionalsCount} adicional{category.additionalsCount !== 1 ? 'es' : ''})
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleStartEdit(category)}
                          disabled={loading}
                          className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors disabled:opacity-50"
                          title="Editar"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(category.id)}
                          disabled={loading || (category.additionalsCount !== undefined && category.additionalsCount > 0)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title={category.additionalsCount && category.additionalsCount > 0 ? 'Não é possível excluir categoria com adicionais' : 'Excluir'}
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

        <div className="p-4 sm:p-6 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalGerenciarCategoriasAdicionais;
