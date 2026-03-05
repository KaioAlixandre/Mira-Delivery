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

const BASE_DOMAIN = 'miradelivery.com.br';

// 🌟 Função auxiliar para descobrir se estamos em uma loja ou no site principal (SaaS)
const getSubdomain = () => {
  const hostname = window.location.hostname; // Ex: 'mira.localhost', 'loja1.miradelivery.com.br' ou 'miradelivery.com.br'
  
  if (hostname === 'localhost' || /^(\d{1,3}\.){3}\d{1,3}$/.test(hostname)) {
    return null;
  }

  // Portal principal: miradelivery.com.br ou www.miradelivery.com.br → sem subdomínio (SaasApp)
  if (hostname === BASE_DOMAIN || hostname === `www.${BASE_DOMAIN}`) {
    return null;
  }

  // Loja: subdominio.miradelivery.com.br → retorna o subdomínio
  if (hostname.endsWith(`.${BASE_DOMAIN}`)) {
    const sub = hostname.split('.')[0];
    return sub && sub !== 'www' ? sub : null;
  }

  // Desenvolvimento: algo.localhost → primeira parte é o subdomínio
  const parts = hostname.split('.');
  if (parts.length >= 2) {
    const subdomain = parts[0];
    if (subdomain !== 'www') return subdomain;
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

import { Link } from 'react-router-dom'; // 🌟 Adicione isso lá no topo dos imports!

// ==========================================
// 🏢 APLICATIVO DO SAAS (Seu site de vendas)
// ==========================================
function SaasApp() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 text-white p-4">
      <Routes>
        <Route path="/" element={
          <div className="text-center max-w-2xl">
            <h1 className="text-5xl font-bold mb-6 text-orange-500">O seu sistema de Delivery</h1>
            <p className="text-xl mb-8">Crie sua loja agora mesmo e comece a vender em minutos sem pagar taxas abusivas por pedido!</p>
            
            {/* 🌟 Botão que leva para a rota de cadastro */}
            <Link to="/cadastro" className="inline-block bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 px-8 rounded-full text-lg shadow-lg shadow-orange-500/30 transition-all transform hover:scale-105">
              Criar Minha Loja Grátis
            </Link>
          </div>
        } />
        
        {/* 🌟 A Nova Rota de Cadastro do Lojista! */}
        <Route path="/cadastro" element={<CadastroLojista />} />

        <Route path="/login" element={<LoginLojista />} />

        {/* Qualquer rota digitada errado no SaaS volta pro início do SaaS */}
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