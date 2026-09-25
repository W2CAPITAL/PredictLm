export type DossierKind='relatorio-executivo'|'dossie-juridico'|'due-diligence'|'relatorio-tecnico'|'pesquisa'|'generico';
export type DossierClassification='publico'|'interno'|'confidencial'|'restrito';
export type DossierRole='summary'|'metrics'|'timeline'|'evidence'|'risks'|'options'|'actions'|'sources'|'methodology'|'limitations'|'appendix'|'analysis';

export interface DossierMeta{
  kind:DossierKind;
  classification:DossierClassification;
  author?:string;
  generatedAt?:string;
}
export interface DossierSection{
  id:string;
  number:string;
  title:string;
  role:DossierRole;
  body:string;
  wordCount:number;
  level:2|3;
}
export interface DossierQualityIssue{
  code:'no-sections'|'no-bottom-line'|'no-summary'|'long-section'|'empty-section'|'no-sources'|'inference-only'|'vague-title'|'generic-title'|'duplicate-title'|'risk-level'|'action-owner'|'blueprint';
  level:'error'|'warning'|'tip';
  message:string;
  sectionId?:string;
}
export interface DossierQuality{
  score:number;
  issues:DossierQualityIssue[];
  errors:number;
  warnings:number;
  tips:number;
}
export interface DossierDocument{
  title:string;
  bottomLine:string;
  meta:DossierMeta;
  sections:DossierSection[];
  totalWords:number;
}
export interface RenderDossierOptions{
  maxWordsPerSection?:number;
  theme?:'auto'|'light'|'dark';
  meta?:Partial<DossierMeta>;
}

const DEFAULT_MAX_WORDS=380;
const roleWords:[DossierRole,RegExp][]=[
  ['summary',/\b(resumo|sum[aá]rio executivo|s[ií]ntese|vis[aã]o geral|tl;?dr)\b/i],
  ['metrics',/\b(dados[- ]chave|n[uú]meros[- ]chave|indicadores|m[eé]tricas|kpis?)\b/i],
  ['timeline',/\b(cronologia|linha do tempo|hist[oó]rico processual|movimenta[cç][oõ]es)\b/i],
  ['evidence',/\b(evid[eê]ncias|provas|matriz de fatos|fatos verificados)\b/i],
  ['risks',/\b(riscos|amea[cç]as|vulnerabilidades|exposi[cç][aã]o)\b/i],
  ['options',/\b(op[cç][oõ]es|alternativas|cen[aá]rios|caminhos poss[ií]veis)\b/i],
  ['actions',/\b(pr[oó]ximos passos|plano de a[cç][aã]o|recomenda[cç][oõ]es|o que fazer)\b/i],
  ['sources',/\b(fontes|refer[eê]ncias|bibliografia)\b/i],
  ['methodology',/\b(metodologia|escopo|abrang[eê]ncia)\b/i],
  ['limitations',/\b(limita[cç][oõ]es|ressalvas|lacunas|incertezas)\b/i],
  ['appendix',/\b(anexo|ap[eê]ndice)\b/i]
];

const vagueTitles=/^(an[aá]lise|detalhes|informa[cç][oõ]es|observa[cç][oõ]es|outros|conte[uú]do)$/i;
const genericDocTitle=/^(relat[oó]rio|dossi[eê]|pesquisa|an[aá]lise|documento|relat[oó]rio final|dossi[eê] final)$/i;

