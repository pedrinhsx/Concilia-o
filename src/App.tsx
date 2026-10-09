/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  UtilityBill, 
  LedgerEntry, 
  Condominium, 
  FixedProvider, 
  FixedExpense, 
  ReconciledRecord 
} from './types/reconciliation';
import { 
  INITIAL_BILLS, 
  INITIAL_LEDGER 
} from './utils/mockData';
import { 
  runReconciliation, 
  calculateFinancialSummary, 
  generateFinancialInsights 
} from './utils/reconciliationEngine';
import { 
  generateSampleExcelTemplate, 
  exportReconciliationToExcel 
} from './utils/xlsxParser';

import { Header } from './components/Header';
import { KPIStats } from './components/KPIStats';
import { FinancialCharts } from './components/FinancialCharts';
import { AnomalyBanner } from './components/AnomalyBanner';
import { ReconciliationTable } from './components/ReconciliationTable';
import { FixedExpensesTab } from './components/FixedExpensesTab';
import { UploadModal } from './components/UploadModal';
import { ManualEntryModal } from './components/ManualEntryModal';
import { DiscrepancyResolutionModal } from './components/DiscrepancyResolutionModal';
import { RecordDetailsModal } from './components/RecordDetailsModal';
import { AuditReportModal } from './components/AuditReportModal';
import { CondosManagerModal } from './components/CondosManagerModal';
import { FixedProvidersModal } from './components/FixedProvidersModal';

// Storage keys
const STORAGE_KEY_BILLS = 'utilidades_bills_v3';
const STORAGE_KEY_LEDGER = 'utilidades_ledger_v3';
const STORAGE_KEY_CONDOS = 'utilidades_condos_v3';
const STORAGE_KEY_PROVIDERS = 'utilidades_providers_v3';
const STORAGE_KEY_FIXED = 'utilidades_fixed_expenses_v3';

const DEFAULT_PROVIDERS: FixedProvider[] = [
  { id: 'prov-celesc', name: 'Celesc Distribuição', utilityType: 'luz', notes: 'Concessionária de energia SC' },
  { id: 'prov-casan', name: 'Casan', utilityType: 'agua', notes: 'Companhia de água e saneamento SC' },
  { id: 'prov-vivo', name: 'Vivo Fibra', utilityType: 'internet', notes: 'Internet telecom e fibra' },
  { id: 'prov-claro', name: 'Claro Telecom', utilityType: 'internet', notes: 'Link dedicado / banda larga' },
  { id: 'prov-copel', name: 'Copel', utilityType: 'luz', notes: 'Companhia Paranaense de Energia' },
  { id: 'prov-sanepar', name: 'Sanepar', utilityType: 'agua', notes: 'Companhia de saneamento PR' }
];

const DEFAULT_CONDOS: Condominium[] = [
  { id: 'condo-1', name: 'Residencial Bella Vista', uc: '3819204', notes: 'Celesc Energia' },
  { id: 'condo-2', name: 'Condomínio Solar das Palmeiras', uc: '5928173', notes: 'Celesc Energia' },
  { id: 'condo-3', name: 'Edifício Jardim América', uc: '7192840', notes: 'Casan Água' }
];

const DEFAULT_FIXED_EXPENSES: FixedExpense[] = [
  {
    id: 'fix-1',
    condoName: 'Residencial Bella Vista',
    uc: '3819204',
    provider: 'Celesc Distribuição',
    utilityType: 'luz',
    expectedDay: 15,
    estimatedAmount: 850.00,
    active: true,
    notes: 'Conta mensal de energia elétrica'
  },
  {
    id: 'fix-2',
    condoName: 'Condomínio Solar das Palmeiras',
    uc: '5928173',
    provider: 'Celesc Distribuição',
    utilityType: 'luz',
    expectedDay: 10,
    estimatedAmount: 1200.00,
    active: true,
    notes: 'Conta mensal de energia elétrica'
  },
  {
    id: 'fix-3',
    condoName: 'Edifício Jardim América',
    uc: '7192840',
    provider: 'Casan',
    utilityType: 'agua',
    expectedDay: 20,
    estimatedAmount: 640.00,
    active: true,
    notes: 'Conta mensal de água e esgoto'
  }
];

