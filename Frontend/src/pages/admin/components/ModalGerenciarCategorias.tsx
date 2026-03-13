import React, { useState } from 'react';
import { X, Plus, Pencil, Trash2, Save, FolderOpen, AlertCircle, GripVertical } from 'lucide-react';
import { ProductCategory } from '../../../types';
import { apiService } from '../../../services/api';

interface Props {
  categories: ProductCategory[];
  onClose: () => void;
  onCategoriesChange: () => void;
}

const ModalGerenciarCategorias: React.FC<Props> = ({ categories: initialCategories, onClose, onCategoriesChange }) => {
  const [categories, setCategories] = useState<ProductCategory[]>(initialCategories.sort((a, b) => (a.ordem || 0) - (b.ordem || 0)));
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleStartEdit = (category: ProductCategory) => {
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
      await apiService.updateCategory(id, editName.trim());
      setCategories(categories.map(cat =>
        cat.id === id ? { ...cat, name: editName.trim() } : cat
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
    if (!window.confirm('Tem certeza que deseja excluir esta categoria? Produtos associados a ela não serão excluídos, mas ficarão sem categoria.')) {
      return;
    }

    try {
      setLoading(true);
      setError('');
      await apiService.deleteCategory(id);
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
      const newCategory = await apiService.addCategory(newCategoryName.trim());
      setCategories([...categories, newCategory]);
      setNewCategoryName('');
      onCategoriesChange();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao adicionar categoria');
    } finally {
      setLoading(false);
    }
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.currentTarget.outerHTML);
    e.currentTarget.style.opacity = '0.5';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = async (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const newCategories = [...categories];
    const draggedItem = newCategories[draggedIndex];
    
    // Remove o item da posição original
    newCategories.splice(draggedIndex, 1);
    
    // Insere o item na nova posição
    newCategories.splice(dropIndex, 0, draggedItem);
    
    // Atualiza o estado local imediatamente para feedback visual
    setCategories(newCategories);
    setDraggedIndex(null);
    setDragOverIndex(null);

    // Salva a nova ordem no backend
    try {
      setLoading(true);
      setError('');
      const categoryIds = newCategories.map(cat => cat.id);
      await apiService.reorderCategories(categoryIds);
      onCategoriesChange();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao reordenar categorias');
      // Reverte para a ordem original em caso de erro
      setCategories(categories);
    } finally {
      setLoading(false);
    }
  };

  const handleDragEnd = (e: React.DragEvent) => {
    e.currentTarget.style.opacity = '1';
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 p-5 sm:p-6 border-b border-slate-200 bg-gradient-to-br from-slate-50 via-white to-slate-50/80">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 bg-brand-light rounded-xl flex-shrink-0">
              <FolderOpen className="w-5 h-5 text-brand" />
            </div>
            <div className="min-w-0">
              <h3 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">Categorias de Produtos</h3>
              <p className="text-xs text-slate-500 mt-0.5">Crie, edite, remova e reordene categorias arrastando-as</p>
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

          {/* Formulário nova categoria */}
          <form onSubmit={handleAddCategory} className="mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">Nova categoria</label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Ex: Bebidas, Lanches, Sobremesas..."
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

          {/* Lista de categorias */}
          <div>
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
              {categories.length} {categories.length === 1 ? 'categoria' : 'categorias'}
            </h4>
            <div className="space-y-2">
              {categories.length === 0 ? (
                <div className="text-center py-12 px-4 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50">
                  <FolderOpen className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                  <p className="font-medium text-slate-500">Nenhuma categoria cadastrada</p>
                  <p className="text-sm text-slate-400 mt-1">Use o campo acima para criar a primeira</p>
                </div>
              ) : (
                categories.map((category, index) => (
                  <div
                    key={category.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, index)}
                    onDragEnd={handleDragEnd}
                    className={`flex items-center justify-between gap-3 p-3.5 sm:p-4 bg-white border rounded-xl transition-all group cursor-move ${
                      draggedIndex === index
                        ? 'opacity-50 border-brand'
                        : dragOverIndex === index
                        ? 'border-brand bg-brand-light scale-105'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                    }`}
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
                          <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 text-slate-400 hover:text-slate-600 transition-colors cursor-grab active:cursor-grabbing">
                            <GripVertical className="w-5 h-5" />
                          </div>
                          <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0 group-hover:bg-brand-light transition-colors">
                            <FolderOpen className="w-4 h-4 text-slate-500 group-hover:text-brand transition-colors" />
                          </div>
                          <span className="font-semibold text-slate-800 truncate">
                            {category.name}
                          </span>
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
                            disabled={loading}
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors disabled:opacity-50"
                            title="Excluir"
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

        {/* Footer */}
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

export default ModalGerenciarCategorias;

