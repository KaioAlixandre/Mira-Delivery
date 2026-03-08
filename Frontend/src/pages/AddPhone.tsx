import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiService from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../components/NotificationProvider';
import { applyPhoneMask, removePhoneMask } from '../utils/phoneValidation';

function AddPhone() {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { refreshUserProfile } = useAuth();
  const { notify } = useNotification();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Remover máscara antes de enviar ao backend
      const telefoneSemMascara = removePhoneMask(phone);
      await apiService.updatePhone(telefoneSemMascara);
      await refreshUserProfile(); // Atualizar perfil do usuário
      notify('Telefone cadastrado com sucesso!', 'success');
      navigate('/checkout'); // Voltar para o checkout
    } catch (err) {
      notify('Erro ao cadastrar telefone!', 'error');
    }
    setLoading(false);
  };

  return (
    <div className="max-w-md mx-auto mt-10 bg-white p-8 rounded-xl shadow">
      <h2 className="text-2xl font-bold mb-6 text-center">Cadastrar Telefone</h2>
      <p className="text-gray-600 mb-6 text-center">
        Para finalizar seu pedido, precisamos do seu número de telefone para contato.
      </p>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <input
          name="phone"
          type="tel"
          value={phone}
          onChange={e => {
            const maskedValue = applyPhoneMask(e.target.value);
            setPhone(maskedValue);
          }}
          placeholder="Telefone (ex: (99) 99999-9999)"
          required
          className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-brand" />
        <button
          type="submit"
          className="w-full bg-brand text-white py-3 rounded font-semibold hover:bg-brand transition-colors"
          disabled={loading}
        >
          {loading ? 'Salvando...' : 'Salvar Telefone'}
        </button>
      </form>
    </div>
  );
}

export default AddPhone;

