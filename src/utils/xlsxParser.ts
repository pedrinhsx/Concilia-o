import * as XLSX from 'xlsx';
import { UtilityBill, UtilityType, TariffFlag, ReconciledRecord } from '../types/reconciliation';

export interface ParsedSheetResult {
  fileName: string;
  sheetName: string;
  totalRows: number;
  detectedType: UtilityType | 'misto';
  bills: UtilityBill[];
  rawHeaders: string[];
  sampleRows: Record<string, any>[];
  warnings: string[];
}

// Clean string helper
function normalizeHeader(header: string): string {
  return String(header || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '_');
}

// Currency/number cleaner (supports Brazilian format "R$ 1.450,80" or "1450.80")
export function parseBrazilianNumber(val: any): number {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  
  let str = String(val).trim();
  // Remove currency symbols and spaces
  str = str.replace(/R\$/gi, '').replace(/\s+/g, '');
  
  // If format is 1.234,56
  if (str.includes(',') && str.includes('.')) {
    str = str.replace(/\./g, '').replace(',', '.');
  } else if (str.includes(',')) {
    str = str.replace(',', '.');
  }
  
  const parsed = parseFloat(str);
  return isNaN(parsed) ? 0 : Math.round(parsed * 100) / 100;
}

// Date normalizer
export function normalizeDate(val: any): string {
  if (!val) {
    const today = new Date();
    return today.toISOString().split('T')[0];
  }
  
  // If Excel numeric serial date (e.g. 45321)
  if (typeof val === 'number') {
    const excelEpoch = new Date(Math.round((val - 25569) * 86400 * 1000));
    if (!isNaN(excelEpoch.getTime())) {
      return excelEpoch.toISOString().split('T')[0];
    }
  }

  const str = String(val).trim();

  // Match DD/MM/YYYY or DD-MM-YYYY
  const brMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (brMatch) {
    const day = brMatch[1].padStart(2, '0');
    const month = brMatch[2].padStart(2, '0');
    const year = brMatch[3];
    return `${year}-${month}-${day}`;
  }

  // Match YYYY-MM-DD
  const isoMatch = str.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
  if (isoMatch) {
    const year = isoMatch[1];
    const month = isoMatch[2].padStart(2, '0');
    const day = isoMatch[3].padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Fallback to Date object parsing
  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    return d.toISOString().split('T')[0];
  }

  return new Date().toISOString().split('T')[0];
}

// Normalize competence string to "YYYY-MM"
export function normalizeCompetence(val: any, fallbackDate?: string): string {
  if (!val && fallbackDate) {
    return fallbackDate.substring(0, 7);
  }
  if (!val) {
    return new Date().toISOString().substring(0, 7);
  }

  const str = String(val).trim().toUpperCase();

  // Match MM/YYYY
  const mmyyyy = str.match(/^(\d{1,2})[\/\-](\d{4})$/);
  if (mmyyyy) {
    return `${mmyyyy[2]}-${mmyyyy[1].padStart(2, '0')}`;
  }

  // Match YYYY-MM
  const yyyymm = str.match(/^(\d{4})[\/\-](\d{1,2})$/);
  if (yyyymm) {
    return `${yyyymm[1]}-${yyyymm[2].padStart(2, '0')}`;
  }

  // Month abbreviations in Portuguese: JAN/24, FEV/2024, etc.
  const monthsPt: Record<string, string> = {
    'JAN': '01', 'FEV': '02', 'MAR': '03', 'ABR': '04',
    'MAI': '05', 'JUN': '06', 'JUL': '07', 'AGO': '08',
    'SET': '09', 'OUT': '10', 'NOV': '11', 'DEZ': '12'
  };

  for (const [mName, mNum] of Object.entries(monthsPt)) {
    if (str.includes(mName)) {
      const yearMatch = str.match(/(\d{2,4})/);
      let year = yearMatch ? yearMatch[1] : '2024';
      if (year.length === 2) year = `20${year}`;
      return `${year}-${mNum}`;
    }
  }

  if (fallbackDate && fallbackDate.length >= 7) {
    return fallbackDate.substring(0, 7);
  }

  return '2024-01';
}

