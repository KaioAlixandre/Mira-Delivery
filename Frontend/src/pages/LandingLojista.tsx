import { Link } from 'react-router-dom';
import { Store, Globe, Zap, Shield, ArrowRight, CheckCircle2, MessageCircle, CreditCard, Headphones, BadgeCheck, Sparkles } from 'lucide-react';

export default function LandingLojista() {
  const benefits = [
    { icon: Globe, title: 'Seu link exclusivo', description: 'Cada loja ganha um endereço único: sua-loja.miradelivery.com.br. Profissional e fácil de divulgar.' },
    { icon: Shield, title: 'Sem taxas abusivas', description: 'Comece a vender sem pagar por centavos de cada pedido. Você controla o seu negócio.' },
    { icon: Store, title: 'Painel completo', description: 'Cardápio, pedidos, entregadores e relatórios em um só lugar. Tudo que você precisa para administrar.' },
    { icon: Zap, title: 'Online em minutos', description: 'Cadastre-se, configure seu cardápio e comece a receber pedidos. Simples e rápido.' },
  ];

  const steps = [
    { step: 1, title: 'Cadastre-se', text: 'Informe o nome da sua loja, seu link e dados de acesso.' },
    { step: 2, title: 'Configure sua loja', text: 'Adicione produtos, categorias e formas de pagamento.' },
    { step: 3, title: 'Comece a vender', text: 'Divulgue seu link e receba pedidos pelo WhatsApp e painel.' },
  ];

  const plans = [
    { name: 'Simples', price: 97, desc: 'Ideal para começar', features: ['Pedidos online', 'Cardápio digital', 'Seu link exclusivo'] },
    { name: 'Pro', price: 197, desc: 'Mais vendas', popular: true, features: ['Tudo do Simples', 'Mensagens via WhatsApp', 'Notificações personalizadas'] },
    { name: 'Plus', price: 270, desc: 'Solução completa', features: ['Tudo do Pro', 'Pedidos no salão', 'App do garçom'] },
  ];

  const professionalFeatures = [
    { icon: MessageCircle, title: 'Mensagens personalizadas', text: 'Envie avisos e ofertas para seus clientes pelo WhatsApp. Confirmação e status de pedido automáticos.' },
    { icon: CreditCard, title: 'Assinatura mensal fixa', text: 'Valor previsível todo mês. Sem taxa por pedido e sem surpresas. Cancele quando quiser.' },
    { icon: Headphones, title: 'Suporte dedicado', text: 'Equipe pronta para ajudar na configuração e no dia a dia. Sua loja no ar com tranquilidade.' },
    { icon: BadgeCheck, title: 'Imagem profissional', text: 'Cardápio online, link exclusivo e painel. Passe a impressão que seu negócio merece.' },
  ];

  const stats = [
    { label: 'Sem taxa por pedido', icon: Shield },
    { label: 'Assinatura fixa', icon: CreditCard },
    { label: 'Suporte incluso', icon: Headphones },
  ];

  return (
    <div className="min-h-screen bg-[#0f0f12] text-white overflow-hidden">
      {/* Background: gradient mesh + grid + orbs */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-[#0f0f12] to-gray-900" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.02)_1px,transparent_1px)] bg-[size:64px_64px]" />
        <div className="absolute top-[-15%] left-[-5%] w-[500px] h-[500px] rounded-full bg-[var(--primary-color)]/10 blur-[120px] animate-float opacity-60" />
        <div className="absolute bottom-[-15%] right-[-5%] w-[550px] h-[550px] rounded-full bg-amber-500/10 blur-[120px] animate-float-delayed opacity-50" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full bg-white/[0.03] blur-[100px] animate-glow-pulse" />
      </div>

      {/* Nav */}
      <nav className="relative z-20 border-b border-white/5 bg-[#0f0f12]/80 backdrop-blur-xl sticky top-0 transition-all duration-300">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 md:h-18">
            <Link to="/" className="flex items-center gap-2.5 group">
              <img
                src="/logo.jpeg"
                alt="MIRA Delivery"
                className="w-10 h-10 rounded-xl object-contain bg-white shadow-lg group-hover:scale-105 transition-transform duration-300"
              />
              <span className="font-bold text-xl text-white tracking-tight">Mira Delivery</span>
            </Link>
            <div className="flex items-center gap-2">
              <Link to="/login" className="text-gray-400 hover:text-white font-medium px-4 py-2.5 rounded-xl transition-all duration-200 hover:bg-white/5">
                Entrar
              </Link>
              <Link to="/cadastro" className="bg-gradient-to-r from-[var(--primary-color)] to-[var(--primary-color-hover)] hover:opacity-95 text-white font-semibold px-5 py-2.5 rounded-xl shadow-lg shadow-[var(--primary-color)]/25 transition-all duration-300 hover:scale-[1.02] hover:shadow-[var(--primary-color)]/30">
                Criar loja
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 pt-20 pb-28 md:pt-28 md:pb-36 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-gray-300 text-sm mb-8 animate-fade-in-up">
            <Sparkles className="h-4 w-4 text-[var(--primary-color)]" />
            <span>Novo: mensagens personalizadas pelo WhatsApp</span>
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold text-white tracking-tight leading-[1.1] animate-fade-in-up" style={{ animationDelay: '0.1s', animationFillMode: 'both' }}>
            O sistema de delivery{' '}
            <span className="bg-gradient-to-r from-[var(--primary-color)] via-amber-400 to-[var(--primary-color)] bg-clip-text text-transparent">
              feito para você
            </span>
          </h1>
          <p className="mt-8 text-lg sm:text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed animate-fade-in-up" style={{ animationDelay: '0.2s', animationFillMode: 'both' }}>
            Assinatura mensal fixa, mensagens personalizadas e painel completo. Profissional, simples e sem taxas por pedido.
          </p>
          <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up" style={{ animationDelay: '0.3s', animationFillMode: 'both' }}>
            <Link
              to="/cadastro"
              className="group inline-flex items-center justify-center bg-gradient-to-r from-[var(--primary-color)] to-[var(--primary-color-hover)] text-white font-bold py-4 px-8 rounded-2xl text-lg shadow-xl shadow-[var(--primary-color)]/25 transition-all duration-300 hover:scale-[1.03] hover:shadow-[var(--primary-color)]/35 hover:-translate-y-0.5"
            >
              Criar minha loja
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform duration-300" />
            </Link>
            <Link
              to="/login"
              className="text-gray-400 hover:text-white font-medium py-4 px-6 rounded-2xl border border-white/10 hover:border-white/20 hover:bg-white/5 transition-all duration-300"
            >
              Já tenho loja — Entrar
            </Link>
          </div>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-6 text-sm text-gray-500 animate-fade-in-up" style={{ animationDelay: '0.4s', animationFillMode: 'both' }}>
            {stats.map(({ label }) => (
              <span key={label} className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500/90 flex-shrink-0" />
                {label}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="relative z-10 py-8 px-4 border-y border-white/5">
        <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-center gap-8 md:gap-12 text-gray-400 text-sm">
          {stats.map(({ label, icon: Icon }) => (
            <div key={label} className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                <Icon className="h-5 w-5 text-[var(--primary-color)]" />
              </div>
              <span>{label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Benefits */}
      <section className="relative z-10 py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-white text-center mb-4">
            Por que usar o Mira Delivery?
          </h2>
          <p className="text-gray-400 text-center max-w-2xl mx-auto mb-16">
            Link exclusivo, assinatura fixa e ferramentas para você vender online com profissionalismo.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {benefits.map(({ icon: Icon, title, description }, i) => (
              <div
                key={title}
                className="group p-6 md:p-8 rounded-2xl bg-white/[0.04] backdrop-blur-sm border border-white/10 hover:border-white/20 hover:bg-white/[0.07] transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl hover:shadow-black/20"
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center mb-6 group-hover:from-[var(--primary-color)]/20 group-hover:to-[var(--primary-color)]/10 transition-all duration-300">
                  <Icon className="h-7 w-7 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Planos */}
      <section className="relative z-10 py-24 px-4 sm:px-6 lg:px-8 border-t border-white/5">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-white text-center mb-4">
            Planos que cabem no seu negócio
          </h2>
          <p className="text-gray-400 text-center max-w-2xl mx-auto mb-16">
            Assinatura mensal fixa, sem taxa por pedido. Escolha o plano ideal e cancele quando quiser.
          </p>
          <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`relative p-6 md:p-8 rounded-3xl border transition-all duration-500 hover:scale-[1.02] ${
                  plan.popular
                    ? 'bg-white/[0.08] border-[var(--primary-color)]/40 shadow-2xl shadow-[var(--primary-color)]/10 ring-2 ring-[var(--primary-color)]/20'
                    : 'bg-white/[0.04] border-white/10 hover:border-white/20 hover:bg-white/[0.06]'
                }`}
              >
                {plan.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-[var(--primary-color)] to-amber-500 text-white text-xs font-bold uppercase tracking-wider px-4 py-1.5 rounded-full shadow-lg">
                    Popular
                  </span>
                )}
                <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                <p className="text-gray-400 text-sm mt-1">{plan.desc}</p>
                <div className="mt-6 flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold text-white">R$ {plan.price}</span>
                  <span className="text-gray-500 text-sm">/mês</span>
                </div>
                <ul className="mt-6 space-y-3">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-gray-300 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  to="/cadastro"
                  className={`mt-8 block w-full text-center font-semibold py-3.5 px-4 rounded-xl transition-all duration-300 ${
                    plan.popular
                      ? 'bg-gradient-to-r from-[var(--primary-color)] to-[var(--primary-color-hover)] text-white hover:opacity-95 hover:shadow-lg hover:shadow-[var(--primary-color)]/25'
                      : 'bg-white/10 text-white hover:bg-white/20 border border-white/10'
                  }`}
                >
                  Escolher plano
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Recursos profissionais */}
      <section className="relative z-10 py-24 px-4 sm:px-6 lg:px-8 border-t border-white/5">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-white text-center mb-4">
            Recursos profissionais para sua loja
          </h2>
          <p className="text-gray-400 text-center max-w-2xl mx-auto mb-16">
            Mensagens personalizadas, assinatura transparente e suporte para você vender mais.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {professionalFeatures.map(({ icon: Icon, title, text }) => (
              <div
                key={title}
                className="group p-6 md:p-8 rounded-2xl bg-white/[0.04] backdrop-blur-sm border border-white/10 hover:border-white/20 hover:bg-white/[0.07] transition-all duration-500 hover:scale-[1.02] hover:shadow-xl"
              >
                <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center mb-6 group-hover:bg-[var(--primary-color)]/20 transition-colors duration-300">
                  <Icon className="h-7 w-7 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="relative z-10 py-24 px-4 sm:px-6 lg:px-8 border-t border-white/5">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-white text-center mb-4">
            Como funciona
          </h2>
          <p className="text-gray-400 text-center mb-16">
            Em três passos sua loja está no ar.
          </p>
          <div className="relative space-y-12 md:space-y-0 md:grid md:grid-cols-3 md:gap-8">
            {steps.map(({ step, title, text }) => (
              <div key={step} className="relative flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--primary-color)] to-[var(--primary-color-hover)] flex items-center justify-center text-2xl font-bold text-white shadow-lg shadow-[var(--primary-color)]/30 mb-6 ring-4 ring-[var(--primary-color)]/20">
                  {step}
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
                <p className="text-gray-400 text-sm max-w-xs">{text}</p>
                {step < 3 && (
                  <div className="hidden md:block absolute top-8 left-[calc(50%+4rem)] w-full h-0.5 bg-gradient-to-r from-white/20 to-transparent" aria-hidden />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 py-28 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center p-10 md:p-16 rounded-3xl bg-white/[0.06] backdrop-blur-sm border border-white/10 shadow-2xl relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-[var(--primary-color)]/5 to-transparent pointer-events-none" />
          <h2 className="text-2xl md:text-4xl font-bold text-white mb-4 relative">
            Pronto para vender com profissionalismo?
          </h2>
          <p className="text-gray-400 mb-10 text-lg relative">
            Assinatura mensal fixa, mensagens personalizadas e suporte dedicado. Crie sua loja em minutos, sem fidelidade.
          </p>
          <Link
            to="/cadastro"
            className="relative inline-flex items-center justify-center bg-gradient-to-r from-[var(--primary-color)] to-[var(--primary-color-hover)] text-white font-bold py-4 px-10 rounded-2xl text-lg shadow-xl shadow-[var(--primary-color)]/25 transition-all duration-300 hover:scale-[1.03] hover:shadow-[var(--primary-color)]/35"
          >
            Criar minha loja
            <ArrowRight className="ml-2 h-5 w-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 py-12 px-4 border-t border-white/5">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2.5">
              <img
                src="/logo.jpeg"
                alt="MIRA Delivery"
                className="w-9 h-9 rounded-xl object-contain bg-white"
              />
              <span className="font-semibold text-gray-400">Mira Delivery</span>
            </div>
            <div className="flex items-center gap-8 text-sm">
              <Link to="/cadastro" className="text-gray-400 hover:text-white transition-colors">
                Criar loja
              </Link>
              <Link to="/login" className="text-gray-400 hover:text-white transition-colors">
                Entrar
              </Link>
            </div>
          </div>
          <p className="mt-6 text-center sm:text-left text-sm text-gray-500 max-w-2xl">
            Sistema de delivery com assinatura mensal, mensagens personalizadas e painel profissional. Sem taxa por pedido.
          </p>
        </div>
      </footer>
    </div>
  );
}
