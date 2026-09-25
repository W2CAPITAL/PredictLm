import test from 'node:test';
import assert from 'node:assert/strict';
import {
  coerceDossier,
  detectReportIntent,
  parseDossierMarkdown,
  renderReportHtml,
  validateDossier
} from '../src/lib/predict-dossier-html';

const complete=[
  '# Dossiê do processo 1012345-67.2023.8.26.0100 — Cobrança',
  '',
  '**Conclusão em uma frase:** A decisão é favorável, mas existe recurso pendente e um prazo documentado.',
  '',
  '## Sumário executivo',
  'A sentença favoreceu o pedido principal [oficial]. O recurso ainda precisa ser tratado [inferência].',
  '',
  '## Cronologia',
  '- 15/03/2023 — Distribuição da ação [oficial]',
  '- 10/08/2023 — Contestação juntada [fornecida]',
  '',
  '## Evidências',
  '- Sentença disponível no processo [oficial].',
  '- Contrato enviado pelo solicitante [fornecida].',
  '',
  '## Riscos',
  '- **Alto** — Perder prazo documentado. Mitigação: revisar agenda.',
  '- **Médio** — Fonte pública indisponível. Mitigação: repetir a consulta.',
  '',
  '## Próximos passos',
  '- Revisar o recurso (responsável: a definir; prazo: 14/10/2026) — urgente',
  '',
  '## Fontes',
  '- [DataJud](https://datajud-wiki.cnj.jus.br/) — CNJ [oficial]',
  '',
  '## Limitações',
  'Metadados públicos não substituem o inteiro teor [inferência].'
].join('\n');

test('Report Architect detects report/html intent without activating on ordinary chat',()=>{
  const report=detectReportIntent('crie um dossiê jurídico em HTML para baixar');
  assert.equal(report.wantsReport,true);
  assert.equal(report.wantsHtml,true);
  assert.equal(report.kind,'dossie-juridico');
  assert.equal(detectReportIntent('como plantar tomate em vaso').wantsReport,false);
});

test('dossier markdown becomes typed, numbered sections and extracts bottom line',()=>{
  const dossier=parseDossierMarkdown(complete);
  assert.match(dossier.title,/1012345/);
  assert.match(dossier.bottomLine,/recurso pendente/i);
  assert.equal(dossier.sections[0].role,'summary');
  assert.ok(dossier.sections.some(x=>x.role==='timeline'));
  assert.ok(dossier.sections.some(x=>x.role==='evidence'));
  assert.ok(dossier.sections.some(x=>x.role==='risks'));
  assert.ok(dossier.sections.some(x=>x.role==='actions'));
  assert.ok(dossier.sections.every(x=>/^\d+(?:\.\d+)?$/.test(x.number)));
});

test('quality gate reaches delivery target on a complete concise dossier',()=>{
  const dossier=parseDossierMarkdown(complete);
  const quality=validateDossier(dossier);
  assert.equal(quality.errors,0);
  assert.ok(quality.score>=85);
});

test('renderer escapes user HTML while allowing safe markdown links',()=>{
  const rendered=renderReportHtml(complete+'\n\n## Anexo\n<script>alert(1)</script> [fonte](https://example.com)');
  assert.doesNotMatch(rendered.html,/<script>alert\(1\)<\/script>/);
  assert.match(rendered.html,/&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.match(rendered.html,/href="https:\/\/example\.com"/);
});

test('oversized sections are automatically split into stable subsections',()=>{
  const body=Array.from({length:40},(_,i)=>'Parágrafo '+i+' com informação verificável fornecida para testar a quebra automática em blocos menores [fornecida].').join('\n\n');
  const markdown='# Relatório técnico — teste\n\n**Conclusão em uma frase:** A seção longa será quebrada.\n\n## Sumário executivo\nResumo [fornecida].\n\n## Evidências detalhadas\n'+body+'\n\n## Próximos passos\n- Revisar saída (responsável: a definir)\n\n## Fontes\n- Fonte de teste [fornecida]';
  const dossier=parseDossierMarkdown(markdown,{maxWordsPerSection:120});
  assert.ok(dossier.sections.filter(x=>x.title.startsWith('Evidências detalhadas')).length>=2);
  assert.ok(dossier.sections.some(x=>x.number.includes('.')));
});

test('structured dossier JSON is normalized instead of trusting arbitrary roles',()=>{
  const dossier=coerceDossier({
    title:'Pesquisa — teste',
    bottomLine:'Há evidência suficiente para a síntese.',
    meta:{kind:'pesquisa',classification:'interno'},
    sections:[
      {title:'Sumário executivo',body:'Síntese [fornecida].'},
      {title:'Fontes',body:'- Documento interno [fornecida].',role:'sources'}
    ]
  });
  assert.equal(dossier.meta.kind,'pesquisa');
  assert.equal(dossier.sections[0].role,'summary');
  assert.equal(dossier.sections[1].role,'sources');
});


test('evidence and timeline facts without provenance are flagged',()=>{
  const markdown=[
    '# Dossiê jurídico — teste de origem',
    '',
    '**Conclusão em uma frase:** Há um fato que ainda precisa de classificação de origem.',
    '',
    '## Sumário executivo',
    'Síntese preliminar [inferência].',
    '',
    '## Cronologia',
    '- 15/03/2023 — A ação foi distribuída',
    '',
    '## Evidências',
    '- Existe um contrato assinado',
    '',
    '## Riscos',
    '- **Baixo** — Classificação incompleta da origem. Mitigação: revisar a fonte.',
    '',
    '## Próximos passos',
    '- Classificar as fontes (responsável: a definir) — prioridade alta',
    '',
    '## Fontes',
    '- Material ainda em revisão [fornecida]',
    '',
    '## Limitações',
    'Origem de dois fatos ainda não foi classificada [inferência].'
  ].join('\n');
  const quality=validateDossier(parseDossierMarkdown(markdown));
  assert.ok(quality.issues.some(x=>x.code==='inference-only'&&x.sectionId==='cronologia'));
  assert.ok(quality.issues.some(x=>x.code==='inference-only'&&x.sectionId==='evidencias'));
});
