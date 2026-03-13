import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  ShoppingCart,
  Package,
  Plus,
  Minus,
  Trash2,
  Save,
  Truck,
  Store,
  CreditCard,
  Smartphone,
  DollarSign,
  Check,
  ArrowLeft,
  X
} from 'lucide-react';
import apiService from '../../services/api';
import { useNotification } from '../../components/NotificationProvider';
import {
  Product,
  ProductCategory,
  Complement,
  Flavor,
  Additional
} from '../../types';

type SelectedFlavorMap = { [categoryId: number]: number[] };

type CartItem = {
  id: number;
  product: Product;
  quantity: number;
  complementIds: number[];
  flavorIdsByCategory: SelectedFlavorMap;
  additionals: { id: number; quantity: number }[];
  observacao: string;
  unitPrice: number;
  totalPrice: number;
};

const NovoPedidoBalcao: React.FC = () => {
  const { notify } = useNotification();
  const navigate = useNavigate();

  // Produtos / categorias
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);

  // Dados auxiliares para montagem do item (complements / flavors / additionals)
  const [complements, setComplements] = useState<Complement[]>([]);
  const [flavors, setFlavors] = useState<Flavor[]>([]);
  const [additionals, setAdditionals] = useState<Additional[]>([]);

  // Produto atualmente sendo configurado
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [selectedComplementsIds, setSelectedComplementsIds] = useState<number[]>([]);
  const [selectedFlavorsByCategory, setSelectedFlavorsByCategory] = useState<SelectedFlavorMap>({});
  const [selectedAdditionals, setSelectedAdditionals] = useState<Record<number, number>>({});
  const [observacaoItem, setObservacaoItem] = useState('');
  const [showProductsList, setShowProductsList] = useState(true);
  const lastNotifyRef = useRef<{ msg: string; ts: number }>({ msg: '', ts: 0 });

  // Carrinho local do PDV
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [cartCounter, setCartCounter] = useState(1);

  // Dados do pedido (checkout)
  const [nomeCliente, setNomeCliente] = useState('');
  const [mesaSenha, setMesaSenha] = useState('');
  const [observacaoPedido, setObservacaoPedido] = useState('');
  const [tipoEntrega, setTipoEntrega] = useState<'pickup' | 'delivery'>('pickup');
  const [metodoPagamento, setMetodoPagamento] = useState<
    'CASH_ON_DELIVERY' | 'CREDIT_CARD' | 'PIX'
  >('CASH_ON_DELIVERY');
  const [precisaTroco, setPrecisaTroco] = useState(false);
  const [valorTroco, setValorTroco] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [minOrderValue, setMinOrderValue] = useState<number | null>(null);

  // Dados de endereço para entrega
  const [ruaEntrega, setRuaEntrega] = useState('');
  const [bairroEntrega, setBairroEntrega] = useState('');
  const [numeroEntrega, setNumeroEntrega] = useState('');
  const [complementoEntrega, setComplementoEntrega] = useState('');
  const [referenciaEntrega, setReferenciaEntrega] = useState('');
  const [deliveryNeighborhoods, setDeliveryNeighborhoods] = useState<{ id: number; nome: string; taxaEntrega: number }[]>([]);
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [showAddressModal, setShowAddressModal] = useState(false);

  // Carrega produtos, categorias e bases (complementos / sabores / adicionais)
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoadingProducts(true);
        const [productsData, categoriesData, complementsData, flavorsData, additionalsData, storeConfig, neighborhoodsData] =
          await Promise.all([
            apiService.getProducts(),
            apiService.getCategories?.() ?? Promise.resolve([]),
            apiService.getComplements?.() ?? Promise.resolve([]),
            apiService.getFlavors?.() ?? Promise.resolve([]),
            apiService.getAdditionals?.() ?? Promise.resolve([]),
            apiService.getStoreConfig(),
            apiService.getDeliveryNeighborhoodsList().catch(() => [])
          ]);

        setProducts((productsData || []).filter((p: Product) => p.isActive));
        setCategories(categoriesData || []);
        setComplements(complementsData || []);
        setFlavors(flavorsData || []);
        setAdditionals((additionalsData || []).filter((a: Additional) => a.isActive !== false));
        setDeliveryNeighborhoods(Array.isArray(neighborhoodsData) ? neighborhoodsData : []);
        
        // Carregar valor mínimo do pedido
        if (storeConfig) {
          const minimo = storeConfig.valorPedidoMinimo;
          if (minimo !== undefined && minimo !== null && minimo !== '') {
            const parsed = Number(minimo);
            setMinOrderValue(Number.isFinite(parsed) && parsed > 0 ? parsed : null);
          } else {
            setMinOrderValue(null);
          }
        }
      } catch (err) {
        console.error('Erro ao carregar dados do PDV:', err);
        notify('Erro ao carregar dados para o pedido de balcão.', 'error');
      } finally {
        setIsLoadingProducts(false);
      }
    };
    loadData();
  }, [notify]);

  // Lista filtrada de produtos (busca + categoria)
  const filteredProducts = useMemo(() => {
    let filtered = products;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(term) ||
          (p.description && p.description.toLowerCase().includes(term))
      );
    }

    if (selectedCategory) {
      filtered = filtered.filter((p) => p.categoryId === selectedCategory);
    }

    return filtered;
  }, [products, searchTerm, selectedCategory]);

  const formatBRL = (value: any) => {
    const n = Number(value);
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(Number.isFinite(n) ? n : 0);
  };

  const resetCurrentItem = (keepProduct: boolean) => {
    setQuantity(1);
    setSelectedComplementsIds([]);
    setSelectedFlavorsByCategory({});
    setSelectedAdditionals({});
    setObservacaoItem('');
    if (!keepProduct) {
      setSelectedProduct(null);
    }
  };

  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product);
    resetCurrentItem(true);
    setShowProductsList(false); // Ocultar lista ao selecionar produto
  };

  const handleBackToList = () => {
    resetCurrentItem(false); // Limpar produto selecionado e configurações
    setShowProductsList(true); // Mostrar lista novamente
  };

  const toggleComplement = (id: number) => {
    setSelectedComplementsIds((prev) => {
      // Se já está selecionado, apenas remove
      if (prev.includes(id)) {
        return prev.filter((c) => c !== id);
      }

      // Respeitar limite de complementos do produto (se configurado)
      if (selectedProduct && selectedProduct.quantidadeComplementos) {
        const max = Number(selectedProduct.quantidadeComplementos) || 0;
        if (max > 0 && prev.length >= max) {
          notify(
            `Você pode escolher no máximo ${max} complemento${max > 1 ? 's' : ''} para este produto.`,
            'warning'
          );
          return prev;
        }
      }

      return [...prev, id];
    });
  };

  const toggleFlavor = (flavorId: number, categoryId: number, maxQuantity: number) => {
    setSelectedFlavorsByCategory((prev) => {
      const current = prev[categoryId] || [];

      if (current.includes(flavorId)) {
        return {
          ...prev,
          [categoryId]: current.filter((id) => id !== flavorId)
        };
      }

      if (maxQuantity > 0 && current.length >= maxQuantity) {
        notify(
          `Você pode escolher no máximo ${maxQuantity} sabor${
            maxQuantity > 1 ? 'es' : ''
          } nesta categoria.`,
          'warning'
        );
        return prev;
      }

      return {
        ...prev,
        [categoryId]: [...current, flavorId]
      };
    });
  };

  const handleAdditionalQuantityChange = (additionalId: number, delta: number, categoryId?: number) => {
    if (!selectedProduct || !selectedProduct.additionalCategories || categoryId === undefined) {
      // Se não houver categorias configuradas, permite sem limite
      setSelectedAdditionals((prev) => {
        const current = prev[additionalId] || 0;
        const next = Math.max(0, current + delta);
        const updated = { ...prev, [additionalId]: next };
        if (next === 0) {
          delete updated[additionalId];
        }
        return updated;
      });
      return;
    }

    // Encontrar a categoria e sua quantidade máxima
    const additionalCategory = selectedProduct.additionalCategories.find(ac => ac.categoryId === categoryId);
    if (!additionalCategory) return;
    
    const maxQuantity = additionalCategory.quantity || 0;
    
    // Contar quantos adicionais já estão selecionados nesta categoria
    const additional = additionals.find(a => a.id === additionalId);
    if (!additional || additional.categoryId !== categoryId) return;
    
    // Contar adicionais selecionados da mesma categoria
    const selectedInCategory = Object.entries(selectedAdditionals).reduce((count, [idStr, qty]) => {
      const id = Number(idStr);
      const add = additionals.find(a => a.id === id);
      if (add && add.categoryId === categoryId) {
        return count + (qty || 0);
      }
      return count;
    }, 0);
    
    setSelectedAdditionals((prev) => {
      const current = prev[additionalId] || 0;
      const next = current + delta;
      
      // Se está tentando aumentar, verificar limite
      if (delta > 0 && maxQuantity > 0) {
        const newTotal = selectedInCategory - current + next;
        if (newTotal > maxQuantity) {
          const message = `Você pode escolher no máximo ${maxQuantity} adicional${maxQuantity > 1 ? 'is' : ''} da categoria ${additionalCategory.categoryName}.`;
          const now = Date.now();
          if (lastNotifyRef.current.msg !== message || now - lastNotifyRef.current.ts > 1000) {
            lastNotifyRef.current = { msg: message, ts: now };
            notify(message, 'warning');
          }
          return prev;
        }
      }
      
      const finalNext = Math.max(0, next);
      const updated = { ...prev, [additionalId]: finalNext };
      if (finalNext === 0) {
        delete updated[additionalId];
      }
      return updated;
    });
  };

  const validateFlavorsForProduct = (product: Product | null): boolean => {
    if (!product || !product.receiveFlavors || !product.flavorCategories?.length) {
      return true;
    }

    const missing = product.flavorCategories.filter((fc: any) => {
      const selectedInCategory = selectedFlavorsByCategory[fc.categoryId] || [];
      return selectedInCategory.length === 0;
    });

    if (missing.length > 0) {
      const names = missing.map((m: any) => m.categoryName).join(', ');
      notify(
        `Selecione pelo menos um sabor das categoria(s): ${names}.`,
        'warning'
      );
      return false;
    }

    return true;
  };

  const calculateItemUnitPrice = (product: Product | null): number => {
    if (!product) return 0;
    const base = Number(product.price) || 0;
    const additionalsTotal = Object.entries(selectedAdditionals).reduce(
      (acc, [idStr, qty]) => {
        const addId = Number(idStr);
        const found = additionals.find((a) => a.id === addId);
        return acc + (found ? (Number(found.value) || 0) * (Number(qty) || 0) : 0);
      },
      0
    );
    return base + additionalsTotal;
  };

  const handleAddItemToCart = () => {
    if (!selectedProduct) {
      notify('Selecione um produto para adicionar ao pedido.', 'warning');
      return;
    }

    if (quantity <= 0) {
      notify('Quantidade inválida para o item.', 'warning');
      return;
    }

    if (!validateFlavorsForProduct(selectedProduct)) {
      return;
    }

    const unitPrice = calculateItemUnitPrice(selectedProduct);
    const totalPrice = unitPrice * quantity;
    const additionalsArray = Object.entries(selectedAdditionals)
      .map(([idStr, qty]) => ({ id: Number(idStr), quantity: Number(qty) }))
      .filter((a) => a.id > 0 && a.quantity > 0);

    const newItem: CartItem = {
      id: cartCounter,
      product: selectedProduct,
      quantity,
      complementIds: [...selectedComplementsIds],
      flavorIdsByCategory: { ...selectedFlavorsByCategory },
      additionals: additionalsArray,
      observacao: observacaoItem.trim(),
      unitPrice,
      totalPrice
    };

    setCartItems((prev) => [...prev, newItem]);
    setCartCounter((prev) => prev + 1);

    notify('Item adicionado ao pedido.', 'success');
    // Limpa o item em configuração e volta para a lista de produtos
    resetCurrentItem(false);
    setShowProductsList(true);
  };

  const handleRemoveCartItem = (id: number) => {
    setCartItems((prev) => prev.filter((item) => item.id !== id));
  };

  const cartSubtotal = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.totalPrice, 0),
    [cartItems]
  );

  // Calcular taxa de entrega quando bairro for selecionado
  useEffect(() => {
    if (tipoEntrega !== 'delivery' || !bairroEntrega) {
      setDeliveryFee(0);
      return;
    }

    const selectedNeighborhood = deliveryNeighborhoods.find(
      (n) => n.nome === bairroEntrega
    );
    if (selectedNeighborhood) {
      setDeliveryFee(Number(selectedNeighborhood.taxaEntrega) || 0);
    } else {
      setDeliveryFee(0);
    }
  }, [tipoEntrega, bairroEntrega, deliveryNeighborhoods]);

  const cartTotal = useMemo(
    () => cartSubtotal + (tipoEntrega === 'delivery' ? deliveryFee : 0),
    [cartSubtotal, tipoEntrega, deliveryFee]
  );

  const abaixoDoMinimo = minOrderValue != null && minOrderValue > 0 && cartSubtotal < minOrderValue;

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();

    if (cartItems.length === 0) {
      notify('Adicione pelo menos um item ao pedido.', 'error');
      return;
    }

    if (abaixoDoMinimo && minOrderValue != null) {
      const faltam = (minOrderValue - cartSubtotal).toFixed(2).replace('.', ',');
      const minimoStr = minOrderValue.toFixed(2).replace('.', ',');
      notify(`Pedido mínimo é R$ ${minimoStr}. Faltam R$ ${faltam}. Adicione mais itens.`, 'warning');
      return;
    }

    const itensPayload = cartItems.map((item) => {
      const payload: any = {
        produtoId: item.product.id,
        quantidade: item.quantity,
        complementos: item.complementIds || [],
        observacaoItem: item.observacao || undefined,
      };

      // Adicionar adicionais se houver
      if (item.additionals && Array.isArray(item.additionals) && item.additionals.length > 0) {
        console.log('📦 [PDV Frontend] Enviando adicionais para item:', item.product.name, item.additionals);
        payload.adicionals = item.additionals;
      } else {
        console.log('📦 [PDV Frontend] Item sem adicionais:', item.product.name);
      }

      // Adicionar opcoesSelecionadas se houver sabores ou observação
      if (Object.keys(item.flavorIdsByCategory).length > 0 || item.observacao) {
        payload.opcoesSelecionadas = {
          selectedFlavors: item.flavorIdsByCategory,
          observacao: item.observacao || undefined
        };
      }

      return payload;
    });

    console.log('📦 [PDV Frontend] Payload completo dos itens:', JSON.stringify(itensPayload, null, 2));

    // Validar campos de endereço se for entrega
    if (tipoEntrega === 'delivery') {
      if (!ruaEntrega.trim()) {
        notify('Informe a rua para entrega.', 'error');
        return;
      }
      if (!bairroEntrega.trim()) {
        notify('Selecione o bairro para entrega.', 'error');
        return;
      }
      if (!numeroEntrega.trim()) {
        notify('Informe o número para entrega.', 'error');
        return;
      }
    }

    const payload = {
      itens: itensPayload,
      pagamento: {
        metodoPagamento,
        precisaTroco,
        valorTroco: precisaTroco && valorTroco ? Number(valorTroco) : undefined
      },
      deliveryType: tipoEntrega,
      dadosCliente: {
        nomeClienteAvulso: nomeCliente || undefined,
        identificadorMesaSenha: mesaSenha || undefined
      },
      observacaoPedido: observacaoPedido || undefined,
      enderecoEntrega: tipoEntrega === 'delivery' ? {
        rua: ruaEntrega.trim(),
        bairro: bairroEntrega.trim(),
        numero: numeroEntrega.trim(),
        complemento: complementoEntrega.trim() || undefined,
        referencia: referenciaEntrega.trim() || undefined
      } : undefined
    };

    setIsSubmitting(true);
    try {
      await apiService.createCounterOrder(payload);

      notify('Pedido de balcão criado com sucesso!', 'success');

      // Resetar tudo
      setCartItems([]);
      setCartCounter(1);
      setNomeCliente('');
      setMesaSenha('');
      setObservacaoPedido('');
      setTipoEntrega('pickup');
      setMetodoPagamento('CASH_ON_DELIVERY');
      setPrecisaTroco(false);
      setValorTroco('');
      setRuaEntrega('');
      setBairroEntrega('');
      setNumeroEntrega('');
      setComplementoEntrega('');
      setReferenciaEntrega('');
      setDeliveryFee(0);
      resetCurrentItem(false);

      // Redirecionar para a tela de pedidos
      setTimeout(() => {
        navigate('/admin');
      }, 500);
    } catch (error: any) {
      console.error('Erro ao criar pedido de balcão:', error);
      notify(
        error?.response?.data?.message || 'Erro ao criar pedido de balcão.',
        'error'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="page">
      <header className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Novo Pedido</h2>
            <p className="text-sm text-slate-500 mt-1">
              Monte o pedido escolhendo produtos, personalizando e finalizando.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/admin')}
            className="inline-flex items-center gap-2 bg-white text-slate-700 px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors border border-slate-200 shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Coluna esquerda: lista de produtos + configuração do item */}
        <div className="lg:col-span-2 space-y-5">
          {/* Busca e categorias */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-md border border-slate-100 space-y-3">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-slate-400" />
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar produto..."
                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all"
              />
            </div>

            {categories.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                <button
                  type="button"
                  onClick={() => setSelectedCategory(null)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                    selectedCategory === null
                      ? 'bg-brand text-white shadow-sm'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Todos
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                      selectedCategory === cat.id
                        ? 'bg-brand text-white shadow-sm'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {showProductsList && (
            <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-md border border-slate-100 flex flex-col">
              {isLoadingProducts ? (
                <p className="text-xs text-slate-500">Carregando produtos...</p>
              ) : filteredProducts.length === 0 ? (
                <div className="text-center py-10">
                  <Search className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                  <p className="text-sm text-slate-500">Nenhum produto encontrado.</p>
                </div>
              ) : (
                <div className="overflow-y-auto max-h-[calc(100vh-300px)] pr-1">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {filteredProducts.map((product) => (
                      <button
                        key={product.id}
                        type="button"
                        onClick={() => handleSelectProduct(product)}
                        className={`text-left bg-white rounded-xl border-2 px-3.5 py-3.5 flex gap-3 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 ${
                          selectedProduct?.id === product.id
                            ? 'border-brand ring-2 ring-brand/20 shadow-md'
                            : 'border-slate-100 shadow-sm hover:border-slate-200'
                        }`}
                      >
                        <div className="w-16 h-16 rounded-xl overflow-hidden bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center flex-shrink-0 border border-slate-100">
                          {product.images?.[0]?.url ? (
                            <img
                              src={product.images[0].url}
                              alt={product.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Package className="w-6 h-6 text-slate-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-0.5">
                            <h3 className="text-sm font-semibold text-slate-900 truncate">
                              {product.name}
                            </h3>
                            <span className="text-xs font-bold text-brand">
                              {formatBRL(product.price)}
                            </span>
                          </div>
                          {product.description && (
                            <p className="text-[11px] text-slate-500 line-clamp-2">
                              {product.description}
                            </p>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Configuração do item selecionado (estilo ProdutoDetalhes.tsx simplificado) */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-md border border-slate-100 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                <Package className="w-4 h-4 text-brand" />
                Configuração do Item
              </h3>
              {selectedProduct && (
                <span className="text-xs text-slate-500">
                  {selectedProduct.name} — {formatBRL(selectedProduct.price)}
                </span>
              )}
            </div>

            {!selectedProduct ? (
              <p className="text-xs text-slate-500">
                Selecione um produto na lista acima para configurar o item.
              </p>
            ) : (
              <>
                {/* Quantidade */}
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Quantidade
                  </label>
                  <div className="inline-flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1">
                    <button
                      type="button"
                      onClick={() =>
                        setQuantity((prev) => (prev > 1 ? prev - 1 : prev))
                      }
                      className="w-7 h-7 rounded-md bg-white flex items-center justify-center border border-slate-200"
                      disabled={quantity <= 1}
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="min-w-[2rem] text-center text-sm font-semibold text-slate-800">
                      {quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => setQuantity((prev) => prev + 1)}
                      className="w-7 h-7 rounded-md bg-white flex items-center justify-center border border-slate-200"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Sabores (quando o produto recebe sabores) */}
                {selectedProduct.receiveFlavors &&
                  selectedProduct.flavorCategories &&
                  selectedProduct.flavorCategories.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-slate-700">
                        Sabores
                      </p>
                      {selectedProduct.flavorCategories.map((fc: any) => {
                        const categoryFlavors = flavors.filter(
                          (f) =>
                            f.categoryId === fc.categoryId && f.isActive !== false
                        );
                        if (categoryFlavors.length === 0) return null;

                        const selectedInCategory =
                          selectedFlavorsByCategory[fc.categoryId] || [];

                        return (
                          <div key={fc.categoryId} className="space-y-1.5">
                            <p className="text-[11px] font-medium text-brand">
                              {fc.categoryName} (até {fc.quantity} sabor
                              {fc.quantity > 1 ? 'es' : ''})
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {categoryFlavors.map((flavor) => {
                                const isSelected = selectedInCategory.includes(flavor.id);
                                const isDisabled =
                                  !isSelected &&
                                  fc.quantity > 0 &&
                                  selectedInCategory.length >= fc.quantity;

                                return (
                                  <button
                                    key={flavor.id}
                                    type="button"
                                    disabled={isDisabled}
                                    onClick={() =>
                                      toggleFlavor(flavor.id, fc.categoryId, fc.quantity)
                                    }
                                    className={`px-2 py-1 rounded-full border text-[11px] flex items-center gap-1 ${
                                      isSelected
                                        ? 'bg-brand text-white border-brand'
                                        : 'bg-slate-50 text-slate-700 border-slate-200'
                                    } ${isDisabled ? 'opacity-60 cursor-not-allowed' : ''}`}
                                  >
                                    <span>{flavor.name}</span>
                                    {isSelected && (
                                      <Check className="w-3 h-3 text-white" />
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                {/* Complementos */}
                {selectedProduct.receiveComplements && complements.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-slate-700">
                      Complementos
                    </p>
                    {Number((selectedProduct as any).quantidadeComplementos) > 0 && (
                      <p className="text-[11px] text-brand font-semibold">
                        Você pode escolher até{' '}
                        <span className="font-bold">
                          {Number((selectedProduct as any).quantidadeComplementos)}
                        </span>{' '}
                        complemento
                        {Number((selectedProduct as any).quantidadeComplementos) > 1 ? 's' : ''}{' '}
                        para este produto.
                      </p>
                    )}
                    <div className="flex flex-wrap gap-1.5">
                      {complements.map((comp) => (
                        <button
                          key={comp.id}
                          type="button"
                          onClick={() => toggleComplement(comp.id)}
                          className={`px-2 py-1 rounded-full border text-[11px] ${
                            selectedComplementsIds.includes(comp.id)
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                              : 'bg-slate-50 text-slate-700 border-slate-200'
                          }`}
                        >
                          {comp.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Adicionais */}
                {selectedProduct.receiveAdditionals && selectedProduct.additionalCategories && selectedProduct.additionalCategories.length > 0 && (() => {
                  // Filtrar adicionais apenas das categorias permitidas pelo produto
                  const allowedCategoryIds = selectedProduct.additionalCategories.map(ac => ac.categoryId);
                  const availableAdditionals = additionals.filter(a => 
                    a.categoryId && allowedCategoryIds.includes(a.categoryId) && a.isActive
                  );
                  
                  if (availableAdditionals.length === 0) return null;
                  
                  const renderAdditionalItem = (additional: Additional, categoryId: number) => {
                    const qty = selectedAdditionals[additional.id] || 0;
                    const additionalCategory = selectedProduct.additionalCategories?.find(ac => ac.categoryId === categoryId);
                    const maxQuantity = additionalCategory?.quantity || 0;
                    
                    // Contar adicionais selecionados da mesma categoria
                    const selectedInCategory = Object.entries(selectedAdditionals).reduce((count, [idStr, qty]) => {
                      const id = Number(idStr);
                      const add = additionals.find(a => a.id === id);
                      if (add && add.categoryId === categoryId) {
                        return count + (qty || 0);
                      }
                      return count;
                    }, 0);
                    
                    const isDisabled = maxQuantity > 0 && selectedInCategory >= maxQuantity && qty === 0;
                    
                    return (
                      <div
                        key={additional.id}
                        className={`flex items-center justify-between gap-2 border rounded-md px-2 py-1.5 transition-all ${
                          qty > 0
                            ? 'border-brand bg-brand-light'
                            : 'border-slate-200 bg-slate-50'
                        } ${isDisabled ? 'opacity-60' : ''}`}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-slate-800">
                            {additional.name}
                          </p>
                          <p className="text-[11px] text-brand font-semibold">
                            + {formatBRL(additional.value)}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleAdditionalQuantityChange(additional.id, -1, categoryId)}
                            disabled={qty <= 0}
                            className="w-6 h-6 rounded-md bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                            aria-label="Diminuir adicional"
                          >
                            <Minus className="w-3 h-3 text-slate-700" />
                          </button>
                          <span className="min-w-[1.5rem] text-center text-xs font-semibold text-slate-800">
                            {qty}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleAdditionalQuantityChange(additional.id, 1, categoryId)}
                            disabled={isDisabled}
                            className="w-6 h-6 rounded-md bg-brand hover:bg-brand text-white flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                            aria-label="Aumentar adicional"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  };

                  return (
                    <div className="space-y-1.5">
                      <p className="text-xs font-semibold text-slate-700">
                        Adicionais
                      </p>
                      <div className="space-y-2">
                        {/* Adicionais agrupados por categoria */}
                        {selectedProduct.additionalCategories.map((ac) => {
                          const categoryAdditionals = availableAdditionals.filter(a => a.categoryId === ac.categoryId);
                          if (categoryAdditionals.length === 0) return null;
                          
                          return (
                            <div key={ac.categoryId} className="space-y-1.5">
                              <p className="text-[11px] font-medium text-brand">
                                {ac.categoryName} {ac.quantity > 0 && `(máx. ${ac.quantity})`}
                              </p>
                              <div className="space-y-1">
                                {categoryAdditionals.map(additional => renderAdditionalItem(additional, ac.categoryId))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

                {/* Observação do item */}
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Observação do item (opcional)
                  </label>
                  <input
                    type="text"
                    value={observacaoItem}
                    onChange={(e) => setObservacaoItem(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none transition-all"
                    placeholder="Ex: sem cebola, bem passado..."
                  />
                </div>

                {/* Botões de ação */}
                <div className="flex justify-between items-center pt-1 gap-2">
                  <button
                    type="button"
                    onClick={handleBackToList}
                    className="inline-flex items-center gap-2 bg-white text-slate-700 px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-50 border border-slate-200 transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Voltar
                  </button>
                  <button
                    type="button"
                    onClick={handleAddItemToCart}
                    className="inline-flex items-center gap-2 bg-brand text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:brightness-110 shadow-md shadow-brand/20 transition-all"
                  >
                    <ShoppingCart className="w-4 h-4" />
                    Adicionar ao Pedido
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Coluna direita: carrinho + checkout */}
        <form
          onSubmit={handleSubmitOrder}
          className="space-y-5 lg:sticky lg:top-6 lg:self-start"
        >
          {/* Carrinho */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-md border border-slate-100 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-brand" />
                Itens do Pedido
              </h3>
              <span className="bg-brand/10 text-brand text-xs font-bold px-2.5 py-1 rounded-full">
                {cartItems.length} {cartItems.length === 1 ? 'item' : 'itens'}
              </span>
            </div>

            {cartItems.length === 0 ? (
              <p className="text-xs text-slate-500">
                Nenhum item no carrinho. Adicione produtos na coluna ao lado.
              </p>
            ) : (
              <div className="space-y-2">
                {cartItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start justify-between gap-2 border border-slate-100 rounded-xl px-3 py-3 bg-gradient-to-r from-slate-50 to-white shadow-sm"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-brand">
                          {item.quantity}x
                        </span>
                        <span className="text-xs font-semibold text-slate-800 truncate">
                          {item.product.name}
                        </span>
                      </div>
                      {item.observacao && (
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          Obs: {item.observacao}
                        </p>
                      )}
                      {item.complementIds.length > 0 && (
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          Comp: {item.complementIds.length} selecionado
                          {item.complementIds.length > 1 ? 's' : ''}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <span className="text-xs font-bold text-slate-800">
                        {formatBRL(item.totalPrice)}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveCartItem(item.id)}
                        className="p-1 rounded-md text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}

                <div className="flex items-center justify-between border-t border-slate-200 pt-2 mt-1">
                  <span className="text-xs font-semibold text-slate-700">
                    Subtotal
                  </span>
                  <span className="text-sm font-bold text-brand">
                    {formatBRL(cartSubtotal)}
                  </span>
                </div>
                {tipoEntrega === 'delivery' && deliveryFee > 0 && (
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs font-semibold text-slate-700">
                      Taxa de entrega
                    </span>
                    <span className="text-sm font-bold text-slate-800">
                      {formatBRL(deliveryFee)}
                    </span>
                  </div>
                )}
                {tipoEntrega === 'delivery' && (
                  <div className="flex items-center justify-between border-t border-slate-200 pt-2 mt-1">
                    <span className="text-xs font-bold text-slate-800">
                      Total
                    </span>
                    <span className="text-sm font-bold text-brand">
                      {formatBRL(cartTotal)}
                    </span>
                  </div>
                )}
                {abaixoDoMinimo && minOrderValue != null && (
                  <p className="text-[10px] text-amber-600 font-medium pt-1 border-t border-slate-100">
                    Pedido mínimo: {formatBRL(minOrderValue)}. Faltam {formatBRL(minOrderValue - cartSubtotal)}.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Checkout / dados do cliente e pagamento */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-md border border-slate-100 space-y-4">
            <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-brand" />
              Dados do Pedido & Pagamento
            </h3>

            {/* Tipo de entrega */}
            <div className="space-y-1">
              <p className="text-[11px] font-medium text-slate-600">
                Tipo de Pedido
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => { setTipoEntrega('pickup'); setDeliveryFee(0); }}
                  className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold border-2 transition-all ${
                    tipoEntrega === 'pickup'
                      ? 'border-green-500 bg-green-50 text-green-700 shadow-sm'
                      : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <Store className="w-4 h-4" />
                  Retirada
                </button>
                <button
                  type="button"
                  onClick={() => { setTipoEntrega('delivery'); setShowAddressModal(true); }}
                  className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold border-2 transition-all ${
                    tipoEntrega === 'delivery'
                      ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm'
                      : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <Truck className="w-4 h-4" />
                  Entrega
                </button>
              </div>
            </div>

            {/* Resumo do endereço quando preenchido */}
            {tipoEntrega === 'delivery' && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-2.5">
                {ruaEntrega && bairroEntrega && numeroEntrega ? (
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-blue-800 mb-1">
                        Endereço de Entrega
                      </p>
                      <p className="text-[11px] text-blue-700">
                        {ruaEntrega}, {numeroEntrega}
                        {complementoEntrega && ` - ${complementoEntrega}`}
                      </p>
                      <p className="text-[11px] text-blue-700">
                        {bairroEntrega}
                        {deliveryFee > 0 && ` • Taxa: ${formatBRL(deliveryFee)}`}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowAddressModal(true)}
                      className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                    >
                      Editar
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-blue-700">
                      Clique em "Entrega" para adicionar o endereço
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowAddressModal(true)}
                      className="text-xs text-blue-600 hover:text-blue-800 font-medium underline"
                    >
                      Adicionar
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Nome do cliente */}
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">
                Nome do Cliente
              </label>
              <input
                type="text"
                value={nomeCliente}
                onChange={(e) => setNomeCliente(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none transition-all"
                placeholder="Ex: João"
              />
            </div>

            {/* Pagamento */}
            <div className="space-y-1.5">
              <p className="text-[11px] font-medium text-slate-600">
                Forma de Pagamento
              </p>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setMetodoPagamento('CREDIT_CARD')}
                  className={`flex flex-col items-center gap-1.5 px-2 py-2.5 rounded-xl text-[11px] font-semibold border-2 transition-all ${
                    metodoPagamento === 'CREDIT_CARD'
                      ? 'border-purple-500 bg-purple-50 text-purple-700 shadow-sm'
                      : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <CreditCard className="w-4 h-4" />
                  Cartão
                </button>
                <button
                  type="button"
                  onClick={() => setMetodoPagamento('PIX')}
                  className={`flex flex-col items-center gap-1.5 px-2 py-2.5 rounded-xl text-[11px] font-semibold border-2 transition-all ${
                    metodoPagamento === 'PIX'
                      ? 'border-green-500 bg-green-50 text-green-700 shadow-sm'
                      : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <Smartphone className="w-4 h-4" />
                  PIX
                </button>
                <button
                  type="button"
                  onClick={() => setMetodoPagamento('CASH_ON_DELIVERY')}
                  className={`flex flex-col items-center gap-1.5 px-2 py-2.5 rounded-xl text-[11px] font-semibold border-2 transition-all ${
                    metodoPagamento === 'CASH_ON_DELIVERY'
                      ? 'border-amber-500 bg-amber-50 text-amber-700 shadow-sm'
                      : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <DollarSign className="w-4 h-4" />
                  Dinheiro
                </button>
              </div>

              {/* Troco */}
              {metodoPagamento === 'CASH_ON_DELIVERY' && (
                <div className="mt-1 space-y-1">
                  <label className="inline-flex items-center gap-2 text-[11px] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={precisaTroco}
                      onChange={(e) => {
                        setPrecisaTroco(e.target.checked);
                        if (!e.target.checked) setValorTroco('');
                      }}
                    />
                    <span>Precisa de troco?</span>
                  </label>
                  {precisaTroco && (
                    <div>
                      <label className="block text-[11px] text-slate-600 mb-1">
                        Troco para quanto?
                      </label>
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        value={valorTroco}
                        onChange={(e) => setValorTroco(e.target.value)}
                        className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-xs"
                        placeholder="Valor que o cliente vai pagar (ex: 100)"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Observação do pedido */}
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">
                Observação geral do pedido (opcional)
              </label>
              <textarea
                value={observacaoPedido}
                onChange={(e) => setObservacaoPedido(e.target.value)}
                rows={3}
                className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none resize-none transition-all"
                placeholder="Ex: separar refrigerantes, cortar pizza em 12 pedaços..."
              />
            </div>

            {/* Botão de finalizar */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting || cartItems.length === 0 || abaixoDoMinimo}
                className={`w-full inline-flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl text-sm font-bold transition-all ${
                  abaixoDoMinimo
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    : 'bg-brand text-white hover:brightness-110 shadow-lg shadow-brand/25 disabled:opacity-60'
                }`}
              >
                <Save className="w-4 h-4" />
                {isSubmitting
                  ? 'Criando pedido...'
                  : abaixoDoMinimo && minOrderValue != null
                  ? `Pedido mínimo: ${formatBRL(minOrderValue)}`
                  : `Criar Pedido (${formatBRL(tipoEntrega === 'delivery' ? cartTotal : cartSubtotal)})`}
              </button>
              {abaixoDoMinimo && minOrderValue != null && (
                <p className="text-[10px] text-amber-600 font-medium mt-1 text-center">
                  Adicione mais itens para atingir o pedido mínimo.
                </p>
              )}
            </div>
          </div>
        </form>
      </div>

      {/* Modal de Endereço de Entrega */}
      {showAddressModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                <Truck className="w-5 h-5 text-blue-600" />
                Endereço de Entrega
              </h3>
              <button
                type="button"
                onClick={() => {
                  // Se não tiver endereço preenchido, voltar para retirada
                  if (!ruaEntrega.trim() || !bairroEntrega.trim() || !numeroEntrega.trim()) {
                    setTipoEntrega('pickup');
                    setDeliveryFee(0);
                    setRuaEntrega('');
                    setBairroEntrega('');
                    setNumeroEntrega('');
                    setComplementoEntrega('');
                    setReferenciaEntrega('');
                  }
                  setShowAddressModal(false);
                }}
                className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="p-4 space-y-3 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Rua *
                </label>
                <input
                  type="text"
                  value={ruaEntrega}
                  onChange={(e) => setRuaEntrega(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand focus:border-brand"
                  placeholder="Ex: Rua das Flores"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Bairro *
                </label>
                <select
                  value={bairroEntrega}
                  onChange={(e) => setBairroEntrega(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand focus:border-brand"
                >
                  <option value="">Selecione o bairro</option>
                  {deliveryNeighborhoods.map((bairro) => (
                    <option key={bairro.id} value={bairro.nome}>
                      {bairro.nome} — {formatBRL(bairro.taxaEntrega)}
                    </option>
                  ))}
                </select>
                {deliveryNeighborhoods.length === 0 && (
                  <p className="text-xs text-amber-600 mt-1">
                    Nenhum bairro cadastrado. Configure os bairros nas configurações da loja.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Número *
                </label>
                <input
                  type="text"
                  value={numeroEntrega}
                  onChange={(e) => setNumeroEntrega(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand focus:border-brand"
                  placeholder="Ex: 123"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Complemento
                </label>
                <input
                  type="text"
                  value={complementoEntrega}
                  onChange={(e) => setComplementoEntrega(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand focus:border-brand"
                  placeholder="Ex: Apt 101, Bloco A"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Referência
                </label>
                <input
                  type="text"
                  value={referenciaEntrega}
                  onChange={(e) => setReferenciaEntrega(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand focus:border-brand"
                  placeholder="Ex: Próximo ao mercado"
                />
              </div>

              {deliveryFee > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm font-semibold text-blue-800">
                    Taxa de Entrega: {formatBRL(deliveryFee)}
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 p-4 border-t border-slate-200">
              <button
                type="button"
                onClick={() => {
                  // Se não tiver endereço preenchido, voltar para retirada
                  if (!ruaEntrega.trim() || !bairroEntrega.trim() || !numeroEntrega.trim()) {
                    setTipoEntrega('pickup');
                    setDeliveryFee(0);
                    setRuaEntrega('');
                    setBairroEntrega('');
                    setNumeroEntrega('');
                    setComplementoEntrega('');
                    setReferenciaEntrega('');
                  }
                  setShowAddressModal(false);
                }}
                className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg font-semibold hover:bg-slate-300 transition-colors text-sm"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!ruaEntrega.trim() || !bairroEntrega.trim() || !numeroEntrega.trim()) {
                    notify('Preencha todos os campos obrigatórios (Rua, Bairro e Número).', 'error');
                    return;
                  }
                  setShowAddressModal(false);
                }}
                className="px-4 py-2 bg-brand text-white rounded-lg font-semibold hover:bg-brand transition-colors text-sm"
              >
                Salvar Endereço
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NovoPedidoBalcao;