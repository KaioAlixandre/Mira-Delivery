import React, { useEffect, useState } from 'react';
import { useNotification } from '../../components/NotificationProvider';
import apiService from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { Gift, Lightbulb, Store, UserCog, MessageSquare, Eye, EyeOff, Save, KeyRound, Mail, User, Phone, Clock, Truck, DollarSign, Timer, CalendarDays, Power, ToggleLeft, ToggleRight, Palette } from 'lucide-react';

const diasSemana = [
  { label: 'Dom', value: '0' },
  { label: 'Seg', value: '1' },
  { label: 'Ter', value: '2' },
  { label: 'Qua', value: '3' },
  { label: 'Qui', value: '4' },
  { label: 'Sex', value: '5' },
  { label: 'Sáb', value: '6' },
];

const diasSemanaFull = [
  { label: 'Domingo', short: 'Dom', value: '0' },
  { label: 'Segunda-feira', short: 'Seg', value: '1' },
  { label: 'Terça-feira', short: 'Ter', value: '2' },
  { label: 'Quarta-feira', short: 'Qua', value: '3' },
  { label: 'Quinta-feira', short: 'Qui', value: '4' },
  { label: 'Sexta-feira', short: 'Sex', value: '5' },
  { label: 'Sábado', short: 'Sáb', value: '6' },
];

interface HorarioDia {
  aberto: boolean;
  abertura: string;
  fechamento: string;
}

type HorariosPorDia = Record<string, HorarioDia>;

function buildDefaultSchedule(diasAbertos?: string, abertura?: string, fechamento?: string): HorariosPorDia {
  const days = diasAbertos ? diasAbertos.split(',') : [];
  const schedule: HorariosPorDia = {};
  for (let i = 0; i <= 6; i++) {
    schedule[String(i)] = {
      aberto: days.includes(String(i)),
      abertura: abertura || '08:00',
      fechamento: fechamento || '22:00',
    };
  }
  return schedule;
}

type TabType = 'loja' | 'conta';

