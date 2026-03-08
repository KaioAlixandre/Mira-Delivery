import React, { useEffect, useState, useMemo } from 'react';
import { useNotification } from '../../components/NotificationProvider';
import apiService from '../../services/api';
import { Deliverer } from '../../types';
import { Plus, Edit, Trash2, User, Phone, ToggleLeft, ToggleRight, X, Truck, Search, Users, UserCheck, UserX, Calendar } from 'lucide-react';
import { applyPhoneMask, validatePhoneWithAPI, removePhoneMask } from '../../utils/phoneValidation';

const avatarColors = [
  'bg-indigo-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500',
  'bg-cyan-500', 'bg-violet-500', 'bg-pink-500', 'bg-teal-500',
];

const getInitials = (name: string) => {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
};

const Entregadores: React.FC = () => {
  const [deliverers, setDeliverers] = useState<Deliverer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingDeliverer, setEditingDeliverer] = useState<Deliverer | null>(null);
  const [form, setForm] = useState({
    name: '',
    phone: ''
  });
  const [validatingPhone, setValidatingPhone] = useState(false);
  const [search, setSearch] = useState('');
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [delivererToDeleteId, setDelivererToDeleteId] = useState<number | null>(null);

  useEffect(() => {
    loadDeliverers();
  }, []);

  const { notify } = useNotification();
  const loadDeliverers = async () => {
    try {
      setLoading(true);
      const deliverersData = await apiService.getDeliverers();
      setDeliverers(deliverersData);
    } catch (error) {
     
      notify('Erro ao carregar entregadores', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filteredDeliverers = useMemo(() => {
    if (!search.trim()) return deliverers;
    const q = search.toLowerCase();
    return deliverers.filter(
      (d) => d.name?.toLowerCase().includes(q) || d.phone?.toLowerCase().includes(q),
    );
  }, [deliverers, search]);

  const totalEntregas = useMemo(
    () => deliverers.reduce((acc, d) => acc + (d.deliveriesCount || 0), 0),
    [deliverers],
  );
  const ativos = deliverers.filter((d) => d.isActive).length;
  const inativos = deliverers.length - ativos;

  const openModal = (deliverer?: Deliverer) => {
    if (deliverer) {
      setEditingDeliverer(deliverer);
      setForm({
        name: deliverer.name,
        phone: deliverer.phone
      });
    } else {
      setEditingDeliverer(null);
      setForm({ name: '', phone: '' });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingDeliverer(null);
    setForm({ name: '', phone: '' });
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === 'phone') {
      // Aplicar máscara de telefone
      const maskedValue = applyPhoneMask(value);
      setForm(prev => ({ ...prev, [name]: maskedValue }));
    } else {
      setForm(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.phone) {
      notify('Nome e telefone são obrigatórios', 'warning');
      return;
    }
    
    // Validar telefone com API
    setValidatingPhone(true);
    try {
      const phoneValidation = await validatePhoneWithAPI(form.phone);
      if (!phoneValidation.valid) {
        notify(phoneValidation.error || 'Número de telefone inválido. Verifique o formato (DDD + número).', 'warning');
        setValidatingPhone(false);
        return;
      }
    } catch (error) {
      notify('Erro ao validar telefone. Tente novamente.', 'error');
      setValidatingPhone(false);
      return;
    }
    setValidatingPhone(false);
    
    try {
      // Remover máscara antes de enviar ao backend
      const telefoneSemMascara = removePhoneMask(form.phone);
      const formDataToSend = {
        ...form,
        phone: telefoneSemMascara
      };
      
      if (editingDeliverer) {
        await apiService.updateDeliverer(editingDeliverer.id, formDataToSend);
        notify('Entregador atualizado com sucesso!', 'success');
      } else {
        await apiService.createDeliverer(formDataToSend);
        notify('Entregador cadastrado com sucesso!', 'success');
      }
      closeModal();
      loadDeliverers();
    } catch (error: any) {
      notify(error.response?.data?.message || 'Erro ao salvar entregador', 'error');
    }
  };

  const handleDelete = (id: number) => {
    setDelivererToDeleteId(id);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (delivererToDeleteId == null) return;
    try {
      await apiService.deleteDeliverer(delivererToDeleteId);
      notify('Entregador removido com sucesso!', 'success');
      loadDeliverers();
    } catch (error: any) {
      notify(error.response?.data?.message || 'Erro ao remover entregador', 'error');
    } finally {
      setDeleteModalOpen(false);
      setDelivererToDeleteId(null);
    }
  };

  const handleToggleStatus = async (id: number) => {
    try {
      await apiService.toggleDelivererStatus(id);
      loadDeliverers();
    } catch (error: any) {
      notify(error.response?.data?.message || 'Erro ao alterar status do entregador', 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <div className="w-10 h-10 border-4 border-slate-200 border-t-brand rounded-full animate-spin" />
        <p className="text-sm text-slate-500">Carregando entregadores...</p>
      </div>
    );
  }

  return (
    <div id="entregadores" className="page space-y-5">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Entregadores</h2>
          <p className="text-sm text-slate-500 mt-1">Gerencie sua equipe de entregas</p>
        </div>
        <button
          onClick={() => openModal()}
          className="w-full sm:w-auto bg-brand text-white px-5 py-2.5 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-brand transition-colors text-sm shadow-lg shadow-lg"
        >
          <Plus className="w-4 h-4" />
          <span>Novo Entregador</span>
        </button>
      </header>

      {/* Cards de Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white p-3 rounded-lg shadow-sm border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-blue-100 rounded-md flex-shrink-0">
              <Users className="w-4 h-4 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-[10px] sm:text-xs text-slate-600 mb-0.5">Total</h3>
              <p className="text-xl sm:text-2xl font-bold text-slate-800">{deliverers.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-3 rounded-lg shadow-sm border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-green-100 rounded-md flex-shrink-0">
              <UserCheck className="w-4 h-4 text-green-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-[10px] sm:text-xs text-slate-600 mb-0.5">Ativos</h3>
              <p className="text-xl sm:text-2xl font-bold text-slate-800">{ativos}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-3 rounded-lg shadow-sm border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-red-100 rounded-md flex-shrink-0">
              <UserX className="w-4 h-4 text-red-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-[10px] sm:text-xs text-slate-600 mb-0.5">Inativos</h3>
              <p className="text-xl sm:text-2xl font-bold text-slate-800">{inativos}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-3 rounded-lg shadow-sm border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-amber-100 rounded-md flex-shrink-0">
              <Truck className="w-4 h-4 text-amber-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-[10px] sm:text-xs text-slate-600 mb-0.5">Entregas</h3>
              <p className="text-xl sm:text-2xl font-bold text-slate-800">{totalEntregas}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Table Card */}
      <div className="bg-white rounded-2xl shadow-md border border-slate-100 overflow-hidden">
        {/* Search */}
        {deliverers.length > 0 && (
          <div className="p-4 border-b border-slate-100">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por nome ou telefone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-brand focus:ring-2 focus:ring-brand outline-none transition-all"
              />
            </div>
          </div>
        )}

        {filteredDeliverers.length === 0 ? (
          <div className="text-center py-16">
            <div className="bg-slate-100 p-4 rounded-full w-fit mx-auto mb-4">
              {deliverers.length === 0 ? (
                <User className="w-10 h-10 text-slate-400" />
              ) : (
                <Search className="w-10 h-10 text-slate-400" />
              )}
            </div>
            <h3 className="text-lg font-semibold text-slate-800 mb-1">
              {deliverers.length === 0 ? 'Nenhum entregador cadastrado' : 'Nenhum resultado encontrado'}
            </h3>
            <p className="text-sm text-slate-500 mb-6">
              {deliverers.length === 0
                ? 'Comece adicionando o primeiro entregador ao sistema'
                : 'Tente buscar com outros termos'}
            </p>
            {deliverers.length === 0 && (
              <button
                onClick={() => openModal()}
                className="bg-brand text-white px-5 py-2.5 rounded-xl font-semibold inline-flex items-center gap-2 hover:bg-brand transition-colors text-sm shadow-lg shadow-lg"
              >
                <Plus className="w-4 h-4" />
                Adicionar Entregador
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Desktop View - Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50/80">
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Entregador</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Telefone</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Entregas</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Cadastro</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredDeliverers.map(deliverer => {
                    const colorIndex = deliverer.id % avatarColors.length;
                    return (
                      <tr key={deliverer.id} className="hover:bg-brand-light/40 transition-colors group">
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className={`${avatarColors[colorIndex]} w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-sm`}>
                              {getInitials(deliverer.name || '??')}
                            </div>
                            <span className="text-sm font-semibold text-slate-800">{deliverer.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2 text-slate-600">
                            <Phone className="w-3.5 h-3.5 text-slate-400" />
                            <span className="text-sm">{deliverer.phone}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <button
                            onClick={() => handleToggleStatus(deliverer.id)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                              deliverer.isActive
                                ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                            }`}
                          >
                            {deliverer.isActive ? (
                              <><ToggleRight className="w-3.5 h-3.5" /> Ativo</>
                            ) : (
                              <><ToggleLeft className="w-3.5 h-3.5" /> Inativo</>
                            )}
                          </button>
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <span className={`inline-flex items-center justify-center min-w-[32px] px-2.5 py-1 rounded-full text-xs font-bold ${
                            (deliverer.deliveriesCount || 0) > 0
                              ? 'bg-amber-50 text-amber-700'
                              : 'bg-slate-100 text-slate-400'
                          }`}>
                            {deliverer.deliveriesCount || 0}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1.5 text-slate-500">
                            <Calendar className="w-3.5 h-3.5" />
                            <span className="text-xs">{new Date(deliverer.createdAt).toLocaleDateString('pt-BR')}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <div className="inline-flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => openModal(deliverer)}
                              className="p-2 text-slate-500 rounded-lg hover:bg-brand-light hover:text-brand transition-colors"
                              title="Editar"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(deliverer.id)}
                              className="p-2 text-slate-500 rounded-lg hover:bg-red-50 hover:text-red-600 transition-colors"
                              title="Remover"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile View - Cards */}
            <div className="md:hidden divide-y divide-slate-100">
              {filteredDeliverers.map(deliverer => {
                const colorIndex = deliverer.id % avatarColors.length;
                return (
                  <div key={deliverer.id} className="p-4 hover:bg-slate-50/50 transition-colors">
                    <div className="flex items-start gap-3 mb-3">
                      <div className={`${avatarColors[colorIndex]} w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-sm`}>
                        {getInitials(deliverer.name || '??')}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold text-slate-800 text-sm truncate">{deliverer.name}</h3>
                          <button
                            onClick={() => handleToggleStatus(deliverer.id)}
                            className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold transition-colors flex-shrink-0 ml-2 ${
                              deliverer.isActive
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {deliverer.isActive ? (
                              <><ToggleRight className="w-3.5 h-3.5" /> Ativo</>
                            ) : (
                              <><ToggleLeft className="w-3.5 h-3.5" /> Inativo</>
                            )}
                          </button>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5">
                          <div className="flex items-center gap-1.5 text-xs text-slate-500">
                            <Phone className="w-3 h-3" />
                            <span>{deliverer.phone}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-slate-500">
                            <Truck className="w-3 h-3" />
                            <span>{deliverer.deliveriesCount || 0} entregas</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pl-[52px]">
                      <span className="text-xs text-slate-400">
                        Cadastro: {new Date(deliverer.createdAt).toLocaleDateString('pt-BR')}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openModal(deliverer)}
                          className="p-2 text-brand hover:bg-brand-light rounded-lg transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(deliverer.id)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Footer */}
        {filteredDeliverers.length > 0 && (
          <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <p className="text-xs text-slate-500">
              {filteredDeliverers.length === deliverers.length
                ? `${filteredDeliverers.length} entregador${filteredDeliverers.length !== 1 ? 'es' : ''}`
                : `${filteredDeliverers.length} de ${deliverers.length} entregador${deliverers.length !== 1 ? 'es' : ''}`}
            </p>
            <p className="text-xs text-slate-500">
              Total de entregas: <span className="font-semibold text-slate-700">{totalEntregas}</span>
            </p>
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  {editingDeliverer ? 'Editar Entregador' : 'Novo Entregador'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {editingDeliverer ? 'Atualize as informações do entregador' : 'Preencha os dados para cadastrar'}
                </p>
              </div>
              <button
                onClick={closeModal}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Nome <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    name="name"
                    value={form.name}
                    onChange={handleFormChange}
                    className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:border-brand focus:ring-2 focus:ring-brand outline-none transition-all"
                    placeholder="Nome do entregador"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Telefone <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="tel"
                    name="phone"
                    value={form.phone}
                    onChange={handleFormChange}
                    className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:border-brand focus:ring-2 focus:ring-brand outline-none transition-all"
                    placeholder="(00) 00000-0000"
                    required
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-4 py-2.5 text-sm rounded-xl bg-slate-100 text-slate-700 font-semibold hover:bg-slate-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={validatingPhone}
                  className="flex-1 px-4 py-2.5 text-sm rounded-xl bg-brand text-white font-semibold hover:bg-brand transition-colors shadow-lg shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {validatingPhone ? 'Validando...' : editingDeliverer ? 'Salvar' : 'Cadastrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
            <div className="p-5 border-b border-slate-200">
              <h3 className="text-lg font-bold text-slate-900">Remover entregador</h3>
              <p className="text-sm text-slate-600 mt-1">
                Tem certeza que deseja remover este entregador? Esta ação não pode ser desfeita.
              </p>
            </div>
            <div className="p-5 flex flex-col sm:flex-row gap-3 justify-end">
              <button
                type="button"
                onClick={() => { setDeleteModalOpen(false); setDelivererToDeleteId(null); }}
                className="px-5 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-semibold hover:bg-slate-200 transition-colors"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="px-5 py-2.5 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-700 transition-colors"
              >
                Confirmar remoção
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Entregadores;