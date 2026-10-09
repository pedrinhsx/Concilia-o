import React, { useState } from 'react';
import { 
  ReconciledRecord, 
  UtilityType, 
  ReconciliationStatus, 
  FilterState 
} from '../types/reconciliation';
import { 
  Search, 
  Check, 
  CheckCheck,
  Eye, 
  Wrench, 
  Trash2, 
  Zap, 
  Droplets, 
  Wifi,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Building2,
  Calendar,
  Upload,
  Plus
} from 'lucide-react';

interface ReconciliationTableProps {
  records: ReconciledRecord[];
  onAutoReconcileAll: () => void;
  onOpenDiscrepancyModal: (record: ReconciledRecord) => void;
  onViewRecordDetails: (record: ReconciledRecord) => void;
  onDeleteRecord: (id: string) => void;
  onQuickApprove: (record: ReconciledRecord) => void;
  onOpenUpload?: () => void;
  onOpenManualEntry?: () => void;
}

export const ReconciliationTable: React.FC<ReconciliationTableProps> = ({
  records,
  onAutoReconcileAll,
  onOpenDiscrepancyModal,
  onViewRecordDetails,
  onDeleteRecord,
  onQuickApprove,
  onOpenUpload,
  onOpenManualEntry
}) => {
  const [filterState, setFilterState] = useState<FilterState>({
    utilityType: 'todas',
    reconciliationStatus: 'todos',
    competence: 'todas',
    unitName: 'todas',
    searchTerm: ''
  });

  // Organized by due date (vencimento) by default as requested
  const [sortField, setSortField] = useState<'competence' | 'dueDate' | 'difference' | 'billedAmount'>('dueDate');
  const [sortAsc, setSortAsc] = useState<boolean>(true); // Earliest due date first

  // Extract unique competences and units for dropdowns
  const availableCompetences = Array.from(new Set(records.map(r => r.competence))).filter(Boolean).sort().reverse();
  const availableUnits = Array.from(new Set(records.map(r => r.unitName))).filter(Boolean).sort();

  // Filter logic
  const filteredRecords = records.filter((r) => {
    if (filterState.utilityType !== 'todas' && r.utilityType !== filterState.utilityType) {
      return false;
    }
    if (filterState.reconciliationStatus !== 'todos' && r.reconciliationStatus !== filterState.reconciliationStatus) {
      return false;
    }
    if (filterState.competence !== 'todas' && r.competence !== filterState.competence) {
      return false;
    }
    if (filterState.unitName !== 'todas' && r.unitName !== filterState.unitName) {
      return false;
    }
    if (filterState.searchTerm.trim() !== '') {
      const q = filterState.searchTerm.toLowerCase();
      const match = 
        r.provider.toLowerCase().includes(q) ||
        r.installationCode.toLowerCase().includes(q) ||
        r.unitName.toLowerCase().includes(q) ||
        (r.bill?.invoiceNumber && r.bill.invoiceNumber.toLowerCase().includes(q)) ||
        (r.auditNotes && r.auditNotes.toLowerCase().includes(q));
      if (!match) return false;
    }
    return true;
  });

  // Sort logic (organizes by dueDate, competence, etc.)
  const sortedRecords = [...filteredRecords].sort((a, b) => {
    let comparison = 0;
    if (sortField === 'dueDate') {
      const dateA = a.dueDate || '';
      const dateB = b.dueDate || '';
      if (!dateA && !dateB) comparison = 0;
      else if (!dateA) comparison = 1;
      else if (!dateB) comparison = -1;
      else comparison = dateA.localeCompare(dateB);
    } else if (sortField === 'competence') {
      comparison = (a.competence || '').localeCompare(b.competence || '');
    } else if (sortField === 'difference') {
      comparison = Math.abs(a.difference) - Math.abs(b.difference);
    } else if (sortField === 'billedAmount') {
      comparison = a.billedAmount - b.billedAmount;
    }
    return sortAsc ? comparison : -comparison;
  });

  const handleSortToggle = (field: 'competence' | 'dueDate' | 'difference' | 'billedAmount') => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true); // Default to ascending when clicking new column
    }
  };

  const formatCurrency = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const getStatusDisplay = (status: ReconciliationStatus) => {
    switch (status) {
      case 'conciliado':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
            Conciliado
          </span>
        );
      case 'divergencia_valor':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-800">
            <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
            Divergência
          </span>
        );
      case 'pendente_pagamento':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-800">
            <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
            Pendente ERP
          </span>
        );
      case 'lancamento_sem_fatura':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-purple-800">
            <span className="w-2 h-2 rounded-full bg-purple-500 shrink-0" />
            Sem Fatura .xlsx
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700">
            {status}
          </span>
        );
    }
  };

  const getUtilityIcon = (type: UtilityType) => {
    switch (type) {
      case 'luz':
        return <Zap className="w-3.5 h-3.5 text-amber-600" />;
      case 'agua':
        return <Droplets className="w-3.5 h-3.5 text-cyan-600" />;
      case 'internet':
        return <Wifi className="w-3.5 h-3.5 text-indigo-600" />;
    }
  };

  const pendingEligibleCount = records.filter(r => r.reconciliationStatus === 'pendente_pagamento' || r.reconciliationStatus === 'divergencia_valor').length;

  // Render Sort Header Helper
  const renderSortIndicator = (field: 'competence' | 'dueDate' | 'difference' | 'billedAmount') => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3 h-3 text-slate-400" />;
    }
    return sortAsc ? (
      <ArrowUp className="w-3 h-3 text-slate-900 font-bold" />
    ) : (
      <ArrowDown className="w-3 h-3 text-slate-900 font-bold" />
    );
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
      
      {/* Table Action & Filter Toolbar */}
      <div className="p-3.5 border-b border-slate-200 space-y-3 bg-slate-50/50">
        
        {/* Top Controls: Utility Type Segmented Controls & Quick Reconcile All */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          
          {/* Segmented Category Buttons */}
          <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg shrink-0">
            <button
              onClick={() => setFilterState({ ...filterState, utilityType: 'todas' })}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                filterState.utilityType === 'todas'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Todas as Utilidades
            </button>
            <button
              onClick={() => setFilterState({ ...filterState, utilityType: 'luz' })}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                filterState.utilityType === 'luz'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Zap className="w-3 h-3 text-amber-500" />
              Luz (Energia)
            </button>
            <button
              onClick={() => setFilterState({ ...filterState, utilityType: 'agua' })}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                filterState.utilityType === 'agua'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Droplets className="w-3 h-3 text-cyan-500" />
              Água & Esgoto
            </button>
            <button
              onClick={() => setFilterState({ ...filterState, utilityType: 'internet' })}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                filterState.utilityType === 'internet'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Wifi className="w-3 h-3 text-indigo-500" />
              Internet & Telecom
            </button>
          </div>

          {/* Quick 1-Click Auto Reconcile Batch */}
          {pendingEligibleCount > 0 && (
            <button
              onClick={onAutoReconcileAll}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-800 bg-emerald-100/70 hover:bg-emerald-200/80 rounded-lg transition-colors shrink-0"
            >
              <CheckCheck className="w-3.5 h-3.5 text-emerald-700" />
              <span>Conciliar Tudo ({pendingEligibleCount} pendentes)</span>
            </button>
          )}

        </div>

        {/* Filters Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          
          {/* Search Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por fornecedor, código, fatura..."
              value={filterState.searchTerm}
              onChange={(e) => setFilterState({ ...filterState, searchTerm: e.target.value })}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
            />
          </div>

          {/* Status Select */}
          <div>
            <select
              value={filterState.reconciliationStatus}
              onChange={(e) => setFilterState({ ...filterState, reconciliationStatus: e.target.value as any })}
              className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-900"
            >
              <option value="todos">Todos os Status</option>
              <option value="conciliado">🟢 100% Conciliados</option>
              <option value="divergencia_valor">🟡 Divergência de Valor</option>
              <option value="pendente_pagamento">🔵 Pendente de Baixa no ERP</option>
              <option value="lancamento_sem_fatura">🟣 Lançamento Sem Fatura .xlsx</option>
            </select>
          </div>

          {/* Competence Select */}
          <div>
            <select
              value={filterState.competence}
              onChange={(e) => setFilterState({ ...filterState, competence: e.target.value })}
              className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-900"
            >
              <option value="todas">Todas as Competências</option>
              {availableCompetences.map(c => (
                <option key={c} value={c}>Competência {c}</option>
              ))}
            </select>
          </div>

          {/* Unit / Filial Select */}
          <div>
            <select
              value={filterState.unitName}
              onChange={(e) => setFilterState({ ...filterState, unitName: e.target.value })}
              className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-900"
            >
              <option value="todas">Todas as Unidades / Filiais</option>
              {availableUnits.map(u => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>

        </div>

      </div>

      {/* Grid Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-semibold select-none">
            <tr>
              <th className="py-2.5 px-3.5">Status</th>
              <th className="py-2.5 px-3.5">Concessionária & Código</th>
              <th className="py-2.5 px-3.5">Unidade / Local</th>

              {/* Vencimento - Highlighted as primary sort column */}
              <th 
                className={`py-2.5 px-3.5 cursor-pointer transition-colors ${
                  sortField === 'dueDate' ? 'text-slate-900 bg-slate-200/60 font-bold' : 'hover:text-slate-900'
                }`}
                onClick={() => handleSortToggle('dueDate')}
                title="Clique para ordenar por data de vencimento"
              >
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  <span>Vencimento</span>
                  {renderSortIndicator('dueDate')}
                </div>
              </th>

              <th 
                className={`py-2.5 px-3.5 cursor-pointer transition-colors ${
                  sortField === 'competence' ? 'text-slate-900 bg-slate-200/60 font-bold' : 'hover:text-slate-900'
                }`}
                onClick={() => handleSortToggle('competence')}
              >
                <div className="flex items-center gap-1">
                  <span>Competência</span>
                  {renderSortIndicator('competence')}
                </div>
              </th>

              <th className="py-2.5 px-3.5">Consumo Medido</th>

              <th 
                className={`py-2.5 px-3.5 text-right cursor-pointer transition-colors ${
                  sortField === 'billedAmount' ? 'text-slate-900 bg-slate-200/60 font-bold' : 'hover:text-slate-900'
                }`}
                onClick={() => handleSortToggle('billedAmount')}
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Fatura (.xlsx)</span>
                  {renderSortIndicator('billedAmount')}
                </div>
              </th>

              <th className="py-2.5 px-3.5 text-right">Lançado (ERP)</th>

              <th 
                className={`py-2.5 px-3.5 text-right cursor-pointer transition-colors ${
                  sortField === 'difference' ? 'text-slate-900 bg-slate-200/60 font-bold' : 'hover:text-slate-900'
                }`}
                onClick={() => handleSortToggle('difference')}
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Diferença</span>
                  {renderSortIndicator('difference')}
                </div>
              </th>

              <th className="py-2.5 px-3.5 text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sortedRecords.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-12 px-4 text-center text-slate-500">
                  <div className="max-w-md mx-auto space-y-3">
                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                      <Calendar className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800">Nenhum lançamento no painel</p>
                      <p className="text-xs text-slate-500 mt-1">
                        Anexe o relatório .xlsx emitido pela sua concessionária ou cadastre um lançamento manual para iniciar a conciliação por vencimento.
                      </p>
                    </div>
                    <div className="flex items-center justify-center gap-2 pt-1">
                      {onOpenUpload && (
                        <button
                          onClick={onOpenUpload}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors shadow-xs"
                        >
                          <Upload className="w-3.5 h-3.5 text-amber-400" />
                          <span>Anexar Relatório (.xlsx)</span>
                        </button>
                      )}
                      {onOpenManualEntry && (
                        <button
                          onClick={onOpenManualEntry}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5 text-slate-600" />
                          <span>Novo Lançamento</span>
                        </button>
                      )}
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              sortedRecords.map((r) => {
                const hasDiscrepancy = Math.abs(r.difference) > 0.05;
                const isDiffPositive = r.difference > 0;

                return (
                  <tr 
                    key={r.id} 
                    className="hover:bg-slate-50 transition-colors group"
                  >
                    {/* Status */}
                    <td className="py-2.5 px-3.5 whitespace-nowrap">
                      {getStatusDisplay(r.reconciliationStatus)}
                    </td>

                    {/* Concessionária & Código */}
                    <td className="py-2.5 px-3.5">
                      <div className="flex items-center gap-2">
                        <div className="p-1 rounded bg-slate-100 shrink-0">
                          {getUtilityIcon(r.utilityType)}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">{r.provider}</p>
                          <p className="text-2xs text-slate-500 font-mono">
                            Cód: {r.installationCode}
                            {r.bill?.invoiceNumber && ` · ${r.bill.invoiceNumber}`}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Unidade */}
                    <td className="py-2.5 px-3.5 whitespace-nowrap text-slate-700">
                      <span className="flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate max-w-[140px]" title={r.unitName}>{r.unitName}</span>
                      </span>
                    </td>

                    {/* Vencimento (primary order column) */}
                    <td className="py-2.5 px-3.5 whitespace-nowrap font-medium text-slate-900 bg-slate-50/40">
                      {r.dueDate ? (
                        <div className="flex items-center gap-1 font-mono">
                          <span>{new Date(r.dueDate + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>

                    {/* Competência */}
                    <td className="py-2.5 px-3.5 whitespace-nowrap text-slate-600 font-mono">
                      {r.competence}
                    </td>

                    {/* Consumo */}
                    <td className="py-2.5 px-3.5 whitespace-nowrap text-slate-600">
                      {r.consumptionValue ? (
                        <div>
                          <span className="font-semibold text-slate-800">
                            {r.consumptionValue.toLocaleString('pt-BR')} {r.consumptionUnit}
                          </span>
                          {r.tariffFlag && r.tariffFlag !== 'n_a' && (
                            <span className={`block text-2xs font-medium ${
                              r.tariffFlag.includes('vermelha') ? 'text-rose-600 font-bold' :
                              r.tariffFlag === 'amarela' ? 'text-amber-600 font-bold' : 'text-emerald-700'
                            }`}>
                              Bandeira {r.tariffFlag.replace('_', ' ')}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>

                    {/* Valor Fatura .xlsx */}
                    <td className="py-2.5 px-3.5 text-right whitespace-nowrap font-semibold text-slate-900 font-mono">
                      {r.billedAmount > 0 ? formatCurrency(r.billedAmount) : <span className="text-slate-400 font-normal">Não anexada</span>}
                    </td>

                    {/* Valor ERP */}
                    <td className="py-2.5 px-3.5 text-right whitespace-nowrap text-slate-700 font-mono">
                      {r.ledgerAmount > 0 ? formatCurrency(r.ledgerAmount) : <span className="text-slate-400">Não provisionado</span>}
                    </td>

                    {/* Diferença */}
                    <td className="py-2.5 px-3.5 text-right whitespace-nowrap font-mono font-bold">
                      {hasDiscrepancy ? (
                        <span className={`${isDiffPositive ? 'text-amber-700' : 'text-purple-700'}`}>
                          {isDiffPositive ? '+' : ''}{formatCurrency(r.difference)}
                        </span>
                      ) : (
                        <span className="text-emerald-700">R$ 0,00</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-2.5 px-3.5 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        
                        {/* Se houver divergência */}
                        {r.reconciliationStatus === 'divergencia_valor' && (
                          <button
                            onClick={() => onOpenDiscrepancyModal(r)}
                            title="Resolver Divergência de Valor"
                            className="p-1 rounded hover:bg-amber-100 text-amber-700 transition-colors"
                          >
                            <Wrench className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Se pendente de baixa */}
                        {r.reconciliationStatus === 'pendente_pagamento' && (
                          <button
                            onClick={() => onQuickApprove(r)}
                            title="Lançar no Contas a Pagar e Conciliar"
                            className="p-1 rounded hover:bg-emerald-100 text-emerald-700 transition-colors"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Ver Detalhes */}
                        <button
                          onClick={() => onViewRecordDetails(r)}
                          title="Ver Ficha Completa e Auditoria"
                          className="p-1 rounded hover:bg-slate-200 text-slate-600 transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        {/* Excluir */}
                        <button
                          onClick={() => onDeleteRecord(r.id)}
                          title="Remover Lançamento"
                          className="p-1 rounded hover:bg-rose-100 text-slate-400 hover:text-rose-600 transition-colors opacity-70 group-hover:opacity-100"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>

                      </div>
                    </td>

                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Table Footer with Summary Count */}
      {sortedRecords.length > 0 && (
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
          <div>
            Mostrando <strong className="text-slate-800">{sortedRecords.length}</strong> lançamento(s) ordenados por <strong className="text-slate-800">Vencimento</strong>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500" /> Conciliado
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-500" /> Divergência
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-500" /> Pendente Baixa
            </span>
          </div>
        </div>
      )}

    </div>
  );
};