const Configuracoes: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('loja');
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [deliveryStart, setDeliveryStart] = useState('');
  const [deliveryEnd, setDeliveryEnd] = useState('');
  const [horariosPorDia, setHorariosPorDia] = useState<HorariosPorDia>({});
  const [horarioDeliveryPorDia, setHorarioDeliveryPorDia] = useState<HorariosPorDia>({});

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
        corPrimaria: (data?.corPrimaria && /^#[0-9A-Fa-f]{6}$/.test(String(data.corPrimaria)))
          ? String(data.corPrimaria)
          : '#ea1d2c',
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
      // Carregar horários por dia
      if (data.horariosPorDia && typeof data.horariosPorDia === 'object') {
        setHorariosPorDia(data.horariosPorDia as HorariosPorDia);
      } else {
        setHorariosPorDia(buildDefaultSchedule(mappedData.diasAbertos, data.horaAbertura || data.openingTime, data.horaFechamento || data.closingTime));
      }
      // Carregar horários de delivery por dia
      if (data.horarioDeliveryPorDia && typeof data.horarioDeliveryPorDia === 'object') {
        setHorarioDeliveryPorDia(data.horarioDeliveryPorDia as HorariosPorDia);
      } else {
        setHorarioDeliveryPorDia(buildDefaultSchedule(mappedData.diasAbertos, mappedData.deliveryStart || '08:00', mappedData.deliveryEnd || '22:00'));
      }
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
    setHorariosPorDia((prev: HorariosPorDia) => ({
      ...prev,
      [day]: {
        ...prev[day],
        aberto: !prev[day].aberto,
      },
    }));
  };

  const handleTimeChange = (day: string, time: string, type: 'abertura' | 'fechamento') => {
    setHorariosPorDia((prev: HorariosPorDia) => ({
      ...prev,
      [day]: {
        ...prev[day],
        [type]: time,
      },
    }));
  };

  const handleDeliveryDayToggle = (day: string) => {
    setHorarioDeliveryPorDia((prev: HorariosPorDia) => ({
      ...prev,
      [day]: {
        ...prev[day],
        aberto: !prev[day].aberto,
      },
    }));
  };

  const handleDeliveryTimeChange = (day: string, time: string, type: 'abertura' | 'fechamento') => {
    setHorarioDeliveryPorDia((prev: HorariosPorDia) => ({
      ...prev,
      [day]: {
        ...prev[day],
        [type]: time,
      },
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
    // Derivar diasAbertos e horários padrão a partir de horariosPorDia
    const diasAbertosDerived = Object.entries(horariosPorDia)
      .filter(([, h]) => h.aberto)
      .map(([day]) => day)
      .sort()
      .join(',');
    const firstOpen = Object.values(horariosPorDia).find(h => h.aberto);
    const firstDeliveryOpen = Object.values(horarioDeliveryPorDia).find(h => h.aberto);
    const dataToSend = {
      ...config,
      openingTime: firstOpen?.abertura || config.openTime || '08:00',
      closingTime: firstOpen?.fechamento || config.closeTime || '22:00',
      deliveryStart: firstDeliveryOpen?.abertura || deliveryStart || '08:00',
      deliveryEnd: firstDeliveryOpen?.fechamento || deliveryEnd || '22:00',
      diasAbertos: diasAbertosDerived,
      horariosPorDia,
      horarioDeliveryPorDia,
      deliveryEnabled: config.deliveryAtivo,
      valorPedidoMinimo: config.valorPedidoMinimo,
      estimativaEntrega: config.estimativaEntrega,
      nomeLoja: config.nomeLoja,
      corPrimaria: config.corPrimaria || '#ea1d2c',
    };
    try {
      await apiService.updateStoreConfig(dataToSend);
      const cor = dataToSend.corPrimaria || '#ea1d2c';
      if (cor && /^#[0-9A-Fa-f]{6}$/.test(cor)) {
        document.documentElement.style.setProperty('--primary-color', cor);
      }
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
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
        <p className="text-sm text-slate-500">Carregando configurações...</p>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="text-center py-16">
        <div className="bg-slate-100 p-4 rounded-full w-fit mx-auto mb-4">
          <Store className="w-10 h-10 text-slate-400" />
        </div>
        <p className="text-slate-500 font-medium">Erro ao carregar configurações.</p>
      </div>
    );
  }

  const inputClass = "w-full pl-10 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition-all";
  const inputClassPlain = "w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand focus:border-brand transition-colors";

  return (
    <div id="configuracoes" className="page space-y-5">
      <header>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Configurações</h2>
        <p className="text-sm text-slate-500 mt-1">Configure o funcionamento da sua loja e conta</p>
      </header>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-slate-100 p-1 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('loja')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'loja'
              ? 'bg-white text-brand shadow-sm'
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
              ? 'bg-white text-brand shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <UserCog className="w-4 h-4" />
          Conta
        </button>
      </div>

      {/* Tab: Loja */}
      {activeTab === 'loja' && (
        <form onSubmit={handleSubmitLoja} className="space-y-4">
          {/* Aparência / Cor do sistema */}
          <div className="bg-white rounded-2xl shadow-md border border-slate-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
              <Palette className="w-4 h-4 text-slate-500" />
              <h3 className="text-sm font-bold text-slate-800">Aparência da Loja</h3>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Cor primária do sistema</label>
                <p className="text-xs text-slate-500 mb-3">Esta cor será usada em botões, links e destaques da loja (cliente e admin).</p>
                <div className="flex flex-wrap items-center gap-3">
                  <input
                    type="color"
                    id="corPrimaria"
                    name="corPrimaria"
                    value={config.corPrimaria || '#ea1d2c'}
                    onChange={handleChange}
                    className="w-12 h-12 rounded-xl border-2 border-slate-200 cursor-pointer bg-transparent"
                  />
                  <input
                    type="text"
                    value={config.corPrimaria || '#ea1d2c'}
                    onChange={(e) => {
                      const v = e.target.value.trim();
                      if (/^#[0-9A-Fa-f]{6}$/.test(v) || v === '') {
                        setConfig((prev: any) => ({ ...prev, corPrimaria: v || '#ea1d2c' }));
                      }
                    }}
                    placeholder="#ea1d2c"
                    className="w-28 px-3 py-2 text-sm font-mono border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none"
                  />
                </div>
                <div className="mt-3">
                  <p className="text-xs font-medium text-slate-600 mb-2">Cores sugeridas:</p>
                  <div className="flex flex-wrap gap-2">
                    {['#ea1d2c', '#2563eb', '#16a34a', '#dc2626', '#7c3aed', '#0d9488', '#ca8a04', '#e11d48', '#0369a1', '#4f46e5'].map((hex) => (
                      <button
                        key={hex}
                        type="button"
                        onClick={() => setConfig((prev: any) => ({ ...prev, corPrimaria: hex }))}
                        className={`w-8 h-8 rounded-lg border-2 transition-all hover:scale-110 ${
                          (config.corPrimaria || '#ea1d2c').toLowerCase() === hex.toLowerCase()
                            ? 'border-slate-800 ring-2 ring-slate-400'
                            : 'border-slate-200 hover:border-slate-400'
                        }`}
                        style={{ backgroundColor: hex }}
                        title={hex}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Horários */}
          <div className="bg-white rounded-2xl shadow-md border border-slate-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-500" />
              <h3 className="text-sm font-bold text-slate-800">Dias e Horários de Funcionamento</h3>
            </div>
            <div className="p-5 space-y-3">
              <p className="text-xs text-slate-500 mb-2">Selecione os dias em que a loja funciona e defina os horários para cada dia.</p>
              {diasSemanaFull.map((dia) => {
                const h = horariosPorDia[dia.value] || { aberto: false, abertura: '08:00', fechamento: '22:00' };
                return (
                  <div
                    key={dia.value}
                    className={`flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-xl border-2 transition-all ${
                      h.aberto ? 'bg-indigo-50/50 border-indigo-200' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => handleDayToggle(dia.value)}
                      className="flex items-center gap-2 min-w-[160px]"
                    >
                      {h.aberto ? (
                        <ToggleRight className="w-6 h-6 text-indigo-500 flex-shrink-0" />
                      ) : (
                        <ToggleLeft className="w-6 h-6 text-slate-400 flex-shrink-0" />
                      )}
                      <span className={`text-sm font-semibold ${h.aberto ? 'text-indigo-700' : 'text-slate-400'}`}>
                        {dia.label}
                      </span>
                    </button>
                    {h.aberto ? (
                      <div className="flex items-center gap-2 flex-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                        <input
                          type="time"
                          value={h.abertura}
                          onChange={(e) => handleTimeChange(dia.value, e.target.value, 'abertura')}
                          className="px-2 py-1.5 text-sm border border-slate-200 rounded-lg bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none w-[110px]"
                        />
                        <span className="text-slate-400 text-xs font-medium">até</span>
                        <input
                          type="time"
                          value={h.fechamento}
                          onChange={(e) => handleTimeChange(dia.value, e.target.value, 'fechamento')}
                          className="px-2 py-1.5 text-sm border border-slate-200 rounded-lg bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none w-[110px]"
                        />
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400 italic">Fechado</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Horários do Delivery */}
          <div className="bg-white rounded-2xl shadow-md border border-slate-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
              <Truck className="w-4 h-4 text-slate-500" />
              <h3 className="text-sm font-bold text-slate-800">Dias e Horários do Delivery</h3>
            </div>
            <div className="p-5 space-y-3">
              <p className="text-xs text-slate-500 mb-2">Selecione os dias em que o delivery funciona e defina os horários para cada dia.</p>
              {diasSemanaFull.map((dia) => {
                const h = horarioDeliveryPorDia[dia.value] || { aberto: false, abertura: '08:00', fechamento: '22:00' };
                return (
                  <div
                    key={dia.value}
                    className={`flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-xl border-2 transition-all ${
                      h.aberto ? 'bg-emerald-50/50 border-emerald-200' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => handleDeliveryDayToggle(dia.value)}
                      className="flex items-center gap-2 min-w-[160px]"
                    >
                      {h.aberto ? (
                        <ToggleRight className="w-6 h-6 text-emerald-500 flex-shrink-0" />
                      ) : (
                        <ToggleLeft className="w-6 h-6 text-slate-400 flex-shrink-0" />
                      )}
                      <span className={`text-sm font-semibold ${h.aberto ? 'text-emerald-700' : 'text-slate-400'}`}>
                        {dia.label}
                      </span>
                    </button>
                    {h.aberto ? (
                      <div className="flex items-center gap-2 flex-1">
                        <Truck className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                        <input
                          type="time"
                          value={h.abertura}
                          onChange={(e) => handleDeliveryTimeChange(dia.value, e.target.value, 'abertura')}
                          className="px-2 py-1.5 text-sm border border-slate-200 rounded-lg bg-white focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none w-[110px]"
                        />
                        <span className="text-slate-400 text-xs font-medium">até</span>
                        <input
                          type="time"
                          value={h.fechamento}
                          onChange={(e) => handleDeliveryTimeChange(dia.value, e.target.value, 'fechamento')}
                          className="px-2 py-1.5 text-sm border border-slate-200 rounded-lg bg-white focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none w-[110px]"
                        />
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400 italic">Sem delivery</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>


          {/* Pedidos e Entrega */}
          <div className="bg-white rounded-2xl shadow-md border border-slate-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-slate-500" />
              <h3 className="text-sm font-bold text-slate-800">Pedidos e Entrega</h3>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Valor mínimo do pedido (R$)</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
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
                  </div>
                  {!config.valorPedidoMinimo && (
                    <p className="text-xs text-slate-400 mt-1">Nenhum valor mínimo definido</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Estimativa de tempo</label>
                  <div className="relative">
                    <Timer className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
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
              </div>
            </div>
          </div>

          {/* Status da Loja */}
          <div className="bg-white rounded-2xl shadow-md border border-slate-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
              <Power className="w-4 h-4 text-slate-500" />
              <h3 className="text-sm font-bold text-slate-800">Status da Loja</h3>
            </div>
            <div className="p-5 space-y-3">
              <div
                className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  config.isOpen
                    ? 'bg-emerald-50 border-emerald-300'
                    : 'bg-slate-50 border-slate-200'
                }`}
                onClick={() => setConfig((prev: any) => ({ ...prev, isOpen: !prev.isOpen }))}
              >
                <div className="flex items-center gap-3">
                  <Store className={`w-5 h-5 ${config.isOpen ? 'text-emerald-600' : 'text-slate-400'}`} />
                  <div>
                    <p className={`text-sm font-semibold ${config.isOpen ? 'text-emerald-800' : 'text-slate-600'}`}>
                      Loja {config.isOpen ? 'Aberta' : 'Fechada'}
                    </p>
                    <p className="text-xs text-slate-500">
                      {config.isOpen ? 'Sua loja está recebendo pedidos' : 'Sua loja está temporariamente fechada'}
                    </p>
                  </div>
                </div>
                {config.isOpen ? (
                  <ToggleRight className="w-8 h-8 text-emerald-500 flex-shrink-0" />
                ) : (
                  <ToggleLeft className="w-8 h-8 text-slate-400 flex-shrink-0" />
                )}
                <input type="checkbox" name="isOpen" checked={config.isOpen || false} onChange={handleChange} className="hidden" />
              </div>

              <div
                className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  config.deliveryAtivo
                    ? 'bg-blue-50 border-blue-300'
                    : 'bg-slate-50 border-slate-200'
                }`}
                onClick={() => setConfig((prev: any) => ({ ...prev, deliveryAtivo: !prev.deliveryAtivo }))}
              >
                <div className="flex items-center gap-3">
                  <Truck className={`w-5 h-5 ${config.deliveryAtivo ? 'text-blue-600' : 'text-slate-400'}`} />
                  <div>
                    <p className={`text-sm font-semibold ${config.deliveryAtivo ? 'text-blue-800' : 'text-slate-600'}`}>
                      Delivery {config.deliveryAtivo ? 'Ativo' : 'Inativo'}
                    </p>
                    <p className="text-xs text-slate-500">
                      {config.deliveryAtivo ? 'Entregas em domicílio estão habilitadas' : 'Apenas retirada no local disponível'}
                    </p>
                  </div>
                </div>
                {config.deliveryAtivo ? (
                  <ToggleRight className="w-8 h-8 text-blue-500 flex-shrink-0" />
                ) : (
                  <ToggleLeft className="w-8 h-8 text-slate-400 flex-shrink-0" />
                )}
                <input type="checkbox" name="deliveryAtivo" checked={config.deliveryAtivo ?? true} onChange={handleChange} className="hidden" />
              </div>
            </div>
          </div>

          {/* Promoção de Frete Grátis */}
          <div className="bg-white rounded-2xl shadow-md border border-slate-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
              <Gift className="w-4 h-4 text-slate-500" />
              <h3 className="text-sm font-bold text-slate-800">Promoção de Frete Grátis</h3>
            </div>
            <div className="p-5 space-y-4">
              <div
                className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  config.promocaoTaxaAtiva
                    ? 'bg-amber-50 border-amber-300'
                    : 'bg-slate-50 border-slate-200'
                }`}
                onClick={() => setConfig((prev: any) => ({ ...prev, promocaoTaxaAtiva: !prev.promocaoTaxaAtiva }))}
              >
                <div className="flex items-center gap-3">
                  <Gift className={`w-5 h-5 ${config.promocaoTaxaAtiva ? 'text-amber-600' : 'text-slate-400'}`} />
                  <div>
                    <p className={`text-sm font-semibold ${config.promocaoTaxaAtiva ? 'text-amber-800' : 'text-slate-600'}`}>
                      Promoção {config.promocaoTaxaAtiva ? 'Ativa' : 'Inativa'}
                    </p>
                    <p className="text-xs text-slate-500">
                      {config.promocaoTaxaAtiva ? 'Frete grátis está sendo aplicado' : 'Ative para oferecer frete grátis'}
                    </p>
                  </div>
                </div>
                {config.promocaoTaxaAtiva ? (
                  <ToggleRight className="w-8 h-8 text-amber-500 flex-shrink-0" />
                ) : (
                  <ToggleLeft className="w-8 h-8 text-slate-400 flex-shrink-0" />
                )}
                <input type="checkbox" name="promocaoTaxaAtiva" checked={config.promocaoTaxaAtiva || false} onChange={handleChange} className="hidden" />
              </div>

              {config.promocaoTaxaAtiva && (
                <div className="space-y-4 ml-2 pl-4 border-l-2 border-amber-200">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Valor mínimo para frete grátis (R$)
                    </label>
                    <div className="relative max-w-xs">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="number"
                        name="promocaoValorMinimo"
                        value={config.promocaoValorMinimo || ''}
                        onChange={handleChange}
                        min="0"
                        step="0.01"
                        placeholder="Ex: 30.00"
                        className={inputClass}
                      />
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Pedidos acima deste valor terão frete grátis
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Dias da promoção
                    </label>
                    <div className="grid grid-cols-7 gap-2">
                      {diasSemana.map((dia) => (
                        <button
                          key={dia.value}
                          type="button"
                          onClick={() => handlePromoDayToggle(dia.value)}
                          className={`p-2.5 text-sm font-semibold rounded-xl border-2 transition-all ${
                            config.promocaoDias?.split(',').includes(dia.value)
                              ? 'bg-emerald-50 border-emerald-400 text-emerald-700 shadow-sm'
                              : 'bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100 hover:border-slate-300'
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

                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                    <p className="text-sm text-amber-800 flex items-start gap-2">
                      <Lightbulb className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
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
          </div>

          {/* Botão Salvar */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200/50 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              <Save className="w-4 h-4" />
              Salvar Alterações
            </button>
          </div>
        </form>
      )}

      {/* Tab: Conta */}
      {activeTab === 'conta' && (
        <div className="space-y-6">
          {/* Seção: Dados do Admin */}
          <div className="bg-white p-3 sm:p-4 md:p-6 rounded-xl shadow-md">
            <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-brand" />
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
                      className={`${inputClassPlain} pl-10`}
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
                      className={`${inputClassPlain} pl-10`}
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
                    className={`${inputClassPlain} pl-10 bg-slate-50 text-slate-500 cursor-not-allowed`}
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
                        className={`${inputClassPlain} pr-10`}
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
                        className={`${inputClassPlain} pr-10`}
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
                      className={inputClassPlain}
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
                  className="bg-brand text-white px-6 py-3 rounded-lg font-semibold hover:bg-brand transition-colors w-full sm:w-auto flex items-center justify-center gap-2"
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
                    className={inputClassPlain}
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
                    className={inputClassPlain}
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
                    className={inputClassPlain}
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