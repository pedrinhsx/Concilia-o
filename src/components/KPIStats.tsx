import React from 'react';
import { 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Building2,
  FileSpreadsheet,
  AlertCircle
} from 'lucide-react';
import { FinancialSummary } from '../types/reconciliation';

interface KPIStatsProps {
  summary: FinancialSummary;
}

export const KPIStats: React.FC<KPIStatsProps> = ({ summary }) => {
  const formatCurrency = (val: number) => {
    return (val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3">
      
      {/* 1. Total Faturado */}
      <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
        <div className="flex items-center justify-between text-slate-500 mb-1.5">
          <span className="text-2xs font-bold uppercase tracking-wider text-slate-500">
            Total Faturado (.xlsx)
          </span>
          <FileSpreadsheet className="w-3.5 h-3.5 text-slate-400" />
        </div>
        <div className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 font-sans">
          {formatCurrency(summary.totalBilled)}
        </div>
        <div className="mt-1.5 flex items-center justify-between text-2xs text-slate-500 pt-1.5 border-t border-slate-100">
          <span>No ERP: {formatCurrency(summary.totalLedger)}</span>
          <span className="font-semibold text-slate-700">{summary.countTotal} itens</span>
        </div>
      </div>

      {/* 2. Conciliado com Sucesso */}
      <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
        <div className="flex items-center justify-between text-slate-500 mb-1.5">
          <span className="text-2xs font-bold uppercase tracking-wider text-emerald-800">
            Conciliado
          </span>
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-xl sm:text-2xl font-bold tracking-tight text-emerald-700 font-sans">
            {formatCurrency(summary.totalReconciled)}
          </span>
          <span className="text-2xs font-bold text-emerald-800 bg-emerald-50 px-1 py-0.5 rounded">
            {summary.reconciliationRate}%
          </span>
        </div>
        <div className="mt-1.5 flex items-center justify-between text-2xs text-slate-500 pt-1.5 border-t border-slate-100">
          <span>{summary.countReconciled} contas conferidas</span>
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
        </div>
      </div>

      {/* 3. Divergências de Valores */}
      <div className={`bg-white border rounded-xl p-3.5 shadow-2xs ${summary.countDiscrepancies > 0 ? 'border-amber-300' : 'border-slate-200'}`}>
        <div className="flex items-center justify-between text-slate-500 mb-1.5">
          <span className="text-2xs font-bold uppercase tracking-wider text-amber-800">
            Divergências
          </span>
          <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
        </div>
        <div className="text-xl sm:text-2xl font-bold tracking-tight text-amber-700 font-sans">
          {formatCurrency(summary.totalDiscrepancyAmount)}
        </div>
        <div className="mt-1.5 flex items-center justify-between text-2xs text-slate-500 pt-1.5 border-t border-slate-100">
          <span className="font-semibold text-amber-700">
            {summary.countDiscrepancies} conta(s) com diferença
          </span>
          <span className="w-2 h-2 rounded-full bg-amber-500" />
        </div>
      </div>

      {/* 4. Não Lançadas (Faltando no mês) */}
      <div className={`bg-white border rounded-xl p-3.5 shadow-2xs ${summary.countNotBilled > 0 ? 'border-rose-300' : 'border-slate-200'}`}>
        <div className="flex items-center justify-between text-slate-500 mb-1.5">
          <span className="text-2xs font-bold uppercase tracking-wider text-rose-800">
            Não Lançadas
          </span>
          <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
        </div>
        <div className="text-xl sm:text-2xl font-bold tracking-tight text-rose-700 font-sans">
          {summary.countNotBilled}
        </div>
        <div className="mt-1.5 flex items-center justify-between text-2xs text-slate-500 pt-1.5 border-t border-slate-100">
          <span>Faturas fixas não recebidas</span>
          <span className="w-2 h-2 rounded-full bg-rose-500" />
        </div>
      </div>

      {/* 5. Condomínios Monitorados */}
      <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs col-span-2 sm:col-span-1">
        <div className="flex items-center justify-between text-slate-500 mb-1.5">
          <span className="text-2xs font-bold uppercase tracking-wider text-slate-700">
            Condomínios
          </span>
          <Building2 className="w-3.5 h-3.5 text-slate-500" />
        </div>
        <div className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 font-sans">
          {summary.totalCondosCount}
        </div>
        <div className="mt-1.5 flex items-center justify-between text-2xs text-slate-500 pt-1.5 border-t border-slate-100">
          <span>Ativos no período</span>
          <span>{summary.countPending} no financeiro</span>
        </div>
      </div>

    </div>
  );
};
