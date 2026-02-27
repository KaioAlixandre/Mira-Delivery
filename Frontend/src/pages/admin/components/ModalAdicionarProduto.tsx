import React, { useState, useEffect } from 'react';
import { ProductCategory } from '../../../types';
import { X, Upload, Plus, Minus } from 'lucide-react';
import apiService from '../../../services/api';

interface FlavorCategory {
  id: number;
  name: string;
}

interface SelectedFlavorCategory {
  categoryId: number;
  categoryName: string;
  quantity: number;
}

interface Props {
  categories: ProductCategory[];
  onClose: () => void;
  onAdd: (formData: FormData) => void;
}

const AddProductModal: React.FC<Props> = ({ categories, onClose, onAdd }) => {
  const [form, setForm] = useState({
    name: '',
    price: '',
    categoryId: '',
    isActive: true,
    isFeatured: false,
    receiveComplements: false,
    quantidadeComplementos: '',
    receiveFlavors: false,
    receiveAdditionals: false,
    description: '',
    images: [] as File[]
  });
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [flavorCategories, setFlavorCategories] = useState<FlavorCategory[]>([]);
  const [selectedFlavorCategories, setSelectedFlavorCategories] = useState<SelectedFlavorCategory[]>([]);

  // Carregar categorias de sabores
  useEffect(() => {
    const loadFlavorCategories = async () => {
      try {
        const data = await apiService.getFlavorCategories();
        setFlavorCategories(data);
      } catch (error) {
        console.error('Erro ao carregar categorias de sabores:', error);
      }
    };
    loadFlavorCategories();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === 'file' && e.target instanceof HTMLInputElement) {
      const files = Array.from(e.target.files || []);
      
      // Limitar a 5 imagens
      if (form.images.length + files.length > 5) {
        alert('Você pode adicionar no máximo 5 imagens');
        return;
      }
      
      const newImages = [...form.images, ...files];
      setForm({ ...form, images: newImages });
      
      // Criar previews das novas imagens
      files.forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setImagePreviews(prev => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(file);
      });
    } else if (type === 'checkbox' && e.target instanceof HTMLInputElement) {
      setForm({ ...form, [name]: e.target.checked });
      // Se desmarcar receiveComplements, limpa quantidadeComplementos
      if (name === 'receiveComplements' && !e.target.checked) {
        setForm(f => ({ ...f, quantidadeComplementos: '' }));
      }
      // Se desmarcar receiveFlavors, limpa categorias de sabores selecionadas
      if (name === 'receiveFlavors' && !e.target.checked) {
        setSelectedFlavorCategories([]);
      }
    } else {
      setForm({ ...form, [name]: value });
    }
  };

  // Adicionar categoria de sabor selecionada
  const handleAddFlavorCategory = (categoryId: number) => {
    const category = flavorCategories.find(c => c.id === categoryId);
    if (category && !selectedFlavorCategories.find(sfc => sfc.categoryId === categoryId)) {
      setSelectedFlavorCategories([...selectedFlavorCategories, {
        categoryId: category.id,
        categoryName: category.name,
        quantity: 1
      }]);
    }
  };

  // Remover categoria de sabor selecionada
  const handleRemoveFlavorCategory = (categoryId: number) => {
    setSelectedFlavorCategories(selectedFlavorCategories.filter(sfc => sfc.categoryId !== categoryId));
  };

  // Atualizar quantidade de uma categoria de sabor
  const handleUpdateFlavorCategoryQuantity = (categoryId: number, quantity: number) => {
    setSelectedFlavorCategories(selectedFlavorCategories.map(sfc => 
      sfc.categoryId === categoryId ? { ...sfc, quantity: Math.max(1, quantity) } : sfc
    ));
  };

  const removeImage = (index: number) => {
    setForm({
      ...form,
      images: form.images.filter((_, i) => i !== index)
    });
    setImagePreviews(imagePreviews.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('nome', form.name);
    formData.append('preco', form.price);
    formData.append('categoriaId', form.categoryId);
    formData.append('descricao', form.description);
    formData.append('isActive', String(form.isActive));
    formData.append('isFeatured', String(form.isFeatured));
    formData.append('receiveComplements', String(form.receiveComplements));
    formData.append('receiveAdditionals', String(form.receiveAdditionals));
    if (form.receiveComplements) {
      formData.append('quantidadeComplementos', form.quantidadeComplementos || '0');
    }
    formData.append('receiveFlavors', String(form.receiveFlavors));
    if (form.receiveFlavors && selectedFlavorCategories.length > 0) {
      formData.append('flavorCategories', JSON.stringify(selectedFlavorCategories));
    }
    // Adicionar todas as imagens
    form.images.forEach((image) => {
      formData.append('images', image);
    });
    onAdd(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl w-full max-w-3xl shadow-2xl my-8">
        {/* Header */}
        <div className="bg-white border-b border-slate-200 px-3 sm:px-4 py-2 sm:py-3 flex justify-between items-center rounded-t-xl">
          <h3 className="text-lg sm:text-xl font-bold text-slate-800">Adicionar Novo Produto</h3>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>

        {/* Form */}
        <form className="p-3 sm:p-4 space-y-2 sm:space-y-3" onSubmit={handleSubmit}>
          <div className="grid md:grid-cols-2 gap-4">
            {/* Nome */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Nome do Produto *
              </label>
              <input 
                name="name" 
                value={form.name} 
                onChange={handleChange} 
                placeholder="Ex: Açaí 500ml" 
                required 
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm"
              />
            </div>

            {/* Preço */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Preço (R$) *
              </label>
              <input 
                name="price" 
                value={form.price} 
                onChange={handleChange} 
                placeholder="0.00" 
                required 
                type="number" 
                step="0.01" 
                min="0"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm"
              />
            </div>
          </div>

          {/* Categoria */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              Categoria *
            </label>
            <select 
              name="categoryId" 
              value={form.categoryId} 
              onChange={handleChange} 
              required 
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-white text-sm"
            >
              <option value="">Selecione uma categoria</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

          {/* Descrição */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              Descrição
              <span className="text-xs font-normal text-slate-500 ml-2">
                {form.description.length}/70 caracteres
              </span>
            </label>
            <textarea 
              name="description" 
              value={form.description} 
              onChange={handleChange} 
              placeholder="Descreva o produto..." 
              rows={2}
              maxLength={70}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all resize-none text-sm"
            />
          </div>

          {/* Imagens */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              Imagens do Produto (até 5)
              <span className="text-xs font-normal text-slate-500 ml-2">
                {form.images.length}/5
              </span>
            </label>
            <div className="flex flex-col gap-3">
              {form.images.length < 5 && (
                <label className="flex items-center justify-center gap-2 px-4 py-4 border-2 border-dashed border-slate-300 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition-all cursor-pointer">
                  <Upload className="w-5 h-5 text-slate-400" />
                  <span className="text-xs text-slate-600">
                    Clique para adicionar imagens ({5 - form.images.length} restantes)
                  </span>
                  <input 
                    type="file" 
                    name="images" 
                    accept="image/*" 
                    multiple
                    onChange={handleChange} 
                    className="hidden"
                  />
                </label>
              )}
              
              {/* Grid de previews */}
              {imagePreviews.length > 0 && (
                <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
                  {imagePreviews.map((preview, index) => (
                    <div key={index} className="relative group">
                      <div className="relative w-full h-20 border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
                        <img 
                          src={preview} 
                          alt={`Preview ${index + 1}`} 
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all" />
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Status Ativo, Destaque e Complementos */}
          <div className="space-y-2">
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
              <input 
                type="checkbox" 
                id="isActive"
                name="isActive" 
                checked={form.isActive} 
                onChange={handleChange}
                className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-2 focus:ring-indigo-500"
              />
              <label htmlFor="isActive" className="text-sm font-medium text-slate-700 cursor-pointer">
                Produto ativo e disponível para venda
              </label>
            </div>
            <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-lg">
              <input 
                type="checkbox" 
                id="isFeatured"
                name="isFeatured" 
                checked={form.isFeatured} 
                onChange={handleChange}
                className="w-4 h-4 text-amber-600 border-amber-300 rounded focus:ring-2 focus:ring-amber-500"
              />
              <label htmlFor="isFeatured" className="text-sm font-medium text-slate-700 cursor-pointer">
                Produto em destaque (aparecerá primeiro)
              </label>
            </div>
            <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-lg">
              <input
                type="checkbox"
                id="receiveAdditionals"
                name="receiveAdditionals"
                checked={form.receiveAdditionals}
                onChange={handleChange}
                className="w-4 h-4 text-emerald-600 border-emerald-300 rounded focus:ring-2 focus:ring-emerald-500"
              />
              <label htmlFor="receiveAdditionals" className="text-sm font-medium text-slate-700 cursor-pointer">
                Produto aceita adicionais
              </label>
            </div>
            <div className="flex flex-col gap-2 p-3 bg-purple-50 rounded-lg">
              <div className="flex items-center gap-3">
                <input 
                  type="checkbox" 
                  id="receiveComplements"
                  name="receiveComplements" 
                  checked={form.receiveComplements} 
                  onChange={handleChange}
                  className="w-4 h-4 text-purple-600 border-purple-300 rounded focus:ring-2 focus:ring-purple-500"
                />
                <label htmlFor="receiveComplements" className="text-sm font-medium text-slate-700 cursor-pointer">
                  Produto aceita complementos
                </label>
              </div>
              {form.receiveComplements && (
                <div className="flex items-center gap-2 mt-2">
                  <label htmlFor="quantidadeComplementos" className="text-xs font-medium text-slate-700">Quantidade de complementos permitidos:</label>
                  <input
                    type="number"
                    id="quantidadeComplementos"
                    name="quantidadeComplementos"
                    min={1}
                    value={form.quantidadeComplementos}
                    onChange={handleChange}
                    className="w-16 px-2 py-1 border border-slate-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm"
                    placeholder="Ex: 3"
                    title="Informe um valor maior ou igual a 1"
                  />
                </div>
              )}
            </div>
            <div className="flex flex-col gap-2 p-3 bg-pink-50 rounded-lg">
              <div className="flex items-center gap-3">
                <input 
                  type="checkbox" 
                  id="receiveFlavors"
                  name="receiveFlavors" 
                  checked={form.receiveFlavors} 
                  onChange={handleChange}
                  className="w-4 h-4 text-pink-600 border-pink-300 rounded focus:ring-2 focus:ring-pink-500"
                />
                <label htmlFor="receiveFlavors" className="text-sm font-medium text-slate-700 cursor-pointer">
                  Produto aceita sabores
                </label>
              </div>
              {form.receiveFlavors && (
                <div className="mt-2 space-y-3">
                  {/* Selecionar categoria de sabor */}
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-2">Selecionar categoria de sabor:</label>
                    <select
                      onChange={(e) => {
                        const categoryId = parseInt(e.target.value);
                        if (categoryId) {
                          handleAddFlavorCategory(categoryId);
                          e.target.value = '';
                        }
                      }}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 text-sm"
                      defaultValue=""
                    >
                      <option value="">Selecione uma categoria...</option>
                      {flavorCategories
                        .filter(fc => !selectedFlavorCategories.find(sfc => sfc.categoryId === fc.id))
                        .map(cat => (
                          <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                    </select>
                  </div>
                  
                  {/* Lista de categorias selecionadas */}
                  {selectedFlavorCategories.length > 0 && (
                    <div className="space-y-2">
                      <label className="block text-xs font-medium text-slate-700">Categorias selecionadas:</label>
                      {selectedFlavorCategories.map((sfc) => (
                        <div key={sfc.categoryId} className="flex items-center gap-2 p-2 bg-white border border-pink-200 rounded-lg">
                          <span className="flex-1 text-sm font-medium text-slate-700">{sfc.categoryName}</span>
                          <div className="flex items-center gap-2">
                            <label className="text-xs text-slate-600">Quantidade:</label>
                            <button
                              type="button"
                              onClick={() => handleUpdateFlavorCategoryQuantity(sfc.categoryId, sfc.quantity - 1)}
                              className="w-6 h-6 flex items-center justify-center border border-slate-300 rounded hover:bg-slate-100"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <input
                              type="number"
                              min={1}
                              value={sfc.quantity}
                              onChange={(e) => handleUpdateFlavorCategoryQuantity(sfc.categoryId, parseInt(e.target.value) || 1)}
                              className="w-12 px-2 py-1 border border-slate-300 rounded text-sm text-center"
                            />
                            <button
                              type="button"
                              onClick={() => handleUpdateFlavorCategoryQuantity(sfc.categoryId, sfc.quantity + 1)}
                              className="w-6 h-6 flex items-center justify-center border border-slate-300 rounded hover:bg-slate-100"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveFlavorCategory(sfc.categoryId)}
                              className="ml-2 p-1 text-red-600 hover:bg-red-50 rounded"
                              title="Remover categoria"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-3 border-t border-slate-200">
            <button 
              type="button" 
              onClick={onClose} 
              className="flex-1 px-5 py-2.5 rounded-lg border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50 transition-colors text-sm"
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              className="flex-1 px-5 py-2.5 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-500/30 text-sm"
            >
              Adicionar Produto
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddProductModal;