import React, { useEffect, useState } from 'react';
import { User, Mail, Phone, KeyRound, Eye, EyeOff, Save, MessageSquare, Lightbulb, Lock } from 'lucide-react';
import apiService from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../components/NotificationProvider';

const inputClassPlain = 'w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand focus:border-brand transition-colors';

const ConfiguracoesLoja: React.FC = () => {
  const { notify } = useNotification();
  const { user, refreshUserProfile } = useAuth();

  const [profileData, setProfileData] = useState({ nomeUsuario: '', email: '', telefone: '' });
  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [showSenhaAtual, setShowSenhaAtual] = useState(false);
  const [showNovaSenha, setShowNovaSenha] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

  const [zapConfig, setZapConfig] = useState<{ zapApiToken?: string; zapApiInstance?: string; zapApiClientToken?: string }>({});
  const [currentPlan, setCurrentPlan] = useState<'simples' | 'pro' | 'plus'>('simples');
  const [savingZapi, setSavingZapi] = useState(false);
  const [showZapiTokens, setShowZapiTokens] = useState(false);

  useEffect(() => {
    if (user) {
      setProfileData({
        nomeUsuario: user.nomeUsuario || (user as any).username || '',
        email: user.email || '',
        telefone: user.telefone || (user as any).phone || '',
      });
    }
  }, [user]);

  useEffect(() => {
    apiService
      .getStoreConfig()
      .then((data) => {
        setCurrentPlan((['simples', 'pro', 'plus'].includes(data.planoMensal) ? data.planoMensal : 'simples') as 'simples' | 'pro' | 'plus');
        setZapConfig({
          zapApiToken: data.zapApiToken || '',
          zapApiInstance: data.zapApiInstance || '',
          zapApiClientToken: data.zapApiClientToken || '',
        });
      })
      .catch(() => notify('Erro ao carregar configurações', 'error'));
  }, [notify]);

  const handleSubmitProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (novaSenha && novaSenha !== confirmarSenha) {
      notify('As senhas não coincidem.', 'error');
      return;
    }
    if (novaSenha && novaSenha.length < 6) {
      notify('A nova senha deve ter pelo menos 6 caracteres.', 'error');
      return;
    }
    setSavingProfile(true);
    try {
      const data: any = {
        nomeUsuario: profileData.nomeUsuario,
        email: profileData.email,
      };
      if (novaSenha) {
        data.senhaAtual = senhaAtual;
        data.novaSenha = novaSenha;
      }
      await apiService.updateProfile(data);
      await refreshUserProfile();
      setSenhaAtual('');
      setNovaSenha('');
      setConfirmarSenha('');
      notify('Perfil atualizado com sucesso!', 'success');
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Erro ao atualizar perfil.';
      notify(msg, 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleZapChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setZapConfig((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmitZapi = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingZapi(true);
    try {
      await apiService.updateStoreConfig({
        zapApiToken: zapConfig.zapApiToken,
        zapApiInstance: zapConfig.zapApiInstance,
        zapApiClientToken: zapConfig.zapApiClientToken,
      });
      notify('Configurações da Z-API salvas com sucesso!', 'success');
    } catch {
      notify('Erro ao salvar configurações da Z-API.', 'error');
    } finally {
      setSavingZapi(false);
    }
  };

  const zApiBlockedByPlan = currentPlan === 'simples';

  return (
    <div className="space-y-6">
      {/* Seção: Dados da Conta */}
      <div className="bg-white p-3 sm:p-4 md:p-6 rounded-xl shadow-md">
        <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <User className="w-5 h-5 text-brand" />
          Dados da Conta
        </h3>
        <form onSubmit={handleSubmitProfile} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Nome de Usuário</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={profileData.nomeUsuario}
                  onChange={(e) => setProfileData((prev) => ({ ...prev, nomeUsuario: e.target.value }))}
                  className={`${inputClassPlain} pl-10`}
                  placeholder="Seu nome"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">E-mail</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  value={profileData.email}
                  onChange={(e) => setProfileData((prev) => ({ ...prev, email: e.target.value }))}
                  className={`${inputClassPlain} pl-10`}
                  placeholder="email@exemplo.com"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Telefone</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={profileData.telefone}
                disabled
                className={`${inputClassPlain} pl-10 bg-slate-50 text-slate-500 cursor-not-allowed`}
              />
            </div>
            <p className="text-xs text-slate-500 mt-1">O telefone não pode ser alterado por aqui.</p>
          </div>

          <div className="border-t border-slate-200 pt-4 mt-4">
            <h4 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-slate-500" />
              Alterar Senha
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Senha Atual</label>
                <div className="relative">
                  <input
                    type={showSenhaAtual ? 'text' : 'password'}
                    value={senhaAtual}
                    onChange={(e) => setSenhaAtual(e.target.value)}
                    className={`${inputClassPlain} pr-10`}
                    placeholder="••••••"
                  />
                  <button type="button" onClick={() => setShowSenhaAtual(!showSenhaAtual)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showSenhaAtual ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Nova Senha</label>
                <div className="relative">
                  <input
                    type={showNovaSenha ? 'text' : 'password'}
                    value={novaSenha}
                    onChange={(e) => setNovaSenha(e.target.value)}
                    className={`${inputClassPlain} pr-10`}
                    placeholder="••••••"
                  />
                  <button type="button" onClick={() => setShowNovaSenha(!showNovaSenha)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showNovaSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Confirmar Senha</label>
                <input
                  type="password"
                  value={confirmarSenha}
                  onChange={(e) => setConfirmarSenha(e.target.value)}
                  className={inputClassPlain}
                  placeholder="••••••"
                />
                {novaSenha && confirmarSenha && novaSenha !== confirmarSenha && (
                  <p className="text-xs text-red-500 mt-1">As senhas não coincidem</p>
                )}
              </div>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="bg-brand text-white px-6 py-3 rounded-lg font-semibold hover:bg-brand transition-colors w-full sm:w-auto flex items-center justify-center gap-2"
              disabled={savingProfile}
            >
              <Save className="w-4 h-4" />
              {savingProfile ? 'Salvando...' : 'Salvar Dados'}
            </button>
          </div>
        </form>
      </div>

      {/* Integração Z-API (WhatsApp) */}
      <div className={`bg-white p-3 sm:p-4 md:p-6 rounded-xl shadow-md border ${zApiBlockedByPlan ? 'border-amber-200' : 'border-transparent'}`}>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-800 mb-1 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-green-600" />
              Integração Z-API (WhatsApp)
            </h3>
            <p className="text-xs sm:text-sm text-slate-500">
              Configure sua instância da Z-API para enviar notificações automáticas via WhatsApp.
            </p>
          </div>
          {zApiBlockedByPlan && (
            <div className="inline-flex items-center gap-2 self-start bg-amber-50 text-amber-700 border border-amber-200 rounded-full px-3 py-1.5 text-xs font-semibold whitespace-nowrap">
              <Lock className="w-3.5 h-3.5" />
              Requer plano Pro ou Plus
            </div>
          )}
        </div>

        {zApiBlockedByPlan && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
            <p className="text-sm text-amber-700 flex items-start gap-2">
              <Lock className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>
                A configuração da Z-API está indisponível no plano <strong>Simples</strong>. Atualize para o plano <strong>Pro</strong> ou <strong>Plus</strong> para usar o WhatsApp automático.
              </span>
            </p>
          </div>
        )}

        <form onSubmit={handleSubmitZapi} className={`space-y-4 ${zApiBlockedByPlan ? 'opacity-50 pointer-events-none' : ''}`}>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
            <p className="text-xs text-amber-700 flex items-start gap-2">
              <Lightbulb className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
              <span>
                Obtenha suas credenciais no painel da <strong>Z-API</strong> (z-api.io). Você precisará da <strong>Instância</strong>, <strong>Token</strong> e <strong>Client Token</strong> da sua conta.
              </span>
            </p>
          </div>

          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-600 font-medium">Mostrar tokens</span>
            <button
              type="button"
              onClick={() => setShowZapiTokens(!showZapiTokens)}
              className="text-slate-500 hover:text-slate-700 transition-colors flex items-center gap-1.5 text-sm"
            >
              {showZapiTokens ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              {showZapiTokens ? 'Ocultar' : 'Mostrar'}
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">ID da Instância</label>
              <input
                type={showZapiTokens ? 'text' : 'password'}
                name="zapApiInstance"
                value={zapConfig.zapApiInstance || ''}
                onChange={handleZapChange}
                className={inputClassPlain}
                placeholder="Ex: 3C2A7B9D1E4F..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Token da Instância</label>
              <input
                type={showZapiTokens ? 'text' : 'password'}
                name="zapApiToken"
                value={zapConfig.zapApiToken || ''}
                onChange={handleZapChange}
                className={inputClassPlain}
                placeholder="Ex: A1B2C3D4E5F6..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Client Token (Security Token)</label>
              <input
                type={showZapiTokens ? 'text' : 'password'}
                name="zapApiClientToken"
                value={zapConfig.zapApiClientToken || ''}
                onChange={handleZapChange}
                className={inputClassPlain}
                placeholder="Ex: F6e5d4c3b2a1..."
              />
            </div>
          </div>

          {zapConfig.zapApiToken && zapConfig.zapApiInstance && zapConfig.zapApiClientToken ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-sm text-green-700 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-green-600 flex-shrink-0" />
                <span><strong>Conectado</strong> — Todas as credenciais da Z-API estão configuradas.</span>
              </p>
            </div>
          ) : (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
              <p className="text-sm text-slate-500 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <span>Preencha todos os campos para ativar as notificações via WhatsApp.</span>
              </p>
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              className="bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors w-full sm:w-auto flex items-center justify-center gap-2"
              disabled={savingZapi || zApiBlockedByPlan}
            >
              {zApiBlockedByPlan ? <Lock className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              {zApiBlockedByPlan ? 'Disponível no Pro/Plus' : (savingZapi ? 'Salvando...' : 'Salvar Z-API')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ConfiguracoesLoja;
