import { 
  UtilityBill, 
  LedgerEntry, 
  ReconciledRecord, 
  ReconciliationStatus, 
  FinancialSummary, 
  AnomalyInsight 
} from '../types/reconciliation';

// Default tolerance in Reais (R$) to consider matched (to account for rounding pennies)
export const DEFAULT_TOLERANCE = 0.05;

/**
 * Reconcile a list of imported utility bills with internal ledger entries
 */
export function runReconciliation(
  bills: UtilityBill[],
  ledgerEntries: LedgerEntry[],
  tolerance: number = DEFAULT_TOLERANCE
): ReconciledRecord[] {
  const reconciledList: ReconciledRecord[] = [];
  const matchedLedgerIds = new Set<string>();

  // Process all bills from the uploaded report
  bills.forEach((bill) => {
    // Attempt to match with a ledger entry:
    // Criteria: same utility type, matching installation code (or provider) and same competence
    let candidates = ledgerEntries.filter(l => 
      !matchedLedgerIds.has(l.id) &&
      l.utilityType === bill.utilityType &&
      l.competence === bill.competence
    );

    // Prefer exact installation code match
    let bestMatch = candidates.find(l => 
      l.installationCode.toLowerCase().replace(/\D/g, '') === bill.installationCode.toLowerCase().replace(/\D/g, '') ||
      l.installationCode.toLowerCase() === bill.installationCode.toLowerCase()
    );

    // Fallback: match by provider and unit if code wasn't specified
    if (!bestMatch) {
      bestMatch = candidates.find(l => 
        l.unitName.toLowerCase() === bill.unitName.toLowerCase() &&
        (l.provider.toLowerCase().includes(bill.provider.toLowerCase()) || bill.provider.toLowerCase().includes(l.provider.toLowerCase()))
      );
    }

    if (bestMatch) {
      matchedLedgerIds.add(bestMatch.id);
      const diff = Math.round((bill.billedAmount - bestMatch.ledgerAmount) * 100) / 100;
      let status: ReconciliationStatus = 'conciliado';
      let auditNotes = 'Valores e competência conferidos automaticamente.';

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
        unitName: bill.unitName || bestMatch.unitName,
        competence: bill.competence,
        dueDate: bill.dueDate || bestMatch.expectedDate,
        billedAmount: bill.billedAmount,
        ledgerAmount: bestMatch.ledgerAmount,
        difference: diff,
        consumptionValue: bill.consumptionValue,
        consumptionUnit: bill.consumptionUnit,
        tariffFlag: bill.tariffFlag,
        reconciliationStatus: status,
        reconciliationDate: new Date().toISOString(),
        reconciledBy: 'Motor Automático',
        auditNotes,
        bill,
        ledger: bestMatch
      });
    } else {
      // Bill exists in report, but no ledger entry found in finance
      reconciledList.push({
        id: `rec-unmatched-bill-${bill.id}`,
        billId: bill.id,
        utilityType: bill.utilityType,
        provider: bill.provider,
        installationCode: bill.installationCode,
        unitName: bill.unitName,
        competence: bill.competence,
        dueDate: bill.dueDate,
        billedAmount: bill.billedAmount,
        ledgerAmount: 0,
        difference: bill.billedAmount,
        consumptionValue: bill.consumptionValue,
        consumptionUnit: bill.consumptionUnit,
        tariffFlag: bill.tariffFlag,
        reconciliationStatus: 'pendente_pagamento',
        auditNotes: 'Fatura importada do relatório .xlsx, porém ainda não registrada no Contas a Pagar.',
        bill
      });
    }
  });

  // Find remaining ledger entries that had no corresponding supplier bill
  ledgerEntries.forEach((ledger) => {
    if (!matchedLedgerIds.has(ledger.id)) {
      reconciledList.push({
        id: `rec-unmatched-ledger-${ledger.id}`,
        ledgerId: ledger.id,
        utilityType: ledger.utilityType,
        provider: ledger.provider,
        installationCode: ledger.installationCode,
        unitName: ledger.unitName,
        competence: ledger.competence,
        dueDate: ledger.expectedDate,
        billedAmount: 0,
        ledgerAmount: ledger.ledgerAmount,
        difference: -ledger.ledgerAmount,
        reconciliationStatus: 'lancamento_sem_fatura',
        auditNotes: 'Lançamento financeiro ativo sem o arquivo .xlsx correspondente anexado da concessionária.',
        ledger
      });
    }
  });

  // Sort primarily by dueDate (vencimento) ascending (earliest to latest)
  return reconciledList.sort((a, b) => {
    const dateA = a.dueDate || '';
    const dateB = b.dueDate || '';
    if (!dateA && !dateB) return b.competence.localeCompare(a.competence);
    if (!dateA) return 1;
    if (!dateB) return -1;
    return dateA.localeCompare(dateB) || b.competence.localeCompare(a.competence);
  });
}

