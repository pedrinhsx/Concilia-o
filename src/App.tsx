/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  UtilityBill, 
  LedgerEntry, 
  UtilityInstallation, 
  ReconciledRecord 
} from './types/reconciliation';
import { 
  INITIAL_BILLS, 
  INITIAL_LEDGER, 
  INITIAL_INSTALLATIONS 
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
import { UploadModal } from './components/UploadModal';
import { ManualEntryModal } from './components/ManualEntryModal';
import { DiscrepancyResolutionModal } from './components/DiscrepancyResolutionModal';
import { RecordDetailsModal } from './components/RecordDetailsModal';
import { AuditReportModal } from './components/AuditReportModal';
import { InstallationsManagerModal } from './components/InstallationsManagerModal';

// Clean storage keys without mock expenses
const STORAGE_KEY_BILLS = 'utilidades_bills_v2';
const STORAGE_KEY_LEDGER = 'utilidades_ledger_v2';
const STORAGE_KEY_INST = 'utilidades_installations_v2';

export default function App() {
  // Clear any legacy demo data from v1 keys if present
  useEffect(() => {
    try {
      localStorage.removeItem('utilidades_bills_v1');
      localStorage.removeItem('utilidades_ledger_v1');
    } catch (e) {
      // ignore
    }
  }, []);

  // State for utility bills (from .xlsx reports) - starts clean
  const [bills, setBills] = useState<UtilityBill[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_BILLS);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return INITIAL_BILLS;
  });

  // State for financial ledger / ERP - starts clean
  const [ledger, setLedger] = useState<LedgerEntry[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_LEDGER);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return INITIAL_LEDGER;
  });

  // State for utility installations / meters
  const [installations, setInstallations] = useState<UtilityInstallation[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_INST);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return INITIAL_INSTALLATIONS;
  });

  // Modals state
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isManualEntryOpen, setIsManualEntryOpen] = useState(false);
  const [isAuditReportOpen, setIsAuditReportOpen] = useState(false);
  const [isInstallationsOpen, setIsInstallationsOpen] = useState(false);
  const [discrepancyRecord, setDiscrepancyRecord] = useState<ReconciledRecord | null>(null);
  const [detailsRecord, setDetailsRecord] = useState<ReconciledRecord | null>(null);

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Persist changes to localStorage
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
      localStorage.setItem(STORAGE_KEY_INST, JSON.stringify(installations));
    } catch (e) {
      console.error(e);
    }
  }, [installations]);

  // Compute reconciled records (automatically organized by due date)
  const reconciledRecords = useMemo(() => {
    return runReconciliation(bills, ledger);
  }, [bills, ledger]);

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
          unitName: record.bill.unitName,
          competence: record.bill.competence,
          expectedDate: record.bill.dueDate,
          actualPaymentDate: record.bill.dueDate,
          ledgerAmount: record.bill.billedAmount,
          paymentAccount: 'Banco Itaú Empresas (C/C 40291-3)',
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
      unitName: record.bill.unitName,
      competence: record.bill.competence,
      expectedDate: record.bill.dueDate,
      actualPaymentDate: record.bill.dueDate,
      ledgerAmount: record.bill.billedAmount,
      paymentAccount: 'Banco Itaú Empresas (C/C 40291-3)',
      documentNumber: record.bill.invoiceNumber || `AUT-${record.bill.competence}`,
      status: 'liquidado',
      notes: 'Baixa aprovada diretamente no painel'
    };

    setLedger(prev => [newLedger, ...prev]);
    showToast(`Fatura ${record.bill.invoiceNumber || record.provider} lançada e conciliada!`);
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
  };

  // Installations manager actions
  const handleSaveInstallation = (newInst: UtilityInstallation) => {
    setInstallations(prev => [newInst, ...prev]);
    showToast(`Instalação ${newInst.provider} cadastrada!`);
  };

  const handleDeleteInstallation = (id: string) => {
    setInstallations(prev => prev.filter(i => i.id !== id));
    showToast('Instalação removida.');
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
    exportReconciliationToExcel(reconciledRecords, `Conciliacao_Utilidades_${new Date().toISOString().slice(0, 10)}.xlsx`);
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
        onOpenInstallations={() => setIsInstallationsOpen(true)}
        onDownloadTemplate={generateSampleExcelTemplate}
        onExportExcel={handleExportExcel}
        onClearAll={reconciledRecords.length > 0 ? handleClearAll : undefined}
        totalRecordsCount={reconciledRecords.length}
        reconciliationRate={summary.reconciliationRate}
      />

      {/* Main Content Dashboard */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5 space-y-5">
        
        {/* KPI Financial Overview Cards */}
        <KPIStats summary={summary} />

        {/* Anomaly & Risk Alerts Banner */}
        <AnomalyBanner insights={insights} />

        {/* Financial & Consumption Charts (Only when there are records to analyze) */}
        {reconciledRecords.length > 0 && (
          <FinancialCharts records={reconciledRecords} />
        )}

        {/* Reconciliation Data Table (Default organized by due date) */}
        <ReconciliationTable
          records={reconciledRecords}
          onAutoReconcileAll={handleAutoReconcileAll}
          onOpenDiscrepancyModal={(r) => setDiscrepancyRecord(r)}
          onViewRecordDetails={(r) => setDetailsRecord(r)}
          onDeleteRecord={handleDeleteRecord}
          onQuickApprove={handleQuickApprove}
          onOpenUpload={() => setIsUploadOpen(true)}
          onOpenManualEntry={() => setIsManualEntryOpen(true)}
        />

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-3 mt-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
          <p>
            Conciliador de Utilidades · Análise Financeira Automática de Água, Luz e Internet
          </p>
          <div className="flex items-center gap-3 text-2xs">
            <span>Organizado por Vencimento</span>
            <span>·</span>
            <span>Suporte a planilhas <strong>.xlsx</strong> e <strong>.csv</strong></span>
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
        installations={installations}
        onAddBill={handleAddBill}
        onAddLedger={handleAddLedger}
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

      <InstallationsManagerModal
        isOpen={isInstallationsOpen}
        onClose={() => setIsInstallationsOpen(false)}
        installations={installations}
        onSaveInstallation={handleSaveInstallation}
        onDeleteInstallation={handleDeleteInstallation}
      />

    </div>
  );
}
