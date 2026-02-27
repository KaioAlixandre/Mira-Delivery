import React, { useState } from 'react';
import { apiService } from '../services/api';

export default function CadastroLojista() {
  const [formData, setFormData] = useState({
    nomeLoja: '',
    subdominioDesejado: '',
    username: '',
    telefone: '',
    email: '',
    password: ''
  });
  const [subdominioLogin, setSubdominioLogin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successData, setSuccessData] = useState<any>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    // Mágica: Preenche o subdomínio automaticamente enquanto digita o nome da loja
    if (name === 'nomeLoja' && !successData) {
      const slug = value.toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Tira acentos
        .replace(/[^a-z0-9-]/g, '-') // Troca espaços por hífen
        .replace(/-+/g, '-') 
        .replace(/^-|-$/g, '');
        
      setFormData(prev => ({ ...prev, [name]: value, subdominioDesejado: slug }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await apiService.registerStore(formData);
      setSuccessData(result);
    } catch (err: any) {
      setError(err.response?.data?.message || err.response?.data?.error || 'Erro ao criar loja. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // TELA DE SUCESSO: O usuário é redirecionado para a própria loja para fazer login
  if (successData) {
    const port = window.location.port ? `:${window.location.port}` : '';
    const storeUrl = `http://${successData.loja.subdominio}.${window.location.hostname.replace('www.', '')}${port}`;
    
    return (
      <div className="max-w-md mx-auto mt-20 p-8 bg-slate-800 rounded-xl text-center shadow-2xl border border-slate-700">
        <div className="text-6xl mb-4">🎉</div>
        <h2 className="text-3xl font-bold text-green-500 mb-4">Loja Criada!</h2>
        <p className="mb-6 text-slate-300">
          Sua plataforma <strong>{successData.loja.nome}</strong> já está no ar.
        </p>
        <div className="bg-slate-900 p-4 rounded-lg mb-6 text-sm text-slate-400 break-all">
          Seu link exclusivo:<br/>
          <span className="text-orange-400 font-bold">{storeUrl}</span>
        </div>
        <a 
          href={`${storeUrl}/login`} 
          className="block w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-4 rounded-lg transition-colors"
        >
          Acessar Meu Painel Administrativo
        </a>
      </div>
    );
  }

  // FORMULÁRIO DE CADASTRO
  return (
    <div className="max-w-md mx-auto mt-10 p-8 bg-slate-800 text-white rounded-xl shadow-2xl border border-slate-700">
      <h2 className="text-3xl font-bold mb-2 text-orange-500 text-center">Crie seu Delivery</h2>
      <p className="text-slate-400 text-center mb-6">Comece a vender sem taxas abusivas.</p>
      
      {error && <div className="bg-red-500/20 border border-red-500 text-red-200 p-3 rounded-lg mb-6">{error}</div>}
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1 text-slate-300">Nome do Restaurante</label>
          <input required type="text" name="nomeLoja" value={formData.nomeLoja} onChange={handleChange} placeholder="Ex: Pizzaria do Mario" className="w-full p-3 rounded bg-slate-900 border border-slate-700 focus:border-orange-500 focus:outline-none" />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 text-slate-300">Seu Link (Subdomínio)</label>
          <div className="flex">
            <input required type="text" name="subdominioDesejado" value={formData.subdominioDesejado} onChange={handleChange} className="w-full p-3 rounded-l bg-slate-900 border border-slate-700 focus:border-orange-500 focus:outline-none text-right" />
            <span className="p-3 bg-slate-700 rounded-r border border-slate-700 border-l-0 text-slate-400 select-none">.seudominio.com</span>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 text-slate-300">Seu Nome (Admin)</label>
          <input required type="text" name="username" value={formData.username} onChange={handleChange} placeholder="Ex: Mario Bros" className="w-full p-3 rounded bg-slate-900 border border-slate-700 focus:border-orange-500 focus:outline-none" />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 text-slate-300">Telefone (WhatsApp)</label>
          <input required type="text" name="telefone" value={formData.telefone} onChange={handleChange} placeholder="(11) 99999-9999" className="w-full p-3 rounded bg-slate-900 border border-slate-700 focus:border-orange-500 focus:outline-none" />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 text-slate-300">Senha de Acesso</label>
          <input required type="password" name="password" value={formData.password} onChange={handleChange} placeholder="••••••••" className="w-full p-3 rounded bg-slate-900 border border-slate-700 focus:border-orange-500 focus:outline-none" />
        </div>

        <button disabled={loading} type="submit" className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-slate-600 text-white font-bold py-3 px-4 rounded-lg mt-6 transition-colors">
          {loading ? 'Criando loja...' : 'Criar Minha Loja'}
        </button>
      </form>

      <div className="mt-8 pt-6 border-t border-slate-700">
        <p className="text-slate-300 font-medium mb-3 text-center">Já tem uma loja e quer entrar?</p>

        <div className="flex">
          <input
            type="text"
            value={subdominioLogin}
            onChange={(e) => setSubdominioLogin(e.target.value)}
            placeholder="Digite seu subdomínio (ex: pizzaria-do-aleff)"
            className="w-full p-3 rounded-l bg-slate-900 border border-slate-700 focus:border-orange-500 focus:outline-none"
          />
          <button
            type="button"
            onClick={() => {
              const sub = subdominioLogin
                .toLowerCase()
                .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                .replace(/[^a-z0-9-]/g, '-')
                .replace(/-+/g, '-')
                .replace(/^-|-$/g, '');

              if (!sub) return;

              const port = window.location.port ? `:${window.location.port}` : '';
              const baseHost = window.location.hostname.replace('www.', '');
              const storeUrl = `${window.location.protocol}//${sub}.${baseHost}${port}/login`;
              window.location.href = storeUrl;
            }}
            className="px-4 bg-slate-700 hover:bg-slate-600 rounded-r border border-slate-700 border-l-0 text-white font-bold transition-colors"
          >
            Ir para Login
          </button>
        </div>
      </div>
    </div>
  );
}