function esc(value:any){
  return String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]||ch));
}
function clean(value:any,max=10000){
  return String(value??'').replace(/\r\n?/g,'\n').trim().slice(0,max);
}
function norm(value:string){
  return String(value||'').toLowerCase().normalize('NFD').replace(/\p{M}/gu,'').replace(/\s+/g,' ').trim();
}
function words(value:string){
  return String(value||'').trim().split(/\s+/).filter(Boolean).length;
}
function slugify(value:string){
  const base=norm(value).replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,72);
  return base||'secao';
}
function roleForTitle(title:string):DossierRole{
  for(const [role,re] of roleWords)if(re.test(title))return role;
  return 'analysis';
}
function uniqueId(title:string,seen:Map<string,number>){
  const base=slugify(title);
  const count=(seen.get(base)||0)+1;
  seen.set(base,count);
  return count===1?base:base+'-'+count;
}
function firstSentence(value:string){
  const text=clean(value,160).replace(/^[-*]\s*/,'').replace(/\[(?:oficial|fornecida|infer[eê]ncia)\]/ig,'').trim();
  const sentence=text.split(/(?<=[.!?])\s+/)[0]||text;
  return sentence.slice(0,82).replace(/[.:;,-]+$/,'').trim()||'continuação';
}
function sectionChunks(section:DossierSection,maxWords:number){
  if(section.wordCount<=maxWords*1.5)return [section];
  const paragraphs=section.body.split(/\n{2,}/).map(x=>x.trim()).filter(Boolean);
  const chunks:string[]=[];
  let current:string[]=[];
  let count=0;
  const flush=()=>{if(current.length){chunks.push(current.join('\n\n'));current=[];count=0}};
  for(const paragraph of paragraphs.length?paragraphs:[section.body]){
    const w=words(paragraph);
    if(count&&count+w>maxWords)flush();
    if(w>maxWords){
      const tokens=paragraph.split(/\s+/);
      while(tokens.length){
        const part=tokens.splice(0,maxWords).join(' ');
        if(current.length)flush();
        chunks.push(part);
      }
      continue;
    }
    current.push(paragraph);count+=w;
  }
  flush();
  if(chunks.length<2)return [section];
  return chunks.map((body,index)=>({
    ...section,
    title:index===0?section.title:section.title+' — '+firstSentence(body),
    body,
    wordCount:words(body),
    level:index===0?section.level:3 as const,
    number:''
  }));
}

