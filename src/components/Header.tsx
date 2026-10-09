import React from 'react';
import { 
  FileSpreadsheet, 
  Upload, 
  Download, 
  Plus, 
  Sparkles, 
  Settings, 
  RotateCcw,
  Layers,
  FileCheck2
} from 'lucide-react';

interface HeaderProps {
  onOpenUpload: () => void;
  onOpenManualEntry: () => void;
  onOpenAuditReport: () => void;
  onOpenInstallations: () => void;
  onDownloadTemplate: () => void;
  onExportExcel: () => void;
  onClearAll?: () => void;
  totalRecordsCount: number;
  reconciliationRate: number;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenUpload,
  onOpenManualEntry,
  onOpenAuditReport,
  onOpenInstallations,
  onDownloadTemplate,
  onExportExcel,
  onClearAll,
  totalRecordsCount,
  reconciliationRate
}) => {
  return (
    <header className="border-b border-slate-200 bg-white sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          
          {/* Brand & Context */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs shrink-0">
              <FileCheck2 className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold tracking-tight text-slate-900 font-sans">
                  Conciliador de Utilidades
                </h1>
                <span className="text-xs text-slate-500 hidden sm:inline">
                  · Água, Luz & Internet
                </span>
              </div>
              <p className="text-xs text-slate-500 flex items-center gap-2">
                <span>Painel Unificado de Conciliação Financeira</span>
                <span aria-hidden="true" className="text-slate-300">|</span>
                <span className="font-medium text-slate-700">{totalRecordsCount} lançamentos</span>
                {totalRecordsCount > 0 && (
                  <>
                    <span aria-hidden="true" className="text-slate-300">|</span>
                    <span className={`font-semibold ${reconciliationRate >= 80 ? 'text-emerald-700' : 'text-amber-700'}`}>
                      {reconciliationRate}% conciliado
                    </span>
                  </>
                )}
              </p>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center gap-2">
            
            {/* Template Download */}
            <button
              onClick={onDownloadTemplate}
              title="Baixar planilha modelo .xlsx para preenchimento de faturas"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors shadow-2xs"
            >
              <Download className="w-3.5 h-3.5 text-slate-600" />
              <span>Modelo .xlsx</span>
            </button>

            {/* Export Reconciliation */}
            {totalRecordsCount > 0 && (
              <button
                onClick={onExportExcel}
                title="Exportar resultado da conciliação para Excel"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 rounded-lg transition-colors"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
                <span className="hidden sm:inline">Exportar .xlsx</span>
              </button>
            )}

            {/* AI Audit Parecer */}
            {totalRecordsCount > 0 && (
              <button
                onClick={onOpenAuditReport}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-purple-900 bg-purple-50 border border-purple-200 hover:bg-purple-100 rounded-lg transition-colors shadow-2xs"
              >
                <Sparkles className="w-3.5 h-3.5 text-purple-700" />
                <span>Auditoria IA</span>
              </button>
            )}

            {/* Manual Entry */}
            <button
              onClick={onOpenManualEntry}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5 text-slate-600" />
              <span>Novo Lançamento</span>
            </button>

            {/* Clear All Data if user wants */}
            {totalRecordsCount > 0 && onClearAll && (
              <button
                onClick={onClearAll}
                title="Limpar todos os lançamentos"
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
              >
                Limpar
              </button>
            )}

            {/* Installations / Meters Manager */}
            <button
              onClick={onOpenInstallations}
              title="Gerenciar Instalações e Concessionárias"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors shadow-2xs"
            >
              <Settings className="w-3.5 h-3.5 text-slate-600" />
            </button>

            {/* Primary Action: Upload Relatório .xlsx */}
            <button
              onClick={onOpenUpload}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors shadow-sm"
            >
              <Upload className="w-3.5 h-3.5 text-amber-400" />
              <span>Anexar Relatório (.xlsx)</span>
            </button>

          </div>
        </div>
      </div>
    </header>
  );
};
