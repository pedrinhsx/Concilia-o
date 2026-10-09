import React, { useState } from 'react';
import { UtilityInstallation, UtilityType } from '../types/reconciliation';
import { X, Plus, Trash2, Building2, Zap, Droplets, Wifi, Shield } from 'lucide-react';

interface InstallationsManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  installations: UtilityInstallation[];
  onSaveInstallation: (inst: UtilityInstallation) => void;
  onDeleteInstallation: (id: string) => void;
}

export const InstallationsManagerModal: React.FC<InstallationsManagerModalProps> = ({
  isOpen,
  onClose,
  installations,
  onSaveInstallation,
  onDeleteInstallation
}) => {
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [utilityType, setUtilityType] = useState<UtilityType>('luz');
  const [provider, setProvider] = useState('');
  const [code, setCode] = useState('');
  const [unitName, setUnitName] = useState('');
  const [nickname, setNickname] = useState('');
  const [baselineCost, setBaselineCost] = useState('');

  if (!isOpen) return null;

  const handleAddNew = (e: React.FormEvent) => {
    e.preventDefault();
    if (!provider || !code || !unitName) return;

    const newInst: UtilityInstallation = {
      id: `inst-${Date.now()}`,
      utilityType,
      provider,
      code,
      unitName,
      nickname: nickname || `${provider} - ${unitName}`,
      baselineCost: baselineCost ? parseFloat(baselineCost.replace(',', '.')) : undefined,
      autoReconcileTolerance: 0.05
    };

    onSaveInstallation(newInst);
    setIsAddingNew(false);
    setProvider('');
    setCode('');
    setUnitName('');
    setNickname('');
    setBaselineCost('');
  };

  const getUtilityBadge = (type: UtilityType) => {
    switch (type) {
      case 'luz':
        return (
          <span className="flex items-center gap-1 text-2xs font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
            <Zap className="w-3 h-3 text-amber-600" /> Luz
          </span>
        );
      case 'agua':
        return (
          <span className="flex items-center gap-1 text-2xs font-semibold text-cyan-700 bg-cyan-50 px-1.5 py-0.5 rounded">
            <Droplets className="w-3 h-3 text-cyan-600" /> Água
          </span>
        );
      case 'internet':
        return (
          <span className="flex items-center gap-1 text-2xs font-semibold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded">
            <Wifi className="w-3 h-3 text-indigo-600" /> Internet
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-800">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Instalações & Contratos Cadastrados
              </h2>
              <p className="text-xs text-slate-500">
                Gerencie os códigos de ligação e parâmetros de conciliação automática
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
          
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700">
              {installations.length} conta(s) / hidrômetros / contratos monitorados
            </span>
            {!isAddingNew && (
              <button
                type="button"
                onClick={() => setIsAddingNew(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Nova Instalação</span>
              </button>
            )}
          </div>

          {/* Form to add new */}
          {isAddingNew && (
            <form onSubmit={handleAddNew} className="p-4 rounded-xl border border-slate-300 bg-slate-50/70 space-y-3">
              <h3 className="font-bold text-slate-900 text-xs">Cadastrar Novo Código de Utilidade</h3>
              
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setUtilityType('luz')}
                  className={`p-2 rounded font-semibold text-center border ${utilityType === 'luz' ? 'bg-amber-100 border-amber-400 text-amber-900' : 'bg-white border-slate-200'}`}
                >
                  ⚡ Luz
                </button>
                <button
                  type="button"
                  onClick={() => setUtilityType('agua')}
                  className={`p-2 rounded font-semibold text-center border ${utilityType === 'agua' ? 'bg-cyan-100 border-cyan-400 text-cyan-900' : 'bg-white border-slate-200'}`}
                >
                  💧 Água
                </button>
                <button
                  type="button"
                  onClick={() => setUtilityType('internet')}
                  className={`p-2 rounded font-semibold text-center border ${utilityType === 'internet' ? 'bg-indigo-100 border-indigo-400 text-indigo-900' : 'bg-white border-slate-200'}`}
                >
                  🌐 Internet
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-2xs font-bold text-slate-600 mb-0.5">Concessionária:</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Enel, Sabesp, Vivo..."
                    value={provider}
                    onChange={(e) => setProvider(e.target.value)}
                    className="w-full p-2 rounded border border-slate-300 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-2xs font-bold text-slate-600 mb-0.5">Cód. Instalação / Matrícula:</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: 004928104"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full p-2 rounded border border-slate-300 bg-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-2xs font-bold text-slate-600 mb-0.5">Unidade / Centro Custo:</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Sede Matriz, Filial..."
                    value={unitName}
                    onChange={(e) => setUnitName(e.target.value)}
                    className="w-full p-2 rounded border border-slate-300 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-2xs font-bold text-slate-600 mb-0.5">Custo Estimado Base (R$):</label>
                  <input
                    type="text"
                    placeholder="Ex: 3500.00"
                    value={baselineCost}
                    onChange={(e) => setBaselineCost(e.target.value)}
                    className="w-full p-2 rounded border border-slate-300 bg-white font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsAddingNew(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 bg-white border border-slate-300 rounded"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 text-xs font-bold text-white bg-slate-900 rounded"
                >
                  Salvar Instalação
                </button>
              </div>
            </form>
          )}

          {/* List of Installations */}
          <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white">
            {installations.map((inst) => (
              <div key={inst.id} className="p-3.5 flex items-center justify-between hover:bg-slate-50 transition-colors">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    {getUtilityBadge(inst.utilityType)}
                    <span className="font-bold text-slate-900">{inst.provider}</span>
                    <span className="text-slate-400 font-mono text-2xs">({inst.code})</span>
                  </div>
                  <p className="text-slate-600 text-2xs flex items-center gap-1.5">
                    <span>{inst.unitName}</span>
                    {inst.nickname && <span className="text-slate-400">· {inst.nickname}</span>}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  {inst.baselineCost && (
                    <span className="text-2xs font-mono font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                      Média: R$ {inst.baselineCost.toFixed(2)}
                    </span>
                  )}
                  <button
                    onClick={() => onDeleteInstallation(inst.id)}
                    title="Remover instalação cadastrada"
                    className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg transition-colors"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
};
