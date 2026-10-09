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
  const colCode = findHeader(['instalacao', 'cdc', 'codigo', 'codigo_instalacao', 'matricula', 'uc', 'unidade_consumidora', 'conta_contrato', 'rgi', 'codigo_cliente']);
  const colUnit = findHeader(['unidade', 'filial', 'centro_de_custo', 'imovel', 'predio', 'local', 'localizacao', 'estabelecimento']);
  const colConsumption = findHeader(['consumo', 'kwh', 'm3', 'consumo_kwh', 'consumo_m3', 'medicao', 'leitura', 'mbps', 'mega']);
  const colType = findHeader(['tipo', 'categoria', 'tipo_despesa', 'servico', 'utilidade', 'tipo_utilidade']);
  const colFlag = findHeader(['bandeira', 'bandeira_tarifaria', 'tarifa']);
  const colInvoice = findHeader(['numero_nota', 'nota_fiscal', 'fatura', 'nf', 'numero_fatura', 'documento']);

  // Detect overall type
  let detectedType: UtilityType | 'misto' = forcedUtilityType || 'luz';
  if (!forcedUtilityType) {
    const fileLower = fileName.toLowerCase();
    if (fileLower.includes('agua') || fileLower.includes('sanepar') || fileLower.includes('sabesp')) {
      detectedType = 'agua';
    } else if (fileLower.includes('internet') || fileLower.includes('telecom') || fileLower.includes('vivo') || fileLower.includes('claro')) {
      detectedType = 'internet';
    } else if (fileLower.includes('luz') || fileLower.includes('energia') || fileLower.includes('enel') || fileLower.includes('cpfl')) {
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

    if (billedAmount <= 0 && !row[colDueDate || ''] && !row[colCode || '']) {
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
      if (typeStr.includes('agu') || typeStr.includes('sanea')) rowType = 'agua';
      else if (typeStr.includes('inter') || typeStr.includes('tele') || typeStr.includes('fibra')) rowType = 'internet';
      else if (typeStr.includes('luz') || typeStr.includes('energ') || typeStr.includes('eletri')) rowType = 'luz';
    }

    // Determine provider
    let provider = colProvider && row[colProvider] ? String(row[colProvider]).trim() : '';
    if (!provider) {
      if (rowType === 'luz') provider = 'Enel Distribuição';
      else if (rowType === 'agua') provider = 'Sabesp';
      else provider = 'Vivo Fibra';
    }

    // Determine installation code
    let installationCode = colCode && row[colCode] ? String(row[colCode]).trim() : '';
    if (!installationCode) {
      installationCode = `INST-${1000 + index}`;
    }

    // Determine unit
    let unitName = colUnit && row[colUnit] ? String(row[colUnit]).trim() : 'Sede Principal';

    // Consumption
    let consumptionValue: number | undefined = undefined;
    let consumptionUnit: 'kWh' | 'm³' | 'Mbps' | undefined = undefined;

    if (colConsumption && row[colConsumption] !== undefined && row[colConsumption] !== '') {
      consumptionValue = parseBrazilianNumber(row[colConsumption]);
      if (rowType === 'luz') consumptionUnit = 'kWh';
      else if (rowType === 'agua') consumptionUnit = 'm³';
      else consumptionUnit = 'Mbps';
    }

    const tariffFlag = (rowType === 'luz' && colFlag) ? detectTariffFlag(row[colFlag]) : (rowType === 'luz' ? 'verde' : 'n_a');
    const invoiceNumber = colInvoice && row[colInvoice] ? String(row[colInvoice]).trim() : `FAT-${competence.replace('-', '')}-${index + 1}`;

    bills.push({
      id: `bill-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 7)}`,
      utilityType: rowType,
      provider,
      installationCode,
      unitName,
      competence,
      dueDate,
      billedAmount,
      consumptionValue,
      consumptionUnit,
      tariffFlag,
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
    'Competência', 'Data Vencimento', 'Fornecedor', 'Código Instalação', 'Unidade / Filial', 
    'Consumo (kWh)', 'Bandeira Tarifária', 'Valor Faturado (R$)', 'Nº Fatura', 'Status'
  ];
  const luzData = [
    ['01/2024', '15/02/2024', 'Enel Distribuição SP', '4928104', 'Sede Matriz - Paulista', 4850, 'Verde', 3420.50, 'FAT-202401-01', 'Aberto'],
    ['02/2024', '15/03/2024', 'Enel Distribuição SP', '4928104', 'Sede Matriz - Paulista', 5120, 'Amarela', 3890.15, 'FAT-202402-01', 'Aberto'],
    ['03/2024', '15/04/2024', 'Enel Distribuição SP', '4928104', 'Sede Matriz - Paulista', 4980, 'Verde', 3510.80, 'FAT-202403-01', 'Aberto'],
    ['04/2024', '15/05/2024', 'Enel Distribuição SP', '4928104', 'Sede Matriz - Paulista', 4650, 'Verde', 3290.40, 'FAT-202404-01', 'Aberto'],
    ['01/2024', '20/02/2024', 'CPFL Paulista', '8812903', 'Filial Campinas', 2300, 'Verde', 1780.00, 'FAT-202401-02', 'Aberto'],
    ['02/2024', '20/03/2024', 'CPFL Paulista', '8812903', 'Filial Campinas', 2410, 'Amarela', 1950.40, 'FAT-202402-02', 'Aberto'],
    ['01/2024', '10/02/2024', 'Elektro', '7730192', 'Galpão Logística', 6800, 'Verde', 4920.00, 'FAT-202401-03', 'Aberto'],
    ['02/2024', '10/03/2024', 'Elektro', '7730192', 'Galpão Logística', 7100, 'Amarela', 5340.20, 'FAT-202402-03', 'Aberto']
  ];
  const wsLuz = XLSX.utils.aoa_to_sheet([luzHeaders, ...luzData]);
  wsLuz['!cols'] = [{ wch: 14 }, { wch: 16 }, { wch: 22 }, { wch: 18 }, { wch: 26 }, { wch: 15 }, { wch: 18 }, { wch: 20 }, { wch: 18 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, wsLuz, 'Relatório Luz (Energia)');

  // 2. Sheet Água e Esgoto
  const aguaHeaders = [
    'Competência', 'Data Vencimento', 'Fornecedor', 'RGI / Matrícula', 'Unidade / Filial',
    'Consumo (m³)', 'Valor Faturado (R$)', 'Nº Fatura', 'Status'
  ];
  const aguaData = [
    ['01/2024', '18/02/2024', 'Sabesp', '049281-9', 'Sede Matriz - Paulista', 48, 642.80, 'SAB-202401', 'Aberto'],
    ['02/2024', '18/03/2024', 'Sabesp', '049281-9', 'Sede Matriz - Paulista', 52, 698.40, 'SAB-202402', 'Aberto'],
    ['03/2024', '18/04/2024', 'Sabesp', '049281-9', 'Sede Matriz - Paulista', 89, 1280.90, 'SAB-202403', 'Aberto'], // Anomalia de vazamento
    ['01/2024', '22/02/2024', 'Sanasa Campinas', '19283-0', 'Filial Campinas', 28, 385.00, 'SAN-202401', 'Aberto'],
    ['01/2024', '14/02/2024', 'DAE Jundiaí', '77312-4', 'Galpão Logística', 34, 460.50, 'DAE-202401', 'Aberto']
  ];
  const wsAgua = XLSX.utils.aoa_to_sheet([aguaHeaders, ...aguaData]);
  wsAgua['!cols'] = [{ wch: 14 }, { wch: 16 }, { wch: 20 }, { wch: 18 }, { wch: 26 }, { wch: 15 }, { wch: 20 }, { wch: 16 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, wsAgua, 'Relatório Água');

  // 3. Sheet Internet / Telecom
  const telecomHeaders = [
    'Competência', 'Data Vencimento', 'Fornecedor', 'Código Contrato', 'Unidade / Filial',
    'Velocidade / Plano', 'Valor Faturado (R$)', 'Nº Fatura', 'Status'
  ];
  const telecomData = [
    ['01/2024', '25/02/2024', 'Vivo Fibra Empresas', 'CTR-99210', 'Sede Matriz - Paulista', '600 Mbps Dedicado', 489.90, 'VIV-202401', 'Aberto'],
    ['02/2024', '25/03/2024', 'Vivo Fibra Empresas', 'CTR-99210', 'Sede Matriz - Paulista', '600 Mbps Dedicado', 489.90, 'VIV-202402', 'Aberto'],
    ['03/2024', '25/04/2024', 'Vivo Fibra Empresas', 'CTR-99210', 'Sede Matriz - Paulista', '600 Mbps Dedicado', 549.90, 'VIV-202403', 'Aberto'], // Reajuste
    ['01/2024', '28/02/2024', 'Claro Telecom', 'CTR-55102', 'Filial Campinas', '500 Mbps IP Fixo', 320.00, 'CLA-202401', 'Aberto'],
    ['01/2024', '20/02/2024', 'Vero Internet', 'CTR-33910', 'Galpão Logística', '400 Mbps Fibra', 249.90, 'VER-202401', 'Aberto']
  ];
  const wsTelecom = XLSX.utils.aoa_to_sheet([telecomHeaders, ...telecomData]);
  wsTelecom['!cols'] = [{ wch: 14 }, { wch: 16 }, { wch: 24 }, { wch: 18 }, { wch: 26 }, { wch: 22 }, { wch: 20 }, { wch: 16 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, wsTelecom, 'Relatório Internet');

  // 4. Sheet Geral Consolidado (Todos os 3 serviços em uma única aba)
  const consolidadoHeaders = [
    'Tipo Utilidade', 'Competência', 'Vencimento', 'Fornecedor', 'Código Instalação', 'Unidade', 'Consumo Medido', 'Valor Faturado (R$)', 'Nº Documento'
  ];
  const consolidadoData = [
    ['Luz', '01/2024', '15/02/2024', 'Enel SP', '4928104', 'Sede Matriz', '4850 kWh', 3420.50, 'FAT-01'],
    ['Água', '01/2024', '18/02/2024', 'Sabesp', '049281-9', 'Sede Matriz', '48 m³', 642.80, 'FAT-02'],
    ['Internet', '01/2024', '25/02/2024', 'Vivo Fibra', 'CTR-99210', 'Sede Matriz', '600 Mbps', 489.90, 'FAT-03'],
    ['Luz', '01/2024', '20/02/2024', 'CPFL', '8812903', 'Filial Campinas', '2300 kWh', 1780.00, 'FAT-04'],
    ['Água', '01/2024', '22/02/2024', 'Sanasa', '19283-0', 'Filial Campinas', '28 m³', 385.00, 'FAT-05'],
    ['Internet', '01/2024', '28/02/2024', 'Claro', 'CTR-55102', 'Filial Campinas', '500 Mbps', 320.00, 'FAT-06']
  ];
  const wsConsolidado = XLSX.utils.aoa_to_sheet([consolidadoHeaders, ...consolidadoData]);
  wsConsolidado['!cols'] = [{ wch: 16 }, { wch: 14 }, { wch: 14 }, { wch: 20 }, { wch: 18 }, { wch: 20 }, { wch: 16 }, { wch: 20 }, { wch: 16 }];
  XLSX.utils.book_append_sheet(wb, wsConsolidado, 'Consolidado Geral');

  XLSX.writeFile(wb, 'Modelo_Relatorio_Contas_Consumo_Luz_Agua_Internet.xlsx');
}

// Export reconciled analysis results to a styled Excel spreadsheet
export function exportReconciliationToExcel(
  records: ReconciledRecord[],
  fileName: string = 'Relatorio_Conciliacao_Utilidades.xlsx'
): void {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Todos os Lançamentos Conciliados
  const mainHeaders = [
    'Status Conciliação', 'Tipo Utilidade', 'Competência', 'Data Vencimento', 'Fornecedor',
    'Cód. Instalação', 'Unidade / Centro Custo', 'Valor Fatura (.xlsx)', 'Valor Lançado (ERP)',
    'Diferença (R$)', 'Consumo', 'Bandeira', 'Notas de Auditoria'
  ];

  const mainRows = records.map(r => [
    r.reconciliationStatus === 'conciliado' ? 'CONCILIADO' :
    r.reconciliationStatus === 'divergencia_valor' ? 'DIVERGÊNCIA' :
    r.reconciliationStatus === 'pendente_pagamento' ? 'PENDENTE BAIXA' :
    r.reconciliationStatus === 'lancamento_sem_fatura' ? 'SEM FATURA ANEXADA' : 'DUPLICIDADE',
    r.utilityType.toUpperCase(),
    r.competence,
    r.dueDate,
    r.provider,
    r.installationCode,
    r.unitName,
    r.billedAmount,
    r.ledgerAmount,
    r.difference,
    r.consumptionValue ? `${r.consumptionValue} ${r.consumptionUnit || ''}` : '-',
    r.tariffFlag ? r.tariffFlag.toUpperCase() : '-',
    r.auditNotes || ''
  ]);

  const wsMain = XLSX.utils.aoa_to_sheet([mainHeaders, ...mainRows]);
  wsMain['!cols'] = [
    { wch: 18 }, { wch: 14 }, { wch: 14 }, { wch: 16 }, { wch: 22 },
    { wch: 18 }, { wch: 24 }, { wch: 18 }, { wch: 18 }, { wch: 15 },
    { wch: 16 }, { wch: 14 }, { wch: 30 }
  ];
  XLSX.utils.book_append_sheet(wb, wsMain, 'Painel de Conciliação');

  // Sheet 2: Somente Divergências e Pendências
  const issues = records.filter(r => r.reconciliationStatus !== 'conciliado');
  const issueRows = issues.map(r => [
    r.reconciliationStatus.toUpperCase(),
    r.utilityType.toUpperCase(),
    r.competence,
    r.provider,
    r.installationCode,
    r.unitName,
    r.billedAmount,
    r.ledgerAmount,
    r.difference,
    r.auditNotes || 'Requer conferência com concessionária'
  ]);
  const wsIssues = XLSX.utils.aoa_to_sheet([
    ['Status', 'Tipo', 'Competência', 'Fornecedor', 'Código', 'Unidade', 'Valor Fatura', 'Valor ERP', 'Diferença', 'Ação Recomendada'],
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
