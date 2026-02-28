import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, ShoppingCart, Package, Truck } from 'lucide-react';
import { Product, ProductCategory } from '../types';
import { apiService } from '../services/api';
import { checkStoreStatus } from '../utils/storeUtils';
import Loading from '../components/Loading';
import CustomAcaiModal from '../components/CustomAcaiModal';
import CustomProductModal from '../components/CustomProductModal';

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

const Products: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [storeStatus, setStoreStatus] = useState<any>(null);
  const [showCustomAcaiModal, setShowCustomAcaiModal] = useState(false);
  const [showCustomSorveteModal, setShowCustomSorveteModal] = useState(false);
  const [promoFreteAtiva, setPromoFreteAtiva] = useState(false);
  const [promoFreteMensagem, setPromoFreteMensagem] = useState<string>('');

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
        const [productsData, config, categoriesApi, promoCheck] = await Promise.all([
          apiService.getProducts(),
          apiService.getStoreConfig(),
          apiService.getCategories(),
          fetch('/api/store-config/promo-frete-check').then(r => r.json()).catch(() => ({ ativa: false }))
        ]);
        setProducts(productsData || []);
        storeConfigData = config;
        
        // Verificar status da loja
        if (config) {
          const status = checkStoreStatus(config);
          setStoreStatus(status);

          // Verificar se a promoção está ativa: deve estar dentro do horário de funcionamento E ser um dia de promoção E loja aberta
          const dentroHorarioFuncionamento = isWithinStoreHours(config.openingTime || config.horaAbertura, config.closingTime || config.horaFechamento);
          if (promoCheck.ativa && status.isOpen && dentroHorarioFuncionamento) {
            setPromoFreteAtiva(true);
            setPromoFreteMensagem(promoCheck.mensagem);
          } else {
            setPromoFreteAtiva(false);
            setPromoFreteMensagem('');
          }

          // Função para atualizar status e promoção periodicamente
          const updateStatus = async () => {
            if (!storeConfigData) return;
            
            // Verificar status da loja novamente
            const currentStatus = checkStoreStatus(storeConfigData);
            setStoreStatus(currentStatus);
            
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
                const promoCheck = await fetch('/api/store-config/promo-frete-check').then(r => r.json());
                if (promoCheck.ativa && currentStatus.isOpen && dentroHorarioFuncionamento) {
                  setPromoFreteAtiva(true);
                  setPromoFreteMensagem(promoCheck.mensagem);
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
        
        // Usar categorias reais do backend
        setCategories(categoriesApi || []);
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

  useEffect(() => {
    let filtered = products;

    // Filtrar apenas produtos ativos e disponíveis hoje
    filtered = filtered.filter(product => product.isActive === true && isProductAvailableToday(product));

    // Filtrar por termo de busca
    if (searchTerm) {
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (product.description && product.description.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Filtrar por categoria
    if (selectedCategory) {
      filtered = filtered.filter(product => product.categoryId === selectedCategory);
    }

    setFilteredProducts(filtered);
  }, [products, searchTerm, selectedCategory]);

  if (loading) {
    return <Loading fullScreen text="Carregando produtos..." />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Top Banner */}
      <div className="relative h-64 md:h-72 flex items-center justify-center text-white overflow-hidden" style={{ backgroundColor: '#ea1d2c' }}>
        <div className="absolute inset-0 bg-gradient-to-br from-rose-900/20 to-red-900/20"></div>
        <div className="text-center relative z-10">
          <h1 className="text-3xl md:text-6xl font-extrabold tracking-tight mb-2">Nosso Cardápio</h1>
          <p className="mt-2 text-sm md:text-lg text-rose-100 font-light">Escolha seus produtos favoritos</p>
        </div>
      </div>

      {/* Card de informações */}
      <div className="relative z-10 -mt-12">
        <div className="max-w-5xl mx-auto bg-white rounded-2xl shadow-lg border border-slate-100 px-5 py-5 md:px-8 md:py-7">
          {/* Busca */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-slate-400" />
            </div>
            <input
              type="text"
              placeholder="O que você está procurando?"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3.5 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#ea1d2c] focus:border-transparent bg-slate-50 hover:bg-white transition-all duration-200 text-slate-900 placeholder:text-slate-400"
            />
          </div>
          
          {/* Promoção de Frete Grátis - só aparece quando a loja estiver aberta */}
          {promoFreteAtiva && storeStatus?.isOpen && (
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
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

        {/* Chips de categorias */}
        <div className="mb-6">
          <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-hide">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-200 ${selectedCategory === null ? 'bg-[#ea1d2c] text-white shadow-md shadow-rose-200' : 'bg-slate-100 text-slate-700 hover:bg-slate-200 hover:shadow-sm'}`}
            >
              Todos
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-200 ${selectedCategory === cat.id ? 'bg-[#ea1d2c] text-white shadow-md shadow-rose-200' : 'bg-slate-100 text-slate-700 hover:bg-slate-200 hover:shadow-sm'}`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Contador simples */}
        <div className="flex items-center gap-2.5 mb-8 text-slate-500">
          <div className="w-8 h-8 bg-[#ea1d2c]/10 rounded-lg flex items-center justify-center">
            <Package className="w-4 h-4 text-[#ea1d2c]" />
          </div>
          <span className="text-sm font-medium">
            <span className="text-slate-900 font-semibold">{filteredProducts.length}</span> {filteredProducts.length === 1 ? 'item' : 'itens'} disponíveis
          </span>
        </div>

        {/* Lista de produtos no estilo seções por categoria */}
        {filteredProducts.length === 0 ? (
          <div className="text-center py-24">
            <div className="w-40 h-40 bg-gradient-to-br from-rose-50 to-red-50 rounded-3xl flex items-center justify-center mx-auto mb-8 border border-rose-100">
              <Search className="w-20 h-20 text-rose-400" />
            </div>
            <h3 className="text-3xl font-bold text-slate-900 mb-4">
              Nenhum produto encontrado
            </h3>
            <p className="text-lg text-slate-600 mb-10 max-w-md mx-auto font-light">
              Que tal tentar uma busca diferente? Nossos produtos deliciosos estão esperando por você!
            </p>
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedCategory(null);
              }}
              className="px-8 py-4 bg-[#ea1d2c] text-white rounded-xl 
                       hover:bg-[#d61a28] transition-all duration-200 
                       shadow-lg hover:shadow-xl font-semibold"
            >
              Limpar Filtros
            </button>
          </div>
        ) : (
          <div>
            {/* Seções por categoria */}
            {([selectedCategory] as (number | null)[]).filter(Boolean).length > 0
              ? categories.filter(c => c.id === selectedCategory).map(category => (
                  <CategorySection
                    key={category.id}
                    title={category.name}
                    products={filteredProducts.filter(p => p.categoryId === category.id)}
                    disabled={!storeStatus?.isOpen}
                  />
                ))
              : (
                categories.map(category => (
                  <CategorySection
                    key={category.id}
                    title={category.name}
                    products={filteredProducts.filter(p => p.categoryId === category.id)}
                    disabled={!storeStatus?.isOpen}
                  />
                ))
              )}

            {/* Produtos sem categoria */}
            <CategorySection
              title="Outros"
              products={filteredProducts.filter(p => !p.categoryId)}
              disabled={!storeStatus?.isOpen}
            />
          </div>
        )}
      </div>

      {/* Modal do Açaí Personalizado */}
      <CustomAcaiModal 
        isOpen={showCustomAcaiModal} 
        onClose={() => setShowCustomAcaiModal(false)} 
      />

      {/* Modal do Sorvete Personalizado */}
      <CustomProductModal 
        isOpen={showCustomSorveteModal} 
        onClose={() => setShowCustomSorveteModal(false)} 
        productType="sorvete"
      />
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
        <span className="text-xs font-medium text-slate-500 bg-slate-100 px-3 py-1 rounded-full">{products.length} itens</span>
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
                <span className="font-bold text-base sm:text-lg text-[#ea1d2c]">
                  R$ {Number(product.price ?? 0).toFixed(2).replace('.', ',')}
                </span>
                <div
                  className={`w-9 h-9 sm:w-10 sm:h-10 rounded-md sm:rounded-lg text-white font-semibold transition-all duration-200 flex items-center justify-center ml-auto ${
                    disabled ? 'bg-slate-300 cursor-not-allowed' : 'bg-[#ea1d2c] hover:bg-[#d61a28] active:scale-95 cursor-pointer'
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

export default Products;
