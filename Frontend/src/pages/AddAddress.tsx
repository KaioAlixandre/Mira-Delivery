import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { MapPin, Home, Hash, Building2, Navigation2, ChevronDown } from 'lucide-react';
import apiService from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../components/NotificationProvider';

const AddAddress: React.FC = () => {
  const location = useLocation();
  const editAddress = (location.state as any)?.editAddress as { id: number; street: string; number: string; complement: string; neighborhood: string; reference: string } | undefined;
  const isEditMode = !!editAddress;

  const [form, setForm] = useState({
    street: editAddress?.street || '',
    number: editAddress?.number || '',
    complement: editAddress?.complement || '',
    neighborhood: editAddress?.neighborhood || '',
    reference: editAddress?.reference || ''
  });
  const [hasNumber, setHasNumber] = useState(editAddress?.number !== 'S/N');
  const [loading, setLoading] = useState(false);
  const [neighborhoods, setNeighborhoods] = useState<{ id: number; nome: string; taxaEntrega: number }[]>([]);
  const [neighborhoodsLoading, setNeighborhoodsLoading] = useState(true);
  const navigate = useNavigate();
  const { user, setUser, refreshUserProfile } = useAuth();
  const { notify } = useNotification();

  useEffect(() => {
    apiService.getDeliveryNeighborhoodsList()
      .then((data) => setNeighborhoods(data))
      .catch(() => {})
      .finally(() => setNeighborhoodsLoading(false));
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleHasNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    setHasNumber(checked);
    if (!checked) {
      setForm({ ...form, number: 'S/N' });
    } else {
      setForm({ ...form, number: '' });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isEditMode && editAddress) {
        await apiService.updateAddress(editAddress.id, { ...form, isDefault: true });
        await refreshUserProfile();
        notify('Endereço atualizado com sucesso!', 'success');
      } else {
        const isFirstAddress = !user?.enderecos || user.enderecos.length === 0;
        const addressData = {
          ...form,
          isDefault: isFirstAddress
        };
        const response = await apiService.addAddress(addressData);
        setUser(response.user);
        notify('Endereço cadastrado com sucesso!', 'success');
      }
      navigate('/checkout');
    } catch (err) {
      notify(isEditMode ? 'Erro ao atualizar endereço!' : 'Erro ao cadastrar endereço!', 'error');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50 to-white py-8 md:py-12 px-4">
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
          {/* Header com ícone */}
          <div className="bg-gradient-to-r from-[var(--primary-color)] to-[var(--primary-color-hover)] px-6 py-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-full mb-4">
              <MapPin className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">
              {isEditMode ? 'Atualizar Endereço' : 'Cadastrar Endereço'}
            </h2>
            <p className="text-rose-100 text-sm">
              {isEditMode ? 'Selecione o bairro correto para seu endereço' : 'Preencha os dados do seu endereço'}
            </p>
          </div>

          {/* Formulário */}
          <form className="px-6 py-8 space-y-5" onSubmit={handleSubmit}>
            {/* Rua */}
            <div>
              <label htmlFor="street" className="block text-sm font-semibold text-slate-700 mb-2">
                Rua *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Home className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  id="street"
                  name="street"
                  type="text"
                  value={form.street}
                  onChange={handleChange}
                  placeholder="Nome da rua"
                  required
                  className="appearance-none block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand text-sm transition-all"
                />
              </div>
            </div>

            {/* Número */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <input
                  type="checkbox"
                  id="hasNumber"
                  checked={hasNumber}
                  onChange={handleHasNumberChange}
                  className="w-4 h-4 text-brand border-slate-300 rounded focus:ring-brand focus:ring-2"
                />
                <label htmlFor="hasNumber" className="text-sm font-medium text-slate-700 cursor-pointer">
                  Endereço possui número?
                </label>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Hash className={`h-5 w-5 ${hasNumber ? 'text-slate-400' : 'text-slate-300'}`} />
                </div>
                <input
                  id="number"
                  name="number"
                  type="text"
                  value={form.number}
                  onChange={handleChange}
                  placeholder="Número"
                  required={hasNumber}
                  disabled={!hasNumber}
                  className={`appearance-none block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand text-sm transition-all ${
                    !hasNumber ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : ''
                  }`}
                />
              </div>
            </div>

            {/* Complemento */}
            <div>
              <label htmlFor="complement" className="block text-sm font-semibold text-slate-700 mb-2">
                Complemento
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Building2 className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  id="complement"
                  name="complement"
                  type="text"
                  value={form.complement}
                  onChange={handleChange}
                  placeholder="Apartamento, casa, etc."
                  className="appearance-none block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand text-sm transition-all"
                />
              </div>
            </div>

            {/* Bairro */}
            <div>
              <label htmlFor="neighborhood" className="block text-sm font-semibold text-slate-700 mb-2">
                Bairro *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Navigation2 className="h-5 w-5 text-slate-400" />
                </div>
                <select
                  id="neighborhood"
                  name="neighborhood"
                  value={form.neighborhood}
                  onChange={handleChange}
                  required
                  disabled={neighborhoodsLoading}
                  className="appearance-none block w-full pl-10 pr-10 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand transition-all bg-white disabled:bg-slate-100 disabled:cursor-not-allowed"
                >
                  <option value="">{neighborhoodsLoading ? 'Carregando bairros...' : 'Selecione o bairro'}</option>
                  {neighborhoods.map((b) => (
                    <option key={b.id} value={b.nome}>
                      {b.nome} — R$ {Number(b.taxaEntrega).toFixed(2)}
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <ChevronDown className="h-4 w-4 text-slate-400" />
                </div>
              </div>
              {neighborhoods.length === 0 && !neighborhoodsLoading && (
                <p className="text-xs text-amber-600 mt-1">Nenhum bairro cadastrado. Contate o estabelecimento.</p>
              )}
            </div>

            {/* Ponto de Referência */}
            <div>
              <label htmlFor="reference" className="block text-sm font-semibold text-slate-700 mb-2">
                Ponto de Referência
                <span className="text-slate-400 font-normal ml-1">(opcional)</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MapPin className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  id="reference"
                  name="reference"
                  type="text"
                  value={form.reference}
                  onChange={handleChange}
                  placeholder="Ex: Próximo ao mercado, em frente à praça"
                  className="appearance-none block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand text-sm transition-all"
                />
              </div>
            </div>

            {/* Botão Submit */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-[var(--primary-color)] to-[var(--primary-color-hover)] text-white py-3 rounded-lg font-semibold hover:from-[var(--primary-color-hover)] hover:to-[var(--primary-color-hover)] transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Salvando...</span>
                  </>
                ) : (
                  <>
                    <MapPin className="w-5 h-5" />
                    <span>{isEditMode ? 'Atualizar Endereço' : 'Salvar Endereço'}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddAddress;