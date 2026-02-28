import React, { useState, useEffect } from 'react';
import { 
  User, 
  MapPin, 
  Edit, 
  X, 
  Plus,
  Star,
  Shield,
  CheckCircle,
  Home,
  Trash2,
  Phone
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Address } from '../types';
import { apiService } from '../services/api';
import Loading from '../components/Loading';
import { applyPhoneMask, validatePhoneWithAPI, removePhoneMask } from '../utils/phoneValidation';

const Profile: React.FC = () => {
  const { user, loading: authLoading, refreshUserProfile } = useAuth();
  const [editingPhone, setEditingPhone] = useState(false);
  const [phoneValue, setPhoneValue] = useState('');
  const [phoneLoading, setPhoneLoading] = useState(false);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [deletingAddress, setDeletingAddress] = useState<Address | null>(null);
  const [newAddress, setNewAddress] = useState({
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    reference: '',
    isDefault: false
  });
  const [hasNumber, setHasNumber] = useState(true);

  // Função para mapear dados do backend (português) para o frontend (inglês)
  const mapAddressFromBackend = (addressData: any): Address => {
    return {
      id: addressData.id,
      street: addressData.rua || '',
      number: addressData.numero || '',
      complement: addressData.complemento || '',
      neighborhood: addressData.bairro || '',
      reference: addressData.pontoReferencia || '',
      isDefault: addressData.padrao || false,
      userId: addressData.usuarioId || 0
    };
  };

  // Função para formatar telefone (mantida para exibição)
  const formatPhone = (phone: string): string => {
    // Remove tudo que não é número
    const cleaned = phone.replace(/\D/g, '');
    
    // Aplica a máscara (00) 00000-0000
    if (cleaned.length === 11) {
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
    }
    // Aplica a máscara (00) 0000-0000 para números com 10 dígitos
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
    }
    
    // Retorna o número original se não for 10 ou 11 dígitos
    return phone;
  };

  useEffect(() => {
   
    if (user) {
      setPhoneValue(user.telefone || '');
      // Se o usuário já tem endereços carregados no perfil, usar esses dados primeiro
      if (user.enderecos && Array.isArray(user.enderecos) && user.enderecos.length > 0) {
       
        // Mapear os endereços do backend para o formato esperado pelo frontend
        const mappedAddresses = user.enderecos.map(mapAddressFromBackend);
        setAddresses(mappedAddresses);
        setLoading(false);
      } else {
        // Caso contrário, tentar carregar via API
        loadAddresses();
      }
    } else {
      setLoading(false);
    }
  }, [user]);
  // Função para atualizar telefone
  const handleEditPhone = () => {
    setEditingPhone(true);
    setPhoneValue(user?.telefone || '');
    setError(null);
  };

  const handleCancelEditPhone = () => {
    setEditingPhone(false);
    setPhoneValue(user?.telefone || '');
    setError(null);
  };

  const handleSavePhone = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setPhoneLoading(true);
    setError(null);
    
    // Validar telefone com API
    try {
      const phoneValidation = await validatePhoneWithAPI(phoneValue);
      if (!phoneValidation.valid) {
        setError(phoneValidation.error || 'Número de telefone inválido. Verifique o formato (DDD + número).');
        setPhoneLoading(false);
        return;
      }
    } catch (error) {
      setError('Erro ao validar telefone. Tente novamente.');
      setPhoneLoading(false);
      return;
    }
    
    try {
      // Remover máscara antes de enviar ao backend
      const telefoneSemMascara = removePhoneMask(phoneValue);
      await apiService.updatePhone(telefoneSemMascara);
      await refreshUserProfile();
      setEditingPhone(false);
    } catch (err) {
      setError('Erro ao atualizar telefone. Tente novamente.');
    } finally {
      setPhoneLoading(false);
    }
  };

  const loadAddresses = async () => {
    try {
     
      setError(null);
      const addressesData = await apiService.getAddresses();
     
      
      if (Array.isArray(addressesData)) {
        // Backend já retorna os dados no formato correto (transformados)
        setAddresses(addressesData);
       
      } else {
       
        setAddresses([]);
      }
    } catch (error) {
     
      setError('Erro ao carregar endereços. Tentando usar dados do perfil...');
      
      // Tentar carregar endereços do perfil do usuário como fallback
      if (user?.enderecos && Array.isArray(user.enderecos)) {
       
        const mappedAddresses = user.enderecos.map(mapAddressFromBackend);
        setAddresses(mappedAddresses);
        setError(null);
      } else {
        setAddresses([]);
        setError('Não foi possível carregar os endereços');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Se for o primeiro endereço, definir como padrão automaticamente
      const isFirstAddress = !addresses || addresses.length === 0;
      const addressData = {
        ...newAddress,
        isDefault: isFirstAddress
      };
      await apiService.addAddress(addressData);
      setShowAddressForm(false);
      setNewAddress({
        street: '',
        number: '',
        complement: '',
        neighborhood: '',
        reference: '',
        isDefault: false
      });
      
      // Recarregar endereços após adicionar
     
      await loadAddresses();
      
      // Atualizar o perfil do usuário
      await refreshUserProfile();
     
    } catch (error) {
     
      setError('Erro ao adicionar endereço. Tente novamente.');
    }
  };

  const handleEditAddress = (address: Address) => {
   
    setEditingAddress(address);
    const isSemNumero = address.number === 'S/N' || address.number === '';
    setHasNumber(!isSemNumero);
    setNewAddress({
      street: address.street,
      number: address.number,
      complement: address.complement || '',
      neighborhood: address.neighborhood,
      reference: address.reference || '',
      isDefault: address.isDefault
    });
    setShowAddressForm(true);
  };

  const handleHasNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    setHasNumber(checked);
    if (!checked) {
      setNewAddress({ ...newAddress, number: 'S/N' });
    } else {
      setNewAddress({ ...newAddress, number: '' });
    }
  };

  const handleUpdateAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAddress) return;

    try {
     
      await apiService.updateAddress(editingAddress.id, newAddress);
      setShowAddressForm(false);
      setEditingAddress(null);
      setNewAddress({
        street: '',
        number: '',
        complement: '',
        neighborhood: '',
        reference: '',
        isDefault: false
      });
      
      // Recarregar endereços após atualizar
     
      await loadAddresses();
      
      // Atualizar o perfil do usuário
      await refreshUserProfile();
      setError(null);
     
    } catch (error) {
     
      setError('Erro ao atualizar endereço. Tente novamente.');
    }
  };

  const handleDeleteAddress = async (addressId: number) => {
    try {
     
      await apiService.deleteAddress(addressId);
      
      // Recarregar endereços após remover
     
      await loadAddresses();
      
      // Atualizar o perfil do usuário
      await refreshUserProfile();
      setDeletingAddress(null);
     
    } catch (error) {
     
      setError('Erro ao remover endereço. Tente novamente.');
      setDeletingAddress(null);
    }
  };

  const cancelEdit = () => {
   
    setEditingAddress(null);
    setShowAddressForm(false);
    setHasNumber(true);
    setNewAddress({
      street: '',
      number: '',
      complement: '',
      neighborhood: '',
      reference: '',
      isDefault: false
    });
    setError(null);
  };

  if (authLoading || loading) {
    return <Loading fullScreen text="Carregando perfil..." />;
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">
            Acesso Negado
          </h2>
          <p className="text-slate-600">
            Você precisa estar logado para acessar esta página.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
        {/* Header com Avatar e Informações do Usuário */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-6 md:mb-8">
          <div className="p-4 md:p-6">
            <div className="flex flex-col sm:flex-row items-center sm:items-start space-y-4 sm:space-y-0 sm:space-x-4 md:space-x-6">
              {/* Avatar */}
              <div className="relative flex-shrink-0">
                <div className="w-20 h-20 md:w-24 md:h-24 bg-[#ea1d2c] rounded-full flex items-center justify-center">
                  <User className="w-10 h-10 md:w-12 md:h-12 text-white" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 md:w-8 md:h-8 bg-emerald-500 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-4 h-4 md:w-5 md:h-5 text-white" />
                </div>
              </div>
              
              {/* Informações do Usuário */}
              <div className="flex-1 text-center sm:text-left">
                <h1 className="text-xl md:text-2xl font-bold text-slate-900 mb-1">
                  Olá, {user.nomeUsuario}!
                </h1>

                <div className="mb-3 flex items-center justify-center sm:justify-start gap-1.5">
                  <Phone className="w-3.5 h-3.5" />
                  {editingPhone ? (
                    <form onSubmit={handleSavePhone} className="flex items-center gap-2">
                      <input
                        type="tel"
                        value={phoneValue}
                        onChange={e => {
                          const maskedValue = applyPhoneMask(e.target.value);
                          setPhoneValue(maskedValue);
                          setError(null); // Limpar erro ao digitar
                        }}
                        className={`border rounded px-2 py-1 text-sm w-36 focus:ring-2 focus:ring-[#ea1d2c] focus:border-[#ea1d2c] ${
                          error ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="(99) 99999-9999"
                        disabled={phoneLoading}
                        autoFocus
                      />
                      <button
                        type="submit"
                        className="bg-emerald-500 hover:bg-emerald-600 text-white rounded px-2 py-1 text-xs font-semibold"
                        disabled={phoneLoading}
                        title="Salvar"
                      >
                        Salvar
                      </button>
                      <button
                        type="button"
                        className="bg-gray-200 hover:bg-gray-300 text-gray-700 rounded px-2 py-1 text-xs font-semibold"
                        onClick={handleCancelEditPhone}
                        disabled={phoneLoading}
                        title="Cancelar"
                      >
                        Cancelar
                      </button>
                    </form>
                  ) : (
                    <>
                      <span>{user.telefone ? formatPhone(user.telefone) : <span className="italic text-gray-400">Não informado</span>}</span>
                      <button
                        className="ml-2 text-[#ea1d2c] hover:text-[#d61a28] p-1 rounded transition-colors"
                        onClick={handleEditPhone}
                        title={user.telefone ? 'Editar telefone' : 'Adicionar telefone'}
                      >
                        <Edit className="w-3.5 h-3.5 inline" />
                      </button>
                    </>
                  )}
                </div>
                
                {/* Stats Cards */}
                <div className="flex flex-wrap justify-center sm:justify-start gap-2">
                  <div className="bg-slate-50 rounded-lg px-3 py-1.5 border border-slate-200">
                    <div className="flex items-center space-x-1.5">
                      <Phone className="w-3.5 h-3.5 text-[#ea1d2c]" />
                      <span className="text-xs font-medium text-slate-700">Telefone cadastrado</span>
                    </div>
                  </div>
                  
                  <div className="bg-slate-50 rounded-lg px-3 py-1.5 border border-slate-200">
                    <div className="flex items-center space-x-1.5">
                      <Shield className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-xs font-medium text-slate-700">
                        {user.funcao === 'admin' ? 'Administrador' : 'Cliente'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Endereços */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          {/* Header da Seção */}
          <div className="px-4 md:px-6 py-3 md:py-4 border-b border-slate-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center space-x-2">
                <MapPin className="w-5 h-5 text-[#ea1d2c]" />
                <h2 className="text-base md:text-lg font-bold text-slate-900">
                  Meus Endereços
                </h2>
              </div>
              <button
                onClick={() => {
                  setEditingAddress(null);
                  setHasNumber(true);
                  setNewAddress({
                    street: '',
                    number: '',
                    complement: '',
                    neighborhood: '',
                    reference: '',
                    isDefault: false
                  });
                  setShowAddressForm(true);
                }}
                className="bg-[#ea1d2c] hover:bg-[#d61a28] text-white text-sm font-semibold py-2 px-3 rounded-lg flex items-center space-x-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Novo</span>
              </button>
            </div>
              </div>

              <div className="p-4 md:p-6">
                {/* Mensagem de erro */}
                {error && (
                  <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
                    <div className="flex items-center space-x-2 text-red-800 text-sm">
                      <X className="w-4 h-4" />
                      <span className="font-medium">{error}</span>
                    </div>
                  </div>
                )}

                {/* Formulário de endereço */}
                {showAddressForm && (
                  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                      <div className="px-3 sm:px-4 md:px-6 py-3 sm:py-3.5 md:py-4 border-b border-slate-200 sticky top-0 bg-white">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm sm:text-base md:text-lg font-bold text-slate-900 flex items-center">
                            {editingAddress ? (
                              <>
                                <Edit className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 mr-1.5 sm:mr-2 text-[#ea1d2c]" />
                                <span className="hidden xs:inline">Editar Endereço</span>
                                <span className="xs:hidden">Editar</span>
                              </>
                            ) : (
                              <>
                                <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 mr-1.5 sm:mr-2 text-[#ea1d2c]" />
                                <span className="hidden xs:inline">Adicionar Novo Endereço</span>
                                <span className="xs:hidden">Novo Endereço</span>
                              </>
                            )}
                          </h3>
                          <button
                            onClick={cancelEdit}
                            className="text-slate-400 hover:text-slate-600 transition-colors"
                          >
                            <X className="w-4 h-4 sm:w-5 sm:h-5" />
                          </button>
                        </div>
                      </div>
                    
                    <form onSubmit={editingAddress ? handleUpdateAddress : handleAddAddress} className="p-3 sm:p-4 md:p-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-3.5 md:gap-4 mb-4 sm:mb-5 md:mb-6">
                        <div className="md:col-span-2">
                          <label className="text-xs sm:text-sm font-semibold text-gray-700 mb-1.5 sm:mb-2 flex items-center">
                            <Home className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 mr-1 sm:mr-1.5 md:mr-2 text-gray-500" />
                            Rua
                          </label>
                          <input
                            type="text"
                            value={newAddress.street}
                            onChange={(e) => setNewAddress({...newAddress, street: e.target.value})}
                            className="w-full px-3 py-2 sm:px-3.5 sm:py-2.5 md:px-4 md:py-3 text-sm sm:text-base border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-[#ea1d2c] focus:border-[#ea1d2c] transition-all duration-200"
                            placeholder="Ex: Rua das Flores"
                            required
                          />
                        </div>
                        
                        <div>
                          <label className="text-xs sm:text-sm font-semibold text-gray-700 mb-1.5 sm:mb-2 flex items-center">
                            Número
                          </label>
                          <div className="flex items-center gap-2 mb-1.5 sm:mb-2">
                            <input
                              type="checkbox"
                              id="hasNumber"
                              checked={hasNumber}
                              onChange={handleHasNumberChange}
                              className="w-4 h-4 text-[#ea1d2c] border-gray-300 rounded focus:ring-[#ea1d2c]"
                            />
                            <label htmlFor="hasNumber" className="text-xs sm:text-sm text-gray-700 cursor-pointer">
                              Endereço possui número?
                            </label>
                          </div>
                          <input
                            type="text"
                            value={newAddress.number}
                            onChange={(e) => setNewAddress({...newAddress, number: e.target.value})}
                            className={`w-full px-3 py-2 sm:px-3.5 sm:py-2.5 md:px-4 md:py-3 text-sm sm:text-base border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-[#ea1d2c] focus:border-[#ea1d2c] transition-all duration-200 ${!hasNumber ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                            placeholder="123"
                            required={hasNumber}
                            disabled={!hasNumber}
                          />
                        </div>
                        
                        <div>
                          <label className="text-xs sm:text-sm font-semibold text-gray-700 mb-1.5 sm:mb-2 flex items-center">
                            Complemento
                          </label>
                          <input
                            type="text"
                            value={newAddress.complement}
                            onChange={(e) => setNewAddress({...newAddress, complement: e.target.value})}
                            className="w-full px-3 py-2 sm:px-3.5 sm:py-2.5 md:px-4 md:py-3 text-sm sm:text-base border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-[#ea1d2c] focus:border-[#ea1d2c] transition-all duration-200"
                            placeholder="Apto 101"
                          />
                        </div>
                        
                        <div className="md:col-span-2">
                          <label className="text-xs sm:text-sm font-semibold text-gray-700 mb-1.5 sm:mb-2 flex items-center">
                            Bairro
                          </label>
                          <input
                            type="text"
                            value={newAddress.neighborhood}
                            onChange={(e) => setNewAddress({...newAddress, neighborhood: e.target.value})}
                            className="w-full px-3 py-2 sm:px-3.5 sm:py-2.5 md:px-4 md:py-3 text-sm sm:text-base border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-[#ea1d2c] focus:border-[#ea1d2c] transition-all duration-200"
                            placeholder="Ex: Centro"
                            required
                          />
                        </div>
                        
                        <div className="md:col-span-2">
                          <label className="text-xs sm:text-sm font-semibold text-gray-700 mb-1.5 sm:mb-2 flex items-center">
                            Referência
                          </label>
                          <input
                            type="text"
                            value={newAddress.reference}
                            onChange={(e) => setNewAddress({...newAddress, reference: e.target.value})}
                            className="w-full px-3 py-2 sm:px-3.5 sm:py-2.5 md:px-4 md:py-3 text-sm sm:text-base border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-[#ea1d2c] focus:border-[#ea1d2c] transition-all duration-200"
                            placeholder="Ex: Próximo ao mercado"
                          />
                        </div>
                        
                        <div className="md:col-span-2">
                          <label className="flex items-center space-x-2 sm:space-x-2.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={newAddress.isDefault}
                              onChange={(e) => setNewAddress({...newAddress, isDefault: e.target.checked})}
                              className="w-4 h-4 sm:w-4.5 sm:h-4.5 md:w-5 md:h-5 text-[#ea1d2c] focus:ring-[#ea1d2c] border-2 border-gray-300 rounded transition-all duration-200"
                            />
                            <span className="text-xs sm:text-sm font-medium text-gray-700 flex items-center">
                              <Star className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 mr-1 sm:mr-1.5 md:mr-2 text-yellow-500" />
                              <span className="hidden xs:inline">Definir como endereço padrão</span>
                              <span className="xs:hidden">Endereço padrão</span>
                            </span>
                          </label>
                        </div>
                      </div>
                      
                      <div className="flex justify-end space-x-2 sm:space-x-2.5 md:space-x-3">
                        <button
                          type="button"
                          onClick={cancelEdit}
                          className="px-3 py-2 sm:px-4 sm:py-2.5 md:px-6 md:py-3 text-sm sm:text-base text-gray-600 hover:bg-gray-100 rounded-lg font-semibold transition-all duration-200 border border-gray-200"
                        >
                          Cancelar
                        </button>
                        <button
                          type="submit"
                          className="px-3 py-2 sm:px-4 sm:py-2.5 md:px-6 md:py-3 text-sm sm:text-base bg-[#ea1d2c] text-white rounded-lg hover:bg-[#d61a28] font-semibold transition-all duration-200 shadow-lg flex items-center space-x-1.5 sm:space-x-2"
                        >
                          {editingAddress ? (
                            <>
                              <Edit className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                              <span className="hidden xs:inline">Atualizar</span>
                              <span className="xs:hidden">OK</span>
                            </>
                          ) : (
                            <>
                              <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                              <span className="hidden xs:inline">Salvar</span>
                              <span className="xs:hidden">OK</span>
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
                )}

                {/* Modal de confirmação de exclusão */}
                {deletingAddress && (
                  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
                      <div className="px-6 py-4 border-b border-slate-200">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                            <Trash2 className="w-5 h-5 text-red-600" />
                          </div>
                          <h3 className="text-lg font-bold text-slate-900">
                            Remover Endereço
                          </h3>
                        </div>
                      </div>
                      
                      <div className="p-6">
                        <p className="text-slate-600 mb-4">
                          Tem certeza que deseja remover este endereço?
                        </p>
                        
                        <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                          <div className="flex items-start gap-2">
                            <MapPin className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                            <div className="text-sm">
                              <p className="font-semibold text-slate-900">
                                {deletingAddress.street}, {deletingAddress.number}
                              </p>
                              <p className="text-slate-600">{deletingAddress.neighborhood}</p>
                              {deletingAddress.complement && (
                                <p className="text-slate-500 text-xs mt-1">
                                  {deletingAddress.complement}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="px-6 py-4 bg-slate-50 rounded-b-xl flex justify-end gap-3">
                        <button
                          onClick={() => setDeletingAddress(null)}
                          className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg font-medium transition-all duration-200"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={() => handleDeleteAddress(deletingAddress.id)}
                          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-all duration-200 flex items-center gap-2"
                        >
                          <Trash2 className="w-4 h-4" />
                          Remover
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Lista de endereços */}
                {loading ? (
                  <div className="text-center py-12">
                    <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                      <MapPin className="w-10 h-10 text-blue-400" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">Carregando endereços...</h3>
                    <p className="text-gray-600">Aguarde enquanto buscamos seus endereços</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {addresses.length === 0 ? (
                      <div className="text-center py-12">
                        <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                          <MapPin className="w-10 h-10 text-gray-400" />
                        </div>
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">Nenhum endereço cadastrado</h3>
                        <p className="text-gray-600 mb-6">Adicione um endereço para facilitar suas compras</p>
                        
                        <button
                          onClick={() => setShowAddressForm(true)}
                          className="bg-[#ea1d2c] hover:bg-[#d61a28] text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 shadow-md flex items-center space-x-2 mx-auto"
                        >
                          <Plus className="w-5 h-5" />
                          <span>Adicionar Primeiro Endereço</span>
                        </button>
                      </div>
                    ) : (
                      addresses.map((address) => (
                        <div key={address.id} className="group relative bg-white rounded-xl border border-slate-200 hover:border-[#ea1d2c]/30 p-3 sm:p-4 md:p-5 transition-all duration-200 hover:shadow-md">
                          
                          <div className="flex items-start justify-between gap-2 sm:gap-3 md:gap-4">
                            <div className="flex-1 min-w-0">
                              {/* Endereço Principal */}
                              <div className="mb-2 sm:mb-3">
                                <div className="flex items-start gap-2 sm:gap-3">
                                  <div className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 bg-[#ea1d2c]/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                                    <MapPin className="w-4 h-4 sm:w-4.5 sm:h-4.5 md:w-5 md:h-5 text-[#ea1d2c]" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <h4 className="font-semibold text-slate-900 text-sm sm:text-base mb-0.5 leading-tight">
                                      {address.street}, {address.number}
                                    </h4>
                                    <p className="text-xs sm:text-sm text-slate-600">
                                      {address.neighborhood}
                                    </p>
                                  </div>
                                </div>
                              </div>
                              
                              {/* Detalhes Adicionais */}
                              {(address.complement || address.reference) && (
                                <div className="ml-10 sm:ml-12 md:ml-13 space-y-1 sm:space-y-1.5">
                                  {address.complement && (
                                    <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm">
                                      <span className="text-slate-500 text-xs">Complemento:</span>
                                      <span className="text-slate-700 font-medium text-xs sm:text-sm truncate">{address.complement}</span>
                                    </div>
                                  )}
                                  
                                  {address.reference && (
                                    <div className="flex items-start gap-1.5 sm:gap-2 text-xs sm:text-sm">
                                      <span className="text-slate-500 flex-shrink-0 text-xs">Ref:</span>
                                      <span className="text-slate-700 font-medium text-xs sm:text-sm line-clamp-2">{address.reference}</span>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                            
                            {/* Ações */}
                            <div className="flex-shrink-0 flex flex-col items-end gap-1.5 sm:gap-2">
                              {/* Badge de Endereço Padrão */}
                              {address.isDefault && (
                                <div className="bg-emerald-500 text-white rounded-md px-1.5 sm:px-2 py-0.5 sm:py-1 text-[10px] sm:text-xs font-semibold flex items-center space-x-0.5 sm:space-x-1">
                                  <Star className="w-2.5 h-2.5 sm:w-3 sm:h-3 fill-white" />
                                  <span className="hidden xs:inline">PADRÃO</span>
                                  <span className="xs:hidden">P</span>
                                </div>
                              )}
                              
                              {/* Botões de ação */}
                              <div className="flex items-center gap-1.5 sm:gap-2">
                                <button 
                                  onClick={() => handleEditAddress(address)}
                                  className="p-1.5 sm:p-2 bg-[#ea1d2c]/10 text-[#ea1d2c] hover:bg-[#ea1d2c] hover:text-white rounded-md transition-all duration-200"
                                  title="Editar endereço"
                                >
                                  <Edit className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                </button>
                                <button 
                                  onClick={() => setDeletingAddress(address)}
                                  className="p-1.5 sm:p-2 bg-red-100 text-red-600 hover:bg-red-600 hover:text-white rounded-md transition-all duration-200"
                                  title="Remover endereço"
                                >
                                  <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
      </div>
    </div>
  );
};

export default Profile;
