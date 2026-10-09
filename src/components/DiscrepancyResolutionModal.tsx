import React, { useState } from 'react';
import { ReconciledRecord } from '../types/reconciliation';
import { X, CheckCircle2, AlertTriangle, ArrowRight, ShieldCheck, Scale, FileEdit } from 'lucide-react';

interface DiscrepancyResolutionModalProps {
  record: ReconciledRecord | null;
  onClose: () => void;
  onResolve: (recordId: string, resolutionType: 'adjust_ledger' | 'contest' | 'accept_variance', note: string) => void;
}

export const DiscrepancyResolutionModal: React.FC<DiscrepancyResolutionModalProps> = ({
  record,
  onClose,
  onResolve
}) => {
  const [resolutionNote, setResolutionNote] = useState('');
  const [selectedAction, setSelectedAction] = useState<'adjust_ledger' | 'contest' | 'accept_variance'>('adjust_ledger');

  if (!record) return null;

  const formatBRL = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const handleConfirm = () => {
    onResolve(record.id, selectedAction, resolutionNote);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-xl w-full flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-amber-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-800">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Resolução de Divergência Financeira
              </h2>
              <p className="text-xs text-slate-600">
                {record.provider} · Competência {record.competence} · {record.unitName}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 rounded-lg hover:bg-white text-slate-400 hover:text-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Comparison Details */}
        <div className="p-4 sm:p-6 space-y-5">
          
          {/* Side by side comparison cards */}
          <div className="grid grid-cols-2 gap-3.5">
            <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50">
              <span className="text-2xs font-bold uppercase tracking-wider text-slate-500">
                Fatura da Concessionária (.xlsx)
              </span>
              <div className="text-xl font-extrabold text-slate-900 mt-1 font-mono">
                {formatBRL(record.billedAmount)}
              </div>
              <p className="text-2xs text-slate-500 mt-1">
                {record.bill?.invoiceNumber ? `Doc: ${record.bill.invoiceNumber}` : 'Documento faturado'}
              </p>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50">
              <span className="text-2xs font-bold uppercase tracking-wider text-slate-500">
                Lançamento Contas a Pagar (ERP)
              </span>
              <div className="text-xl font-extrabold text-slate-900 mt-1 font-mono">
                {formatBRL(record.ledgerAmount)}
              </div>
              <p className="text-2xs text-slate-500 mt-1">
                {record.ledger?.paymentAccount || 'Registro de previsão'}
              </p>
            </div>
          </div>

          {/* Variance Highlight */}
          <div className="p-3 rounded-lg border border-amber-200 bg-amber-50 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span className="font-semibold text-amber-900">
                Diferença Apurada:
              </span>
            </div>
            <span className="text-sm font-bold font-mono text-amber-900">
              {record.difference > 0 ? '+' : ''}{formatBRL(record.difference)}
            </span>
          </div>

          {/* Action Choice */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-800">
              Selecione o Procedimento de Conciliação:
            </label>
            <div className="space-y-2">
              <label 
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                  selectedAction === 'adjust_ledger' 
                    ? 'border-slate-900 bg-slate-50 ring-1 ring-slate-900' 
                    : 'border-slate-200 hover:bg-slate-50/50'
                }`}
              >
                <input
                  type="radio"
                  name="action"
                  checked={selectedAction === 'adjust_ledger'}
                  onChange={() => setSelectedAction('adjust_ledger')}
                  className="mt-1"
                />
                <div>
                  <strong className="text-xs text-slate-900 block">
                    Equiparar Lançamento no ERP ao Valor da Fatura
                  </strong>
                  <span className="text-2xs text-slate-500 block mt-0.5">
                    Atualiza o lançamento financeiro para {formatBRL(record.billedAmount)}, quitando a divergência com 100% de conciliação.
                  </span>
                </div>
              </label>

              <label 
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                  selectedAction === 'contest' 
                    ? 'border-slate-900 bg-slate-50 ring-1 ring-slate-900' 
                    : 'border-slate-200 hover:bg-slate-50/50'
                }`}
              >
                <input
                  type="radio"
                  name="action"
                  checked={selectedAction === 'contest'}
                  onChange={() => setSelectedAction('contest')}
                  className="mt-1"
                />
                <div>
                  <strong className="text-xs text-slate-900 block">
                    Registrar Contestação Administrativa com a Concessionária
                  </strong>
                  <span className="text-2xs text-slate-500 block mt-0.5">
                    Mantém o status de divergência e registra ocorrência para pleitear estorno ou revisão da tarifa/leitura.
                  </span>
                </div>
              </label>

              <label 
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                  selectedAction === 'accept_variance' 
                    ? 'border-slate-900 bg-slate-50 ring-1 ring-slate-900' 
                    : 'border-slate-200 hover:bg-slate-50/50'
                }`}
              >
                <input
                  type="radio"
                  name="action"
                  checked={selectedAction === 'accept_variance'}
                  onChange={() => setSelectedAction('accept_variance')}
                  className="mt-1"
                />
                <div>
                  <strong className="text-xs text-slate-900 block">
                    Aceitar Diferença com Justificativa Contábil
                  </strong>
                  <span className="text-2xs text-slate-500 block mt-0.5">
                    Marca como auditado com justificativa (ex: bandeira tarifária amarela, variação cambial, juros de atraso bancário).
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* Notes textarea */}
          <div className="space-y-1">
            <label className="text-2xs font-bold uppercase tracking-wider text-slate-500">
              Observações / Protocolo da Auditoria:
            </label>
            <textarea
              rows={2}
              value={resolutionNote}
              onChange={(e) => setResolutionNote(e.target.value)}
              placeholder="Ex: Protocolo de atendimento nº 4029193 ou aprovado reajuste anual de contrato."
              className="w-full p-2.5 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg transition-colors"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-all shadow-sm"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Confirmar Resolução</span>
          </button>
        </div>

      </div>
    </div>
  );
};
