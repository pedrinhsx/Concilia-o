import React from 'react';
import { 
  FileSpreadsheet, 
  Upload, 
  Download, 
  Plus, 
  Sparkles, 
  Building2,
  Tag,
  FileCheck2
} from 'lucide-react';

interface HeaderProps {
  onOpenUpload: () => void;
  onOpenManualEntry: () => void;
  onOpenAuditReport: () => void;
  onOpenCondos: () => void;
  onOpenProviders: () => void;
  onDownloadTemplate: () => void;
  onExportExcel: () => void;
  onClearAll?: () => void;
  totalRecordsCount: number;
  reconciliationRate: number;
  activeTab: 'reconciliation' | 'fixed_expenses';
  onTabChange: (tab: 'reconciliation' | 'fixed_expenses') => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenUpload,
  onOpenManualEntry,
  onOpenAuditReport,
  onOpenCondos,
  onOpenProviders,
  onDownloadTemplate,
  onExportExcel,
  onClearAll,
  totalRecordsCount,
  reconciliationRate,
  activeTab,
  onTabChange
}) => {
  return (
    <header className="border-b border-slate-200 bg-white sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          
          {/* Brand & Context */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs shrink-0">
              <FileCheck2 className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold tracking-tight text-slate-900 font-sans">
                  Conciliador de Contas de Condomínios
                </h1>
                <span className="text-2xs text-slate-500 hidden sm:inline">
                  · Luz (Celesc), Água (Casan) & Internet
                </span>
              </div>
              <p className="text-2xs text-slate-500 flex items-center gap-2">
                <span>Gestão Mensal de Despesas</span>
                <span aria-hidden="true" className="text-slate-300">|</span>
                <span className="font-semibold text-slate-700">{totalRecordsCount} lançamentos</span>
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
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            
            {/* View Tabs Toggle */}
            <div className="flex items-center p-0.5 bg-slate-100 rounded-lg text-xs font-semibold mr-1">
              <button
                onClick={() => onTabChange('reconciliation')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  activeTab === 'reconciliation'
                    ? 'bg-white text-slate-900 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Painel do Mês
              </button>
              <button
                onClick={() => onTabChange('fixed_expenses')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  activeTab === 'fixed_expenses'
                    ? 'bg-white text-slate-900 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Despesas Fixas
              </button>
            </div>

            {/* Condos & UC Manager (.txt bulk import) */}
            <button
              onClick={onOpenCondos}
              title="Gerenciar Condomínios e importar arquivo .txt de UCs"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors shadow-2xs"
            >
              <Building2 className="w-3.5 h-3.5 text-slate-600" />
              <span>Condomínios (.txt)</span>
            </button>

            {/* Fornecedores Fixos */}
            <button
              onClick={onOpenProviders}
              title="Gerenciar fornecedores habituais (Celesc, Casan, Vivo, Claro)"
              className="inline-flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors shadow-2xs"
            >
              <Tag className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">Fornecedores</span>
            </button>

            {/* Template Download */}
            <button
              onClick={onDownloadTemplate}
              title="Baixar planilha modelo .xlsx com colunas de Condomínio e UC"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors shadow-2xs"
            >
              <Download className="w-3.5 h-3.5 text-slate-600" />
              <span className="hidden sm:inline">Modelo .xlsx</span>
            </button>

            {/* Export Reconciliation */}
            {totalRecordsCount > 0 && (
              <button
                onClick={onExportExcel}
                title="Exportar resultado da conciliação para Excel"
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 rounded-lg transition-colors"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
                <span className="hidden md:inline">Exportar</span>
              </button>
            )}

            {/* Manual Entry */}
            <button
              onClick={onOpenManualEntry}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5 text-slate-600" />
              <span>Lançamento</span>
            </button>

            {/* Clear All Data */}
            {totalRecordsCount > 0 && onClearAll && (
              <button
                onClick={onClearAll}
                title="Limpar todos os lançamentos"
                className="px-2 py-1.5 text-2xs font-medium text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
              >
                Limpar
              </button>
            )}

            {/* Primary Action: Upload Relatório .xlsx */}
            <button
              onClick={onOpenUpload}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors shadow-xs"
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
