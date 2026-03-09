import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Star, Truck, Heart, ShoppingCart, Instagram, Package, Clock } from 'lucide-react';
import apiService from '../services/api';
import { Product, ProductCategory } from '../types';
import Loading from '../components/Loading';
import { checkStoreStatus } from '../utils/storeUtils';

// Mapeia o dia da semana (0-6) para o valor usado em activeDays
const getDayValue = (): string => {
  const dayMap = ['D', 'S', 'T', 'Q', 'Q2', 'S2', 'S3'];
  return dayMap[new Date().getDay()];
};

// Verifica se o produto está disponível hoje
const isProductAvailableToday = (product: Product): boolean => {
  if (!product.activeDays || product.activeDays.trim() === '') return true;
  return product.activeDays.split(',').includes(getDayValue());
};

const Home: React.FC = () => {
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [isStoreOpen, setIsStoreOpen] = useState(false);
  const [storeStatusMessage, setStoreStatusMessage] = useState<string>('');
  const [promoFreteAtiva, setPromoFreteAtiva] = useState(false);
  const [promoFreteMensagem, setPromoFreteMensagem] = useState<string>('');
  const [storeName, setStoreName] = useState('Mira Delivery');
  const [storeSlogan, setStoreSlogan] = useState('');
  const [instagramUrl, setInstagramUrl] = useState('');
  const [minOrderValue, setMinOrderValue] = useState<number | null>(null);
  const [deliveryEstimate, setDeliveryEstimate] = useState<string>('');

  const formatCurrencyBR = (value: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  // Função auxiliar para verificar se está dentro do horário de funcionamento
  const isWithinStoreHours = (openingTime: string | null, closingTime: string | null): boolean => {
    if (!openingTime && !closingTime) return true; // Se não há horário configurado, considera disponível
    
    const now = new Date();
    
    if (openingTime) {
      const [h, m] = openingTime.split(':').map(Number);
      const inicio = new Date();
      inicio.setHours(h, m, 0, 0);
      if (now < inicio) {
        return false;
      }
    }
    
    if (closingTime) {
      const [h, m] = closingTime.split(':').map(Number);
      const fim = new Date();
      fim.setHours(h, m, 0, 0);
      if (now > fim) {
        return false;
      }
    }
    
    return true;
  };

  useEffect(() => {
    let intervalId: string | number | NodeJS.Timeout | undefined;
    let storeConfigData: any = null;
    
    const loadData = async () => {
      try {
        setLoading(true);
        const [productsData, categoriesData, storeData, promoCheck] = await Promise.all([
          apiService.getProducts(),
          apiService.getCategories(),
          apiService.getStoreConfig(),
          apiService.getPromoFreteCheck()
        ]);
        
        // Filtrar apenas produtos ativos, disponíveis hoje E em destaque
        const activeProducts = productsData.filter(product => product.isActive && product.isFeatured && isProductAvailableToday(product));
        setFeaturedProducts(activeProducts);
        
        // Todos os produtos ativos e disponíveis hoje
        const active = productsData.filter(product => product.isActive && isProductAvailableToday(product));
        setAllProducts(active);
        
        setCategories(categoriesData);
        storeConfigData = storeData;

        const nome = (storeData?.nomeLoja || '').trim();
        if (nome) {
          setStoreName(nome);
        }

        const slogan = (storeData?.slogan || '').toString().trim();
        setStoreSlogan(slogan);

        const insta = (storeData?.instagramUrl || '').toString().trim();
        setInstagramUrl(insta);

        const minimo = storeData?.valorPedidoMinimo;
        if (minimo === null || minimo === undefined || minimo === '') {
          setMinOrderValue(null);
        } else {
          const parsed = Number(minimo);
          setMinOrderValue(Number.isFinite(parsed) ? parsed : null);
        }

        const estimativa = (storeData?.estimativaEntrega || '').toString().trim();
        setDeliveryEstimate(estimativa);
        
        // Verificar se a loja está aberta com base no horário
        if (storeData) {
          const status = checkStoreStatus(storeData);
          setIsStoreOpen(status.isOpen);
          if (!status.isOpen && status.reason) {
            setStoreStatusMessage(status.reason);
          }

          // Verificar se a promoção está ativa: deve estar dentro do horário de funcionamento E ser um dia de promoção E loja aberta
          const dentroHorarioFuncionamento = isWithinStoreHours(storeData.openingTime || storeData.horaAbertura, storeData.closingTime || storeData.horaFechamento);
          if (promoCheck.ativa && status.isOpen && dentroHorarioFuncionamento) {
            setPromoFreteAtiva(true);
            setPromoFreteMensagem(promoCheck.mensagem ?? '');
          } else {
            setPromoFreteAtiva(false);
            setPromoFreteMensagem('');
          }

          // Função para atualizar status e promoção periodicamente
          const updateStatus = async () => {
            if (!storeConfigData) return;
            
            // Verificar status da loja novamente
            const currentStatus = checkStoreStatus(storeConfigData);
            setIsStoreOpen(currentStatus.isOpen);
            if (!currentStatus.isOpen && currentStatus.reason) {
              setStoreStatusMessage(currentStatus.reason);
            } else {
              setStoreStatusMessage('');
            }
            
            // Verificar se está dentro do horário de funcionamento
            const currentOpeningTime = storeConfigData.openingTime || storeConfigData.horaAbertura;
            const currentClosingTime = storeConfigData.closingTime || storeConfigData.horaFechamento;
            const dentroHorarioFuncionamento = isWithinStoreHours(currentOpeningTime, currentClosingTime);
            
            // Se a loja fechou ou está fora do horário de funcionamento, desativar promoção
            if (!currentStatus.isOpen || !dentroHorarioFuncionamento) {
              setPromoFreteAtiva(false);
              setPromoFreteMensagem('');
            } else {
              // Se a loja está aberta e dentro do horário de funcionamento, verificar promoção novamente
              try {
                const promoCheck = await apiService.getPromoFreteCheck();
                if (promoCheck.ativa && currentStatus.isOpen && dentroHorarioFuncionamento) {
                  setPromoFreteAtiva(true);
                  setPromoFreteMensagem(promoCheck.mensagem ?? '');
                } else {
                  setPromoFreteAtiva(false);
                  setPromoFreteMensagem('');
                }
              } catch (error) {
                // Em caso de erro, manter estado atual
              }
            }
          };

          updateStatus();
          intervalId = setInterval(updateStatus, 30000); // Atualiza a cada 30 segundos
        }
      } catch (error) {
        setPromoFreteAtiva(false);
        setPromoFreteMensagem('');
      } finally {
        setLoading(false);
      }
    };

    loadData();
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, []);

  if (loading) {
    return <Loading fullScreen text="Carregando produtos..." />;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="relative h-56 md:h-64 flex items-center justify-center text-white bg-brand">
        <div className="text-center">
          <h1 className="text-2xl md:text-5xl font-extrabold tracking-tight">{storeName}</h1>
          <p className="mt-1 text-xs md:text-base text-rose-100">
            {storeSlogan || 'Compre com praticidade e rapidez'}
          </p>
        </div>
      </div>

      {/* Card de informações */}
      <div className="relative z-10 -mt-10">
        <div className="max-w-5xl mx-auto bg-white rounded-xl shadow-md px-4 py-4 md:px-6 md:py-5">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-lg md:text-2xl font-bold text-slate-900">{storeName}</h2>
              <div className="mt-1 text-xs md:text-sm text-slate-600 flex items-center gap-2">
                {minOrderValue !== null ? (
                  <>
                    <span>Pedido mínimo</span>
                    <span className="font-semibold text-emerald-700">
                      {formatCurrencyBR(minOrderValue)}
                    </span>
                  </>
                ) : (
                  <span className="font-semibold text-emerald-700">
                    Sem pedido mínimo
                  </span>
                )}
                {deliveryEstimate && (
                  <>
                    <span className="text-slate-400">•</span>
                    <span>{deliveryEstimate}</span>
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] md:text-xs font-semibold ${isStoreOpen ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                {isStoreOpen ? 'ABERTO' : 'FECHADO'}
              </span>

              <a
                href={instagramUrl || '#'}
                target="_blank"
                rel="noreferrer"
                aria-label="Instagram"
                className={`inline-flex items-center justify-center w-9 h-9 rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50 ${
                  instagramUrl ? '' : 'opacity-50 pointer-events-none'
                }`}
              >
                <Instagram className="w-5 h-5" />
              </a>
            </div>
          </div>
          
          {/* Promoção de Frete Grátis - só aparece quando a loja estiver aberta */}
          {promoFreteAtiva && isStoreOpen && (
            <div className="mt-4 p-2.5 bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200 rounded-lg shadow-sm">
              <div className="flex items-center gap-2">
                <div className="flex-shrink-0 w-7 h-7 bg-emerald-200 rounded-full flex items-center justify-center">
                  <Truck className="w-3.5 h-3.5 text-emerald-700" />
                </div>
                <div className="flex-1">
                  <p className="text-xs md:text-sm text-emerald-900 font-semibold">
                     {promoFreteMensagem} (sem contar com taxa de entrega)
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {/* Mensagem quando a loja estiver fechada */}
          {!isStoreOpen && storeStatusMessage && (
            <div className="mt-4 p-2.5 bg-gradient-to-r from-rose-50 to-rose-100 border border-rose-200 rounded-lg shadow-sm">
              <div className="flex items-center gap-2">
                <div className="flex-shrink-0 w-7 h-7 bg-rose-200 rounded-full flex items-center justify-center">
                  <Clock className="w-3.5 h-3.5 text-rose-700" />
                </div>
                <div className="flex-1">
                  <p className="text-xs md:text-sm text-rose-900 font-semibold">
                    Loja fechada no momento. {storeStatusMessage}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Produtos em Destaque */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        <h2 className="text-xl md:text-2xl font-bold text-slate-900 mb-3 md:mb-4">Destaques</h2>
        <div className="flex gap-4 sm:gap-6 overflow-x-auto pb-2 snap-x snap-mandatory">
          {featuredProducts.map((product) => (
            <Link
              key={product.id}
              to={`/products/${product.id}`}
              className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden min-w-[48%] sm:min-w-[240px] snap-start hover:shadow-md transition-shadow duration-200"
            >
              <div className="h-28 sm:h-32 bg-slate-100 flex items-center justify-center text-3xl overflow-hidden">
                {product.images && product.images[0]?.url ? (
                  <img
                    src={product.images[0].url}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Package className="w-10 h-10 text-slate-400" />
                )}
              </div>
              <div className="p-3 md:p-4">
                <h3 className="font-semibold text-slate-900 truncate text-sm md:text-base">{product.name}</h3>
                <p className="mt-1 text-xs md:text-sm text-slate-600 line-clamp-2">{product.description}</p>
                <div className="mt-2 md:mt-3 flex items-center justify-between">
                  <span className="text-base md:text-lg font-bold text-brand">R$ {Number(product.price).toFixed(2).replace('.', ',')}</span>
                  <div
                    className={`p-2 text-white rounded-lg transition-all duration-200 ${
                      !isStoreOpen
                        ? 'bg-slate-300 cursor-not-allowed'
                        : 'bg-brand hover:bg-brand hover:shadow-md cursor-pointer'
                    }`}
                    aria-label={!isStoreOpen ? 'Loja fechada' : 'Ver detalhes'}
                  >
                    <ShoppingCart size={18} />
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Todos os Produtos */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        <h2 className="text-xl md:text-2xl font-bold text-slate-900 mb-3 md:mb-4">Produtos</h2>
        
        {/* Filtro de Categorias */}
        <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
              selectedCategory === null
                ? 'bg-brand text-white'
                : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
            }`}
          >
            Todos
          </button>
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                selectedCategory === category.id
                  ? 'bg-brand text-white'
                  : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
              }`}
            >
              {category.name}
            </button>
          ))}
        </div>

        {/* Lista de produtos no estilo seções por categoria */}
        {selectedCategory ? (
          // Se uma categoria está selecionada, mostrar apenas produtos dessa categoria
          categories
            .filter(c => c.id === selectedCategory)
            .map(category => (
              <CategorySection
                key={category.id}
                title={category.name}
                products={allProducts.filter(p => p.categoryId === category.id)}
                disabled={!isStoreOpen}
              />
            ))
        ) : (
          // Se nenhuma categoria está selecionada, mostrar todas as categorias
          <>
            {categories.map(category => (
              <CategorySection
                key={category.id}
                title={category.name}
                products={allProducts.filter(p => p.categoryId === category.id)}
                disabled={!isStoreOpen}
              />
            ))}
            {/* Produtos sem categoria */}
            {allProducts.filter(p => !p.categoryId).length > 0 && (
              <CategorySection
                title="Outros"
                products={allProducts.filter(p => !p.categoryId)}
                disabled={!isStoreOpen}
              />
            )}
          </>
        )}
      </div>

      {/* Features Section */}
      <section className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
            <div className="text-center p-5 md:p-6 bg-slate-50 rounded-lg border border-slate-200">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-2 md:mb-3">
                <Truck className="w-6 h-6 text-brand" />
              </div>
              <h3 className="text-sm md:text-base font-semibold text-slate-900 mb-1">Entrega Rápida</h3>
              <p className="text-slate-600 text-xs md:text-sm">
                Entregamos em até 30 minutos na sua casa
              </p>
            </div>
            <div className="text-center p-5 md:p-6 bg-slate-50 rounded-lg border border-slate-200">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-2 md:mb-3">
                <Heart className="w-6 h-6 text-brand" />
              </div>
              <h3 className="text-sm md:text-base font-semibold text-slate-900 mb-1">Feito com Amor</h3>
              <p className="text-slate-600 text-xs md:text-sm">
                Ingredientes frescos e preparados com carinho
              </p>
            </div>
            <div className="text-center p-5 md:p-6 bg-slate-50 rounded-lg border border-slate-200">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-2 md:mb-3">
                <Star className="w-6 h-6 text-brand" />
              </div>
              <h3 className="text-sm md:text-base font-semibold text-slate-900 mb-1">Qualidade Premium</h3>
              <p className="text-slate-600 text-xs md:text-sm">
                Produtos 100% naturais e complementos selecionados
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-14 text-white bg-brand">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-2">Pronto para fazer seu pedido?</h2>
          <p className="text-sm md:text-base mb-6 text-rose-100">Faça seu pedido agora e receba em casa rapidinho!</p>
          <Link
            to="/products"
            className="inline-flex items-center px-6 py-3 bg-white text-brand font-semibold rounded-md hover:bg-slate-100"
          >
            <ShoppingCart className="mr-2" size={18} />
            Fazer Pedido Agora
          </Link>
        </div>
      </section>
    </div>
  );
};

// Seção por categoria no estilo lista
const CategorySection: React.FC<{
  title: string;
  products: Product[];
  disabled?: boolean;
}> = ({ title, products, disabled }) => {
  if (!products || products.length === 0) return null;
  return (
    <section className="mb-8 md:mb-10">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg md:text-xl font-bold text-slate-900">{title}</h2>
        <span className="text-xs font-medium text-slate-500 bg-slate-100 px-3 py-1 rounded-full">{products.length} {products.length === 1 ? 'item' : 'itens'}</span>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:gap-4">
        {products.map((product) => (
          <Link 
            key={product.id} 
            to={`/products/${product.id}`}
            className="bg-white rounded-xl sm:rounded-2xl border border-slate-200 shadow-sm hover:shadow-md p-3 sm:p-4 flex items-center gap-3 sm:gap-4 transition-all duration-200 group cursor-pointer"
          >
            <div className="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 rounded-lg sm:rounded-xl overflow-hidden bg-slate-100 flex items-center justify-center flex-shrink-0">
              {product.images?.[0]?.url ? (
                <img
                  src={product.images[0].url}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Package className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-slate-400" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-sm sm:text-base text-slate-900 mb-1 sm:mb-2 leading-tight">{product.name}</h3>
              <p className="text-xs sm:text-sm text-slate-600 line-clamp-2 mb-2 sm:mb-3 leading-relaxed">
                {product.description || 'Produto delicioso e preparado na hora'}
              </p>
              <div className="flex items-center gap-2 sm:gap-3">
                <span className="font-bold text-base sm:text-lg text-brand">
                  R$ {Number(product.price ?? 0).toFixed(2).replace('.', ',')}
                </span>
                <div
                  className={`w-9 h-9 sm:w-10 sm:h-10 rounded-md sm:rounded-lg text-white font-semibold transition-all duration-200 flex items-center justify-center ml-auto ${
                    disabled ? 'bg-slate-300 cursor-not-allowed' : 'bg-brand hover:bg-brand active:scale-95 cursor-pointer'
                  }`}
                  title={disabled ? 'Indisponível agora' : 'Ver detalhes'}
                >
                  <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
};

export default Home;