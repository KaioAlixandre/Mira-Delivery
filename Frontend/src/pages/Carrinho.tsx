import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Minus, 
  Plus, 
  Trash2, 
  ShoppingBag, 
  ArrowLeft, 
  Clock, 
  Star, 
  Heart,
  ShoppingCart,
  Package
} from 'lucide-react';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../components/NotificationProvider';
import { apiService } from '../services/api';
import { checkStoreStatus } from '../utils/storeUtils';
import Loading from '../components/Loading';
import { Flavor, Product, ProductCategory } from '../types';

const Cart: React.FC = () => {
  const { items, total, updateItem, removeItem, clearCart, loading, addItem } = useCart();
  const { user } = useAuth();
  const { notify } = useNotification();
  const navigate = useNavigate();
  const [storeStatus, setStoreStatus] = useState<any>(null);
  const [flavors, setFlavors] = useState<Flavor[]>([]);
  const [beverageProducts, setBeverageProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [addingProductId, setAddingProductId] = useState<number | null>(null);

  useEffect(() => {
    const loadStoreConfig = async () => {
      try {
        const config = await apiService.getStoreConfig();
        
        if (config) {
          const status = checkStoreStatus(config);
          setStoreStatus(status);
        }
      } catch (error) {
       
      }
    };

    const loadFlavors = async () => {
      try {
        const flavorsData = await apiService.getFlavors();
        setFlavors(flavorsData);
      } catch (error) {
       
      }
    };

    const loadCategories = async () => {
      try {
        const categoriesData = await apiService.getCategories();
        setCategories(categoriesData);
      } catch (error) {
       
      }
    };

    loadStoreConfig();
    loadFlavors();
    loadCategories();
  }, []);

  // Carregar produtos de bebidas quando houver itens no carrinho
  useEffect(() => {
    const loadBeverageProducts = async () => {
      if (items.length === 0) {
        setBeverageProducts([]);
        return;
      }

      try {
        // Encontrar a categoria "bebidas" (case-insensitive)
        const beverageCategory = categories.find(
          cat => cat.name.toLowerCase() === 'bebidas' || cat.name.toLowerCase() === 'bebida'
        );

        if (beverageCategory) {
          const products = await apiService.getProductsByCategory(beverageCategory.id);
          // Filtrar apenas produtos ativos
          const activeProducts = products.filter(p => p.isActive);
          setBeverageProducts(activeProducts);
        } else {
          setBeverageProducts([]);
        }
      } catch (error) {
        setBeverageProducts([]);
      }
    };

    if (categories.length > 0) {
      loadBeverageProducts();
    }
  }, [items.length, categories]);

  // Função para obter sabores do item do carrinho
  const getItemFlavors = (item: any): Flavor[] => {
    if (!item.selectedOptions || !flavors.length) return [];

    // Tentar diferentes formatos de estrutura
    let selectedFlavors: any = {};
    
    if (item.selectedOptions.selectedFlavors) {
      selectedFlavors = item.selectedOptions.selectedFlavors;
    } else if (item.selectedOptions.flavors) {
      selectedFlavors = item.selectedOptions.flavors;
    } else {
      return [];
    }

    // Se selectedFlavors está vazio, retornar array vazio
    if (Object.keys(selectedFlavors).length === 0) {
      return [];
    }

    // Coletar todos os IDs de sabores selecionados
    // As chaves podem vir como strings ou números do JSON
    const flavorIds: number[] = [];
    Object.values(selectedFlavors).forEach((ids: any) => {
      if (Array.isArray(ids)) {
        flavorIds.push(...ids.map((id: any) => Number(id)));
      }
    });

    // Buscar os sabores pelos IDs
    return flavors.filter(flavor => flavorIds.includes(flavor.id));
  };

  const handleQuantityChange = async (cartItemId: number, newQuantity: number) => {
    if (newQuantity <= 0) {
      await removeItem(cartItemId);
    } else {
      await updateItem(cartItemId, newQuantity);
    }
  };

  const handleCheckout = () => {
    if (!user) {
      // Redirecionar para checkout para permitir cadastro direto no fluxo de finalização
      navigate('/checkout');
      return;
    }

    // Verificar se a loja está aberta
    if (storeStatus && !storeStatus.isOpen) {
      notify(`Não é possível finalizar o pedido: ${storeStatus.reason}${storeStatus.nextOpenTime ? '\n' + storeStatus.nextOpenTime : ''}`, 'error');
      return;
    }

    // Vai direto para o checkout - a verificação de endereço será feita lá
    navigate('/checkout');
  };

  const handleAddBeverage = async (productId: number) => {
    if (storeStatus && !storeStatus.isOpen) {
      notify('A loja está fechada no momento', 'error');
      return;
    }

    try {
      setAddingProductId(productId);
      await addItem(productId, 1);
      notify('Bebida adicionada ao carrinho!', 'success');
    } catch (error: any) {
      notify(error.message || 'Erro ao adicionar bebida ao carrinho', 'error');
    } finally {
      setAddingProductId(null);
    }
  };

  if (loading) {
    return <Loading fullScreen text="Carregando carrinho..." />;
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="max-w-4xl mx-auto px-3 sm:px-6 lg:px-8 py-4 md:py-16">
          <div className="text-center py-6 md:py-16">
            {/* Main icon */}
            <div className="w-16 h-16 md:w-32 md:h-32 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 md:mb-8">
              <ShoppingBag className="w-8 h-8 md:w-16 md:h-16 text-purple-600" />
            </div>

            <h2 className="text-xl md:text-4xl font-bold text-slate-900 mb-2 md:mb-4">
              Seu carrinho está vazio
            </h2>
            <p className="text-sm md:text-xl text-slate-600 mb-5 md:mb-8 max-w-md mx-auto px-2">
              Que tal adicionar alguns itens ao seu carrinho?
            </p>

            {/* Benefits */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-6 mb-6 md:mb-12 max-w-3xl mx-auto">
              <div className="bg-white rounded-lg p-3 md:p-6 shadow-sm border border-slate-200">
                <div className="w-8 h-8 md:w-12 md:h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-2 md:mb-4">
                  <Star className="w-4 h-4 md:w-6 md:h-6 text-purple-600" />
                </div>
                <h3 className="font-semibold text-slate-900 mb-1 md:mb-2 text-xs md:text-base">Qualidade Premium</h3>
                <p className="text-slate-600 text-[10px] md:text-sm">Produtos selecionados e de qualidade</p>
              </div>

              <div className="bg-white rounded-lg p-3 md:p-6 shadow-sm border border-slate-200">
                <div className="w-8 h-8 md:w-12 md:h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-2 md:mb-4">
                  <Clock className="w-4 h-4 md:w-6 md:h-6 text-purple-600" />
                </div>
                <h3 className="font-semibold text-slate-900 mb-1 md:mb-2 text-xs md:text-base">Entrega Rápida</h3>
                <p className="text-slate-600 text-[10px] md:text-sm">Receba em casa rapidinho</p>
              </div>

              <div className="bg-white rounded-lg p-3 md:p-6 shadow-sm border border-slate-200">
                <div className="w-8 h-8 md:w-12 md:h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-2 md:mb-4">
                  <Heart className="w-4 h-4 md:w-6 md:h-6 text-purple-600" />
                </div>
                <h3 className="font-semibold text-slate-900 mb-1 md:mb-2 text-xs md:text-base">Feito com Amor</h3>
                <p className="text-slate-600 text-[10px] md:text-sm">Preparado com muito carinho</p>
              </div>
            </div>

            <Link
              to="/products"
              className="inline-flex items-center px-5 py-2.5 md:px-8 md:py-4 bg-purple-600 text-white text-sm md:text-base font-semibold rounded-lg hover:bg-purple-700 transition-all duration-200 shadow-md hover:shadow-lg"
            >
              <ArrowLeft size={18} className="mr-2 md:mr-3" />
              Explorar Produtos
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-6xl mx-auto px-3 sm:px-6 lg:px-8 py-4 md:py-8">
        {/* Header */}
        <div className="mb-4 md:mb-8">
          <h1 className="text-xl md:text-3xl font-bold text-slate-900 mb-1">
            Meu Carrinho
          </h1>
          <p className="text-xs md:text-base text-slate-600">
            {items.length} {items.length === 1 ? 'item' : 'itens'} selecionado{items.length !== 1 ? 's' : ''}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-8">
          {/* Lista de Itens */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              {items.map((item, index) => {
                // Verificar se o produto existe
                if (!item.product) {
                 
                  return null;
                }

                // Log para debug
               
                
                // Obter dados do produto
                const product = item.product;
                let productImage = null;
                if (product.images && product.images.length > 0 && product.images[0]?.url) {
                  const url = product.images[0].url;
                  // Se já for uma URL absoluta, usa direto, senão concatena com o domínio
                  productImage = url.startsWith('http') ? url : url;
                }
                
                return (
                <div key={item.id} className={`p-2.5 sm:p-4 md:p-6 ${index !== items.length - 1 ? 'border-b border-slate-200' : ''}`}>
                  <div className="flex items-start gap-2 sm:gap-3 md:gap-4">
                    {/* Imagem do produto */}
                    <div className="w-14 h-14 sm:w-20 sm:h-20 md:w-24 md:h-24 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {productImage ? (
                        <img 
                          src={productImage} 
                          alt={product.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                           
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      ) : (
                        <span className="text-lg sm:text-2xl md:text-3xl"></span>
                      )}
                    </div>

                    {/* Informações e controles */}
                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      {/* Cabeçalho com nome e botão remover */}
                      <div className="flex items-start justify-between gap-1.5 mb-1 sm:mb-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-xs sm:text-base md:text-lg font-semibold text-slate-900 mb-0.5 leading-tight">
                            {product.name}
                          </h3>
                          <p className="text-[10px] sm:text-sm text-slate-600 line-clamp-1 hidden sm:block">
                            {product.description || 'Produto disponível para você'}
                          </p>
                        </div>
                        
                        {/* Botão remover */}
                        <button
                          onClick={() => removeItem(item.id)}
                          className="w-6 h-6 sm:w-8 sm:h-8 text-slate-400 hover:text-red-600 transition-colors flex items-center justify-center flex-shrink-0"
                          title="Remover item"
                        >
                          <Trash2 size={14} className="sm:w-[18px] sm:h-[18px]" />
                        </button>
                      </div>

                      {/* Preço unitário */}
                      <div className="flex items-center gap-0.5 mb-1.5 sm:mb-2.5">
                        <span className="text-[11px] sm:text-sm md:text-base font-bold text-emerald-700">
                          R$ {Number(product.price).toFixed(2)}
                        </span>
                        <span className="text-[9px] sm:text-xs text-slate-500">un.</span>
                      </div>

                      {/* Complementos */}
                      {item.complements && item.complements.length > 0 && (
                        <div className="mb-2 sm:mb-3">
                          <p className="text-[10px] sm:text-xs text-slate-600 font-medium mb-1">Complementos:</p>
                          <div className="flex flex-wrap gap-1 sm:gap-1.5">
                            {item.complements.map((complement) => (
                              <span
                                key={complement.id}
                                className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 sm:py-1 bg-purple-50 text-purple-700 rounded-md text-[9px] sm:text-xs font-medium border border-purple-200"
                              >
                                {complement.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Sabores */}
                      {(() => {
                        const itemFlavors = getItemFlavors(item);
                        if (itemFlavors.length > 0) {
                          return (
                            <div className="mb-2 sm:mb-3">
                              <p className="text-[10px] sm:text-xs text-slate-600 font-medium mb-1">Sabores:</p>
                              <div className="flex flex-wrap gap-1 sm:gap-1.5">
                                {itemFlavors.map((flavor) => (
                                  <span
                                    key={flavor.id}
                                    className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 sm:py-1 bg-pink-50 text-pink-700 rounded-md text-[9px] sm:text-xs font-medium border border-pink-200"
                                  >
                                    {flavor.name}
                                  </span>
                                ))}
                              </div>
                            </div>
                          );
                        }
                        return null;
                      })()}

                      {/* Controles de quantidade e preço total */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1 sm:gap-2 bg-slate-100 rounded-lg p-0.5">
                          <button
                            onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                            className="w-6 h-6 sm:w-8 sm:h-8 rounded-md bg-white hover:bg-slate-50 transition-colors flex items-center justify-center"
                          >
                            <Minus size={12} className="sm:w-4 sm:h-4 text-slate-600" />
                          </button>
                          <span className="w-5 sm:w-8 text-center font-semibold text-[11px] sm:text-sm text-slate-900">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                            className="w-6 h-6 sm:w-8 sm:h-8 rounded-md bg-white hover:bg-slate-50 transition-colors flex items-center justify-center"
                          >
                            <Plus size={12} className="sm:w-4 sm:h-4 text-slate-600" />
                          </button>
                        </div>

                        {/* Preço total */}
                        <div className="text-right">
                          <p className="text-xs sm:text-base md:text-lg font-bold text-slate-900">
                            R$ {(item.quantity * product.price).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
              })}
            </div>

            {/* Botão limpar carrinho */}
            <div className="mt-3 text-center">
              <button
                onClick={clearCart}
                className="inline-flex items-center px-3 py-1.5 text-xs sm:text-sm text-slate-600 hover:text-red-600 font-medium transition-colors"
              >
                <Trash2 className="mr-1.5" size={14} />
                Limpar Carrinho
              </button>
            </div>

            {/* Seção de Bebidas */}
            {beverageProducts.length > 0 && (
              <div className="mt-4 md:mt-6">
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-2 sm:p-4 md:p-6">
                  <div className="flex items-center justify-between mb-2 sm:mb-4 md:mb-6">
                    <h2 className="text-sm sm:text-base md:text-xl font-bold text-slate-900">
                      Que tal adicionar uma bebida?
                    </h2>
                    <span className="text-[10px] sm:text-xs md:text-sm font-medium text-slate-500 bg-slate-100 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full">
                      {beverageProducts.length} {beverageProducts.length === 1 ? 'item' : 'itens'}
                    </span>
                  </div>
                  <div className="overflow-x-auto -mx-2 sm:-mx-4 md:-mx-6 px-2 sm:px-4 md:px-6">
                    <div className="flex gap-2 sm:gap-3 md:gap-4 min-w-max">
                      {beverageProducts.map((product) => {
                        const productImage = product.images?.[0]?.url;
                        const isAdding = addingProductId === product.id;
                        const isDisabled = (storeStatus && !storeStatus.isOpen) || isAdding;

                        return (
                          <div
                            key={product.id}
                            className="bg-slate-50 rounded-lg sm:rounded-xl border border-slate-200 p-2 sm:p-3 md:p-4 flex flex-col transition-all duration-200 hover:shadow-sm w-32 sm:w-36 md:w-40 flex-shrink-0"
                          >
                          <div className="w-full h-24 sm:h-28 md:h-32 rounded-md sm:rounded-lg overflow-hidden bg-slate-100 flex items-center justify-center mb-2 sm:mb-3">
                            {productImage ? (
                              <img
                                src={productImage}
                                alt={product.name}
                                className="w-full h-full object-contain"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                            ) : (
                              <Package className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 text-slate-400" />
                            )}
                          </div>
                          <div className="flex-1 flex flex-col min-h-0">
                            <h3 className="font-bold text-[11px] sm:text-xs md:text-sm text-slate-900 mb-0.5 sm:mb-1 leading-tight line-clamp-2">
                              {product.name}
                            </h3>
                            <p className="hidden sm:block text-[10px] md:text-xs text-slate-600 line-clamp-1 mb-1 sm:mb-2 md:mb-3 leading-relaxed">
                              {product.description || 'Bebida refrescante'}
                            </p>
                            <div className="flex items-center justify-between gap-1 sm:gap-2 mt-auto">
                              <span className="font-bold text-xs sm:text-sm md:text-base text-purple-600">
                                R$ {Number(product.price ?? 0).toFixed(2).replace('.', ',')}
                              </span>
                              <button
                                onClick={() => handleAddBeverage(product.id)}
                                disabled={isDisabled}
                                className={`w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 rounded-md sm:rounded-lg text-white font-semibold transition-all duration-200 flex items-center justify-center flex-shrink-0 ${
                                  isDisabled
                                    ? 'bg-slate-300 cursor-not-allowed'
                                    : 'bg-purple-600 hover:bg-purple-700 active:scale-95 cursor-pointer'
                                }`}
                                title={storeStatus && !storeStatus.isOpen ? 'Loja fechada' : isAdding ? 'Adicionando...' : 'Adicionar ao carrinho'}
                              >
                                {isAdding ? (
                                  <div className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                ) : (
                                  <ShoppingCart className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4" />
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Resumo do Pedido */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-3 md:p-6 sticky top-4">
              <h2 className="text-base md:text-xl font-bold text-slate-900 mb-3 md:mb-6">
                Resumo do Pedido
              </h2>

              {/* Detalhes do pedido */}
              <div className="space-y-2 md:space-y-4 mb-3 md:mb-6">
                <div className="flex justify-between items-center py-1.5 border-b border-slate-200">
                  <span className="text-xs md:text-base text-slate-600">Subtotal</span>
                  <span className="text-sm md:text-lg font-semibold text-slate-900">
                    R$ {total.toFixed(2)}
                  </span>
                </div>

                <div className="flex justify-between items-center py-1.5 border-b border-slate-200">
                  <span className="text-xs md:text-base text-slate-600">Taxa de entrega</span>
                  <span className="text-[10px] md:text-base text-slate-600">
                    Calculado no checkout
                  </span>
                </div>

                <div className="flex justify-between items-center pt-1.5">
                  <span className="text-sm md:text-lg font-bold text-slate-900">Total</span>
                  <span className="text-base md:text-xl font-bold text-emerald-700">
                    R$ {total.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Botões de ação */}
              <div className="space-y-2">
                <button
                  onClick={handleCheckout}
                  disabled={storeStatus && !storeStatus.isOpen}
                  className={`w-full text-sm md:text-base font-semibold py-2.5 md:py-3 px-4 rounded-lg transition-all duration-200 ${
                    storeStatus && !storeStatus.isOpen
                      ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                      : 'bg-purple-600 text-white hover:bg-purple-700 shadow-md hover:shadow-lg'
                  }`}
                >
                  {storeStatus && !storeStatus.isOpen ? (
                    <span className="flex items-center justify-center">
                      <Clock className="mr-2" size={16} />
                      Loja Fechada
                    </span>
                  ) : (
                    'Finalizar Pedido'
                  )}
                </button>

                <Link
                  to="/products"
                  className="block w-full text-center text-purple-600 text-sm md:text-base font-semibold py-2.5 md:py-3 px-4 rounded-lg hover:bg-slate-50 transition-all duration-200 border border-slate-200"
                >
                  <span className="flex items-center justify-center">
                    <ArrowLeft className="mr-2" size={16} />
                    Continuar Comprando
                  </span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart;