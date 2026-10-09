import React, { useState } from 'react';
import { ReconciledRecord } from '../types/reconciliation';
import { BarChart3, PieChart, TrendingUp, Info } from 'lucide-react';

interface FinancialChartsProps {
  records: ReconciledRecord[];
}

export const FinancialCharts: React.FC<FinancialChartsProps> = ({ records }) => {
  const [activeTab, setActiveTab] = useState<'evolution' | 'composition' | 'consumption'>('evolution');
  const [hoveredMonth, setHoveredMonth] = useState<string | null>(null);

  // Group by competence (month)
  const competenceMap = new Map<string, {
    competence: string;
    luz: number;
    agua: number;
    internet: number;
    total: number;
    luzKwh: number;
    aguaM3: number;
  }>();

  records.forEach((r) => {
    const comp = r.competence;
    if (!competenceMap.has(comp)) {
      competenceMap.set(comp, {
        competence: comp,
        luz: 0,
        agua: 0,
        internet: 0,
        total: 0,
        luzKwh: 0,
        aguaM3: 0
      });
    }

    const item = competenceMap.get(comp)!;
    const amount = r.billedAmount > 0 ? r.billedAmount : r.ledgerAmount;

    if (r.utilityType === 'luz') {
      item.luz += amount;
      if (r.consumptionValue && r.consumptionUnit === 'kWh') {
        item.luzKwh += r.consumptionValue;
      }
    } else if (r.utilityType === 'agua') {
      item.agua += amount;
      if (r.consumptionValue && r.consumptionUnit === 'm³') {
        item.aguaM3 += r.consumptionValue;
      }
    } else if (r.utilityType === 'internet') {
      item.internet += amount;
    }
    item.total += amount;
  });

  const sortedMonths = Array.from(competenceMap.values()).sort((a, b) => a.competence.localeCompare(b.competence));

  // Overall totals for composition
  let totalLuz = 0;
  let totalAgua = 0;
  let totalInternet = 0;

  records.forEach((r) => {
    const amount = r.billedAmount > 0 ? r.billedAmount : r.ledgerAmount;
    if (r.utilityType === 'luz') totalLuz += amount;
    else if (r.utilityType === 'agua') totalAgua += amount;
    else if (r.utilityType === 'internet') totalInternet += amount;
  });

  const grandTotal = totalLuz + totalAgua + totalInternet || 1;
  const pctLuz = Math.round((totalLuz / grandTotal) * 100);
  const pctAgua = Math.round((totalAgua / grandTotal) * 100);
  const pctInternet = Math.max(0, 100 - pctLuz - pctAgua);

  // Maximum value for scaling the bar chart
  const maxMonthTotal = Math.max(...sortedMonths.map(m => m.total), 1000);

  const formatBRL = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
  };

  const formatMonthLabel = (comp: string) => {
    const parts = comp.split('-');
    if (parts.length === 2) {
      const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      const mIdx = parseInt(parts[1], 10) - 1;
      return `${monthNames[mIdx] || parts[1]}/${parts[0].slice(2)}`;
    }
    return comp;
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-2xs">
      
      {/* Header with segmented switch */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div>
          <h2 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>Análise Gráfica & Composição de Custos</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Evolução histórica, custo por concessionária e correlação de consumo
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg shrink-0 self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('evolution')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              activeTab === 'evolution' 
                ? 'bg-white text-slate-900 shadow-xs' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5 text-slate-600" />
            <span>Evolução Mensal</span>
          </button>

          <button
            onClick={() => setActiveTab('composition')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              activeTab === 'composition' 
                ? 'bg-white text-slate-900 shadow-xs' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <PieChart className="w-3.5 h-3.5 text-slate-600" />
            <span>Distribuição %</span>
          </button>

          <button
            onClick={() => setActiveTab('consumption')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              activeTab === 'consumption' 
                ? 'bg-white text-slate-900 shadow-xs' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5 text-slate-600" />
            <span>Físico (kWh/m³)</span>
          </button>
        </div>
      </div>

      {/* Main Chart Canvas Area */}
      <div className="pt-4">
        {activeTab === 'evolution' && (
          <div className="space-y-4">
            {/* Chart Legend */}
            <div className="flex flex-wrap items-center justify-between text-xs text-slate-500">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5 font-medium">
                  <span className="w-3 h-3 rounded-xs bg-amber-400 inline-block" />
                  Luz (Energia)
                </span>
                <span className="flex items-center gap-1.5 font-medium">
                  <span className="w-3 h-3 rounded-xs bg-cyan-400 inline-block" />
                  Água e Esgoto
                </span>
                <span className="flex items-center gap-1.5 font-medium">
                  <span className="w-3 h-3 rounded-xs bg-indigo-400 inline-block" />
                  Internet & Telecom
                </span>
              </div>
              <span className="text-slate-400 text-2xs">Valores em Reais (R$)</span>
            </div>

            {/* Stacked Bars Container */}
            <div className="h-56 flex items-end gap-3 sm:gap-6 pt-6 pb-2 px-2 border-b border-slate-200">
              {sortedMonths.length === 0 ? (
                <div className="w-full h-full flex items-center justify-center text-xs text-slate-400">
                  Nenhum dado financeiro para o período selecionado
                </div>
              ) : (
                sortedMonths.map((m) => {
                  const barHeightPct = Math.round((m.total / maxMonthTotal) * 100);
                  const luzPct = m.total > 0 ? (m.luz / m.total) * 100 : 0;
                  const aguaPct = m.total > 0 ? (m.agua / m.total) * 100 : 0;
                  const intPct = m.total > 0 ? (m.internet / m.total) * 100 : 0;
                  const isHovered = hoveredMonth === m.competence;

                  return (
                    <div 
                      key={m.competence}
                      className="flex-1 flex flex-col items-center h-full justify-end group cursor-pointer relative"
                      onMouseEnter={() => setHoveredMonth(m.competence)}
                      onMouseLeave={() => setHoveredMonth(null)}
                    >
                      {/* Tooltip on hover */}
                      {isHovered && (
                        <div className="absolute bottom-[calc(100%+8px)] z-20 bg-slate-900 text-white rounded-lg p-2.5 shadow-lg text-2xs whitespace-nowrap pointer-events-none">
                          <p className="font-bold text-amber-300 border-b border-slate-700 pb-1 mb-1.5">
                            Competência {formatMonthLabel(m.competence)}
                          </p>
                          <div className="space-y-0.5">
                            <p className="flex justify-between gap-3">
                              <span className="text-slate-300">⚡ Luz:</span>
                              <strong>{formatBRL(m.luz)}</strong>
                            </p>
                            <p className="flex justify-between gap-3">
                              <span className="text-slate-300">💧 Água:</span>
                              <strong>{formatBRL(m.agua)}</strong>
                            </p>
                            <p className="flex justify-between gap-3">
                              <span className="text-slate-300">🌐 Internet:</span>
                              <strong>{formatBRL(m.internet)}</strong>
                            </p>
                            <p className="flex justify-between gap-3 pt-1 border-t border-slate-700 font-bold text-emerald-300">
                              <span>Total:</span>
                              <span>{formatBRL(m.total)}</span>
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Total Amount Tag on Top of Bar */}
                      <span className="text-2xs font-semibold text-slate-700 mb-1 opacity-80 group-hover:opacity-100">
                        {formatBRL(m.total)}
                      </span>

                      {/* Stacked Bar */}
                      <div 
                        className={`w-full max-w-[56px] rounded-t-md overflow-hidden flex flex-col-reverse transition-all duration-200 ${
                          isHovered ? 'ring-2 ring-slate-900 shadow-md scale-y-[1.02]' : 'hover:opacity-90'
                        }`}
                        style={{ height: `${Math.max(12, barHeightPct)}%` }}
                      >
                        {/* Luz Segment */}
                        <div 
                          className="bg-amber-400 transition-all"
                          style={{ height: `${luzPct}%` }}
                          title={`Luz: ${formatBRL(m.luz)}`}
                        />
                        {/* Água Segment */}
                        <div 
                          className="bg-cyan-400 transition-all"
                          style={{ height: `${aguaPct}%` }}
                          title={`Água: ${formatBRL(m.agua)}`}
                        />
                        {/* Internet Segment */}
                        <div 
                          className="bg-indigo-400 transition-all"
                          style={{ height: `${intPct}%` }}
                          title={`Internet: ${formatBRL(m.internet)}`}
                        />
                      </div>

                      {/* Month Label */}
                      <span className="text-xs font-semibold text-slate-600 mt-2">
                        {formatMonthLabel(m.competence)}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {activeTab === 'composition' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center py-2">
            {/* Visual Donut / Stacked Bar representation */}
            <div className="flex flex-col items-center justify-center p-4">
              <div className="relative w-44 h-44 flex items-center justify-center">
                {/* SVG Donut */}
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="38" fill="transparent" stroke="#f1f5f9" strokeWidth="16" />
                  
                  {/* Luz slice */}
                  <circle
                    cx="50" cy="50" r="38"
                    fill="transparent"
                    stroke="#fbbf24"
                    strokeWidth="16"
                    strokeDasharray={`${(pctLuz / 100) * 238.76} 238.76`}
                    strokeDashoffset="0"
                  />
                  {/* Água slice */}
                  <circle
                    cx="50" cy="50" r="38"
                    fill="transparent"
                    stroke="#22d3ee"
                    strokeWidth="16"
                    strokeDasharray={`${(pctAgua / 100) * 238.76} 238.76`}
                    strokeDashoffset={`${-(pctLuz / 100) * 238.76}`}
                  />
                  {/* Internet slice */}
                  <circle
                    cx="50" cy="50" r="38"
                    fill="transparent"
                    stroke="#818cf8"
                    strokeWidth="16"
                    strokeDasharray={`${(pctInternet / 100) * 238.76} 238.76`}
                    strokeDashoffset={`${-((pctLuz + pctAgua) / 100) * 238.76}`}
                  />
                </svg>
                {/* Center text */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-2xs uppercase tracking-wider text-slate-400 font-bold">Total Acumulado</span>
                  <span className="text-sm font-extrabold text-slate-900">{formatBRL(grandTotal)}</span>
                </div>
              </div>
            </div>

            {/* Breakdown Details */}
            <div className="space-y-3">
              <div className="p-3 rounded-lg border border-slate-100 bg-amber-50/50 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="w-3.5 h-3.5 rounded-sm bg-amber-400" />
                  <div>
                    <p className="text-xs font-bold text-slate-900">Energia Elétrica (Luz)</p>
                    <p className="text-2xs text-slate-500">Maior centro de custo de utilidades</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs font-extrabold text-slate-900">{formatBRL(totalLuz)}</p>
                  <p className="text-2xs font-semibold text-amber-700">{pctLuz}% do total</p>
                </div>
              </div>

              <div className="p-3 rounded-lg border border-slate-100 bg-cyan-50/50 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="w-3.5 h-3.5 rounded-sm bg-cyan-400" />
                  <div>
                    <p className="text-xs font-bold text-slate-900">Água e Esgoto</p>
                    <p className="text-2xs text-slate-500">Tarifas básicas e excedente medido</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs font-extrabold text-slate-900">{formatBRL(totalAgua)}</p>
                  <p className="text-2xs font-semibold text-cyan-700">{pctAgua}% do total</p>
                </div>
              </div>

              <div className="p-3 rounded-lg border border-slate-100 bg-indigo-50/50 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="w-3.5 h-3.5 rounded-sm bg-indigo-400" />
                  <div>
                    <p className="text-xs font-bold text-slate-900">Internet & Telecom</p>
                    <p className="text-2xs text-slate-500">Links dedicados corporativos</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs font-extrabold text-slate-900">{formatBRL(totalInternet)}</p>
                  <p className="text-2xs font-semibold text-indigo-700">{pctInternet}% do total</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'consumption' && (
          <div className="space-y-4">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600 flex items-start gap-2">
              <Info className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
              <span>
                Esta análise cruza o consumo medido em <strong>kWh</strong> (eletricidade) e <strong>m³</strong> (água) contra o valor faturado. Permite identificar se picos no boleto foram causados por <strong>aumento de demanda física</strong> ou por <strong>reajustes de tarifa/bandeira da ANEEL</strong>.
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Luz kWh History */}
              <div className="border border-slate-200 rounded-lg p-3.5">
                <h3 className="text-xs font-bold text-slate-900 mb-3 flex items-center justify-between">
                  <span>⚡ Evolução Consumo de Luz (kWh)</span>
                  <span className="text-2xs font-normal text-slate-500">Quilowatt-hora</span>
                </h3>
                <div className="space-y-2">
                  {sortedMonths.map(m => (
                    <div key={m.competence} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-semibold text-slate-700">{formatMonthLabel(m.competence)}</span>
                        <span className="text-slate-600 font-mono">{m.luzKwh.toLocaleString('pt-BR')} kWh ({formatBRL(m.luz)})</span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-amber-400 rounded-full" 
                          style={{ width: `${Math.min(100, (m.luzKwh / 20000) * 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Água m3 History */}
              <div className="border border-slate-200 rounded-lg p-3.5">
                <h3 className="text-xs font-bold text-slate-900 mb-3 flex items-center justify-between">
                  <span>💧 Evolução Consumo Hídrico (m³)</span>
                  <span className="text-2xs font-normal text-slate-500">Metros cúbicos</span>
                </h3>
                <div className="space-y-2">
                  {sortedMonths.map(m => (
                    <div key={m.competence} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-semibold text-slate-700">{formatMonthLabel(m.competence)}</span>
                        <span className="text-slate-600 font-mono">{m.aguaM3.toLocaleString('pt-BR')} m³ ({formatBRL(m.agua)})</span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-cyan-400 rounded-full" 
                          style={{ width: `${Math.min(100, (m.aguaM3 / 250) * 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

    </div>
  );
};