/**
 * Calculate financial totals and KPI metrics
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
  let countUnbilled = 0;

  let luzTotal = 0;
  let luzKwhTotal = 0;
  let luzCount = 0;
  let luzDiscCount = 0;

  let aguaTotal = 0;
  let aguaM3Total = 0;
  let aguaCount = 0;
  let aguaDiscCount = 0;

  let internetTotal = 0;
  let internetCount = 0;
  let internetDiscCount = 0;

  records.forEach((r) => {
    const effectiveAmount = r.billedAmount > 0 ? r.billedAmount : r.ledgerAmount;
    totalBilled += r.billedAmount;
    totalLedger += r.ledgerAmount;

    if (r.reconciliationStatus === 'conciliado') {
      countReconciled++;
      totalReconciled += effectiveAmount;
    } else if (r.reconciliationStatus === 'divergencia_valor') {
      countDiscrepancies++;
      totalDiscrepancyAmount += Math.abs(r.difference);
    } else if (r.reconciliationStatus === 'pendente_pagamento') {
      countPending++;
      totalPendingPayment += r.billedAmount;
    } else if (r.reconciliationStatus === 'lancamento_sem_fatura') {
      countUnbilled++;
    }

    if (r.utilityType === 'luz') {
      luzTotal += effectiveAmount;
      luzCount++;
      if (r.consumptionValue && r.consumptionUnit === 'kWh') {
        luzKwhTotal += r.consumptionValue;
      }
      if (r.reconciliationStatus !== 'conciliado') luzDiscCount++;
    } else if (r.utilityType === 'agua') {
      aguaTotal += effectiveAmount;
      aguaCount++;
      if (r.consumptionValue && r.consumptionUnit === 'm³') {
        aguaM3Total += r.consumptionValue;
      }
      if (r.reconciliationStatus !== 'conciliado') aguaDiscCount++;
    } else if (r.utilityType === 'internet') {
      internetTotal += effectiveAmount;
      internetCount++;
      if (r.reconciliationStatus !== 'conciliado') internetDiscCount++;
    }
  });

  const countTotal = records.length;
  const reconciliationRate = countTotal > 0 ? Math.round((countReconciled / countTotal) * 100) : 0;

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
    countUnbilled,
    reconciliationRate,
    byUtility: {
      luz: {
        total: Math.round(luzTotal * 100) / 100,
        consumptionTotal: luzKwhTotal,
        avgCostPerKwh: luzKwhTotal > 0 ? Math.round((luzTotal / luzKwhTotal) * 100) / 100 : 0,
        count: luzCount,
        discrepancyCount: luzDiscCount
      },
      agua: {
        total: Math.round(aguaTotal * 100) / 100,
        consumptionTotal: aguaM3Total,
        avgCostPerM3: aguaM3Total > 0 ? Math.round((aguaTotal / aguaM3Total) * 100) / 100 : 0,
        count: aguaCount,
        discrepancyCount: aguaDiscCount
      },
      internet: {
        total: Math.round(internetTotal * 100) / 100,
        count: internetCount,
        discrepancyCount: internetDiscCount,
        avgMonthly: internetCount > 0 ? Math.round((internetTotal / internetCount) * 100) / 100 : 0
      }
    }
  };
}

/**
 * Automated Financial Anomaly and Cost Intelligence Engine
 */
