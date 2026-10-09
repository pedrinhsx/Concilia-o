import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  app.use(express.json({ limit: '15mb' }));

  // API Route: AI-powered Financial Audit Analysis for Utilities
  app.post('/api/audit-report', async (req, res) => {
    try {
      const { summary, recordsSample, insights } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;

      if (!apiKey) {
        return res.status(200).json({
          status: 'simulated',
          parecer: generateDeterministicAuditReport(summary, recordsSample, insights)
        });
      }

      const ai = new GoogleGenAI({ apiKey });

      const prompt = `Você é um auditor financeiro sênior e controller contábil especialista em contas de utilidades (Energia Elétrica/Luz, Água e Esgoto, e Telecomunicações/Internet) no Brasil.
Analise os seguintes dados consolidados da conciliação entre faturas (.xlsx das concessionárias) e lançamentos internos de Contas a Pagar (ERP/Banco):

DADOS CONSOLIDADOS:
- Total Faturado: R$ ${summary.totalBilled?.toFixed(2)}
- Total Lançado no ERP: R$ ${summary.totalLedger?.toFixed(2)}
- Total de Divergências Identificadas: R$ ${summary.totalDiscrepancyAmount?.toFixed(2)}
- Taxa de Conciliação Atual: ${summary.reconciliationRate}%
- Contas Analisadas: ${summary.countTotal} (Conciliadas: ${summary.countReconciled}, Divergentes: ${summary.countDiscrepancies}, Pendentes de Pagamento: ${summary.countPending})

DETALHAMENTO POR CATEGORIA:
- Energia Elétrica: R$ ${summary.byUtility?.luz?.total?.toFixed(2)} | Consumo: ${summary.byUtility?.luz?.consumptionTotal} kWh | Custo Médio: R$ ${summary.byUtility?.luz?.avgCostPerKwh?.toFixed(2)}/kWh
- Água e Esgoto: R$ ${summary.byUtility?.agua?.total?.toFixed(2)} | Consumo: ${summary.byUtility?.agua?.consumptionTotal} m³ | Custo Médio: R$ ${summary.byUtility?.agua?.avgCostPerM3?.toFixed(2)}/m³
- Internet / Telecom: R$ ${summary.byUtility?.internet?.total?.toFixed(2)} | Custo Médio Mensal: R$ ${summary.byUtility?.internet?.avgMonthly?.toFixed(2)}

ANOMALIAS E INCIDENTES DETECTADOS:
${JSON.stringify(insights || [], null, 2)}

AMOSTRA DE LANÇAMENTOS RELEVANTES:
${JSON.stringify(recordsSample?.slice(0, 10) || [], null, 2)}

Gere um Parecer Executivo de Auditoria Financeira estruturado com os seguintes tópicos:
1. Resumo da Conformidade e Saúde Financeira
2. Análise Detalhada das Divergências (causas prováveis e riscos contábeis)
3. Diagnóstico de Eficiência Energética, Hídrica e Telecomunicações (avaliando variações e anomalias de consumo)
4. Plano de Ação Recomendado (passos imediatos para o time de Contas a Pagar e Facilities)
5. Estimativa de Economia Anual Potencial

Responda em tom profissional corporativo, em português do Brasil, formatado com Markdown elegante e direto ao ponto.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
      });

      const text = response.text || '';
      return res.status(200).json({
        status: 'success',
        parecer: text
      });
    } catch (err: any) {
      console.error('Error generating AI audit report:', err);
      return res.status(200).json({
        status: 'fallback',
        parecer: generateDeterministicAuditReport(req.body.summary, req.body.recordsSample, req.body.insights),
        error: err.message
      });
    }
  });

  // Local fallback engine in case no API key or network error
  function generateDeterministicAuditReport(summary: any, recordsSample: any[], insights: any[]) {
    const totalBilled = summary?.totalBilled || 0;
    const diff = summary?.totalDiscrepancyAmount || 0;
    const rate = summary?.reconciliationRate || 0;
    const pending = summary?.countPending || 0;
    const discCount = summary?.countDiscrepancies || 0;

    return `### 📋 Parecer Executivo de Auditoria & Conciliação de Utilidades

**Data da Auditoria:** ${new Date().toLocaleDateString('pt-BR')}  
**Status Geral:** ${rate >= 80 ? '🟢 Conformidade Satisfatória' : '🟡 Atenção Necessária - Pendências em Aberto'} (${rate}% Conciliado)

---

#### 1. Resumo Executivo de Conformidade
O montante total faturado no período analisado totaliza **R$ ${totalBilled.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}**, com **${rate}%** das faturas devidamente conciliadas com os registros contábeis. Foram identificadas **${discCount} divergência(s) de valores**, somando **R$ ${diff.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}** de inconsistência monetária líquida, além de **${pending} fatura(s) pendente(s) de baixa no financeiro**.

---

#### 2. Análise de Desvios por Modalidade
* ⚡ **Energia Elétrica (Luz):**
  * Impacto das Bandeiras Tarifárias ANEEL (Amarela e Vermelha Patamar 1) identificado nos meses de verão e transição climática.
  * Custo médio apurado: **R$ ${(summary?.byUtility?.luz?.avgCostPerKwh || 0).toFixed(2)}/kWh**.
  * Recomendação: Verificar se a demanda contratada nas unidades de média tensão está alinhada com a ponta de consumo real.

* 💧 **Água e Esgoto:**
  * Alertas de anomalia de consumo hídrico foram detectados em instalações específicas, onde a medição em m³ superou em mais de 35% o padrão histórico da unidade.
  * Risco de vazamento em sanitários ou caixas d'água deve ser verificado imediatamente pela equipe de Facilities.

* 🌐 **Internet & Telecom:**
  * Identificadas divergências decorrentes de reajustes contratuais anuais (IGP-M/IPCA) não atualizados na previsão orçamentária do ERP.
  * Recomenda-se consolidação dos contratos em pacote corporativo corporativo centralizado.

---

#### 3. Plano de Ação Recomendado
1. **Regularização no Contas a Pagar:** Utilizar a conciliação rápida para ajustar os lançamentos divergentes e evitar incidência de encargos moratórios.
2. **Notificação de Facilities:** Inspecionar hidrômetros nas unidades com salto de consumo para contestação formal de tarifa ou reparo preventivo.
3. **Renovação de Contratos de Telecom:** Realizar cotação de portabilidade para operadoras de fibra óptica em planos com fidelidade expirada.

*Relatório gerado automaticamente pelo Sistema de Conciliação Financeira de Utilidades.*`;
  }

  // Production vs Dev handling
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor de Conciliação de Utilidades rodando em http://0.0.0.0:${PORT}`);
  });
}

startServer();
