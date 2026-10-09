import { Condominium, FixedExpense } from '../types/reconciliation';

export interface ParseCondoTextResult {
  condominiums: Condominium[];
  fixedExpenses: FixedExpense[];
  skippedLines: string[];
  totalParsed: number;
}

/**
 * Parses raw text content formatted as "Nome Do Condomínio;UC" (or with tab/comma/pipe)
 */
export function parseCondominiumsText(
  rawText: string,
  createDefaultCelescExpense: boolean = true
): ParseCondoTextResult {
  const lines = rawText.split(/\r?\n/);
  const condominiums: Condominium[] = [];
  const fixedExpenses: FixedExpense[] = [];
  const skippedLines: string[] = [];

  const existingNames = new Set<string>();

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (!trimmed) return;

    // Check if it's a header line like "Nome;UC" or "Condominio;Unidade Consumidora"
    if (/^(nome|condominio|condomínio)\s*[;,|\t]\s*(uc|unidade)/i.test(trimmed)) {
      return;
    }

    // Split by semicolon, comma, tab, or pipe
    let parts: string[] = [];
    if (trimmed.includes(';')) {
      parts = trimmed.split(';');
    } else if (trimmed.includes('\t')) {
      parts = trimmed.split('\t');
    } else if (trimmed.includes('|')) {
      parts = trimmed.split('|');
    } else if (trimmed.includes(',')) {
      parts = trimmed.split(',');
    } else {
      // Just single value or malformed
      skippedLines.push(`Linha ${index + 1}: formato inválido (necessário delimitador ';')`);
      return;
    }

    const name = (parts[0] || '').trim();
    const uc = (parts[1] || '').trim();

    if (!name || !uc) {
      skippedLines.push(`Linha ${index + 1}: dados incompletos ("${trimmed}")`);
      return;
    }

    // Deduplicate by name or uc
    const key = `${name.toLowerCase()}#${uc}`;
    if (existingNames.has(key)) {
      return;
    }
    existingNames.add(key);

    const condoId = `condo-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 6)}`;
    const condo: Condominium = {
      id: condoId,
      name,
      uc,
      notes: `Importado via lista .txt (${new Date().toLocaleDateString('pt-BR')})`
    };

    condominiums.push(condo);

    // If requested, automatically create recurring fixed Celesc (Luz) expense for this condominium
    if (createDefaultCelescExpense) {
      fixedExpenses.push({
        id: `fixed-${condoId}-celesc`,
        condoId,
        condoName: name,
        uc,
        provider: 'Celesc Distribuição',
        utilityType: 'luz',
        expectedDay: 15,
        active: true,
        notes: 'Despesa fixa mensal de energia elétrica'
      });
    }
  });

  return {
    condominiums,
    fixedExpenses,
    skippedLines,
    totalParsed: condominiums.length
  };
}

/**
 * Similarity / fuzzy match helper for condominium names
 * Used in "Novo Lançamento" modal suggestions
 */
export function findSimilarCondominiums(query: string, condos: Condominium[], limit = 6): Condominium[] {
  if (!query || query.trim().length === 0) return [];
  const q = query.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

  return condos
    .filter(c => {
      const name = c.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const uc = c.uc.toLowerCase();
      return name.includes(q) || uc.includes(q) || q.split(/\s+/).some(word => word.length >= 3 && name.includes(word));
    })
    .slice(0, limit);
}
