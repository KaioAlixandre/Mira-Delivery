import React from 'react';
import { Clock, Truck, DollarSign, Timer, Save, ToggleLeft, ToggleRight } from 'lucide-react';

export interface HorarioDia {
  aberto: boolean;
  abertura: string;
  fechamento: string;
}

export type HorariosPorDia = Record<string, HorarioDia>;

const diasSemanaFull = [
  { label: 'Domingo', short: 'Dom', value: '0' },
  { label: 'Segunda-feira', short: 'Seg', value: '1' },
  { label: 'Terça-feira', short: 'Ter', value: '2' },
  { label: 'Quarta-feira', short: 'Qua', value: '3' },
  { label: 'Quinta-feira', short: 'Qui', value: '4' },
  { label: 'Sexta-feira', short: 'Sex', value: '5' },
  { label: 'Sábado', short: 'Sáb', value: '6' },
];

const inputClass = "w-full pl-10 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition-all";
const inputClassPlain = "w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand focus:border-brand transition-colors";

export interface FuncionamentoLojaProps {
  config: any;
  horariosPorDia: HorariosPorDia;
  horarioDeliveryPorDia: HorariosPorDia;
  deliveryNeighborhoods: Array<{ id: number; nome: string; taxaEntrega: number }>;
  deliveryNeighborhoodsLoading: boolean;
  newNeighborhoodName: string;
  setNewNeighborhoodName: (v: string) => void;
  newNeighborhoodFee: string;
  setNewNeighborhoodFee: (v: string) => void;
  editingNeighborhoodId: number | null;
  editingNeighborhoodName: string;
  setEditingNeighborhoodName: (v: string) => void;
  editingNeighborhoodFee: string;
  setEditingNeighborhoodFee: (v: string) => void;
  onDayToggle: (day: string) => void;
  onTimeChange: (day: string, time: string, type: 'abertura' | 'fechamento') => void;
  onDeliveryDayToggle: (day: string) => void;
  onDeliveryTimeChange: (day: string, time: string, type: 'abertura' | 'fechamento') => void;
  onConfigChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onCreateNeighborhood: () => void;
  onStartEditNeighborhood: (n: { id: number; nome: string; taxaEntrega: number }) => void;
  onCancelEditNeighborhood: () => void;
  onUpdateNeighborhood: () => void;
  onDeleteNeighborhood: (id: number) => void;
  onSubmit: (e: React.FormEvent) => void;
  loading?: boolean;
}

const FuncionamentoLoja: React.FC<FuncionamentoLojaProps> = (props) => {
  const {
    config,
    horariosPorDia,
    horarioDeliveryPorDia,
    deliveryNeighborhoods,
    deliveryNeighborhoodsLoading,
    newNeighborhoodName,
    setNewNeighborhoodName,
    newNeighborhoodFee,
    setNewNeighborhoodFee,
    editingNeighborhoodId,
    editingNeighborhoodName,
    setEditingNeighborhoodName,
    editingNeighborhoodFee,
    setEditingNeighborhoodFee,
    onDayToggle,
    onTimeChange,
    onDeliveryDayToggle,
    onDeliveryTimeChange,
    onConfigChange,
    onCreateNeighborhood,
    onStartEditNeighborhood,
    onCancelEditNeighborhood,
    onUpdateNeighborhood,
    onDeleteNeighborhood,
    onSubmit,
    loading = false,
  } = props;

  return (
    <form onSubmit={onSubmit} className="space-y-4">
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
                  onClick={() => onDayToggle(dia.value)}
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
                      onChange={(e) => onTimeChange(dia.value, e.target.value, 'abertura')}
                      className="px-2 py-1.5 text-sm border border-slate-200 rounded-lg bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none w-[110px]"
                    />
                    <span className="text-slate-400 text-xs font-medium">até</span>
                    <input
                      type="time"
                      value={h.fechamento}
                      onChange={(e) => onTimeChange(dia.value, e.target.value, 'fechamento')}
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
                  onClick={() => onDeliveryDayToggle(dia.value)}
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
                      onChange={(e) => onDeliveryTimeChange(dia.value, e.target.value, 'abertura')}
                      className="px-2 py-1.5 text-sm border border-slate-200 rounded-lg bg-white focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none w-[110px]"
                    />
                    <span className="text-slate-400 text-xs font-medium">até</span>
                    <input
                      type="time"
                      value={h.fechamento}
                      onChange={(e) => onDeliveryTimeChange(dia.value, e.target.value, 'fechamento')}
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
                onClick={onCreateNeighborhood}
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
                              onClick={onUpdateNeighborhood}
                              disabled={deliveryNeighborhoodsLoading}
                              className="px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50"
                            >
                              Salvar
                            </button>
                            <button
                              type="button"
                              onClick={onCancelEditNeighborhood}
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
                              onClick={() => onStartEditNeighborhood(n)}
                              className="px-3 py-2 rounded-lg bg-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-300"
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              onClick={() => onDeleteNeighborhood(n.id)}
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
                  onChange={onConfigChange}
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
                  onChange={onConfigChange}
                  placeholder="Ex: 40 - 50 min"
                  className={inputClass}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

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
  );
};

export default FuncionamentoLoja;
