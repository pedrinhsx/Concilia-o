import React, { useState, useRef, useEffect } from 'react';
import { UtilityType, UtilityBill, LedgerEntry, Condominium, FixedProvider } from '../types/reconciliation';
import { findSimilarCondominiums } from '../utils/condoImportHelper';
import { X, Plus, Zap, Droplets, Wifi, Building2, Check, Sparkles } from 'lucide-react';

interface ManualEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  condos: Condominium[];
  fixedProviders: FixedProvider[];
  onAddBill: (bill: UtilityBill) => void;
  onAddLedger: (ledger: LedgerEntry) => void;
  onAddCondo?: (condo: Condominium) => void;
}

export const ManualEntryModal: React.FC<ManualEntryModalProps> = ({
  isOpen,
  onClose,
  condos,
  fixedProviders,
  onAddBill,
  onAddLedger,
  onAddCondo
}) => {
  const [entryMode, setEntryMode] = useState<'both' | 'bill_only' | 'ledger_only'>('both');
  const [utilityType, setUtilityType] = useState<UtilityType>('luz');
  const [condoName, setCondoName] = useState('');
  const [installationCode, setInstallationCode] = useState(''); // UC / Matrícula
  const [provider, setProvider] = useState('Celesc Distribuição');
  const [competence, setCompetence] = useState('2024-04');
  const [dueDate, setDueDate] = useState('2024-05-15');
  const [billedAmount, setBilledAmount] = useState('');
  const [ledgerAmount, setLedgerAmount] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [notes, setNotes] = useState('');

  // Autocomplete suggestions state
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<Condominium[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (condoName.trim().length > 0) {
      const matches = findSimilarCondominiums(condoName, condos);
      setSuggestions(matches);
    } else {
      setSuggestions([]);
    }
  }, [condoName, condos]);

  if (!isOpen) return null;

  const handleSelectSuggestion = (c: Condominium) => {
    setCondoName(c.name);
    if (c.uc) {
      setInstallationCode(c.uc);
    }
    setShowSuggestions(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const billedNum = parseFloat(billedAmount.replace(',', '.')) || 0;
    const ledgerNum = parseFloat(ledgerAmount.replace(',', '.')) || billedNum;

    const baseId = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const finalCondoName = condoName.trim();
    const finalUc = installationCode.trim() || 'UC-000';

    // Auto add condo to list if new
    if (onAddCondo && !condos.some(c => c.name.toLowerCase() === finalCondoName.toLowerCase())) {
      onAddCondo({
        id: `condo-${baseId}`,
        name: finalCondoName,
        uc: finalUc
      });
    }

    if (entryMode === 'both' || entryMode === 'bill_only') {
      const newBill: UtilityBill = {
        id: `bill-manual-${baseId}`,
        utilityType,
        provider,
        installationCode: finalUc,
        condoName: finalCondoName,
        competence,
        dueDate,
        billedAmount: billedNum,
        invoiceNumber: invoiceNumber || `FAT-${competence.replace('-', '')}`,
        status: 'aberto',
        notes: notes || 'Lançado manualmente no painel'
      };
      onAddBill(newBill);
    }

    if (entryMode === 'both' || entryMode === 'ledger_only') {
      const newLedger: LedgerEntry = {
        id: `led-manual-${baseId}`,
        utilityType,
        provider,
        installationCode: finalUc,
        condoName: finalCondoName,
        competence,
        expectedDate: dueDate,
        actualPaymentDate: dueDate,
        ledgerAmount: entryMode === 'both' ? billedNum : ledgerNum,
        paymentAccount: 'Conta Corrente Condomínio',
        documentNumber: invoiceNumber || `LANÇ-${competence.replace('-', '')}`,
        status: 'liquidado',
        notes: notes || 'Lançado no Contas a Pagar'
      };
      onAddLedger(newLedger);
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60">
      <div className="bg-white rounded-2xl max-w-xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-800">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Novo Lançamento de Conta
              </h2>
              <p className="text-xs text-slate-500">
                Lançamento manual com sugestão de condomínios cadastrados
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs">
          
          {/* Mode Selector */}
          <div className="space-y-1">
            <label className="text-2xs font-bold uppercase tracking-wider text-slate-500">
              Tipo de Registro:
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setEntryMode('both')}
                className={`p-2 rounded-lg border text-center font-semibold transition-colors ${
                  entryMode === 'both' 
                    ? 'border-slate-900 bg-slate-900 text-white' 
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                Fatura + ERP (Conciliado)
              </button>
              <button
                type="button"
                onClick={() => setEntryMode('bill_only')}
                className={`p-2 rounded-lg border text-center font-semibold transition-colors ${
                  entryMode === 'bill_only' 
                    ? 'border-slate-900 bg-slate-900 text-white' 
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                Somente Fatura .xlsx
              </button>
              <button
                type="button"
                onClick={() => setEntryMode('ledger_only')}
                className={`p-2 rounded-lg border text-center font-semibold transition-colors ${
                  entryMode === 'ledger_only' 
                    ? 'border-slate-900 bg-slate-900 text-white' 
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                Somente Lançamento ERP
              </button>
            </div>
          </div>

          {/* Utility Type radio */}
          <div className="space-y-1">
            <label className="text-2xs font-bold uppercase tracking-wider text-slate-500">
              Modalidade:
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  setUtilityType('luz');
                  setProvider('Celesc Distribuição');
                }}
                className={`flex items-center justify-center gap-1.5 p-2 rounded-lg border font-semibold ${
                  utilityType === 'luz' ? 'border-amber-500 bg-amber-50 text-amber-900' : 'border-slate-200 bg-white text-slate-600'
                }`}
              >
                <Zap className="w-3.5 h-3.5 text-amber-600" />
                Luz (Celesc)
              </button>
              <button
                type="button"
                onClick={() => {
                  setUtilityType('agua');
                  setProvider('Casan');
                }}
                className={`flex items-center justify-center gap-1.5 p-2 rounded-lg border font-semibold ${
                  utilityType === 'agua' ? 'border-cyan-500 bg-cyan-50 text-cyan-900' : 'border-slate-200 bg-white text-slate-600'
                }`}
              >
                <Droplets className="w-3.5 h-3.5 text-cyan-600" />
                Água (Casan)
              </button>
              <button
                type="button"
                onClick={() => {
                  setUtilityType('internet');
                  setProvider('Vivo Fibra');
                }}
                className={`flex items-center justify-center gap-1.5 p-2 rounded-lg border font-semibold ${
                  utilityType === 'internet' ? 'border-indigo-500 bg-indigo-50 text-indigo-900' : 'border-slate-200 bg-white text-slate-600'
                }`}
              >
                <Wifi className="w-3.5 h-3.5 text-indigo-600" />
                Internet & Telecom
              </button>
            </div>
          </div>

          {/* Condominium with Smart Suggestion / Autocomplete */}
          <div className="relative" ref={dropdownRef}>
            <label className="block font-semibold text-slate-700 mb-1 flex items-center justify-between">
              <span>Nome do Condomínio:</span>
              <span className="text-2xs font-normal text-slate-500">
                Digite para buscar ou criar
              </span>
            </label>
            <div className="relative">
              <Building2 className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                required
                placeholder="Ex: Residencial Solar das Palmeiras..."
                value={condoName}
                onChange={(e) => {
                  setCondoName(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
            </div>

            {/* Suggestions Dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-20 max-h-48 overflow-y-auto divide-y divide-slate-100">
                <div className="px-3 py-1.5 bg-slate-50 text-2xs font-bold uppercase text-slate-500 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-500" />
                  <span>Condomínios parecidos sugeridos:</span>
                </div>
                {suggestions.map((s) => (
                  <div
                    key={s.id}
                    onClick={() => handleSelectSuggestion(s)}
                    className="p-2.5 px-3 hover:bg-amber-50/70 cursor-pointer flex items-center justify-between transition-colors"
                  >
                    <div>
                      <p className="font-bold text-slate-900 text-xs">{s.name}</p>
                      <p className="text-2xs text-slate-500 font-mono">UC: {s.uc}</p>
                    </div>
                    <span className="text-2xs font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                      Usar este
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* UC / Matrícula & Fornecedor */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Unidade Consumidora / Matrícula (UC):
              </label>
              <input
                type="text"
                required
                value={installationCode}
                onChange={(e) => setInstallationCode(e.target.value)}
                placeholder="Ex: 9872134 (Celesc)"
                className="w-full p-2 rounded-lg border border-slate-300 font-mono text-xs"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Fornecedor:</label>
              <input
                type="text"
                required
                list="providers-list"
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                placeholder="Ex: Celesc, Casan, Vivo..."
                className="w-full p-2 rounded-lg border border-slate-300 text-xs"
              />
              <datalist id="providers-list">
                {fixedProviders.map(p => (
                  <option key={p.id} value={p.name}>{p.name}</option>
                ))}
                <option value="Celesc Distribuição" />
                <option value="Casan" />
                <option value="Vivo Fibra" />
                <option value="Claro Telecom" />
              </datalist>
            </div>
          </div>

          {/* Competência & Vencimento */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Competência (AAAA-MM):</label>
              <input
                type="text"
                required
                value={competence}
                onChange={(e) => setCompetence(e.target.value)}
                placeholder="2024-04"
                className="w-full p-2 rounded-lg border border-slate-300 font-mono text-xs"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Data de Vencimento:</label>
              <input
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full p-2 rounded-lg border border-slate-300 text-xs"
              />
            </div>
          </div>

          {/* Valor */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Valor da Fatura (R$):</label>
              <input
                type="text"
                required
                value={billedAmount}
                onChange={(e) => setBilledAmount(e.target.value)}
                placeholder="Ex: 1450.80"
                className="w-full p-2 rounded-lg border border-slate-300 font-mono font-bold text-xs"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Nº Fatura / Documento:</label>
              <input
                type="text"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder="FAT-0124"
                className="w-full p-2 rounded-lg border border-slate-300 font-mono text-xs"
              />
            </div>
          </div>

          {/* Observações */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Observações:</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Opcional"
              className="w-full p-2 rounded-lg border border-slate-300 text-xs"
            />
          </div>

          {/* Footer Submit */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-1.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-all shadow-sm"
            >
              Salvar Lançamento
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