export default function App() {
  // Main view tab: 'reconciliation' (Painel do Mês) vs 'fixed_expenses' (Despesas Fixas)
  const [activeTab, setActiveTab] = useState<'reconciliation' | 'fixed_expenses'>('reconciliation');

  // Utility bills from .xlsx
  const [bills, setBills] = useState<UtilityBill[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_BILLS);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return INITIAL_BILLS;
  });

  // ERP ledger entries
  const [ledger, setLedger] = useState<LedgerEntry[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_LEDGER);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return INITIAL_LEDGER;
  });

  // Condominiums list (Name and UC)
  const [condos, setCondos] = useState<Condominium[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CONDOS);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return DEFAULT_CONDOS;
  });

  // Fixed recurring providers
  const [fixedProviders, setFixedProviders] = useState<FixedProvider[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_PROVIDERS);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return DEFAULT_PROVIDERS;
  });

  // Fixed recurring expenses checklist
  const [fixedExpenses, setFixedExpenses] = useState<FixedExpense[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_FIXED);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return DEFAULT_FIXED_EXPENSES;
  });

  // Available months calculation (from bills, ledger, and current date)
  const availableMonths = useMemo(() => {
    const monthSet = new Set<string>();
    bills.forEach(b => b.competence && monthSet.add(b.competence));
    ledger.forEach(l => l.competence && monthSet.add(l.competence));
    
    // Add current month if none
    const now = new Date();
    const curMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    monthSet.add(curMonth);

    return Array.from(monthSet).sort().reverse();
  }, [bills, ledger]);

  // Selected competence month
  const [activeMonth, setActiveMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  // Sync activeMonth if availableMonths changes and current activeMonth is not valid
  useEffect(() => {
    if (activeMonth !== 'todas' && !availableMonths.includes(activeMonth) && availableMonths.length > 0) {
      setActiveMonth(availableMonths[0]);
    }
  }, [availableMonths, activeMonth]);

  // Modals state
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isManualEntryOpen, setIsManualEntryOpen] = useState(false);
  const [isAuditReportOpen, setIsAuditReportOpen] = useState(false);
  const [isCondosOpen, setIsCondosOpen] = useState(false);
  const [isProvidersOpen, setIsProvidersOpen] = useState(false);
  const [discrepancyRecord, setDiscrepancyRecord] = useState<ReconciledRecord | null>(null);
  const [detailsRecord, setDetailsRecord] = useState<ReconciledRecord | null>(null);

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Persist state to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_BILLS, JSON.stringify(bills));
    } catch (e) {
      console.error(e);
    }
  }, [bills]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_LEDGER, JSON.stringify(ledger));
    } catch (e) {
      console.error(e);
    }
  }, [ledger]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_CONDOS, JSON.stringify(condos));
    } catch (e) {
      console.error(e);
    }
  }, [condos]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_PROVIDERS, JSON.stringify(fixedProviders));
    } catch (e) {
      console.error(e);
    }
  }, [fixedProviders]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_FIXED, JSON.stringify(fixedExpenses));
    } catch (e) {
      console.error(e);
    }
  }, [fixedExpenses]);

  // Compute reconciled records (automatically organized by due date and incorporating fixed expenses)
  const reconciledRecords = useMemo(() => {
    return runReconciliation(bills, ledger, fixedExpenses, activeMonth);
  }, [bills, ledger, fixedExpenses, activeMonth]);

  // Compute summary KPIs
  const summary = useMemo(() => {
    return calculateFinancialSummary(reconciledRecords);
  }, [reconciledRecords]);

  // Compute financial anomaly insights
  const insights = useMemo(() => {
    return generateFinancialInsights(reconciledRecords);
  }, [reconciledRecords]);

  // Handle uploading and parsing a new .xlsx report
  const handleConfirmImport = (newBills: UtilityBill[], fileName: string) => {
    setBills(prev => {
      const existingIds = new Set(prev.map(b => b.id));
      const filteredNew = newBills.filter(b => !existingIds.has(b.id));
      return [...filteredNew, ...prev];
    });

    // Auto add detected condominiums to the database if not present
    if (newBills.length > 0) {
      setCondos(prev => {
        const existingMap = new Map(prev.map(c => [c.name.toLowerCase(), c]));
        const toAdd: Condominium[] = [];
        newBills.forEach(b => {
          if (b.condoName && !existingMap.has(b.condoName.toLowerCase())) {
            const newC: Condominium = {
              id: `condo-auto-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              name: b.condoName,
              uc: b.installationCode || 'UC-000',
              notes: `Identificado automaticamente no relatório ${fileName}`
            };
            existingMap.set(b.condoName.toLowerCase(), newC);
            toAdd.push(newC);
          }
        });
        return [...prev, ...toAdd];
      });

      // Switch active month to report's competence
      const firstComp = newBills[0]?.competence;
      if (firstComp) {
        setActiveMonth(firstComp);
      }
    }

    showToast(`✅ ${newBills.length} fatura(s) importada(s) do relatório "${fileName}". Conciliação pronta!`);
  };

  // Fast 1-click batch reconcile for all pending or divergent items
  const handleAutoReconcileAll = () => {
    let resolvedCount = 0;
    const newLedgerEntries: LedgerEntry[] = [];
    const updatedLedger = [...ledger];

    reconciledRecords.forEach((record) => {
      if (record.reconciliationStatus === 'pendente_pagamento' && record.bill) {
        newLedgerEntries.push({
          id: `led-auto-${record.bill.id}`,
          utilityType: record.bill.utilityType,
          provider: record.bill.provider,
          installationCode: record.bill.installationCode,
          condoName: record.bill.condoName,
          competence: record.bill.competence,
          expectedDate: record.bill.dueDate,
          actualPaymentDate: record.bill.dueDate,
          ledgerAmount: record.bill.billedAmount,
          paymentAccount: 'Conta Corrente do Condomínio',
          documentNumber: record.bill.invoiceNumber || `AUTO-${record.bill.competence}`,
          status: 'liquidado',
          notes: 'Baixa gerada automaticamente pela conciliação do relatório .xlsx'
        });
        resolvedCount++;
      } else if (record.reconciliationStatus === 'divergencia_valor' && record.ledger) {
        const idx = updatedLedger.findIndex(l => l.id === record.ledger!.id);
        if (idx !== -1) {
          updatedLedger[idx] = {
            ...updatedLedger[idx],
            ledgerAmount: record.billedAmount,
            notes: `Valor ajustado para R$ ${record.billedAmount.toFixed(2)} conforme fatura da concessionária`
          };
          resolvedCount++;
        }
      }
    });

    setLedger([...updatedLedger, ...newLedgerEntries]);
    showToast(`✅ ${resolvedCount} lançamento(s) regularizado(s) e conciliado(s)!`);
  };

  // Quick approve single pending record
  const handleQuickApprove = (record: ReconciledRecord) => {
    if (!record.bill) return;

    const newLedger: LedgerEntry = {
      id: `led-single-${record.bill.id}`,
      utilityType: record.bill.utilityType,
      provider: record.bill.provider,
      installationCode: record.bill.installationCode,
      condoName: record.bill.condoName,
      competence: record.bill.competence,
      expectedDate: record.bill.dueDate,
      actualPaymentDate: record.bill.dueDate,
      ledgerAmount: record.bill.billedAmount,
      paymentAccount: 'Conta Corrente do Condomínio',
      documentNumber: record.bill.invoiceNumber || `AUT-${record.bill.competence}`,
      status: 'liquidado',
      notes: 'Baixa aprovada diretamente no painel'
    };

    setLedger(prev => [newLedger, ...prev]);
    showToast(`Conta de ${record.condoName} lançada e conciliada!`);
  };

  // Resolve discrepancy with specific action
  const handleResolveDiscrepancy = (
    recordId: string, 
    action: 'adjust_ledger' | 'contest' | 'accept_variance', 
    note: string
  ) => {
    const targetRecord = reconciledRecords.find(r => r.id === recordId);
    if (!targetRecord) return;

    if (action === 'adjust_ledger') {
      if (targetRecord.ledgerId) {
        setLedger(prev => prev.map(l => {
          if (l.id === targetRecord.ledgerId) {
            return {
              ...l,
              ledgerAmount: targetRecord.billedAmount,
              notes: note || `Equiparado à fatura da concessionária (R$ ${targetRecord.billedAmount.toFixed(2)})`
            };
          }
          return l;
        }));
      } else if (targetRecord.bill) {
        handleQuickApprove(targetRecord);
      }
      showToast(`Valor atualizado para R$ ${targetRecord.billedAmount.toFixed(2)}. Conta conciliada!`);
    } else if (action === 'contest') {
      if (targetRecord.billId) {
        setBills(prev => prev.map(b => {
          if (b.id === targetRecord.billId) {
            return {
              ...b,
              notes: `CONTESTAÇÃO: ${note || 'Protocolo aberto junto à distribuidora'}`
            };
          }
          return b;
        }));
      }
      showToast(`Protocolo de contestação registrado.`);
    } else {
      if (targetRecord.ledgerId) {
        setLedger(prev => prev.map(l => {
          if (l.id === targetRecord.ledgerId) {
            return {
              ...l,
              notes: `DIVERGÊNCIA ACEITA: ${note || 'Variação aceita pela controladoria'}`
            };
          }
          return l;
        }));
      }
      showToast(`Justificativa contábil salva com sucesso.`);
    }
  };

  // Delete a record
  const handleDeleteRecord = (recordId: string) => {
    const target = reconciledRecords.find(r => r.id === recordId);
    if (!target) return;

    if (target.billId) {
      setBills(prev => prev.filter(b => b.id !== target.billId));
    }
    if (target.ledgerId) {
      setLedger(prev => prev.filter(l => l.id !== target.ledgerId));
    }
    showToast('Lançamento removido.');
  };

  // Manual entry additions
  const handleAddBill = (newBill: UtilityBill) => {
    setBills(prev => [newBill, ...prev]);
    showToast('Fatura adicionada com sucesso.');
  };

  const handleAddLedger = (newLedger: LedgerEntry) => {
    setLedger(prev => [newLedger, ...prev]);
    showToast('Lançamento adicionado ao financeiro.');
  };

  // Condos actions
  const handleImportBulkCondos = (newCondos: Condominium[], newFixed: FixedExpense[]) => {
    setCondos(prev => {
      const existingKeys = new Set(prev.map(c => `${c.name.toLowerCase()}#${c.uc}`));
      const filtered = newCondos.filter(c => !existingKeys.has(`${c.name.toLowerCase()}#${c.uc}`));
      return [...prev, ...filtered];
    });

    if (newFixed.length > 0) {
      setFixedExpenses(prev => {
        const existingKeys = new Set(prev.map(f => `${f.condoName.toLowerCase()}#${f.uc}#${f.provider.toLowerCase()}`));
        const filtered = newFixed.filter(f => !existingKeys.has(`${f.condoName.toLowerCase()}#${f.uc}#${f.provider.toLowerCase()}`));
        return [...prev, ...filtered];
      });
    }

    showToast(`✅ ${newCondos.length} condomínio(s) importado(s) com suas UCs!`);
  };

  const handleAddCondo = (newCondo: Condominium) => {
    setCondos(prev => [newCondo, ...prev]);
    showToast(`Condomínio "${newCondo.name}" cadastrado!`);
  };

  const handleDeleteCondo = (id: string) => {
    setCondos(prev => prev.filter(c => c.id !== id));
    showToast('Condomínio removido.');
  };

  // Fixed Providers actions
  const handleAddProvider = (provider: FixedProvider) => {
    setFixedProviders(prev => [provider, ...prev]);
    showToast(`Fornecedor "${provider.name}" cadastrado!`);
  };

  const handleDeleteProvider = (id: string) => {
    setFixedProviders(prev => prev.filter(p => p.id !== id));
    showToast('Fornecedor removido.');
  };

  // Fixed expenses actions
  const handleAddFixedExpense = (newExp: FixedExpense) => {
    setFixedExpenses(prev => [newExp, ...prev]);
    showToast(`Despesa fixa cadastrada para ${newExp.condoName}!`);
  };

  const handleDeleteFixedExpense = (id: string) => {
    setFixedExpenses(prev => prev.filter(e => e.id !== id));
    showToast('Despesa fixa removida.');
  };

  const handleToggleFixedExpense = (id: string, active: boolean) => {
    setFixedExpenses(prev => prev.map(e => e.id === id ? { ...e, active } : e));
  };

  const handleQuickLaunchLedger = (expense: FixedExpense, month: string) => {
    const dueDate = `${month}-${String(expense.expectedDay).padStart(2, '0')}`;
    const newEntry: LedgerEntry = {
      id: `led-fixed-${expense.id}-${month}`,
      utilityType: expense.utilityType,
      provider: expense.provider,
      installationCode: expense.uc,
      condoName: expense.condoName,
      competence: month,
      expectedDate: dueDate,
      actualPaymentDate: dueDate,
      ledgerAmount: expense.estimatedAmount || 0,
      paymentAccount: 'Conta Corrente do Condomínio',
      documentNumber: `DESP-${month.replace('-', '')}`,
      status: 'provisionado',
      notes: `Despesa fixa mensal lançada no Contas a Pagar (${expense.provider})`
    };

    setLedger(prev => [newEntry, ...prev]);
    showToast(`Despesa de ${expense.condoName} provisionada no financeiro!`);
  };

  // Clear all data handler
  const handleClearAll = () => {
    if (window.confirm('Deseja realmente limpar todos os lançamentos e faturas do painel?')) {
      setBills([]);
      setLedger([]);
      localStorage.removeItem(STORAGE_KEY_BILLS);
      localStorage.removeItem(STORAGE_KEY_LEDGER);
      showToast('Todos os lançamentos foram limpos.');
    }
  };

  // Export to Excel
  const handleExportExcel = () => {
    exportReconciliationToExcel(reconciledRecords, `Conciliacao_Condominios_${activeMonth}_${new Date().toISOString().slice(0, 10)}.xlsx`);
    showToast('Planilha de conciliação exportada em .xlsx!');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-4 right-4 z-50 bg-slate-900 text-white text-xs font-semibold px-4 py-2.5 rounded-lg shadow-lg border border-slate-700 flex items-center gap-2">
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Executive Header */}
      <Header
        onOpenUpload={() => setIsUploadOpen(true)}
        onOpenManualEntry={() => setIsManualEntryOpen(true)}
        onOpenAuditReport={() => setIsAuditReportOpen(true)}
        onOpenCondos={() => setIsCondosOpen(true)}
        onOpenProviders={() => setIsProvidersOpen(true)}
        onDownloadTemplate={generateSampleExcelTemplate}
        onExportExcel={handleExportExcel}
        onClearAll={reconciledRecords.length > 0 ? handleClearAll : undefined}
        totalRecordsCount={reconciledRecords.length}
        reconciliationRate={summary.reconciliationRate}
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5 space-y-5">
        
        {activeTab === 'fixed_expenses' ? (
          /* Aba: Despesas Fixas Mensais */
          <FixedExpensesTab
            fixedExpenses={fixedExpenses}
            bills={bills}
            activeMonth={activeMonth}
            condos={condos}
            fixedProviders={fixedProviders}
            onAddFixedExpense={handleAddFixedExpense}
            onDeleteFixedExpense={handleDeleteFixedExpense}
            onToggleFixedExpense={handleToggleFixedExpense}
            onQuickLaunchLedger={handleQuickLaunchLedger}
          />
        ) : (
          /* Aba: Painel de Lançamentos & Conciliação */
          <>
            {/* KPI Financial Overview Cards */}
            <KPIStats summary={summary} />

            {/* Anomaly & Risk Alerts Banner */}
            <AnomalyBanner insights={insights} />

            {/* Financial Charts (Monthly Evolution & Cost Distribution) */}
            {reconciledRecords.length > 0 && (
              <FinancialCharts records={reconciledRecords} />
            )}

            {/* Reconciliation Data Table (Organized by due date) */}
            <ReconciliationTable
              records={reconciledRecords}
              activeMonth={activeMonth}
              onSelectMonth={(m) => setActiveMonth(m)}
              availableMonths={availableMonths}
              onAutoReconcileAll={handleAutoReconcileAll}
              onOpenDiscrepancyModal={(r) => setDiscrepancyRecord(r)}
              onViewRecordDetails={(r) => setDetailsRecord(r)}
              onDeleteRecord={handleDeleteRecord}
              onQuickApprove={handleQuickApprove}
              onOpenUpload={() => setIsUploadOpen(true)}
              onOpenManualEntry={() => setIsManualEntryOpen(true)}
            />
          </>
        )}

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-3 mt-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
          <p>
            Conciliador de Utilidades de Condomínios · Celesc (Luz), Casan (Água) & Internet
          </p>
          <div className="flex items-center gap-3 text-2xs">
            <span>Organizado por Vencimento</span>
            <span>·</span>
            <span>Importação em massa de UCs via .txt</span>
            <span>·</span>
            <span>Suporte a planilhas <strong>.xlsx</strong></span>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onConfirmImport={handleConfirmImport}
      />

      <ManualEntryModal
        isOpen={isManualEntryOpen}
        onClose={() => setIsManualEntryOpen(false)}
        condos={condos}
        fixedProviders={fixedProviders}
        onAddBill={handleAddBill}
        onAddLedger={handleAddLedger}
        onAddCondo={handleAddCondo}
      />

      <CondosManagerModal
        isOpen={isCondosOpen}
        onClose={() => setIsCondosOpen(false)}
        condos={condos}
        onImportBulkCondos={handleImportBulkCondos}
        onAddCondo={handleAddCondo}
        onDeleteCondo={handleDeleteCondo}
      />

      <FixedProvidersModal
        isOpen={isProvidersOpen}
        onClose={() => setIsProvidersOpen(false)}
        providers={fixedProviders}
        onAddProvider={handleAddProvider}
        onDeleteProvider={handleDeleteProvider}
      />

      <DiscrepancyResolutionModal
        record={discrepancyRecord}
        onClose={() => setDiscrepancyRecord(null)}
        onResolve={handleResolveDiscrepancy}
      />

      <RecordDetailsModal
        record={detailsRecord}
        onClose={() => setDetailsRecord(null)}
      />

      <AuditReportModal
        isOpen={isAuditReportOpen}
        onClose={() => setIsAuditReportOpen(false)}
        summary={summary}
        records={reconciledRecords}
        insights={insights}
      />

    </div>
  );
}
