import React, { useState } from 'react';
import { 
  FixedExpense, 
  UtilityBill, 
  Condominium, 
  FixedProvider, 
  UtilityType 
} from '../types/reconciliation';
import { 
  Plus, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  Calendar, 
  Building2, 
  Zap, 
  Droplets, 
  Wifi, 
  Search,
  Filter,
  Check
} from 'lucide-react';

interface FixedExpensesTabProps {
  fixedExpenses: FixedExpense[];
  bills: UtilityBill[];
  activeMonth: string;
  condos: Condominium[];
  fixedProviders: FixedProvider[];
  onAddFixedExpense: (expense: FixedExpense) => void;
  onDeleteFixedExpense: (id: string) => void;
  onToggleFixedExpense: (id: string, active: boolean) => void;
  onQuickLaunchLedger?: (expense: FixedExpense, activeMonth: string) => void;
}

export const FixedExpensesTab: React.FC<FixedExpensesTabProps> = ({
  fixedExpenses,
  bills,
  activeMonth,
  condos,
  fixedProviders,
  onAddFixedExpense,
  onDeleteFixedExpense,
  onToggleFixedExpense,
  onQuickLaunchLedger
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'nao_lancadas' | 'conciliadas'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Form states for new fixed expense
  const [condoName, setCondoName] = useState('');
  const [uc, setUc] = useState('');
  const [provider, setProvider] = useState('Celesc Distribuição');
  const [utilityType, setUtilityType] = useState<UtilityType>('luz');
  const [expectedDay, setExpectedDay] = useState('15');
  const [estimatedAmount, setEstimatedAmount] = useState('');

  const formatCurrency = (val: number) => {
    return (val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  // Helper match key
  const makeMatchKey = (val: string) => (val || '').toLowerCase().replace(/\D/g, '');

  // Evaluate status of each fixed expense for the selected active month
  const evaluatedExpenses = fixedExpenses.map((expense) => {
    // Find in bills of the active month matching UC or condo name
    const matchingBill = bills.find(b => 
      b.competence === activeMonth &&
      (
        (expense.uc && makeMatchKey(b.installationCode) === makeMatchKey(expense.uc)) ||
        (b.condoName && b.condoName.toLowerCase() === expense.condoName.toLowerCase() && b.utilityType === expense.utilityType)
      )
    );

    const isBilled = !!matchingBill;
    const billedAmount = matchingBill ? matchingBill.billedAmount : 0;
    const dueDate = matchingBill ? matchingBill.dueDate : `${activeMonth}-${String(expense.expectedDay).padStart(2, '0')}`;

    return {
      ...expense,
      isBilled,
      matchingBill,
      billedAmount,
      dueDate,
      status: isBilled ? 'conciliado' : 'nao_lancada'
    };
  });

  // Filter
  const filtered = evaluatedExpenses.filter(e => {
    if (filterType === 'nao_lancadas' && e.isBilled) return false;
    if (filterType === 'conciliadas' && !e.isBilled) return false;
    if (searchTerm.trim() !== '') {
      const q = searchTerm.toLowerCase();
      const match = e.condoName.toLowerCase().includes(q) || e.uc.toLowerCase().includes(q) || e.provider.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  const countConciliadas = evaluatedExpenses.filter(e => e.isBilled).length;
  const countNaoLancadas = evaluatedExpenses.filter(e => !e.isBilled && e.active).length;

  const handleCondoSelect = (selectedName: string) => {
    setCondoName(selectedName);
    const found = condos.find(c => c.name === selectedName);
    if (found && found.uc) {
      setUc(found.uc);
    }
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!condoName) return;

    const newExpense: FixedExpense = {
      id: `fixed-${Date.now()}`,
      condoName,
      uc: uc || 'UC-000',
      provider,
      utilityType,
      expectedDay: parseInt(expectedDay, 10) || 15,
      estimatedAmount: estimatedAmount ? parseFloat(estimatedAmount.replace(',', '.')) : undefined,
      active: true,
      notes: 'Cadastrada manualmente'
    };

    onAddFixedExpense(newExpense);
    setIsAdding(false);
    setCondoName('');
    setUc('');
    setEstimatedAmount('');
  };

  const getUtilityIcon = (type: UtilityType) => {
    switch (type) {
      case 'luz': return <Zap className="w-3.5 h-3.5 text-amber-500" />;
      case 'agua': return <Droplets className="w-3.5 h-3.5 text-cyan-500" />;
      case 'internet': return <Wifi className="w-3.5 h-3.5 text-indigo-500" />;
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs space-y-4 p-4 sm:p-5">
      
      {/* Header of Fixed Expenses Checklist */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900">
              Despesas Fixas Mensais por Condomínio
            </h2>
            <span className="text-xs font-mono font-bold px-2 py-0.5 bg-slate-100 text-slate-800 rounded">
              Mês {activeMonth}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Checklist automático: marcada como <span className="text-emerald-700 font-semibold">Conciliada</span> se estiver no .xlsx do mês, ou <span className="text-rose-700 font-semibold">Não Lançada</span> se a fatura ainda não chegou.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {!isAdding && (
            <button
              onClick={() => setIsAdding(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors shadow-xs"
            >
              <Plus className="w-3.5 h-3.5 text-amber-400" />
              <span>Nova Despesa Fixa</span>
            </button>
          )}
        </div>
      </div>

      {/* Quick Summary Badges */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between">
          <span className="text-xs text-slate-600 font-medium">Total de Despesas Fixas:</span>
          <strong className="text-sm text-slate-900 font-bold">{fixedExpenses.length}</strong>
        </div>
        <div className="p-3 rounded-lg border border-emerald-200 bg-emerald-50/50 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-800">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span>Conciliadas no .xlsx:</span>
          </div>
          <strong className="text-sm text-emerald-700 font-bold">{countConciliadas}</strong>
        </div>
        <div className="p-3 rounded-lg border border-rose-200 bg-rose-50/50 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-800">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
            <span>Não Lançadas (Faltando):</span>
          </div>
          <strong className="text-sm text-rose-700 font-bold">{countNaoLancadas}</strong>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 pt-2">
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
              filterType === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Todas ({fixedExpenses.length})
          </button>
          <button
            onClick={() => setFilterType('nao_lancadas')}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
              filterType === 'nao_lancadas' ? 'bg-white text-rose-700 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            <span>Apenas Não Lançadas ({countNaoLancadas})</span>
          </button>
          <button
            onClick={() => setFilterType('conciliadas')}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
              filterType === 'conciliadas' ? 'bg-white text-emerald-700 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Conciliadas ({countConciliadas})</span>
          </button>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Filtrar condomínio, UC..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1 text-xs rounded-lg border border-slate-300 bg-white"
          />
        </div>
      </div>

      {/* Add Form */}
      {isAdding && (
        <form onSubmit={handleCreate} className="p-4 rounded-xl border border-slate-300 bg-slate-50 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
            <h3 className="text-xs font-bold text-slate-900">Cadastrar Nova Despesa Fixa Mensal</h3>
            <button 
              type="button" 
              onClick={() => setIsAdding(false)} 
              className="text-xs text-slate-500 hover:text-slate-800"
            >
              Cancelar
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Condomínio:</label>
              <input
                type="text"
                required
                list="condos-datalist"
                placeholder="Nome do Condomínio"
                value={condoName}
                onChange={(e) => handleCondoSelect(e.target.value)}
                className="w-full p-2 rounded-lg border border-slate-300 bg-white"
              />
              <datalist id="condos-datalist">
                {condos.map(c => (
                  <option key={c.id} value={c.name}>{c.uc ? `(UC: ${c.uc})` : ''}</option>
                ))}
              </datalist>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Unidade Consumidora (UC):</label>
              <input
                type="text"
                required
                placeholder="Ex: 9872134 (Celesc)"
                value={uc}
                onChange={(e) => setUc(e.target.value)}
                className="w-full p-2 rounded-lg border border-slate-300 bg-white font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Fornecedor Fixo:</label>
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                className="w-full p-2 rounded-lg border border-slate-300 bg-white"
              >
                {fixedProviders.map(p => (
                  <option key={p.id} value={p.name}>{p.name}</option>
                ))}
                <option value="Celesc Distribuição">Celesc Distribuição (Energia)</option>
                <option value="Casan">Casan (Água)</option>
                <option value="Vivo Fibra">Vivo Fibra (Internet)</option>
                <option value="Claro Telecom">Claro Telecom</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2.5 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Tipo de Despesa:</label>
              <select
                value={utilityType}
                onChange={(e) => setUtilityType(e.target.value as any)}
                className="w-full p-2 rounded-lg border border-slate-300 bg-white"
              >
                <option value="luz">⚡ Luz (Energia Elétrica)</option>
                <option value="agua">💧 Água e Saneamento</option>
                <option value="internet">🌐 Internet & Telecom</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Dia Previsto de Vencimento:</label>
              <input
                type="number"
                min="1"
                max="31"
                value={expectedDay}
                onChange={(e) => setExpectedDay(e.target.value)}
                className="w-full p-2 rounded-lg border border-slate-300 bg-white font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Valor Estimado Base (R$):</label>
              <input
                type="text"
                placeholder="Opcional"
                value={estimatedAmount}
                onChange={(e) => setEstimatedAmount(e.target.value)}
                className="w-full p-2 rounded-lg border border-slate-300 bg-white font-mono"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-3 py-1.5 text-xs text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs font-bold text-white bg-slate-900 rounded-lg hover:bg-slate-800"
            >
              Salvar Despesa Fixa
            </button>
          </div>
        </form>
      )}

      {/* Table List */}
      <div className="overflow-x-auto border border-slate-200 rounded-xl">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-100 text-slate-600 font-semibold">
            <tr>
              <th className="py-2.5 px-3 text-center w-12">Status</th>
              <th className="py-2.5 px-3.5">Condomínio</th>
              <th className="py-2.5 px-3.5">UC / Matrícula</th>
              <th className="py-2.5 px-3.5">Fornecedor</th>
              <th className="py-2.5 px-3.5">Vencimento Previsto</th>
              <th className="py-2.5 px-3.5 text-right">Valor no .xlsx (R$)</th>
              <th className="py-2.5 px-3 text-center w-16">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-10 text-center text-slate-400">
                  Nenhuma despesa fixa cadastrada ou encontrada para o filtro atual.
                </td>
              </tr>
            ) : (
              filtered.map((item) => (
                <tr 
                  key={item.id} 
                  className={`hover:bg-slate-50 transition-colors ${!item.isBilled ? 'bg-rose-50/20' : ''}`}
                >
                  {/* Status Dot */}
                  <td className="py-2.5 px-3 text-center whitespace-nowrap">
                    <span
                      title={item.isBilled ? 'Conciliada no .xlsx deste mês' : 'Não Lançada (Fatura não recebida no .xlsx)'}
                      className={`w-3 h-3 rounded-full inline-block ${
                        item.isBilled ? 'bg-emerald-500' : 'bg-rose-500 animate-pulse'
                      }`}
                    />
                  </td>

                  {/* Condomínio */}
                  <td className="py-2.5 px-3.5 font-semibold text-slate-900">
                    <div className="flex items-center gap-2">
                      <span className="p-1 rounded bg-slate-100">{getUtilityIcon(item.utilityType)}</span>
                      <span>{item.condoName}</span>
                    </div>
                  </td>

                  {/* UC */}
                  <td className="py-2.5 px-3.5 font-mono text-slate-700">
                    {item.uc}
                  </td>

                  {/* Fornecedor */}
                  <td className="py-2.5 px-3.5 font-medium text-slate-800">
                    {item.provider}
                  </td>

                  {/* Vencimento */}
                  <td className="py-2.5 px-3.5 text-slate-600 font-mono">
                    Dia {item.expectedDay} ({activeMonth})
                  </td>

                  {/* Valor Faturado .xlsx */}
                  <td className="py-2.5 px-3.5 text-right font-mono font-bold">
                    {item.isBilled ? (
                      <span className="text-emerald-700">{formatCurrency(item.billedAmount)}</span>
                    ) : (
                      <span className="text-rose-600 text-2xs italic font-normal">
                        Aguardando importação
                      </span>
                    )}
                  </td>

                  {/* Ações */}
                  <td className="py-2.5 px-3 text-center">
                    <button
                      onClick={() => onDeleteFixedExpense(item.id)}
                      title="Remover despesa fixa"
                      className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
};