function parseRawSections(markdown:string){
  const lines=markdown.replace(/\r\n?/g,'\n').split('\n');
  let title='';
  let bottomLine='';
  const raw:{title:string;body:string[];level:2|3}[]=[];
  let current:{title:string;body:string[];level:2|3}|null=null;
  const intro:string[]=[];
  const bottomRe=/^\s*(?:\*\*)?(Conclus[aã]o em uma frase|Bottom line|Em uma frase|Resposta direta|Veredito|TL;?DR)\s*:\s*(?:\*\*)?\s*(.+?)\s*(?:\*\*)?\s*$/i;

  const pushCurrent=()=>{if(current){raw.push(current);current=null}};
  for(let i=0;i<lines.length;i++){
    const line=lines[i];
    const trimmed=line.trim();
    if(!title){
      const m=trimmed.match(/^#\s+(.+)$/);
      if(m){title=m[1].trim();continue}
    }
    const bottom=trimmed.match(bottomRe);
    if(bottom&&!bottomLine){bottomLine=bottom[2].replace(/\*\*$/,'').trim();continue}

    const heading=trimmed.match(/^(#{2,3})\s+(.+)$/);
    if(heading){
      pushCurrent();
      current={title:heading[2].trim(),body:[],level:heading[1].length===3?3:2};
      continue;
    }

    if(trimmed&&i+1<lines.length&&/^(?:={3,}|-{3,})\s*$/.test(lines[i+1].trim())&&trimmed.length<=110&&!/^[-*]\s+/.test(trimmed)){
      pushCurrent();
      if(!title&&lines[i+1].trim().startsWith('=')){title=trimmed;i++;continue}
      current={title:trimmed,body:[],level:2};i++;continue;
    }

    const boldHeading=trimmed.match(/^\*\*([^*]{2,100})\*\*$/);
    const upperHeading=trimmed.length>=3&&trimmed.length<=72&&!/^[-*|]/.test(trimmed)&&/[A-ZÁÉÍÓÚÃÕÂÊÔÇ]/.test(trimmed)&&trimmed===trimmed.toLocaleUpperCase('pt-BR');
    if(boldHeading||upperHeading){
      pushCurrent();
      current={title:(boldHeading?.[1]||trimmed).trim(),body:[],level:2};
      continue;
    }

    if(current)current.body.push(line);
    else if(trimmed)intro.push(line);
  }
  pushCurrent();
  if(intro.length){
    raw.unshift({title:'Visão geral',body:intro,level:2});
  }
  return {title:title||'Dossiê',bottomLine,raw};
}

function numberSections(input:{title:string;body:string[];level:2|3}[],maxWords:number){
  const seen=new Map<string,number>();
  const sections:DossierSection[]=[];
  let top=0,sub=0;
  for(const row of input){
    const base:DossierSection={
      id:'',
      number:'',
      title:row.title,
      role:roleForTitle(row.title),
      body:row.body.join('\n').trim(),
      wordCount:words(row.body.join(' ')),
      level:row.level
    };
    const chunks=sectionChunks(base,maxWords);
    for(let index=0;index<chunks.length;index++){
      const item=chunks[index];
      const level=index>0?3:item.level;
      if(level===2||top===0){top++;sub=0;item.number=String(top);item.level=2}
      else{sub++;item.number=top+'.'+sub;item.level=3}
      item.id=uniqueId(item.title,seen);
      item.role=roleForTitle(item.title);
      sections.push(item);
    }
  }
  return sections;
}

export function detectDossierKind(text:string):DossierKind{
  const q=norm(text);
  if(/\b(due diligence|diligencia|integridade|contraparte)\b/.test(q))return 'due-diligence';
  if(/\b(processo|juridic|tribunal|datajud|djen|peticao|sentenca|recurso)\b/.test(q))return 'dossie-juridico';
  if(/\b(tecnico|arquitetura|engenharia|incidente|sistema|software)\b/.test(q))return 'relatorio-tecnico';
  if(/\b(pesquisa|research|estudo|fontes|bibliografia)\b/.test(q))return 'pesquisa';
  if(/\b(executivo|executiva|diretoria|kpi|indicadores|resultado gerencial)\b/.test(q))return 'relatorio-executivo';
  return 'generico';
}

export function detectReportIntent(input:string){
  const q=norm(input);
  const wantsReport=/\b(relatorio|dossie|due diligence|parecer executivo|relatorio tecnico|sumario executivo|documento executivo|report architect)\b/.test(q);
  const wantsHtml=wantsReport&&/\b(html|imprimir|impressao|baixar|download|arquivo|artefato|studio|estudio)\b/.test(q);
  return {wantsReport,wantsHtml,kind:detectDossierKind(input)};
}

export const REPORT_DOSSIER_CONTRACT=[
  'REPORT ARCHITECT CONTRACT:',
  'Use only when the user actually asks for a report/dossier.',
  'Answer-first: open with one explicit line beginning "**Conclusão em uma frase:**".',
  'Then write dossier markdown with one # title and informative ## sections. Each section must answer one question.',
  'Preferred roles: Sumário executivo, Dados-chave, Cronologia, Evidências, Riscos, Opções/Cenários, Próximos passos, Fontes, Metodologia and Limitações when relevant.',
  'Evidence markers: [oficial] for public/official records; [fornecida] for user-supplied material; [inferência] for analysis. A relevant factual claim without origin must be [inferência] or omitted.',
  'Risks use Alto/Médio/Baixo qualitatively; never invent percentages.',
  'Actions name an owner even if "a definir", and a deadline only when supported.',
  'Never invent process number, deadline, value, source, responsible person or probability.',
  'If a source failed, say so under Limitações. Public absence is not proof of nonexistence.',
  'For legal-effect actions such as filing, signature, agreement or payment, require human confirmation.',
  'Do not manually number sections; the renderer numbers them.',
  'Target quality >=85 with no errors.'
].join('\n');

export function parseDossierMarkdown(markdown:string,options:RenderDossierOptions={}):DossierDocument{
  const maxWords=Math.max(120,Math.min(2000,Number(options.maxWordsPerSection)||DEFAULT_MAX_WORDS));
  const parsed=parseRawSections(clean(markdown,650000));
  const sections=numberSections(parsed.raw,maxWords);
  const meta:DossierMeta={
    kind:options.meta?.kind||detectDossierKind(parsed.title+' '+markdown),
    classification:options.meta?.classification||'confidencial',
    author:options.meta?.author,
    generatedAt:options.meta?.generatedAt||new Date().toISOString()
  };
  return {
    title:parsed.title||'Dossiê',
    bottomLine:parsed.bottomLine,
    meta,
    sections,
    totalWords:words(markdown)
  };
}

function issue(code:DossierQualityIssue['code'],level:DossierQualityIssue['level'],message:string,sectionId?:string):DossierQualityIssue{
  return {code,level,message,...(sectionId?{sectionId}:{})};
}

export function validateDossier(dossier:DossierDocument,options:RenderDossierOptions={}):DossierQuality{
  const maxWords=Math.max(120,Math.min(2000,Number(options.maxWordsPerSection)||DEFAULT_MAX_WORDS));
  const issues:DossierQualityIssue[]=[];
  if(!dossier.sections.length)issues.push(issue('no-sections','error','Organize o conteúdo em seções com título.'));
  if(!dossier.bottomLine)issues.push(issue('no-bottom-line','warning','Abra com uma conclusão em uma frase.'));
  if(dossier.sections[0]?.role!=='summary')issues.push(issue('no-summary','warning','A primeira seção deve funcionar como sumário executivo.'));
  for(const section of dossier.sections){
    if(!section.body.trim())issues.push(issue('empty-section','warning','Preencha ou remova a seção vazia "'+section.title+'".',section.id));
    if(section.wordCount>maxWords*1.5)issues.push(issue('long-section','warning','Divida a seção "'+section.title+'" em blocos menores.',section.id));
    if(vagueTitles.test(section.title.trim()))issues.push(issue('vague-title','tip','Troque "'+section.title+'" por um título que conclua algo.',section.id));
  }
  if(genericDocTitle.test(dossier.title.trim()))issues.push(issue('generic-title','tip','O título do documento deve citar assunto, parte ou pergunta.'));
  const titles=new Map<string,number>();
  for(const section of dossier.sections){
    const key=norm(section.title);
    titles.set(key,(titles.get(key)||0)+1);
  }
  for(const [key,count] of titles)if(key&&count>1)issues.push(issue('duplicate-title','tip','Há títulos repetidos no sumário: "'+key+'".'));
  const hasSources=dossier.sections.some(x=>x.role==='sources');
  if(dossier.totalWords>650&&!hasSources)issues.push(issue('no-sources','warning','Documento extenso precisa listar fontes.'));
  const corpus=dossier.sections.map(x=>x.body).join('\n');
  const hasOfficial=/\[oficial\]/i.test(corpus);
  const hasProvided=/\[fornecida\]/i.test(corpus);
  if(dossier.totalWords>260&&!hasOfficial&&!hasProvided)issues.push(issue('inference-only','warning','Fatos centrais precisam de origem [oficial] ou [fornecida]; caso contrário devem ficar como [inferência].'));

  for(const section of dossier.sections.filter(x=>x.role==='risks')){
    const riskBullets=section.body.split('\n').filter(x=>/^\s*[-*]\s+/.test(x));
    if(riskBullets.some(x=>!/\b(alto|m[eé]dio|baixo)\b/i.test(x)))issues.push(issue('risk-level','tip','Classifique cada risco como Alto, Médio ou Baixo.',section.id));
  }
  for(const section of dossier.sections.filter(x=>x.role==='actions')){
    const actionBullets=section.body.split('\n').filter(x=>/^\s*[-*]\s+/.test(x));
    if(actionBullets.some(x=>!/\brespons[aá]vel\s*:/i.test(x)))issues.push(issue('action-owner','tip','Indique responsável em cada ação, mesmo que "a definir".',section.id));
  }

  const roles=new Set(dossier.sections.map(x=>x.role));
  const wanted:DossierRole[]=dossier.meta.kind==='dossie-juridico'
    ? ['summary','timeline','evidence','risks','actions','sources','limitations']
    : dossier.meta.kind==='due-diligence'
      ? ['summary','evidence','risks','actions','sources','limitations']
      : dossier.meta.kind==='relatorio-executivo'
        ? ['summary','metrics','actions','sources']
        : dossier.meta.kind==='pesquisa'
          ? ['summary','methodology','evidence','sources','limitations']
          : ['summary','actions','sources'];
  const missing=wanted.filter(x=>!roles.has(x));
  if(missing.length)issues.push(issue('blueprint','tip','Blocos normalmente úteis neste tipo de documento: '+missing.join(', ')+'.'));

  const errors=issues.filter(x=>x.level==='error').length;
  const warnings=issues.filter(x=>x.level==='warning').length;
  const tips=issues.filter(x=>x.level==='tip').length;
  const score=Math.max(0,100-errors*25-warnings*8-tips*2);
  return {score,issues,errors,warnings,tips};
}

function inlineMarkdown(input:string){
  let out=esc(input);
  out=out.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+|mailto:[^)\s]+)\)/gi,(_m,label,url)=>'<a href="'+esc(url)+'" rel="noreferrer noopener" target="_blank">'+label+'</a>');
  out=out.replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>');
  out=out.replace(/\x60([^\x60]+)\x60/g,'<code>$1</code>');
  out=out.replace(/\[(oficial)\]/gi,'<span class="src official">oficial</span>');
  out=out.replace(/\[(fornecida)\]/gi,'<span class="src supplied">fornecida</span>');
  out=out.replace(/\[(infer[eê]ncia)\]/gi,'<span class="src inference">inferência</span>');
  return out;
}

