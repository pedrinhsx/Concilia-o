import React, { useState } from 'react';
import { FixedProvider, UtilityType } from '../types/reconciliation';
import { X, Plus, Trash2, Tag, Zap, Droplets, Wifi } from 'lucide-react';

interface FixedProvidersModalProps {
  isOpen: boolean;
  onClose: () => void;
  providers: FixedProvider[];
  onAddProvider: (provider: FixedProvider) => void;
  onDeleteProvider: (id: string) => void;
}

export const FixedProvidersModal: React.FC<FixedProvidersModalProps> = ({
  isOpen,
  onClose,
  providers,
  onAddProvider,
  onDeleteProvider
}) => {
  const [name, setName] = useState('');
  const [utilityType, setUtilityType] = useState<UtilityType>('luz');
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newProvider: FixedProvider = {
      id: `prov-${Date.now()}`,
      name: name.trim(),
      utilityType,
      notes: notes.trim()
    };

    onAddProvider(newProvider);
    setName('');
    setNotes('');
  };

  const getUtilityBadge = (type: UtilityType) => {
    switch (type) {
      case 'luz':
        return (
          <span className="flex items-center gap-1 text-2xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
            <Zap className="w-3 h-3 text-amber-600" /> Luz (Energia)
          </span>
        );
      case 'agua':
        return (
          <span className="flex items-center gap-1 text-2xs font-bold text-cyan-700 bg-cyan-50 px-2 py-0.5 rounded">
            <Droplets className="w-3 h-3 text-cyan-600" /> Água e Esgoto
          </span>
        );
      case 'internet':
        return (
          <span className="flex items-center gap-1 text-2xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
            <Wifi className="w-3 h-3 text-indigo-600" /> Internet & Telecom
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60">
      <div className="bg-white rounded-2xl max-w-xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-800">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Fornecedores Fixos das Contas
              </h2>
              <p className="text-xs text-slate-500">
                Concessionárias e provedores habituais (Celesc, Casan, Vivo, Claro, etc.)
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

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs">
          
          {/* Add form */}
          <form onSubmit={handleSubmit} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3">
            <h3 className="font-bold text-slate-900 text-xs">Cadastrar Fornecedor Fixo</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-2xs font-bold text-slate-600 mb-1">Nome do Fornecedor:</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Celesc Distribuição"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-2 rounded-lg border border-slate-300 bg-white"
                />
              </div>

              <div>
                <label className="block text-2xs font-bold text-slate-600 mb-1">Modalidade:</label>
                <select
                  value={utilityType}
                  onChange={(e) => setUtilityType(e.target.value as any)}
                  className="w-full p-2 rounded-lg border border-slate-300 bg-white"
                >
                  <option value="luz">⚡ Energia Elétrica (Luz)</option>
                  <option value="agua">💧 Água e Saneamento</option>
                  <option value="internet">🌐 Internet & Telecomunicações</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                className="px-4 py-1.5 text-xs font-bold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors"
              >
                + Adicionar Fornecedor
              </button>
            </div>
          </form>

          {/* List */}
          <div className="space-y-2">
            <h4 className="text-2xs font-bold uppercase tracking-wider text-slate-500">
              Fornecedores Cadastrados ({providers.length})
            </h4>

            <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white max-h-60 overflow-y-auto">
              {providers.length === 0 ? (
                <div className="p-6 text-center text-slate-400">
                  Nenhum fornecedor fixo cadastrado.
                </div>
              ) : (
                providers.map((p) => (
                  <div key={p.id} className="p-3 flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-2.5">
                      <strong className="text-slate-900 text-xs">{p.name}</strong>
                      {getUtilityBadge(p.utilityType)}
                    </div>
                    <button
                      onClick={() => onDeleteProvider(p.id)}
                      className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                      title="Excluir fornecedor"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
};
