import test from 'node:test';
import assert from 'node:assert/strict';
import {detectDossierKind,renderReportHtml} from '../src/lib/predict-dossier-html';
import {inferReportBlueprint,REPORT_KIND_OPTIONS,reportBlueprint,chairReportPrompt} from '../src/lib/report-intelligence';

const cases:[string,string][]=[
  ['relatório operacional da carteira com retornos, backlog e encerramentos','relatorio-operacional'],
  ['relatório financeiro de receita, despesas e fluxo de caixa','relatorio-financeiro'],
  ['relatório da equipe com carga, atendimentos por pessoa e supervisão','relatorio-equipe'],
  ['postmortem do incidente e causa raiz da indisponibilidade','relatorio-incidente'],
  ['status report do projeto com marcos, entregas e bloqueios','relatorio-projeto'],
  ['relatório comercial de pipeline, leads, conversão e ticket médio','relatorio-comercial'],
  ['relatório de marketing com ROAS, CAC, campanhas e alcance','relatorio-marketing'],
  ['relatório de RH com turnover, headcount e absenteísmo','relatorio-rh'],
  ['matriz e relatório de riscos com controles e mitigação','relatorio-risco'],
  ['auditoria de controles e não conformidades','auditoria'],
  ['comparação antes e depois de agosto versus setembro','comparativo'],
  ['relatório de compliance LGPD e conformidade regulatória','relatorio-compliance'],
  ['relatório técnico de arquitetura do sistema','relatorio-tecnico'],
  ['dossiê jurídico do processo com sentença e apelação','dossie-juridico'],
  ['due diligence de contraparte e integridade','due-diligence'],
  ['pesquisa com metodologia, evidências e bibliografia','pesquisa'],
  ['relatório executivo para diretoria com KPIs e decisões','relatorio-executivo']
];

for(const [prompt,kind] of cases)test('detect report kind: '+kind,()=>{
  assert.equal(detectDossierKind(prompt),kind);
  assert.equal(inferReportBlueprint(prompt).kind,kind);
});

test('report taxonomy exposes broad first-class kinds plus custom fallback',()=>{
  const kinds=new Set(REPORT_KIND_OPTIONS.map(x=>x.value));
  for(const [,kind] of cases)assert.ok(kinds.has(kind as any),kind);
  assert.ok(kinds.has('generico'));
  assert.ok(REPORT_KIND_OPTIONS.length>=18);
});

test('dynamic blueprint gives operational reports metrics, evidence, risks and action',()=>{
  const bp=reportBlueprint('relatorio-operacional');
  assert.ok(bp.sections.some(x=>/Dados-chave/i.test(x)));
  assert.ok(bp.sections.some(x=>/Evidências/i.test(x)));
  assert.ok(bp.sections.some(x=>/Riscos/i.test(x)));
  assert.ok(bp.sections.some(x=>/Próximos passos/i.test(x)));
});

test('Chair prompt preserves evidence labels and hides internal brains from final document',()=>{
  const prompt=chairReportPrompt({
    request:'Faça relatório operacional',
    sourceText:'303 casos sem retorno.',
    blueprint:reportBlueprint('relatorio-operacional'),
    forge:'303 casos sem retorno [fornecida].',
    aegis:'Não há base para afirmar causalidade.',
    parallax:'Pode haver trabalho executado sem persistência.'
  });
  assert.match(prompt,/\[oficial\]/);
  assert.match(prompt,/\[fornecida\]/);
  assert.match(prompt,/\[inferência\]/);
  assert.match(prompt,/Não escreva sobre FORGE\/AEGIS\/PARALLAX\/CHAIR/i);
});

test('generated operational dossier can satisfy the expanded quality blueprint',()=>{
  const markdown=[
    '# Relatório operacional — carteira setembro',
    '',
    '**Conclusão em uma frase:** O volume sem retorno aumentou e exige recuperação da rastreabilidade.',
    '',
    '## Sumário executivo',
    'A base atual registra aumento de casos sem retorno [fornecida].',
    '',
    '## Dados-chave',
    '- **Casos sem retorno:** 303',
    '- **Ritmo atual:** 3,0/dia',
    '',
    '## Evidências',
    '- A base atual contém 303 casos sem retorno registrado [fornecida].',
    '',
    '## Riscos operacionais',
    '- **Alto** — Perda de rastreabilidade. Mitigação: reconciliar base e atendimentos.',
    '',
    '## Próximos passos',
    '- Reconciliar registros (responsável: a definir) — prioridade alta',
    '',
    '## Fontes',
    '- Base operacional fornecida pelo solicitante [fornecida]',
    '',
    '## Limitações',
    'O material não permite separar trabalho não executado de trabalho executado sem persistência [inferência].'
  ].join('\n');
  const rendered=renderReportHtml(markdown,{meta:{kind:'relatorio-operacional'}});
  assert.equal(rendered.quality.errors,0);
  assert.ok(rendered.quality.score>=85);
});
