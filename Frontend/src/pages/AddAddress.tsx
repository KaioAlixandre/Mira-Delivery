import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Home, Hash, Building2, Navigation2 } from 'lucide-react';
import apiService from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../components/NotificationProvider';

const AddAddress: React.FC = () => {
  const [form, setForm] = useState({
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    reference: ''
  });
  const [hasNumber, setHasNumber] = useState(true);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user, setUser } = useAuth();
  const { notify } = useNotification();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
      // Se for o primeiro endereço, definir como padrão automaticamente
      const isFirstAddress = !user?.enderecos || user.enderecos.length === 0;
      const addressData = {
        ...form,
        isDefault: isFirstAddress
      };
      const response = await apiService.addAddress(addressData);
      setUser(response.user); // Atualiza o contexto com o usuário atualizado
      notify('Endereço cadastrado com sucesso!', 'success');
      navigate('/checkout'); // Volta para o checkout, telefone já foi cadastrado no registro
    } catch (err) {
      notify('Erro ao cadastrar endereço!', 'error');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50 to-white py-8 md:py-12 px-4">
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
          {/* Header com ícone */}
          <div className="bg-gradient-to-r from-[#ea1d2c] to-[#d61a28] px-6 py-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-full mb-4">
              <MapPin className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">
              Cadastrar Endereço
            </h2>
            <p className="text-rose-100 text-sm">
              Preencha os dados do seu endereço
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
                  className="appearance-none block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#ea1d2c] focus:border-transparent text-sm transition-all"
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
                  className="w-4 h-4 text-[#ea1d2c] border-slate-300 rounded focus:ring-[#ea1d2c] focus:ring-2"
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
                  className={`appearance-none block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#ea1d2c] focus:border-transparent text-sm transition-all ${
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
                  className="appearance-none block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#ea1d2c] focus:border-transparent text-sm transition-all"
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
                <input
                  id="neighborhood"
                  name="neighborhood"
                  type="text"
                  value={form.neighborhood}
                  onChange={handleChange}
                  placeholder="Nome do bairro"
                  required
                  className="appearance-none block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#ea1d2c] focus:border-transparent text-sm transition-all"
                />
              </div>
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
                  className="appearance-none block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#ea1d2c] focus:border-transparent text-sm transition-all"
                />
              </div>
            </div>

            {/* Botão Submit */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-[#ea1d2c] to-[#d61a28] text-white py-3 rounded-lg font-semibold hover:from-[#d61a28] hover:to-[#c51723] transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Salvando...</span>
                  </>
                ) : (
                  <>
                    <MapPin className="w-5 h-5" />
                    <span>Salvar Endereço</span>
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