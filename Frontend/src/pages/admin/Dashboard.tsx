import React, { useState, useEffect, useCallback } from 'react';
import { 
  DollarSign, 
  ShoppingCart, 
  TrendingUp, 
  RefreshCw,
  Calendar,
  Target,
  Lightbulb,
  Trophy,
  BarChart3,
  CheckCircle,
  Rocket,
  AlertTriangle
} from 'lucide-react';
import { apiService } from '../../services/api';
import { DashboardMetrics, TopProduct } from '../../types';
import MetricCard from '../../components/MetricCard';
import TopProductsTable from '../../components/TopProductsTable';
import WeeklyChart from '../../components/WeeklyChart';
import OrderStatusOverview from '../../components/OrderStatusOverview';

type Period = 'daily' | 'weekly' | 'monthly' | 'yearly';

interface PeriodMetrics {
  period: string;
  revenue: number;
  sales: number;
  ticketAverage: number;
}

const Dashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [selectedPeriod, setSelectedPeriod] = useState<Period>('weekly');
  const [periodMetrics, setPeriodMetrics] = useState<PeriodMetrics | null>(null);
  const [periodLoading, setPeriodLoading] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedDay, setSelectedDay] = useState<number>(new Date().getDate());
  const [selectedYearForYearly, setSelectedYearForYearly] = useState<number>(new Date().getFullYear());
  
  // Estados para produtos mais vendidos
  const [topProductsPeriod, setTopProductsPeriod] = useState<'all' | 'daily' | 'weekly' | 'monthly' | 'yearly'>('all');
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [topProductsLoading, setTopProductsLoading] = useState(false);
  const [topProductsMonth, setTopProductsMonth] = useState<number>(new Date().getMonth());
  const [topProductsYear, setTopProductsYear] = useState<number>(new Date().getFullYear());
  const [topProductsDay, setTopProductsDay] = useState<number>(new Date().getDate());
  const [topProductsYearForYearly, setTopProductsYearForYearly] = useState<number>(new Date().getFullYear());

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiService.getDashboardMetrics();
      setMetrics(data);
      setLastUpdate(new Date());
    } catch (err) {
      setError('Erro ao carregar métricas do dashboard');
     
    } finally {
      setLoading(false);
    }
  };

  // Função para obter o número de dias em um mês
  const getDaysInMonth = (month: number, year: number): number => {
    return new Date(year, month + 1, 0).getDate();
  };

  const fetchPeriodMetrics = useCallback(async (period: Period, month?: number, year?: number, day?: number) => {
    try {
      setPeriodLoading(true);
      const data = await apiService.getPeriodMetrics(period, month, year, day);
      setPeriodMetrics(data);
    } catch (err) {
      console.error('Erro ao carregar métricas do período:', err);
    } finally {
      setPeriodLoading(false);
    }
  }, []);

  const fetchTopProducts = useCallback(async (
    period: 'all' | 'daily' | 'weekly' | 'monthly' | 'yearly',
    month?: number,
    year?: number,
    day?: number
  ) => {
    try {
      setTopProductsLoading(true);
      const data = await apiService.getTopProducts(period, month, year, day);
      setTopProducts(data);
    } catch (err) {
      console.error('Erro ao carregar produtos mais vendidos:', err);
      setTopProducts([]);
    } finally {
      setTopProductsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
    fetchTopProducts('all'); // Carregar produtos acumulativos por padrão
  }, [fetchTopProducts]);

  // Ajustar o dia selecionado quando o mês ou ano muda (para evitar dias inválidos como 31 de fevereiro)
  useEffect(() => {
    if (selectedPeriod === 'daily') {
      const daysInMonth = getDaysInMonth(selectedMonth, selectedYear);
      if (selectedDay > daysInMonth) {
        setSelectedDay(daysInMonth);
      }
    }
    if (topProductsPeriod === 'daily') {
      const daysInMonth = getDaysInMonth(topProductsMonth, topProductsYear);
      if (topProductsDay > daysInMonth) {
        setTopProductsDay(daysInMonth);
      }
    }
  }, [selectedMonth, selectedYear, selectedPeriod, selectedDay, topProductsMonth, topProductsYear, topProductsPeriod, topProductsDay]);

  // Buscar produtos mais vendidos quando o período muda
  useEffect(() => {
    if (topProductsPeriod === 'monthly') {
      fetchTopProducts(topProductsPeriod, topProductsMonth, topProductsYear);
    } else if (topProductsPeriod === 'daily') {
      fetchTopProducts(topProductsPeriod, topProductsMonth, topProductsYear, topProductsDay);
    } else if (topProductsPeriod === 'yearly') {
      fetchTopProducts(topProductsPeriod, undefined, topProductsYearForYearly);
    } else {
      fetchTopProducts(topProductsPeriod);
    }
  }, [topProductsPeriod, topProductsMonth, topProductsYear, topProductsDay, topProductsYearForYearly, fetchTopProducts]);

  useEffect(() => {
    if (selectedPeriod === 'monthly') {
      fetchPeriodMetrics(selectedPeriod, selectedMonth, selectedYear);
    } else if (selectedPeriod === 'daily') {
      fetchPeriodMetrics(selectedPeriod, selectedMonth, selectedYear, selectedDay);
    } else if (selectedPeriod === 'yearly') {
      fetchPeriodMetrics(selectedPeriod, undefined, selectedYearForYearly);
    } else {
      fetchPeriodMetrics(selectedPeriod);
    }
  }, [selectedPeriod, selectedMonth, selectedYear, selectedDay, selectedYearForYearly, fetchPeriodMetrics]);

  const formatLastUpdate = () => {
    return new Intl.DateTimeFormat('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(lastUpdate);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-600">Carregando dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
          <button 
            onClick={fetchMetrics}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  if (!metrics) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-3 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-xs sm:text-sm text-gray-600 mt-1">
                Visão geral do desempenho da sua loja
              </p>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
              <div className="text-xs sm:text-sm text-gray-500">
                Última atualização: {formatLastUpdate()}
              </div>
              <button
                onClick={fetchMetrics}
                disabled={loading}
                className="flex items-center justify-center px-3 sm:px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Atualizar
              </button>
            </div>
          </div>
        </div>

        {/* Cards de Métricas Principais */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <MetricCard
            title="Faturamento Hoje"
            value={metrics.daily.revenue}
            change={metrics.daily.revenueChange}
            icon={<DollarSign className="w-6 h-6" />}
            color="text-green-600"
            format="currency"
          />
          
          <MetricCard
            title="Vendas Hoje"
            value={metrics.daily.sales}
            change={metrics.daily.ordersChange}
            icon={<ShoppingCart className="w-6 h-6" />}
            color="text-blue-600"
            format="number"
          />
          
          <MetricCard
            title="Ticket Médio"
            value={metrics.daily.ticketAverage}
            icon={<Target className="w-6 h-6" />}
            color="text-purple-600"
            format="currency"
          />
          
          <MetricCard
            title="Pedidos Pendentes"
            value={metrics.pendingOrders}
            icon={<Calendar className="w-6 h-6" />}
            color="text-orange-600"
            format="number"
          />
        </div>

        {/* Status dos Pedidos e Ações */}
        <div className="mb-4">
          <OrderStatusOverview 
            statusData={metrics.todayOrdersStatus}
            pendingOrders={metrics.pendingOrders}
          />
        </div>

        {/* Gráficos e Tabelas */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-4">
          {/* Vendas da Semana */}
          <WeeklyChart 
            data={metrics.weekly.data}
            title="Vendas da Semana"
          />

          {/* Resumo por Período */}
          <div className="bg-white rounded-lg shadow-md p-3 sm:p-6">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900">Resumo de Faturamento</h3>
              <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-green-500" />
            </div>
            
            {/* Period Selector */}
            <div className="mb-4">
              <div className="flex flex-wrap gap-2 mb-3">
                <button
                  onClick={() => setSelectedPeriod('daily')}
                  className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-colors ${
                    selectedPeriod === 'daily'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Diário
                </button>
                <button
                  onClick={() => setSelectedPeriod('weekly')}
                  className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-colors ${
                    selectedPeriod === 'weekly'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Semanal
                </button>
                <button
                  onClick={() => setSelectedPeriod('monthly')}
                  className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-colors ${
                    selectedPeriod === 'monthly'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Mensal
                </button>
                <button
                  onClick={() => setSelectedPeriod('yearly')}
                  className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-colors ${
                    selectedPeriod === 'yearly'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Anual
                </button>
              </div>
              
              {/* Date Selector for Daily Period */}
              {selectedPeriod === 'daily' && (
                <div className="flex flex-wrap gap-3 items-center">
                  <label className="text-xs sm:text-sm font-medium text-gray-700">
                    Selecionar data:
                  </label>
                  <select
                    value={selectedDay}
                    onChange={(e) => setSelectedDay(parseInt(e.target.value, 10))}
                    className="px-3 py-1.5 text-xs sm:text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {Array.from({ length: getDaysInMonth(selectedMonth, selectedYear) }, (_, i) => {
                      const day = i + 1;
                      return (
                        <option key={day} value={day}>
                          {day.toString().padStart(2, '0')}
                        </option>
                      );
                    })}
                  </select>
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(parseInt(e.target.value, 10))}
                    className="px-3 py-1.5 text-xs sm:text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value={0}>Janeiro</option>
                    <option value={1}>Fevereiro</option>
                    <option value={2}>Março</option>
                    <option value={3}>Abril</option>
                    <option value={4}>Maio</option>
                    <option value={5}>Junho</option>
                    <option value={6}>Julho</option>
                    <option value={7}>Agosto</option>
                    <option value={8}>Setembro</option>
                    <option value={9}>Outubro</option>
                    <option value={10}>Novembro</option>
                    <option value={11}>Dezembro</option>
                  </select>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
                    className="px-3 py-1.5 text-xs sm:text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {Array.from({ length: 5 }, (_, i) => {
                      const year = new Date().getFullYear() - 2 + i;
                      return (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      );
                    })}
                  </select>
                </div>
              )}

              {/* Month/Year Selector for Monthly Period */}
              {selectedPeriod === 'monthly' && (
                <div className="flex flex-wrap gap-3 items-center">
                  <label className="text-xs sm:text-sm font-medium text-gray-700">
                    Selecionar mês:
                  </label>
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(parseInt(e.target.value, 10))}
                    className="px-3 py-1.5 text-xs sm:text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value={0}>Janeiro</option>
                    <option value={1}>Fevereiro</option>
                    <option value={2}>Março</option>
                    <option value={3}>Abril</option>
                    <option value={4}>Maio</option>
                    <option value={5}>Junho</option>
                    <option value={6}>Julho</option>
                    <option value={7}>Agosto</option>
                    <option value={8}>Setembro</option>
                    <option value={9}>Outubro</option>
                    <option value={10}>Novembro</option>
                    <option value={11}>Dezembro</option>
                  </select>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
                    className="px-3 py-1.5 text-xs sm:text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {Array.from({ length: 5 }, (_, i) => {
                      const year = new Date().getFullYear() - 2 + i;
                      return (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      );
                    })}
                  </select>
                </div>
              )}

              {/* Year Selector for Yearly Period */}
              {selectedPeriod === 'yearly' && (
                <div className="flex flex-wrap gap-3 items-center">
                  <label className="text-xs sm:text-sm font-medium text-gray-700">
                    Selecionar ano:
                  </label>
                  <select
                    value={selectedYearForYearly}
                    onChange={(e) => setSelectedYearForYearly(parseInt(e.target.value, 10))}
                    className="px-3 py-1.5 text-xs sm:text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {Array.from({ length: 5 }, (_, i) => {
                      const year = new Date().getFullYear() - 2 + i;
                      return (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      );
                    })}
                  </select>
                </div>
              )}
            </div>

            {periodLoading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
              </div>
            ) : periodMetrics ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 sm:p-4 bg-green-50 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm text-green-700">
                      Faturamento Total do {periodMetrics.period}
                    </p>
                    <p className="text-lg sm:text-2xl font-bold text-green-900">
                      {new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL'
                      }).format(periodMetrics.revenue)}
                    </p>
                  </div>
                  <DollarSign className="w-6 h-6 sm:w-8 sm:h-8 text-green-600 flex-shrink-0 ml-2" />
                </div>

                <div className="flex items-center justify-between p-3 sm:p-4 bg-blue-50 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm text-blue-700">
                      Total de Pedidos do {periodMetrics.period}
                    </p>
                    <p className="text-lg sm:text-2xl font-bold text-blue-900">
                      {periodMetrics.sales}
                    </p>
                  </div>
                  <ShoppingCart className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600 flex-shrink-0 ml-2" />
                </div>

                <div className="flex items-center justify-between p-3 sm:p-4 bg-purple-50 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm text-purple-700">
                      Ticket Médio do {periodMetrics.period}
                    </p>
                    <p className="text-lg sm:text-2xl font-bold text-purple-900">
                      {new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL'
                      }).format(periodMetrics.ticketAverage)}
                    </p>
                  </div>
                  <Target className="w-6 h-6 sm:w-8 sm:h-8 text-purple-600 flex-shrink-0 ml-2" />
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500 text-sm">
                Nenhum dado disponível
              </div>
            )}
          </div>
        </div>

        {/* Produtos Mais Vendidos */}
        <div className="mb-4">
          <div className="bg-white rounded-lg shadow-md p-3 sm:p-6">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900">Produtos Mais Vendidos</h3>
            </div>
            
            {/* Period Selector */}
            <div className="mb-4">
              <div className="flex flex-wrap gap-2 mb-3">
                <button
                  onClick={() => setTopProductsPeriod('all')}
                  className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-colors ${
                    topProductsPeriod === 'all'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Geral
                </button>
                <button
                  onClick={() => setTopProductsPeriod('daily')}
                  className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-colors ${
                    topProductsPeriod === 'daily'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Diário
                </button>
                <button
                  onClick={() => setTopProductsPeriod('weekly')}
                  className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-colors ${
                    topProductsPeriod === 'weekly'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Semanal
                </button>
                <button
                  onClick={() => setTopProductsPeriod('monthly')}
                  className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-colors ${
                    topProductsPeriod === 'monthly'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Mensal
                </button>
                <button
                  onClick={() => setTopProductsPeriod('yearly')}
                  className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-colors ${
                    topProductsPeriod === 'yearly'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Anual
                </button>
              </div>
              
              {/* Date Selector for Daily Period */}
              {topProductsPeriod === 'daily' && (
                <div className="flex flex-wrap gap-3 items-center">
                  <label className="text-xs sm:text-sm font-medium text-gray-700">
                    Selecionar data:
                  </label>
                  <select
                    value={topProductsDay}
                    onChange={(e) => setTopProductsDay(parseInt(e.target.value, 10))}
                    className="px-3 py-1.5 text-xs sm:text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {Array.from({ length: getDaysInMonth(topProductsMonth, topProductsYear) }, (_, i) => {
                      const day = i + 1;
                      return (
                        <option key={day} value={day}>
                          {day.toString().padStart(2, '0')}
                        </option>
                      );
                    })}
                  </select>
                  <select
                    value={topProductsMonth}
                    onChange={(e) => setTopProductsMonth(parseInt(e.target.value, 10))}
                    className="px-3 py-1.5 text-xs sm:text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value={0}>Janeiro</option>
                    <option value={1}>Fevereiro</option>
                    <option value={2}>Março</option>
                    <option value={3}>Abril</option>
                    <option value={4}>Maio</option>
                    <option value={5}>Junho</option>
                    <option value={6}>Julho</option>
                    <option value={7}>Agosto</option>
                    <option value={8}>Setembro</option>
                    <option value={9}>Outubro</option>
                    <option value={10}>Novembro</option>
                    <option value={11}>Dezembro</option>
                  </select>
                  <select
                    value={topProductsYear}
                    onChange={(e) => setTopProductsYear(parseInt(e.target.value, 10))}
                    className="px-3 py-1.5 text-xs sm:text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {Array.from({ length: 5 }, (_, i) => {
                      const year = new Date().getFullYear() - 2 + i;
                      return (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      );
                    })}
                  </select>
                </div>
              )}

              {/* Month/Year Selector for Monthly Period */}
              {topProductsPeriod === 'monthly' && (
                <div className="flex flex-wrap gap-3 items-center">
                  <label className="text-xs sm:text-sm font-medium text-gray-700">
                    Selecionar mês:
                  </label>
                  <select
                    value={topProductsMonth}
                    onChange={(e) => setTopProductsMonth(parseInt(e.target.value, 10))}
                    className="px-3 py-1.5 text-xs sm:text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value={0}>Janeiro</option>
                    <option value={1}>Fevereiro</option>
                    <option value={2}>Março</option>
                    <option value={3}>Abril</option>
                    <option value={4}>Maio</option>
                    <option value={5}>Junho</option>
                    <option value={6}>Julho</option>
                    <option value={7}>Agosto</option>
                    <option value={8}>Setembro</option>
                    <option value={9}>Outubro</option>
                    <option value={10}>Novembro</option>
                    <option value={11}>Dezembro</option>
                  </select>
                  <select
                    value={topProductsYear}
                    onChange={(e) => setTopProductsYear(parseInt(e.target.value, 10))}
                    className="px-3 py-1.5 text-xs sm:text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {Array.from({ length: 5 }, (_, i) => {
                      const year = new Date().getFullYear() - 2 + i;
                      return (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      );
                    })}
                  </select>
                </div>
              )}

              {/* Year Selector for Yearly Period */}
              {topProductsPeriod === 'yearly' && (
                <div className="flex flex-wrap gap-3 items-center">
                  <label className="text-xs sm:text-sm font-medium text-gray-700">
                    Selecionar ano:
                  </label>
                  <select
                    value={topProductsYearForYearly}
                    onChange={(e) => setTopProductsYearForYearly(parseInt(e.target.value, 10))}
                    className="px-3 py-1.5 text-xs sm:text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {Array.from({ length: 5 }, (_, i) => {
                      const year = new Date().getFullYear() - 2 + i;
                      return (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      );
                    })}
                  </select>
                </div>
              )}
            </div>

            {topProductsLoading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
              </div>
            ) : (
              <TopProductsTable products={topProducts} />
            )}
          </div>
        </div>

        {/* Insights e Dicas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-6">
          <div className="bg-white rounded-lg shadow-md p-3 sm:p-6">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-yellow-500" />
              Insights
            </h3>
            <div className="space-y-2 sm:space-y-3">
              {metrics.daily.revenueChange > 10 && (
                <div className="p-2 sm:p-3 bg-green-50 rounded-lg border border-green-200 flex items-start gap-2">
                  <Rocket className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <p className="text-green-800 text-xs sm:text-sm">
                    Excelente! O faturamento de hoje está {metrics.daily.revenueChange.toFixed(1)}% maior que ontem!
                  </p>
                </div>
              )}
              
              {metrics.topProducts.length > 0 && (
                <div className="p-2 sm:p-3 bg-blue-50 rounded-lg border border-blue-200 flex items-start gap-2">
                  <Trophy className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <p className="text-blue-800 text-xs sm:text-sm">
                    Seu produto mais vendido é "{metrics.topProducts[0].name || 'Produto desconhecido'}" com {metrics.topProducts[0].quantitySold ?? 0} unidades vendidas!
                  </p>
                </div>
              )}
              
              {metrics.daily.ticketAverage > 0 && (
                <div className="p-2 sm:p-3 bg-purple-50 rounded-lg border border-purple-200 flex items-start gap-2">
                  <DollarSign className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
                  <p className="text-purple-800 text-xs sm:text-sm">
                    Seu ticket médio hoje é de {new Intl.NumberFormat('pt-BR', {
                      style: 'currency',
                      currency: 'BRL'
                    }).format(metrics.daily.ticketAverage)}
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-3 sm:p-6">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-brand" />
              Próximas Ações
            </h3>
            <div className="space-y-2 sm:space-y-3">
              {metrics.pendingOrders > 5 && (
                <div className="p-2 sm:p-3 bg-yellow-50 rounded-lg border border-yellow-200 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <p className="text-yellow-800 text-xs sm:text-sm">
                    Você tem muitos pedidos pendentes. Considere processar os mais antigos primeiro.
                  </p>
                </div>
              )}
              
              {metrics.daily.sales === 0 && (
                <div className="p-2 sm:p-3 bg-orange-50 rounded-lg border border-orange-200 flex items-start gap-2">
                  <TrendingUp className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
                  <p className="text-orange-800 text-xs sm:text-sm">
                    Ainda não houve vendas hoje. Que tal criar uma promoção especial?
                  </p>
                </div>
              )}
              
              <div className="p-2 sm:p-3 bg-gray-50 rounded-lg border border-gray-200 flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-gray-600 mt-0.5 flex-shrink-0" />
                <p className="text-gray-800 text-xs sm:text-sm">
                  Continue acompanhando suas métricas diariamente para melhores resultados!
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;