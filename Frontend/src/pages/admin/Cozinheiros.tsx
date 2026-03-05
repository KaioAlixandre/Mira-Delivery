import React, { useEffect, useState } from 'react';
import { useNotification } from '../../components/NotificationProvider';
import { Pencil, Trash2, Plus, ChefHat, Phone, User } from 'lucide-react';
import { applyPhoneMask, validatePhoneWithAPI, removePhoneMask } from '../../utils/phoneValidation';
import apiService from '../../services/api';

interface Cozinheiro {
  id: number;
  nome: string;
  telefone: string;
  ativo: boolean;
  criadoEm: string;
}

const Cozinheiros: React.FC = () => {
  const [cozinheiros, setCozinheiros] = useState<Cozinheiro[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCozinheiro, setEditingCozinheiro] = useState<Cozinheiro | null>(null);
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
    
    // Validar telefone com API
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
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600">Carregando cozinheiros...</div>
      </div>
    );
  }

  return (
    <div id="cozinheiros" className="page">
      <header className="mb-4 sm:mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-800">Cozinheiros</h2>
          <p className="text-xs sm:text-sm text-slate-500">Gerencie a equipe da cozinha</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center justify-center gap-2 bg-[#ea1d2c] text-white px-4 py-2.5 rounded-lg font-semibold hover:bg-[#d61a28] transition-colors text-sm sm:text-base w-full sm:w-auto"
        >
          <Plus size={18} />
          Adicionar Cozinheiro
        </button>
      </header>

      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-100 border-b border-slate-200">
              <tr>
                <th className="text-left p-3 sm:p-4 text-xs sm:text-sm font-semibold text-slate-700">
                  <div className="flex items-center gap-2">
                    <ChefHat size={16} />
                    Nome
                  </div>
                </th>
                <th className="text-left p-3 sm:p-4 text-xs sm:text-sm font-semibold text-slate-700">
                  <div className="flex items-center gap-2">
                    <Phone size={16} />
                    Telefone
                  </div>
                </th>
                <th className="text-center p-3 sm:p-4 text-xs sm:text-sm font-semibold text-slate-700">Status</th>
                <th className="text-center p-3 sm:p-4 text-xs sm:text-sm font-semibold text-slate-700">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {cozinheiros.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-slate-500">
                    <ChefHat className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                    <p className="text-sm">Nenhum cozinheiro cadastrado</p>
                    <button
                      onClick={() => handleOpenModal()}
                      className="mt-3 text-[#ea1d2c] hover:text-[#d61a28] text-sm font-semibold"
                    >
                      Cadastrar primeiro cozinheiro
                    </button>
                  </td>
                </tr>
              ) : (
                cozinheiros.map((cozinheiro) => (
                  <tr key={cozinheiro.id} className="hover:bg-slate-50">
                    <td className="p-3 sm:p-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                          <User size={16} className="text-[#ea1d2c]" />
                        </div>
                        <span className="text-sm font-medium text-slate-900">{cozinheiro.nome}</span>
                      </div>
                    </td>
                    <td className="p-3 sm:p-4">
                      <span className="text-sm text-slate-600">{cozinheiro.telefone}</span>
                    </td>
                    <td className="p-3 sm:p-4 text-center">
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${
                        cozinheiro.ativo
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {cozinheiro.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="p-3 sm:p-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleOpenModal(cozinheiro)}
                          className="p-2 text-[#ea1d2c] hover:bg-red-50 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <Pencil size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(cozinheiro.id)}
                          className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Excluir"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Adicionar/Editar */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-slate-900">
                  {editingCozinheiro ? 'Editar Cozinheiro' : 'Adicionar Cozinheiro'}
                </h3>
                <button
                  onClick={handleCloseModal}
                  className="text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <Plus size={24} className="rotate-45" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Nome completo *
                  </label>
                  <input
                    type="text"
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    placeholder="Ex: João Silva"
                    required
                    className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#ea1d2c] focus:border-[#ea1d2c]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Telefone *
                  </label>
                  <input
                    type="tel"
                    value={formData.telefone}
                    onChange={(e) => {
                      const maskedValue = applyPhoneMask(e.target.value);
                      setFormData({ ...formData, telefone: maskedValue });
                    }}
                    placeholder="(00) 00000-0000"
                    required
                    className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#ea1d2c] focus:border-[#ea1d2c]"
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="ativo"
                    checked={formData.ativo}
                    onChange={(e) => setFormData({ ...formData, ativo: e.target.checked })}
                    className="h-4 w-4 text-[#ea1d2c] focus:ring-[#ea1d2c] border-slate-300 rounded"
                  />
                  <label htmlFor="ativo" className="ml-2 block text-sm text-slate-700">
                    Cozinheiro ativo
                  </label>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 rounded-lg font-semibold hover:bg-slate-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={validatingPhone}
                    className="flex-1 px-4 py-2.5 bg-[#ea1d2c] text-white rounded-lg font-semibold hover:bg-[#d61a28] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
