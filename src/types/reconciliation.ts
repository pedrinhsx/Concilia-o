export type UtilityType = 'luz' | 'agua' | 'internet';

export type TariffFlag = 'verde' | 'amarela' | 'vermelha_1' | 'vermelha_2' | 'escassez_hidrica' | 'n_a';

export type ReconciliationStatus = 
  | 'conciliado'           // 100% batido com fatura
  | 'divergencia_valor'    // Encontrado com diferença de valor
  | 'nao_lancada'          // Despesa fixa prevista que NÃO veio no .xlsx do mês
  | 'pendente_pagamento'   // Fatura presente no .xlsx, pendente no financeiro/ERP
  | 'lancamento_sem_fatura'// Lançado no financeiro sem o arquivo .xlsx
  | 'duplicidade';

export interface Condominium {
  id: string;
  name: string; // Nome do Condomínio
  uc: string;   // Unidade Consumidora / Matrícula (ex: Celesc, Casan)
  address?: string;
  notes?: string;
}

export interface FixedProvider {
  id: string;
  name: string; // Ex: "Celesc Distribuição", "Casan", "Vivo Fibra", "Claro Telecom"
  utilityType: UtilityType;
  notes?: string;
}

export interface FixedExpense {
  id: string;
  condoId?: string;
  condoName: string; // Nome do Condomínio
  uc: string;        // Unidade Consumidora / Matrícula
  provider: string;  // Nome do Fornecedor (ex: Celesc)
  utilityType: UtilityType;
  expectedDay: number; // Dia previsto de vencimento (ex: 10, 15, 20)
  estimatedAmount?: number;
  active: boolean;
  notes?: string;
}

export interface UtilityBill {
  id: string;
  utilityType: UtilityType;
  provider: string; // Ex: 'Celesc Distribuição', 'Casan', 'Vivo Fibra'
  installationCode: string; // Unidade Consumidora / UC / Matrícula
  condoName: string; // Nome do Condomínio (antigo unitName)
  competence: string; // '2024-04' (YYYY-MM)
  dueDate: string; // 'YYYY-MM-DD'
  issueDate?: string;
  invoiceNumber?: string;
  
  billedAmount: number; // Valor Faturado (R$)
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
  installationCode: string; // UC / Matrícula
  condoName: string; // Nome do Condomínio
  competence: string; // 'YYYY-MM'
  expectedDate: string;
  actualPaymentDate?: string;
  ledgerAmount: number; // Valor no ERP / Livro Caixa (R$)
  paymentAccount?: string;
  documentNumber?: string;
  status: 'provisionado' | 'liquidado' | 'estornado';
  notes?: string;
}

export interface ReconciledRecord {
  id: string;
  billId?: string;
  ledgerId?: string;
  fixedExpenseId?: string;
  
  utilityType: UtilityType;
  provider: string; // Fornecedor (ex: Celesc, Casan, Vivo)
  installationCode: string; // Unidade Consumidora / Matrícula (UC)
  condoName: string; // Nome do Condomínio
  
  competence: string; // 'YYYY-MM'
  dueDate: string;
  
  billedAmount: number;
  ledgerAmount: number;
  difference: number; // billedAmount - ledgerAmount
  
  reconciliationStatus: ReconciliationStatus;
  reconciliationDate?: string;
  reconciledBy?: string;
  auditNotes?: string;
  
  bill?: UtilityBill;
  ledger?: LedgerEntry;
  consumptionValue?: number;
  consumptionUnit?: string;
  tariffFlag?: TariffFlag;
  unitName?: string;
}

export interface AnomalyInsight {
  id: string;
  type: 'alert' | 'warning' | 'info' | 'success';
  title: string;
  description: string;
  utilityType: UtilityType;
  financialImpact?: number;
  recommendation?: string;
}

export interface UtilityInstallation {
  id: string;
  utilityType: UtilityType;
  provider: string;
  code: string;
  unitName: string;
  description?: string;
  averageMonthlyCost?: number;
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
  countNotBilled: number; // Não lançadas
  countUnbilled: number;
  
  reconciliationRate: number; // percentage 0-100
  totalCondosCount: number;
}

export interface FilterState {
  utilityType: 'todas' | UtilityType;
  reconciliationStatus: 'todos' | ReconciliationStatus;
  competence: string; // 'todas' or specific 'YYYY-MM'
  condoName: string; // 'todas' or specific Condomínio
  providerName: string; // 'todas' or specific Fornecedor
  searchTerm: string;
}
