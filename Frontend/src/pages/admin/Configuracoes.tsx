import React, { useEffect, useState } from 'react';
import { useNotification } from '../../components/NotificationProvider';
import apiService from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { Gift, Lightbulb, Store, UserCog, MessageSquare, Eye, EyeOff, Save, KeyRound, Mail, User, Phone } from 'lucide-react';

const diasSemana = [
  { label: 'Dom', value: '0' },
  { label: 'Seg', value: '1' },
  { label: 'Ter', value: '2' },
  { label: 'Qua', value: '3' },
  { label: 'Qui', value: '4' },
  { label: 'Sex', value: '5' },
  { label: 'Sáb', value: '6' },
];

type TabType = 'loja' | 'conta';

const Configuracoes: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('loja');
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [deliveryStart, setDeliveryStart] = useState('');
  const [deliveryEnd, setDeliveryEnd] = useState('');

  // Estado da aba Conta
  const [profileData, setProfileData] = useState({ nomeUsuario: '', email: '', telefone: '' });
  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [showSenhaAtual, setShowSenhaAtual] = useState(false);
  const [showNovaSenha, setShowNovaSenha] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingZapi, setSavingZapi] = useState(false);
  const [showZapiTokens, setShowZapiTokens] = useState(false);

  const { notify } = useNotification();
  const { user, refreshUserProfile } = useAuth();

  useEffect(() => {
    apiService.getStoreConfig().then((data) => {
      const defaultNomeLoja = (typeof data?.nomeLoja === 'string' && data.nomeLoja.trim())
        ? data.nomeLoja
        : 'Mira Delivery';

      const mappedData = {
        ...data,
        nomeLoja: defaultNomeLoja,
        valorPedidoMinimo: data?.valorPedidoMinimo ?? '',
        estimativaEntrega: data?.estimativaEntrega ?? '',
        openTime: data.openingTime,
        closeTime: data.closingTime,
        deliveryStart: data.deliveryStart || data.horaEntregaInicio || '',
        deliveryEnd: data.deliveryEnd || data.horaEntregaFim || '',
        diasAbertos: data.openDays ?? data.diasAbertos ?? '',
        promocaoTaxaAtiva: data.promocaoTaxaAtiva || false,
        promocaoDias: data.promocaoDias || '',
        promocaoValorMinimo: data.promocaoValorMinimo || '',
        deliveryAtivo: data.deliveryAtivo ?? true,
        zapApiToken: data.zapApiToken || '',
        zapApiInstance: data.zapApiInstance || '',
        zapApiClientToken: data.zapApiClientToken || '',
      };
      setConfig(mappedData);
      setDeliveryStart(mappedData.deliveryStart);
      setDeliveryEnd(mappedData.deliveryEnd);
      setLoading(false);
    }).catch(() => {
      setLoading(false);
      notify('Erro ao carregar configurações', 'error');
    });
  }, []);

  useEffect(() => {
    if (user) {
      setProfileData({
        nomeUsuario: user.nomeUsuario || (user as any).username || '',
        email: user.email || '',
        telefone: user.telefone || (user as any).phone || '',
      });
    }
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setConfig((prev: any) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    if (name === 'deliveryStart') setDeliveryStart(value);
    if (name === 'deliveryEnd') setDeliveryEnd(value);
  };

  const handleDayToggle = (day: string) => {
    const days = config.diasAbertos ? config.diasAbertos.split(',') : [];
    const newDays = days.includes(day)
      ? days.filter((d: string) => d !== day)
      : [...days, day];
    setConfig((prev: any) => ({
      ...prev,
      diasAbertos: newDays.sort().join(','),
    }));
  };

  const handlePromoDayToggle = (day: string) => {
    const days = config.promocaoDias ? config.promocaoDias.split(',') : [];
    const newDays = days.includes(day)
      ? days.filter((d: string) => d !== day)
      : [...days, day];
    setConfig((prev: any) => ({
      ...prev,
      promocaoDias: newDays.sort().join(','),
    }));
  };

  const handleSubmitLoja = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const dataToSend = {
      ...config,
      openingTime: config.openTime,
      closingTime: config.closeTime,
      deliveryStart: deliveryStart,
      deliveryEnd: deliveryEnd,
      diasAbertos: config.diasAbertos ?? '',
      deliveryEnabled: config.deliveryAtivo,
      valorPedidoMinimo: config.valorPedidoMinimo,
      estimativaEntrega: config.estimativaEntrega,
    };
    try {
      await apiService.updateStoreConfig(dataToSend);
      setLoading(false);
      notify('Configurações salvas com sucesso!', 'success');
    } catch (error) {
      setLoading(false);
      notify('Erro ao salvar configurações. Tente novamente.', 'error');
    }
  };

  const handleSubmitProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (novaSenha && novaSenha !== confirmarSenha) {
      notify('As senhas não coincidem.', 'error');
      return;
    }
    if (novaSenha && novaSenha.length < 6) {
      notify('A nova senha deve ter pelo menos 6 caracteres.', 'error');
      return;
    }
    setSavingProfile(true);
    try {
      const data: any = {
        nomeUsuario: profileData.nomeUsuario,
        email: profileData.email,
      };
      if (novaSenha) {
        data.senhaAtual = senhaAtual;
        data.novaSenha = novaSenha;
      }
      await apiService.updateProfile(data);
      await refreshUserProfile();
      setSenhaAtual('');
      setNovaSenha('');
      setConfirmarSenha('');
      notify('Perfil atualizado com sucesso!', 'success');
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Erro ao atualizar perfil.';
      notify(msg, 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSubmitZapi = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingZapi(true);
    try {
      await apiService.updateStoreConfig({
        zapApiToken: config.zapApiToken,
        zapApiInstance: config.zapApiInstance,
        zapApiClientToken: config.zapApiClientToken,
      });
      notify('Configurações da Z-API salvas com sucesso!', 'success');
    } catch (error) {
      notify('Erro ao salvar configurações da Z-API.', 'error');
    } finally {
      setSavingZapi(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600">Carregando configurações...</div>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Erro ao carregar configurações.</p>
      </div>
    );
  }

  const inputClass = "w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#ea1d2c] focus:border-[#ea1d2c] transition-colors";

  return (
    <div id="configuracoes" className="page">
      <header className="mb-4 sm:mb-6">
        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-800">Configurações</h2>
        <p className="text-xs sm:text-sm text-slate-500">Configure o funcionamento da sua loja e conta.</p>
      </header>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-slate-100 p-1 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('loja')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'loja'
              ? 'bg-white text-[#ea1d2c] shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Store className="w-4 h-4" />
          Loja
        </button>
        <button
          onClick={() => setActiveTab('conta')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'conta'
              ? 'bg-white text-[#ea1d2c] shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <UserCog className="w-4 h-4" />
          Conta
        </button>
      </div>

      {/* Tab: Loja */}
      {activeTab === 'loja' && (
        <div className="bg-white p-3 sm:p-4 md:p-6 rounded-xl shadow-md">
          <form onSubmit={handleSubmitLoja} className="space-y-3 sm:space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Horário de Abertura
                </label>
                <input
                  type="time"
                  name="openTime"
                  value={config.openTime || ''}
                  onChange={handleChange}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Horário de Fechamento
                </label>
                <input
                  type="time"
                  name="closeTime"
                  value={config.closeTime || ''}
                  onChange={handleChange}
                  className={inputClass}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Início do serviço de entrega
                </label>
                <input
                  type="time"
                  name="deliveryStart"
                  value={deliveryStart}
                  onChange={handleChange}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Fim do serviço de entrega
                </label>
                <input
                  type="time"
                  name="deliveryEnd"
                  value={deliveryEnd}
                  onChange={handleChange}
                  className={inputClass}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Valor mínimo do pedido (R$)
                </label>
                <input
                  type="number"
                  name="valorPedidoMinimo"
                  value={config.valorPedidoMinimo ?? ''}
                  onChange={handleChange}
                  min="0"
                  step="0.01"
                  placeholder="Sem pedido mínimo"
                  className={inputClass}
                />
                {!config.valorPedidoMinimo && (
                  <p className="text-xs text-slate-500 mt-1">
                    Sem pedido mínimo
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Estimativa de tempo
                </label>
                <input
                  type="text"
                  name="estimativaEntrega"
                  value={config.estimativaEntrega ?? ''}
                  onChange={handleChange}
                  placeholder="Ex: 40 - 50 min"
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Dias de Funcionamento
              </label>
              <div className="grid grid-cols-7 gap-2">
                {diasSemana.map((dia) => (
                  <button
                    key={dia.value}
                    type="button"
                    onClick={() => handleDayToggle(dia.value)}
                    className={`p-2 text-sm font-medium rounded-lg border transition-colors ${
                      config.diasAbertos?.split(',').includes(dia.value)
                        ? 'bg-red-100 border-[#ea1d2c] text-[#ea1d2c]'
                        : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {dia.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="isOpen"
                name="isOpen"
                checked={config.isOpen || false}
                onChange={handleChange}
                className="h-4 w-4 text-[#ea1d2c] focus:ring-[#ea1d2c] border-slate-300 rounded"
              />
              <label htmlFor="isOpen" className="ml-2 block text-sm text-slate-700">
                Loja aberta (desmarque para fechar temporariamente)
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="deliveryEnabled"
                name="deliveryAtivo"
                checked={config.deliveryAtivo ?? true}
                onChange={handleChange}
                className="h-4 w-4 text-[#ea1d2c] focus:ring-[#ea1d2c] border-slate-300 rounded"
              />
              <label htmlFor="deliveryEnabled" className="ml-2 block text-sm text-slate-700">
                Entrega em casa ativa (desmarque para desativar o delivery)
              </label>
            </div>

            {/* Seção de Promoção de Taxa de Entrega */}
            <div className="border-t border-slate-200 pt-6 mt-6">
              <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <Gift className="w-5 h-5 text-[#ea1d2c]" />
                Promoção de Frete Grátis
              </h3>
              
              <div className="flex items-center mb-4">
                <input
                  type="checkbox"
                  id="promocaoTaxaAtiva"
                  name="promocaoTaxaAtiva"
                  checked={config.promocaoTaxaAtiva || false}
                  onChange={handleChange}
                  className="h-4 w-4 text-[#ea1d2c] focus:ring-[#ea1d2c] border-slate-300 rounded"
                />
                <label htmlFor="promocaoTaxaAtiva" className="ml-2 block text-sm text-slate-700 font-medium">
                  Ativar promoção de frete grátis
                </label>
              </div>

              {config.promocaoTaxaAtiva && (
                <div className="space-y-4 pl-6 border-l-2 border-red-200">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Valor mínimo para frete grátis (R$)
                    </label>
                    <input
                      type="number"
                      name="promocaoValorMinimo"
                      value={config.promocaoValorMinimo || ''}
                      onChange={handleChange}
                      min="0"
                      step="0.01"
                      placeholder="Ex: 30.00"
                      className="w-full md:w-64 p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#ea1d2c] focus:border-[#ea1d2c]"
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      Clientes que gastarem este valor ou mais terão frete grátis
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Dias da promoção
                    </label>
                    <div className="grid grid-cols-7 gap-2">
                      {diasSemana.map((dia) => (
                        <button
                          key={dia.value}
                          type="button"
                          onClick={() => handlePromoDayToggle(dia.value)}
                          className={`p-2 text-sm font-medium rounded-lg border transition-colors ${
                            config.promocaoDias?.split(',').includes(dia.value)
                              ? 'bg-emerald-100 border-emerald-300 text-emerald-800'
                              : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          {dia.label}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-slate-500 mt-2">
                      Selecione os dias em que a promoção estará ativa
                    </p>
                  </div>

                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-sm text-[#ea1d2c] flex items-start gap-2">
                      <Lightbulb className="w-4 h-4 text-[#ea1d2c] mt-0.5 flex-shrink-0" />
                      <span><strong>Resumo:</strong> {config.promocaoDias ? (
                        <>
                          Frete grátis para pedidos de <strong>R$ {config.promocaoValorMinimo || '0,00'}</strong> ou mais nos dias selecionados.
                        </>
                      ) : (
                        'Selecione os dias e o valor mínimo para ativar a promoção.'
                      )}</span>
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-4">
              <button
                type="submit"
                className="bg-[#ea1d2c] text-white px-6 py-3 rounded-lg font-semibold hover:bg-[#d61a28] transition-colors w-full sm:w-auto flex items-center justify-center gap-2"
                disabled={loading}
              >
                <Save className="w-4 h-4" />
                Salvar Alterações
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tab: Conta */}
      {activeTab === 'conta' && (
        <div className="space-y-6">
          {/* Seção: Dados do Admin */}
          <div className="bg-white p-3 sm:p-4 md:p-6 rounded-xl shadow-md">
            <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-[#ea1d2c]" />
              Dados da Conta
            </h3>
            <form onSubmit={handleSubmitProfile} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Nome de Usuário
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={profileData.nomeUsuario}
                      onChange={(e) => setProfileData(prev => ({ ...prev, nomeUsuario: e.target.value }))}
                      className={`${inputClass} pl-10`}
                      placeholder="Seu nome"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    E-mail
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="email"
                      value={profileData.email}
                      onChange={(e) => setProfileData(prev => ({ ...prev, email: e.target.value }))}
                      className={`${inputClass} pl-10`}
                      placeholder="email@exemplo.com"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Telefone
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={profileData.telefone}
                    disabled
                    className={`${inputClass} pl-10 bg-slate-50 text-slate-500 cursor-not-allowed`}
                  />
                </div>
                <p className="text-xs text-slate-500 mt-1">O telefone não pode ser alterado por aqui.</p>
              </div>

              {/* Alterar Senha */}
              <div className="border-t border-slate-200 pt-4 mt-4">
                <h4 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-slate-500" />
                  Alterar Senha
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Senha Atual</label>
                    <div className="relative">
                      <input
                        type={showSenhaAtual ? 'text' : 'password'}
                        value={senhaAtual}
                        onChange={(e) => setSenhaAtual(e.target.value)}
                        className={`${inputClass} pr-10`}
                        placeholder="••••••"
                      />
                      <button type="button" onClick={() => setShowSenhaAtual(!showSenhaAtual)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                        {showSenhaAtual ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Nova Senha</label>
                    <div className="relative">
                      <input
                        type={showNovaSenha ? 'text' : 'password'}
                        value={novaSenha}
                        onChange={(e) => setNovaSenha(e.target.value)}
                        className={`${inputClass} pr-10`}
                        placeholder="••••••"
                      />
                      <button type="button" onClick={() => setShowNovaSenha(!showNovaSenha)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                        {showNovaSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Confirmar Senha</label>
                    <input
                      type="password"
                      value={confirmarSenha}
                      onChange={(e) => setConfirmarSenha(e.target.value)}
                      className={inputClass}
                      placeholder="••••••"
                    />
                    {novaSenha && confirmarSenha && novaSenha !== confirmarSenha && (
                      <p className="text-xs text-red-500 mt-1">As senhas não coincidem</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="bg-[#ea1d2c] text-white px-6 py-3 rounded-lg font-semibold hover:bg-[#d61a28] transition-colors w-full sm:w-auto flex items-center justify-center gap-2"
                  disabled={savingProfile}
                >
                  <Save className="w-4 h-4" />
                  {savingProfile ? 'Salvando...' : 'Salvar Dados'}
                </button>
              </div>
            </form>
          </div>

          {/* Seção: Integração Z-API (WhatsApp) */}
          <div className="bg-white p-3 sm:p-4 md:p-6 rounded-xl shadow-md">
            <h3 className="text-lg font-semibold text-slate-800 mb-1 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-green-600" />
              Integração Z-API (WhatsApp)
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 mb-4">
              Configure sua instância da Z-API para enviar notificações automáticas via WhatsApp.
            </p>

            <form onSubmit={handleSubmitZapi} className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
                <p className="text-xs text-amber-700 flex items-start gap-2">
                  <Lightbulb className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                  <span>Obtenha suas credenciais no painel da <strong>Z-API</strong> (z-api.io). Você precisará da <strong>Instância</strong>, <strong>Token</strong> e <strong>Client Token</strong> da sua conta.</span>
                </p>
              </div>

              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-600 font-medium">Mostrar tokens</span>
                <button
                  type="button"
                  onClick={() => setShowZapiTokens(!showZapiTokens)}
                  className="text-slate-500 hover:text-slate-700 transition-colors flex items-center gap-1.5 text-sm"
                >
                  {showZapiTokens ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  {showZapiTokens ? 'Ocultar' : 'Mostrar'}
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    ID da Instância
                  </label>
                  <input
                    type={showZapiTokens ? 'text' : 'password'}
                    name="zapApiInstance"
                    value={config.zapApiInstance || ''}
                    onChange={handleChange}
                    className={inputClass}
                    placeholder="Ex: 3C2A7B9D1E4F..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Token da Instância
                  </label>
                  <input
                    type={showZapiTokens ? 'text' : 'password'}
                    name="zapApiToken"
                    value={config.zapApiToken || ''}
                    onChange={handleChange}
                    className={inputClass}
                    placeholder="Ex: A1B2C3D4E5F6..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Client Token (Security Token)
                  </label>
                  <input
                    type={showZapiTokens ? 'text' : 'password'}
                    name="zapApiClientToken"
                    value={config.zapApiClientToken || ''}
                    onChange={handleChange}
                    className={inputClass}
                    placeholder="Ex: F6e5d4c3b2a1..."
                  />
                </div>
              </div>

              {config.zapApiToken && config.zapApiInstance && config.zapApiClientToken ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-sm text-green-700 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-green-600 flex-shrink-0" />
                    <span><strong>Conectado</strong> — Todas as credenciais da Z-API estão configuradas.</span>
                  </p>
                </div>
              ) : (
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                  <p className="text-sm text-slate-500 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    <span>Preencha todos os campos para ativar as notificações via WhatsApp.</span>
                  </p>
                </div>
              )}

              <div className="pt-2">
                <button
                  type="submit"
                  className="bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors w-full sm:w-auto flex items-center justify-center gap-2"
                  disabled={savingZapi}
                >
                  <Save className="w-4 h-4" />
                  {savingZapi ? 'Salvando...' : 'Salvar Z-API'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Configuracoes;