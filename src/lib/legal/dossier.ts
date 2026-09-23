import type { LegalProcessBundle } from './types';
import type { LegalDossierMode } from './mode';

export interface LegalDossierEvidence{
  title?:string;
  subtitle?:string;
  documents?:{title:string;source?:string;summary:string;confidence?:'high'|'medium'|'low'}[];
  contracts?:{title:string;items:string[]}[];
  timeline?:{date:string;title:string;body?:string;source:string;level?:'normal'|'warn'|'critical'}[];
  favorable?:string[];
  adverse?:string[];
  failures?:{actor?:string;title:string;detail:string;basis?:string}[];
  risks?:{title:string;level:'high'|'medium'|'low';detail:string}[];
  quotes?:{text:string;cite:string}[];
  recommendations?:{phase:'immediate'|'medium'|'avoid';title:string;detail:string}[];
  council?:{consensus?:string;divergence?:string;recommendation?:string;residualRisk?:string};
}

export interface LegalDossierOptions{
  mode?:LegalDossierMode;
  evidence?:LegalDossierEvidence;
}

const esc=(s:any)=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]||c));
const date=(v?:string)=>{if(!v)return '—';const d=new Date(v);return Number.isNaN(d.getTime())?v:d.toLocaleString('pt-BR')};
const compact=(v:any,max=520)=>{const s=String(v??'').replace(/\s+/g,' ').trim();return s.length<=max?s:s.slice(0,max).trim()+'…'};

function sourceConfidence(bundle:LegalProcessBundle){
  const rows:{source:string;confidence:string;detail:string}[]=[];
  if(bundle.datajud.ok&&bundle.datajud.found)rows.push({source:'DataJud — metadados e movimentos',confidence:'Alta',detail:'API pública respondeu com hit.'});
  else if(bundle.datajud.ok)rows.push({source:'DataJud — índice público',confidence:'Alta (resultado negativo)',detail:'A API respondeu sem hit nesta consulta.'});
  else rows.push({source:'DataJud',confidence:'Indisponível nesta execução',detail:bundle.datajud.error||'Sem resposta.'});
  if(bundle.djen.ok)rows.push({source:'DJEN — publicações',confidence:bundle.djen.count?'Alta':'Média (resultado vazio)',detail:bundle.djen.count+' publicação(ões) retornada(s).'});
  else rows.push({source:'DJEN',confidence:'Indisponível nesta execução',detail:bundle.djen.error||'Sem resposta.'});
  for(const portal of bundle.officialPortals){
    rows.push({source:portal.name,confidence:portal.ok?(portal.found?'Alta':'Média (sem informação pública)'):'Indisponível nesta execução',detail:portal.message||'Consulta adicional ao portal oficial.'});
  }
  return rows;
}

function derivedBalance(bundle:LegalProcessBundle,evidence?:LegalDossierEvidence){
  const favorable=[...(evidence?.favorable||[])];
  const adverse=[...(evidence?.adverse||[])];
  const i=bundle.interpretation;
  if(i.posture==='favorable')favorable.push(i.postureLabel+': '+i.currentState);
  if(i.posture==='unfavorable')adverse.push(i.postureLabel+': '+i.currentState);
  if(i.posture==='mixed'){
    favorable.push('Há elementos públicos favoráveis, mas o estado é misto e exige leitura do inteiro teor.');
    adverse.push('Há elementos públicos adversos; o estado é misto e não autoriza conclusão unilateral.');
  }
  if(!/m[eé]rito/i.test(i.currentState+' '+i.whatHappened.join(' '))&&/extin|cancel|pressupost/i.test(i.currentState+' '+i.whatHappened.join(' '))){
    favorable.push('A consulta sugere encerramento por questão processual; isso não equivale, por si só, a derrota de mérito.');
  }
  if(bundle.djen.count===0)adverse.push('Nenhuma publicação DJEN foi retornada nesta execução; isso limita a reconstrução de intimações e prazos.');
  if(!bundle.datajud.ok||!bundle.djen.ok)adverse.push('Há fonte pública indisponível nesta execução; qualquer conclusão deve preservar essa incerteza.');
  return {favorable:Array.from(new Set(favorable)).slice(0,8),adverse:Array.from(new Set(adverse)).slice(0,8)};
}

