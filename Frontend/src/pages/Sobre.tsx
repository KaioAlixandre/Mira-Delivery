import React from 'react';
import { Store, Heart, Clock, Award } from 'lucide-react';

const Sobre: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 md:py-12">
        {/* Hero Section */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl md:rounded-3xl p-6 md:p-12 text-white mb-8 md:mb-12">
          <h1 className="text-3xl md:text-5xl font-bold mb-3 md:mb-4">Sobre Nós</h1>
          <p className="text-base md:text-xl opacity-90 max-w-3xl">
            Levando sabor e qualidade até você, com todo o carinho e dedicação que você merece.
          </p>
        </div>

        {/* História */}
        <div className="bg-white rounded-xl md:rounded-2xl shadow-lg p-6 md:p-8 mb-6 md:mb-8">
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-4 md:mb-6">Nossa História</h2>
          <div className="prose prose-sm md:prose-lg max-w-none text-slate-600">
            <p className="text-sm md:text-base leading-relaxed mb-4">
              Nossa loja nasceu do sonho de levar produtos de qualidade até você com praticidade.
              Com itens selecionados e muito cuidado em cada pedido, nos tornamos referência em
              atendimento e experiência na região.
            </p>
            <p className="text-sm md:text-base leading-relaxed">
              Hoje, atendemos centenas de clientes que confiam em nosso compromisso com a excelência. 
              Cada produto é preparado com ingredientes frescos e de alta qualidade, garantindo uma 
              experiência única a cada pedido.
            </p>
          </div>
        </div>

        {/* História */}
        <div className="bg-white rounded-xl md:rounded-2xl shadow-lg p-6 md:p-8 mb-6 md:mb-8">
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-4 md:mb-6">Desenvolvedores</h2>
          <div className="prose prose-sm md:prose-lg max-w-none text-slate-600">
            <p className="text-sm md:text-base leading-relaxed mb-4">
              Site desenvolvido por <a href="https://www.instagram.com/kaioalixandre/" target="_blank" rel="noopener noreferrer" className="font-bold hover:underline underline-offset-2 transition">Kaio Alixandre</a> e <a href="https://www.instagram.com/zzaleog/" target="_blank" rel="noopener noreferrer" className="font-bold hover:underline underline-offset-2 transition">Isaleo Guimaraes</a> como parte do projeto final do curso de Desenvolvimento Web da <strong>EBAC - Escola Britânica de Artes Criativas e Tecnologia</strong>.
            </p>
           
          </div>
        </div>
        {/* Valores */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6 md:mb-8">
          <div className="bg-white rounded-xl md:rounded-2xl shadow-lg p-5 md:p-6 text-center">
            <div className="w-12 h-12 md:w-16 md:h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3 md:mb-4">
              <Heart className="w-6 h-6 md:w-8 md:h-8 text-purple-600" />
            </div>
            <h3 className="text-base md:text-lg font-bold text-slate-900 mb-2">Qualidade</h3>
            <p className="text-xs md:text-sm text-slate-600">
              Ingredientes selecionados e produtos sempre frescos
            </p>
          </div>

          <div className="bg-white rounded-xl md:rounded-2xl shadow-lg p-5 md:p-6 text-center">
            <div className="w-12 h-12 md:w-16 md:h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3 md:mb-4">
              <Clock className="w-6 h-6 md:w-8 md:h-8 text-purple-600" />
            </div>
            <h3 className="text-base md:text-lg font-bold text-slate-900 mb-2">Agilidade</h3>
            <p className="text-xs md:text-sm text-slate-600">
              Entrega rápida e pontual para você
            </p>
          </div>

          <div className="bg-white rounded-xl md:rounded-2xl shadow-lg p-5 md:p-6 text-center">
            <div className="w-12 h-12 md:w-16 md:h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3 md:mb-4">
              <Store className="w-6 h-6 md:w-8 md:h-8 text-purple-600" />
            </div>
            <h3 className="text-base md:text-lg font-bold text-slate-900 mb-2">Tradição</h3>
            <p className="text-xs md:text-sm text-slate-600">
              Receitas tradicionais e sabor autêntico
            </p>
          </div>

          <div className="bg-white rounded-xl md:rounded-2xl shadow-lg p-5 md:p-6 text-center">
            <div className="w-12 h-12 md:w-16 md:h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3 md:mb-4">
              <Award className="w-6 h-6 md:w-8 md:h-8 text-purple-600" />
            </div>
            <h3 className="text-base md:text-lg font-bold text-slate-900 mb-2">Excelência</h3>
            <p className="text-xs md:text-sm text-slate-600">
              Compromisso com a satisfação dos clientes
            </p>
          </div>
        </div>

        {/* Missão, Visão e Valores */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          <div className="bg-white rounded-xl md:rounded-2xl shadow-lg p-5 md:p-6">
            <h3 className="text-lg md:text-xl font-bold text-purple-600 mb-3 md:mb-4">Missão</h3>
            <p className="text-xs md:text-sm text-slate-600 leading-relaxed">
              Proporcionar momentos especiais através de produtos de qualidade excepcional, 
              feitos com ingredientes selecionados e muito amor.
            </p>
          </div>

          <div className="bg-white rounded-xl md:rounded-2xl shadow-lg p-5 md:p-6">
            <h3 className="text-lg md:text-xl font-bold text-purple-600 mb-3 md:mb-4">Visão</h3>
            <p className="text-xs md:text-sm text-slate-600 leading-relaxed">
              Ser referência em qualidade e sabor, conquistando o coração de cada vez mais 
              clientes em toda a região.
            </p>
          </div>

          <div className="bg-white rounded-xl md:rounded-2xl shadow-lg p-5 md:p-6">
            <h3 className="text-lg md:text-xl font-bold text-purple-600 mb-3 md:mb-4">Valores</h3>
            <p className="text-xs md:text-sm text-slate-600 leading-relaxed">
              Qualidade, compromisso, respeito ao cliente, inovação e paixão pelo que fazemos 
              todos os dias.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sobre;
