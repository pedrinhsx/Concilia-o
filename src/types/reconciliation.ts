export type UtilityType = 'luz' | 'agua' | 'internet';

export type TariffFlag = 'verde' | 'amarela' | 'vermelha_1' | 'vermelha_2' | 'escassez_hidrica' | 'n_a';

export type ReconciliationStatus = 
  | 'conciliado'           // 100% matched
  | 'divergencia_valor'    // Matched bill & ledger, but amounts differ
  | 'pendente_pagamento'   // Bill exists in report, not found in financial ledger
  | 'lancamento_sem_fatura'// Paid in bank/ledger, but missing supplier bill
  | 'duplicidade';         // Duplicate bill/ledger for the same competence

export interface UtilityBill {
  id: string;
  utilityType: UtilityType;
  provider: string; // e.g., 'Enel SP', 'Sabesp', 'Vivo Fibra', 'CPFL', 'Claro'
  installationCode: string; // Código do Cliente / CDC / Matrícula / Instalação
  unitName: string; // 'Sede Matriz', 'Filial 01', 'Galpão Logístico'
  competence: string; // '2024-01' (YYYY-MM)
  dueDate: string; // 'YYYY-MM-DD'
  issueDate?: string;
  invoiceNumber?: string;
  
  // Financial amounts
  billedAmount: number; // Valor Faturado pela Concessionária (R$)
  consumptionValue?: number; // kWh para luz, m³ para água, Mbps para internet
  consumptionUnit?: 'kWh' | 'm³' | 'Mbps';
  tariffFlag?: TariffFlag; // Para energia elétrica
  
  // Taxes / charges breakdown (optional)
  publicLightingFee?: number; // CIP / COSIP
  meterReadingStart?: number;
  meterReadingEnd?: number;
  
  status: 'aberto' | 'pago' | 'vencido' | 'em_processamento';
  paidAmount?: number;
  paymentDate?: string;
  notes?: string;
  importedFromFileName?: string;
  importedAt?: string;
}

export interface LedgerEntry {
  id: string;
  utilityType: UtilityType;
  provider: string;
  installationCode: string;
  unitName: string;
  competence: string; // 'YYYY-MM'
  expectedDate: string;
  actualPaymentDate?: string;
  ledgerAmount: number; // Valor lançado no ERP / Contas a Pagar (R$)
  paymentAccount?: string; // e.g., 'Banco Itaú 1234-5', 'Bradesco 9876-0'
  documentNumber?: string;
  status: 'provisionado' | 'liquidado' | 'estornado';
  notes?: string;
}

export interface ReconciledRecord {
  id: string;
  billId?: string;
  ledgerId?: string;
  utilityType: UtilityType;
  provider: string;
  installationCode: string;
  unitName: string;
  competence: string; // 'YYYY-MM'
  dueDate: string;
  
  // Comparative figures
  billedAmount: number;
  ledgerAmount: number;
  difference: number; // billedAmount - ledgerAmount
  
  consumptionValue?: number;
  consumptionUnit?: 'kWh' | 'm³' | 'Mbps';
  tariffFlag?: TariffFlag;
  
  reconciliationStatus: ReconciliationStatus;
  reconciliationDate?: string;
  reconciledBy?: string;
  auditNotes?: string;
  
  // Raw links
  bill?: UtilityBill;
  ledger?: LedgerEntry;
}

export interface UtilityInstallation {
  id: string;
  utilityType: UtilityType;
  provider: string;
  code: string; // Código de instalação
  unitName: string;
  nickname: string;
  address?: string;
  averageConsumption?: number;
  baselineCost?: number;
  autoReconcileTolerance: number; // Tolerância em R$ para conciliação automática (ex: R$ 0.05)
}

export interface FinancialSummary {
  totalBilled: number;
  totalLedger: number;
  totalReconciled: number;
  totalDiscrepancyAmount: number;
  totalPendingPayment: number;
  
  countTotal: number;
  countReconciled: number;
  countDiscrepancies: number;
  countPending: number;
  countUnbilled: number;
  
  reconciliationRate: number; // percentage 0-100
  
  byUtility: {
    luz: {
      total: number;
      consumptionTotal: number; // total kWh
      avgCostPerKwh: number;
      count: number;
      discrepancyCount: number;
    };
    agua: {
      total: number;
      consumptionTotal: number; // total m³
      avgCostPerM3: number;
      count: number;
      discrepancyCount: number;
    };
    internet: {
      total: number;
      count: number;
      discrepancyCount: number;
      avgMonthly: number;
    };
  };
}

export interface AnomalyInsight {
  id: string;
  type: 'alert' | 'warning' | 'info' | 'success';
  title: string;
  description: string;
  utilityType: UtilityType;
  installationCode?: string;
  unitName?: string;
  competence?: string;
  financialImpact?: number;
  recommendation?: string;
}

export interface FilterState {
  utilityType: 'todas' | UtilityType;
  reconciliationStatus: 'todos' | ReconciliationStatus;
  competence: string; // 'todas' or 'YYYY-MM'
  unitName: string; // 'todas' or specific unit
  searchTerm: string;
}
