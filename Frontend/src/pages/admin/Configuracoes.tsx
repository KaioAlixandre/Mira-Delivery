import React, { useEffect, useState } from 'react';
import { useNotification } from '../../components/NotificationProvider';
import apiService from '../../services/api';
import { Store, Save } from 'lucide-react';
import FuncionamentoLoja from './FuncionamentoLoja';

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

const Configuracoes: React.FC = () => {
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [deliveryStart, setDeliveryStart] = useState('');
  const [deliveryEnd, setDeliveryEnd] = useState('');
  const [horariosPorDia, setHorariosPorDia] = useState<HorariosPorDia>({});
  const [horarioDeliveryPorDia, setHorarioDeliveryPorDia] = useState<HorariosPorDia>({});

  const [deliveryNeighborhoods, setDeliveryNeighborhoods] = useState<Array<{ id: number; nome: string; taxaEntrega: number }>>([]);
  const [deliveryNeighborhoodsLoading, setDeliveryNeighborhoodsLoading] = useState(false);
  const [newNeighborhoodName, setNewNeighborhoodName] = useState('');
  const [newNeighborhoodFee, setNewNeighborhoodFee] = useState('');
  const [editingNeighborhoodId, setEditingNeighborhoodId] = useState<number | null>(null);
  const [editingNeighborhoodName, setEditingNeighborhoodName] = useState('');
  const [editingNeighborhoodFee, setEditingNeighborhoodFee] = useState('');

  const { notify } = useNotification();

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
        aberto: data.aberto !== false,
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

    loadDeliveryNeighborhoods();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      aberto: config.aberto !== false,
      isOpen: config.aberto !== false,
      openingTime: firstOpen?.abertura || config.openTime || '08:00',
      closingTime: firstOpen?.fechamento || config.closeTime || '22:00',
      deliveryStart: firstDeliveryOpen?.abertura || deliveryStart || '08:00',
      deliveryEnd: firstDeliveryOpen?.fechamento || deliveryEnd || '22:00',
      diasAbertos: diasAbertosDerived,
      horariosPorDia,
      horarioDeliveryPorDia,
      deliveryEnabled: config.deliveryAtivo,
      deliveryAtivo: config.deliveryAtivo !== false,
      valorPedidoMinimo: config.valorPedidoMinimo,
      estimativaEntrega: config.estimativaEntrega,
      nomeLoja: config.nomeLoja,
      corPrimaria: config.corPrimaria || '#ea1d2c',
      promocaoTaxaAtiva: !!config.promocaoTaxaAtiva,
      promocaoDias: config.promocaoDias ?? '',
      promocaoValorMinimo: config.promocaoValorMinimo ?? '',
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

  return (
    <div id="configuracoes" className="page space-y-5">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Configurações</h2>
          <p className="text-sm text-slate-500 mt-1">Configure o funcionamento da sua loja</p>
        </div>
        <button
          type="submit"
          form="form-funcionamento-loja"
          disabled={loading}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200/50 disabled:opacity-50 disabled:cursor-not-allowed text-sm flex-shrink-0"
        >
          <Save className="w-4 h-4" />
          Salvar Alterações
        </button>
      </header>

      <FuncionamentoLoja
        config={config}
        horariosPorDia={horariosPorDia}
        horarioDeliveryPorDia={horarioDeliveryPorDia}
        deliveryNeighborhoods={deliveryNeighborhoods}
        deliveryNeighborhoodsLoading={deliveryNeighborhoodsLoading}
        newNeighborhoodName={newNeighborhoodName}
        setNewNeighborhoodName={setNewNeighborhoodName}
        newNeighborhoodFee={newNeighborhoodFee}
        setNewNeighborhoodFee={setNewNeighborhoodFee}
        editingNeighborhoodId={editingNeighborhoodId}
        editingNeighborhoodName={editingNeighborhoodName}
        setEditingNeighborhoodName={setEditingNeighborhoodName}
        editingNeighborhoodFee={editingNeighborhoodFee}
        setEditingNeighborhoodFee={setEditingNeighborhoodFee}
        onDayToggle={handleDayToggle}
        onTimeChange={handleTimeChange}
        onDeliveryDayToggle={handleDeliveryDayToggle}
        onDeliveryTimeChange={handleDeliveryTimeChange}
        onConfigChange={handleChange}
        onCreateNeighborhood={handleCreateNeighborhood}
        onStartEditNeighborhood={startEditNeighborhood}
        onCancelEditNeighborhood={cancelEditNeighborhood}
        onUpdateNeighborhood={handleUpdateNeighborhood}
        onDeleteNeighborhood={handleDeleteNeighborhood}
        onSubmit={handleSubmitLoja}
        loading={loading}
      />
    </div>
  );
};

export default Configuracoes;