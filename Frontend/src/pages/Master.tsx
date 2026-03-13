import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Store, Users, TrendingUp, DollarSign, Calendar, ExternalLink, LogOut, Search, Circle, Phone, Plus, Edit, Trash2, X } from 'lucide-react';
import { apiService } from '../services/api';

interface Loja {
  id: number;
  nome: string;
  subdominio: string;
  corPrimaria: string;
  planoMensal: string;
  criadoEm: string;
  totalUsuarios?: number;
  totalPedidos?: number;
  receitaPedidos?: number;
  valorPlano?: number;
  isOpen?: boolean;
  statusReason?: string;
  telefone?: string | null;
}

const Master: React.FC = () => {
  const navigate = useNavigate();
  const [lojas, setLojas] = useState<Loja[]>([]);
  const [receitaTotal, setReceitaTotal] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedLoja, setSelectedLoja] = useState<Loja | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    loadLojas();
  }, []);

  const loadLojas = async () => {
    try {
      setLoading(true);
      const response = await apiService.getAllStores();
      // A API agora retorna { lojas: [], receitaTotal: number }
      if (response.lojas && Array.isArray(response.lojas)) {
        setLojas(response.lojas);
        setReceitaTotal(response.receitaTotal || 0);
      } else {
        // Fallback para compatibilidade com formato antigo
        setLojas(Array.isArray(response) ? response : []);
        // Calcular receita total baseado nos planos se não vier do backend
        const planValues: { [key: string]: number } = {
          'simples': 97,
          'pro': 197,
          'plus': 270
        };
        const total = (Array.isArray(response) ? response : []).reduce((sum, loja) => {
          return sum + (planValues[loja.planoMensal] || 0);
        }, 0);
        setReceitaTotal(total);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Erro ao carregar lojas');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const filteredLojas = lojas.filter(loja =>
    loja.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    loja.subdominio.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalLojas = lojas.length;
  const totalUsuarios = lojas.reduce((sum, loja) => sum + (loja.totalUsuarios || 0), 0);

  const getStoreUrl = (subdominio: string) => {
    const { protocol, hostname, port } = window.location;
    const isLocalhost = hostname === 'localhost' || /^(\d{1,3}\.){3}\d{1,3}$/.test(hostname);
    const baseHost = isLocalhost ? hostname : 'miradelivery.com.br';
    const portPart = isLocalhost && port ? `:${port}` : '';
    return `${protocol}//${subdominio}.${baseHost}${portPart}`;
  };

  const getPlanColor = (plano: string) => {
    switch (plano) {
      case 'simples':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/40';
      case 'pro':
        return 'bg-orange-500/20 text-orange-400 border-orange-500/40';
      case 'plus':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/40';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/40';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--primary-color)] mx-auto mb-4"></div>
          <p className="text-gray-400">Carregando lojas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
      {/* Header */}
      <header className="border-b border-white/10 bg-gray-900/50 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-[var(--primary-color)] to-[var(--primary-color-hover)] rounded-xl flex items-center justify-center">
                <Store className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Painel Master</h1>
                <p className="text-xs text-gray-400">Gerenciamento de todas as lojas</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--primary-color)] hover:bg-[var(--primary-color-hover)] text-white transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span className="text-sm">Criar Loja</span>
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                <span className="text-sm">Sair</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400 mb-1">Total de Lojas</p>
                <p className="text-3xl font-bold">{totalLojas}</p>
              </div>
              <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <Store className="h-6 w-6 text-blue-400" />
              </div>
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400 mb-1">Total de Usuários</p>
                <p className="text-3xl font-bold">{totalUsuarios}</p>
              </div>
              <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
                <Users className="h-6 w-6 text-green-400" />
              </div>
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400 mb-1">Receita Total</p>
                <p className="text-3xl font-bold">R$ {receitaTotal.toFixed(2).replace('.', ',')}</p>
              </div>
              <div className="w-12 h-12 bg-[var(--primary-color)]/20 rounded-lg flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-[var(--primary-color)]" />
              </div>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Buscar loja por nome ou subdomínio..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)] focus:border-[var(--primary-color)]"
            />
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-500/20 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl">
            {error}
          </div>
        )}

        {/* Lojas List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredLojas.map((loja) => (
            <div
              key={loja.id}
              className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 hover:bg-white/[0.07] transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-lg font-bold">{loja.nome}</h3>
                    {loja.isOpen !== undefined && (
                      <div className="flex items-center gap-1">
                        <Circle 
                          className={`h-2 w-2 ${loja.isOpen ? 'text-green-400 fill-green-400' : 'text-gray-500 fill-gray-500'}`}
                        />
                        <span className={`text-xs font-semibold ${loja.isOpen ? 'text-green-400' : 'text-gray-500'}`}>
                          {loja.isOpen ? 'Online' : 'Offline'}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-gray-400">{loja.subdominio}.miradelivery.com.br</p>
                    <span className="text-xs text-gray-500">•</span>
                    <p className="text-sm text-gray-500">ID: {loja.id}</p>
                  </div>
                </div>
                <span className={`px-2 py-1 text-xs font-semibold rounded-lg border ${getPlanColor(loja.planoMensal)}`}>
                  {loja.planoMensal}
                </span>
              </div>

              <div className="space-y-2 mb-4">
                {loja.telefone && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400 flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      Telefone:
                    </span>
                    <span className="font-semibold">{loja.telefone}</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Usuários:</span>
                  <span className="font-semibold">{loja.totalUsuarios || 0}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Pedidos:</span>
                  <span className="font-semibold">{loja.totalPedidos || 0}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Receita:</span>
                  <span className="font-semibold text-green-400">
                    R$ {(loja.receitaPedidos || 0).toFixed(2).replace('.', ',')}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Criada em:</span>
                  <span className="font-semibold">
                    {new Date(loja.criadoEm).toLocaleDateString('pt-BR')}
                  </span>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setSelectedLoja(loja);
                    setShowEditModal(true);
                  }}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold rounded-lg transition-colors"
                >
                  <Edit className="h-4 w-4" />
                  <span>Editar</span>
                </button>
                <button
                  onClick={() => {
                    setSelectedLoja(loja);
                    setShowDeleteModal(true);
                  }}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-400 font-semibold rounded-lg transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>Excluir</span>
                </button>
                <a
                  href={getStoreUrl(loja.subdominio)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-[var(--primary-color)] hover:bg-[var(--primary-color-hover)] text-white font-semibold rounded-lg transition-colors"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            </div>
          ))}
        </div>

        {filteredLojas.length === 0 && !loading && (
          <div className="text-center py-12">
            <Store className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 text-lg">Nenhuma loja encontrada</p>
            {searchTerm && (
              <p className="text-gray-500 text-sm mt-2">
                Tente buscar com outro termo
              </p>
            )}
          </div>
        )}
      </div>

      {/* Modal Criar Loja */}
      {showCreateModal && (
        <CreateStoreModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            loadLojas();
          }}
        />
      )}

      {/* Modal Editar Loja */}
      {showEditModal && selectedLoja && (
        <EditStoreModal
          loja={selectedLoja}
          onClose={() => {
            setShowEditModal(false);
            setSelectedLoja(null);
          }}
          onSuccess={() => {
            setShowEditModal(false);
            setSelectedLoja(null);
            loadLojas();
          }}
        />
      )}

      {/* Modal Excluir Loja */}
      {showDeleteModal && selectedLoja && (
        <DeleteStoreModal
          loja={selectedLoja}
          onClose={() => {
            setShowDeleteModal(false);
            setSelectedLoja(null);
          }}
          onSuccess={() => {
            setShowDeleteModal(false);
            setSelectedLoja(null);
            loadLojas();
          }}
        />
      )}
    </div>
  );
};

