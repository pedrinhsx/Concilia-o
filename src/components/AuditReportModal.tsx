import React, { useState, useEffect } from 'react';
import { FinancialSummary, ReconciledRecord, AnomalyInsight } from '../types/reconciliation';
import { X, Sparkles, Copy, Check, Printer, RefreshCw, FileText } from 'lucide-react';

interface AuditReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  summary: FinancialSummary;
  records: ReconciledRecord[];
  insights: AnomalyInsight[];
}

export const AuditReportModal: React.FC<AuditReportModalProps> = ({
  isOpen,
  onClose,
  summary,
  records,
  insights
}) => {
  const [reportText, setReportText] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  const fetchAuditReport = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/audit-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          summary,
          recordsSample: records.slice(0, 15).map(r => ({
            fornecedor: r.provider,
            condominio: r.condoName,
            uc: r.installationCode,
            utilidade: r.utilityType,
            competencia: r.competence,
            vencimento: r.dueDate,
            fatura_xlsx: r.billedAmount,
            lancamento_erp: r.ledgerAmount,
            diferenca: r.difference,
            status: r.reconciliationStatus
          })),
          insights
        })
      });

      if (!response.ok) {
        throw new Error('Falha na comunicação com o serviço de auditoria.');
      }

      const data = await response.json();
      setReportText(data.parecer || 'Não foi possível gerar o parecer.');
    } catch (err: any) {
      console.error(err);
      // Fallback local report
      setReportText(`### Parecer de Auditoria Financeira de Utilidades
- **Data da Auditoria:** ${new Date().toLocaleDateString('pt-BR')}
- **Total Faturado Concessionárias:** R$ ${summary.totalBilled.toFixed(2)}
- **Total Registrado no ERP:** R$ ${summary.totalLedger.toFixed(2)}
- **Índice de Conciliação:** ${summary.reconciliationRate}%
- **Divergências Identificadas:** R$ ${summary.totalDiscrepancyAmount.toFixed(2)} (${summary.countDiscrepancies} faturas)

#### Recomendações Prioritárias:
1. Proceder com ajuste no Contas a Pagar para as contas com diferença de valor.
2. Contatar fornecedores em faturas pendentes de cobrança.
3. Inspecionar medidores com histórico de consumo atípico.`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchAuditReport();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(reportText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-purple-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 border border-purple-200 flex items-center justify-center text-purple-700">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Parecer de Auditoria Financeira & Inteligência
              </h2>
              <p className="text-xs text-slate-600">
                Análise analítica de conformidade, riscos fiscais e anomalias de consumo
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

        {/* Action bar */}
        <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-slate-500 font-medium">
            <FileText className="w-4 h-4 text-slate-400" />
            <span>Relatório formatado para diretoria e contabilidade</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchAuditReport}
              disabled={isLoading}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-slate-600 hover:text-slate-900 bg-white border border-slate-300 rounded hover:bg-slate-50 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Atualizar</span>
            </button>
            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copiado!' : 'Copiar Texto'}</span>
            </button>
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir / PDF</span>
            </button>
          </div>
        </div>

        {/* Report Content Body */}
        <div className="p-5 sm:p-7 overflow-y-auto font-sans text-xs sm:text-sm text-slate-800 leading-relaxed bg-white">
          {isLoading ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-8 h-8 border-3 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs font-semibold text-slate-600">
                Processando conciliações e gerando parecer executivo...
              </p>
            </div>
          ) : (
            <div className="prose prose-slate max-w-none space-y-3 whitespace-pre-wrap">
              {reportText}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-2xs text-slate-500">
          <span>Sistema de Conciliação Financeira de Utilidades · Água, Luz e Internet</span>
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
