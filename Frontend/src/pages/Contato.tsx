import React, { useState, useEffect } from 'react';
import { MapPin, Phone, Mail, Clock, Send, CheckCircle } from 'lucide-react';
import apiService from '../services/api';

const Contato: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    message: ''
  });
  const [storeInfo, setStoreInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    loadStoreInfo();
  }, []);

  const loadStoreInfo = async () => {
    try {
      const config = await apiService.getStoreConfig();
      setStoreInfo(config);
    } catch (error) {
     
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Aqui você pode implementar o envio do formulário via API
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simulação
      setSuccess(true);
      setFormData({ name: '', email: '', phone: '', message: '' });
      
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
    
      alert('Erro ao enviar mensagem. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 md:py-12">
        {/* Hero Section */}
        <div className="bg-gradient-to-r from-[var(--primary-color)] to-[var(--primary-color-hover)] rounded-2xl md:rounded-3xl p-6 md:p-12 text-white mb-8 md:mb-12">
          <h1 className="text-3xl md:text-5xl font-bold mb-3 md:mb-4">Entre em Contato</h1>
          <p className="text-base md:text-xl opacity-90 max-w-3xl">
            Estamos aqui para ajudar! Entre em contato conosco através dos nossos canais de atendimento.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
          {/* Formulário de Contato */}
          <div className="bg-white rounded-xl md:rounded-2xl shadow-lg p-6 md:p-8">
            <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-4 md:mb-6">
              Envie sua Mensagem
            </h2>

            {success && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                <p className="text-sm text-green-800">
                  Mensagem enviada com sucesso! Entraremos em contato em breve.
                </p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 md:space-y-5">
              <div>
                <label className="block text-sm md:text-base font-semibold text-slate-700 mb-2">
                  Nome *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2.5 md:py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand focus:border-brand text-sm md:text-base"
                  placeholder="Seu nome completo"
                />
              </div>

              <div>
                <label className="block text-sm md:text-base font-semibold text-slate-700 mb-2">
                  E-mail *
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2.5 md:py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand focus:border-brand text-sm md:text-base"
                  placeholder="seu@email.com"
                />
              </div>

              <div>
                <label className="block text-sm md:text-base font-semibold text-slate-700 mb-2">
                  Telefone
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 md:py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand focus:border-brand text-sm md:text-base"
                  placeholder="(00) 00000-0000"
                />
              </div>

              <div>
                <label className="block text-sm md:text-base font-semibold text-slate-700 mb-2">
                  Mensagem *
                </label>
                <textarea
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  required
                  rows={5}
                  className="w-full px-4 py-2.5 md:py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand focus:border-brand resize-none text-sm md:text-base"
                  placeholder="Como podemos ajudar?"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 md:py-4 bg-brand hover:bg-brand text-white font-bold rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl disabled:bg-purple-400 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm md:text-base"
              >
                <Send className="w-4 h-4 md:w-5 md:h-5" />
                {loading ? 'Enviando...' : 'Enviar Mensagem'}
              </button>
            </form>
          </div>

          {/* Informações de Contato */}
          <div className="space-y-4 md:space-y-6">
            {/* Endereço */}
            {storeInfo?.address && (
              <div className="bg-white rounded-xl md:rounded-2xl shadow-lg p-5 md:p-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 md:w-12 md:h-12 bg-brand-light rounded-lg flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-5 h-5 md:w-6 md:h-6 text-brand" />
                  </div>
                  <div>
                    <h3 className="text-base md:text-lg font-bold text-slate-900 mb-1 md:mb-2">
                      Endereço
                    </h3>
                    <p className="text-sm md:text-base text-slate-600">
                      {storeInfo.address}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Telefone */}
            {storeInfo?.whatsapp && (
              <div className="bg-white rounded-xl md:rounded-2xl shadow-lg p-5 md:p-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 md:w-12 md:h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Phone className="w-5 h-5 md:w-6 md:h-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-base md:text-lg font-bold text-slate-900 mb-1 md:mb-2">
                      WhatsApp
                    </h3>
                    <a
                      href={`https://wa.me/${storeInfo.whatsapp.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm md:text-base text-green-600 hover:text-green-700 font-medium"
                    >
                      {storeInfo.whatsapp}
                    </a>
                  </div>
                </div>
              </div>
            )}

            {/* E-mail */}
            {storeInfo?.email && (
              <div className="bg-white rounded-xl md:rounded-2xl shadow-lg p-5 md:p-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Mail className="w-5 h-5 md:w-6 md:h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-base md:text-lg font-bold text-slate-900 mb-1 md:mb-2">
                      E-mail
                    </h3>
                    <a
                      href={`mailto:${storeInfo.email}`}
                      className="text-sm md:text-base text-blue-600 hover:text-blue-700 font-medium"
                    >
                      {storeInfo.email}
                    </a>
                  </div>
                </div>
              </div>
            )}

            {/* Horário de Funcionamento */}
            <div className="bg-white rounded-xl md:rounded-2xl shadow-lg p-5 md:p-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-brand-light rounded-lg flex items-center justify-center flex-shrink-0">
                  <Clock className="w-5 h-5 md:w-6 md:h-6 text-brand" />
                </div>
                <div>
                  <h3 className="text-base md:text-lg font-bold text-slate-900 mb-2 md:mb-3">
                    Horário de Funcionamento
                  </h3>
                  <div className="space-y-1.5 text-xs md:text-sm text-slate-600">
                    {storeInfo?.openingHours ? (
                      <p>{storeInfo.openingHours}</p>
                    ) : (
                      <>
                        <p>Segunda a Sexta: 10h às 22h</p>
                        <p>Sábado: 10h às 23h</p>
                        <p>Domingo: 14h às 22h</p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Redes Sociais */}
            <div className="bg-gradient-to-r from-[var(--primary-color)] to-[var(--primary-color-hover)] rounded-xl md:rounded-2xl shadow-lg p-5 md:p-6 text-white">
              <h3 className="text-base md:text-lg font-bold mb-3 md:mb-4">Siga-nos nas Redes Sociais</h3>
              <p className="text-xs md:text-sm opacity-90 mb-4">
                Acompanhe nossas novidades, promoções e muito mais!
              </p>
              <div className="flex gap-3">
                {storeInfo?.instagram && (
                  <a
                    href={storeInfo.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-lg flex items-center justify-center transition-colors"
                  >
                    <span className="text-xl">📱</span>
                  </a>
                )}
                {storeInfo?.facebook && (
                  <a
                    href={storeInfo.facebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-lg flex items-center justify-center transition-colors"
                  >
                    <span className="text-xl">👍</span>
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Contato;
