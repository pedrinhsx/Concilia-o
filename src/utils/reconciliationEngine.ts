import { 
  UtilityBill, 
  LedgerEntry, 
  ReconciledRecord, 
  ReconciliationStatus, 
  FinancialSummary, 
  FixedExpense 
} from '../types/reconciliation';

export const DEFAULT_TOLERANCE = 0.05;

/**
 * Reconcile a list of imported utility bills with internal ledger entries and fixed expenses
 */
export function runReconciliation(
  bills: UtilityBill[],
  ledgerEntries: LedgerEntry[],
  fixedExpenses: FixedExpense[] = [],
  activeMonth?: string,
  tolerance: number = DEFAULT_TOLERANCE
): ReconciledRecord[] {
  const reconciledList: ReconciledRecord[] = [];
  const matchedLedgerIds = new Set<string>();
  const matchedFixedExpenseKeys = new Set<string>();

  // Helper key for matching UC and competence
  const makeMatchKey = (uc: string, comp: string) => `${(uc || '').toLowerCase().replace(/\D/g, '')}#${comp}`;

  // 1. Process all bills from the uploaded report
  bills.forEach((bill) => {
    // Attempt to match with a ledger entry
    let candidates = ledgerEntries.filter(l => 
      !matchedLedgerIds.has(l.id) &&
      l.utilityType === bill.utilityType &&
      l.competence === bill.competence
    );

    // Prefer exact installation code (UC) match
    let bestMatch = candidates.find(l => 
      l.installationCode.toLowerCase().replace(/\D/g, '') === bill.installationCode.toLowerCase().replace(/\D/g, '') ||
      l.installationCode.toLowerCase() === bill.installationCode.toLowerCase()
    );

    // Fallback: match by condo name and provider
    if (!bestMatch) {
      bestMatch = candidates.find(l => 
        l.condoName.toLowerCase() === bill.condoName.toLowerCase() &&
        (l.provider.toLowerCase().includes(bill.provider.toLowerCase()) || bill.provider.toLowerCase().includes(l.provider.toLowerCase()))
      );
    }

    // Mark matched fixed expense if exists
    matchedFixedExpenseKeys.add(makeMatchKey(bill.installationCode, bill.competence));

    if (bestMatch) {
      matchedLedgerIds.add(bestMatch.id);
      const diff = Math.round((bill.billedAmount - bestMatch.ledgerAmount) * 100) / 100;
      let status: ReconciliationStatus = 'conciliado';
      let auditNotes = 'Fatura conciliada com sucesso com lançamento do condomínio.';

      if (Math.abs(diff) > tolerance) {
        status = 'divergencia_valor';
        if (diff > 0) {
          auditNotes = `Fatura da concessionária é R$ ${diff.toFixed(2)} maior que o valor lançado no Contas a Pagar.`;
        } else {
          auditNotes = `Valor lançado no ERP é R$ ${Math.abs(diff).toFixed(2)} maior que a fatura importada.`;
        }
      }

      reconciledList.push({
        id: `rec-${bill.id}-${bestMatch.id}`,
        billId: bill.id,
        ledgerId: bestMatch.id,
        utilityType: bill.utilityType,
        provider: bill.provider || bestMatch.provider,
        installationCode: bill.installationCode || bestMatch.installationCode,
        condoName: bill.condoName || bestMatch.condoName,
        competence: bill.competence,
        dueDate: bill.dueDate || bestMatch.expectedDate,
        billedAmount: bill.billedAmount,
        ledgerAmount: bestMatch.ledgerAmount,
        difference: diff,
        reconciliationStatus: status,
        reconciliationDate: new Date().toISOString(),
        reconciledBy: 'Motor Automático',
        auditNotes,
        bill,
        ledger: bestMatch
      });
    } else {
      // Bill exists in report, but not yet launched in ledger
      reconciledList.push({
        id: `rec-unmatched-bill-${bill.id}`,
        billId: bill.id,
        utilityType: bill.utilityType,
        provider: bill.provider,
        installationCode: bill.installationCode,
        condoName: bill.condoName,
        competence: bill.competence,
        dueDate: bill.dueDate,
        billedAmount: bill.billedAmount,
        ledgerAmount: 0,
        difference: bill.billedAmount,
        reconciliationStatus: 'pendente_pagamento',
        auditNotes: 'Fatura presente no relatório .xlsx, aguardando lançamento no Contas a Pagar.',
        bill
      });
    }
  });

  // 2. Find remaining ledger entries without corresponding supplier bill
  ledgerEntries.forEach((ledger) => {
    if (!matchedLedgerIds.has(ledger.id)) {
      reconciledList.push({
        id: `rec-unmatched-ledger-${ledger.id}`,
        ledgerId: ledger.id,
        utilityType: ledger.utilityType,
        provider: ledger.provider,
        installationCode: ledger.installationCode,
        condoName: ledger.condoName,
        competence: ledger.competence,
        dueDate: ledger.expectedDate,
        billedAmount: 0,
        ledgerAmount: ledger.ledgerAmount,
        difference: -ledger.ledgerAmount,
        reconciliationStatus: 'lancamento_sem_fatura',
        auditNotes: 'Lançamento financeiro ativo sem a fatura .xlsx anexada da concessionária.',
        ledger
      });
    }
  });

  // 3. For any fixed recurring expense in activeMonth that wasn't found in bills/ledger, add as 'nao_lancada'
  if (activeMonth && activeMonth !== 'todas') {
    fixedExpenses.filter(f => f.active).forEach((fixed) => {
      const matchKey = makeMatchKey(fixed.uc, activeMonth);
      if (!matchedFixedExpenseKeys.has(matchKey)) {
        // Construct expected due date
        const parts = activeMonth.split('-');
        let expectedDueDate = `${activeMonth}-15`;
        if (parts.length === 2) {
          const dayStr = String(fixed.expectedDay || 15).padStart(2, '0');
          expectedDueDate = `${parts[0]}-${parts[1]}-${dayStr}`;
        }

        reconciledList.push({
          id: `rec-fixed-missing-${fixed.id}-${activeMonth}`,
          fixedExpenseId: fixed.id,
          utilityType: fixed.utilityType,
          provider: fixed.provider,
          installationCode: fixed.uc,
          condoName: fixed.condoName,
          competence: activeMonth,
          dueDate: expectedDueDate,
          billedAmount: 0,
          ledgerAmount: fixed.estimatedAmount || 0,
          difference: 0,
          reconciliationStatus: 'nao_lancada',
          auditNotes: 'Despesa fixa cadastrada do condomínio não localizada no relatório .xlsx deste mês.'
        });
      }
    });
  }

  // Sort primarily by dueDate (vencimento) ascending (earliest to latest)
  return reconciledList.sort((a, b) => {
    const dateA = a.dueDate || '';
    const dateB = b.dueDate || '';
    if (!dateA && !dateB) return (b.competence || '').localeCompare(a.competence || '');
    if (!dateA) return 1;
    if (!dateB) return -1;
    return dateA.localeCompare(dateB) || (b.competence || '').localeCompare(a.competence || '');
  });
}

