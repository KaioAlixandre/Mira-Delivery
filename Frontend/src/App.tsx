import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { CartProvider } from './contexts/CartContext';
import Header from './components/Header';
import Footer from './components/Footer';
import AdminOrderNotification from './components/AdminOrderNotification';
import Home from './pages/Home';
import Login from './pages/Login';
import Cadastrar from './pages/Cadastrar';
import Produtos from './pages/Produtos';
import Carrinho from './pages/Carrinho';
import Sobre from './pages/Sobre';
import Contato from './pages/Contato';
import Perfil from './pages/Perfil';
import Pedidos from './pages/Pedidos';
import PainelAdmin from './pages/admin/PainelAdmin'; 
import NovoPedidoBalcao from './pages/admin/NovoPedidoBalcao';
import AddAddress from './pages/AddAddress';
import AddPhone from './pages/AddPhone';
import Checkout from './pages/Checkout';
import EsqueciSenha from './pages/EsqueciSenha';
import RedefinirSenha from './pages/RedefinirSenha';
import ProdutoDetalhes from './pages/ProdutoDetalhes';
import { useEffect } from 'react';
import { apiService } from './services/api';
import CadastroLojista from './pages/CadastroLojista';
import LoginLojista from './pages/LoginLojista';
import LandingLojista from './pages/LandingLojista';

const BASE_DOMAIN = 'miradelivery.com.br';

// 🌟 Função auxiliar para descobrir se estamos em uma loja ou no site principal (SaaS) — mesma lógica do api.ts
const getSubdomain = () => {
  const hostname = window.location.hostname;
  const suffixBase = `.${BASE_DOMAIN}`;

  if (hostname === 'localhost' || /^(\d{1,3}\.){3}\d{1,3}$/.test(hostname)) {
    return null;
  }
  if (hostname === BASE_DOMAIN || hostname === `www.${BASE_DOMAIN}`) {
    return null;
  }
  if (hostname.endsWith(suffixBase)) {
    const idx = hostname.indexOf(suffixBase);
    const sub = idx > 0 ? hostname.slice(0, idx) : '';
    return sub && sub !== 'www' ? sub : null;
  }
  if (hostname.endsWith('.localhost')) {
    const idx = hostname.indexOf('.localhost');
    const sub = idx > 0 ? hostname.slice(0, idx) : '';
    return sub && sub !== 'www' ? sub : null;
  }
  return null;
};

// 🌟 COMPONENTE INVISÍVEL: Muda o nome da aba e pega as cores da loja!
function StoreMetadata() {
  useEffect(() => {
    apiService.getStoreConfig()
      .then((config) => {
        // Muda o nome da aba do navegador dinamicamente!
        if (config.nomeLoja) {
          document.title = config.nomeLoja;
        }
        
        // Injeta a cor primária se existir
        if (config.corPrimaria) {
          document.documentElement.style.setProperty('--primary-color', config.corPrimaria);
        }
      })
      .catch(console.error);
  }, []);

  return null; // Não renderiza nada na tela, só faz a mágica no fundo
}

// ==========================================
// 🍔 APLICATIVO DA LOJA (O Delivery do Cliente)
// ==========================================
function StoreApp() {
  return (
    <AuthProvider>
      <CartProvider>
        <StoreMetadata /> {/* 🌟 INJETOR DA ABA ADICIONADO AQUI */}
        <div className="min-h-screen flex flex-col">
          <Header />
          <AdminOrderNotification />
          <main className="flex-1 pb-16 md:pb-0">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Cadastrar />} />
              <Route path="/forgot-password" element={<EsqueciSenha />} />
              <Route path="/reset-password" element={<RedefinirSenha />} />
              <Route path="/products" element={<Produtos />} />
              <Route path="/products/:id" element={<ProdutoDetalhes />} />
              <Route path="/cart" element={<Carrinho />} />
              <Route path="/about" element={<Sobre />} />
              <Route path="/contact" element={<Contato />} />
              <Route path="/profile" element={<Perfil />} />
              <Route path="/orders" element={<Pedidos />} />
              <Route path="/admin" element={<PainelAdmin />} /> 
              <Route path="/admin/novo-pedido-balcao" element={<NovoPedidoBalcao />} />
              <Route path="/add-address" element={<AddAddress />} />
              <Route path="/add-phone" element={<AddPhone />} />
              <Route path="/checkout" element={<Checkout />} />
              {/* Qualquer rota não encontrada na loja, joga para a Home da loja */}
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </CartProvider>
    </AuthProvider>
  );
}

// ==========================================
// 🏢 APLICATIVO DO SAAS (Seu site de vendas)
// ==========================================
function SaasApp() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-900 text-white">
      <Routes>
        <Route path="/" element={<LandingLojista />} />
        <Route path="/cadastro" element={<CadastroLojista />} />
        <Route path="/login" element={<LoginLojista />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </div>
  );
}

// ==========================================
// 🚀 O CONTROLADOR PRINCIPAL
// ==========================================
function App() {
  const subdomain = getSubdomain();

  return (
    <Router>
      {/* A mágica acontece aqui: escolhe qual App carregar baseado na URL */}
      {subdomain ? <StoreApp /> : <SaasApp />}
    </Router>
  );
}

export default App;