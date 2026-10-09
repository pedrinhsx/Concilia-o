import React, { useState } from 'react';
import { UtilityType, TariffFlag, UtilityBill, LedgerEntry, UtilityInstallation } from '../types/reconciliation';
import { X, Plus, Receipt, Zap, Droplets, Wifi, Building2 } from 'lucide-react';

interface ManualEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  installations: UtilityInstallation[];
  onAddBill: (bill: UtilityBill) => void;
  onAddLedger: (ledger: LedgerEntry) => void;
}

export const ManualEntryModal: React.FC<ManualEntryModalProps> = ({
  isOpen,
  onClose,
  installations,
  onAddBill,
  onAddLedger
}) => {
  const [entryMode, setEntryMode] = useState<'both' | 'bill_only' | 'ledger_only'>('both');
  const [utilityType, setUtilityType] = useState<UtilityType>('luz');
  const [provider, setProvider] = useState('Enel Distribuição SP');
  const [installationCode, setInstallationCode] = useState('004928104');
  const [unitName, setUnitName] = useState('Sede Matriz - Av. Paulista');
  const [competence, setCompetence] = useState('2024-04');
  const [dueDate, setDueDate] = useState('2024-05-15');
  const [billedAmount, setBilledAmount] = useState('3450.00');
  const [ledgerAmount, setLedgerAmount] = useState('3450.00');
  const [consumptionValue, setConsumptionValue] = useState('4800');
  const [tariffFlag, setTariffFlag] = useState<TariffFlag>('verde');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  const handleInstallationSelect = (instId: string) => {
    const inst = installations.find(i => i.id === instId);
    if (inst) {
      setUtilityType(inst.utilityType);
      setProvider(inst.provider);
      setInstallationCode(inst.code);
      setUnitName(inst.unitName);
      if (inst.baselineCost) {
        setBilledAmount(inst.baselineCost.toString());
        setLedgerAmount(inst.baselineCost.toString());
      }
      if (inst.averageConsumption) {
        setConsumptionValue(inst.averageConsumption.toString());
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const billedNum = parseFloat(billedAmount.replace(',', '.')) || 0;
    const ledgerNum = parseFloat(ledgerAmount.replace(',', '.')) || 0;
    const consumptionNum = consumptionValue ? parseFloat(consumptionValue.replace(',', '.')) : undefined;

    const baseId = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    if (entryMode === 'both' || entryMode === 'bill_only') {
      const newBill: UtilityBill = {
        id: `bill-manual-${baseId}`,
        utilityType,
        provider,
        installationCode,
        unitName,
        competence,
        dueDate,
        billedAmount: billedNum,
        consumptionValue: consumptionNum,
        consumptionUnit: utilityType === 'luz' ? 'kWh' : utilityType === 'agua' ? 'm³' : 'Mbps',
        tariffFlag: utilityType === 'luz' ? tariffFlag : 'n_a',
        invoiceNumber: invoiceNumber || `MAN-${competence.replace('-', '')}`,
        status: 'aberto',
        notes: notes || 'Lançado manualmente no painel de controle'
      };
      onAddBill(newBill);
    }

    if (entryMode === 'both' || entryMode === 'ledger_only') {
      const newLedger: LedgerEntry = {
        id: `led-manual-${baseId}`,
        utilityType,
        provider,
        installationCode,
        unitName,
        competence,
        expectedDate: dueDate,
        actualPaymentDate: dueDate,
        ledgerAmount: entryMode === 'both' ? billedNum : ledgerNum,
        paymentAccount: 'Banco Itaú Empresas (C/C 40291-3)',
        documentNumber: invoiceNumber || `LANÇ-${competence.replace('-', '')}`,
        status: 'liquidado',
        notes: notes || 'Lançado no Contas a Pagar'
      };
      onAddLedger(newLedger);
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-800">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Novo Lançamento de Utilidade
              </h2>
              <p className="text-xs text-slate-500">
                Inserir fatura ou previsão manual de água, luz ou internet
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

          {/* Quick Preload from Registered Installations */}
          {installations.length > 0 && (
            <div className="space-y-1">
              <label className="text-2xs font-bold uppercase tracking-wider text-slate-500">
                Vincular a uma Instalação Cadastrada:
              </label>
              <select
                onChange={(e) => handleInstallationSelect(e.target.value)}
                className="w-full p-2 rounded-lg border border-slate-300 bg-white text-slate-800"
              >
                <option value="">-- Selecione para preenchimento rápido --</option>
                {installations.map(inst => (
                  <option key={inst.id} value={inst.id}>
                    [{inst.utilityType.toUpperCase()}] {inst.provider} · {inst.unitName} (Cód: {inst.code})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Utility Type radio */}
          <div className="space-y-1">
            <label className="text-2xs font-bold uppercase tracking-wider text-slate-500">
              Modalidade de Utilidade:
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setUtilityType('luz')}
                className={`flex items-center justify-center gap-1.5 p-2 rounded-lg border font-semibold ${
                  utilityType === 'luz' ? 'border-amber-500 bg-amber-50 text-amber-900' : 'border-slate-200 bg-white text-slate-600'
                }`}
              >
                <Zap className="w-3.5 h-3.5 text-amber-600" />
                Luz (Energia)
              </button>
              <button
                type="button"
                onClick={() => setUtilityType('agua')}
                className={`flex items-center justify-center gap-1.5 p-2 rounded-lg border font-semibold ${
                  utilityType === 'agua' ? 'border-cyan-500 bg-cyan-50 text-cyan-900' : 'border-slate-200 bg-white text-slate-600'
                }`}
              >
                <Droplets className="w-3.5 h-3.5 text-cyan-600" />
                Água & Saneamento
              </button>
              <button
                type="button"
                onClick={() => setUtilityType('internet')}
                className={`flex items-center justify-center gap-1.5 p-2 rounded-lg border font-semibold ${
                  utilityType === 'internet' ? 'border-indigo-500 bg-indigo-50 text-indigo-900' : 'border-slate-200 bg-white text-slate-600'
                }`}
              >
                <Wifi className="w-3.5 h-3.5 text-indigo-600" />
                Internet & Dados
              </button>
            </div>
          </div>

          {/* Provider and Code */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Concessionária / Fornecedor:</label>
              <input
                type="text"
                required
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                placeholder="Ex: Enel, Sabesp, Vivo..."
                className="w-full p-2 rounded-lg border border-slate-300"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Cód. Instalação / Matrícula:</label>
              <input
                type="text"
                required
                value={installationCode}
                onChange={(e) => setInstallationCode(e.target.value)}
                placeholder="Ex: 004928104"
                className="w-full p-2 rounded-lg border border-slate-300 font-mono"
              />
            </div>
          </div>

          {/* Unit Name & Competence */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Unidade / Centro de Custo:</label>
              <input
                type="text"
                required
                value={unitName}
                onChange={(e) => setUnitName(e.target.value)}
                placeholder="Ex: Sede Matriz, Filial..."
                className="w-full p-2 rounded-lg border border-slate-300"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Competência (AAAA-MM):</label>
              <input
                type="text"
                required
                value={competence}
                onChange={(e) => setCompetence(e.target.value)}
                placeholder="2024-04"
                className="w-full p-2 rounded-lg border border-slate-300 font-mono"
              />
            </div>
          </div>

          {/* Due date & Values */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Data de Vencimento:</label>
              <input
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full p-2 rounded-lg border border-slate-300"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Valor da Fatura (R$):</label>
              <input
                type="text"
                required
                value={billedAmount}
                onChange={(e) => setBilledAmount(e.target.value)}
                placeholder="0.00"
                className="w-full p-2 rounded-lg border border-slate-300 font-mono font-bold"
              />
            </div>
          </div>

          {/* Consumption and Tariff Flag */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Consumo ({utilityType === 'luz' ? 'kWh' : utilityType === 'agua' ? 'm³' : 'Mbps'}):
              </label>
              <input
                type="text"
                value={consumptionValue}
                onChange={(e) => setConsumptionValue(e.target.value)}
                placeholder="0"
                className="w-full p-2 rounded-lg border border-slate-300 font-mono"
              />
            </div>
            {utilityType === 'luz' ? (
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Bandeira Tarifária:</label>
                <select
                  value={tariffFlag}
                  onChange={(e) => setTariffFlag(e.target.value as any)}
                  className="w-full p-2 rounded-lg border border-slate-300 bg-white"
                >
                  <option value="verde">Verde (Sem acréscimo)</option>
                  <option value="amarela">Amarela</option>
                  <option value="vermelha_1">Vermelha Patamar 1</option>
                  <option value="vermelha_2">Vermelha Patamar 2</option>
                  <option value="escassez_hidrica">Escassez Hídrica</option>
                </select>
              </div>
            ) : (
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nº Nota Fiscal / Fatura:</label>
                <input
                  type="text"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  placeholder="FAT-0124"
                  className="w-full p-2 rounded-lg border border-slate-300 font-mono"
                />
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Observações:</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Fatura retificada pela distribuidora"
              className="w-full p-2 rounded-lg border border-slate-300"
            />
          </div>

          {/* Footer Submit */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-all shadow-sm"
            >
              Salvar Lançamento
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
