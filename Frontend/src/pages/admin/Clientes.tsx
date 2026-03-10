import React, { useState, useMemo } from 'react';
import { Users, TrendingUp, Search, ShoppingBag, Trophy, UserCheck, Phone, Mail } from 'lucide-react';
import { User } from '../../types';

const formatCurrency = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const getInitials = (name: string) => {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
};

const avatarColors = [
  'bg-indigo-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500',
  'bg-cyan-500', 'bg-violet-500', 'bg-pink-500', 'bg-teal-500',
];

const Clientes: React.FC<{ user: User[] }> = ({ user }) => {
  const [search, setSearch] = useState('');

  const clientesComDados = useMemo(() =>
    user.map((cliente) => {
      const todosPedidos = cliente.order || [];
      const pedidos = todosPedidos.filter((order: { status?: string }) => order.status !== 'canceled');
      const totalGasto = pedidos.reduce((acc, order) => {
        const valor = Number(order.totalPrice) || 0;
        return acc + (isNaN(valor) ? 0 : valor);
      }, 0);
      const totalPedidos = pedidos.length;
      const ticketMedio = totalPedidos > 0 ? totalGasto / totalPedidos : 0;
      return { ...cliente, totalGasto, totalPedidos, ticketMedio };
    }),
  [user]);

  const clientesOrdenados = useMemo(() =>
    [...clientesComDados].sort((a, b) => {
      if (b.totalPedidos !== a.totalPedidos) return b.totalPedidos - a.totalPedidos;
      return b.totalGasto - a.totalGasto;
    }),
  [clientesComDados]);

  const clientesFiltrados = useMemo(() => {
    if (!search.trim()) return clientesOrdenados;
    const q = search.toLowerCase();
    return clientesOrdenados.filter(
      (c) =>
        c.nomeUsuario?.toLowerCase().includes(q) ||
        c.telefone?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q),
    );
  }, [clientesOrdenados, search]);

  const totalClientes = user.length;
  const receitaTotal = clientesComDados.reduce((acc, c) => acc + c.totalGasto, 0);
  const averageLTV = totalClientes > 0 ? receitaTotal / totalClientes : 0;
  const totalPedidosGeral = clientesComDados.reduce((acc, c) => acc + c.totalPedidos, 0);
  const clientesAtivos = clientesComDados.filter((c) => c.totalPedidos > 0).length;

  return (
    <div id="clientes" className="page space-y-5">
      {/* Header */}
      <header>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Clientes</h2>
        <p className="text-sm text-slate-500 mt-1">Acompanhe e gerencie sua base de clientes</p>
      </header>

      {/* Cards de Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white p-3 rounded-lg shadow-sm border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-brand-light rounded-md flex-shrink-0">
              <Users className="w-4 h-4 text-brand" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-[10px] sm:text-xs text-slate-600 mb-0.5">Total de Clientes</h3>
              <p className="text-xl sm:text-2xl font-bold text-slate-800">{totalClientes}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-3 rounded-lg shadow-sm border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-green-100 rounded-md flex-shrink-0">
              <TrendingUp className="w-4 h-4 text-green-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-[10px] sm:text-xs text-slate-600 mb-0.5">LTV Médio</h3>
              <p className="text-xl sm:text-2xl font-bold text-slate-800">{formatCurrency(averageLTV)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-3 rounded-lg shadow-sm border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-amber-100 rounded-md flex-shrink-0">
              <ShoppingBag className="w-4 h-4 text-amber-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-[10px] sm:text-xs text-slate-600 mb-0.5">Total de Pedidos</h3>
              <p className="text-xl sm:text-2xl font-bold text-slate-800">{totalPedidosGeral}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-3 rounded-lg shadow-sm border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-violet-100 rounded-md flex-shrink-0">
              <UserCheck className="w-4 h-4 text-violet-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-[10px] sm:text-xs text-slate-600 mb-0.5">Clientes Ativos</h3>
              <p className="text-xl sm:text-2xl font-bold text-slate-800">{clientesAtivos}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search + Table */}
      <div className="bg-white rounded-2xl shadow-md border border-slate-100 overflow-hidden">
        {/* Search bar */}
        <div className="p-4 border-b border-slate-100">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por nome, telefone ou e-mail..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-brand focus:ring-2 focus:ring-brand outline-none transition-all"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[640px]">
            <thead>
              <tr className="bg-slate-50/80">
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">#</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Cliente</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">Contato</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Pedidos</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Total Gasto</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Ticket Médio</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {clientesFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="bg-slate-100 p-4 rounded-full">
                        <Users className="w-8 h-8 text-slate-400" />
                      </div>
                      <p className="text-slate-500 font-medium">
                        {search ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado'}
                      </p>
                      {search && (
                        <p className="text-xs text-slate-400">Tente buscar com outros termos</p>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                clientesFiltrados.map((cliente) => {
                  const globalIndex = clientesOrdenados.findIndex((c) => c.id === cliente.id);
                  const isTop3 = globalIndex < 3 && cliente.totalPedidos > 0;
                  const rankColors = ['text-amber-500', 'text-slate-400', 'text-orange-400'];
                  const colorIndex = cliente.id % avatarColors.length;

                  return (
                    <tr
                      key={cliente.id}
                      className="hover:bg-brand-light transition-colors group"
                    >
                      {/* Rank */}
                      <td className="px-4 py-3.5 w-12">
                        {isTop3 ? (
                          <div className="flex items-center justify-center">
                            <Trophy className={`w-4 h-4 ${rankColors[globalIndex]}`} />
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 flex items-center justify-center">
                            {globalIndex + 1}
                          </span>
                        )}
                      </td>

                      {/* Name + Avatar */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div
                            className={`${avatarColors[colorIndex]} w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-sm`}
                          >
                            {getInitials(cliente.nomeUsuario || '??')}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-800 truncate">
                              {cliente.nomeUsuario}
                            </p>
                            <p className="text-xs text-slate-500 md:hidden truncate">
                              {cliente.telefone || '-'}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Contact */}
                      <td className="px-4 py-3.5 hidden md:table-cell">
                        <div className="space-y-1">
                          {cliente.telefone && (
                            <div className="flex items-center gap-1.5 text-slate-600">
                              <Phone className="w-3.5 h-3.5 text-slate-400" />
                              <span className="text-xs">{cliente.telefone}</span>
                            </div>
                          )}
                          {cliente.email && (
                            <div className="flex items-center gap-1.5 text-slate-600">
                              <Mail className="w-3.5 h-3.5 text-slate-400" />
                              <span className="text-xs truncate max-w-[180px]">{cliente.email}</span>
                            </div>
                          )}
                          {!cliente.telefone && !cliente.email && (
                            <span className="text-xs text-slate-400">-</span>
                          )}
                        </div>
                      </td>

                      {/* Orders count */}
                      <td className="px-4 py-3.5 text-center">
                        <span
                          className={`inline-flex items-center justify-center min-w-[32px] px-2.5 py-1 rounded-full text-xs font-bold ${
                            cliente.totalPedidos > 0
                              ? 'bg-brand-light text-brand'
                              : 'bg-slate-100 text-slate-400'
                          }`}
                        >
                          {cliente.totalPedidos}
                        </span>
                      </td>

                      {/* Total spent */}
                      <td className="px-4 py-3.5 text-right">
                        <p className="text-sm font-semibold text-slate-800">
                          {formatCurrency(cliente.totalGasto)}
                        </p>
                      </td>

                      {/* Ticket médio */}
                      <td className="px-4 py-3.5 text-right">
                        <p className="text-sm text-slate-600">
                          {cliente.totalPedidos > 0
                            ? formatCurrency(cliente.ticketMedio)
                            : '-'}
                        </p>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        {clientesFiltrados.length > 0 && (
          <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <p className="text-xs text-slate-500">
              {clientesFiltrados.length === clientesOrdenados.length
                ? `${clientesFiltrados.length} cliente${clientesFiltrados.length !== 1 ? 's' : ''}`
                : `${clientesFiltrados.length} de ${clientesOrdenados.length} cliente${clientesOrdenados.length !== 1 ? 's' : ''}`}
            </p>
            <p className="text-xs text-slate-500">
              Receita total: <span className="font-semibold text-slate-700">{formatCurrency(receitaTotal)}</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Clientes;