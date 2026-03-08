import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, ShoppingBag, ShoppingCart, User, Package } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';

const Footer: React.FC = () => {
  const location = useLocation();
  const { user } = useAuth();
  const { items } = useCart();
  
  // Ocultar footer no painel admin
  if (location.pathname.startsWith('/admin')) {
    return null;
  }
  
  const cartItemsCount = items.reduce((total, item) => total + item.quantity, 0);

  const navItems = [
    {
      path: '/',
      icon: Home,
      label: 'Início'
    },
    {
      path: '/products',
      icon: ShoppingBag,
      label: 'Produtos'
    },
    {
      path: '/cart',
      icon: ShoppingCart,
      label: 'Carrinho',
      badge: cartItemsCount
    },
    {
      path: '/orders',
      icon: Package,
      label: 'Pedidos',
      requireAuth: true
    },
    {
      path: user ? '/profile' : '/login',
      icon: User,
      label: user ? 'Perfil' : 'Login'
    }
  ];

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <footer className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 shadow-lg">
      <nav className="flex justify-around items-center h-16 px-1">
        {navItems.map((item) => {
          // Se o item requer autenticação e usuário não está logado, não mostrar
          if (item.requireAuth && !user) {
            return null;
          }
          
          const Icon = item.icon;
          const active = isActive(item.path);
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center flex-1 h-full relative transition-colors ${
                active
                  ? 'text-[#ea1d2c]'
                  : 'text-gray-500 hover:text-[#ea1d2c]'
              }`}
            >
              <div className="relative">
                <Icon size={22} strokeWidth={active ? 2.5 : 2} />
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                    {item.badge > 9 ? '9+' : item.badge}
                  </span>
                )}
              </div>
              <span className={`text-[10px] mt-1 ${active ? 'font-semibold' : 'font-normal'}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </footer>
  );
};

export default Footer;