function derivedFailures(bundle:LegalProcessBundle,evidence?:LegalDossierEvidence){
  const out=[...(evidence?.failures||[])];
  const corpus=(bundle.interpretation.currentState+' '+bundle.interpretation.whatHappened.join(' ')+' '+bundle.timeline.map(x=>x.title+' '+(x.body||'')).join(' ')).toLowerCase();
  if(/extin|cancelamento da distribui|aus[eê]ncia de pressupostos/.test(corpus))out.push({actor:'Processo',title:'Encerramento por questão processual',detail:'Os dados públicos indicam extinção/cancelamento ou falta de pressuposto. O inteiro teor deve ser lido para atribuir causa e responsabilidade.',basis:'DataJud/DJEN'});
  if(/gratuidade/.test(corpus)&&/indef|negad/.test(corpus))out.push({actor:'Processo',title:'Gratuidade indeferida',detail:'O pedido de gratuidade aparece como negado; isso aumenta a importância de custas, prazo e comprovação do recolhimento.',basis:'DataJud/DJEN'});
  if(/custas/.test(corpus))out.push({actor:'Processo',title:'Custas são ponto crítico',detail:'Há atos relacionados a custas. Pagamento posterior não deve ser tratado como reabertura automática do mérito.',basis:'DataJud/DJEN'});
  if(!bundle.datajud.ok||!bundle.djen.ok)out.push({actor:'Fontes',title:'Consulta pública incompleta',detail:'Uma ou mais fontes falharam. Isso é uma limitação de evidência, não prova de inexistência de ato.',basis:'Health das fontes'});
  return Array.from(new Map(out.map(x=>[(x.actor||'')+'|'+x.title,x])).values()).slice(0,10);
}

function derivedRisks(bundle:LegalProcessBundle,evidence?:LegalDossierEvidence){
  const out=[...(evidence?.risks||[])];
  const i=bundle.interpretation;
  if(i.confidence==='low')out.push({title:'Decidir com base incompleta',level:'high' as const,detail:'A interpretação tem confiança baixa; o inteiro teor e documentos do caso devem ser obtidos antes de medida irreversível.'});
  if(!bundle.datajud.ok||!bundle.djen.ok)out.push({title:'Falha de fonte pública',level:'medium' as const,detail:'DataJud/DJEN não responderam integralmente; repetir a consulta ou conferir o portal oficial antes de concluir.'});
  if(/extin|tr[aâ]nsito|cancel/i.test(i.currentState+' '+i.whatHappened.join(' ')))out.push({title:'Repetir o mesmo vício processual',level:'high' as const,detail:'Se houver nova medida, deve-se corrigir o problema que levou ao encerramento anterior antes de protocolar.'});
  out.push({title:'Confundir metadado com inteiro teor',level:'medium' as const,detail:'Movimentos e publicações resumidas não substituem sentença, decisão, certidão e peças completas.'});
  return Array.from(new Map(out.map(x=>[x.title,x])).values()).slice(0,10);
}

function derivedRecommendations(bundle:LegalProcessBundle,evidence?:LegalDossierEvidence){
  const out=[...(evidence?.recommendations||[])];
  for(const item of bundle.interpretation.nextActions)out.push({phase:'immediate' as const,title:'Próximo passo processual',detail:item});
  out.push({phase:'immediate',title:'Preservar evidência',detail:'Baixar sentença/decisão, certidão, publicações e peças relevantes antes de definir estratégia.'});
  out.push({phase:'medium',title:'Cruzar documentos do caso',detail:'Se houver contratos, conversas, comprovantes, laudos ou termos de audiência, incorporar cada documento ao dossiê com origem e data.'});
  out.push({phase:'avoid',title:'Não preencher lacunas com suposição',detail:'Não atribuir culpa, consentimento, promessa, prejuízo ou valor sem documento que sustente a afirmação.'});
  return Array.from(new Map(out.map(x=>[x.phase+'|'+x.title+'|'+x.detail,x])).values()).slice(0,14);
}

