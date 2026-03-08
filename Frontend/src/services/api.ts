import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { 
  User, 
  Product, 
  CartItem, 
  Order, 
  Address, 
  LoginForm, 
  RegisterForm, 
  AddressForm,
  LoginResponse,
  CartResponse,
  ProductCategory,
  ApiResponse 
} from '../types';

class ApiService {
  private api: AxiosInstance;

  constructor() {
    // Validação e sanitização da URL da API
    const getApiBaseUrl = (): string => {
      const envUrl = import.meta.env.VITE_API_URL;
      
      // Se vazio ou undefined, usar /api (mesma origem via nginx)
      if (!envUrl || envUrl === '') {
        return '/api';
      }
      
      // Se contém placeholder ou URL inválida, usar /api
      if (envUrl.includes('sua-url') || 
          envUrl.includes('placeholder') || 
          envUrl.includes('example.com') ||
          (envUrl.includes('ondigitalocean.app') && envUrl.includes('sua-url'))) {
        console.warn('VITE_API_URL contém URL inválida/placeholder. Usando /api (mesma origem).');
        return '/api';
      }
      
      // Validar se é uma URL válida
      try {
        new URL(envUrl); // Valida se é uma URL válida
        // Se for uma URL válida, usar ela
        return envUrl;
      } catch {
        // Se não for uma URL válida, usar /api
        console.warn('VITE_API_URL não é uma URL válida. Usando /api (mesma origem).');
        return '/api';
      }
    };

    this.api = axios.create({
      // Produção: VITE_API_URL vazio = mesma origem; baseURL /api para o nginx fazer proxy ao backend.
      baseURL: getApiBaseUrl(),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // 🌟 MULTI-TENANT: Interceptor para adicionar token E identificar a loja!
    this.api.interceptors.request.use(
      (config) => {
        // 1. Adiciona o Token de autenticação (se existir)
        const token = localStorage.getItem('token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }

        // 2. Descobre de qual loja (tenant) o cliente está acessando — subdomínio completo (ex: "loja.cidade")
        if (typeof window !== 'undefined') {
          const hostname = window.location.hostname;
          const BASE_DOMAIN = 'miradelivery.com.br';
          const suffixBase = `.${BASE_DOMAIN}`;
          let subdomain: string | null = null;

          if (hostname === 'localhost' || /^(\d{1,3}\.){3}\d{1,3}$/.test(hostname)) {
            subdomain = null;
          } else if (hostname === BASE_DOMAIN || hostname === `www.${BASE_DOMAIN}`) {
            subdomain = null;
          } else if (hostname.endsWith(suffixBase)) {
            const idx = hostname.indexOf(suffixBase);
            subdomain = idx > 0 ? hostname.slice(0, idx) : null;
          } else if (hostname.endsWith('.localhost')) {
            const idx = hostname.indexOf('.localhost');
            subdomain = idx > 0 ? hostname.slice(0, idx) : null;
          }

          if (subdomain && subdomain !== 'www' && subdomain !== '') {
            config.headers['x-loja-subdominio'] = subdomain.toLowerCase();
          }
        }

        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Interceptor para tratar respostas de erro
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        // Só remove o token se for realmente um erro de autenticação (401)
        // E não é uma rota pública (login, register, etc)
        if (error.response?.status === 401) {
          const url = error.config?.url || '';
          const isPublicRoute = url.includes('/auth/login') || 
                               url.includes('/auth/register') || 
                               url.includes('/auth/forgot-password') ||
                               url.includes('/auth/reset-password');
          const isProfileRoute = url.includes('/auth/profile');
          
          // Não deslogar por 401 em /auth/profile (evita deslogar logo após login por race ou falha pontual)
          if (isProfileRoute) {
            return Promise.reject(error);
          }
          
          if (!isPublicRoute) {
            const currentPath = window.location.pathname;
            if (!currentPath.includes('/login') && !currentPath.includes('/cadastrar')) {
              localStorage.removeItem('token');
              localStorage.removeItem('user');
              if (currentPath !== '/login' && currentPath !== '/cadastrar') {
                window.location.href = '/login';
              }
            }
          }
        }
        return Promise.reject(error);
      }
    );
  }

  // Auth endpoints
  async login(credentials: LoginForm): Promise<LoginResponse> {
    const response: AxiosResponse<LoginResponse> = await this.api.post('/auth/login', credentials);
    return response.data;
  }

  async loginWithSubdomain(subdominio: string, credentials: LoginForm): Promise<LoginResponse> {
    const response: AxiosResponse<LoginResponse> = await this.api.post('/auth/login', credentials, {
      headers: {
        'x-loja-subdominio': subdominio,
      },
    });
    return response.data;
  }

async registerStore(data: { nomeLoja: string, subdominioDesejado: string, username: string, telefone: string, password: string, email?: string }) {
    const response = await this.api.post('/auth/register-store', data);
    return response.data;
  }

  async register(userData: RegisterForm): Promise<ApiResponse<User>> {
    const response: AxiosResponse<ApiResponse<User>> = await this.api.post('/auth/register', userData);
    return response.data;
  }

  async getProfile(): Promise<User> {
    const response: AxiosResponse<User> = await this.api.get('/auth/profile');
    return response.data;
  }

  async updatePhone(phone: string): Promise<ApiResponse<User>> {
    const response: AxiosResponse<ApiResponse<User>> = await this.api.put('/auth/profile/phone', { phone });
    return response.data;
  }

  async updateProfile(data: { nomeUsuario?: string; email?: string; senhaAtual?: string; novaSenha?: string }): Promise<{ message: string; user: any }> {
    const response = await this.api.put('/auth/profile', data);
    return response.data;
  }

  async forgotPassword(email: string): Promise<{ message: string }> {
    const response: AxiosResponse<{ message: string }> = await this.api.post('/auth/forgot-password', { email });
    return response.data;
  }

  async resetPassword(email: string, code: string, newPassword: string): Promise<{ message: string }> {
    const response: AxiosResponse<{ message: string }> = await this.api.post('/auth/reset-password', {
      email,
      code,
      newPassword
    });
    return response.data;
  }

  async verifyResetCode(email: string, code: string): Promise<{ valid: boolean; message?: string }> {
    const response: AxiosResponse<{ valid: boolean; message?: string }> = await this.api.post('/auth/verify-reset-code', {
      email,
      code
    });
    return response.data;
  }

  async getUsers(): Promise<User[]> {
    const response: AxiosResponse<User[]> = await this.api.get('/auth/users');
    return response.data;
  }

  // Address endpoints
  async addAddress(addressData: AddressForm): Promise<{ user: User }> {
    const response = await this.api.post('/auth/profile/address', addressData);
    return response.data;
  }

  async getAddresses(): Promise<Address[]> {
    const response: AxiosResponse<Address[]> = await this.api.get('/auth/profile/addresses');
    return response.data;
  }

  async updateAddress(addressId: number, addressData: AddressForm): Promise<ApiResponse<Address>> {
    const response: AxiosResponse<ApiResponse<Address>> = await this.api.put(`/auth/profile/address/${addressId}`, addressData);
    return response.data;
  }

  async deleteAddress(addressId: number): Promise<{ message: string; addresses: Address[] }> {
    const response: AxiosResponse<{ message: string; addresses: Address[] }> = await this.api.delete(`/auth/profile/address/${addressId}`);
    return response.data;
  }

  // Product endpoints
  async getProducts(): Promise<Product[]> {
    const response = await this.api.get('/products');
    const data = response.data || [];
    return data.map((p: any) => ({
      id: p.id,
      name: p.name,
      price: Number(p.price),
      description: p.description ?? '',
      isActive: Boolean(p.isActive),
      isFeatured: Boolean(p.isFeatured),
      receiveComplements: Boolean(p.receiveComplements),
      quantidadeComplementos: p.quantidadeComplementos ?? 0,
      receiveFlavors: Boolean(p.receiveFlavors),
      receiveAdditionals: Boolean(p.receiveAdditionals),
      activeDays: p.activeDays || null,
      flavorCategories: Array.isArray(p.flavorCategories)
        ? p.flavorCategories.map((fc: any) => ({
            categoryId: fc.categoryId,
            categoryName: fc.categoryName,
            quantity: fc.quantity
          }))
        : [],
      createdAt: p.createdAt || new Date().toISOString(),
      categoryId: p.categoryId ?? null,
      category: p.category ? { id: p.category.id, name: p.category.name } : undefined,
      images: Array.isArray(p.images)
        ? p.images.map((img: any) => ({ id: img.id, url: img.url, altText: img.altText || '' }))
        : [],
    }));
  }

  async getProductById(id: number): Promise<Product> {
    const response = await this.api.get(`/products/${id}`);
    const p = response.data;
    return {
      id: p.id,
      name: p.name,
      price: Number(p.price),
      description: p.description ?? '',
      isActive: Boolean(p.isActive),
      isFeatured: Boolean(p.isFeatured),
      quantidadeComplementos: p.quantidadeComplementos ?? 0,
      receiveComplements: Boolean(p.receiveComplements),
      receiveFlavors: Boolean(p.receiveFlavors),
      receiveAdditionals: Boolean(p.receiveAdditionals),
      activeDays: p.activeDays || null,
      flavorCategories: Array.isArray(p.flavorCategories)
        ? p.flavorCategories.map((fc: any) => ({
            categoryId: fc.categoryId,
            categoryName: fc.categoryName,
            quantity: fc.quantity
          }))
        : [],
      createdAt: p.createdAt || new Date().toISOString(),
      categoryId: p.categoryId ?? null,
      category: p.category ? { id: p.category.id, name: p.category.name } : undefined,
      images: Array.isArray(p.images)
        ? p.images.map((img: any) => ({ id: img.id, url: img.url, altText: img.altText || '' }))
        : [],
    };
  }

  async getProductsByCategory(categoryId: number): Promise<Product[]> {
    const response = await this.api.get(`/products/category/${categoryId}`);
    const data = response.data || [];
    return data.map((p: any) => ({
      id: p.id,
      name: p.name,
      price: Number(p.price),
      description: p.description ?? '',
      isActive: Boolean(p.isActive),
      isFeatured: Boolean(p.isFeatured),
      quantidadeComplementos: p.quantidadeComplementos ?? 0,
      receiveComplements: Boolean(p.receiveComplements),
      receiveFlavors: Boolean(p.receiveFlavors),
      receiveAdditionals: Boolean(p.receiveAdditionals),
      activeDays: p.activeDays || null,
      flavorCategories: Array.isArray(p.flavorCategories)
        ? p.flavorCategories.map((fc: any) => ({
            categoryId: fc.categoryId,
            categoryName: fc.categoryName,
            quantity: fc.quantity
          }))
        : [],
      createdAt: p.createdAt || new Date().toISOString(),
      categoryId: p.categoryId ?? null,
      category: p.category ? { id: p.category.id, name: p.category.name } : undefined,
      images: Array.isArray(p.images)
        ? p.images.map((img: any) => ({ id: img.id, url: img.url, altText: img.altText || '' }))
        : [],
    }));
  }

  async createProduct(formData: FormData): Promise<Product> {
    const response = await this.api.post('/products/add', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  }

  async updateProduct(id: number, formData: FormData): Promise<Product> {
    const response = await this.api.put(`/products/update/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  }

  async deleteProduct(id: number): Promise<ApiResponse<any>> {
    const response: AxiosResponse<ApiResponse<any>> = await this.api.delete(`/products/delete/${id}`);
    return response.data;
  }

  async addCategory(name: string): Promise<ProductCategory> {
    const response: AxiosResponse<ProductCategory> = await this.api.post('/products/categories/add', { nome: name });
    return response.data;
  }

  async updateCategory(id: number, name: string): Promise<ProductCategory> {
    const response: AxiosResponse<ProductCategory> = await this.api.put(`/products/categories/${id}`, { nome: name });
    return response.data;
  }

  async deleteCategory(id: number): Promise<ApiResponse<any>> {
    const response: AxiosResponse<ApiResponse<any>> = await this.api.delete(`/products/categories/${id}`);
    return response.data;
  }

  async getCategories(): Promise<ProductCategory[]> {
    const response: AxiosResponse<ProductCategory[]> = await this.api.get('/products/categories');
    return response.data;
  }

  // Cart endpoints
  async getCart(): Promise<CartResponse> {
    const response: AxiosResponse<CartResponse> = await this.api.get('/cart');
    return response.data;
  }

  async addToCart(
    productId: number,
    quantity: number,
    complementIds?: number[],
    selectedFlavors?: { [categoryId: number]: number[] },
    additionalItems?: { id: number; quantity: number }[]
  ): Promise<ApiResponse<CartItem>> {
    const response: AxiosResponse<ApiResponse<CartItem>> = await this.api.post('/cart/add', {
      produtoId: productId,
      quantity,
      complementIds: complementIds || [],
      selectedFlavors: selectedFlavors || {},
      additionalItems: additionalItems || [],
    });
    return response.data;
  }

  async addCustomAcaiToCart(customAcai: any, quantity: number): Promise<ApiResponse<CartItem>> {
    const response: AxiosResponse<ApiResponse<CartItem>> = await this.api.post('/cart/add-custom-acai', {
      value: customAcai.value,
      selectedComplements: customAcai.selectedComplements,
      complementNames: customAcai.complementNames,
      quantity,
    });
    return response.data;
  }

  async addCustomProductToCart(productName: string, customProduct: any, quantity: number): Promise<ApiResponse<CartItem>> {
    const response: AxiosResponse<ApiResponse<CartItem>> = await this.api.post('/cart/add-custom-product', {
      productName,
      value: customProduct.value,
      selectedComplements: customProduct.selectedComplements,
      complementNames: customProduct.complementNames,
      quantity,
    });
    return response.data;
  }

  async updateCartItem(cartItemId: number, quantity: number): Promise<ApiResponse<CartItem>> {
    const response: AxiosResponse<ApiResponse<CartItem>> = await this.api.put(`/cart/update/${cartItemId}`, {
      quantity,
    });
    return response.data;
  }

  async removeFromCart(cartItemId: number): Promise<ApiResponse<any>> {
    const response: AxiosResponse<ApiResponse<any>> = await this.api.delete(`/cart/remove/${cartItemId}`);
    return response.data;
  }

  async clearCart(): Promise<ApiResponse<any>> {
    const response: AxiosResponse<ApiResponse<any>> = await this.api.delete('/cart/clear');
    return response.data;
  }

  // Order endpoints
  async createOrder(orderData: { 
    items: CartItem[]; 
    paymentMethod: string; 
    addressId: number | undefined; 
    deliveryType?: string;
    deliveryFee?: number;
    notes?: string;
    precisaTroco?: boolean;
    valorTroco?: number;
  }): Promise<ApiResponse<Order>> {
    const response: AxiosResponse<ApiResponse<Order>> = await this.api.post('/orders', orderData);
    return response.data;
  }

  async getOrderHistory(): Promise<Order[]> {
    const response: AxiosResponse<Order[]> = await this.api.get('/orders/history');
    return response.data;
  }

  async cancelOrder(orderId: number): Promise<ApiResponse<Order>> {
    const response: AxiosResponse<ApiResponse<Order>> = await this.api.put(`/orders/cancel/${orderId}`);
    return response.data;
  }

  async deleteOrder(orderId: number): Promise<ApiResponse<any>> {
    const response: AxiosResponse<ApiResponse<any>> = await this.api.delete(`/orders/${orderId}`);
    return response.data;
  }

  // Admin order editing methods
  async updateOrderTotal(orderId: number, totalPrice: number): Promise<ApiResponse<Order>> {
    try {
      const response: AxiosResponse<ApiResponse<Order>> = await this.api.put(`/orders/${orderId}/update-total`, { totalPrice });
      return response.data;
    } catch (error: any) {
      console.error('Erro ao atualizar valor do pedido:', error);
      throw error;
    }
  }

  async addItemToOrder(orderId: number, data: { productId: number; quantity: number; complementIds?: number[]; price?: number }): Promise<ApiResponse<Order>> {
    try {
      const response: AxiosResponse<ApiResponse<Order>> = await this.api.post(`/orders/${orderId}/add-item`, data);
      return response.data;
    } catch (error: any) {
      console.error('Erro ao adicionar item ao pedido:', error);
      throw error;
    }
  }

  async removeItemFromOrder(orderId: number, itemId: number): Promise<ApiResponse<Order>> {
    try {
      const response: AxiosResponse<ApiResponse<Order>> = await this.api.delete(`/orders/${orderId}/remove-item/${itemId}`);
      return response.data;
    } catch (error: any) {
      console.error('Erro ao remover item do pedido:', error);
      throw error;
    }
  }

  // Order endpoints - Admin
  async getOrdersAdmin(): Promise<Order[]> {
    const response: AxiosResponse<Order[]> = await this.api.get('/orders/orders');
    return response.data;
  }

  // Order endpoints - User
  async getOrders(): Promise<Order[]> {
    const response: AxiosResponse<Order[]> = await this.api.get('/orders/history');
    return response.data;
  }

  async advanceOrderStatus(orderId: number, nextStatus: string, delivererId?: number): Promise<Order> {
    const response = await this.api.put(`/orders/${orderId}`, { 
      status: nextStatus,
      ...(delivererId && { delivererId })
    });
    return response.data;
  }

  async getPendingOrders() {
    const response = await this.api.get('/orders/pending-count');
    return response.data.count;
  }

  async updateOrderStatus(orderId: number, status: string, delivererId?: number): Promise<ApiResponse<Order>> {
    const response: AxiosResponse<ApiResponse<Order>> = await this.api.put(`/orders/${orderId}`, {
      status,
      ...(delivererId && { delivererId }),
    });
    return response.data;
  }

  // Insights endpoints
  async getDailySales(date: string) {
    const response = await this.api.get(`/insights/daily-sales/${date}`);
    return response.data;
  }

  async getProductSales(date: string) {
    const response = await this.api.get(`/insights/product-sales/${date}`);
    return response.data;
  }

  async getCategorySales(date: string) {
    const response = await this.api.get(`/insights/category-sales/${date}`);
    return response.data;
  }

  // Store Config endpoints
  async getPromoFreteCheck(): Promise<{ ativa: boolean; mensagem?: string | null; valorMinimo?: number | null }> {
    try {
      const response = await this.api.get('/store-config/promo-frete-check');
      return response.data ?? { ativa: false, mensagem: null, valorMinimo: null };
    } catch {
      return { ativa: false, mensagem: null, valorMinimo: null };
    }
  }

  async getStoreConfig() {
    const defaultConfig = {
      isOpen: true,
      openingTime: '',
      closingTime: '',
      openDays: '',
      logoUrl: null as string | null,
      slogan: '',
      instagramUrl: '',
      ruaLoja: '',
      bairroLoja: '',
      numeroLoja: '',
      pontoReferenciaLoja: '',
      nomeLoja: 'Loja',
      corPrimaria: '',
      taxaEntrega: 0,
      valorPedidoMinimo: null as number | null,
      estimativaEntrega: '',
      deliveryAtivo: true,
      horaEntregaInicio: '',
      horaEntregaFim: '',
      diasAbertos: '',
      horaAbertura: '',
      horaFechamento: '',
      aberto: true,
    };
    try {
      const response = await this.api.get('/store-config');
      const data = response.data || {};
      return {
        isOpen: data.isOpen ?? data.aberto ?? true,
        openingTime: data.openingTime ?? data.horaAbertura ?? '',
        closingTime: data.closingTime ?? data.horaFechamento ?? '',
        openDays: data.openDays ?? data.diasAbertos ?? '',
        logoUrl: data.logoUrl ?? null,
        slogan: data.slogan ?? '',
        instagramUrl: data.instagramUrl ?? '',
        ruaLoja: data.ruaLoja ?? '',
        bairroLoja: data.bairroLoja ?? '',
        numeroLoja: data.numeroLoja ?? '',
        pontoReferenciaLoja: data.pontoReferenciaLoja ?? '',
        ...data,
      };
    } catch (err) {
      // 502 Bad Gateway, rede ou backend indisponível: retorna config padrão para a app não quebrar
      console.warn('[getStoreConfig] Falha ao carregar configuração da loja (ex.: 502). Usando valores padrão.', err);
      return { ...defaultConfig };
    }
  }

  async updateStoreConfig(data: any) {
    const response = await this.api.put('/store-config', data);
    return response.data;
  }

  async uploadStoreLogo(file: File) {
    const formData = new FormData();
    formData.append('logo', file);

    const response = await this.api.post('/store-config/logo', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data as { logoUrl: string; config: any };
  }

  // Cozinheiros (admin)
  async getCozinheiros(): Promise<{ id: number; nome: string; telefone: string; ativo: boolean; criadoEm: string }[]> {
    const response = await this.api.get('/cozinheiros');
    const data = response.data;
    return Array.isArray(data) ? data : [];
  }

  async createCozinheiro(data: { nome: string; telefone: string; ativo?: boolean }) {
    const response = await this.api.post('/cozinheiros', data);
    return response.data;
  }

  async updateCozinheiro(id: number, data: { nome: string; telefone: string; ativo?: boolean }) {
    const response = await this.api.put(`/cozinheiros/${id}`, data);
    return response.data;
  }

  async deleteCozinheiro(id: number) {
    const response = await this.api.delete(`/cozinheiros/${id}`);
    return response.data;
  }

  // Deliverer methods
  async getDeliverers() {
    const response = await this.api.get('/deliverers');
    return response.data;
  }

  async createDeliverer(data: { name: string; phone: string; email?: string }) {
    const response = await this.api.post('/deliverers', { 
      nome: data.name, 
      telefone: data.phone, 
      email: data.email 
    });
    return response.data;
  }

  async updateDeliverer(id: number, data: { name: string; phone: string; email?: string; isActive?: boolean }) {
    const response = await this.api.put(`/deliverers/${id}`, { 
      nome: data.name, 
      telefone: data.phone, 
      email: data.email,
      isActive: data.isActive 
    });
    return response.data;
  }

  async deleteDeliverer(id: number) {
    const response = await this.api.delete(`/deliverers/${id}`);
    return response.data;
  }

  async toggleDelivererStatus(id: number) {
    const response = await this.api.patch(`/deliverers/${id}/toggle`);
    return response.data;
  }

  // ========== COMPLEMENTS METHODS ==========
  async getComplements(includeInactive = false): Promise<any[]> {
    const response = await this.api.get(`/complements${includeInactive ? '?includeInactive=true' : ''}`);
    return response.data;
  }

  async getComplementById(id: number): Promise<any> {
    const response = await this.api.get(`/complements/${id}`);
    return response.data;
  }

  async createComplement(data: { name: string; isActive: boolean; image?: File; categoryId?: number | null }): Promise<any> {
    const formData = new FormData();
    formData.append('nome', data.name);
    formData.append('ativo', String(data.isActive));
    
    if (data.categoryId !== undefined && data.categoryId !== null) {
      formData.append('categoriaId', String(data.categoryId));
    }
    
    if (data.image) {
      formData.append('image', data.image);
    }
    
    const response = await this.api.post('/complements', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  async updateComplement(id: number, data: { name?: string; isActive?: boolean; image?: File; categoryId?: number | null }): Promise<any> {
    const formData = new FormData();
    
    if (data.name !== undefined) {
      formData.append('nome', data.name);
    }
    if (data.isActive !== undefined) {
      formData.append('ativo', String(data.isActive));
    }
    if (data.categoryId !== undefined) {
      if (data.categoryId === null) {
        formData.append('categoriaId', '');
      } else {
        formData.append('categoriaId', String(data.categoryId));
      }
    }
    if (data.image) {
      formData.append('image', data.image);
    }
    
    const response = await this.api.put(`/complements/${id}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  async deleteComplement(id: number): Promise<any> {
    const response = await this.api.delete(`/complements/${id}`);
    return response.data;
  }

  async toggleComplementStatus(id: number): Promise<any> {
    const response = await this.api.patch(`/complements/${id}/toggle`);
    return response.data;
  }

  // ========== COMPLEMENT CATEGORIES METHODS ==========
  async getComplementCategories(): Promise<any[]> {
    const response = await this.api.get('/complement-categories');
    return response.data;
  }

  async createComplementCategory(name: string): Promise<any> {
    const response = await this.api.post('/complement-categories', { name });
    return response.data;
  }

  async updateComplementCategory(id: number, name: string): Promise<any> {
    const response = await this.api.put(`/complement-categories/${id}`, { name });
    return response.data;
  }

  async deleteComplementCategory(id: number): Promise<any> {
    const response = await this.api.delete(`/complement-categories/${id}`);
    return response.data;
  }

  // ========== FLAVORS METHODS ==========
  async getFlavors(includeInactive = false): Promise<any[]> {
    const response = await this.api.get(`/flavors${includeInactive ? '?includeInactive=true' : ''}`);
    return response.data;
  }

  async getFlavorById(id: number): Promise<any> {
    const response = await this.api.get(`/flavors/${id}`);
    return response.data;
  }

  async createFlavor(data: { name: string; isActive: boolean; image?: File; categoryId?: number | null }): Promise<any> {
    const formData = new FormData();
    formData.append('nome', data.name);
    formData.append('ativo', String(data.isActive));
    
    if (data.categoryId !== undefined && data.categoryId !== null) {
      formData.append('categoriaId', String(data.categoryId));
    }
    
    if (data.image) {
      formData.append('image', data.image);
    }
    
    const response = await this.api.post('/flavors', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  async updateFlavor(id: number, data: { name?: string; isActive?: boolean; image?: File; categoryId?: number | null }): Promise<any> {
    const formData = new FormData();
    
    if (data.name !== undefined) {
      formData.append('nome', data.name);
    }
    if (data.isActive !== undefined) {
      formData.append('ativo', String(data.isActive));
    }
    if (data.categoryId !== undefined) {
      if (data.categoryId === null) {
        formData.append('categoriaId', '');
      } else {
        formData.append('categoriaId', String(data.categoryId));
      }
    }
    if (data.image) {
      formData.append('image', data.image);
    }
    
    const response = await this.api.put(`/flavors/${id}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  async deleteFlavor(id: number): Promise<any> {
    const response = await this.api.delete(`/flavors/${id}`);
    return response.data;
  }

  async toggleFlavorStatus(id: number): Promise<any> {
    const response = await this.api.patch(`/flavors/${id}/toggle`);
    return response.data;
  }

  // ========== FLAVOR CATEGORIES METHODS ==========
  async getFlavorCategories(): Promise<any[]> {
    const response = await this.api.get('/flavor-categories');
    return response.data;
  }

  async createFlavorCategory(name: string): Promise<any> {
    const response = await this.api.post('/flavor-categories', { name });
    return response.data;
  }

  async updateFlavorCategory(id: number, name: string): Promise<any> {
    const response = await this.api.put(`/flavor-categories/${id}`, { name });
    return response.data;
  }

  async deleteFlavorCategory(id: number): Promise<any> {
    const response = await this.api.delete(`/flavor-categories/${id}`);
    return response.data;
  }

  // ========== ADDITIONALS METHODS ==========
  async getAdditionals(includeInactive = false): Promise<any[]> {
    const response = await this.api.get(`/additionals${includeInactive ? '?includeInactive=true' : ''}`);
    return response.data;
  }

  async getAdditionalById(id: number): Promise<any> {
    const response = await this.api.get(`/additionals/${id}`);
    return response.data;
  }

  async createAdditional(data: { name: string; value: number; isActive: boolean; image?: File; categoryId?: number | null }): Promise<any> {
    const formData = new FormData();
    formData.append('nome', data.name);
    formData.append('valor', String(data.value));
    formData.append('ativo', String(data.isActive));

    if (data.categoryId !== undefined && data.categoryId !== null) {
      formData.append('categoriaId', String(data.categoryId));
    }

    if (data.image) {
      formData.append('image', data.image);
    }

    const response = await this.api.post('/additionals', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  async updateAdditional(id: number, data: { name?: string; value?: number; isActive?: boolean; image?: File; categoryId?: number | null }): Promise<any> {
    const formData = new FormData();

    if (data.name !== undefined) {
      formData.append('nome', data.name);
    }
    if (data.value !== undefined) {
      formData.append('valor', String(data.value));
    }
    if (data.isActive !== undefined) {
      formData.append('ativo', String(data.isActive));
    }
    if (data.categoryId !== undefined) {
      if (data.categoryId === null) {
        formData.append('categoriaId', '');
      } else {
        formData.append('categoriaId', String(data.categoryId));
      }
    }
    if (data.image) {
      formData.append('image', data.image);
    }

    const response = await this.api.put(`/additionals/${id}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  async deleteAdditional(id: number): Promise<any> {
    const response = await this.api.delete(`/additionals/${id}`);
    return response.data;
  }

  async toggleAdditionalStatus(id: number): Promise<any> {
    const response = await this.api.patch(`/additionals/${id}/toggle`);
    return response.data;
  }

  // ========== ADDITIONAL CATEGORIES METHODS ==========
  async getAdditionalCategories(): Promise<any[]> {
    const response = await this.api.get('/additional-categories');
    return response.data;
  }

  async createAdditionalCategory(name: string): Promise<any> {
    const response = await this.api.post('/additional-categories', { name });
    return response.data;
  }

  async updateAdditionalCategory(id: number, name: string): Promise<any> {
    const response = await this.api.put(`/additional-categories/${id}`, { name });
    return response.data;
  }

  async deleteAdditionalCategory(id: number): Promise<any> {
    const response = await this.api.delete(`/additional-categories/${id}`);
    return response.data;
  }

  // ========== DASHBOARD METHODS ==========
  async getDashboardMetrics() {
    const response = await this.api.get('/dashboard/metrics');
    return response.data;
  }

  async getPeriodMetrics(
    period: 'daily' | 'weekly' | 'monthly' | 'yearly', 
    month?: number, 
    year?: number,
    day?: number
  ) {
    let url = `/dashboard/metrics/${period}`;
    if (period === 'monthly' && month !== undefined && year !== undefined) {
      url += `?month=${month}&year=${year}`;
    } else if (period === 'daily' && day !== undefined && month !== undefined && year !== undefined) {
      url += `?day=${day}&month=${month}&year=${year}`;
    } else if (period === 'yearly' && year !== undefined) {
      url += `?year=${year}`;
    }
    const response = await this.api.get(url);
    return response.data;
  }

  async getTopProducts(
    period: 'all' | 'daily' | 'weekly' | 'monthly' | 'yearly' = 'all',
    month?: number,
    year?: number,
    day?: number
  ) {
    let url = '/dashboard/top-products';
    
    // Se period for 'all', não adiciona o parâmetro na URL
    if (period !== 'all') {
      url += `/${period}`;
      
      // Adicionar query parameters para períodos específicos
      if (period === 'monthly' && month !== undefined && year !== undefined) {
        url += `?month=${month}&year=${year}`;
      } else if (period === 'daily' && day !== undefined && month !== undefined && year !== undefined) {
        url += `?day=${day}&month=${month}&year=${year}`;
      } else if (period === 'yearly' && year !== undefined) {
        url += `?year=${year}`;
      }
    }
    
    const response = await this.api.get(url);
    return response.data;
  }

  async getSalesHistory() {
    const response = await this.api.get('/dashboard/sales-history');
    return response.data;
  }
}

export const apiService = new ApiService();
export default apiService;