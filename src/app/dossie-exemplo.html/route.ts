import { renderReportHtml } from '@/lib/predict-dossier-html';

export const runtime='nodejs';
export const dynamic='force-dynamic';

const markdown=[
  '# Dossiê de exemplo — Report Architect',
  '',
  '**Conclusão em uma frase:** O exemplo demonstra sumário, métricas, cronologia, evidências, riscos, ações, fontes e limitações em um HTML navegável.',
  '',
  '## Sumário executivo',
  'Este arquivo é demonstrativo e não representa um caso real [inferência].',
  '',
  '## Dados-chave',
  '- **Nota-alvo:** 85/100 ou mais',
  '- **Limite padrão por seção:** 380 palavras',
  '',
  '## Cronologia',
  '- 25/09/2026 — Exemplo do Report Architect preparado para validação [fornecida]',
  '',
  '## Evidências',
  '- O conteúdo deste exemplo é propositalmente fictício [fornecida].',
  '',
  '## Riscos',
  '- **Baixo** — Confundir exemplo com caso real. Mitigação: substituir todos os dados antes de uso.',
  '',
  '## Próximos passos',
  '- Substituir o conteúdo de demonstração por evidência real (responsável: a definir) — prioridade alta',
  '',
  '## Fontes',
  '- PredictLM Report Architect [fornecida]',
  '',
  '## Limitações',
  'Nenhum fato jurídico, prazo ou valor real é afirmado neste exemplo.'
].join('\n');

export async function GET(){
  const {html}=renderReportHtml(markdown,{meta:{kind:'generico',classification:'publico'}});
  return new Response(html,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}});
}
