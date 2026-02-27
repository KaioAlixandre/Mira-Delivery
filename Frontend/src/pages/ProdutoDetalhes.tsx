import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ShoppingCart, Plus, Minus, Check, Search, X, Clock } from 'lucide-react';
import { useCart } from '../contexts/CartContext';
import apiService from '../services/api';
import { Product, Complement, Flavor, Additional } from '../types';
import Loading from '../components/Loading';
import { checkStoreStatus, StoreConfig } from '../utils/storeUtils';

import { useNotification } from '../components/NotificationProvider';

const ProdutoDetalhes: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const { notify } = useNotification();

  const formatBRL = (value: any) => {
    const n = Number(value);
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number.isFinite(n) ? n : 0);
  };
  
  const [product, setProduct] = useState<Product | null>(null);
  const [complements, setComplements] = useState<Complement[]>([]);
  const [flavors, setFlavors] = useState<Flavor[]>([]);
  const [additionals, setAdditionals] = useState<Additional[]>([]);
  const [selectedImage, setSelectedImage] = useState<string>('');
  const [quantity, setQuantity] = useState(1);
  const [selectedComplements, setSelectedComplements] = useState<number[]>([]);
  const [selectedAdditionals, setSelectedAdditionals] = useState<Record<number, number>>({});
  const [selectedFlavors, setSelectedFlavors] = useState<{ [categoryId: number]: number[] }>({});
  const lastNotifyRef = useRef<{ msg: string; ts: number }>({ msg: '', ts: 0 });
  const flavorsSectionRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [addingToCart, setAddingToCart] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [flavorSearchTerm, setFlavorSearchTerm] = useState('');
  const [selectedFlavorCategory, setSelectedFlavorCategory] = useState<string>('all');
  const [storeConfig, setStoreConfig] = useState<StoreConfig | null>(null);
  const [isStoreOpen, setIsStoreOpen] = useState(true);

  useEffect(() => {
    const loadProductDetails = async () => {
      if (!id) return;
      try {
        setLoading(true);
        const [productData, complementsData, flavorsData, additionalsData, storeData] = await Promise.all([
          apiService.getProductById(parseInt(id)),
          apiService.getComplements(),
          apiService.getFlavors(),
          apiService.getAdditionals(),
          apiService.getStoreConfig()
        ]);
        setProduct(productData);
        setComplements(complementsData);
        setFlavors(flavorsData);
        setAdditionals(additionalsData);
        setStoreConfig(storeData);
        
        if (productData.images && productData.images.length > 0) {
          setSelectedImage(productData.images[0].url);
        }
        
        // Verificar status da loja
        if (storeData) {
          const status = checkStoreStatus(storeData);
          setIsStoreOpen(status.isOpen);
        }
      } catch (error) {
       
      } finally {
        setLoading(false);
      }
    };
    loadProductDetails();
  }, [id]);

  // Atualizar status da loja periodicamente
  useEffect(() => {
    if (!storeConfig) return;

    const interval = setInterval(() => {
      const status = checkStoreStatus(storeConfig);
      setIsStoreOpen(status.isOpen);
    }, 60000); // Verificar a cada 1 minuto

    return () => clearInterval(interval);
  }, [storeConfig]);


  const handleQuantityChange = (delta: number) => {
    setQuantity((prev) => Math.max(1, prev + delta));
  };

  const handleAdditionalQuantityChange = (additionalId: number, delta: number) => {
    setSelectedAdditionals((prev) => {
      const current = prev[additionalId] || 0;
      const next = Math.max(0, current + delta);
      const updated = { ...prev, [additionalId]: next };
      if (next === 0) {
        delete updated[additionalId];
      }
      return updated;
    });
  };

  const toggleComplement = (complementId: number) => {
    // Limitar seleção pelo valor definido em product.quantidadeComplementos
    if (!product) return;
    const max = Number(product.quantidadeComplementos) || 0;
    setSelectedComplements((prev) => {
      if (prev.includes(complementId)) {
        return prev.filter((id) => id !== complementId);
      } else {
        if (max > 0 && prev.length >= max) {
          const message = `Você pode escolher no máximo ${max} complemento${max > 1 ? 's' : ''}.`;
          const now = Date.now();
          if (lastNotifyRef.current.msg !== message || now - lastNotifyRef.current.ts > 1000) {
            lastNotifyRef.current = { msg: message, ts: now };
            notify(message, 'warning');
          }
          return prev;
        }
        return [...prev, complementId];
      }
    });
  };

  const toggleFlavor = (flavorId: number, categoryId: number) => {
    if (!product || !product.flavorCategories) return;
    
    // Encontrar a categoria e sua quantidade máxima
    const flavorCategory = product.flavorCategories.find(fc => fc.categoryId === categoryId);
    if (!flavorCategory) return;
    
    const maxQuantity = flavorCategory.quantity || 0;
    
    setSelectedFlavors((prev) => {
      const categoryFlavors = prev[categoryId] || [];
      
      if (categoryFlavors.includes(flavorId)) {
        // Remover sabor
        return {
          ...prev,
          [categoryId]: categoryFlavors.filter((id) => id !== flavorId)
        };
      } else {
        // Adicionar sabor, respeitando o limite
        if (maxQuantity > 0 && categoryFlavors.length >= maxQuantity) {
          const message = `Você pode escolher no máximo ${maxQuantity} sabor${maxQuantity > 1 ? 'es' : ''} da categoria ${flavorCategory.categoryName}.`;
          const now = Date.now();
          if (lastNotifyRef.current.msg !== message || now - lastNotifyRef.current.ts > 1000) {
            lastNotifyRef.current = { msg: message, ts: now };
            notify(message, 'warning');
          }
          return prev;
        }
        return {
          ...prev,
          [categoryId]: [...categoryFlavors, flavorId]
        };
      }
    });
  };

  const calculateTotal = () => {
    if (!product) return 0;
    const base = Number(product.price);
    const additionalsTotal = Object.entries(selectedAdditionals).reduce((acc, [idStr, qty]) => {
      const additionalId = Number(idStr);
      const found = additionals.find((a) => a.id === additionalId);
      return acc + (found ? (Number(found.value) || 0) * (Number(qty) || 0) : 0);
    }, 0);

    return (base + additionalsTotal) * quantity;
  };

  // Validar se todas as categorias de sabores obrigatórias têm pelo menos um sabor selecionado
  const validateFlavors = (): { isValid: boolean; missingCategories: string[] } => {
    if (!product || !product.receiveFlavors || !product.flavorCategories || product.flavorCategories.length === 0) {
      return { isValid: true, missingCategories: [] };
    }

    const missingCategories: string[] = [];

    product.flavorCategories.forEach((flavorCategory) => {
      const selectedInCategory = selectedFlavors[flavorCategory.categoryId] || [];
      if (selectedInCategory.length === 0) {
        missingCategories.push(flavorCategory.categoryName);
      }
    });

    return {
      isValid: missingCategories.length === 0,
      missingCategories,
    };
  };

  const handleAddToCart = async () => {
    if (!product) return;
    
    // Verificar se a loja está aberta
    if (!isStoreOpen) {
      const status = storeConfig ? checkStoreStatus(storeConfig) : null;
      const message = status?.reason || 'A loja está fechada no momento.';
      notify(message, 'error');
      return;
    }

    // Validar sabores obrigatórios
    const flavorValidation = validateFlavors();
    if (!flavorValidation.isValid) {
      const categoriesList = flavorValidation.missingCategories.join(', ');
      const message = `Por favor, selecione pelo menos um sabor da${flavorValidation.missingCategories.length > 1 ? 's categoria' : ' categoria'} ${categoriesList}.`;
      notify(message, 'warning');
      
      // Fazer scroll para a seção de sabores
      if (flavorsSectionRef.current) {
        // Adicionar offset para não ficar colado no topo
        const offset = 100;
        const elementPosition = flavorsSectionRef.current.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - offset;

        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        });
        
        // Destacar a seção brevemente com animação
        flavorsSectionRef.current.classList.add('ring-4', 'ring-pink-500', 'ring-opacity-75', 'rounded-xl');
        setTimeout(() => {
          flavorsSectionRef.current?.classList.remove('ring-4', 'ring-pink-500', 'ring-opacity-75');
        }, 2500);
      }
      return;
    }
    
    try {
      setAddingToCart(true);
      // Preparar sabores para envio (apenas se houver sabores selecionados)
      const flavorsToSend = Object.keys(selectedFlavors).length > 0 ? selectedFlavors : undefined;
      const additionalItemsToSend = Object.entries(selectedAdditionals)
        .map(([idStr, qty]) => ({ id: Number(idStr), quantity: Number(qty) }))
        .filter((a) => !Number.isNaN(a.id) && a.id > 0 && !Number.isNaN(a.quantity) && a.quantity > 0);
      await addItem(product.id, quantity, selectedComplements, flavorsToSend, additionalItemsToSend);
      notify('Produto adicionado ao carrinho!', 'success');
      navigate('/cart');
    } catch (error) {
     
      notify('Erro ao adicionar produto ao carrinho', 'error');
    } finally {
      setAddingToCart(false);
    }
  };

  if (loading) {
    return <Loading fullScreen text="Carregando produto..." />;
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Produto não encontrado</h2>
          <button
            onClick={() => navigate('/products')}
            className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            Voltar para produtos
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
    <div className="min-h-screen bg-white pb-24 md:pb-0">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 md:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
          {/* Coluna Esquerda - Imagens */}
          <div className="space-y-4">
              {/* Imagem Principal */}
              <div className="aspect-square rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
                {selectedImage ? (
                  <img
                    src={selectedImage}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-6xl">
                    🥤
                  </div>
                )}
              </div>

              {/* Miniaturas */}
              {product.images && product.images.length > 1 && (
                <div className="grid grid-cols-4 gap-2 md:gap-3">
                  {product.images.map((image, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedImage(image.url)}
                      className={`aspect-square rounded-lg overflow-hidden bg-slate-100 border-2 transition-all ${
                        selectedImage === image.url
                          ? 'border-purple-600 ring-2 ring-purple-200'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <img
                        src={image.url}
                        alt={`${product.name} - ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Coluna Direita - Informações */}
            <div className="space-y-4 md:space-y-5">
              {/* Header */}
              <div>
                <h1 className="text-xl md:text-3xl font-bold text-slate-900 mb-2">
                  {product.name}
                </h1>
                {product.description && (
                  <p className="text-xs md:text-sm text-slate-600 leading-relaxed">
                    {product.description}
                  </p>
                )}
              </div>

              {/* Preço */}
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 md:p-5">
                <p className="text-xs md:text-sm text-purple-700 font-medium mb-1">Preço</p>
                <p className="text-2xl md:text-4xl font-bold text-purple-600">
                  {formatBRL(product.price)}
                </p>
              </div>

              {/* Quantidade - Desktop */}
              <div className="hidden md:block">
                <label className="block text-xs md:text-sm font-semibold text-slate-900 mb-2">
                  Quantidade
                </label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleQuantityChange(-1)}
                    className="w-9 h-9 md:w-11 md:h-11 rounded-lg bg-slate-200 hover:bg-slate-300 flex items-center justify-center transition-colors"
                    disabled={quantity <= 1}
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="text-lg md:text-xl font-bold text-slate-900 min-w-[2.5rem] text-center">
                    {quantity}
                  </span>
                  <button
                    onClick={() => handleQuantityChange(1)}
                    className="w-9 h-9 md:w-11 md:h-11 rounded-lg bg-slate-200 hover:bg-slate-300 flex items-center justify-center transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Botão Adicionar ao Carrinho - Desktop */}
              <div className="hidden md:block">
                {(() => {
                  const flavorValidation = validateFlavors();
                  const isFlavorValidationFailed = !flavorValidation.isValid;

                  return (
                    <button
                      onClick={handleAddToCart}
                      disabled={addingToCart || !isStoreOpen}
                      className={`w-full py-3 md:py-4 text-white font-bold rounded-xl transition-all duration-200 shadow-lg flex items-center justify-center gap-2 text-sm md:text-base ${
                        !isStoreOpen
                          ? 'bg-slate-400 cursor-not-allowed'
                          : isFlavorValidationFailed
                          ? 'bg-slate-400 hover:bg-slate-500 cursor-pointer'
                          : addingToCart
                          ? 'bg-purple-400 cursor-not-allowed'
                          : 'bg-purple-600 hover:bg-purple-700 hover:shadow-xl'
                      }`}
                    >
                      {!isStoreOpen ? (
                        <>
                          <Clock className="w-4 h-4 md:w-5 md:h-5" />
                          Loja Fechada
                        </>
                      ) : isFlavorValidationFailed ? (
                        <>
                          <ShoppingCart className="w-4 h-4 md:w-5 md:h-5" />
                          Selecione os sabores obrigatórios
                        </>
                      ) : addingToCart ? (
                        <>
                          <ShoppingCart className="w-4 h-4 md:w-5 md:h-5" />
                          Adicionando...
                        </>
                      ) : (
                        <>
                          <ShoppingCart className="w-4 h-4 md:w-5 md:h-5" />
                          Adicionar ao Carrinho
                        </>
                      )}
                    </button>
                  );
                })()}
              </div>

              {/* Total - Desktop */}
              <div className="hidden md:block bg-slate-100 rounded-xl p-3 md:p-5 border border-slate-200">
                <div className="flex items-center justify-between">
                  <span className="text-sm md:text-base font-semibold text-slate-700">
                    Total
                  </span>
                  <span className="text-xl md:text-2xl font-bold text-purple-600">
                    {formatBRL(calculateTotal())}
                  </span>
                </div>
              </div>

            </div>
          </div>

            {/* Sabores */}
            {product.receiveFlavors && product.flavorCategories && product.flavorCategories.length > 0 && (() => {
              // Filtrar sabores apenas das categorias permitidas pelo produto
              const allowedCategoryIds = product.flavorCategories.map(fc => fc.categoryId);
              const availableFlavors = flavors.filter(f => 
                f.categoryId && allowedCategoryIds.includes(f.categoryId) && f.isActive
              );
              
              if (availableFlavors.length === 0) return null;
              
              return (
                <div ref={flavorsSectionRef} className="mt-6 pt-4 border-t border-slate-200 transition-all duration-500">
                  <h2 className="text-base md:text-xl font-bold text-slate-900 mb-3 md:mb-5">
                    Sabores Disponíveis
                  </h2>
                  
                  {/* Informações sobre limites por categoria */}
                  <div className="mb-3 md:mb-4 space-y-2">
                    {product.flavorCategories.map((fc) => {
                      const categoryFlavors = availableFlavors.filter(f => f.categoryId === fc.categoryId);
                      if (categoryFlavors.length === 0) return null;
                      return (
                        <div key={fc.categoryId} className="text-xs md:text-sm text-pink-700 font-semibold">
                          <span>{fc.categoryName}: você pode escolher até <span className="font-bold">{fc.quantity}</span> sabor{fc.quantity > 1 ? 'es' : ''}.</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Filtros de Busca para Sabores */}
                  <div className="mb-4 md:mb-6 space-y-3">
                    {/* Campo de Busca */}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4 md:w-5 md:h-5" />
                      <input
                        type="text"
                        placeholder="Buscar sabor..."
                        value={flavorSearchTerm}
                        onChange={(e) => setFlavorSearchTerm(e.target.value)}
                        className="w-full pl-9 md:pl-10 pr-10 py-2 md:py-3 text-sm md:text-base border-2 border-slate-200 rounded-lg md:rounded-xl focus:border-pink-500 focus:outline-none transition-colors"
                      />
                      {flavorSearchTerm && (
                        <button
                          onClick={() => setFlavorSearchTerm('')}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {/* Filtro por Categoria */}
                    <div className="flex items-center gap-2 overflow-x-auto pb-2">
                      <button
                        onClick={() => setSelectedFlavorCategory('all')}
                        className={`px-3 md:px-4 py-1.5 md:py-2 rounded-lg md:rounded-xl text-xs md:text-sm font-semibold whitespace-nowrap transition-all ${
                          selectedFlavorCategory === 'all'
                            ? 'bg-pink-600 text-white shadow-md'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        Todas
                      </button>
                      {product.flavorCategories.map((fc) => {
                        const categoryFlavors = availableFlavors.filter(f => f.categoryId === fc.categoryId);
                        if (categoryFlavors.length === 0) return null;
                        return (
                          <button
                            key={fc.categoryId}
                            onClick={() => setSelectedFlavorCategory(fc.categoryName)}
                            className={`px-3 md:px-4 py-1.5 md:py-2 rounded-lg md:rounded-xl text-xs md:text-sm font-semibold whitespace-nowrap transition-all ${
                              selectedFlavorCategory === fc.categoryName
                                ? 'bg-pink-600 text-white shadow-md'
                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                            }`}
                          >
                            {fc.categoryName}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  
                  {/* Agrupar sabores por categoria */}
                  {(() => {
                    // Filtrar sabores por busca e categoria
                    const filteredFlavors = availableFlavors.filter((flavor) => {
                      // Filtro por nome
                      const matchesSearch = flavor.name.toLowerCase().includes(flavorSearchTerm.toLowerCase());
                      
                      // Filtro por categoria
                      let matchesCategory = true;
                      if (selectedFlavorCategory !== 'all') {
                        const category = product.flavorCategories?.find(fc => fc.categoryName === selectedFlavorCategory);
                        matchesCategory = category ? flavor.categoryId === category.categoryId : false;
                      }
                      
                      return matchesSearch && matchesCategory;
                    });

                    // Separar sabores filtrados por categoria
                    const flavorsByCategory: { [key: string]: Flavor[] } = {};
                    
                    filteredFlavors.forEach((flavor) => {
                      if (flavor.category?.name) {
                        const categoryName = flavor.category.name;
                        if (!flavorsByCategory[categoryName]) {
                          flavorsByCategory[categoryName] = [];
                        }
                        flavorsByCategory[categoryName].push(flavor);
                      }
                    });

                    // Se não houver resultados
                    if (filteredFlavors.length === 0) {
                      return (
                        <div className="text-center py-8 md:py-12">
                          <div className="text-4xl md:text-6xl mb-3 md:mb-4">🔍</div>
                          <h3 className="text-base md:text-lg font-semibold text-slate-700 mb-1 md:mb-2">
                            Nenhum sabor encontrado
                          </h3>
                          <p className="text-xs md:text-sm text-slate-500">
                            Tente ajustar os filtros de busca
                          </p>
                        </div>
                      );
                    }

                    return (
                      <div className="space-y-4 md:space-y-6">
                        {/* Sabores por categoria */}
                        {Object.entries(flavorsByCategory).map(([categoryName, categoryFlavors]) => {
                          const flavorCategory = product.flavorCategories?.find(fc => fc.categoryName === categoryName);
                          const maxQuantity = flavorCategory?.quantity || 0;
                          const selectedInCategory = selectedFlavors[flavorCategory?.categoryId || 0] || [];
                          
                          return (
                            <div key={categoryName} className="space-y-2 md:space-y-3">
                              <h3 className="text-sm md:text-lg font-semibold text-pink-700 bg-pink-50 px-3 py-1.5 md:px-4 md:py-2 rounded-lg border border-pink-200">
                                {categoryName} {maxQuantity > 0 && `(máx. ${maxQuantity})`}
                              </h3>
                              <div className="space-y-1.5 md:space-y-3">
                                {categoryFlavors.map((flavor) => {
                                  const isSelected = selectedInCategory.includes(flavor.id);
                                  const isDisabled = !isSelected && maxQuantity > 0 && selectedInCategory.length >= maxQuantity;
                                  
                                  return (
                                    <button
                                      key={flavor.id}
                                      onClick={() => toggleFlavor(flavor.id, flavor.categoryId!)}
                                      className={`w-full p-2.5 md:p-4 rounded-lg md:rounded-xl border-2 transition-all duration-200 text-left ${
                                        isSelected
                                          ? 'border-pink-600 bg-pink-50'
                                          : 'border-slate-200 bg-white hover:border-slate-300'
                                      } ${isDisabled ? 'opacity-60 cursor-not-allowed' : ''}`}
                                      disabled={isDisabled}
                                    >
                                      <div className="flex items-center gap-2.5 md:gap-4">
                                        {/* Imagem do sabor */}
                                        {flavor.imageUrl ? (
                                          <img
                                            src={flavor.imageUrl.startsWith('http') ? flavor.imageUrl : flavor.imageUrl}
                                            alt={flavor.name}
                                            className="w-12 h-12 md:w-20 md:h-20 object-cover rounded-md md:rounded-lg flex-shrink-0 border border-slate-200"
                                            onError={(e) => {
                                              const target = e.target as HTMLImageElement;
                                              if (!target.dataset.errorHandled) {
                                                target.dataset.errorHandled = 'true';
                                                target.style.display = 'none';
                                                const parent = target.parentElement;
                                                if (parent) {
                                                  parent.innerHTML = '<div class="w-12 h-12 md:w-20 md:h-20 bg-slate-100 rounded-md md:rounded-lg flex items-center justify-center flex-shrink-0"><span class="text-2xl md:text-3xl">🍓</span></div>';
                                                }
                                              }
                                            }}
                                          />
                                        ) : (
                                          <div className="w-12 h-12 md:w-20 md:h-20 bg-slate-100 rounded-md md:rounded-lg flex items-center justify-center flex-shrink-0">
                                            <span className="text-2xl md:text-3xl">🍓</span>
                                          </div>
                                        )}

                                        {/* Nome do sabor */}
                                        <div className="flex-1">
                                          <h3 className="text-xs md:text-base font-semibold text-slate-900">
                                            {flavor.name}
                                          </h3>
                                        </div>

                                        {/* Checkbox */}
                                        <div className={`w-4 h-4 md:w-6 md:h-6 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                                          isSelected
                                            ? 'bg-pink-600 border-pink-600'
                                            : 'border-slate-300 bg-white'
                                        }`}>
                                          {isSelected && (
                                            <Check className="w-2.5 h-2.5 md:w-4 md:h-4 text-white" />
                                          )}
                                        </div>
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              );
            })()}

            {/* Complementos */}
            {product.receiveComplements && complements.length > 0 && (
              <div className="mt-6 pt-4 border-t border-slate-200">
                <h2 className="text-base md:text-xl font-bold text-slate-900 mb-3 md:mb-5">
                  Complementos Disponíveis
                </h2>
                {Number(product.quantidadeComplementos) > 0 && (
                  <div className="mb-3 md:mb-4 text-xs md:text-sm text-purple-700 font-semibold flex items-center gap-2">
                    <span>Você pode escolher até <span className="font-bold">{product.quantidadeComplementos}</span> complemento{Number(product.quantidadeComplementos) > 1 ? 's' : ''} para este produto.</span>
                  </div>
                )}

                {/* Filtros de Busca */}
                <div className="mb-4 md:mb-6 space-y-3">
                  {/* Campo de Busca */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4 md:w-5 md:h-5" />
                    <input
                      type="text"
                      placeholder="Buscar complemento..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-9 md:pl-10 pr-10 py-2 md:py-3 text-sm md:text-base border-2 border-slate-200 rounded-lg md:rounded-xl focus:border-purple-500 focus:outline-none transition-colors"
                    />
                    {searchTerm && (
                      <button
                        onClick={() => setSearchTerm('')}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Filtro por Categoria */}
                  <div className="flex items-center gap-2 overflow-x-auto pb-2">
                    <button
                      onClick={() => setSelectedCategory('all')}
                      className={`px-3 md:px-4 py-1.5 md:py-2 rounded-lg md:rounded-xl text-xs md:text-sm font-semibold whitespace-nowrap transition-all ${
                        selectedCategory === 'all'
                          ? 'bg-purple-600 text-white shadow-md'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      Todos
                    </button>
                    {(() => {
                      const categories = new Set<string>();
                      complements.forEach((complement) => {
                        if (complement.category?.name) {
                          categories.add(complement.category.name);
                        }
                      });
                      return Array.from(categories).map((categoryName) => (
                        <button
                          key={categoryName}
                          onClick={() => setSelectedCategory(categoryName)}
                          className={`px-3 md:px-4 py-1.5 md:py-2 rounded-lg md:rounded-xl text-xs md:text-sm font-semibold whitespace-nowrap transition-all ${
                            selectedCategory === categoryName
                              ? 'bg-purple-600 text-white shadow-md'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          }`}
                        >
                          {categoryName}
                        </button>
                      ));
                    })()}
                    {complements.some((c) => !c.category) && (
                      <button
                        onClick={() => setSelectedCategory('uncategorized')}
                        className={`px-3 md:px-4 py-1.5 md:py-2 rounded-lg md:rounded-xl text-xs md:text-sm font-semibold whitespace-nowrap transition-all ${
                          selectedCategory === 'uncategorized'
                            ? 'bg-purple-600 text-white shadow-md'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        Outros
                      </button>
                    )}
                  </div>
                </div>
                
                {/* Agrupar complementos por categoria */}
                {(() => {
                  // Filtrar complementos por busca e categoria
                  const filteredComplements = complements.filter((complement) => {
                    // Filtro por nome
                    const matchesSearch = complement.name.toLowerCase().includes(searchTerm.toLowerCase());
                    
                    // Filtro por categoria
                    let matchesCategory = true;
                    if (selectedCategory !== 'all') {
                      if (selectedCategory === 'uncategorized') {
                        matchesCategory = !complement.category;
                      } else {
                        matchesCategory = complement.category?.name === selectedCategory;
                      }
                    }
                    
                    return matchesSearch && matchesCategory;
                  });

                  // Separar complementos filtrados por categoria
                  const complementsByCategory: { [key: string]: Complement[] } = {};
                  const uncategorized: Complement[] = [];
                  
                  filteredComplements.forEach((complement) => {
                    if (complement.category?.name) {
                      const categoryName = complement.category.name;
                      if (!complementsByCategory[categoryName]) {
                        complementsByCategory[categoryName] = [];
                      }
                      complementsByCategory[categoryName].push(complement);
                    } else {
                      uncategorized.push(complement);
                    }
                  });

                  // Se não houver resultados
                  if (filteredComplements.length === 0) {
                    return (
                      <div className="text-center py-8 md:py-12">
                        <div className="text-4xl md:text-6xl mb-3 md:mb-4">🔍</div>
                        <h3 className="text-base md:text-lg font-semibold text-slate-700 mb-1 md:mb-2">
                          Nenhum complemento encontrado
                        </h3>
                        <p className="text-xs md:text-sm text-slate-500">
                          Tente ajustar os filtros de busca
                        </p>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-4 md:space-y-6">
                      {/* Complementos com categoria */}
                      {Object.entries(complementsByCategory).map(([categoryName, categoryComplements]) => (
                        <div key={categoryName} className="space-y-2 md:space-y-3">
                          <h3 className="text-sm md:text-lg font-semibold text-purple-700 bg-purple-50 px-3 py-1.5 md:px-4 md:py-2 rounded-lg border border-purple-200">
                            {categoryName}
                          </h3>
                          <div className="space-y-1.5 md:space-y-3">
                            {categoryComplements.map((complement) => (
                              <button
                                key={complement.id}
                                onClick={() => toggleComplement(complement.id)}
                                className={`w-full p-2.5 md:p-4 rounded-lg md:rounded-xl border-2 transition-all duration-200 text-left ${
                                  selectedComplements.includes(complement.id)
                                    ? 'border-purple-600 bg-purple-50'
                                    : 'border-slate-200 bg-white hover:border-slate-300'
                                } ${!selectedComplements.includes(complement.id) && Number(product.quantidadeComplementos) > 0 && selectedComplements.length >= Number(product.quantidadeComplementos) ? 'opacity-60' : ''}`}
                              >
                                <div className="flex items-center gap-2.5 md:gap-4">
                                  {/* Imagem do complemento */}
                                  {complement.imageUrl ? (
                                    <img
                                      src={complement.imageUrl.startsWith('http') ? complement.imageUrl : complement.imageUrl}
                                      alt={complement.name}
                                      className="w-12 h-12 md:w-20 md:h-20 object-cover rounded-md md:rounded-lg flex-shrink-0 border border-slate-200"
                                      onError={(e) => {
                                        const target = e.target as HTMLImageElement;
                                        if (!target.dataset.errorHandled) {
                                          target.dataset.errorHandled = 'true';
                                          target.style.display = 'none';
                                          const parent = target.parentElement;
                                          if (parent) {
                                            parent.innerHTML = '<div class=\"w-12 h-12 md:w-20 md:h-20 bg-slate-100 rounded-md md:rounded-lg flex items-center justify-center flex-shrink-0\"><span class=\"text-2xl md:text-3xl\">🍓</span></div>';
                                          }
                                        }
                                      }}
                                    />
                                  ) : (
                                    <div className="w-12 h-12 md:w-20 md:h-20 bg-slate-100 rounded-md md:rounded-lg flex items-center justify-center flex-shrink-0">
                                      <span className="text-2xl md:text-3xl">🍓</span>
                                    </div>
                                  )}

                                  {/* Nome do complemento */}
                                  <div className="flex-1">
                                    <h3 className="text-xs md:text-base font-semibold text-slate-900">
                                      {complement.name}
                                    </h3>
                                  </div>

                                  {/* Checkbox */}
                                  <div className={`w-4 h-4 md:w-6 md:h-6 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                                    selectedComplements.includes(complement.id)
                                      ? 'bg-purple-600 border-purple-600'
                                      : 'border-slate-300 bg-white'
                                  }`}>
                                    {selectedComplements.includes(complement.id) && (
                                      <Check className="w-2.5 h-2.5 md:w-4 md:h-4 text-white" />
                                    )}
                                  </div>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}

                      {/* Complementos sem categoria */}
                      {uncategorized.length > 0 && (
                        <div className="space-y-2 md:space-y-3">
                          <h3 className="text-sm md:text-lg font-semibold text-slate-700 bg-slate-50 px-3 py-1.5 md:px-4 md:py-2 rounded-lg border border-slate-200">
                            Outros
                          </h3>
                          <div className="space-y-1.5 md:space-y-3">
                            {uncategorized.map((complement) => (
                              <button
                                key={complement.id}
                                onClick={() => toggleComplement(complement.id)}
                                className={`w-full p-2.5 md:p-4 rounded-lg md:rounded-xl border-2 transition-all duration-200 text-left ${
                                  selectedComplements.includes(complement.id)
                                    ? 'border-purple-600 bg-purple-50'
                                    : 'border-slate-200 bg-white hover:border-slate-300'
                                } ${!selectedComplements.includes(complement.id) && Number(product.quantidadeComplementos) > 0 && selectedComplements.length >= Number(product.quantidadeComplementos) ? 'opacity-60' : ''}`}
                              >
                                <div className="flex items-center gap-2.5 md:gap-4">
                                  {/* Imagem do complemento */}
                                  {complement.imageUrl ? (
                                    <img
                                      src={complement.imageUrl.startsWith('http') ? complement.imageUrl : complement.imageUrl}
                                      alt={complement.name}
                                      className="w-12 h-12 md:w-20 md:h-20 object-cover rounded-md md:rounded-lg flex-shrink-0 border border-slate-200"
                                      onError={(e) => {
                                        const target = e.target as HTMLImageElement;
                                        if (!target.dataset.errorHandled) {
                                          target.dataset.errorHandled = 'true';
                                          target.style.display = 'none';
                                          const parent = target.parentElement;
                                          if (parent) {
                                            parent.innerHTML = '<div class=\"w-12 h-12 md:w-20 md:h-20 bg-slate-100 rounded-md md:rounded-lg flex items-center justify-center flex-shrink-0\"><span class=\"text-2xl md:text-3xl\">🍓</span></div>';
                                          }
                                        }
                                      }}
                                    />
                                  ) : (
                                    <div className="w-12 h-12 md:w-20 md:h-20 bg-slate-100 rounded-md md:rounded-lg flex items-center justify-center flex-shrink-0">
                                      <span className="text-2xl md:text-3xl">🍓</span>
                                    </div>
                                  )}

                                  {/* Nome do complemento */}
                                  <div className="flex-1">
                                    <h3 className="text-xs md:text-base font-semibold text-slate-900">
                                      {complement.name}
                                    </h3>
                                  </div>

                                  {/* Checkbox */}
                                  <div className={`w-4 h-4 md:w-6 md:h-6 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                                    selectedComplements.includes(complement.id)
                                      ? 'bg-purple-600 border-purple-600'
                                      : 'border-slate-300 bg-white'
                                  }`}>
                                    {selectedComplements.includes(complement.id) && (
                                      <Check className="w-2.5 h-2.5 md:w-4 md:h-4 text-white" />
                                    )}
                                  </div>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Adicionais */}
            {product.receiveAdditionals && additionals.length > 0 && (
              <div className="mt-6 pt-4 border-t border-slate-200">
                <h2 className="text-base md:text-xl font-bold text-slate-900 mb-3 md:mb-5">
                  Adicionais
                </h2>
                <div className="space-y-1.5 md:space-y-3">
                  {additionals
                    .filter((a) => a.isActive)
                    .map((additional) => {
                      const qty = selectedAdditionals[additional.id] || 0;
                      return (
                        <div
                          key={additional.id}
                          className={`w-full p-2.5 md:p-4 rounded-lg md:rounded-xl border-2 transition-all duration-200 text-left ${
                            qty > 0
                              ? 'border-emerald-600 bg-emerald-50'
                              : 'border-slate-200 bg-white'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 md:gap-4">
                            {additional.imageUrl ? (
                              <img
                                src={additional.imageUrl.startsWith('http') ? additional.imageUrl : additional.imageUrl}
                                alt={additional.name}
                                className="w-12 h-12 md:w-20 md:h-20 object-cover rounded-md md:rounded-lg flex-shrink-0 border border-slate-200"
                              />
                            ) : (
                              <div className="w-12 h-12 md:w-20 md:h-20 bg-slate-100 rounded-md md:rounded-lg flex items-center justify-center flex-shrink-0">
                                <span className="text-2xl md:text-3xl">➕</span>
                              </div>
                            )}

                            <div className="flex-1">
                              <h3 className="text-xs md:text-base font-semibold text-slate-900">
                                {additional.name}
                              </h3>
                              <p className="text-xs md:text-sm text-emerald-700 font-semibold">
                                + {formatBRL(additional.value)}
                              </p>
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleAdditionalQuantityChange(additional.id, -1)}
                                disabled={qty <= 0}
                                className="w-8 h-8 md:w-9 md:h-9 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                                aria-label="Diminuir adicional"
                              >
                                <Minus className="w-4 h-4 text-slate-700" />
                              </button>
                              <span className="min-w-[1.5rem] text-center text-sm md:text-base font-bold text-slate-900">
                                {qty}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleAdditionalQuantityChange(additional.id, 1)}
                                className="w-8 h-8 md:w-9 md:h-9 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center"
                                aria-label="Aumentar adicional"
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
      </div>
    </div>

    {/* Footer Fixo - Controles de Quantidade e Adicionar ao Carrinho (estilo iFood) */}
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 shadow-lg z-[100] md:hidden">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-3">
        <div className="flex items-center justify-between gap-3">
          {/* Controle de Quantidade */}
          <div className="flex items-center gap-2 bg-slate-100 rounded-lg p-1">
            <button
              onClick={() => handleQuantityChange(-1)}
              className="w-8 h-8 rounded-md bg-white hover:bg-slate-50 flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={quantity <= 1}
            >
              <Minus className="w-4 h-4 text-slate-700" />
            </button>
            <span className="text-base font-bold text-slate-900 min-w-[2rem] text-center">
              {quantity}
            </span>
            <button
              onClick={() => handleQuantityChange(1)}
              className="w-8 h-8 rounded-md bg-white hover:bg-slate-50 flex items-center justify-center transition-colors"
            >
              <Plus className="w-4 h-4 text-slate-700" />
            </button>
          </div>

          {/* Total e Botão */}
          <div className="flex items-center gap-3 flex-1">
            {/* Total */}
            <div className="text-right">
              <p className="text-xs text-slate-500">Total</p>
              <p className="text-lg font-bold text-purple-600">
                {formatBRL(calculateTotal())}
              </p>
            </div>

            {/* Botão Adicionar ao Carrinho */}
            {(() => {
              const flavorValidation = validateFlavors();
              const isFlavorValidationFailed = !flavorValidation.isValid;

              return (
                <button
                  onClick={handleAddToCart}
                  disabled={addingToCart || !isStoreOpen}
                  className={`flex-1 py-3 px-4 text-white font-bold rounded-lg transition-all duration-200 shadow-md flex items-center justify-center gap-2 text-sm ${
                    !isStoreOpen
                      ? 'bg-slate-400 cursor-not-allowed'
                      : isFlavorValidationFailed
                      ? 'bg-slate-400 hover:bg-slate-500 cursor-pointer active:scale-95'
                      : addingToCart
                      ? 'bg-purple-400 cursor-not-allowed'
                      : 'bg-purple-600 hover:bg-purple-700 active:scale-95'
                  }`}
                >
                  {!isStoreOpen ? (
                    <>
                      <Clock className="w-4 h-4" />
                      <span className="hidden sm:inline">Loja Fechada</span>
                    </>
                  ) : isFlavorValidationFailed ? (
                    <>
                      <ShoppingCart className="w-4 h-4" />
                      <span className="hidden sm:inline">Selecione os sabores</span>
                      <span className="sm:hidden">Sabores</span>
                    </>
                  ) : addingToCart ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Adicionando...</span>
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="w-4 h-4" />
                      <span>Adicionar</span>
                    </>
                  )}
                </button>
              );
            })()}
          </div>
        </div>
      </div>
    </div>
    </>
  );
};

export default ProdutoDetalhes;