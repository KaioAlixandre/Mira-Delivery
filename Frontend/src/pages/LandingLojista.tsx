import { Link } from 'react-router-dom';
import { Store, Globe, Zap, Shield, ArrowRight, CheckCircle2 } from 'lucide-react';

export default function LandingLojista() {
  const benefits = [
    {
      icon: Globe,
      title: 'Seu link exclusivo',
      description: 'Cada loja ganha um endereço único: sua-loja.miradelivery.com.br. Profissional e fácil de divulgar.',
    },
    {
      icon: Shield,
      title: 'Sem taxas abusivas',
      description: 'Comece a vender sem pagar por centavos de cada pedido. Você controla o seu negócio.',
    },
    {
      icon: Store,
      title: 'Painel completo',
      description: 'Cardápio, pedidos, entregadores e relatórios em um só lugar. Tudo que você precisa para administrar.',
    },
    {
      icon: Zap,
      title: 'Online em minutos',
      description: 'Cadastre-se, configure seu cardápio e comece a receber pedidos. Simples e rápido.',
    },
  ];

  const steps = [
    { step: 1, title: 'Cadastre-se', text: 'Informe o nome da sua loja, seu link e dados de acesso.' },
    { step: 2, title: 'Configure sua loja', text: 'Adicione produtos, categorias e formas de pagamento.' },
    { step: 3, title: 'Comece a vender', text: 'Divulgue seu link e receba pedidos pelo WhatsApp e painel.' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white overflow-hidden">
      {/* Decorative blurs */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-orange-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-orange-600/8 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-amber-500/5 rounded-full blur-3xl" />
      </div>

      {/* Nav */}
      <nav className="relative z-20 border-b border-white/5 bg-gray-900/50 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 md:h-18">
            <Link to="/" className="flex items-center gap-2 group">
              <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/20 group-hover:shadow-orange-500/30 transition-shadow">
                <Store className="h-5 w-5 text-white" />
              </div>
              <span className="font-bold text-xl text-white">Mira Delivery</span>
            </Link>
            <div className="flex items-center gap-3">
              <Link
                to="/login"
                className="text-gray-400 hover:text-white font-medium px-4 py-2 rounded-lg transition-colors"
              >
                Entrar
              </Link>
              <Link
                to="/cadastro"
                className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold px-5 py-2.5 rounded-xl shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 transition-all transform hover:-translate-y-0.5"
              >
                Criar loja
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 pt-16 pb-24 md:pt-24 md:pb-32 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-white tracking-tight leading-tight">
            O seu sistema de{' '}
            <span className="bg-gradient-to-r from-orange-400 to-amber-500 bg-clip-text text-transparent">
              Delivery
            </span>
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed">
            Crie sua loja agora mesmo e comece a vender em minutos. Sem taxas abusivas por pedido — você fica no controle.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/cadastro"
              className="group inline-flex items-center justify-center bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold py-4 px-8 rounded-xl text-lg shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50 transition-all transform hover:-translate-y-1"
            >
              Criar minha loja grátis
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              to="/login"
              className="text-gray-400 hover:text-white font-medium py-4 px-6 rounded-xl border border-white/10 hover:border-white/20 hover:bg-white/5 transition-all"
            >
              Já tenho loja — Entrar
            </Link>
          </div>
          <p className="mt-6 text-sm text-gray-500 flex items-center justify-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            Cadastro rápido • Sem cartão de crédito
          </p>
        </div>
      </section>

      {/* Benefits */}
      <section className="relative z-10 py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-white text-center mb-4">
            Por que usar o Mira Delivery?
          </h2>
          <p className="text-gray-400 text-center max-w-2xl mx-auto mb-16">
            Tudo que você precisa para colocar seu restaurante ou loja online, com simplicidade e custo justo.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
            {benefits.map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="group p-6 md:p-8 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 hover:border-orange-500/30 hover:bg-white/[0.07] transition-all duration-300"
              >
                <div className="w-12 h-12 rounded-xl bg-orange-500/20 flex items-center justify-center mb-5 group-hover:bg-orange-500/30 transition-colors">
                  <Icon className="h-6 w-6 text-orange-400" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="relative z-10 py-20 px-4 sm:px-6 lg:px-8 border-t border-white/5">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-white text-center mb-4">
            Como funciona
          </h2>
          <p className="text-gray-400 text-center mb-16">
            Em três passos sua loja está no ar.
          </p>
          <div className="space-y-10 md:space-y-0 md:grid md:grid-cols-3 md:gap-8">
            {steps.map(({ step, title, text }) => (
              <div key={step} className="relative flex flex-col items-center text-center">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center text-xl font-bold text-white shadow-lg shadow-orange-500/25 mb-5">
                  {step}
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
                <p className="text-gray-400 text-sm max-w-xs">{text}</p>
                {step < 3 && (
                  <div className="hidden md:block absolute top-7 left-[calc(50%+4rem)] w-8 h-0.5 bg-white/10" aria-hidden />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center p-10 md:p-14 rounded-3xl bg-white/5 backdrop-blur-sm border border-white/10">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
            Pronto para começar?
          </h2>
          <p className="text-gray-400 mb-8">
            Crie sua loja em poucos minutos. Sem compromisso e sem taxas escondidas.
          </p>
          <Link
            to="/cadastro"
            className="inline-flex items-center justify-center bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold py-4 px-10 rounded-xl text-lg shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50 transition-all transform hover:-translate-y-0.5"
          >
            Criar minha loja grátis
            <ArrowRight className="ml-2 h-5 w-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 py-8 px-4 border-t border-white/5">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-orange-500/20 rounded-lg flex items-center justify-center">
              <Store className="h-4 w-4 text-orange-400" />
            </div>
            <span className="font-semibold text-gray-400">Mira Delivery</span>
          </div>
          <div className="flex items-center gap-6 text-sm">
            <Link to="/cadastro" className="text-gray-400 hover:text-white transition-colors">
              Criar loja
            </Link>
            <Link to="/login" className="text-gray-400 hover:text-white transition-colors">
              Entrar
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
