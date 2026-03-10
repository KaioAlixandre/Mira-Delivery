import React, { useEffect, useState, useMemo } from 'react';
import { useNotification } from '../../components/NotificationProvider';
import { Pencil, Trash2, Plus, ChefHat, Phone, Search, X, UserCheck, UserX } from 'lucide-react';
import { applyPhoneMask, validatePhoneWithAPI, removePhoneMask } from '../../utils/phoneValidation';
import apiService from '../../services/api';

interface Cozinheiro {
  id: number;
  nome: string;
  telefone: string;
  ativo: boolean;
  criadoEm: string;
}

const getInitials = (name: string) => {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase() || '??';
};

const avatarColors = [
  'bg-amber-500', 'bg-orange-500', 'bg-rose-500', 'bg-red-500',
  'bg-amber-600', 'bg-orange-600', 'bg-rose-600', 'bg-red-600',
];

const Cozinheiros: React.FC = () => {
  const [cozinheiros, setCozinheiros] = useState<Cozinheiro[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCozinheiro, setEditingCozinheiro] = useState<Cozinheiro | null>(null);
  const [search, setSearch] = useState('');
  const [formData, setFormData] = useState({
    nome: '',
    telefone: '',
    ativo: true
  });
  const [validatingPhone, setValidatingPhone] = useState(false);

  const { notify } = useNotification();

  const loadCozinheiros = async () => {
    try {
      setLoading(true);
      const data = await apiService.getCozinheiros();
      setCozinheiros(Array.isArray(data) ? data : []);
    } catch (error) {
      notify('Erro ao carregar cozinheiros', 'error');
      setCozinheiros([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCozinheiros();
  }, []);

  const cozinheirosFiltrados = useMemo(() => {
    if (!search.trim()) return cozinheiros;
    const q = search.toLowerCase();
    return cozinheiros.filter(
      (c) =>
        c.nome?.toLowerCase().includes(q) ||
        c.telefone?.toLowerCase().includes(q) ||
        c.telefone?.replace(/\D/g, '').includes(q.replace(/\D/g, ''))
    );
  }, [cozinheiros, search]);

  const totalCozinheiros = cozinheiros.length;
  const cozinheirosAtivos = cozinheiros.filter((c) => c.ativo).length;
  const cozinheirosInativos = cozinheiros.filter((c) => !c.ativo).length;

  const handleOpenModal = (cozinheiro?: Cozinheiro) => {
    if (cozinheiro) {
      setEditingCozinheiro(cozinheiro);
      setFormData({
        nome: cozinheiro.nome,
        telefone: cozinheiro.telefone,
        ativo: cozinheiro.ativo
      });
    } else {
      setEditingCozinheiro(null);
      setFormData({
        nome: '',
        telefone: '',
        ativo: true
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingCozinheiro(null);
    setFormData({
      nome: '',
      telefone: '',
      ativo: true
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setValidatingPhone(true);
    try {
      const phoneValidation = await validatePhoneWithAPI(formData.telefone);
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
      const telefoneSemMascara = removePhoneMask(formData.telefone);
      const dataToSend = {
        nome: formData.nome,
        telefone: telefoneSemMascara,
        ativo: formData.ativo
      };
      if (editingCozinheiro) {
        await apiService.updateCozinheiro(editingCozinheiro.id, dataToSend);
      } else {
        await apiService.createCozinheiro(dataToSend);
      }
      notify(editingCozinheiro ? 'Cozinheiro atualizado com sucesso!' : 'Cozinheiro cadastrado com sucesso!', 'success');
      handleCloseModal();
      loadCozinheiros();
    } catch (error) {
      notify('Erro ao salvar cozinheiro', 'error');
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Tem certeza que deseja excluir este cozinheiro?')) return;
    try {
      await apiService.deleteCozinheiro(id);
      notify('Cozinheiro excluído com sucesso!', 'success');
      loadCozinheiros();
    } catch (error) {
      notify('Erro ao excluir cozinheiro', 'error');
    }
  };

  if (loading) {
    return (
      <div id="cozinheiros" className="page">
        <header className="mb-6">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Cozinheiros</h2>
          <p className="text-sm text-slate-500 mt-1">Gerencie a equipe da cozinha</p>
        </header>
        <div className="bg-white rounded-2xl shadow-md border border-slate-100 overflow-hidden">
          <div className="p-8 flex flex-col items-center justify-center gap-4 min-h-[320px]">
            <div className="w-12 h-12 rounded-full bg-brand-light flex items-center justify-center animate-pulse">
              <ChefHat className="w-6 h-6 text-brand" />
            </div>
            <p className="text-slate-500 font-medium">Carregando cozinheiros...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div id="cozinheiros" className="page space-y-5">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Cozinheiros</h2>
          <p className="text-sm text-slate-500 mt-1">Gerencie a equipe da cozinha</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center justify-center gap-2 bg-brand text-white px-4 py-2.5 rounded-xl font-semibold hover:opacity-95 active:opacity-90 transition-opacity shadow-sm w-full sm:w-auto"
        >
          <Plus className="w-4 h-4" />
          Adicionar Cozinheiro
        </button>
      </header>

      {/* Cards de métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-amber-100 rounded-lg flex-shrink-0">
              <ChefHat className="w-4 h-4 text-amber-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-[10px] sm:text-xs text-slate-600 mb-0.5">Total de Cozinheiros</h3>
              <p className="text-xl sm:text-2xl font-bold text-slate-800">{totalCozinheiros}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-emerald-100 rounded-lg flex-shrink-0">
              <UserCheck className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-[10px] sm:text-xs text-slate-600 mb-0.5">Ativos</h3>
              <p className="text-xl sm:text-2xl font-bold text-slate-800">{cozinheirosAtivos}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-slate-100 rounded-lg flex-shrink-0">
              <UserX className="w-4 h-4 text-slate-500" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-[10px] sm:text-xs text-slate-600 mb-0.5">Inativos</h3>
              <p className="text-xl sm:text-2xl font-bold text-slate-800">{cozinheirosInativos}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-2xl shadow-md border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-100">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por nome ou telefone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none transition-all"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[640px]">
            <thead>
              <tr className="bg-slate-50/80">
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Cozinheiro</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden sm:table-cell">Telefone</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Status</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {cozinheirosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="bg-slate-100 p-4 rounded-full">
                        <ChefHat className="w-8 h-8 text-slate-400" />
                      </div>
                      <p className="text-slate-500 font-medium">
                        {search ? 'Nenhum cozinheiro encontrado' : 'Nenhum cozinheiro cadastrado'}
                      </p>
                      {search ? (
                        <p className="text-xs text-slate-400">Tente buscar com outros termos</p>
                      ) : (
                        <button
                          onClick={() => handleOpenModal()}
                          className="mt-1 inline-flex items-center gap-1.5 px-4 py-2 bg-brand text-white rounded-xl text-sm font-semibold hover:opacity-95 transition-opacity"
                        >
                          <Plus className="w-4 h-4" />
                          Cadastrar primeiro cozinheiro
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                cozinheirosFiltrados.map((cozinheiro) => {
                  const colorIndex = cozinheiro.id % avatarColors.length;
                  return (
                    <tr key={cozinheiro.id} className="hover:bg-brand-light transition-colors group">
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div
                            className={`${avatarColors[colorIndex]} w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-sm`}
                          >
                            {getInitials(cozinheiro.nome)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-800 truncate">{cozinheiro.nome}</p>
                            <p className="text-xs text-slate-500 sm:hidden">{cozinheiro.telefone}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 hidden sm:table-cell">
                        <div className="flex items-center gap-1.5 text-slate-600">
                          <Phone className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                          <span className="text-sm">{cozinheiro.telefone}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <span
                          className={`inline-flex items-center justify-center min-w-[64px] px-2.5 py-1 rounded-full text-xs font-bold ${
                            cozinheiro.ativo
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {cozinheiro.ativo ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleOpenModal(cozinheiro)}
                            className="p-2 text-slate-600 hover:bg-brand-light hover:text-brand rounded-lg transition-colors"
                            title="Editar"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(cozinheiro.id)}
                            className="p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-600 rounded-lg transition-colors"
                            title="Excluir"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {cozinheirosFiltrados.length > 0 && (
          <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/50">
            <p className="text-xs text-slate-500">
              {cozinheirosFiltrados.length === cozinheiros.length
                ? `${cozinheiros.length} cozinheiro${cozinheiros.length !== 1 ? 's' : ''}`
                : `${cozinheirosFiltrados.length} de ${cozinheiros.length} cozinheiro${cozinheiros.length !== 1 ? 's' : ''}`}
            </p>
          </div>
        )}
      </div>

      {/* Modal Adicionar/Editar */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-bold text-slate-900">
                  {editingCozinheiro ? 'Editar Cozinheiro' : 'Adicionar Cozinheiro'}
                </h3>
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                  aria-label="Fechar"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Nome completo *</label>
                  <input
                    type="text"
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    placeholder="Ex: João Silva"
                    required
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none transition-all text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Telefone *</label>
                  <input
                    type="tel"
                    value={formData.telefone}
                    onChange={(e) => {
                      const maskedValue = applyPhoneMask(e.target.value);
                      setFormData({ ...formData, telefone: maskedValue });
                    }}
                    placeholder="(00) 00000-0000"
                    required
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none transition-all text-slate-900"
                  />
                </div>

                <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100/80 transition-colors">
                  <input
                    type="checkbox"
                    checked={formData.ativo}
                    onChange={(e) => setFormData({ ...formData, ativo: e.target.checked })}
                    className="h-4 w-4 text-brand focus:ring-brand border-slate-300 rounded"
                  />
                  <span className="text-sm font-medium text-slate-700">Cozinheiro ativo</span>
                </label>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-700 rounded-xl font-semibold hover:bg-slate-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={validatingPhone}
                    className="flex-1 px-4 py-2.5 bg-brand text-white rounded-xl font-semibold hover:opacity-95 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity shadow-sm"
                  >
                    {validatingPhone ? 'Validando...' : editingCozinheiro ? 'Salvar' : 'Adicionar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Cozinheiros;
