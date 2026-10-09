import React, { useState } from 'react';
import { Condominium, FixedExpense } from '../types/reconciliation';
import { parseCondominiumsText } from '../utils/condoImportHelper';
import { 
  X, 
  Upload, 
  Building2, 
  Plus, 
  Trash2, 
  FileText, 
  CheckCircle2, 
  AlertCircle,
  Search,
  Zap
} from 'lucide-react';

interface CondosManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  condos: Condominium[];
  onImportBulkCondos: (newCondos: Condominium[], newFixedExpenses: FixedExpense[]) => void;
  onAddCondo: (condo: Condominium) => void;
  onDeleteCondo: (id: string) => void;
}

export const CondosManagerModal: React.FC<CondosManagerModalProps> = ({
  isOpen,
  onClose,
  condos,
  onImportBulkCondos,
  onAddCondo,
  onDeleteCondo
}) => {
  const [activeTab, setActiveTab] = useState<'list' | 'bulk_txt' | 'single'>('list');
  const [searchTerm, setSearchTerm] = useState('');

  // Bulk text state
  const [rawTxt, setRawTxt] = useState('');
  const [autoCreateCelesc, setAutoCreateCelesc] = useState(true);
  const [parsePreview, setParsePreview] = useState<{ count: number; sample: string[] } | null>(null);

  // Single condo state
  const [singleName, setSingleName] = useState('');
  const [singleUc, setSingleUc] = useState('');
  const [singleNotes, setSingleNotes] = useState('');

  if (!isOpen) return null;

  const handlePreviewTxt = () => {
    if (!rawTxt.trim()) return;
    const result = parseCondominiumsText(rawTxt, autoCreateCelesc);
    setParsePreview({
      count: result.totalParsed,
      sample: result.condominiums.slice(0, 4).map(c => `${c.name} (UC: ${c.uc})`)
    });
  };

  const handleExecuteBulkImport = () => {
    if (!rawTxt.trim()) return;
    const result = parseCondominiumsText(rawTxt, autoCreateCelesc);
    if (result.condominiums.length === 0) {
      alert('Nenhum condomínio válido foi detectado no formato "Nome;UC".');
      return;
    }
    onImportBulkCondos(result.condominiums, result.fixedExpenses);
    setRawTxt('');
    setParsePreview(null);
    setActiveTab('list');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        setRawTxt(text || '');
        const res = parseCondominiumsText(text || '', autoCreateCelesc);
        setParsePreview({
          count: res.totalParsed,
          sample: res.condominiums.slice(0, 4).map(c => `${c.name} (UC: ${c.uc})`)
        });
      };
      reader.readAsText(file);
    }
  };

  const handleSingleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!singleName || !singleUc) return;

    const newCondo: Condominium = {
      id: `condo-${Date.now()}`,
      name: singleName.trim(),
      uc: singleUc.trim(),
      notes: singleNotes.trim()
    };

    onAddCondo(newCondo);
    setSingleName('');
    setSingleUc('');
    setSingleNotes('');
    setActiveTab('list');
  };

  const filteredCondos = condos.filter(c => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return c.name.toLowerCase().includes(q) || c.uc.toLowerCase().includes(q);
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-800">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Gerenciar Condomínios & UCs
              </h2>
              <p className="text-xs text-slate-500">
                Cadastro e importação rápida de Unidades Consumidoras Celesc/Casan
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="px-5 pt-3 border-b border-slate-200 flex items-center gap-2">
          <button
            onClick={() => setActiveTab('list')}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'list'
                ? 'border-slate-900 text-slate-900 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Lista de Condomínios ({condos.length})
          </button>
          <button
            onClick={() => setActiveTab('bulk_txt')}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'bulk_txt'
                ? 'border-slate-900 text-slate-900 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-amber-500" />
            <span>Importar .txt (Nome;UC)</span>
          </button>
          <button
            onClick={() => setActiveTab('single')}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'single'
                ? 'border-slate-900 text-slate-900 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            + Adicionar Manual
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs">
          
          {/* TAB 1: LIST */}
          {activeTab === 'list' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Buscar por condomínio ou UC..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-300"
                  />
                </div>
                <button
                  onClick={() => setActiveTab('bulk_txt')}
                  className="px-3 py-1.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors"
                >
                  Importar .txt
                </button>
              </div>

              {filteredCondos.length === 0 ? (
                <div className="p-8 text-center text-slate-400 border border-dashed border-slate-200 rounded-xl">
                  Nenhum condomínio cadastrado ainda. Use a aba <strong>"Importar .txt"</strong> para colar sua lista.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden max-h-80 overflow-y-auto">
                  {filteredCondos.map((c) => (
                    <div key={c.id} className="p-3 flex items-center justify-between hover:bg-slate-50 transition-colors">
                      <div>
                        <p className="font-bold text-slate-900">{c.name}</p>
                        <p className="text-2xs text-slate-500 font-mono">
                          Unidade Consumidora (UC): <strong className="text-slate-800">{c.uc}</strong>
                        </p>
                      </div>
                      <button
                        onClick={() => onDeleteCondo(c.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                        title="Remover condomínio"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: BULK TXT IMPORT */}
          {activeTab === 'bulk_txt' && (
            <div className="space-y-3">
              <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-slate-700 space-y-1">
                <p className="font-bold text-amber-900">Como funciona a importação rápida:</p>
                <p className="text-2xs text-slate-600">
                  Cole o conteúdo do seu arquivo <strong>.txt</strong> ou anexe o arquivo abaixo. Cada linha deve conter o nome do condomínio e a Unidade Consumidora separados por ponto e vírgula <code>;</code>.
                </p>
                <div className="bg-white/80 p-2 rounded border border-amber-200 text-2xs font-mono text-slate-800">
                  Residencial Solar das Palmeiras;9872134<br />
                  Condomínio Edifício Bellagio;4512903<br />
                  Edifício Jardins do Vale;1092834
                </div>
              </div>

              <div className="flex items-center gap-2">
                <label className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
                  <Upload className="w-3.5 h-3.5 text-slate-600" />
                  <span>Carregar arquivo .txt</span>
                  <input type="file" accept=".txt,.csv" onChange={handleFileUpload} className="hidden" />
                </label>
                <span className="text-2xs text-slate-400">ou cole o texto no campo abaixo:</span>
              </div>

              <textarea
                rows={7}
                placeholder="Nome do Condomínio;UC"
                value={rawTxt}
                onChange={(e) => {
                  setRawTxt(e.target.value);
                  setParsePreview(null);
                }}
                className="w-full p-2.5 text-xs rounded-lg border border-slate-300 font-mono bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
              />

              <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoCreateCelesc}
                  onChange={(e) => setAutoCreateCelesc(e.target.checked)}
                  className="rounded border-slate-300 text-slate-900"
                />
                <span className="flex items-center gap-1">
                  <Zap className="w-3 h-3 text-amber-500" />
                  Criar automaticamente despesa fixa de Luz (Celesc) para cada condomínio importado
                </span>
              </label>

              {parsePreview && (
                <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 text-emerald-900 space-y-1">
                  <p className="font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>{parsePreview.count} condomínio(s) detectado(s) com sucesso!</span>
                  </p>
                  <p className="text-2xs text-emerald-800">
                    Amostra: {parsePreview.sample.join(' · ')}
                  </p>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                {!parsePreview ? (
                  <button
                    type="button"
                    onClick={handlePreviewTxt}
                    disabled={!rawTxt.trim()}
                    className="px-4 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg disabled:opacity-50"
                  >
                    Pré-visualizar Lista
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleExecuteBulkImport}
                    className="px-4 py-1.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-xs"
                  >
                    Confirmar Importação de {parsePreview.count} Condomínios
                  </button>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: SINGLE CONDO */}
          {activeTab === 'single' && (
            <form onSubmit={handleSingleSubmit} className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nome do Condomínio:</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Residencial Solar das Palmeiras"
                  value={singleName}
                  onChange={(e) => setSingleName(e.target.value)}
                  className="w-full p-2 rounded-lg border border-slate-300 bg-white text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Unidade Consumidora / Matrícula (UC):</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: 9872134 (Celesc)"
                  value={singleUc}
                  onChange={(e) => setSingleUc(e.target.value)}
                  className="w-full p-2 rounded-lg border border-slate-300 bg-white font-mono text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Observações:</label>
                <input
                  type="text"
                  placeholder="Opcional"
                  value={singleNotes}
                  onChange={(e) => setSingleNotes(e.target.value)}
                  className="w-full p-2 rounded-lg border border-slate-300 bg-white text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setActiveTab('list')}
                  className="px-3 py-1.5 text-xs text-slate-600 bg-white border border-slate-300 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold text-white bg-slate-900 rounded-lg hover:bg-slate-800"
                >
                  Salvar Condomínio
                </button>
              </div>
            </form>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg transition-colors"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
};