// Detect tariff flag for electricity
function detectTariffFlag(val: any): TariffFlag {
  if (!val) return 'verde';
  const str = String(val).toLowerCase();
  if (str.includes('vermelha 2') || str.includes('vermelha p2') || str.includes('vermelha_2')) return 'vermelha_2';
  if (str.includes('vermelha 1') || str.includes('vermelha p1') || str.includes('vermelha_1') || str.includes('vermelha')) return 'vermelha_1';
  if (str.includes('amarela')) return 'amarela';
  if (str.includes('escassez')) return 'escassez_hidrica';
  if (str.includes('verde')) return 'verde';
  return 'verde';
}

// Read and parse an Excel/CSV file from browser ArrayBuffer
export async function parseExcelReport(
  buffer: ArrayBuffer,
  fileName: string,
  forcedUtilityType?: UtilityType
): Promise<ParsedSheetResult> {
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
  
  if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
    throw new Error('A planilha selecionada está vazia ou não possui abas válidas.');
  }

  // Prefer first active sheet or sheet named 'Luz', 'Energia', 'Agua', 'Internet', 'Contas'
  let targetSheetName = workbook.SheetNames[0];
  for (const name of workbook.SheetNames) {
    const lower = name.toLowerCase();
    if (lower.includes('luz') || lower.includes('energia') || lower.includes('agua') || lower.includes('internet') || lower.includes('relat')) {
      targetSheetName = name;
      break;
    }
  }

  const worksheet = workbook.Sheets[targetSheetName];
  const rawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

  if (rawRows.length === 0) {
    throw new Error(`A aba "${targetSheetName}" não contém linhas com dados.`);
  }

  const rawHeaders = Object.keys(rawRows[0] || {});
  const warnings: string[] = [];

  // Map header aliases
  const headerMap: Record<string, string> = {};
  for (const h of rawHeaders) {
    const norm = normalizeHeader(h);
    headerMap[norm] = h;
  }

  // Helper to find header key
  const findHeader = (candidates: string[]): string | undefined => {
    for (const c of candidates) {
      if (headerMap[c]) return headerMap[c];
      for (const [norm, orig] of Object.entries(headerMap)) {
        if (norm.includes(c)) return orig;
      }
    }
    return undefined;
  };

  const colDueDate = findHeader(['vencimento', 'data_vencimento', 'dt_venc', 'venc', 'data_de_vencimento', 'dt_vencto']);
  const colCompetence = findHeader(['competencia', 'mes_referencia', 'mes_ref', 'periodo', 'mes', 'ref', 'competencia_mes']);
  const colAmount = findHeader(['valor', 'valor_total', 'valor_faturado', 'vl_total', 'vl_fatura', 'total', 'valor_original', 'valor_a_pagar']);
  const colProvider = findHeader(['fornecedor', 'concessionaria', 'prestador', 'empresa', 'distribuidora', 'descricao_fornecedor']);
  const colCode = findHeader(['uc', 'unidade_consumidora', 'matricula', 'instalacao', 'cdc', 'codigo', 'codigo_instalacao', 'conta_contrato', 'rgi', 'codigo_cliente']);
  const colCondo = findHeader(['condominio', 'nome_condominio', 'nome_do_condominio', 'cliente', 'razao_social', 'unidade', 'filial', 'centro_de_custo', 'imovel', 'predio', 'local']);
  const colType = findHeader(['tipo', 'categoria', 'tipo_despesa', 'servico', 'utilidade', 'tipo_utilidade']);
  const colInvoice = findHeader(['numero_nota', 'nota_fiscal', 'fatura', 'nf', 'numero_fatura', 'documento']);

  // Detect overall type
  let detectedType: UtilityType | 'misto' = forcedUtilityType || 'luz';
  if (!forcedUtilityType) {
    const fileLower = fileName.toLowerCase();
    if (fileLower.includes('agua') || fileLower.includes('casan') || fileLower.includes('sanepar') || fileLower.includes('sabesp')) {
      detectedType = 'agua';
    } else if (fileLower.includes('internet') || fileLower.includes('telecom') || fileLower.includes('vivo') || fileLower.includes('claro')) {
      detectedType = 'internet';
    } else if (fileLower.includes('luz') || fileLower.includes('celesc') || fileLower.includes('energia') || fileLower.includes('enel') || fileLower.includes('cpfl')) {
      detectedType = 'luz';
    } else if (fileLower.includes('misto') || fileLower.includes('consolid') || fileLower.includes('geral')) {
      detectedType = 'misto';
    }
  }

  const bills: UtilityBill[] = [];

  rawRows.forEach((row, index) => {
    // Extract row values
    const rawAmount = colAmount ? row[colAmount] : row[rawHeaders.find(h => /valor|total/i.test(h)) || ''];
    const billedAmount = parseBrazilianNumber(rawAmount);

    if (billedAmount <= 0 && !row[colDueDate || ''] && !row[colCode || ''] && !row[colCondo || '']) {
      // Skip empty separator rows
      return;
    }

    const dueDate = colDueDate ? normalizeDate(row[colDueDate]) : normalizeDate(new Date());
    const rawCompetence = colCompetence ? row[colCompetence] : undefined;
    const competence = normalizeCompetence(rawCompetence, dueDate);

    // Determine row utility type
    let rowType: UtilityType = detectedType === 'misto' ? 'luz' : (detectedType as UtilityType);
    if (colType && row[colType]) {
      const typeStr = String(row[colType]).toLowerCase();
      if (typeStr.includes('agu') || typeStr.includes('sanea') || typeStr.includes('casan')) rowType = 'agua';
      else if (typeStr.includes('inter') || typeStr.includes('tele') || typeStr.includes('fibra')) rowType = 'internet';
      else if (typeStr.includes('luz') || typeStr.includes('energ') || typeStr.includes('celesc') || typeStr.includes('eletri')) rowType = 'luz';
    }

    // Determine provider (Fornecedor)
    let provider = colProvider && row[colProvider] ? String(row[colProvider]).trim() : '';
    if (!provider) {
      if (rowType === 'luz') provider = 'Celesc Distribuição';
      else if (rowType === 'agua') provider = 'Casan';
      else provider = 'Vivo Fibra';
    }

    // Determine installation code (Unidade Consumidora / UC)
    let installationCode = colCode && row[colCode] ? String(row[colCode]).trim() : '';
    if (!installationCode) {
      installationCode = `UC-${1000 + index}`;
    }

    // Determine condominium name
    let condoName = colCondo && row[colCondo] ? String(row[colCondo]).trim() : '';
    if (!condoName) {
      condoName = `Condomínio ${index + 1}`;
    }

    const invoiceNumber = colInvoice && row[colInvoice] ? String(row[colInvoice]).trim() : `FAT-${competence.replace('-', '')}-${index + 1}`;

    bills.push({
      id: `bill-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 7)}`,
      utilityType: rowType,
      provider,
      installationCode,
      condoName,
      competence,
      dueDate,
      billedAmount,
      invoiceNumber,
      status: 'aberto',
      importedFromFileName: fileName,
      importedAt: new Date().toISOString(),
      notes: `Importado de ${fileName}`
    });
  });

  return {
    fileName,
    sheetName: targetSheetName,
    totalRows: rawRows.length,
    detectedType,
    bills,
    rawHeaders,
    sampleRows: rawRows.slice(0, 5),
    warnings
  };
}

