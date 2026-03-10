import React, { useEffect, useState } from 'react';
import { useNotification } from '../../components/NotificationProvider';
import apiService from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { Gift, Lightbulb, Store, UserCog, MessageSquare, Eye, EyeOff, Save, KeyRound, Mail, User, Phone, Clock, Truck, DollarSign, Timer, Power, ToggleLeft, ToggleRight, Palette, Crown, Check, Lock } from 'lucide-react';

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
  const [currentPlan, setCurrentPlan] = useState<'simples' | 'pro' | 'plus'>('simples');
  const [savingPlan, setSavingPlan] = useState(false);

  const [deliveryNeighborhoods, setDeliveryNeighborhoods] = useState<Array<{ id: number; nome: string; taxaEntrega: number }>>([]);
  const [deliveryNeighborhoodsLoading, setDeliveryNeighborhoodsLoading] = useState(false);
  const [newNeighborhoodName, setNewNeighborhoodName] = useState('');
  const [newNeighborhoodFee, setNewNeighborhoodFee] = useState('');
  const [editingNeighborhoodId, setEditingNeighborhoodId] = useState<number | null>(null);
  const [editingNeighborhoodName, setEditingNeighborhoodName] = useState('');
  const [editingNeighborhoodFee, setEditingNeighborhoodFee] = useState('');

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
      setCurrentPlan((['simples', 'pro', 'plus'].includes(data.planoMensal) ? data.planoMensal : 'simples') as 'simples' | 'pro' | 'plus');
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

  useEffect(() => {
    const loadDeliveryNeighborhoods = async () => {
      try {
        setDeliveryNeighborhoodsLoading(true);
        const bairros = await apiService.getDeliveryNeighborhoods();
        setDeliveryNeighborhoods(bairros);
      } catch {
        notify('Erro ao carregar bairros de entrega', 'error');
      } finally {
        setDeliveryNeighborhoodsLoading(false);
      }
    };

    if (activeTab === 'loja') {
      loadDeliveryNeighborhoods();
    }
  }, [activeTab, notify]);

  const handleCreateNeighborhood = async () => {
    const nome = newNeighborhoodName.trim();
    const taxa = newNeighborhoodFee === '' ? 0 : Number(newNeighborhoodFee);

    if (!nome) {
      notify('Informe o nome do bairro', 'warning');
      return;
    }
    if (!Number.isFinite(taxa) || taxa < 0) {
      notify('Informe uma taxa válida', 'warning');
      return;
    }

    try {
      setDeliveryNeighborhoodsLoading(true);
      await apiService.createDeliveryNeighborhood({ nome, taxaEntrega: taxa });
      const bairros = await apiService.getDeliveryNeighborhoods();
      setDeliveryNeighborhoods(bairros);
      setNewNeighborhoodName('');
      setNewNeighborhoodFee('');
      notify('Bairro cadastrado com sucesso!', 'success');
    } catch (error: any) {
      const msg = error?.response?.data?.message || 'Erro ao cadastrar bairro';
      notify(msg, 'error');
    } finally {
      setDeliveryNeighborhoodsLoading(false);
    }
  };

  const startEditNeighborhood = (n: { id: number; nome: string; taxaEntrega: number }) => {
    setEditingNeighborhoodId(n.id);
    setEditingNeighborhoodName(n.nome);
    setEditingNeighborhoodFee(String(n.taxaEntrega ?? 0));
  };

  const cancelEditNeighborhood = () => {
    setEditingNeighborhoodId(null);
    setEditingNeighborhoodName('');
    setEditingNeighborhoodFee('');
  };

  const handleUpdateNeighborhood = async () => {
    if (!editingNeighborhoodId) return;
    const nome = editingNeighborhoodName.trim();
    const taxa = editingNeighborhoodFee === '' ? 0 : Number(editingNeighborhoodFee);

    if (!nome) {
      notify('Informe o nome do bairro', 'warning');
      return;
    }
    if (!Number.isFinite(taxa) || taxa < 0) {
      notify('Informe uma taxa válida', 'warning');
      return;
    }

    try {
      setDeliveryNeighborhoodsLoading(true);
      await apiService.updateDeliveryNeighborhood(editingNeighborhoodId, { nome, taxaEntrega: taxa });
      const bairros = await apiService.getDeliveryNeighborhoods();
      setDeliveryNeighborhoods(bairros);
      cancelEditNeighborhood();
      notify('Bairro atualizado com sucesso!', 'success');
    } catch (error: any) {
      const msg = error?.response?.data?.message || 'Erro ao atualizar bairro';
      notify(msg, 'error');
    } finally {
      setDeliveryNeighborhoodsLoading(false);
    }
  };

  const handleDeleteNeighborhood = async (id: number) => {
    try {
      setDeliveryNeighborhoodsLoading(true);
      await apiService.deleteDeliveryNeighborhood(id);
      const bairros = await apiService.getDeliveryNeighborhoods();
      setDeliveryNeighborhoods(bairros);
      if (editingNeighborhoodId === id) {
        cancelEditNeighborhood();
      }
      notify('Bairro removido com sucesso!', 'success');
    } catch (error: any) {
      const msg = error?.response?.data?.message || 'Erro ao remover bairro';
      notify(msg, 'error');
    } finally {
      setDeliveryNeighborhoodsLoading(false);
    }
  };

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

  const handleSubmitLoja = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

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

  const planOptions = [
    {
      id: 'simples' as const,
      name: 'Simples',
      price: 97,
      color: 'from-blue-500 to-cyan-500',
      border: 'border-blue-500',
      bg: 'bg-blue-50',
      features: ['Gerenciamento de pedidos online', 'Gerenciamento completo do cardápio'],
    },
    {
      id: 'pro' as const,
      name: 'Pro',
      price: 197,
      color: 'from-orange-500 to-amber-500',
      border: 'border-orange-500',
      bg: 'bg-orange-50',
      badge: 'Popular',
      features: ['Gerenciamento de pedidos online', 'Gerenciamento completo do cardápio', 'Envio de mensagens via WhatsApp'],
    },
    {
      id: 'plus' as const,
      name: 'Plus',
      price: 270,
      color: 'from-purple-500 to-pink-500',
      border: 'border-purple-500',
      bg: 'bg-purple-50',
      badge: 'Completo',
      features: ['Gerenciamento de pedidos online', 'Gerenciamento completo do cardápio', 'Envio de mensagens via WhatsApp', 'Gerenciamento de pedidos no salão', 'App do garçom'],
    },
  ];

  const handleUpdatePlan = async (planId: 'simples' | 'pro' | 'plus') => {
    setSavingPlan(true);
    try {
      await apiService.updateStoreConfig({ planoMensal: planId });
      setCurrentPlan(planId);
      notify('Plano atualizado com sucesso!', 'success');
    } catch {
      notify('Erro ao atualizar plano.', 'error');
    } finally {
      setSavingPlan(false);
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
  const zApiBlockedByPlan = currentPlan === 'simples';

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

          {/* Taxa de entrega por bairro */}
          <div className="bg-white rounded-2xl shadow-md border border-slate-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
              <Truck className="w-4 h-4 text-slate-500" />
              <h3 className="text-sm font-bold text-slate-800">Taxa de entrega por bairro</h3>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Bairro</label>
                  <input
                    type="text"
                    value={newNeighborhoodName}
                    onChange={(e) => setNewNeighborhoodName(e.target.value)}
                    placeholder="Ex: Centro"
                    className={inputClassPlain}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Taxa (R$)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={newNeighborhoodFee}
                    onChange={(e) => setNewNeighborhoodFee(e.target.value)}
                    placeholder="0.00"
                    className={inputClassPlain}
                  />
                </div>
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={handleCreateNeighborhood}
                    disabled={deliveryNeighborhoodsLoading}
                    className="w-full bg-indigo-600 text-white px-4 py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50"
                  >
                    Adicionar
                  </button>
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="grid grid-cols-12 bg-slate-50 px-4 py-3 text-xs font-semibold text-slate-600">
                  <div className="col-span-6">Bairro</div>
                  <div className="col-span-3">Taxa</div>
                  <div className="col-span-3 text-right">Ações</div>
                </div>

                {deliveryNeighborhoodsLoading ? (
                  <div className="px-4 py-6 text-sm text-slate-500">Carregando...</div>
                ) : deliveryNeighborhoods.length === 0 ? (
                  <div className="px-4 py-6 text-sm text-slate-500">Nenhum bairro cadastrado.</div>
                ) : (
                  <div className="divide-y divide-slate-200">
                    {deliveryNeighborhoods.map((n) => {
                      const isEditing = editingNeighborhoodId === n.id;
                      return (
                        <div key={n.id} className="grid grid-cols-12 px-4 py-3 items-center gap-2">
                          <div className="col-span-6">
                            {isEditing ? (
                              <input
                                type="text"
                                value={editingNeighborhoodName}
                                onChange={(e) => setEditingNeighborhoodName(e.target.value)}
                                className={inputClassPlain}
                              />
                            ) : (
                              <div className="text-sm font-medium text-slate-800">{n.nome}</div>
                            )}
                          </div>
                          <div className="col-span-3">
                            {isEditing ? (
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={editingNeighborhoodFee}
                                onChange={(e) => setEditingNeighborhoodFee(e.target.value)}
                                className={inputClassPlain}
                              />
                            ) : (
                              <div className="text-sm text-slate-700">R$ {Number(n.taxaEntrega || 0).toFixed(2)}</div>
                            )}
                          </div>
                          <div className="col-span-3 flex justify-end gap-2">
                            {isEditing ? (
                              <>
                                <button
                                  type="button"
                                  onClick={handleUpdateNeighborhood}
                                  disabled={deliveryNeighborhoodsLoading}
                                  className="px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50"
                                >
                                  Salvar
                                </button>
                                <button
                                  type="button"
                                  onClick={cancelEditNeighborhood}
                                  disabled={deliveryNeighborhoodsLoading}
                                  className="px-3 py-2 rounded-lg bg-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-300 disabled:opacity-50"
                                >
                                  Cancelar
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  onClick={() => startEditNeighborhood(n)}
                                  className="px-3 py-2 rounded-lg bg-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-300"
                                >
                                  Editar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteNeighborhood(n.id)}
                                  disabled={deliveryNeighborhoodsLoading}
                                  className="px-3 py-2 rounded-lg bg-rose-600 text-white text-sm font-semibold hover:bg-rose-700 disabled:opacity-50"
                                >
                                  Remover
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
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

          {/* Seção: Plano Mensal */}
          <div className="bg-white p-3 sm:p-4 md:p-6 rounded-xl shadow-md">
            <h3 className="text-lg font-semibold text-slate-800 mb-1 flex items-center gap-2">
              <Crown className="w-5 h-5 text-amber-500" />
              Plano Mensal
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 mb-4">
              Escolha o plano que melhor atende sua operação.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              {planOptions.map((plan) => {
                const isActive = currentPlan === plan.id;
                return (
                  <button
                    key={plan.id}
                    type="button"
                    disabled={savingPlan}
                    onClick={() => handleUpdatePlan(plan.id)}
                    className={`relative text-left p-4 rounded-xl border-2 transition-all duration-200 ${
                      isActive
                        ? `${plan.border} ${plan.bg} shadow-md`
                        : 'border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white'
                    } ${savingPlan ? 'opacity-60 cursor-not-allowed' : ''}`}
                  >
                    {(plan as any).badge && (
                      <span className={`absolute -top-2.5 right-3 bg-gradient-to-r ${plan.color} text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full shadow`}>
                        {(plan as any).badge}
                      </span>
                    )}

                    <div className="flex items-center gap-2 mb-2">
                      <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${plan.color} flex items-center justify-center`}>
                        {plan.id === 'plus' ? <Crown className="w-3.5 h-3.5 text-white" /> : <Store className="w-3.5 h-3.5 text-white" />}
                      </div>
                      <span className="text-base font-bold text-slate-800">{plan.name}</span>
                    </div>

                    <div className="mb-3">
                      <span className="text-2xl font-extrabold text-slate-900">R$ {plan.price}</span>
                      <span className="text-xs text-slate-500">/mês</span>
                    </div>

                    <ul className="space-y-1.5">
                      {plan.features.map((feat, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-xs text-slate-600">
                          <Check className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${isActive ? 'text-green-500' : 'text-slate-400'}`} />
                          {feat}
                        </li>
                      ))}
                    </ul>

                    {isActive && (
                      <div className={`mt-3 text-center text-xs font-bold uppercase tracking-wider bg-gradient-to-r ${plan.color} bg-clip-text text-transparent`}>
                        Plano Atual
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Seção: Integração Z-API (WhatsApp) */}
          <div className={`bg-white p-3 sm:p-4 md:p-6 rounded-xl shadow-md border ${zApiBlockedByPlan ? 'border-amber-200' : 'border-transparent'}`}>
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-800 mb-1 flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-green-600" />
                  Integração Z-API (WhatsApp)
                </h3>
                <p className="text-xs sm:text-sm text-slate-500">
                  Configure sua instância da Z-API para enviar notificações automáticas via WhatsApp.
                </p>
              </div>
              {zApiBlockedByPlan && (
                <div className="inline-flex items-center gap-2 self-start bg-amber-50 text-amber-700 border border-amber-200 rounded-full px-3 py-1.5 text-xs font-semibold whitespace-nowrap">
                  <Lock className="w-3.5 h-3.5" />
                  Requer plano Pro ou Plus
                </div>
              )}
            </div>

            {zApiBlockedByPlan && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-amber-700 flex items-start gap-2">
                  <Lock className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>A configuração da Z-API está indisponível no plano <strong>Simples</strong>. Atualize para o plano <strong>Pro</strong> ou <strong>Plus</strong> para usar o WhatsApp automático.</span>
                </p>
              </div>
            )}

            <form onSubmit={handleSubmitZapi} className={`space-y-4 ${zApiBlockedByPlan ? 'opacity-50 pointer-events-none' : ''}`}>
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
                  disabled={savingZapi || zApiBlockedByPlan}
                >
                  {zApiBlockedByPlan ? <Lock className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                  {zApiBlockedByPlan ? 'Disponível no Pro/Plus' : (savingZapi ? 'Salvando...' : 'Salvar Z-API')}
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