function renderGenericTable(lines:string[]){
  const rows=lines.filter(x=>x.trim().startsWith('|')).map(x=>x.trim().replace(/^\||\|$/g,'').split('|').map(x=>x.trim()));
  if(rows.length<2)return '';
  const divider=rows[1].every(x=>/^:?-{3,}:?$/.test(x));
  const head=rows[0];
  const body=(divider?rows.slice(2):rows.slice(1));
  return '<div class="table-wrap"><table><thead><tr>'+head.map(x=>'<th>'+inlineMarkdown(x)+'</th>').join('')+'</tr></thead><tbody>'+body.map(row=>'<tr>'+row.map(x=>'<td>'+inlineMarkdown(x)+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>';
}

function renderBody(body:string){
  const lines=body.split('\n');
  const out:string[]=[];
  let bullets:string[]=[];
  let table:string[]=[];
  const flushBullets=()=>{if(bullets.length){out.push('<ul>'+bullets.map(x=>'<li>'+inlineMarkdown(x)+'</li>').join('')+'</ul>');bullets=[]}};
  const flushTable=()=>{if(table.length){out.push(renderGenericTable(table));table=[]}};
  for(const line of lines){
    const t=line.trim();
    if(t.startsWith('|')){flushBullets();table.push(t);continue}
    flushTable();
    const bullet=t.match(/^[-*]\s+(.+)$/);
    if(bullet){bullets.push(bullet[1]);continue}
    flushBullets();
    if(!t){continue}
    out.push('<p>'+inlineMarkdown(t)+'</p>');
  }
  flushBullets();flushTable();
  return out.join('');
}

function metricRows(body:string){
  return body.split('\n').map(x=>x.trim()).map(x=>{
    const m=x.match(/^[-*]\s+\*\*([^*]+):\*\*\s*(.+)$/);
    return m?{label:m[1].trim(),value:m[2].trim()}:null;
  }).filter(Boolean) as {label:string;value:string}[];
}
function timelineRows(body:string){
  return body.split('\n').map(x=>x.trim()).map(x=>{
    const m=x.match(/^[-*]\s+((?:\d{2}\/\d{2}\/\d{4})|(?:\d{4}-\d{2}-\d{2})|(?:\d{2}\/\d{4})|(?:[a-zç]{3}\/\d{4}))\s+[—-]\s+(.+)$/i);
    return m?{date:m[1],text:m[2]}:null;
  }).filter(Boolean) as {date:string;text:string}[];
}
function riskRows(body:string){
  return body.split('\n').map(x=>x.trim()).map(x=>{
    const m=x.match(/^[-*]\s+(?:\*\*)?(Alto|M[eé]dio|Baixo)(?:\*\*)?\s+[—-]\s+(.+)$/i);
    if(!m)return null;
    const level=norm(m[1]).startsWith('alto')?'high':norm(m[1]).startsWith('medio')?'medium':'low';
    return {level,label:m[1],text:m[2]};
  }).filter(Boolean) as {level:'high'|'medium'|'low';label:string;text:string}[];
}
function actionRows(body:string){
  return body.split('\n').map(x=>x.trim()).map(x=>{
    const m=x.match(/^[-*]\s+(.+?)(?:\s+\(respons[aá]vel:\s*([^;)]+)(?:;\s*prazo:\s*([^)]+))?\))?(?:\s+[—-]\s*(urgente|prioridade alta|prioridade m[eé]dia|prioridade baixa))?\s*$/i);
    if(!m)return null;
    return {action:m[1].trim(),owner:(m[2]||'a definir').trim(),deadline:(m[3]||'—').trim(),priority:(m[4]||'').trim()};
  }).filter(Boolean) as {action:string;owner:string;deadline:string;priority:string}[];
}
function sourceRows(body:string){
  return body.split('\n').map(x=>x.trim()).filter(x=>/^[-*]\s+/.test(x)).map(x=>x.replace(/^[-*]\s+/,''));
}