export function generateFinancialInsights(records: ReconciledRecord[]): AnomalyInsight[] {
  const insights: AnomalyInsight[] = [];

  // Group records by installation code to detect timeline consumption spikes
  const byCode = new Map<string, ReconciledRecord[]>();
  records.forEach(r => {
    const list = byCode.get(r.installationCode) || [];
    list.push(r);
    byCode.set(r.installationCode, list);
  });

  // 1. Water Leak / Abnormal Consumption Spike Detection
  byCode.forEach((recordsList, code) => {
    const sorted = [...recordsList].sort((a, b) => a.competence.localeCompare(b.competence));
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1];
      const curr = sorted[i];

      if (curr.utilityType === 'agua' && prev.consumptionValue && curr.consumptionValue) {
        const consumptionJump = ((curr.consumptionValue - prev.consumptionValue) / prev.consumptionValue) * 100;
        if (consumptionJump >= 35) {
          insights.push({
            id: `spike-water-${curr.id}`,
            type: 'alert',
            title: `Alerta de Vazamento / Salto Hídrico (+${consumptionJump.toFixed(0)}%)`,
            description: `Na unidade ${curr.unitName} (${curr.provider}), o consumo saltou de ${prev.consumptionValue} m³ (${prev.competence}) para ${curr.consumptionValue} m³ (${curr.competence}). A fatura aumentou R$ ${(curr.billedAmount - prev.billedAmount).toFixed(2)}.`,
            utilityType: 'agua',
            installationCode: code,
            unitName: curr.unitName,
            competence: curr.competence,
            financialImpact: curr.billedAmount - prev.billedAmount,
            recommendation: 'Inspecione urgentemente válvulas de descarga, caixas d’água e hidrômetro para descartar vazamentos ocultos e solicitar revisão à concessionária.'
          });
        }
      }

      // Electricity spike
      if (curr.utilityType === 'luz' && prev.consumptionValue && curr.consumptionValue) {
        const jump = ((curr.consumptionValue - prev.consumptionValue) / prev.consumptionValue) * 100;
        if (jump >= 30) {
          insights.push({
            id: `spike-energy-${curr.id}`,
            type: 'warning',
            title: `Aumento Expressivo de Consumo Elétrico (+${jump.toFixed(0)}%)`,
            description: `Em ${curr.unitName}, o consumo subiu para ${curr.consumptionValue} kWh em ${curr.competence} (era ${prev.consumptionValue} kWh). Possível impacto de climatização ou maquinário fora de horário.`,
            utilityType: 'luz',
            installationCode: code,
            unitName: curr.unitName,
            competence: curr.competence,
            financialImpact: curr.billedAmount - prev.billedAmount,
            recommendation: 'Avaliar termostatos de ar condicionado e desligamento automático de servidores/estações aos fins de semana.'
          });
        }
      }
    }
  });

  // 2. Electricity Tariff Flags Impact (Bandeira Vermelha)
  const redFlagBills = records.filter(r => r.utilityType === 'luz' && (r.tariffFlag === 'vermelha_1' || r.tariffFlag === 'vermelha_2'));
  if (redFlagBills.length > 0) {
    const extraEstimated = redFlagBills.reduce((acc, r) => acc + (r.consumptionValue ? r.consumptionValue * 0.045 : 45), 0);
    insights.push({
      id: 'tariff-flag-alert',
      type: 'warning',
      title: 'Impacto Financeiro de Bandeiras Tarifárias ANEEL',
      description: `${redFlagBills.length} fatura(s) foram cobradas sob Bandeira Vermelha da ANEEL, gerando acréscimo tarifário estimado de ~R$ ${extraEstimated.toFixed(2)} em relação à tarifa base verde.`,
      utilityType: 'luz',
      financialImpact: extraEstimated,
      recommendation: 'Considere negociar migração para o Mercado Livre de Energia (ACL) ou instalar geração distribuída solar fotovoltaica para mitigar risco tarifário.'
    });
  }

  // 3. Significant Monetary Discrepancies
  const largeDiscrepancies = records.filter(r => r.reconciliationStatus === 'divergencia_valor' && Math.abs(r.difference) > 20);
  if (largeDiscrepancies.length > 0) {
    const totalDiff = largeDiscrepancies.reduce((a, b) => a + Math.abs(b.difference), 0);
    insights.push({
      id: 'discrepancy-summary',
      type: 'alert',
      title: `${largeDiscrepancies.length} Divergências Relevantes entre Relatório e ERP`,
      description: `Foram detectadas divergências somando R$ ${totalDiff.toFixed(2)}. Principais causas: multas por atraso na baixa bancária, juros e reajustes contratuais não provisionados.`,
      utilityType: 'luz',
      financialImpact: totalDiff,
      recommendation: 'Atualize os lançamentos no Contas a Pagar com a opção "Ajustar Valor Automaticamente" ou conteste a cobrança indevida junto à distribuidora.'
    });
  }

  // 4. Internet Plan Review Opportunity
  const internetRecords = records.filter(r => r.utilityType === 'internet');
  if (internetRecords.length >= 3) {
    const avgInternet = internetRecords.reduce((a, b) => a + (b.billedAmount || b.ledgerAmount), 0) / internetRecords.length;
    if (avgInternet > 400) {
      insights.push({
        id: 'telecom-optimization',
        type: 'info',
        title: 'Oportunidade de Benchmark em Telecom & Internet',
        description: `O custo médio de links corporativos está em R$ ${avgInternet.toFixed(2)}/mês por ponto. Planos corporativos de fibra óptica dedicados tiveram redução recente de até 25% no mercado B2B.`,
        utilityType: 'internet',
        recommendation: 'Solicite revisão contratual ou cotação de portabilidade para operadoras concorrentes com fidelidade vencida.'
      });
    }
  }

  // 5. Success Health Indicator
  const totalConciliated = records.filter(r => r.reconciliationStatus === 'conciliado').length;
  if (records.length > 0 && (totalConciliated / records.length) >= 0.75) {
    insights.push({
      id: 'high-compliance',
      type: 'success',
      title: 'Alto Índice de Conformidade Financeira',
      description: `${totalConciliated} de ${records.length} contas (${((totalConciliated / records.length) * 100).toFixed(0)}%) estão 100% conciliadas e auditadas sem inconsistências fiscais.`,
      utilityType: 'luz'
    });
  }

  return insights;
}