function councilSummary(bundle:LegalProcessBundle,evidence?:LegalDossierEvidence){
  if(evidence?.council)return evidence.council;
  const high=bundle.lenses.filter(x=>x.level==='high').flatMap(x=>x.findings).slice(0,3);
  const attention=bundle.lenses.filter(x=>x.level==='attention').flatMap(x=>x.findings).slice(0,3);
  return {
    consensus:bundle.interpretation.currentState,
    divergence:attention.length?attention.join(' '):'O conjunto público não traz divergência suficiente para uma síntese mais específica.',
    recommendation:bundle.interpretation.nextActions[0]||'Obter o inteiro teor e os documentos primários antes de qualquer medida irreversível.',
    residualRisk:high.length?high.join(' '):'A principal limitação residual é decidir apenas com metadados públicos.'
  };
}

function evidenceGaps(evidence?:LegalDossierEvidence){
  const missing:string[]=[];
  if(!evidence?.documents?.length)missing.push('inventário de documentos/comprovantes');
  if(!evidence?.contracts?.length)missing.push('contratos/cláusulas relevantes');
  if(!evidence?.quotes?.length)missing.push('trechos citáveis de conversas/documentos');
  if(!evidence?.failures?.length)missing.push('falhas atribuíveis com base documental');
  return missing;
}