function renderSection(section:DossierSection){
  const head='<section id="'+esc(section.id)+'" class="role-'+section.role+'"><div class="section-head"><span>'+esc(section.number)+'</span><h2>'+esc(section.title)+'</h2></div>';
  if(section.role==='summary')return head+'<div class="summary-box">'+renderBody(section.body)+'</div></section>';
  if(section.role==='metrics'){
    const rows=metricRows(section.body);
    if(rows.length)return head+'<div class="metrics">'+rows.map(x=>'<article><span>'+inlineMarkdown(x.label)+'</span><b>'+inlineMarkdown(x.value)+'</b></article>').join('')+'</div></section>';
  }
  if(section.role==='timeline'){
    const rows=timelineRows(section.body);
    if(rows.length)return head+'<div class="timeline">'+rows.map(x=>'<article><time>'+esc(x.date)+'</time><div>'+inlineMarkdown(x.text)+'</div></article>').join('')+'</div></section>';
  }
  if(section.role==='risks'){
    const rows=riskRows(section.body);
    if(rows.length)return head+'<div class="risk-grid">'+rows.map(x=>'<article class="risk '+x.level+'"><span>'+esc(x.label)+'</span><p>'+inlineMarkdown(x.text)+'</p></article>').join('')+'</div></section>';
  }
  if(section.role==='actions'){
    const rows=actionRows(section.body);
    if(rows.length)return head+'<div class="table-wrap"><table><thead><tr><th>Ação</th><th>Responsável</th><th>Prazo</th><th>Prioridade</th></tr></thead><tbody>'+rows.map(x=>'<tr><td>'+inlineMarkdown(x.action)+'</td><td>'+inlineMarkdown(x.owner)+'</td><td>'+inlineMarkdown(x.deadline)+'</td><td>'+inlineMarkdown(x.priority||'—')+'</td></tr>').join('')+'</tbody></table></div></section>';
  }
  if(section.role==='sources'){
    const rows=sourceRows(section.body);
    if(rows.length)return head+'<div class="sources">'+rows.map(x=>'<div>'+inlineMarkdown(x)+'</div>').join('')+'</div></section>';
  }
  if(section.role==='evidence')return head+'<div class="evidence">'+renderBody(section.body)+'</div></section>';
  if(section.role==='limitations')return head+'<div class="limitations">'+renderBody(section.body)+'</div></section>';
  return head+renderBody(section.body)+'</section>';
}

