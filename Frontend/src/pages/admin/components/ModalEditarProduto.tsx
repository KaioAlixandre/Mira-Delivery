import React, { useState, useEffect } from 'react';
import { Product, ProductCategory } from '../../../types';
import { X, Upload, Plus, Minus, FolderTree } from 'lucide-react';
import apiService from '../../../services/api';
import { useNotification } from '../../../components/NotificationProvider';

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
  product: Product;
  onClose: () => void;
  onUpdate: (id: number, formData: FormData) => void;
  onManageCategories?: () => void;
}

const EditProductModal: React.FC<Props> = ({ categories, product, onClose, onUpdate, onManageCategories }) => {
  const { notify } = useNotification();
  const diasSemana = [
    { value: 'D', label: 'D' },
    { value: 'S', label: 'S' },
    { value: 'T', label: 'T' },
    { value: 'Q', label: 'Q' },
    { value: 'Q2', label: 'Q' },
    { value: 'S2', label: 'S' },
    { value: 'S3', label: 'S' },
  ];

  const [form, setForm] = useState({
    name: product.name,
    price: product.price.toString(),
    categoryId: product.category?.id?.toString() || '',
    isActive: product.isActive,
    isFeatured: product.isFeatured || false,
    receiveComplements: product.receiveComplements || false,
    receiveFlavors: product.receiveFlavors || false,
    receiveAdditionals: product.receiveAdditionals || false,
    description: product.description || '',
    images: [] as File[],
    quantidadeComplementos: product.quantidadeComplementos !== undefined && product.quantidadeComplementos !== null ? String(product.quantidadeComplementos) : '',
    activeDays: product.activeDays || 'D,S,T,Q,Q2,S2,S3'
  });
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [flavorCategories, setFlavorCategories] = useState<FlavorCategory[]>([]);
  const [selectedFlavorCategories, setSelectedFlavorCategories] = useState<SelectedFlavorCategory[]>([]);
  const [additionalCategories, setAdditionalCategories] = useState<FlavorCategory[]>([]);
  const [selectedAdditionalCategories, setSelectedAdditionalCategories] = useState<SelectedFlavorCategory[]>([]);

  // Carregar imagens existentes do produto
  useEffect(() => {
    if (product.images && product.images.length > 0) {
      // Usar a URL Cloudinary diretamente
      const imageUrls = product.images.map(img => img.url);
      setExistingImages(imageUrls);
    }
  }, [product]);

  // Carregar categorias de sabores e inicializar categorias selecionadas
  useEffect(() => {
    const loadFlavorCategories = async () => {
      try {
        const data = await apiService.getFlavorCategories();
        setFlavorCategories(data);
        
        // Inicializar categorias de sabores selecionadas do produto
        if (product.flavorCategories && product.flavorCategories.length > 0) {
          setSelectedFlavorCategories(product.flavorCategories.map(fc => ({
            categoryId: fc.categoryId,
            categoryName: fc.categoryName,
            quantity: fc.quantity
          })));
        }
      } catch (error) {
        console.error('Erro ao carregar categorias de sabores:', error);
      }
    };
    loadFlavorCategories();
  }, [product]);

  // Carregar categorias de adicionais e inicializar categorias selecionadas
  useEffect(() => {
    const loadAdditionalCategories = async () => {
      try {
        const data = await apiService.getAdditionalCategories();
        setAdditionalCategories(data);
        
        // Inicializar categorias de adicionais selecionadas do produto
        if ((product as any).additionalCategories && (product as any).additionalCategories.length > 0) {
          setSelectedAdditionalCategories((product as any).additionalCategories.map((ac: any) => ({
            categoryId: ac.categoryId,
            categoryName: ac.categoryName,
            quantity: ac.quantity
          })));
        }
      } catch (error) {
        console.error('Erro ao carregar categorias de adicionais:', error);
      }
    };
    loadAdditionalCategories();
  }, [product]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === 'file' && e.target instanceof HTMLInputElement) {
      const files = Array.from(e.target.files || []);
      
      // Limitar a 5 imagens (incluindo as existentes)
      const totalImages = existingImages.length + form.images.length + files.length;
      if (totalImages > 5) {
        notify('Você pode ter no máximo 5 imagens', 'warning');
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
      // Se desmarcar receiveAdditionals, limpa categorias de adicionais selecionadas
      if (name === 'receiveAdditionals' && !e.target.checked) {
        setSelectedAdditionalCategories([]);
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

  // Adicionar categoria de adicional selecionada
  const handleAddAdditionalCategory = (categoryId: number) => {
    const category = additionalCategories.find(c => c.id === categoryId);
    if (category && !selectedAdditionalCategories.find(sac => sac.categoryId === categoryId)) {
      setSelectedAdditionalCategories([...selectedAdditionalCategories, {
        categoryId: category.id,
        categoryName: category.name,
        quantity: 1
      }]);
    }
  };

  // Remover categoria de adicional selecionada
  const handleRemoveAdditionalCategory = (categoryId: number) => {
    setSelectedAdditionalCategories(selectedAdditionalCategories.filter(sac => sac.categoryId !== categoryId));
  };

  // Atualizar quantidade de uma categoria de adicional
  const handleUpdateAdditionalCategoryQuantity = (categoryId: number, quantity: number) => {
    setSelectedAdditionalCategories(selectedAdditionalCategories.map(sac => 
      sac.categoryId === categoryId ? { ...sac, quantity: Math.max(1, quantity) } : sac
    ));
  };

  const removeNewImage = (index: number) => {
    setForm({
      ...form,
      images: form.images.filter((_, i) => i !== index)
    });
    setImagePreviews(imagePreviews.filter((_, i) => i !== index));
  };

  const removeExistingImage = (index: number) => {
    setExistingImages(existingImages.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('nome', form.name);
    formData.append('preco', form.price);
    formData.append('categoriaId', form.categoryId);
    formData.append('descricao', form.description);
    formData.append('ativo', String(form.isActive));
    formData.append('isFeatured', String(form.isFeatured));
    formData.append('receiveComplements', String(form.receiveComplements));
    formData.append('receiveAdditionals', String(form.receiveAdditionals));
    formData.append('diasAtivos', form.activeDays);
    if (form.receiveComplements) {
      formData.append('quantidadeComplementos', form.quantidadeComplementos || '0');
    }
    formData.append('receiveFlavors', String(form.receiveFlavors));
    if (form.receiveFlavors) {
      formData.append('flavorCategories', JSON.stringify(selectedFlavorCategories || []));
    }
    if (form.receiveAdditionals) {
      const additionalCategoriesJson = JSON.stringify(selectedAdditionalCategories || []);
      console.log('🔍 [FRONTEND] Enviando additionalCategories:', selectedAdditionalCategories);
      console.log('🔍 [FRONTEND] JSON stringificado:', additionalCategoriesJson);
      formData.append('additionalCategories', additionalCategoriesJson);
    }
    // Adicionar todas as novas imagens
    form.images.forEach((image) => {
      formData.append('images', image);
    });
    onUpdate(product.id, formData);
  };

  const totalImages = existingImages.length + form.images.length;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-5xl shadow-2xl my-8 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center rounded-t-2xl shrink-0">
          <div>
            <h3 className="text-xl font-bold text-slate-800">Editar Produto</h3>
            <p className="text-xs text-slate-500 mt-0.5">Atualize as informações do produto</p>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg p-1.5 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form className="flex flex-col flex-1 min-h-0" onSubmit={handleSubmit}>
          <div className="overflow-y-auto flex-1 p-6">
            <div className="grid lg:grid-cols-5 gap-6">
              {/* ===== COLUNA ESQUERDA - Dados do Produto (3/5) ===== */}
              <div className="lg:col-span-3 space-y-4">
                <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b border-slate-200 pb-2">Dados do Produto</h4>

                <div className="grid sm:grid-cols-2 gap-4">
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
                      className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand focus:border-brand transition-all text-sm"
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
                      className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand focus:border-brand transition-all text-sm"
                    />
                  </div>
                </div>

                {/* Categoria */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-sm font-semibold text-slate-700">
                      Categoria *
                    </label>
                    {onManageCategories && (
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onManageCategories();
                        }}
                        className="text-brand hover:text-brand text-xs font-semibold flex items-center gap-1"
                      >
                        <FolderTree className="w-3.5 h-3.5" />
                        Gerenciar Categorias
                      </button>
                    )}
                  </div>
                  <select 
                    name="categoryId" 
                    value={form.categoryId} 
                    onChange={handleChange} 
                    required 
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand focus:border-brand transition-all bg-white text-sm"
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
                    rows={3}
                    maxLength={70}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand focus:border-brand transition-all resize-none text-sm"
                  />
                </div>

                {/* Imagens */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Imagens do Produto (até 5)
                    <span className="text-xs font-normal text-slate-500 ml-2">
                      {totalImages}/5
                    </span>
                  </label>
                  <div className="flex flex-col gap-3">
                    {totalImages < 5 && (
                      <label className="flex items-center justify-center gap-2 px-4 py-5 border-2 border-dashed border-slate-300 rounded-lg hover:border-brand hover:bg-red-50 transition-all cursor-pointer">
                        <Upload className="w-5 h-5 text-slate-400" />
                        <span className="text-xs text-slate-600">
                          Clique para adicionar imagens ({5 - totalImages} restantes)
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
                    
                    {/* Grid de previews - Imagens existentes e novas */}
                    {(existingImages.length > 0 || imagePreviews.length > 0) && (
                      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                        {/* Imagens existentes */}
                        {existingImages.map((imageUrl, index) => (
                          <div key={`existing-${index}`} className="relative group">
                            <div className="relative w-full h-20 border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
                              <img 
                                src={imageUrl} 
                                alt={`Imagem ${index + 1}`} 
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all" />
                              <button
                                type="button"
                                onClick={() => removeExistingImage(index)}
                                className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        ))}
                        
                        {/* Novas imagens */}
                        {imagePreviews.map((preview, index) => (
                          <div key={`new-${index}`} className="relative group">
                            <div className="relative w-full h-20 border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
                              <img 
                                src={preview} 
                                alt={`Nova ${index + 1}`} 
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all" />
                              <button
                                type="button"
                                onClick={() => removeNewImage(index)}
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
              </div>

              {/* ===== COLUNA DIREITA - Configurações (2/5) ===== */}
              <div className="lg:col-span-2 space-y-4">
                <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b border-slate-200 pb-2">Configurações</h4>

                {/* Dias Ativos */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Dias disponível
                  </label>
                  <div className="grid grid-cols-7 gap-1.5">
                    {diasSemana.map((dia) => {
                      const isSelected = form.activeDays.split(',').includes(dia.value);
                      return (
                        <button
                          key={dia.value}
                          type="button"
                          onClick={() => {
                            const days = form.activeDays ? form.activeDays.split(',').filter(Boolean) : [];
                            let newDays: string[];
                            if (days.includes(dia.value)) {
                              newDays = days.filter(d => d !== dia.value);
                            } else {
                              newDays = [...days, dia.value];
                            }
                            setForm({ ...form, activeDays: newDays.join(',') });
                          }}
                          className={`p-2 text-xs font-semibold rounded-lg border transition-colors ${
                            isSelected
                              ? 'bg-red-100 border-brand text-brand'
                              : 'bg-white border-slate-300 text-slate-500 hover:bg-slate-50'
                          }`}
                        >
                          {dia.label}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Vazio = todos os dias.
                  </p>
                </div>

                {/* Status Ativo, Destaque e Complementos */}
                <div className="space-y-2">
                  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                    <input 
                      type="checkbox" 
                      id="edit-isActive"
                      name="isActive" 
                      checked={form.isActive} 
                      onChange={handleChange}
                      className="w-4 h-4 text-brand border-slate-300 rounded focus:ring-2 focus:ring-brand"
                    />
                    <label htmlFor="edit-isActive" className="text-sm font-medium text-slate-700 cursor-pointer">
                      Produto ativo
                    </label>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-lg">
                    <input 
                      type="checkbox" 
                      id="edit-isFeatured"
                      name="isFeatured" 
                      checked={form.isFeatured} 
                      onChange={handleChange}
                      className="w-4 h-4 text-amber-600 border-amber-300 rounded focus:ring-2 focus:ring-amber-500"
                    />
                    <label htmlFor="edit-isFeatured" className="text-sm font-medium text-slate-700 cursor-pointer">
                      Produto em destaque
                    </label>
                  </div>
                  <div className="flex flex-col gap-2 p-3 bg-emerald-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="edit-receiveAdditionals"
                        name="receiveAdditionals"
                        checked={form.receiveAdditionals}
                        onChange={handleChange}
                        className="w-4 h-4 text-emerald-600 border-emerald-300 rounded focus:ring-2 focus:ring-emerald-500"
                      />
                      <label htmlFor="edit-receiveAdditionals" className="text-sm font-medium text-slate-700 cursor-pointer">
                        Aceita adicionais
                      </label>
                    </div>
                    {form.receiveAdditionals && (
                      <div className="mt-2 space-y-3">
                        {/* Selecionar categoria de adicional */}
                        <div>
                          <label className="block text-xs font-medium text-slate-700 mb-1.5">Categoria de adicional:</label>
                          <select
                            onChange={(e) => {
                              const categoryId = parseInt(e.target.value);
                              if (categoryId) {
                                handleAddAdditionalCategory(categoryId);
                                e.target.value = '';
                              }
                            }}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                            defaultValue=""
                          >
                            <option value="">Selecione...</option>
                            {additionalCategories
                              .filter(ac => !selectedAdditionalCategories.find(sac => sac.categoryId === ac.id))
                              .map(cat => (
                                <option key={cat.id} value={cat.id}>{cat.name}</option>
                              ))}
                          </select>
                        </div>
                        
                        {/* Lista de categorias selecionadas */}
                        {selectedAdditionalCategories.length > 0 && (
                          <div className="space-y-2">
                            <label className="block text-xs font-medium text-slate-700">Selecionadas:</label>
                            {selectedAdditionalCategories.map((sac) => (
                              <div key={sac.categoryId} className="flex items-center gap-2 p-2 bg-white border border-emerald-200 rounded-lg">
                                <span className="flex-1 text-xs font-medium text-slate-700 truncate">{sac.categoryName}</span>
                                <div className="flex items-center gap-1 shrink-0">
                                  <span className="text-xs text-slate-500">Qtd. máx:</span>
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateAdditionalCategoryQuantity(sac.categoryId, sac.quantity - 1)}
                                    className="w-6 h-6 flex items-center justify-center border border-slate-300 rounded hover:bg-slate-100"
                                  >
                                    <Minus className="w-3 h-3" />
                                  </button>
                                  <input
                                    type="number"
                                    min={1}
                                    value={sac.quantity}
                                    onChange={(e) => handleUpdateAdditionalCategoryQuantity(sac.categoryId, parseInt(e.target.value) || 1)}
                                    className="w-10 px-1 py-1 border border-slate-300 rounded text-xs text-center"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateAdditionalCategoryQuantity(sac.categoryId, sac.quantity + 1)}
                                    className="w-6 h-6 flex items-center justify-center border border-slate-300 rounded hover:bg-slate-100"
                                  >
                                    <Plus className="w-3 h-3" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveAdditionalCategory(sac.categoryId)}
                                    className="ml-1 p-1 text-red-600 hover:bg-red-50 rounded"
                                    title="Remover categoria"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-2 p-3 bg-purple-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <input 
                        type="checkbox" 
                        id="edit-receiveComplements"
                        name="receiveComplements" 
                        checked={form.receiveComplements} 
                        onChange={handleChange}
                        className="w-4 h-4 text-purple-600 border-purple-300 rounded focus:ring-2 focus:ring-purple-500"
                      />
                      <label htmlFor="edit-receiveComplements" className="text-sm font-medium text-slate-700 cursor-pointer">
                        Aceita complementos
                      </label>
                    </div>
                    {form.receiveComplements && (
                      <div className="flex items-center gap-2 mt-1">
                        <label htmlFor="edit-quantidadeComplementos" className="text-xs font-medium text-slate-700">Qtd. permitida:</label>
                        <input
                          type="number"
                          id="edit-quantidadeComplementos"
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
                        id="edit-receiveFlavors"
                        name="receiveFlavors" 
                        checked={form.receiveFlavors} 
                        onChange={handleChange}
                        className="w-4 h-4 text-pink-600 border-pink-300 rounded focus:ring-2 focus:ring-pink-500"
                      />
                      <label htmlFor="edit-receiveFlavors" className="text-sm font-medium text-slate-700 cursor-pointer">
                        Aceita sabores
                      </label>
                    </div>
                    {form.receiveFlavors && (
                      <div className="mt-2 space-y-3">
                        {/* Selecionar categoria de sabor */}
                        <div>
                          <label className="block text-xs font-medium text-slate-700 mb-1.5">Categoria de sabor:</label>
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
                            <option value="">Selecione...</option>
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
                            <label className="block text-xs font-medium text-slate-700">Selecionadas:</label>
                            {selectedFlavorCategories.map((sfc) => (
                              <div key={sfc.categoryId} className="flex items-center gap-2 p-2 bg-white border border-pink-200 rounded-lg">
                                <span className="flex-1 text-xs font-medium text-slate-700 truncate">{sfc.categoryName}</span>
                                <div className="flex items-center gap-1 shrink-0">
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
                                    className="w-10 px-1 py-1 border border-slate-300 rounded text-xs text-center"
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
                                    className="ml-1 p-1 text-red-600 hover:bg-red-50 rounded"
                                    title="Remover categoria"
                                  >
                                    <X className="w-3.5 h-3.5" />
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
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50 rounded-b-2xl shrink-0">
            <button 
              type="button" 
              onClick={onClose} 
              className="flex-1 px-5 py-2.5 rounded-lg border border-slate-300 text-slate-700 font-semibold hover:bg-slate-100 transition-colors text-sm"
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              className="flex-1 px-5 py-2.5 rounded-lg bg-brand text-white font-semibold hover:bg-brand transition-colors shadow-lg text-sm"
            >
              Salvar Alterações
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditProductModal;