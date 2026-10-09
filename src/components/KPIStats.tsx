import React from 'react';
import { 
  Zap, 
  Droplets, 
  Wifi, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  TrendingUp,
  Receipt
} from 'lucide-react';
import { FinancialSummary } from '../types/reconciliation';

interface KPIStatsProps {
  summary: FinancialSummary;
}

export const KPIStats: React.FC<KPIStatsProps> = ({ summary }) => {
  const formatCurrency = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  return (
    <div className="space-y-4">
      {/* Top Main Financial KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        
        {/* Total Faturado */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total Faturado (.xlsx)
            </span>
            <Receipt className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold tracking-tight text-slate-900 font-sans">
            {formatCurrency(summary.totalBilled)}
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
            <span>No ERP/Banco: {formatCurrency(summary.totalLedger)}</span>
            <span className="font-medium text-slate-700">{summary.countTotal} contas</span>
          </div>
        </div>

        {/* Conciliado com Sucesso */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-800">
              Conciliado com Sucesso
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-emerald-700 font-sans">
              {formatCurrency(summary.totalReconciled)}
            </span>
            <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded">
              {summary.reconciliationRate}%
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
            <span>{summary.countReconciled} contas conferidas</span>
            <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-emerald-500 rounded-full" 
                style={{ width: `${Math.min(100, summary.reconciliationRate)}%` }} 
              />
            </div>
          </div>
        </div>

        {/* Divergências de Valores */}
        <div className={`bg-white border rounded-xl p-4 shadow-2xs ${summary.countDiscrepancies > 0 ? 'border-amber-300' : 'border-slate-200'}`}>
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-800">
              Divergências de Valor
            </span>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold tracking-tight text-amber-700 font-sans">
            {formatCurrency(summary.totalDiscrepancyAmount)}
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
            <span className="font-medium text-amber-700">
              {summary.countDiscrepancies} conta(s) divergente(s)
            </span>
            <span className="text-slate-400">Requer ajuste</span>
          </div>
        </div>

        {/* Pendente de Pagamento / Baixa */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-800">
              Pendente de Baixa
            </span>
            <Clock className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold tracking-tight text-blue-700 font-sans">
            {formatCurrency(summary.totalPendingPayment)}
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
            <span>{summary.countPending} fatura(s) sem lançamento</span>
            <span className="text-slate-400">{summary.countUnbilled} sem fatura</span>
          </div>
        </div>

      </div>

      {/* Utility Specific Metric Cards (Luz, Água, Internet) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        
        {/* Luz / Energia */}
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 hover:border-amber-300 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
                <Zap className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-slate-800">Energia Elétrica (Luz)</span>
            </div>
            <span className="text-xs font-medium text-slate-500">{summary.byUtility.luz.count} faturas</span>
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <div className="text-lg font-bold text-slate-900">
              {formatCurrency(summary.byUtility.luz.total)}
            </div>
            {summary.byUtility.luz.avgCostPerKwh > 0 && (
              <div className="text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                R$ {summary.byUtility.luz.avgCostPerKwh.toFixed(2)}/kWh
              </div>
            )}
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Consumo: <strong className="text-slate-700">{summary.byUtility.luz.consumptionTotal.toLocaleString('pt-BR')} kWh</strong></span>
            <span>{summary.byUtility.luz.discrepancyCount} divergências</span>
          </div>
        </div>

        {/* Água e Esgoto */}
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 hover:border-cyan-300 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-cyan-50 border border-cyan-200 flex items-center justify-center text-cyan-700">
                <Droplets className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-slate-800">Água e Esgoto</span>
            </div>
            <span className="text-xs font-medium text-slate-500">{summary.byUtility.agua.count} faturas</span>
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <div className="text-lg font-bold text-slate-900">
              {formatCurrency(summary.byUtility.agua.total)}
            </div>
            {summary.byUtility.agua.avgCostPerM3 > 0 && (
              <div className="text-xs font-semibold text-cyan-700 bg-cyan-50 px-2 py-0.5 rounded">
                R$ {summary.byUtility.agua.avgCostPerM3.toFixed(2)}/m³
              </div>
            )}
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Volume: <strong className="text-slate-700">{summary.byUtility.agua.consumptionTotal.toLocaleString('pt-BR')} m³</strong></span>
            <span>{summary.byUtility.agua.discrepancyCount} divergências</span>
          </div>
        </div>

        {/* Internet & Telecom */}
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 hover:border-indigo-300 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-700">
                <Wifi className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-slate-800">Internet & Telecom</span>
            </div>
            <span className="text-xs font-medium text-slate-500">{summary.byUtility.internet.count} links</span>
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <div className="text-lg font-bold text-slate-900">
              {formatCurrency(summary.byUtility.internet.total)}
            </div>
            <div className="text-xs font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
              Média R$ {summary.byUtility.internet.avgMonthly.toFixed(2)}/mês
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Links corporativos B2B</span>
            <span>{summary.byUtility.internet.discrepancyCount} divergências</span>
          </div>
        </div>

      </div>
    </div>
  );
};