export function renderDossierHtml(dossier:DossierDocument,options:RenderDossierOptions={}){
  const quality=validateDossier(dossier,options);
  const theme=options.theme||'auto';
  const nav=dossier.sections.map(x=>'<a href="#'+esc(x.id)+'"><span>'+esc(x.number)+'</span>'+esc(x.title)+'</a>').join('');
  const qualityClass=quality.score>=85&&quality.errors===0?'good':quality.score>=65?'warn':'bad';
  const html='<!doctype html><html lang="pt-BR" data-theme="'+esc(theme)+'"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+esc(dossier.title)+'</title><style>'+
  ':root{--bg:#f4f3ef;--paper:#fff;--ink:#17191d;--soft:#657080;--line:#d9dde3;--accent:#5849c6;--accent2:#8375f2;--ok:#18794e;--warn:#a15c00;--bad:#b42318;--shadow:0 18px 50px rgba(20,24,35,.08)}@media(prefers-color-scheme:dark){html[data-theme="auto"]{--bg:#0b0d12;--paper:#12151c;--ink:#f0f3f7;--soft:#8c98aa;--line:#2a303b;--accent:#9b8cff;--accent2:#7564e8;--ok:#58d39b;--warn:#ffbd63;--bad:#ff7f76;--shadow:0 18px 60px rgba(0,0,0,.3)}}html[data-theme="dark"]{--bg:#0b0d12;--paper:#12151c;--ink:#f0f3f7;--soft:#8c98aa;--line:#2a303b;--accent:#9b8cff;--accent2:#7564e8;--ok:#58d39b;--warn:#ffbd63;--bad:#ff7f76;--shadow:0 18px 60px rgba(0,0,0,.3)}*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.65 Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.cover{padding:54px 24px 36px;background:linear-gradient(135deg,#151728,#262046);color:#fff}.wrap{max-width:1040px;margin:auto}.eyebrow{font:700 10px/1 ui-monospace,monospace;letter-spacing:.14em;text-transform:uppercase;color:#b9afff}.cover h1{font-size:clamp(30px,5vw,52px);line-height:1.02;letter-spacing:-.045em;margin:12px 0 18px;max-width:900px}.bottom-line{max-width:900px;border-left:3px solid #9b8cff;padding:12px 16px;background:rgba(255,255,255,.07);font-size:17px}.meta{display:flex;flex-wrap:wrap;gap:8px;margin-top:18px}.meta span{border:1px solid rgba(255,255,255,.16);border-radius:999px;padding:5px 9px;font-size:10px;color:#d8d4ec}.layout{max-width:1180px;margin:0 auto;display:grid;grid-template-columns:260px minmax(0,1fr);gap:26px;padding:28px 22px 70px}.toc{position:sticky;top:16px;align-self:start;background:var(--paper);border:1px solid var(--line);border-radius:16px;padding:12px;box-shadow:var(--shadow);max-height:calc(100vh - 32px);overflow:auto}.toc h3{font-size:10px;text-transform:uppercase;letter-spacing:.12em;color:var(--soft);margin:4px 6px 9px}.toc a{display:grid;grid-template-columns:27px 1fr;gap:7px;text-decoration:none;color:var(--soft);padding:7px 6px;border-radius:8px;font-size:11px;line-height:1.25}.toc a:hover{background:color-mix(in srgb,var(--accent) 9%,transparent);color:var(--ink)}.toc a span{color:var(--accent);font:700 10px ui-monospace,monospace}.quality{margin-top:12px;border-top:1px solid var(--line);padding:11px 6px 2px}.quality b{font-size:19px}.quality.good b{color:var(--ok)}.quality.warn b{color:var(--warn)}.quality.bad b{color:var(--bad)}main{min-width:0}section{background:var(--paper);border:1px solid var(--line);border-radius:18px;padding:26px 28px;margin-bottom:16px;box-shadow:var(--shadow);scroll-margin-top:18px}.section-head{display:grid;grid-template-columns:38px 1fr;gap:8px;align-items:start;border-bottom:1px solid var(--line);padding-bottom:12px;margin-bottom:18px}.section-head>span{font:800 12px ui-monospace,monospace;color:var(--accent);padding-top:6px}.section-head h2{margin:0;font-size:23px;line-height:1.16;letter-spacing:-.025em}.summary-box{font-size:16px}.summary-box p:first-child{font-size:18px}.metrics{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px}.metrics article{border:1px solid var(--line);border-radius:12px;padding:13px;background:color-mix(in srgb,var(--accent) 3%,var(--paper))}.metrics span{display:block;color:var(--soft);font-size:10px;text-transform:uppercase;letter-spacing:.07em}.metrics b{display:block;font-size:19px;margin-top:5px}.timeline{border-left:2px solid var(--line);margin-left:8px}.timeline article{display:grid;grid-template-columns:105px 1fr;gap:15px;padding:0 0 18px 18px;position:relative}.timeline article:before{content:"";position:absolute;left:-7px;top:6px;width:11px;height:11px;border-radius:50%;background:var(--paper);border:3px solid var(--accent)}.timeline time{font:700 11px ui-monospace,monospace;color:var(--soft)}.risk-grid{display:grid;gap:9px}.risk{display:grid;grid-template-columns:70px 1fr;gap:11px;border:1px solid var(--line);padding:12px;border-radius:11px}.risk>span{font:800 10px ui-monospace,monospace;text-transform:uppercase}.risk p{margin:0}.risk.high{border-left:4px solid var(--bad)}.risk.medium{border-left:4px solid var(--warn)}.risk.low{border-left:4px solid var(--ok)}.table-wrap{overflow:auto}table{width:100%;border-collapse:collapse;font-size:12px}th,td{text-align:left;vertical-align:top;padding:9px;border-bottom:1px solid var(--line)}th{font-size:9px;text-transform:uppercase;letter-spacing:.08em;color:var(--soft)}.sources{display:grid;gap:7px}.sources>div{border-left:2px solid var(--accent);padding:7px 10px;background:color-mix(in srgb,var(--accent) 4%,var(--paper))}.evidence,.limitations{border-radius:12px;padding:5px 14px}.evidence{background:color-mix(in srgb,var(--ok) 5%,var(--paper));border:1px solid color-mix(in srgb,var(--ok) 24%,var(--line))}.limitations{background:color-mix(in srgb,var(--warn) 7%,var(--paper));border:1px solid color-mix(in srgb,var(--warn) 25%,var(--line))}p{margin:0 0 11px}ul{padding-left:20px}.src{display:inline-block;border-radius:999px;padding:1px 6px;font:700 9px ui-monospace,monospace;text-transform:uppercase}.src.official{background:#e8f4ee;color:#18794e}.src.supplied{background:#e9efff;color:#3156a3}.src.inference{background:#f6eddf;color:#8a5a12}a{color:var(--accent)}code{font:12px ui-monospace,monospace;background:color-mix(in srgb,var(--accent) 9%,transparent);padding:1px 4px;border-radius:4px}.quality-issues{font-size:11px;color:var(--soft);margin-top:8px}.quality-issues div{padding:3px 0}.footer{max-width:1040px;margin:0 auto 44px;padding:0 22px;color:var(--soft);font-size:10px}@media(max-width:820px){.layout{grid-template-columns:1fr}.toc{position:static;max-height:none}.cover{padding-top:38px}section{padding:20px}.timeline article{grid-template-columns:1fr;gap:3px}}@media print{body{background:#fff}.toc{display:none}.layout{display:block;max-width:900px;padding:0}.cover{background:#fff;color:#000;padding:20px 0;border-bottom:2px solid #000}.eyebrow,.meta span{color:#333}.bottom-line{background:#f7f7f7;border-color:#333}.cover h1{font-size:30px}section{box-shadow:none;break-inside:avoid;border-radius:0;border-color:#bbb}.footer{padding:0;max-width:900px}}'+
  '</style></head><body><header class="cover"><div class="wrap"><div class="eyebrow">PredictLM · Report Architect</div><h1>'+esc(dossier.title)+'</h1><div class="bottom-line"><strong>Conclusão em uma frase:</strong> '+(dossier.bottomLine?inlineMarkdown(dossier.bottomLine):'<span style="opacity:.65">não informada</span>')+'</div><div class="meta"><span>'+esc(dossier.meta.kind)+'</span><span>'+esc(dossier.meta.classification)+'</span>'+(dossier.meta.author?'<span>'+esc(dossier.meta.author)+'</span>':'')+'<span>'+esc(new Date(dossier.meta.generatedAt||Date.now()).toLocaleString('pt-BR'))+'</span></div></div></header><div class="layout"><aside class="toc"><h3>Sumário</h3>'+nav+'<div class="quality '+qualityClass+'"><small>Qualidade</small><br><b>'+quality.score+'/100</b><div class="quality-issues">'+quality.issues.slice(0,5).map(x=>'<div>• '+esc(x.message)+'</div>').join('')+'</div></div></aside><main>'+dossier.sections.map(renderSection).join('')+'</main></div><footer class="footer">Gerado deterministicamente pelo PredictLM Report Architect. Qualidade '+quality.score+'/100 · '+quality.errors+' erro(s) · '+quality.warnings+' aviso(s) · '+quality.tips+' dica(s).</footer></body></html>';
  return {html,dossier,quality};
}