// Generate an official Brazilian Excel template (.xlsx) for users to download
export function generateSampleExcelTemplate(): void {
  const wb = XLSX.utils.book_new();

  // 1. Sheet Energia Elétrica (Luz)
  const luzHeaders = [
    'Condomínio', 'Unidade Consumidora (UC)', 'Fornecedor', 'Competência', 'Data Vencimento', 
    'Valor Faturado (R$)', 'Nº Fatura', 'Status'
  ];
  const luzData = [
    ['Residencial Solar das Palmeiras', '9872134', 'Celesc Distribuição', '04/2024', '15/05/2024', 3420.50, 'FAT-202404-01', 'Aberto'],
    ['Condomínio Edifício Bellagio', '4512903', 'Celesc Distribuição', '04/2024', '18/05/2024', 1890.15, 'FAT-202404-02', 'Aberto'],
    ['Edifício Jardins do Vale', '1092834', 'Celesc Distribuição', '04/2024', '20/05/2024', 2110.80, 'FAT-202404-03', 'Aberto'],
    ['Condomínio Bella Vista', '7781920', 'Celesc Distribuição', '04/2024', '22/05/2024', 2740.00, 'FAT-202404-04', 'Aberto']
  ];
  const wsLuz = XLSX.utils.aoa_to_sheet([luzHeaders, ...luzData]);
  wsLuz['!cols'] = [{ wch: 32 }, { wch: 22 }, { wch: 22 }, { wch: 14 }, { wch: 16 }, { wch: 18 }, { wch: 16 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, wsLuz, 'Relatório Luz (Celesc)');

  // 2. Sheet Água e Esgoto
  const aguaHeaders = [
    'Condomínio', 'Matrícula / UC', 'Fornecedor', 'Competência', 'Data Vencimento',
    'Valor Faturado (R$)', 'Nº Fatura', 'Status'
  ];
  const aguaData = [
    ['Residencial Solar das Palmeiras', '9872134', 'Casan', '04/2024', '18/05/2024', 642.80, 'CAS-202404-01', 'Aberto'],
    ['Condomínio Edifício Bellagio', '4512903', 'Casan', '04/2024', '20/05/2024', 498.40, 'CAS-202404-02', 'Aberto']
  ];
  const wsAgua = XLSX.utils.aoa_to_sheet([aguaHeaders, ...aguaData]);
  wsAgua['!cols'] = [{ wch: 32 }, { wch: 20 }, { wch: 20 }, { wch: 14 }, { wch: 16 }, { wch: 18 }, { wch: 16 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, wsAgua, 'Relatório Água (Casan)');

  // 3. Sheet Internet / Telecom
  const telecomHeaders = [
    'Condomínio', 'Código Contrato', 'Fornecedor', 'Competência', 'Data Vencimento',
    'Valor Faturado (R$)', 'Nº Fatura', 'Status'
  ];
  const telecomData = [
    ['Residencial Solar das Palmeiras', 'CTR-99210', 'Vivo Fibra', '04/2024', '25/05/2024', 189.90, 'VIV-202404-01', 'Aberto'],
    ['Condomínio Edifício Bellagio', 'CTR-55102', 'Claro Telecom', '04/2024', '28/05/2024', 160.00, 'CLA-202404-02', 'Aberto']
  ];
  const wsTelecom = XLSX.utils.aoa_to_sheet([telecomHeaders, ...telecomData]);
  wsTelecom['!cols'] = [{ wch: 32 }, { wch: 20 }, { wch: 20 }, { wch: 14 }, { wch: 16 }, { wch: 18 }, { wch: 16 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, wsTelecom, 'Relatório Internet');

  XLSX.writeFile(wb, 'Modelo_Relatorio_Contas_Condominios.xlsx');
}

// Export reconciled analysis results to a styled Excel spreadsheet
export function exportReconciliationToExcel(
  records: ReconciledRecord[],
  fileName: string = 'Relatorio_Conciliacao_Condominios.xlsx'
): void {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Todos os Lançamentos Conciliados
  const mainHeaders = [
    'Status Conciliação', 'Tipo Utilidade', 'Condomínio', 'UC / Matrícula', 'Fornecedor',
    'Competência', 'Data Vencimento', 'Valor Fatura (.xlsx)', 'Valor Lançado (ERP)',
    'Diferença (R$)', 'Notas de Auditoria'
  ];

  const mainRows = records.map(r => [
    r.reconciliationStatus === 'conciliado' ? 'CONCILIADO' :
    r.reconciliationStatus === 'divergencia_valor' ? 'DIVERGÊNCIA' :
    r.reconciliationStatus === 'nao_lancada' ? 'NÃO LANÇADA' :
    r.reconciliationStatus === 'pendente_pagamento' ? 'PENDENTE BAIXA' :
    r.reconciliationStatus === 'lancamento_sem_fatura' ? 'SEM FATURA ANEXADA' : 'DUPLICIDADE',
    r.utilityType.toUpperCase(),
    r.condoName,
    r.installationCode,
    r.provider,
    r.competence,
    r.dueDate,
    r.billedAmount,
    r.ledgerAmount,
    r.difference,
    r.auditNotes || ''
  ]);

  const wsMain = XLSX.utils.aoa_to_sheet([mainHeaders, ...mainRows]);
  wsMain['!cols'] = [
    { wch: 18 }, { wch: 14 }, { wch: 32 }, { wch: 18 }, { wch: 22 },
    { wch: 14 }, { wch: 16 }, { wch: 18 }, { wch: 18 }, { wch: 15 }, { wch: 30 }
  ];
  XLSX.utils.book_append_sheet(wb, wsMain, 'Painel de Conciliação');

  // Sheet 2: Somente Divergências e Pendências
  const issues = records.filter(r => r.reconciliationStatus !== 'conciliado');
  const issueRows = issues.map(r => [
    r.reconciliationStatus.toUpperCase(),
    r.utilityType.toUpperCase(),
    r.condoName,
    r.installationCode,
    r.provider,
    r.competence,
    r.billedAmount,
    r.ledgerAmount,
    r.difference,
    r.auditNotes || 'Requer conferência com fornecedor'
  ]);
  const wsIssues = XLSX.utils.aoa_to_sheet([
    ['Status', 'Tipo', 'Condomínio', 'UC', 'Fornecedor', 'Competência', 'Valor Fatura', 'Valor ERP', 'Diferença', 'Ação'],
    ...issueRows
  ]);
  XLSX.utils.book_append_sheet(wb, wsIssues, 'Pendências & Divergências');

  // Sheet 3: Resumo Executivo
  const totalBilled = records.reduce((acc, r) => acc + r.billedAmount, 0);
  const totalLedger = records.reduce((acc, r) => acc + r.ledgerAmount, 0);
  const totalDiff = records.reduce((acc, r) => acc + Math.abs(r.difference), 0);
  const conciliados = records.filter(r => r.reconciliationStatus === 'conciliado').length;
  const taxaConciliacao = records.length > 0 ? ((conciliados / records.length) * 100).toFixed(1) + '%' : '0%';

  const summaryData = [
    ['RESUMO EXECUTIVO DE CONCILIAÇÃO FINANCEIRA', ''],
    ['Data do Relatório', new Date().toLocaleDateString('pt-BR')],
    ['Total de Contas Analisadas', records.length],
    ['Contas Conciliadas com Sucesso', conciliados],
    ['Taxa de Conciliação', taxaConciliacao],
    ['', ''],
    ['Total Faturado Concessionárias (R$)', totalBilled],
    ['Total Lançado no Contas a Pagar (R$)', totalLedger],
    ['Soma das Divergências Monetárias (R$)', totalDiff],
    ['', ''],
    ['DISTRIBUIÇÃO POR UTILIDADE', 'TOTAL FATURADO (R$)'],
    ['Energia Elétrica (Luz)', records.filter(r => r.utilityType === 'luz').reduce((a, b) => a + b.billedAmount, 0)],
    ['Água e Esgoto', records.filter(r => r.utilityType === 'agua').reduce((a, b) => a + b.billedAmount, 0)],
    ['Internet e Telecom', records.filter(r => r.utilityType === 'internet').reduce((a, b) => a + b.billedAmount, 0)]
  ];
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
  wsSummary['!cols'] = [{ wch: 36 }, { wch: 24 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumo Executivo');

  XLSX.writeFile(wb, fileName);
}
