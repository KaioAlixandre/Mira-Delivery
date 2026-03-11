import React, { useEffect, useState } from 'react';
import { Palette, Save, Image, Upload, X, Trash2 } from 'lucide-react';
import apiService from '../../services/api';
import { useNotification } from '../../components/NotificationProvider';

const CORES_SUGERIDAS = [
  '#ea1d2c', '#2563eb', '#16a34a', '#dc2626', '#7c3aed',
  '#0d9488', '#ca8a04', '#e11d48', '#0369a1', '#4f46e5',
];

const COR_PADRAO = '#ea1d2c';

function aplicarCorNoSite(cor: string) {
  if (cor && /^#[0-9A-Fa-f]{6}$/.test(cor)) {
    document.documentElement.style.setProperty('--primary-color', cor);
  }
}

const Tema: React.FC = () => {
  const { notify } = useNotification();
  const [corPrimaria, setCorPrimaria] = useState(COR_PADRAO);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [selectedLogoFile, setSelectedLogoFile] = useState<File | null>(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiService
      .getStoreConfig()
      .then((data) => {
        const cor = (data?.corPrimaria && /^#[0-9A-Fa-f]{6}$/.test(String(data.corPrimaria)))
          ? String(data.corPrimaria)
          : COR_PADRAO;
        setCorPrimaria(cor);
        aplicarCorNoSite(cor);
        setLogoUrl(typeof data?.logoUrl === 'string' ? data.logoUrl.trim() || null : null);
      })
      .catch(() => {
        notify('Erro ao carregar tema', 'error');
      })
      .finally(() => setLoading(false));
  }, [notify]);

  useEffect(() => {
    if (!selectedLogoFile) {
      setLogoPreviewUrl(null);
      return;
    }
    const objectUrl = URL.createObjectURL(selectedLogoFile);
    setLogoPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [selectedLogoFile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiService.updateStoreConfig({ corPrimaria: corPrimaria || COR_PADRAO });
      aplicarCorNoSite(corPrimaria || COR_PADRAO);
      notify('Tema salvo com sucesso!', 'success');
    } catch {
      notify('Erro ao salvar tema. Tente novamente.', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
        <p className="text-sm text-slate-500">Carregando tema...</p>
      </div>
    );
  }

  return (
    <div className="page space-y-5">
      <header>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Tema do site</h2>
        <p className="text-sm text-slate-500 mt-1">Logo da loja e cor primária usada em botões, links e destaques</p>
      </header>

      {/* Logo da Loja */}
      <div className="bg-white rounded-2xl shadow-md border border-slate-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
          <Image className="w-4 h-4 text-slate-500" />
          <h3 className="text-sm font-bold text-slate-800">Logo da Loja</h3>
        </div>
        <div className="p-5">
          <div className="flex flex-col sm:flex-row items-start gap-5">
            <div className="w-24 h-24 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 overflow-hidden flex items-center justify-center flex-shrink-0">
              {logoPreviewUrl ? (
                <img src={logoPreviewUrl} alt="Preview da logo" className="w-full h-full object-cover" />
              ) : logoUrl ? (
                <img src={logoUrl} alt="Logo da loja" className="w-full h-full object-cover" />
              ) : (
                <Image className="w-8 h-8 text-slate-300" />
              )}
            </div>
            <div className="flex-1 space-y-3 w-full">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setSelectedLogoFile(e.target.files?.[0] || null)}
                className="block w-full text-sm text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-600 hover:file:bg-indigo-100 file:cursor-pointer"
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={!selectedLogoFile || logoUploading}
                  onClick={async () => {
                    if (!selectedLogoFile) return;
                    try {
                      setLogoUploading(true);
                      const result = await apiService.uploadStoreLogo(selectedLogoFile);
                      setLogoUrl(result.logoUrl);
                      setSelectedLogoFile(null);
                      notify('Logo enviada com sucesso!', 'success');
                    } catch {
                      notify('Erro ao enviar logo. Tente novamente.', 'error');
                    } finally {
                      setLogoUploading(false);
                    }
                  }}
                  className="inline-flex items-center gap-1.5 bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                >
                  <Upload className="w-3.5 h-3.5" />
                  {logoUploading ? 'Enviando...' : 'Enviar'}
                </button>
                <button
                  type="button"
                  disabled={logoUploading}
                  onClick={() => setSelectedLogoFile(null)}
                  className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-700 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-slate-200 transition-colors disabled:opacity-50"
                >
                  <X className="w-3.5 h-3.5" />
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={logoUploading}
                  onClick={async () => {
                    try {
                      setLogoUploading(true);
                      await apiService.updateStoreConfig({ logoUrl: null });
                      setLogoUrl(null);
                      setSelectedLogoFile(null);
                      notify('Logo removida com sucesso!', 'success');
                    } catch {
                      notify('Erro ao remover logo. Tente novamente.', 'error');
                    } finally {
                      setLogoUploading(false);
                    }
                  }}
                  className="inline-flex items-center gap-1.5 bg-white border border-slate-200 text-red-600 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-red-50 transition-colors disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Remover
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-white rounded-2xl shadow-md border border-slate-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
            <Palette className="w-4 h-4 text-slate-500" />
            <h3 className="text-sm font-bold text-slate-800">Cor primária</h3>
          </div>
          <div className="p-5 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Cor primária do sistema</label>
              <p className="text-xs text-slate-500 mb-3">
                Esta cor será usada em botões, links e destaques da loja (cliente e admin).
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <input
                  type="color"
                  id="corPrimaria"
                  value={corPrimaria || COR_PADRAO}
                  onChange={(e) => setCorPrimaria(e.target.value || COR_PADRAO)}
                  className="w-12 h-12 rounded-xl border-2 border-slate-200 cursor-pointer bg-transparent"
                />
                <input
                  type="text"
                  value={corPrimaria || COR_PADRAO}
                  onChange={(e) => {
                    const v = e.target.value.trim();
                    if (/^#[0-9A-Fa-f]{6}$/.test(v) || v === '') {
                      setCorPrimaria(v || COR_PADRAO);
                    }
                  }}
                  placeholder={COR_PADRAO}
                  className="w-28 px-3 py-2 text-sm font-mono border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none"
                />
              </div>
              <div className="mt-3">
                <p className="text-xs font-medium text-slate-600 mb-2">Cores sugeridas:</p>
                <div className="flex flex-wrap gap-2">
                  {CORES_SUGERIDAS.map((hex) => (
                    <button
                      key={hex}
                      type="button"
                      onClick={() => setCorPrimaria(hex)}
                      className={`w-8 h-8 rounded-lg border-2 transition-all hover:scale-110 ${
                        (corPrimaria || COR_PADRAO).toLowerCase() === hex.toLowerCase()
                          ? 'border-slate-800 ring-2 ring-slate-400'
                          : 'border-slate-200 hover:border-slate-400'
                      }`}
                      style={{ backgroundColor: hex }}
                      title={hex}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200/50 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Salvando...' : 'Salvar tema'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default Tema;