// Modal para Criar Loja
const CreateStoreModal: React.FC<{ onClose: () => void; onSuccess: () => void }> = ({ onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    nomeLoja: '',
    subdominio: '',
    corPrimaria: '#EA1D2C',
    planoMensal: 'simples' as 'simples' | 'pro' | 'plus',
    criarAdmin: false,
    username: '',
    telefone: '',
    password: '',
    email: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await apiService.createStore({
        nomeLoja: formData.nomeLoja,
        subdominio: formData.subdominio,
        corPrimaria: formData.corPrimaria,
        planoMensal: formData.planoMensal,
        criarAdmin: formData.criarAdmin,
        ...(formData.criarAdmin && {
          username: formData.username,
          telefone: formData.telefone,
          password: formData.password,
          email: formData.email || undefined
        })
      });
      onSuccess();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Erro ao criar loja');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl border border-white/10 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <h2 className="text-xl font-bold">Criar Nova Loja</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-500/20 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-2">Nome da Loja *</label>
            <input
              type="text"
              required
              value={formData.nomeLoja}
              onChange={(e) => setFormData({ ...formData, nomeLoja: e.target.value })}
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]"
              placeholder="Ex: Pizzaria do João"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Subdomínio *</label>
            <div className="flex">
              <input
                type="text"
                required
                value={formData.subdominio}
                onChange={(e) => setFormData({ ...formData, subdominio: e.target.value })}
                className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-l-lg text-white focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]"
                placeholder="pizzaria-do-joao"
              />
              <span className="px-4 py-2 bg-white/10 border border-white/10 border-l-0 rounded-r-lg text-gray-400 flex items-center">
                .miradelivery.com.br
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Cor Primária</label>
              <input
                type="color"
                value={formData.corPrimaria}
                onChange={(e) => setFormData({ ...formData, corPrimaria: e.target.value })}
                className="w-full h-10 bg-white/5 border border-white/10 rounded-lg cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Plano Mensal *</label>
              <select
                required
                value={formData.planoMensal}
                onChange={(e) => setFormData({ ...formData, planoMensal: e.target.value as any })}
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]"
              >
                <option value="simples">Simples - R$ 97/mês</option>
                <option value="pro">Pro - R$ 197/mês</option>
                <option value="plus">Plus - R$ 270/mês</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="criarAdmin"
              checked={formData.criarAdmin}
              onChange={(e) => setFormData({ ...formData, criarAdmin: e.target.checked })}
              className="w-4 h-4 rounded"
            />
            <label htmlFor="criarAdmin" className="text-sm">Criar usuário admin para esta loja</label>
          </div>

          {formData.criarAdmin && (
            <div className="space-y-4 pl-6 border-l-2 border-white/10">
              <div>
                <label className="block text-sm font-medium mb-2">Nome do Admin *</label>
                <input
                  type="text"
                  required={formData.criarAdmin}
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]"
                  placeholder="Nome do administrador"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Telefone *</label>
                <input
                  type="tel"
                  required={formData.criarAdmin}
                  value={formData.telefone}
                  onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]"
                  placeholder="(00) 00000-0000"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Senha *</label>
                <input
                  type="password"
                  required={formData.criarAdmin}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]"
                  placeholder="Mínimo 6 caracteres"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Email (opcional)</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]"
                  placeholder="email@exemplo.com"
                />
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-[var(--primary-color)] hover:bg-[var(--primary-color-hover)] text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? 'Criando...' : 'Criar Loja'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Modal para Editar Loja
const EditStoreModal: React.FC<{ loja: Loja; onClose: () => void; onSuccess: () => void }> = ({ loja, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    nomeLoja: loja.nome,
    subdominio: loja.subdominio,
    corPrimaria: loja.corPrimaria,
    planoMensal: loja.planoMensal as 'simples' | 'pro' | 'plus'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await apiService.updateStore(loja.id, formData);
      onSuccess();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Erro ao editar loja');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl border border-white/10 max-w-2xl w-full">
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <h2 className="text-xl font-bold">Editar Loja</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-500/20 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-2">Nome da Loja *</label>
            <input
              type="text"
              required
              value={formData.nomeLoja}
              onChange={(e) => setFormData({ ...formData, nomeLoja: e.target.value })}
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Subdomínio *</label>
            <div className="flex">
              <input
                type="text"
                required
                value={formData.subdominio}
                onChange={(e) => setFormData({ ...formData, subdominio: e.target.value })}
                className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-l-lg text-white focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]"
              />
              <span className="px-4 py-2 bg-white/10 border border-white/10 border-l-0 rounded-r-lg text-gray-400 flex items-center">
                .miradelivery.com.br
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Cor Primária</label>
              <input
                type="color"
                value={formData.corPrimaria}
                onChange={(e) => setFormData({ ...formData, corPrimaria: e.target.value })}
                className="w-full h-10 bg-white/5 border border-white/10 rounded-lg cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Plano Mensal *</label>
              <select
                required
                value={formData.planoMensal}
                onChange={(e) => setFormData({ ...formData, planoMensal: e.target.value as any })}
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]"
              >
                <option value="simples">Simples - R$ 97/mês</option>
                <option value="pro">Pro - R$ 197/mês</option>
                <option value="plus">Plus - R$ 270/mês</option>
              </select>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-[var(--primary-color)] hover:bg-[var(--primary-color-hover)] text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Modal para Excluir Loja