export function createLegalDossier(bundle:LegalProcessBundle,options?:LegalDossierOptions){
  const mode=options?.mode||'standard';
  const evidence=options?.evidence;
  const aggressive=mode==='aggressive';
  const interpretation=bundle.interpretation;
  const balance=derivedBalance(bundle,evidence);
  const failures=derivedFailures(bundle,evidence);
  const risks=derivedRisks(bundle,evidence);
  const recommendations=derivedRecommendations(bundle,evidence);
  const chair=councilSummary(bundle,evidence);
  const gaps=evidenceGaps(evidence);

  const timeline=[
    ...bundle.timeline.map(x=>({date:x.date,title:x.title,body:x.body,source:x.source,level:/extin|tr[aâ]nsito|cancel|aus[eê]ncia/i.test(x.title+' '+(x.body||''))?'critical':/custas|gratuidade|prazo/i.test(x.title+' '+(x.body||''))?'warn':'normal'})),
    ...(evidence?.timeline||[])
  ].sort((a,b)=>String(a.date).localeCompare(String(b.date)));

  const timelineHtml=timeline.slice(0,100).map(x=>'<div class="tl-item '+esc(x.level||'normal')+'"><div class="tl-date">'+esc(date(x.date))+'</div><div class="tl-title">'+esc(x.title)+'</div><div class="tl-body">'+esc(x.source)+(x.body?' · '+esc(compact(x.body,700)):'')+'</div></div>').join('');
  const lenses=bundle.lenses.map(l=>'<article class="lens '+l.level+'"><div class="lens-h">'+esc(l.title)+'</div><div class="lens-b"><ul>'+l.findings.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul></div></article>').join('');
  const pubs=bundle.djen.publications.slice(0,40).map(p=>'<article class="pub"><div><b>'+esc(p.type)+'</b><span>'+esc(date(p.availableAt||p.publishedAt))+'</span></div><p>'+esc(compact(p.text||'Sem texto normalizado',1200))+'</p></article>').join('');
  const confidence=sourceConfidence(bundle).map(x=>'<tr><td>'+esc(x.source)+'</td><td>'+esc(x.confidence)+'</td><td>'+esc(x.detail)+'</td></tr>').join('');
  const docs=(evidence?.documents||[]).map(x=>'<article class="card"><h4>'+esc(x.title)+'</h4><p>'+esc(x.summary)+'</p><small>'+esc(x.source||'Fonte fornecida')+(x.confidence?' · confiança '+esc(x.confidence):'')+'</small></article>').join('');
  const contracts=(evidence?.contracts||[]).map(x=>'<article class="card"><h4>'+esc(x.title)+'</h4><ul>'+x.items.map(i=>'<li>'+esc(i)+'</li>').join('')+'</ul></article>').join('');
  const quotes=(evidence?.quotes||[]).map(x=>'<blockquote class="quote">“'+esc(x.text)+'”<cite>'+esc(x.cite)+'</cite></blockquote>').join('');
  const favor=balance.favorable.map(x=>'<li>'+esc(x)+'</li>').join('')||'<li>Sem elemento favorável adicional que possa ser afirmado com segurança a partir das fontes atuais.</li>';
  const contra=balance.adverse.map(x=>'<li>'+esc(x)+'</li>').join('')||'<li>Sem elemento adverso adicional que possa ser afirmado com segurança a partir das fontes atuais.</li>';
  const failureHtml=failures.map((x,i)=>'<li><span class="err-n">'+String(i+1).padStart(2,'0')+'</span><div><div class="err-t">'+esc((x.actor?x.actor+' — ':'')+x.title)+'</div><div class="err-s">'+esc(x.detail)+(x.basis?' · Base: '+esc(x.basis):'')+'</div></div></li>').join('');
  const riskHtml=risks.map(x=>'<div class="risk-row"><span class="risk-label">'+esc(x.title)+'</span><span class="risk-pill '+esc(x.level)+'">'+esc(x.level==='high'?'Alto':x.level==='medium'?'Médio':'Baixo')+'</span><p>'+esc(x.detail)+'</p></div>').join('');
  const gapHtml=gaps.length?'<div class="gap"><b>Lacunas de evidência</b><p>Para atingir o nível de um dossiê completo de caso, ainda faltam: '+esc(gaps.join(', '))+'. Essas lacunas não serão preenchidas por inferência.</p></div>':'';
  const rec=(phase:'immediate'|'medium'|'avoid')=>recommendations.filter(x=>x.phase===phase).map(x=>'<div class="rec"><b>'+esc(x.title)+'</b><span>'+esc(x.detail)+'</span></div>').join('');
  const caveats=bundle.summary.caveats.map(x=>'<li>'+esc(x)+'</li>').join('');
  const title=evidence?.title||bundle.processNumber;
  const subtitle=evidence?.subtitle||bundle.summary.headline||('Análise processual de '+bundle.processNumber);
  const attack=aggressive?'<section id="aegis"><span class="eyebrow">09 · AEGIS</span><h2>Revisão adversarial — pedido expresso</h2><div class="attack"><p>O modo agressivo foi ativado apenas porque houve pedido explícito. Ele procura fragilidade de prova, pressuposto ausente, inconsistência, custo, tese contrária e risco reverso.</p><ul><li>Não transformar lacuna em acusação.</li><li>Separar fato, inferência e hipótese adversarial.</li><li>Testar a melhor defesa da outra parte antes de recomendar ataque.</li></ul></div></section>':'';

  return '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>Dossiê — '+esc(title)+'</title>'+
  '<style>:root{--ink:#14141f;--ink-soft:#3d3d52;--paper:#f4f1ea;--paper2:#ebe7de;--rule:#c8c4b8;--rule2:#9a968c;--accent:#8b2942;--ok:#1e5c3a;--warn:#9a4a0f;--info:#1a4570}*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:var(--paper);color:var(--ink);font-family:Georgia,serif;font-size:16px;line-height:1.65}.cover{background:#14141f;color:#f4f1ea;padding:52px 28px}.wrap,.main{max-width:920px;margin:auto}.cover-label,.eyebrow{font:11px ui-monospace,monospace;letter-spacing:.13em;text-transform:uppercase}.cover-label{color:#c7aa70}.cover h1{font-size:clamp(30px,5vw,46px);font-weight:400;letter-spacing:-.04em;margin:12px 0 7px}.cover p{color:#c9c6c0;max-width:720px}.meta{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;border-top:1px solid #34343d;margin-top:25px;padding-top:16px}.meta b{display:block;font:10px ui-monospace,monospace;color:#777581;text-transform:uppercase}.nav-bar{position:sticky;top:0;z-index:20;background:#14141f;border-bottom:1px solid #2f2f37}.nav-inner{max-width:920px;margin:auto;display:flex;overflow:auto}.nav-btn{border:0;border-bottom:2px solid transparent;background:transparent;color:#aaa7a2;padding:12px 13px;white-space:nowrap;font:10px ui-monospace,monospace;cursor:pointer}.nav-btn.active,.nav-btn:hover{color:#d4b87a;border-bottom-color:#d4b87a}.main{padding:34px 24px 72px}.main section{scroll-margin-top:54px;margin-bottom:42px}.main section+section{border-top:1px solid var(--rule);padding-top:30px}.eyebrow{color:var(--ink-soft)}h2{font-weight:400;font-size:27px;margin:6px 0 16px}h3{font-size:17px;margin:20px 0 9px}.lead{color:var(--ink-soft);max-width:68ch}.process-table,.source-table{width:100%;border-collapse:collapse;font-size:13px;margin-top:14px}.process-table th,.process-table td,.source-table th,.source-table td{padding:10px;border-bottom:1px solid var(--rule);text-align:left;vertical-align:top}.process-table th,.source-table th{font:10px ui-monospace,monospace;text-transform:uppercase;color:var(--ink-soft);border-bottom:2px solid var(--rule2)}.grid-2{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.card{border:1px solid var(--rule);background:var(--paper2);padding:15px}.card h4{margin:0 0 7px}.card p,.card ul{font-size:14px;color:var(--ink-soft)}.card small{font:10px ui-monospace,monospace;color:var(--ink-soft)}.gap{border-left:3px solid var(--warn);background:#f8eee4;padding:13px 15px;margin-top:12px}.timeline{padding-left:22px;border-left:1px solid var(--rule)}.tl-item{position:relative;padding:0 0 18px 12px}.tl-item:before{content:"";position:absolute;left:-27px;top:7px;width:9px;height:9px;border-radius:50%;background:var(--paper);border:2px solid var(--rule2)}.tl-item.critical:before{background:var(--accent);border-color:var(--accent)}.tl-item.warn:before{background:var(--warn);border-color:var(--warn)}.tl-date{font:10px ui-monospace,monospace;color:var(--ink-soft)}.tl-title{font-weight:700}.tl-body{font-size:14px;color:var(--ink-soft)}.force{display:grid;grid-template-columns:1fr 1fr;border:1px solid var(--rule)}.force>div{padding:18px}.force>div+div{border-left:1px solid var(--rule)}.force h3{margin-top:0}.force .good h3{color:var(--ok)}.force .bad h3{color:var(--accent)}.quote{border-left:3px solid var(--accent);background:var(--paper2);padding:12px 15px;margin:13px 0;font-style:italic;color:var(--ink-soft)}.quote cite{display:block;font:10px ui-monospace,monospace;margin-top:7px;font-style:normal}.err-list{list-style:none;padding:0}.err-list li{display:flex;gap:12px;padding:10px 0;border-bottom:1px solid var(--rule)}.err-n{font:12px ui-monospace,monospace;color:var(--accent)}.err-t{font-weight:700}.err-s{font-size:14px;color:var(--ink-soft)}.risk-row{display:grid;grid-template-columns:210px 72px 1fr;gap:12px;align-items:start;padding:11px 0;border-bottom:1px solid var(--rule)}.risk-label{font-weight:700}.risk-pill{font:10px ui-monospace,monospace;border-radius:999px;padding:4px 7px;text-align:center}.risk-pill.high{background:#f8ecef;color:var(--accent)}.risk-pill.medium{background:#fdf3e9;color:var(--warn)}.risk-pill.low{background:#e8f3ec;color:var(--ok)}.risk-row p{margin:0;color:var(--ink-soft);font-size:14px}.lenses{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.lens{border:1px solid var(--rule);background:var(--paper2)}.lens-h{font:10px ui-monospace,monospace;text-transform:uppercase;padding:9px 12px;border-bottom:1px solid var(--rule)}.lens.high .lens-h{color:var(--accent)}.lens.attention .lens-h{color:var(--warn)}.lens.info .lens-h{color:var(--ok)}.lens-b{padding:5px 16px 10px;font-size:14px;color:var(--ink-soft)}.synth{background:#14141f;color:#f4f1ea;padding:18px;margin-top:14px}.synth h3{color:#d4b87a;margin-top:0}.synth p{color:#ddd9d1}.rec-group{margin:14px 0}.phase{font:10px ui-monospace,monospace;text-transform:uppercase;padding:4px 8px;display:inline-block;margin-bottom:5px}.phase.now{background:#f8ecef;color:var(--accent)}.phase.mid{background:#fdf3e9;color:var(--warn)}.phase.no{background:#e7e3da;color:var(--ink-soft)}.rec{display:grid;grid-template-columns:170px 1fr;gap:10px;padding:10px 0;border-bottom:1px solid var(--rule)}.rec span{color:var(--ink-soft);font-size:14px}.pub{border:1px solid var(--rule);padding:12px;margin-bottom:10px;background:#fff}.pub>div{display:flex;justify-content:space-between;gap:10px}.pub span{font:10px ui-monospace,monospace;color:var(--ink-soft)}.pub p{font-size:14px;color:var(--ink-soft)}.attack{background:#2a1518;color:#f5e9ea;padding:18px}.attack p,.attack li{color:#f5e9ea}.foot{font:10px ui-monospace,monospace;color:var(--ink-soft);margin-top:22px}@media(max-width:700px){.grid-2,.force,.lenses{grid-template-columns:1fr}.force>div+div{border-left:0;border-top:1px solid var(--rule)}.risk-row{grid-template-columns:1fr}.rec{grid-template-columns:1fr}.meta{grid-template-columns:1fr 1fr}}@media print{.nav-bar{display:none}.cover,.synth{-webkit-print-color-adjust:exact;print-color-adjust:exact}}</style>'+
  '</head><body>'+
  '<header class="cover"><div class="wrap"><div class="cover-label">DOSSIÊ JURÍDICO-OPERACIONAL · TWINCORE X10 · '+esc(mode.toUpperCase())+'</div><h1>'+esc(title)+'</h1><p>'+esc(subtitle)+'</p><div class="meta"><div><b>CNJ</b>'+esc(bundle.processNumber)+'</div><div><b>Tribunal</b>'+esc(bundle.tribunalLabel)+'</div><div><b>Classe</b>'+esc(bundle.datajud.class?.name||'—')+'</div><div><b>Órgão</b>'+esc(bundle.datajud.court?.name||'—')+'</div></div></div></header>'+
  '<nav class="nav-bar"><div class="nav-inner"><button class="nav-btn active" data-target="visao">Visão geral</button><button class="nav-btn" data-target="evidencias">Evidências</button><button class="nav-btn" data-target="timeline">Linha do tempo</button><button class="nav-btn" data-target="forcas">A favor / contra</button><button class="nav-btn" data-target="falhas">Pontos críticos</button><button class="nav-btn" data-target="riscos">Riscos</button><button class="nav-btn" data-target="council">Council</button><button class="nav-btn" data-target="acoes">Ações</button><button class="nav-btn" data-target="fontes">Fontes</button></div></nav>'+
  '<main class="main">'+
  '<section id="visao"><span class="eyebrow">01 · VISÃO GERAL</span><h2>Estado do caso</h2><p class="lead">'+esc(interpretation.currentState||bundle.summary.status)+'</p><table class="process-table"><thead><tr><th>Processo</th><th>Estado</th><th>Movimentos</th><th>DJEN</th></tr></thead><tbody><tr><td>'+esc(bundle.processNumber)+'</td><td>'+esc(interpretation.postureLabel)+'</td><td>'+bundle.summary.movementCount+'</td><td>'+bundle.summary.publicationCount+'</td></tr></tbody></table><div class="grid-2"><article class="card"><h4>O que aconteceu</h4><ol>'+((interpretation.whatHappened.map(x=>'<li>'+esc(x)+'</li>').join(''))||'<li>Sem narrativa processual suficiente nesta consulta.</li>')+'</ol></article><article class="card"><h4>Impacto prático</h4><ul>'+((interpretation.whyItMatters.map(x=>'<li>'+esc(x)+'</li>').join(''))||'<li>Impacto ainda inconclusivo.</li>')+'</ul></article></div></section>'+
  '<section id="evidencias"><span class="eyebrow">02 · EVIDÊNCIAS</span><h2>Documentos e material suplementar</h2><p class="lead">O dossiê separa o que veio das APIs públicas do que foi fornecido em contratos, conversas, comprovantes, laudos ou outros documentos.</p>'+gapHtml+'<div class="grid-2">'+(docs||'<article class="card"><h4>Sem pacote documental suplementar</h4><p>Esta versão foi construída apenas com as fontes processuais públicas disponíveis.</p></article>')+contracts+'</div>'+quotes+'</section>'+
  '<section id="timeline"><span class="eyebrow">03 · CRONOLOGIA</span><h2>Linha do tempo factual</h2><div class="timeline">'+(timelineHtml||'<p>Sem eventos normalizados.</p>')+'</div></section>'+
  '<section id="forcas"><span class="eyebrow">04 · BALANÇO DE FORÇAS</span><h2>Balanço de forças</h2><div class="force"><div class="good"><h3>Elementos favoráveis</h3><ul>'+favor+'</ul></div><div class="bad"><h3>Elementos adversos / limitações</h3><ul>'+contra+'</ul></div></div></section>'+
  '<section id="falhas"><span class="eyebrow">05 · PONTOS CRÍTICOS</span><h2>Pontos críticos</h2><p class="lead">Só há atribuição a pessoa/empresa quando existe evidência suplementar que sustente isso. Sinais puramente processuais permanecem rotulados como tais.</p><ul class="err-list">'+(failureHtml||'<li><span class="err-n">—</span><div><div class="err-t">Nenhum ponto crítico adicional confirmado</div><div class="err-s">As fontes atuais não sustentam atribuição específica.</div></div></li>')+'</ul></section>'+
  '<section id="riscos"><span class="eyebrow">06 · RISCOS</span><h2>Mapa qualitativo de risco</h2><p class="lead">Alto/Médio/Baixo são prioridades qualitativas, não probabilidades estatísticas.</p>'+riskHtml+'</section>'+
  '<section id="council"><span class="eyebrow">07 · COUNCIL</span><h2>Análise multi-lente</h2><div class="lenses">'+(lenses||'<article class="lens info"><div class="lens-h">Sem lentes</div><div class="lens-b">Não houve sinal suficiente para gerar lentes específicas.</div></article>')+'</div><div class="synth"><h3>Síntese do Chair</h3><p><strong>Consenso:</strong> '+esc(chair.consensus||'—')+'</p><p><strong>Divergência:</strong> '+esc(chair.divergence||'—')+'</p><p><strong>Recomendação:</strong> '+esc(chair.recommendation||'—')+'</p><p><strong>Risco residual:</strong> '+esc(chair.residualRisk||'—')+'</p></div></section>'+
  '<section id="acoes"><span class="eyebrow">08 · PLANO DE AÇÃO</span><h2>Próximos passos</h2><div class="rec-group"><span class="phase now">Imediato</span>'+rec('immediate')+'</div><div class="rec-group"><span class="phase mid">Médio prazo</span>'+rec('medium')+'</div><div class="rec-group"><span class="phase no">Não fazer</span>'+rec('avoid')+'</div></section>'+
  attack+
  '<section id="fontes"><span class="eyebrow">'+(aggressive?'10':'09')+' · FONTES E LIMITAÇÕES</span><h2>Confiança por fonte</h2><table class="source-table"><thead><tr><th>Fonte</th><th>Confiança</th><th>Detalhe</th></tr></thead><tbody>'+confidence+'</tbody></table><h3>Publicações DJEN</h3>'+(pubs||'<p>Sem publicações DJEN nesta consulta.</p>')+'<h3>Caveats</h3><ul>'+caveats+'</ul><p class="foot">Gerado em '+esc(date(bundle.fetchedAt))+'. Dados públicos não substituem autos completos nem parecer jurídico formal. O gerador não inventa conteúdo para preencher lacunas documentais.</p></section>'+
  '</main><script>document.querySelectorAll(".nav-btn").forEach(function(btn){btn.addEventListener("click",function(){document.querySelectorAll(".nav-btn").forEach(function(b){b.classList.remove("active")});btn.classList.add("active");var el=document.getElementById(btn.dataset.target);if(el)el.scrollIntoView({behavior:"smooth",block:"start"})})});var sections=document.querySelectorAll("main section");var nav=document.querySelectorAll(".nav-btn");if("IntersectionObserver" in window){var obs=new IntersectionObserver(function(entries){entries.forEach(function(e){if(!e.isIntersecting)return;var id=e.target.id;nav.forEach(function(b){b.classList.toggle("active",b.dataset.target===id)})})},{rootMargin:"-28% 0px -60% 0px"});sections.forEach(function(s){obs.observe(s)})}</script></body></html>';
}
