import React, { useState, useRef } from 'react';
import { UtilityBill, UtilityType } from '../types/reconciliation';
import { parseExcelReport, ParsedSheetResult } from '../utils/xlsxParser';
import { 
  X, 
  Upload, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertCircle, 
  Zap, 
  Droplets, 
  Wifi, 
  Layers
} from 'lucide-react';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmImport: (bills: UtilityBill[], fileName: string) => void;
}

export const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  onClose,
  onConfirmImport
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [parseResult, setParseResult] = useState<ParsedSheetResult | null>(null);
  const [selectedType, setSelectedType] = useState<UtilityType | 'misto'>('luz');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const processFile = async (file: File) => {
    setSelectedFile(file);
    setIsLoading(true);
    setErrorMsg(null);
    setParseResult(null);

    try {
      const buffer = await file.arrayBuffer();
      const result = await parseExcelReport(buffer, file.name);
      setParseResult(result);
      setSelectedType(result.detectedType);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Erro ao processar o arquivo .xlsx. Verifique se o formato está correto.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.name.match(/\.(xlsx|xls|csv)$/i)) {
        processFile(file);
      } else {
        setErrorMsg('Por favor, selecione um arquivo válido do Excel (.xlsx, .xls) ou .csv.');
      }
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleConfirm = () => {
    if (!parseResult || parseResult.bills.length === 0) return;
    
    // If user changed the type selector, update bills type
    const updatedBills = parseResult.bills.map(b => {
      if (selectedType !== 'misto') {
        return { ...b, utilityType: selectedType };
      }
      return b;
    });

    onConfirmImport(updatedBills, parseResult.fileName);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Anexar Relatório do Sistema (.xlsx)
              </h2>
              <p className="text-xs text-slate-500">
                Importação rápida e conciliação automática de faturas de Luz, Água e Internet
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4">
          
          {/* Drag & Drop Zone */}
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
              dragActive 
                ? 'border-slate-900 bg-slate-50' 
                : 'border-slate-300 hover:border-slate-400 bg-slate-50/50'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileInputChange}
              className="hidden"
            />
            <div className="flex flex-col items-center justify-center gap-2.5">
              <div className="w-11 h-11 rounded-full bg-white shadow-2xs border border-slate-200 flex items-center justify-center text-slate-700">
                <Upload className="w-5 h-5 text-slate-700" />
              </div>
              <div>
                <p className="text-xs sm:text-sm font-semibold text-slate-800">
                  Arraste e solte seu relatório <strong className="text-slate-900">.xlsx</strong> aqui, ou clique para navegar
                </p>
                <p className="text-2xs text-slate-500 mt-1">
                  Compatível com planilhas de energia (Enel, CPFL, Light, Cemig), água (Sabesp, Copasa) e telecom
                </p>
              </div>
            </div>
          </div>

          {/* Loading Indicator */}
          {isLoading && (
            <div className="p-3 text-center text-xs text-slate-600 flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
              <span>Processando e mapeando colunas da planilha...</span>
            </div>
          )}

          {/* Error Message */}
          {errorMsg && (
            <div className="p-3 rounded-lg border border-rose-200 bg-rose-50 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Parsed Result Preview */}
          {parseResult && (
            <div className="space-y-3.5 border border-slate-200 rounded-xl p-4 bg-slate-50/50">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200">
                <div className="flex items-center gap-2 text-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span className="font-semibold text-slate-900">
                    Arquivo: <strong className="font-mono">{parseResult.fileName}</strong>
                  </span>
                  <span className="text-slate-500">({parseResult.bills.length} faturas detectadas)</span>
                </div>

                {/* Force type selector if needed */}
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-slate-500 font-medium">Classificar como:</span>
                  <select
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value as any)}
                    className="px-2 py-1 text-xs rounded border border-slate-300 bg-white font-medium text-slate-800"
                  >
                    <option value="luz">⚡ Energia Elétrica (Luz)</option>
                    <option value="agua">💧 Água e Esgoto</option>
                    <option value="internet">🌐 Internet & Telecom</option>
                    <option value="misto">📑 Misto / Consolidado</option>
                  </select>
                </div>
              </div>

              {/* Sample Rows Preview Table */}
              <div>
                <p className="text-2xs uppercase tracking-wider font-bold text-slate-500 mb-1.5">
                  Pré-visualização dos Dados Mapeados:
                </p>
                <div className="overflow-x-auto max-h-40 border border-slate-200 rounded-lg bg-white">
                  <table className="w-full text-2xs text-left">
                    <thead className="bg-slate-100 text-slate-600 font-semibold sticky top-0">
                      <tr>
                        <th className="py-1.5 px-2">Competência</th>
                        <th className="py-1.5 px-2">Vencimento</th>
                        <th className="py-1.5 px-2">Fornecedor</th>
                        <th className="py-1.5 px-2">Código/Instalação</th>
                        <th className="py-1.5 px-2">Consumo</th>
                        <th className="py-1.5 px-2 text-right">Valor (R$)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {parseResult.bills.slice(0, 5).map((b, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="py-1.5 px-2 font-mono">{b.competence}</td>
                          <td className="py-1.5 px-2">{b.dueDate}</td>
                          <td className="py-1.5 px-2 font-medium text-slate-900">{b.provider}</td>
                          <td className="py-1.5 px-2 font-mono">{b.installationCode}</td>
                          <td className="py-1.5 px-2">{b.consumptionValue ? `${b.consumptionValue} ${b.consumptionUnit || ''}` : '-'}</td>
                          <td className="py-1.5 px-2 text-right font-mono font-bold text-slate-900">
                            R$ {b.billedAmount.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg transition-colors"
          >
            Cancelar
          </button>

          <button
            type="button"
            disabled={!parseResult || parseResult.bills.length === 0}
            onClick={handleConfirm}
            className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors shadow-sm"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Processar e Conciliar</span>
          </button>
        </div>

      </div>
    </div>
  );
};
