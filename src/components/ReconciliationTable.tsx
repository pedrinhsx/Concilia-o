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
  activeMonth: string;
  onSelectMonth: (month: string) => void;
  availableMonths: string[];
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
  activeMonth,
  onSelectMonth,
  availableMonths,
  onAutoReconcileAll,
  onOpenDiscrepancyModal,
  onViewRecordDetails,
  onDeleteRecord,
  onQuickApprove,
  onOpenUpload,
  onOpenManualEntry
}) => {
  const [filterState, setFilterState] = useState<{
    utilityType: 'todas' | UtilityType;
    reconciliationStatus: 'todos' | ReconciliationStatus;
    condoName: string;
    searchTerm: string;
  }>({
    utilityType: 'todas',
    reconciliationStatus: 'todos',
    condoName: 'todas',
    searchTerm: ''
  });

  // Default sorting organized by due date (Vencimento)
  const [sortField, setSortField] = useState<'dueDate' | 'condoName' | 'provider' | 'billedAmount' | 'difference'>('dueDate');
  const [sortAsc, setSortAsc] = useState<boolean>(true); // Chronological earliest first

  // Unique Condos for filter
  const uniqueCondoNames = Array.from(new Set(records.map(r => r.condoName))).filter(Boolean).sort();

  // Filter records
  const filteredRecords = records.filter((r) => {
    // 1. Month filter: filter by activeMonth unless activeMonth === 'todas'
    if (activeMonth !== 'todas' && r.competence !== activeMonth) {
      return false;
    }
    // 2. Utility type
    if (filterState.utilityType !== 'todas' && r.utilityType !== filterState.utilityType) {
      return false;
    }
    // 3. Reconciliation status
    if (filterState.reconciliationStatus !== 'todos' && r.reconciliationStatus !== filterState.reconciliationStatus) {
      return false;
    }
    // 4. Condo filter
    if (filterState.condoName !== 'todas' && r.condoName !== filterState.condoName) {
      return false;
    }
    // 5. Search
    if (filterState.searchTerm.trim() !== '') {
      const q = filterState.searchTerm.toLowerCase();
      const match = 
        r.condoName.toLowerCase().includes(q) ||
        r.provider.toLowerCase().includes(q) ||
        r.installationCode.toLowerCase().includes(q) ||
        (r.bill?.invoiceNumber && r.bill.invoiceNumber.toLowerCase().includes(q));
      if (!match) return false;
    }
    return true;
  });

  // Sort records
  const sortedRecords = [...filteredRecords].sort((a, b) => {
    let comparison = 0;
    if (sortField === 'dueDate') {
      const dateA = a.dueDate || '';
      const dateB = b.dueDate || '';
      if (!dateA && !dateB) comparison = 0;
      else if (!dateA) comparison = 1;
      else if (!dateB) comparison = -1;
      else comparison = dateA.localeCompare(dateB);
    } else if (sortField === 'condoName') {
      comparison = (a.condoName || '').localeCompare(b.condoName || '');
    } else if (sortField === 'provider') {
      comparison = (a.provider || '').localeCompare(b.provider || '');
    } else if (sortField === 'billedAmount') {
      comparison = a.billedAmount - b.billedAmount;
    } else if (sortField === 'difference') {
      comparison = Math.abs(a.difference) - Math.abs(b.difference);
    }
    return sortAsc ? comparison : -comparison;
  });

  const handleSortToggle = (field: 'dueDate' | 'condoName' | 'provider' | 'billedAmount' | 'difference') => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const formatCurrency = (val: number) => {
    return (val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  // Status as ONLY a colored dot per user request: "o status pode ser só a 'Bolinha' da cor do status atual"
  const renderStatusDot = (status: ReconciliationStatus) => {
    switch (status) {
      case 'conciliado':
        return (
          <span 
            title="Conciliado com Sucesso" 
            className="w-3 h-3 rounded-full bg-emerald-500 inline-block shadow-2xs hover:scale-125 transition-transform" 
          />
        );
      case 'divergencia_valor':
        return (
          <span 
            title="Divergência de Valor" 
            className="w-3 h-3 rounded-full bg-amber-500 inline-block shadow-2xs hover:scale-125 transition-transform" 
          />
        );
      case 'nao_lancada':
        return (
          <span 
            title="Não Lançada (Fatura fixa não localizada no .xlsx do mês)" 
            className="w-3 h-3 rounded-full bg-rose-500 inline-block shadow-2xs hover:scale-125 transition-transform" 
          />
        );
      case 'pendente_pagamento':
        return (
          <span 
            title="Pendente no Contas a Pagar / ERP" 
            className="w-3 h-3 rounded-full bg-blue-500 inline-block shadow-2xs hover:scale-125 transition-transform" 
          />
        );
      case 'lancamento_sem_fatura':
        return (
          <span 
            title="Lançamento sem fatura .xlsx correspondente" 
            className="w-3 h-3 rounded-full bg-purple-500 inline-block shadow-2xs hover:scale-125 transition-transform" 
          />
        );
      default:
        return (
          <span 
            title={status} 
            className="w-3 h-3 rounded-full bg-slate-400 inline-block" 
          />
        );
    }
  };

  const getUtilityIcon = (type: UtilityType) => {
    switch (type) {
      case 'luz':
        return <Zap className="w-3 h-3 text-amber-500" />;
      case 'agua':
        return <Droplets className="w-3 h-3 text-cyan-500" />;
      case 'internet':
        return <Wifi className="w-3 h-3 text-indigo-500" />;
    }
  };

  const renderSortArrow = (field: 'dueDate' | 'condoName' | 'provider' | 'billedAmount' | 'difference') => {
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3 text-slate-400" />;
    return sortAsc ? <ArrowUp className="w-3 h-3 text-slate-900" /> : <ArrowDown className="w-3 h-3 text-slate-900" />;
  };

  const pendingEligibleCount = records.filter(r => r.reconciliationStatus === 'pendente_pagamento' || r.reconciliationStatus === 'divergencia_valor').length;

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
      
      {/* Top Filter & Month Selector */}
      <div className="p-3.5 border-b border-slate-200 space-y-3 bg-slate-50/50">
        
        {/* Month Navigation & Action Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          
          {/* Active Month Selector (User requested month-by-month expenses) */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <span>Mês de Referência:</span>
            </span>
            <select
              value={activeMonth}
              onChange={(e) => onSelectMonth(e.target.value)}
              className="px-2.5 py-1 text-xs font-bold text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 shadow-2xs"
            >
              {availableMonths.length === 0 && <option value="todas">Todos os meses</option>}
              {availableMonths.map(m => (
                <option key={m} value={m}>Mês {m}</option>
              ))}
              <option value="todas">Ver Todos os Meses</option>
            </select>
          </div>

          {/* Quick 1-Click Auto Reconcile */}
          {pendingEligibleCount > 0 && (
            <button
              onClick={onAutoReconcileAll}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 rounded-lg transition-colors shrink-0"
            >
              <CheckCheck className="w-3.5 h-3.5 text-emerald-700" />
              <span>Conciliar Pendências ({pendingEligibleCount})</span>
            </button>
          )}

        </div>

        {/* Filters Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          
          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por condomínio, UC, fornecedor..."
              value={filterState.searchTerm}
              onChange={(e) => setFilterState({ ...filterState, searchTerm: e.target.value })}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
            />
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={filterState.reconciliationStatus}
              onChange={(e) => setFilterState({ ...filterState, reconciliationStatus: e.target.value as any })}
              className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-900"
            >
              <option value="todos">Todos os Status</option>
              <option value="conciliado">🟢 Conciliados</option>
              <option value="divergencia_valor">🟡 Divergência de Valor</option>
              <option value="nao_lancada">🔴 Não Lançadas (Faltando)</option>
              <option value="pendente_pagamento">🔵 Pendente no ERP</option>
              <option value="lancamento_sem_fatura">🟣 Sem Fatura .xlsx</option>
            </select>
          </div>

          {/* Utility Type */}
          <div>
            <select
              value={filterState.utilityType}
              onChange={(e) => setFilterState({ ...filterState, utilityType: e.target.value as any })}
              className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-900"
            >
              <option value="todas">Todas as Utilidades</option>
              <option value="luz">⚡ Energia Elétrica (Luz / Celesc)</option>
              <option value="agua">💧 Água e Saneamento (Casan)</option>
              <option value="internet">🌐 Internet & Telecom</option>
            </select>
          </div>

          {/* Condominium Filter */}
          <div>
            <select
              value={filterState.condoName}
              onChange={(e) => setFilterState({ ...filterState, condoName: e.target.value })}
              className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-900"
            >
              <option value="todas">Todos os Condomínios</option>
              {uniqueCondoNames.map(name => (
                <option key={name} value={name}>{name}</option>
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
              {/* Bolinha Status Header */}
              <th className="py-2.5 px-3 text-center w-12" title="Status de Conciliação">
                Status
              </th>

              {/* Condomínio Column */}
              <th 
                className={`py-2.5 px-3.5 cursor-pointer transition-colors ${
                  sortField === 'condoName' ? 'text-slate-900 bg-slate-200/60 font-bold' : 'hover:text-slate-900'
                }`}
                onClick={() => handleSortToggle('condoName')}
              >
                <div className="flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-slate-500" />
                  <span>Condomínio</span>
                  {renderSortArrow('condoName')}
                </div>
              </th>

              {/* Fornecedor Column (substituiu Unidade/Local) */}
              <th 
                className={`py-2.5 px-3.5 cursor-pointer transition-colors ${
                  sortField === 'provider' ? 'text-slate-900 bg-slate-200/60 font-bold' : 'hover:text-slate-900'
                }`}
                onClick={() => handleSortToggle('provider')}
              >
                <div className="flex items-center gap-1.5">
                  <span>Fornecedor</span>
                  {renderSortArrow('provider')}
                </div>
              </th>

              {/* Vencimento Column - Primary Order */}
              <th 
                className={`py-2.5 px-3.5 cursor-pointer transition-colors ${
                  sortField === 'dueDate' ? 'text-slate-900 bg-slate-200/60 font-bold' : 'hover:text-slate-900'
                }`}
                onClick={() => handleSortToggle('dueDate')}
              >
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  <span>Vencimento</span>
                  {renderSortArrow('dueDate')}
                </div>
              </th>

              <th className="py-2.5 px-3.5">Competência</th>

              {/* Valor Fatura (.xlsx) */}
              <th 
                className={`py-2.5 px-3.5 text-right cursor-pointer transition-colors ${
                  sortField === 'billedAmount' ? 'text-slate-900 bg-slate-200/60 font-bold' : 'hover:text-slate-900'
                }`}
                onClick={() => handleSortToggle('billedAmount')}
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Valor Fatura (.xlsx)</span>
                  {renderSortArrow('billedAmount')}
                </div>
              </th>

              {/* Valor ERP */}
              <th className="py-2.5 px-3.5 text-right">Lançado (ERP)</th>

              {/* Diferença */}
              <th 
                className={`py-2.5 px-3.5 text-right cursor-pointer transition-colors ${
                  sortField === 'difference' ? 'text-slate-900 bg-slate-200/60 font-bold' : 'hover:text-slate-900'
                }`}
                onClick={() => handleSortToggle('difference')}
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Diferença</span>
                  {renderSortArrow('difference')}
                </div>
              </th>

              <th className="py-2.5 px-3.5 text-center w-24">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sortedRecords.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-12 px-4 text-center text-slate-500">
                  <div className="max-w-md mx-auto space-y-3">
                    <div className="w-11 h-11 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800">
                        Nenhum lançamento para o mês {activeMonth !== 'todas' ? activeMonth : 'selecionado'}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        Anexe a planilha .xlsx do mês da Celesc/Casan ou cadastre as despesas fixas para começar a conferência.
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
                const isNotBilled = r.reconciliationStatus === 'nao_lancada';

                return (
                  <tr 
                    key={r.id} 
                    className={`hover:bg-slate-50 transition-colors group ${isNotBilled ? 'bg-rose-50/20' : ''}`}
                  >
                    {/* Status Bolinha (Just the dot per user request) */}
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center">
                        {renderStatusDot(r.reconciliationStatus)}
                      </div>
                    </td>

                    {/* Condomínio e UC */}
                    <td className="py-2.5 px-3.5">
                      <div className="flex items-center gap-2">
                        <div className="p-1 rounded bg-slate-100 shrink-0">
                          {getUtilityIcon(r.utilityType)}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">{r.condoName}</p>
                          <p className="text-2xs text-slate-500 font-mono">
                            UC / Matrícula: <strong>{r.installationCode}</strong>
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Fornecedor (Nome do Fornecedor) */}
                    <td className="py-2.5 px-3.5 whitespace-nowrap font-medium text-slate-800">
                      {r.provider}
                    </td>

                    {/* Vencimento (organizado por vencimento) */}
                    <td className="py-2.5 px-3.5 whitespace-nowrap font-medium text-slate-900 bg-slate-50/40">
                      {r.dueDate ? (
                        <span className="font-mono">
                          {new Date(r.dueDate + 'T00:00:00').toLocaleDateString('pt-BR')}
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>

                    {/* Competência */}
                    <td className="py-2.5 px-3.5 whitespace-nowrap text-slate-600 font-mono">
                      {r.competence}
                    </td>

                    {/* Valor Fatura .xlsx */}
                    <td className="py-2.5 px-3.5 text-right whitespace-nowrap font-semibold text-slate-900 font-mono">
                      {r.billedAmount > 0 ? (
                        formatCurrency(r.billedAmount)
                      ) : (
                        <span className="text-rose-600 font-normal italic">
                          {isNotBilled ? 'Não veio no .xlsx' : 'Não anexada'}
                        </span>
                      )}
                    </td>

                    {/* Valor ERP */}
                    <td className="py-2.5 px-3.5 text-right whitespace-nowrap text-slate-700 font-mono">
                      {r.ledgerAmount > 0 ? formatCurrency(r.ledgerAmount) : <span className="text-slate-400">Pendente</span>}
                    </td>

                    {/* Diferença */}
                    <td className="py-2.5 px-3.5 text-right whitespace-nowrap font-mono font-bold">
                      {isNotBilled ? (
                        <span className="text-rose-600 text-2xs">Faltando</span>
                      ) : hasDiscrepancy ? (
                        <span className={`${isDiffPositive ? 'text-amber-700' : 'text-purple-700'}`}>
                          {isDiffPositive ? '+' : ''}{formatCurrency(r.difference)}
                        </span>
                      ) : (
                        <span className="text-emerald-700">R$ 0,00</span>
                      )}
                    </td>

                    {/* Ações */}
                    <td className="py-2.5 px-3.5 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        
                        {/* Se divergência */}
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
                          title="Ver Detalhes do Lançamento"
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

      {/* Table Footer with Legend for Status Dots */}
      <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-2xs text-slate-500 gap-2">
        <div>
          Mostrando <strong className="text-slate-800">{sortedRecords.length}</strong> conta(s) do mês ordenadas por <strong className="text-slate-800">Vencimento</strong>
        </div>
        
        {/* Status Dot Legend */}
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Conciliada
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Divergência
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Não Lançada (.xlsx)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Pendente no ERP
          </span>
        </div>
      </div>

    </div>
  );
};