/**
 * Calculate financial totals and KPI metrics (without physical consumption metrics)
 */
export function calculateFinancialSummary(records: ReconciledRecord[]): FinancialSummary {
  let totalBilled = 0;
  let totalLedger = 0;
  let totalReconciled = 0;
  let totalDiscrepancyAmount = 0;
  let totalPendingPayment = 0;

  let countReconciled = 0;
  let countDiscrepancies = 0;
  let countPending = 0;
  let countNotBilled = 0;
  let countUnbilled = 0;

  const uniqueCondos = new Set<string>();

  records.forEach((r) => {
    const effectiveAmount = r.billedAmount > 0 ? r.billedAmount : r.ledgerAmount;
    totalBilled += r.billedAmount;
    totalLedger += r.ledgerAmount;

    if (r.condoName) uniqueCondos.add(r.condoName.toLowerCase());

    if (r.reconciliationStatus === 'conciliado') {
      countReconciled++;
      totalReconciled += effectiveAmount;
    } else if (r.reconciliationStatus === 'divergencia_valor') {
      countDiscrepancies++;
      totalDiscrepancyAmount += Math.abs(r.difference);
    } else if (r.reconciliationStatus === 'pendente_pagamento') {
      countPending++;
      totalPendingPayment += r.billedAmount;
    } else if (r.reconciliationStatus === 'nao_lancada') {
      countNotBilled++;
    } else if (r.reconciliationStatus === 'lancamento_sem_fatura') {
      countUnbilled++;
    }
  });

  const countTotal = records.length;
  const eligibleTotal = countTotal - countNotBilled;
  const reconciliationRate = eligibleTotal > 0 ? Math.round((countReconciled / eligibleTotal) * 100) : 0;

  return {
    totalBilled: Math.round(totalBilled * 100) / 100,
    totalLedger: Math.round(totalLedger * 100) / 100,
    totalReconciled: Math.round(totalReconciled * 100) / 100,
    totalDiscrepancyAmount: Math.round(totalDiscrepancyAmount * 100) / 100,
    totalPendingPayment: Math.round(totalPendingPayment * 100) / 100,
    countTotal,
    countReconciled,
    countDiscrepancies,
    countPending,
    countNotBilled,
    countUnbilled,
    reconciliationRate,
    totalCondosCount: uniqueCondos.size
  };
}

/**
 * Automated Financial Anomaly and Cost Intelligence Engine
 */
export function generateFinancialInsights(records: ReconciledRecord[]): any[] {
  const insights: any[] = [];

  // Group records by condominium and UC
  const byCode = new Map<string, ReconciledRecord[]>();
  records.forEach(r => {
    const list = byCode.get(r.installationCode) || [];
    list.push(r);
    byCode.set(r.installationCode, list);
  });

  // Check for large discrepancies
  const largeDiscrepancies = records.filter(r => r.reconciliationStatus === 'divergencia_valor' && Math.abs(r.difference) > 10);
  if (largeDiscrepancies.length > 0) {
    const totalDiff = largeDiscrepancies.reduce((a, b) => a + Math.abs(b.difference), 0);
    insights.push({
      id: 'discrepancy-summary',
      type: 'alert',
      title: `${largeDiscrepancies.length} Divergência(s) de Valor Detectada(s)`,
      description: `Inconsistência somando R$ ${totalDiff.toFixed(2)} entre a fatura e o ERP. Verifique reajustes ou juros.`,
      utilityType: 'luz',
      financialImpact: totalDiff,
      recommendation: 'Ajuste o valor no Contas a Pagar ou conteste a cobrança com a concessionária.'
    });
  }

  // Check for not billed / missing fixed expenses
  const missingBills = records.filter(r => r.reconciliationStatus === 'nao_lancada');
  if (missingBills.length > 0) {
    insights.push({
      id: 'missing-fixed-bills',
      type: 'warning',
      title: `${missingBills.length} Despesa(s) Fixa(s) Pendente(s) de Fatura no Mês`,
      description: `Existem despesas fixas recorrentes de condomínios que ainda não vieram na planilha .xlsx importada.`,
      utilityType: 'luz',
      recommendation: 'Verifique no portal da Celesc/Casan se as faturas deste mês já foram emitidas.'
    });
  }

  return insights;
}
