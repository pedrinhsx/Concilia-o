import React, { useState } from 'react';
import { AnomalyInsight } from '../types/reconciliation';
import { AlertCircle, AlertTriangle, Info, CheckCircle2, ChevronDown, ChevronUp, Zap, Droplets, Wifi, Lightbulb } from 'lucide-react';

interface AnomalyBannerProps {
  insights: AnomalyInsight[];
}

export const AnomalyBanner: React.FC<AnomalyBannerProps> = ({ insights }) => {
  const [isExpanded, setIsExpanded] = useState(true);

  if (!insights || insights.length === 0) return null;

  const alertsCount = insights.filter(i => i.type === 'alert').length;
  const warningsCount = insights.filter(i => i.type === 'warning').length;

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs transition-all">
      {/* Banner Header */}
      <div 
        className="px-4 py-3 bg-slate-50/70 border-b border-slate-100 flex items-center justify-between cursor-pointer hover:bg-slate-100/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-md bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
            <Lightbulb className="w-3.5 h-3.5" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-900">
              Análise Financeira Automática & Auditoria
            </span>
            <div className="flex items-center gap-1.5 text-2xs text-slate-500">
              {alertsCount > 0 && (
                <span className="font-semibold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded">
                  {alertsCount} alerta(s) crítico(s)
                </span>
              )}
              {warningsCount > 0 && (
                <span className="font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                  {warningsCount} atenção
                </span>
              )}
            </div>
          </div>
        </div>

        <button className="text-slate-500 hover:text-slate-800 p-1">
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* Expanded Insights List */}
      {isExpanded && (
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {insights.map((insight) => {
            const isAlert = insight.type === 'alert';
            const isWarning = insight.type === 'warning';
            const isSuccess = insight.type === 'success';

            return (
              <div
                key={insight.id}
                className={`p-3.5 rounded-lg border transition-colors ${
                  isAlert
                    ? 'border-rose-200 bg-rose-50/40 text-rose-950'
                    : isWarning
                    ? 'border-amber-200 bg-amber-50/40 text-amber-950'
                    : isSuccess
                    ? 'border-emerald-200 bg-emerald-50/40 text-emerald-950'
                    : 'border-blue-200 bg-blue-50/40 text-blue-950'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <div className="mt-0.5 shrink-0">
                    {isAlert && <AlertCircle className="w-4 h-4 text-rose-600" />}
                    {isWarning && <AlertTriangle className="w-4 h-4 text-amber-600" />}
                    {isSuccess && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                    {!isAlert && !isWarning && !isSuccess && <Info className="w-4 h-4 text-blue-600" />}
                  </div>

                  <div className="space-y-1 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">{insight.title}</span>
                      {insight.utilityType && (
                        <span className="text-2xs font-semibold px-1 py-0.2 bg-white/80 rounded border border-slate-200 text-slate-600">
                          {insight.utilityType === 'luz' ? '⚡ Luz' : insight.utilityType === 'agua' ? '💧 Água' : '🌐 Internet'}
                        </span>
                      )}
                    </div>

                    <p className="text-slate-600 leading-relaxed">
                      {insight.description}
                    </p>

                    {insight.recommendation && (
                      <div className="mt-2 pt-1.5 border-t border-slate-200/60 text-2xs text-slate-700">
                        <strong className="text-slate-900">Recomendação: </strong>
                        {insight.recommendation}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