export function renderReportHtml(markdown:string,options:RenderDossierOptions={}){
  const dossier=parseDossierMarkdown(markdown,options);
  return renderDossierHtml(dossier,options);
}

export function coerceDossier(input:any,options:RenderDossierOptions={}):DossierDocument{
  if(!input||typeof input!=='object')return parseDossierMarkdown('',options);
  const rawSections=Array.isArray(input.sections)?input.sections:[];
  const seen=new Map<string,number>();
  const sections:DossierSection[]=rawSections.slice(0,120).map((row:any,index:number)=>{
    const title=clean(row?.title||'Seção '+(index+1),160);
    const body=clean(row?.body||row?.content||'',50000);
    return {
      id:clean(row?.id||uniqueId(title,seen),90),
      number:String(row?.number||index+1),
      title,
      role:(row?.role&&['summary','metrics','timeline','evidence','risks','options','actions','sources','methodology','limitations','appendix','analysis'].includes(row.role)?row.role:roleForTitle(title)) as DossierRole,
      body,
      wordCount:words(body),
      level:row?.level===3?3:2
    };
  });
  const meta:DossierMeta={
    kind:(input.meta?.kind||options.meta?.kind||detectDossierKind(JSON.stringify(input))) as DossierKind,
    classification:(input.meta?.classification||options.meta?.classification||'confidencial') as DossierClassification,
    author:clean(input.meta?.author||options.meta?.author||'',120)||undefined,
    generatedAt:clean(input.meta?.generatedAt||options.meta?.generatedAt||new Date().toISOString(),80)
  };
  return {
    title:clean(input.title||input.meta?.title||'Dossiê',220),
    bottomLine:clean(input.bottomLine||input.bottom_line||'',600),
    meta,
    sections,
    totalWords:sections.reduce((sum,x)=>sum+x.wordCount,0)
  };
}
