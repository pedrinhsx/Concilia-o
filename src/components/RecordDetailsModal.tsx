import React from 'react';
import { ReconciledRecord } from '../types/reconciliation';
import { X, CheckCircle2, AlertTriangle, FileSpreadsheet, Building2, Calendar, Zap, Droplets, Wifi, Clock, FileText } from 'lucide-react';

interface RecordDetailsModalProps {
  record: ReconciledRecord | null;
  onClose: () => void;
}

export const RecordDetailsModal: React.FC<RecordDetailsModalProps> = ({ record, onClose }) => {
  if (!record) return null;

  const formatBRL = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const getUtilityLabel = (type: string) => {
    if (type === 'luz') return 'Energia Elétrica (Luz)';
    if (type === 'agua') return 'Água e Saneamento';
    return 'Internet & Telecomunicações';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center">
              {record.utilityType === 'luz' && <Zap className="w-5 h-5 text-amber-400" />}
              {record.utilityType === 'agua' && <Droplets className="w-5 h-5 text-cyan-400" />}
              {record.utilityType === 'internet' && <Wifi className="w-5 h-5 text-indigo-400" />}
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Ficha Completa da Fatura & Conciliação
              </h2>
              <p className="text-xs text-slate-500">
                {record.provider} · Código: {record.installationCode}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 text-xs">
          
          {/* Status Ribbon */}
          <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {record.reconciliationStatus === 'conciliado' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              )}
              <div>
                <span className="font-bold text-slate-900 block text-xs">
                  {record.reconciliationStatus === 'conciliado' ? 'Lançamento 100% Conciliado' : 'Divergência / Pendência Identificada'}
                </span>
                <span className="text-2xs text-slate-500">
                  {record.auditNotes || 'Valores auditados automaticamente pelo motor de conciliação.'}
                </span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-2xs uppercase tracking-wider text-slate-400 font-bold block">Diferença</span>
              <span className={`font-mono font-bold text-sm ${record.difference === 0 ? 'text-emerald-700' : 'text-amber-700'}`}>
                {record.difference > 0 ? '+' : ''}{formatBRL(record.difference)}
              </span>
            </div>
          </div>

          {/* Grid Information */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Dados do Relatório (.xlsx) */}
            <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2.5">
              <div className="flex items-center gap-1.5 text-slate-900 font-bold pb-2 border-b border-slate-100">
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>Dados da Fatura Concessionária (.xlsx)</span>
              </div>
              <div className="space-y-1.5 text-slate-600">
                <p className="flex justify-between">
                  <span className="text-slate-400">Fornecedor:</span>
                  <strong className="text-slate-800">{record.provider}</strong>
                </p>
                <p className="flex justify-between">
                  <span className="text-slate-400">Modalidade:</span>
                  <strong className="text-slate-800">{getUtilityLabel(record.utilityType)}</strong>
                </p>
                <p className="flex justify-between">
                  <span className="text-slate-400">Condomínio:</span>
                  <strong className="text-slate-800">{record.condoName}</strong>
                </p>
                <p className="flex justify-between">
                  <span className="text-slate-400">UC / Matrícula:</span>
                  <strong className="text-slate-800 font-mono">{record.installationCode}</strong>
                </p>
                <p className="flex justify-between">
                  <span className="text-slate-400">Competência:</span>
                  <strong className="text-slate-800 font-mono">{record.competence}</strong>
                </p>
                <p className="flex justify-between">
                  <span className="text-slate-400">Data Vencimento:</span>
                  <strong className="text-slate-800">{record.dueDate ? new Date(record.dueDate + 'T00:00:00').toLocaleDateString('pt-BR') : '-'}</strong>
                </p>
                <p className="flex justify-between">
                  <span className="text-slate-400">Nº Documento / NF:</span>
                  <strong className="text-slate-800 font-mono">{record.bill?.invoiceNumber || '-'}</strong>
                </p>
                <p className="flex justify-between pt-1 border-t border-slate-100 text-slate-900 font-bold">
                  <span>Valor Faturado:</span>
                  <span className="font-mono text-emerald-700 text-sm">{formatBRL(record.billedAmount)}</span>
                </p>
              </div>
            </div>

            {/* Dados do Lançamento no ERP */}
            <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2.5">
              <div className="flex items-center gap-1.5 text-slate-900 font-bold pb-2 border-b border-slate-100">
                <Building2 className="w-4 h-4 text-indigo-600" />
                <span>Lançamento Contas a Pagar (ERP)</span>
              </div>
              <div className="space-y-1.5 text-slate-600">
                <p className="flex justify-between">
                  <span className="text-slate-400">Conta de Débito:</span>
                  <strong className="text-slate-800">{record.ledger?.paymentAccount || 'Conta Corrente Padrão'}</strong>
                </p>
                <p className="flex justify-between">
                  <span className="text-slate-400">Documento Interno:</span>
                  <strong className="text-slate-800 font-mono">{record.ledger?.documentNumber || 'LANÇ-SISTEMA'}</strong>
                </p>
                <p className="flex justify-between">
                  <span className="text-slate-400">Status no ERP:</span>
                  <strong className="text-slate-800 capitalize">{record.ledger?.status || 'Não Registrado'}</strong>
                </p>
                <p className="flex justify-between">
                  <span className="text-slate-400">Data Efetiva da Baixa:</span>
                  <strong className="text-slate-800">{record.ledger?.actualPaymentDate || '-'}</strong>
                </p>
                <p className="flex justify-between">
                  <span className="text-slate-400">Provisionamento:</span>
                  <strong className="text-slate-800 font-mono">{record.competence}</strong>
                </p>
                <p className="flex justify-between pt-1 border-t border-slate-100 text-slate-900 font-bold">
                  <span>Valor no Financeiro:</span>
                  <span className="font-mono text-indigo-700 text-sm">{formatBRL(record.ledgerAmount)}</span>
                </p>
              </div>
            </div>

          </div>

          {/* Informações de Origem e Auditoria */}
          <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
            <span className="text-2xs font-bold uppercase tracking-wider text-slate-500 block">
              Origem dos Dados & Auditoria
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-400 block text-2xs">Arquivo Importado:</span>
                <strong className="text-slate-900 truncate block">
                  {record.bill?.importedFromFileName || 'Lançado no sistema'}
                </strong>
              </div>
              <div>
                <span className="text-slate-400 block text-2xs">Observações:</span>
                <span className="text-slate-700">
                  {record.auditNotes || record.bill?.notes || record.ledger?.notes || 'Sem observações adicionais.'}
                </span>
              </div>
            </div>
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