const DeleteStoreModal: React.FC<{ loja: Loja; onClose: () => void; onSuccess: () => void }> = ({ loja, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [confirmText, setConfirmText] = useState('');

  const handleDelete = async () => {
    if (confirmText !== loja.nome) {
      setError('Digite o nome da loja para confirmar a exclusão');
      return;
    }

    setError('');
    setLoading(true);

    try {
      await apiService.deleteStore(loja.id);
      onSuccess();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Erro ao excluir loja');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl border border-white/10 max-w-md w-full">
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <h2 className="text-xl font-bold text-red-400">Excluir Loja</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="p-6 space-y-4">
          {error && (
            <div className="bg-red-500/20 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
            <p className="text-sm text-red-300 mb-2">
              <strong>Atenção!</strong> Esta ação é irreversível e irá excluir:
            </p>
            <ul className="text-xs text-red-400 space-y-1 list-disc list-inside">
              <li>Todos os pedidos da loja ({loja.totalPedidos || 0} pedidos)</li>
              <li>Todos os usuários da loja ({loja.totalUsuarios || 0} usuários)</li>
              <li>Todos os produtos e configurações</li>
              <li>Todos os dados relacionados</li>
            </ul>
          </div>

          <div>
            <p className="text-sm text-gray-300 mb-2">
              Para confirmar, digite o nome da loja: <strong>{loja.nome}</strong>
            </p>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Digite o nome da loja"
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={loading || confirmText !== loja.nome}
              className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Excluindo...' : 'Excluir Loja'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Master;

