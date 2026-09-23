import type { WorkspaceFile } from './types';

export type CoreIntent =
  | 'calculator'
  | 'todo'
  | 'notes'
  | 'timer'
  | 'converter'
  | 'dashboard'
  | 'crm'
  | 'store'
  | 'portfolio'
  | 'landing'
  | 'generic';

export type DeepThinkLevel = 'fast' | 'deep' | 'max';

export interface CoreSpec {
  intent: CoreIntent;
  title: string;
  confidence: number;
  premium: boolean;
  dark: boolean;
  features: string[];
  keywords: string[];
}

export interface CoreResult {
  explanation: string;
  plan: string[];
  files: WorkspaceFile[];
  spec?: CoreSpec;
}

const INTENTS: Array<{id:CoreIntent; words:RegExp; features:string[]}> = [
  {id:'calculator',words:/calculadora|calculator|calc\b|somar|subtrair|multiplicar|dividir|percentual|porcentagem/i,features:['teclado','histórico','memória','atalhos']},
  {id:'todo',words:/todo|to-do|tarefas?|task list|checklist|afazeres?/i,features:['criar tarefa','concluir','filtrar','excluir']},
  {id:'notes',words:/notas?|notes?|bloco de notas|anotações?|notebook/i,features:['criar nota','buscar','editar','excluir']},
  {id:'timer',words:/timer|cron[oô]metro|pomodoro|contador regressivo|stopwatch/i,features:['iniciar','pausar','resetar','presets']},
  {id:'converter',words:/conversor|converter|câmbio|cambio|moeda|currency|temperatura|medidas?|unidades?/i,features:['converter','trocar unidades','presets']},
  {id:'dashboard',words:/dashboard|painel|analytics|m[eé]trica|metric|kpi|relat[oó]rio executivo/i,features:['KPIs','filtros','atividade','status']},
  {id:'crm',words:/crm|leads?|pipeline|clientes?|sales|vendas?|oportunidades?|financeiro/i,features:['dashboard executivo','sidebar','pipeline','clientes','financeiro','validação de dados','persistência','integrações','buscar','CRUD']},
  {id:'store',words:/loja|store|e-?commerce|produto|checkout|carrinho|shop/i,features:['catálogo','carrinho','quantidade','total']},
  {id:'portfolio',words:/portfolio|portfólio|curr[ií]culo|resume|cases?|projetos pessoais/i,features:['cases','filtros','contato']},
  {id:'landing',words:/landing|site|p[aá]gina|page|saas|homepage|website/i,features:['CTA','seções','navegação']},
];

function cleanPrompt(prompt:string){
  return prompt.replace(/\s+/g,' ').trim();
}

function titleFrom(prompt: string, intent:CoreIntent) {
  const p=cleanPrompt(prompt)
    .replace(/^(crie|criar|faça|faca|gere|gerar|quero|preciso de|construa|build|make)\s+/i,'')
    .replace(/[^p{L}p{N}s-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!p) return intent==='generic'?'Predict App':intent[0].toUpperCase()+intent.slice(1);
  return p.split(' ').slice(0, 6).join(' ').replace(/\b\w/g, (m) => m.toUpperCase());
}

function analyzePrompt(prompt:string):CoreSpec{
  const normalized=cleanPrompt(prompt);
  const scores=INTENTS.map(x=>{
    const matches=normalized.match(new RegExp(x.words.source,'ig'))||[];
    return {item:x,score:matches.length*4+(x.words.test(normalized)?5:0)};
  }).sort((a,b)=>b.score-a.score);
  const best=scores[0];
  const intent:CoreIntent=best&&best.score>0?best.item.id:'generic';
  const premium=/premium|profissional|pro\b|sofisticad|luxo|executiv|incr[ií]vel/i.test(normalized);
  const dark=!/claro|light|branco|clean white/i.test(normalized);
  const featureWords:string[]=[];
  if(/hist[oó]rico|history/i.test(normalized))featureWords.push('histórico');
  if(/mem[oó]ria|memory/i.test(normalized))featureWords.push('memória');
  if(/atalho|teclado|keyboard/i.test(normalized))featureWords.push('atalhos');
  if(/responsiv|mobile|celular/i.test(normalized))featureWords.push('responsivo');
  if(/persist|salvar|save|localstorage/i.test(normalized))featureWords.push('persistência');
  const base=best?.item.features||['interações','estado local','responsividade'];
  const words=normalized.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(w=>w.length>3).slice(0,12);
  return {
    intent,
    title:titleFrom(normalized,intent),
    confidence:intent==='generic'?0.35:Math.min(0.98,0.68+(best?.score||0)/30),
    premium,
    dark,
    features:Array.from(new Set([...base,...featureWords])),
    keywords:Array.from(new Set(words))
  };
}

function baseCss(extra:string=''){
  return [
    ':root{color-scheme:dark;--bg:#07080b;--panel:#101218;--panel2:#151820;--line:#252a35;--text:#f6f7fb;--muted:#8b94a5;--accent:#7c5cff;--accent2:#38d6c3;--danger:#ff647c;--shadow:0 24px 70px rgba(0,0,0,.32)}',
    '*{box-sizing:border-box}',
    'body{margin:0;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:radial-gradient(circle at 80% -10%,#1b1533 0,transparent 35%),var(--bg);color:var(--text)}',
    'button,input,textarea,select{font:inherit}',
    'button{cursor:pointer}',
    '.app{min-height:100vh}',
    '.shell{width:min(1180px,100%);margin:auto;padding:24px}',
    '.top{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:20px}',
    '.brand{font-weight:850;letter-spacing:-.045em}',
    '.pill{display:inline-flex;align-items:center;gap:6px;border:1px solid var(--line);background:#11141b;padding:7px 11px;border-radius:999px;color:#aab2c1;font-size:11px}',
    '.card{background:linear-gradient(180deg,rgba(18,21,29,.98),rgba(10,12,17,.98));border:1px solid var(--line);border-radius:20px;box-shadow:var(--shadow)}',
    '.btn{border:0;border-radius:12px;padding:11px 15px;background:var(--accent);color:white;font-weight:750}',
    '.btn.secondary{background:#151923;border:1px solid var(--line);color:#cbd1dc}',
    '.muted{color:var(--muted)}',
    '.row{display:flex;gap:10px;align-items:center;flex-wrap:wrap}',
    '.grid{display:grid;gap:14px}',
    '@media(max-width:760px){.shell{padding:14px}.top{align-items:flex-start}.desktop-only{display:none!important}}',
    extra
  ].join('');
}

function calculatorApp(title:string){
  const safeTitle=JSON.stringify(title);
  return [
    "export default function App(){",
    "  const [display,setDisplay]=useState('0');",
    "  const [stored,setStored]=useState(null);",
    "  const [operator,setOperator]=useState(null);",
    "  const [waiting,setWaiting]=useState(false);",
    "  const [history,setHistory]=useState([]);",
    "  const [memory,setMemory]=useState(0);",
    "  const [light,setLight]=useState(false);",
    "  const [copied,setCopied]=useState(false);",
    "  const number=()=>Number(display.replace(',','.'))||0;",
    "  const fmt=(n)=>{if(!Number.isFinite(n))return 'Erro';const v=Math.round((n+Number.EPSILON)*1e10)/1e10;return String(v).replace('.',',');};",
    "  const inputDigit=(d)=>{setDisplay(v=>waiting||v==='0'?String(d):(v.length<16?v+String(d):v));setWaiting(false);};",
    "  const inputDot=()=>{setDisplay(v=>{if(waiting)return '0,';return v.includes(',')?v:v+','});setWaiting(false);};",
    "  const calculate=(a,b,op)=>op==='+'?a+b:op==='−'?a-b:op==='×'?a*b:op==='÷'?(b===0?NaN:a/b):b;",
    "  const chooseOperator=(next)=>{const current=number();if(operator&&stored!==null&&!waiting){const result=calculate(stored,current,operator);setDisplay(fmt(result));setStored(result);}else{setStored(current);}setOperator(next);setWaiting(true);};",
    "  const equals=()=>{if(!operator||stored===null)return;const current=number();const result=calculate(stored,current,operator);const label=fmt(stored)+' '+operator+' '+fmt(current)+' = '+fmt(result);setHistory(h=>[label,...h].slice(0,12));setDisplay(fmt(result));setStored(null);setOperator(null);setWaiting(true);};",
    "  const clear=()=>{setDisplay('0');setStored(null);setOperator(null);setWaiting(false);};",
    "  const backspace=()=>{if(waiting)return;setDisplay(v=>v.length<=1||v==='Erro'?'0':v.slice(0,-1));};",
    "  const percent=()=>setDisplay(fmt(number()/100));",
    "  const sign=()=>setDisplay(fmt(number()*-1));",
    "  const copy=async()=>{try{await navigator.clipboard.writeText(display.replace(',','.'));setCopied(true);setTimeout(()=>setCopied(false),1200);}catch{setCopied(false)}};",
    "  useEffect(()=>{const onKey=(e)=>{if(/^[0-9]$/.test(e.key))inputDigit(e.key);else if(e.key==='.')inputDot();else if(e.key==='Enter'||e.key==='=')equals();else if(e.key==='Escape')clear();else if(e.key==='Backspace')backspace();else if(e.key==='+')chooseOperator('+');else if(e.key==='-')chooseOperator('−');else if(e.key==='*')chooseOperator('×');else if(e.key==='/')chooseOperator('÷');};window.addEventListener('keydown',onKey);return()=>window.removeEventListener('keydown',onKey);},[display,stored,operator,waiting]);",
    "  const keys=[['AC','muted',clear],['±','muted',sign],['%','muted',percent],['÷','op',()=>chooseOperator('÷')],['7','num',()=>inputDigit(7)],['8','num',()=>inputDigit(8)],['9','num',()=>inputDigit(9)],['×','op',()=>chooseOperator('×')],['4','num',()=>inputDigit(4)],['5','num',()=>inputDigit(5)],['6','num',()=>inputDigit(6)],['−','op',()=>chooseOperator('−')],['1','num',()=>inputDigit(1)],['2','num',()=>inputDigit(2)],['3','num',()=>inputDigit(3)],['+','op',()=>chooseOperator('+')],['0','num wide',()=>inputDigit(0)],[',','num',inputDot],['=','equal',equals]];",
    "  return <main className={'calc-app '+(light?'light':'')}>",
    "    <div className='calc-shell'>",
    "      <header className='calc-top'><div><span className='eyebrow'>PREDICT DEEPTHINK · ZERO API</span><h1>"+safeTitle+"</h1></div><div className='row'><button className='mini' onClick={()=>setLight(v=>!v)}>{light?'Escuro':'Claro'}</button><button className='mini' onClick={copy}>{copied?'Copiado':'Copiar'}</button></div></header>",
    "      <section className='calc-grid'>",
    "        <div className='calculator card'>",
    "          <div className='memory-row'><button onClick={()=>setMemory(0)}>MC</button><button onClick={()=>setDisplay(fmt(memory))}>MR</button><button onClick={()=>setMemory(m=>m+number())}>M+</button><button onClick={()=>setMemory(m=>m-number())}>M−</button><span>M {fmt(memory)}</span></div>",
    "          <div className='screen'><small>{stored!==null?(fmt(stored)+' '+(operator||'')):history[0]||'Pronto para calcular'}</small><strong>{display}</strong></div>",
    "          <div className='keypad'>{keys.map(([label,cls,fn])=><button key={label} className={cls} onClick={fn}>{label}</button>)}</div>",
    "          <div className='utility'><button onClick={backspace}>⌫ apagar</button><span>Teclado físico suportado</span></div>",
    "        </div>",
    "        <aside className='history card'><div className='history-head'><div><span>HISTÓRICO</span><b>{history.length} cálculos</b></div><button onClick={()=>setHistory([])}>Limpar</button></div>{history.length===0?<div className='empty'>Seus cálculos aparecerão aqui.</div>:<div className='history-list'>{history.map((item,i)=><button key={i} onClick={()=>setDisplay(item.split(' = ').pop())}>{item}</button>)}</div>}<div className='insight'><span>Memória atual</span><strong>{fmt(memory)}</strong><p>Use M+, M−, MR e MC como em uma calculadora financeira.</p></div></aside>",
    "      </section>",
    "    </div>",
    "  </main>",
    "}"
  ].join('\n');
}

function calculatorCss(){
  return baseCss([
    '.calc-app{min-height:100vh;padding:30px 18px;background:radial-gradient(circle at 70% 0,#251a43 0,transparent 30%),#07080b}',
    '.calc-app.light{--bg:#f5f6f8;--panel:#fff;--panel2:#eef0f5;--line:#dfe3ea;--text:#11131a;--muted:#6d7480;background:#eef0f5;color:#11131a}',
    '.calc-shell{width:min(980px,100%);margin:auto}',
    '.calc-top{display:flex;justify-content:space-between;gap:16px;align-items:end;margin-bottom:18px}.calc-top h1{font-size:clamp(28px,5vw,48px);margin:5px 0 0;letter-spacing:-.055em}.eyebrow{font-size:9px;letter-spacing:.15em;color:#9583ef}',
    '.mini{border:1px solid var(--line);background:var(--panel2);color:var(--text);border-radius:10px;padding:9px 11px}',
    '.calc-grid{display:grid;grid-template-columns:minmax(0,1.35fr) minmax(250px,.65fr);gap:16px}.calculator,.history{padding:18px}',
    '.memory-row{display:flex;align-items:center;gap:7px}.memory-row button{border:1px solid var(--line);background:var(--panel2);color:var(--muted);height:32px;min-width:42px;border-radius:9px}.memory-row span{margin-left:auto;font-size:10px;color:var(--muted)}',
    '.screen{min-height:150px;display:flex;flex-direction:column;align-items:flex-end;justify-content:flex-end;padding:20px 4px}.screen small{color:var(--muted);font-size:13px;min-height:20px}.screen strong{font-size:clamp(44px,8vw,72px);letter-spacing:-.065em;max-width:100%;overflow:hidden;text-overflow:ellipsis}',
    '.keypad{display:grid;grid-template-columns:repeat(4,1fr);gap:9px}.keypad button{min-height:62px;border:1px solid var(--line);border-radius:15px;background:#171a22;color:var(--text);font-size:18px;font-weight:720;transition:.15s}.light .keypad button{background:#f4f5f8}.keypad button:hover{transform:translateY(-1px);border-color:#454c5c}.keypad .op{background:#211a39;color:#bcaeff;border-color:#3e345e}.keypad .equal{background:linear-gradient(135deg,#7c5cff,#5d42d8);border-color:#8b75ff;color:white}.keypad .muted{color:#b1b8c5}.keypad .wide{grid-column:span 2}',
    '.utility{display:flex;justify-content:space-between;align-items:center;margin-top:11px;color:var(--muted);font-size:10px}.utility button{border:0;background:transparent;color:#9a8af0}',
    '.history-head{display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--line);padding-bottom:12px}.history-head>div{display:flex;flex-direction:column}.history-head span{font-size:8px;letter-spacing:.13em;color:var(--muted)}.history-head b{font-size:13px;margin-top:3px}.history-head button{border:0;background:transparent;color:#8e80d2;font-size:10px}',
    '.empty{border:1px dashed var(--line);border-radius:12px;padding:20px;color:var(--muted);font-size:11px;margin-top:12px}.history-list{display:flex;flex-direction:column;gap:6px;margin-top:10px;max-height:300px;overflow:auto}.history-list button{text-align:right;border:1px solid var(--line);background:var(--panel2);color:var(--text);border-radius:10px;padding:9px;font-size:11px}.insight{border-top:1px solid var(--line);margin-top:14px;padding-top:14px}.insight span{font-size:9px;color:var(--muted)}.insight strong{display:block;font-size:28px;margin:5px 0}.insight p{font-size:10px;line-height:1.5;color:var(--muted)}',
    '@media(max-width:760px){.calc-app{padding:14px 8px}.calc-grid{grid-template-columns:1fr}.calc-top{align-items:flex-start}.screen{min-height:120px}.keypad button{min-height:56px}.history{order:2}}'
  ].join(''));
}

function todoApp(title:string){
  const safeTitle=JSON.stringify(title);
  return [
    "export default function App(){",
    " const [items,setItems]=useState([{id:1,text:'Definir prioridade do dia',done:false},{id:2,text:'Revisar entrega principal',done:true}]);",
    " const [text,setText]=useState('');const [filter,setFilter]=useState('all');",
    " const add=()=>{const v=text.trim();if(!v)return;setItems(x=>[{id:Date.now(),text:v,done:false},...x]);setText('')};",
    " const visible=items.filter(x=>filter==='all'||(filter==='done'?x.done:!x.done));",
    " return <main className='app'><div className='shell'><div className='top'><div><span className='pill'>Predict DeepThink · zero API</span><h1>"+safeTitle+"</h1></div><span className='pill'>{items.filter(x=>x.done).length}/{items.length} concluídas</span></div><section className='todo card'><div className='composer'><input value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>e.key==='Enter'&&add()} placeholder='Nova tarefa...'/><button className='btn' onClick={add}>Adicionar</button></div><div className='filters'>{['all','open','done'].map(f=><button className={filter===f?'active':''} onClick={()=>setFilter(f)} key={f}>{f==='all'?'Todas':f==='open'?'Pendentes':'Concluídas'}</button>)}</div><div className='tasks'>{visible.length===0?<div className='empty'>Nenhuma tarefa neste filtro.</div>:visible.map(x=><div className='task' key={x.id}><button className={'check '+(x.done?'done':'')} onClick={()=>setItems(a=>a.map(y=>y.id===x.id?{...y,done:!y.done}:y))}>{x.done?'✓':''}</button><span className={x.done?'done-text':''}>{x.text}</span><button className='delete' onClick={()=>setItems(a=>a.filter(y=>y.id!==x.id))}>Excluir</button></div>)}</div></section></div></main>",
    "}"
  ].join('\n');
}

function todoCss(){
  return baseCss([
    '.top h1{font-size:clamp(34px,6vw,58px);letter-spacing:-.055em;margin:10px 0}.todo{padding:18px}.composer{display:grid;grid-template-columns:1fr auto;gap:9px}.composer input{min-width:0;background:#0c0e13;border:1px solid var(--line);color:var(--text);border-radius:12px;padding:12px;outline:0}.filters{display:flex;gap:7px;margin:14px 0}.filters button{border:1px solid var(--line);background:#11141b;color:var(--muted);border-radius:999px;padding:7px 10px;font-size:10px}.filters button.active{background:#211a39;color:#c1b4ff;border-color:#40365d}.tasks{display:flex;flex-direction:column;gap:7px}.task{display:grid;grid-template-columns:30px 1fr auto;align-items:center;gap:9px;border:1px solid var(--line);background:#0d0f14;border-radius:12px;padding:9px}.check{width:28px;height:28px;border:1px solid #383e4b;background:#11141b;color:white;border-radius:9px}.check.done{background:#2d9d78;border-color:#2d9d78}.done-text{text-decoration:line-through;color:var(--muted)}.delete{border:0;background:transparent;color:#d36d7f;font-size:10px}.empty{padding:25px;text-align:center;color:var(--muted)}'
  ].join(''));
}

function timerApp(title:string){
  const safeTitle=JSON.stringify(title);
  return [
    "export default function App(){",
    " const [seconds,setSeconds]=useState(25*60);const [running,setRunning]=useState(false);const [mode,setMode]=useState('focus');",
    " useEffect(()=>{if(!running)return;const id=setInterval(()=>setSeconds(s=>{if(s<=1){setRunning(false);return 0}return s-1}),1000);return()=>clearInterval(id)},[running]);",
    " const setPreset=(m,mins)=>{setMode(m);setSeconds(mins*60);setRunning(false)};const fmt=(s)=>String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0');",
    " return <main className='timer-app'><div className='timer-shell'><span className='pill'>Predict DeepThink · zero API</span><h1>"+safeTitle+"</h1><div className='timer card'><div className='modes'><button onClick={()=>setPreset('focus',25)} className={mode==='focus'?'active':''}>Foco 25</button><button onClick={()=>setPreset('short',5)} className={mode==='short'?'active':''}>Pausa 5</button><button onClick={()=>setPreset('long',15)} className={mode==='long'?'active':''}>Pausa 15</button></div><strong>{fmt(seconds)}</strong><div className='row center'><button className='btn' onClick={()=>setRunning(v=>!v)}>{running?'Pausar':'Iniciar'}</button><button className='btn secondary' onClick={()=>setPreset(mode,mode==='focus'?25:mode==='short'?5:15)}>Resetar</button></div><div className='progress'><i style={{width:Math.max(0,Math.min(100,(1-seconds/((mode==='focus'?25:mode==='short'?5:15)*60))*100))+'%'}}/></div></div></div></main>",
    "}"
  ].join('\n');
}

function timerCss(){
  return baseCss([
    '.timer-app{min-height:100vh;display:grid;place-items:center;padding:18px}.timer-shell{width:min(600px,100%)}.timer-shell h1{font-size:clamp(36px,8vw,68px);letter-spacing:-.06em;margin:12px 0 22px}.timer{padding:24px;text-align:center}.timer strong{display:block;font-size:clamp(72px,18vw,132px);letter-spacing:-.08em;margin:26px 0}.modes{display:flex;justify-content:center;gap:7px}.modes button{border:1px solid var(--line);background:#11141b;color:var(--muted);padding:8px 10px;border-radius:999px;font-size:10px}.modes button.active{background:#211a39;color:#c1b4ff;border-color:#40365d}.center{justify-content:center}.progress{height:5px;background:#191c24;border-radius:999px;overflow:hidden;margin-top:24px}.progress i{display:block;height:100%;background:linear-gradient(90deg,#7c5cff,#38d6c3)}'
  ].join(''));
}

function converterApp(title:string){
  const safeTitle=JSON.stringify(title);
  return [
    "export default function App(){",
    " const [value,setValue]=useState('1');const [from,setFrom]=useState('km');const [to,setTo]=useState('mi');",
    " const factors={m:1,km:1000,cm:.01,mi:1609.344,ft:.3048};const result=(()=>{const n=Number(value);if(!Number.isFinite(n))return '—';return ((n*factors[from])/factors[to]).toLocaleString('pt-BR',{maximumFractionDigits:6})})();",
    " const swap=()=>{setFrom(to);setTo(from)};",
    " return <main className='app'><div className='shell'><span className='pill'>Predict DeepThink · zero API</span><h1 className='big'>"+safeTitle+"</h1><section className='converter card'><label>Valor<input value={value} onChange={e=>setValue(e.target.value)} inputMode='decimal'/></label><div className='unit-grid'><label>De<select value={from} onChange={e=>setFrom(e.target.value)}>{Object.keys(factors).map(x=><option key={x}>{x}</option>)}</select></label><button className='swap' onClick={swap}>⇄</button><label>Para<select value={to} onChange={e=>setTo(e.target.value)}>{Object.keys(factors).map(x=><option key={x}>{x}</option>)}</select></label></div><div className='result'><span>Resultado</span><strong>{result} {to}</strong></div><div className='presets'>{[['1','km','mi'],['100','cm','m'],['10','m','ft']].map(([v,a,b])=><button key={v+a+b} onClick={()=>{setValue(v);setFrom(a);setTo(b)}}>{v} {a} → {b}</button>)}</div></section></div></main>",
    "}"
  ].join('\n');
}

function converterCss(){
  return baseCss([
    '.big{font-size:clamp(38px,7vw,70px);letter-spacing:-.06em;margin:14px 0 24px}.converter{padding:20px;max-width:760px}.converter label{display:flex;flex-direction:column;gap:6px;color:var(--muted);font-size:10px}.converter input,.converter select{background:#0d0f14;border:1px solid var(--line);border-radius:12px;color:var(--text);padding:13px;outline:0}.unit-grid{display:grid;grid-template-columns:1fr auto 1fr;gap:10px;align-items:end;margin-top:12px}.swap{height:44px;width:44px;border:1px solid var(--line);background:#171a22;color:#b7a8ff;border-radius:12px}.result{margin-top:18px;padding:20px;border:1px solid #3a3155;background:#151120;border-radius:15px}.result span{font-size:10px;color:var(--muted)}.result strong{display:block;font-size:clamp(32px,7vw,56px);letter-spacing:-.05em;margin-top:4px}.presets{display:flex;gap:7px;flex-wrap:wrap;margin-top:12px}.presets button{border:1px solid var(--line);background:#11141b;color:#9ea7b7;border-radius:999px;padding:7px 10px;font-size:9px}'
  ].join(''));
}

function crmApp(title:string,prompt:string=''){
  const safeTitle=JSON.stringify(title);
  return [
    "export default function App(){",
    " const statuses=['Novo','Qualificado','Proposta','Fechado'];",
    " const nav=['Dashboard','Pipeline','Clientes','Financeiro','Integrações','Config'];",
    " const seed=[",
    "  {id:1,name:'Marina Costa',company:'Atlas Consultoria',email:'marina@atlas.com',phone:'11988776655',status:'Novo',value:2400,mrr:490,owner:'Ana',last:'Hoje',source:'Indicação'},",
    "  {id:2,name:'Rafael Lima',company:'Nova Capital',email:'rafael@novacapital.com',phone:'11990001122',status:'Qualificado',value:8200,mrr:890,owner:'Davi',last:'Ontem',source:'Site'},",
    "  {id:3,name:'Aline Rocha',company:'Orbit Labs',email:'aline@orbit.io',phone:'11981112233',status:'Proposta',value:14900,mrr:1290,owner:'Ana',last:'2d',source:'Outbound'},",
    "  {id:4,name:'Carlos Melo',company:'Melo & Co.',email:'carlos@melo.co',phone:'11982223344',status:'Fechado',value:21900,mrr:1890,owner:'Davi',last:'4d',source:'Parceiro'}",
    " ];",
    " const [view,setView]=useState('Dashboard');",
    " const [subview,setSubview]=useState('Visão geral');",
    " const [query,setQuery]=useState('');",
    " const [leads,setLeads]=useState(()=>{try{const raw=localStorage.getItem('predict-crm-leads');return raw?JSON.parse(raw):seed}catch{return seed}});",
    " const [backend,setBackend]=useState('checking');",
    " const [form,setForm]=useState({name:'',company:'',email:'',phone:'',value:'',mrr:'',status:'Novo',owner:'Você',source:'Manual'});",
    " const [errors,setErrors]=useState({});",
    " const [editing,setEditing]=useState(null);",
    " const [toast,setToast]=useState('');",
    " const [loading,setLoading]=useState(false);",
    " const [integrations,setIntegrations]=useState([]);",
    " const [integrationBusy,setIntegrationBusy]=useState('');",
    " const API=(window.__PREDICT_API__||'http://localhost:8787');",
    " const invoices=[{id:'INV-1048',client:'Orbit Labs',value:1290,status:'Pendente',due:'28/09'},{id:'INV-1047',client:'Nova Capital',value:890,status:'Pago',due:'18/09'},{id:'INV-1046',client:'Melo & Co.',value:1890,status:'Pago',due:'12/09'}];",
    " const notify=(message)=>{setToast(message);setTimeout(()=>setToast(''),2200)};",
    " const validEmail=v=>!v||/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(v);",
    " const validPhone=v=>!v||v.replace(/\\D/g,'').length>=10;",
    " const validate=()=>{const e={};if(!form.name.trim())e.name='Nome é obrigatório';if(form.email&&!validEmail(form.email))e.email='Email inválido';if(form.phone&&!validPhone(form.phone))e.phone='Telefone inválido';if(form.value!==''&&(!Number.isFinite(Number(form.value))||Number(form.value)<0))e.value='Valor inválido';if(form.mrr!==''&&(!Number.isFinite(Number(form.mrr))||Number(form.mrr)<0))e.mrr='MRR inválido';setErrors(e);return Object.keys(e).length===0};",
    " useEffect(()=>{try{localStorage.setItem('predict-crm-leads',JSON.stringify(leads))}catch{}},[leads]);",
    " useEffect(()=>{let live=true;setLoading(true);Promise.all([fetch(API+'/api/leads').then(r=>r.ok?r.json():Promise.reject(new Error('offline'))),fetch(API+'/api/integrations').then(r=>r.ok?r.json():({items:[]})).catch(()=>({items:[]}))]).then(([rows,status])=>{if(!live)return;if(Array.isArray(rows)&&rows.length)setLeads(rows.map(x=>({...x,value:Number(x.value||0),mrr:Number(x.mrr||0)})));setIntegrations(Array.isArray(status?.items)?status.items:[]);setBackend('connected')}).catch(()=>live&&setBackend('local')).finally(()=>live&&setLoading(false));return()=>{live=false}},[]);",
    " const testIntegration=async id=>{setIntegrationBusy(id);try{const r=await fetch(API+'/api/integrations/test',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({integration:id})});const data=await r.json().catch(()=>({}));setIntegrations(xs=>xs.map(x=>x.id===id?{...x,configured:!!data.ok,lastStatus:data.status||0,lastError:data.error||''}:x));notify(data.ok?id+' conectado':(data.error||'Integração não configurada'))}catch(e){notify('Falha ao testar '+id)}finally{setIntegrationBusy('')}};",
    " const shown=leads.filter(x=>(x.name+' '+x.company+' '+(x.email||'')+' '+(x.phone||'')).toLowerCase().includes(query.toLowerCase()));",
    " const total=leads.reduce((s,x)=>s+Number(x.value||0),0);const mrr=leads.reduce((s,x)=>s+Number(x.mrr||0),0);const won=leads.filter(x=>x.status==='Fechado').reduce((s,x)=>s+Number(x.value||0),0);",
    " const conversion=leads.length?Math.round(leads.filter(x=>x.status==='Fechado').length/leads.length*100):0;",
    " const money=n=>'R$ '+Number(n||0).toLocaleString('pt-BR');",
    " const cleanPhone=v=>String(v||'').replace(/\\D/g,'').slice(0,13);",
    " const resetForm=()=>{setForm({name:'',company:'',email:'',phone:'',value:'',mrr:'',status:'Novo',owner:'Você',source:'Manual'});setErrors({});setEditing(null)};",
    " const submit=async()=>{if(!validate())return;const item={id:editing||Date.now(),name:form.name.trim(),company:form.company.trim()||'Sem empresa',email:form.email.trim(),phone:cleanPhone(form.phone),status:form.status,value:Number(form.value||0),mrr:Number(form.mrr||0),owner:form.owner.trim()||'Você',source:form.source,last:'Agora',updatedAt:new Date().toISOString()};setLeads(xs=>editing?xs.map(x=>x.id===editing?{...x,...item}:x):[item,...xs]);resetForm();notify(editing?'Cliente atualizado':'Cliente adicionado');try{await fetch(API+'/api/leads'+(editing?'/'+editing:''),{method:editing?'PATCH':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(item)});setBackend('connected')}catch{setBackend('local')}};",
    " const edit=x=>{setView('Clientes');setSubview('Cadastro');setEditing(x.id);setForm({name:x.name||'',company:x.company||'',email:x.email||'',phone:x.phone||'',value:String(x.value||''),mrr:String(x.mrr||''),status:x.status||'Novo',owner:x.owner||'Você',source:x.source||'Manual'});setErrors({})};",
    " const move=async(id,dir)=>{let changed=null;setLeads(xs=>xs.map(x=>{if(x.id!==id)return x;const i=statuses.indexOf(x.status);changed={...x,status:statuses[Math.max(0,Math.min(statuses.length-1,i+dir))],last:'Agora'};return changed}));if(changed){try{await fetch(API+'/api/leads/'+id,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(changed)});setBackend('connected')}catch{setBackend('local')}}};",
    " const remove=async id=>{if(!confirm('Excluir este cliente?'))return;setLeads(x=>x.filter(y=>y.id!==id));notify('Cliente removido');try{await fetch(API+'/api/leads/'+id,{method:'DELETE'});setBackend('connected')}catch{setBackend('local')}};",
    " const exportCsv=()=>{const q=String.fromCharCode(34);const rows=[['Nome','Empresa','Email','Telefone','Status','Valor','MRR','Responsável'],...leads.map(x=>[x.name,x.company,x.email,x.phone,x.status,x.value,x.mrr,x.owner])];const csv=rows.map(r=>r.map(v=>q+String(v??'').split(q).join(q+q)+q).join(';')).join('\\n');const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));a.download='crm-clientes.csv';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),500)};",
    " const subnav=view==='Dashboard'?['Visão geral','Atividade']:view==='Pipeline'?['Kanban','Forecast']:view==='Clientes'?['Lista','Cadastro']:view==='Financeiro'?['Resumo','Faturas']:view==='Integrações'?['Conectores','API']:['Workspace','Segurança'];",
    " useEffect(()=>setSubview(subnav[0]),[view]);",
    " return <main className='crm-app'>",
    "  <aside className='crm-nav'><div className='crm-brand'><div className='crm-logo'>P</div><div className='crm-name'><b>"+safeTitle+"</b><span>Predict workspace</span></div></div><nav>{nav.map(x=><button className={view===x?'active':''} onClick={()=>setView(x)} key={x}><span>{x[0]}</span><b>{x}</b></button>)}</nav><div className='crm-agent'><span className={'agent-live '+backend}/><div><b>{backend==='connected'?'API conectada':backend==='checking'?'Verificando backend':'Modo local persistente'}</b><small>{backend==='local'?'Dados salvos no navegador':'Sincronização habilitada'}</small></div></div></aside>",
    "  <section className='crm-main'>",
    "   <header className='crm-bar'><div><span className='crumb'>Workspace / {view}</span><h1>{view}</h1></div><div className='crm-bar-actions'><label className='searchbox'>⌕<input value={query} onChange={e=>setQuery(e.target.value)} placeholder='Buscar cliente, email ou telefone'/></label><button onClick={()=>{setView('Clientes');setSubview('Cadastro');resetForm()}}>+ Novo cliente</button></div></header>",
    "   <div className='crm-subbar'>{subnav.map(x=><button className={subview===x?'active':''} onClick={()=>setSubview(x)} key={x}>{x}</button>)}<span className='spacer'/><small>{loading?'Sincronizando…':shown.length+' registros visíveis'}</small></div>",
    "   {view==='Dashboard'&&<div className='crm-content'><section className='crm-metrics'><article><span>Pipeline total</span><strong>{money(total)}</strong><em>valor aberto + ganho</em></article><article><span>Receita recorrente</span><strong>{money(mrr)}</strong><em>MRR estimado</em></article><article><span>Receita ganha</span><strong>{money(won)}</strong><em>{leads.filter(x=>x.status==='Fechado').length} fechados</em></article><article><span>Conversão</span><strong>{conversion}%</strong><em>pipeline atual</em></article></section><section className='crm-dashboard-grid'><article className='crm-card chart-card'><div className='card-head'><div><b>Forecast por estágio</b><span>distribuição financeira</span></div><button onClick={()=>setView('Pipeline')}>Abrir pipeline</button></div><div className='forecast-bars'>{statuses.map(st=>{const v=leads.filter(x=>x.status===st).reduce((s,x)=>s+Number(x.value||0),0);return <div key={st}><i style={{height:Math.max(12,Math.min(100,total?v/total*260:12))+'%'}}/><span>{st}</span><b>{money(v)}</b></div>})}</div></article><article className='crm-card health-card'><div className='card-head'><div><b>Saúde do CRM</b><span>validação e dados</span></div><span className='agent-live connected'/></div><div className='health-row'><span>Emails válidos</span><b>{leads.filter(x=>validEmail(x.email)).length}/{leads.length}</b></div><div className='health-row'><span>Telefones válidos</span><b>{leads.filter(x=>validPhone(x.phone)).length}/{leads.length}</b></div><div className='health-row'><span>Com responsável</span><b>{leads.filter(x=>x.owner).length}/{leads.length}</b></div><button onClick={()=>setView('Clientes')}>Revisar dados →</button></article></section><section className='crm-card crm-table-card'><div className='card-head'><div><b>Contas recentes</b><span>dados operacionais</span></div><button onClick={()=>setView('Clientes')}>Ver todas</button></div><LeadTable rows={shown.slice(0,5)} money={money} edit={edit}/></section></div>}",
    "   {view==='Pipeline'&&<div className='crm-content'>{subview==='Kanban'?<div className='pipeline'>{statuses.map(status=><section className='column' key={status}><header><div><b>{status}</b><span>{shown.filter(x=>x.status===status).length}</span></div><small>{money(shown.filter(x=>x.status===status).reduce((s,x)=>s+Number(x.value||0),0))}</small></header>{shown.filter(x=>x.status===status).length===0?<div className='column-empty'>Sem oportunidades</div>:shown.filter(x=>x.status===status).map(x=><article key={x.id}><span className='company'>{x.company}</span><b>{x.name}</b><strong>{money(x.value)}</strong><small>{x.owner} · {x.last}</small><div className='move'><button disabled={status==='Novo'} onClick={()=>move(x.id,-1)}>←</button><button onClick={()=>edit(x)}>Editar</button><button disabled={status==='Fechado'} onClick={()=>move(x.id,1)}>→</button></div></article>)}</section>)}</div>:<section className='crm-card forecast-table'>{statuses.map(st=>{const rows=shown.filter(x=>x.status===st);const value=rows.reduce((s,x)=>s+Number(x.value||0),0);return <div key={st}><b>{st}</b><span>{rows.length} oportunidades</span><strong>{money(value)}</strong><i style={{width:(total?value/total*100:0)+'%'}}/></div>})}</section>}</div>}",
    "   {view==='Clientes'&&<div className='crm-content'>{subview==='Cadastro'?<section className='crm-card form-card'><div className='card-head'><div><b>{editing?'Editar cliente':'Novo cliente'}</b><span>validação antes de salvar</span></div>{editing&&<button onClick={resetForm}>Cancelar edição</button>}</div><div className='form-grid'><Field label='Nome *' error={errors.name}><input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder='Nome completo'/></Field><Field label='Empresa'><input value={form.company} onChange={e=>setForm({...form,company:e.target.value})} placeholder='Empresa'/></Field><Field label='Email' error={errors.email}><input value={form.email} onChange={e=>setForm({...form,email:e.target.value})} placeholder='nome@empresa.com'/></Field><Field label='Telefone' error={errors.phone}><input value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} placeholder='(11) 99999-9999'/></Field><Field label='Valor' error={errors.value}><input type='number' min='0' value={form.value} onChange={e=>setForm({...form,value:e.target.value})} placeholder='0'/></Field><Field label='MRR' error={errors.mrr}><input type='number' min='0' value={form.mrr} onChange={e=>setForm({...form,mrr:e.target.value})} placeholder='0'/></Field><Field label='Estágio'><select value={form.status} onChange={e=>setForm({...form,status:e.target.value})}>{statuses.map(x=><option key={x}>{x}</option>)}</select></Field><Field label='Responsável'><input value={form.owner} onChange={e=>setForm({...form,owner:e.target.value})}/></Field><Field label='Origem'><select value={form.source} onChange={e=>setForm({...form,source:e.target.value})}>{['Manual','Site','Indicação','Outbound','Parceiro'].map(x=><option key={x}>{x}</option>)}</select></Field></div><div className='form-actions'><button className='ghost' onClick={resetForm}>Limpar</button><button className='primary' onClick={submit}>{editing?'Salvar alterações':'Adicionar cliente'}</button></div></section>:<section className='crm-card crm-table-card'><div className='card-head'><div><b>Clientes e oportunidades</b><span>{shown.length} registros validados</span></div><button onClick={exportCsv}>Exportar CSV</button></div><LeadTable rows={shown} money={money} edit={edit} remove={remove}/></section>}</div>}",
    "   {view==='Financeiro'&&<div className='crm-content'><section className='finance-grid'><article className='crm-card'><span>MRR</span><strong>{money(mrr)}</strong><small>recorrência estimada</small></article><article className='crm-card'><span>A receber</span><strong>{money(invoices.filter(x=>x.status==='Pendente').reduce((s,x)=>s+x.value,0))}</strong><small>faturas pendentes</small></article><article className='crm-card'><span>Ticket pipeline</span><strong>{money(leads.length?Math.round(total/leads.length):0)}</strong><small>média por oportunidade</small></article></section><section className='crm-card invoice-card'><div className='card-head'><div><b>Faturas</b><span>controle financeiro</span></div><button onClick={exportCsv}>Exportar dados</button></div>{invoices.map(x=><div className='invoice' key={x.id}><b>{x.id}</b><span>{x.client}</span><strong>{money(x.value)}</strong><em className={x.status==='Pago'?'paid':'pending'}>{x.status}</em><small>{x.due}</small></div>)}</section></div>}",
    "   {view==='Integrações'&&<div className='crm-content'><section className='integration-grid'>{(integrations.length?integrations:[{id:'rest-api',configured:backend==='connected',mode:'server-proxy'}]).map(x=>{const labels={'rest-api':'API REST','supabase':'Supabase','firebase':'Firebase','stripe':'Stripe','github':'GitHub','vercel':'Vercel','datajud':'DataJud','djen':'DJEN'};const name=labels[x.id]||x.id;return <article className='crm-card' key={x.id}><div className='integration-icon'>{name[0]}</div><div><b>{name}</b><span>{x.configured?'Credencial/configuração detectada no servidor.':'Aguardando variáveis de ambiente; nenhum status fictício é exibido.'}</span></div><button className={x.configured?'connected-btn':''} disabled={integrationBusy===x.id} onClick={()=>testIntegration(x.id)}>{integrationBusy===x.id?'Testando…':x.configured?'Testar conexão':'Verificar config'}</button></article>})}</section><section className='crm-card api-contract'><div className='card-head'><div><b>Contrato de integração</b><span>adapters reais no backend exportado</span></div></div><code>GET /api/integrations</code><code>POST /api/integrations/test</code><code>ANY /api/proxy?integration=...&path=...</code><code>GET/POST/PATCH/DELETE /api/leads</code><p>O ZIP inclui <b>src/integrations</b>, validação, estado assíncrono, .env.example e backend local. Uma integração só aparece conectada quando o backend confirma.</p></section></div>}",
    "   {view==='Config'&&<div className='crm-content settings-grid'><section className='crm-card'><div className='card-head'><div><b>Workspace</b><span>comportamento e persistência</span></div></div><Setting title='Persistência local' desc='Mantém alterações mesmo sem backend' on={true}/><Setting title='Sincronização API' desc={backend==='connected'?'Backend respondendo':'Fallback local ativo'} on={backend==='connected'}/><Setting title='Validação de formulário' desc='Bloqueia dados inválidos antes de salvar' on={true}/></section><section className='crm-card'><div className='card-head'><div><b>Segurança</b><span>defaults do starter</span></div></div><ul><li>Segredos fora do bundle do navegador</li><li>Sanitização básica de texto</li><li>Validação de email/telefone/valores</li><li>Confirmação antes de exclusão</li></ul></section></div>}",
    "   {toast&&<div className='toast'>{toast}</div>}",
    "  </section>",
    " </main>",
    "}",
    "function Field({label,error,children}){return <label className={'field '+(error?'invalid':'')}><span>{label}</span>{children}{error&&<small>{error}</small>}</label>}",
    "function LeadTable({rows,money,edit,remove}){return <div className='lead-table'><div className='lead-row head'><span>Cliente</span><span>Contato</span><span>Estágio</span><span>Valor</span><span>Responsável</span><span></span></div>{rows.length===0?<div className='table-empty'>Nenhum registro corresponde à busca.</div>:rows.map(x=><div className='lead-row' key={x.id}><span><b>{x.name}</b><small>{x.company} · {x.source||'Manual'}</small></span><span><b>{x.email||'—'}</b><small>{x.phone||'sem telefone'}</small></span><span><em>{x.status}</em></span><span><strong>{money(x.value)}</strong><small>MRR {money(x.mrr)}</small></span><span>{x.owner}<small>{x.last}</small></span><span className='table-actions'><button onClick={()=>edit(x)}>Editar</button>{remove&&<button className='danger-mini' onClick={()=>remove(x.id)}>×</button>}</span></div>)}</div>}",
    "function Setting({title,desc,on}){return <div className='setting-row'><div><b>{title}</b><span>{desc}</span></div><i className={on?'on':''}><u/></i></div>}",
  ].join('\n');
}

function crmCss(){
  return baseCss([
    '.crm-app{min-height:100vh;display:grid;grid-template-columns:230px minmax(0,1fr);background:#08090c}.crm-nav{border-right:1px solid var(--line);padding:16px 11px;display:flex;flex-direction:column;background:#090b0f;position:sticky;top:0;height:100vh}.crm-brand{display:flex;align-items:center;gap:9px;padding:3px 6px 18px}.crm-logo{width:34px;height:34px;border-radius:11px;background:linear-gradient(135deg,#7c5cff,#4c35b8);display:grid;place-items:center;font-weight:900}.crm-name{display:flex;flex-direction:column;min-width:0}.crm-name b{font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.crm-name span{font-size:7px;color:var(--muted);margin-top:3px}.crm-nav nav{display:flex;flex-direction:column;gap:3px}.crm-nav nav button{border:0;background:transparent;color:#768195;border-radius:9px;padding:8px;display:flex;align-items:center;gap:8px;font-size:9px;text-align:left}.crm-nav nav button>span{width:22px;height:22px;border:1px solid #252a33;border-radius:7px;display:grid;place-items:center;font-size:8px}.crm-nav nav button>b{font-size:9px}.crm-nav nav button.active{background:#151821;color:#eceef3}.crm-agent{margin-top:auto;border:1px solid var(--line);background:#0e1116;border-radius:11px;padding:9px;display:grid;grid-template-columns:auto 1fr;align-items:center;gap:7px}.crm-agent>div{display:flex;flex-direction:column}.crm-agent b{font-size:8px}.crm-agent small{color:var(--muted);font-size:7px;margin-top:2px}.agent-live{width:7px;height:7px;border-radius:50%;background:#858b96}.agent-live.connected{background:#42d29b;box-shadow:0 0 10px rgba(66,210,155,.45)}.agent-live.local{background:#e2aa52}.agent-live.checking{animation:pulse 1s infinite}',
    '.crm-main{min-width:0;position:relative}.crm-bar{min-height:72px;border-bottom:1px solid var(--line);display:flex;align-items:center;justify-content:space-between;padding:11px 20px;background:#0b0d11;gap:12px}.crm-bar>div:first-child{display:flex;flex-direction:column}.crumb{font-size:7px;color:#5e697b}.crm-bar h1{font-size:21px;letter-spacing:-.04em;margin:3px 0}.crm-bar-actions{display:flex;gap:7px;align-items:center}.searchbox{width:min(310px,32vw);display:flex;align-items:center;gap:5px;border:1px solid var(--line);background:#10131a;border-radius:9px;padding:0 8px;color:#687386}.searchbox input{min-width:0;flex:1;border:0;background:transparent;color:var(--text);padding:9px 3px;outline:0;font-size:9px}.crm-bar-actions>button,.form-actions .primary,.card-head button{border:1px solid #463b68;background:#211936;color:#c0b2ff;border-radius:9px;padding:8px 10px;font-size:8px}.crm-subbar{height:42px;border-bottom:1px solid #1d2027;display:flex;align-items:center;gap:5px;padding:0 19px;background:#0a0c10;position:sticky;top:0;z-index:4}.crm-subbar button{border:0;background:transparent;color:#667184;border-radius:7px;padding:6px 8px;font-size:8px}.crm-subbar button.active{background:#181b23;color:#e6e9ef}.crm-subbar .spacer{flex:1}.crm-subbar small{font-size:7px;color:#555f70}.crm-content{padding:16px;min-width:0}.crm-card{border:1px solid var(--line);background:#0e1015;border-radius:14px;padding:13px}',
    '.crm-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px}.crm-metrics article{border:1px solid var(--line);background:#0e1015;border-radius:13px;padding:12px}.crm-metrics span,.finance-grid article>span{display:block;font-size:7px;color:var(--muted)}.crm-metrics strong,.finance-grid article>strong{display:block;font-size:23px;letter-spacing:-.04em;margin:5px 0}.crm-metrics em{font-size:7px;color:#50c99b;font-style:normal}.crm-dashboard-grid{display:grid;grid-template-columns:1.4fr .72fr;gap:9px;margin-top:9px}.card-head{display:flex;justify-content:space-between;align-items:center;gap:8px}.card-head>div{display:flex;flex-direction:column}.card-head b{font-size:9px}.card-head span{font-size:7px;color:var(--muted);margin-top:2px}.forecast-bars{height:220px;display:flex;align-items:flex-end;gap:10px;padding:22px 4px 0}.forecast-bars>div{flex:1;height:100%;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;gap:5px}.forecast-bars i{width:100%;max-width:62px;background:linear-gradient(180deg,#866eff,#41319d);border-radius:8px 8px 3px 3px}.forecast-bars span{font-size:7px;color:var(--muted)}.forecast-bars b{font-size:7px}.health-card{display:flex;flex-direction:column;gap:6px}.health-row{display:flex;justify-content:space-between;border:1px solid #1e222a;background:#11141b;border-radius:9px;padding:8px}.health-row span{font-size:8px;color:#7c8799}.health-row b{font-size:8px}.health-card>button{margin-top:auto;border:0;background:transparent;color:#9d8be9;text-align:left;font-size:8px}',
    '.pipeline{display:grid;grid-template-columns:repeat(4,minmax(190px,1fr));gap:9px;overflow:auto}.column{border:1px solid var(--line);background:#0d0f14;border-radius:13px;padding:9px;min-height:430px}.column>header{display:flex;justify-content:space-between;align-items:start;padding:3px 2px 7px}.column>header>div{display:flex;align-items:center;gap:6px}.column>header b{font-size:8px}.column>header span{font-size:7px;border:1px solid var(--line);border-radius:999px;padding:2px 5px;color:var(--muted)}.column>header small{font-size:7px;color:#6b7586}.column article{border:1px solid var(--line);background:#12151b;border-radius:11px;padding:9px;margin-top:6px}.column article .company{font-size:7px;color:#7d6fbb}.column article>b{display:block;font-size:9px;margin:3px 0 8px}.column article>strong{font-size:12px}.column article>small{display:block;font-size:7px;color:var(--muted);margin-top:4px}.move{display:grid;grid-template-columns:28px 1fr 28px;gap:4px;margin-top:8px}.move button{height:25px;border:1px solid var(--line);background:#181b23;color:#8993a5;border-radius:7px;font-size:7px}.move button:disabled{opacity:.25}.column-empty,.table-empty{padding:20px;text-align:center;color:#596475;font-size:8px}.forecast-table>div{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;align-items:center;padding:12px 2px;border-top:1px solid #1d2027;position:relative}.forecast-table>div:first-child{border-top:0}.forecast-table span{color:var(--muted);font-size:8px}.forecast-table strong{text-align:right}.forecast-table i{position:absolute;bottom:0;height:2px;background:#7559e9}',
    '.form-card{max-width:980px}.form-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:13px}.field{display:flex;flex-direction:column;gap:5px}.field>span{font-size:7px;color:#7a8495}.field input,.field select{width:100%;border:1px solid var(--line);background:#0b0d12;color:var(--text);border-radius:9px;padding:9px;font-size:9px;outline:0}.field.invalid input,.field.invalid select{border-color:#733341}.field small{font-size:7px;color:#ef8295}.form-actions{display:flex;justify-content:flex-end;gap:7px;margin-top:14px;padding-top:12px;border-top:1px solid #1d2027}.form-actions .ghost{border:1px solid var(--line);background:#13161d;color:#7e899a;border-radius:9px;padding:8px 10px;font-size:8px}.crm-table-card{margin-top:9px}.lead-table{margin-top:10px;overflow:auto}.lead-row{min-width:850px;display:grid;grid-template-columns:1.2fr 1.1fr .7fr .8fr .7fr .55fr;gap:9px;align-items:center;border-top:1px solid #1c2028;padding:9px 2px}.lead-row.head{border:0;color:#5f697a;font-size:7px;text-transform:uppercase;letter-spacing:.07em}.lead-row>span{font-size:8px;display:flex;flex-direction:column}.lead-row small{font-size:7px;color:var(--muted);margin-top:2px}.lead-row em{font-style:normal;font-size:7px;border:1px solid #38304f;background:#17131f;color:#a899ee;border-radius:999px;padding:4px 7px;width:max-content}.table-actions{flex-direction:row!important;gap:4px}.table-actions button{border:1px solid var(--line);background:#141720;color:#8c96a7;border-radius:7px;padding:5px 7px;font-size:7px}.table-actions .danger-mini{color:#d77b8c;border-color:#432730}',
    '.finance-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:9px}.finance-grid article small{color:var(--muted);font-size:7px}.invoice-card{margin-top:9px}.invoice{display:grid;grid-template-columns:.6fr 1.4fr .8fr .7fr .5fr;align-items:center;gap:9px;padding:10px 2px;border-top:1px solid #1b1e25;font-size:8px}.invoice em{font-style:normal;font-size:7px;border-radius:999px;padding:4px 7px;width:max-content}.invoice em.paid{background:#10251c;color:#64d7a6}.invoice em.pending{background:#2b2211;color:#d6b36b}.invoice small{color:var(--muted)}',
    '.integration-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:9px}.integration-grid article{display:grid;grid-template-columns:38px 1fr auto;align-items:center;gap:10px}.integration-icon{width:36px;height:36px;border-radius:10px;background:#171b24;display:grid;place-items:center;font-weight:800;color:#9e8fec}.integration-grid article>div:nth-child(2){display:flex;flex-direction:column}.integration-grid b{font-size:9px}.integration-grid span{font-size:7px;color:var(--muted);line-height:1.4;margin-top:3px}.integration-grid button{border:1px solid var(--line);background:#151821;color:#758093;border-radius:8px;padding:7px 8px;font-size:7px}.integration-grid button.connected-btn{border-color:#24533f;background:#10241b;color:#61cea1}.api-contract{margin-top:9px;display:flex;flex-direction:column;gap:6px}.api-contract code{border:1px solid #1e222a;background:#0a0c10;color:#a2adc0;border-radius:8px;padding:8px;font-size:8px}.api-contract p{font-size:8px;color:var(--muted);line-height:1.5}.settings-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px}.setting-row{display:flex;justify-content:space-between;align-items:center;padding:11px 0;border-top:1px solid #1d2027}.setting-row>div{display:flex;flex-direction:column}.setting-row b{font-size:8px}.setting-row span{font-size:7px;color:var(--muted);margin-top:3px}.setting-row>i{width:34px;height:19px;border-radius:999px;background:#20242d;padding:2px}.setting-row>i u{display:block;width:13px;height:13px;border-radius:50%;background:#677184;text-decoration:none}.setting-row>i.on{background:#214735}.setting-row>i.on u{transform:translateX(15px);background:#67d6a9}.settings-grid ul{padding-left:18px;color:#8c96a8;font-size:8px;line-height:1.8}.toast{position:fixed;right:18px;bottom:18px;background:#f2f3f5;color:#111;border-radius:10px;padding:10px 13px;font-size:8px;font-weight:750;box-shadow:0 15px 40px rgba(0,0,0,.4);z-index:20}',
    '@media(max-width:980px){.crm-app{grid-template-columns:70px minmax(0,1fr)}.crm-name{display:none}.crm-brand{justify-content:center}.crm-nav nav button>b{display:none}.crm-nav nav button{justify-content:center}.crm-agent{display:none}.crm-metrics{grid-template-columns:1fr 1fr}.crm-dashboard-grid{grid-template-columns:1fr}.form-grid{grid-template-columns:1fr 1fr}.integration-grid{grid-template-columns:1fr}.searchbox{width:180px}}@media(max-width:660px){.crm-app{grid-template-columns:1fr}.crm-nav{position:static;height:auto;border-right:0;border-bottom:1px solid var(--line);padding:8px}.crm-brand{display:none}.crm-nav nav{display:grid;grid-template-columns:repeat(6,1fr);overflow:auto}.crm-nav nav button{padding:6px}.crm-nav nav button>span{width:26px;height:26px}.crm-bar{align-items:flex-start;flex-direction:column;padding:10px 12px}.crm-bar-actions{width:100%}.searchbox{width:auto;flex:1}.crm-content{padding:9px}.crm-subbar{padding:0 9px;overflow:auto}.crm-subbar small{display:none}.crm-metrics,.finance-grid,.settings-grid{grid-template-columns:1fr 1fr}.form-grid{grid-template-columns:1fr}.pipeline{grid-template-columns:repeat(4,240px)}}@media(max-width:440px){.crm-metrics,.finance-grid,.settings-grid{grid-template-columns:1fr}.crm-bar-actions{flex-direction:column;align-items:stretch}.crm-nav nav{grid-template-columns:repeat(3,1fr)}}'
  ].join(''));
}

function notesApp(title:string){
  const safeTitle=JSON.stringify(title);
  return [
    "export default function App(){",
    " const seed=[{id:1,title:'Ideias',body:'Liste decisões e próximos passos aqui.'},{id:2,title:'Projeto',body:'Use busca, edição e exclusão sem backend.'}];",
    " const [notes,setNotes]=useState(seed);const [selected,setSelected]=useState(1);const [query,setQuery]=useState('');",
    " const current=notes.find(n=>n.id===selected)||notes[0];const visible=notes.filter(n=>(n.title+' '+n.body).toLowerCase().includes(query.toLowerCase()));",
    " const add=()=>{const n={id:Date.now(),title:'Nova nota',body:''};setNotes(x=>[n,...x]);setSelected(n.id)};",
    " const update=(field,value)=>setNotes(xs=>xs.map(n=>n.id===selected?{...n,[field]:value}:n));",
    " const remove=()=>{if(!current)return;const rest=notes.filter(n=>n.id!==current.id);setNotes(rest);setSelected(rest[0]?.id||0)};",
    " return <main className='notes-app'><div className='notes-shell'><header><div><span className='pill'>Predict DeepThink · zero API</span><h1>"+safeTitle+"</h1></div><button className='btn' onClick={add}>Nova nota</button></header><section className='notes-grid'><aside className='card notes-list'><input value={query} onChange={e=>setQuery(e.target.value)} placeholder='Buscar notas...'/>{visible.length===0?<div className='empty'>Nada encontrado.</div>:visible.map(n=><button className={selected===n.id?'active':''} onClick={()=>setSelected(n.id)} key={n.id}><b>{n.title}</b><span>{n.body.slice(0,60)||'Sem conteúdo'}</span></button>)}</aside><article className='card editor'>{current?<><input className='note-title' value={current.title} onChange={e=>update('title',e.target.value)}/><textarea value={current.body} onChange={e=>update('body',e.target.value)} placeholder='Escreva sua nota...'/><div className='note-actions'><span>{current.body.length} caracteres</span><button onClick={remove}>Excluir nota</button></div></>:<div className='empty'>Crie uma nota para começar.</div>}</article></section></div></main>",
    "}"
  ].join('\n');
}

function notesCss(){
  return baseCss([
    '.notes-app{min-height:100vh;padding:24px}.notes-shell{width:min(1050px,100%);margin:auto}.notes-shell>header{display:flex;justify-content:space-between;align-items:end;gap:15px;margin-bottom:15px}.notes-shell h1{font-size:clamp(36px,7vw,62px);letter-spacing:-.06em;margin:8px 0 0}.notes-grid{display:grid;grid-template-columns:280px 1fr;gap:12px;min-height:560px}.notes-list{padding:10px;display:flex;flex-direction:column;gap:6px}.notes-list>input{border:1px solid var(--line);background:#0d0f14;color:var(--text);border-radius:10px;padding:10px;outline:0}.notes-list>button{border:1px solid transparent;background:transparent;color:var(--text);border-radius:10px;padding:10px;text-align:left;display:flex;flex-direction:column;gap:4px}.notes-list>button:hover,.notes-list>button.active{background:#171a22;border-color:#2c3140}.notes-list b{font-size:10px}.notes-list span{font-size:8px;color:var(--muted)}.editor{padding:18px;display:flex;flex-direction:column}.note-title{border:0;background:transparent;color:var(--text);font-size:32px;font-weight:800;letter-spacing:-.04em;outline:0}.editor textarea{flex:1;min-height:360px;border:0;background:transparent;color:#c9cfd9;resize:none;outline:0;padding:18px 0;font-size:14px;line-height:1.65}.note-actions{border-top:1px solid var(--line);padding-top:12px;display:flex;justify-content:space-between;color:var(--muted);font-size:9px}.note-actions button{border:1px solid #4a2932;background:#181014;color:#d77989;border-radius:8px;padding:6px 8px;font-size:9px}@media(max-width:760px){.notes-app{padding:12px}.notes-grid{grid-template-columns:1fr}.notes-list{max-height:220px}.notes-shell>header{align-items:flex-start}.editor textarea{min-height:300px}}'
  ].join(''));
}

function portfolioApp(title:string){
  const safeTitle=JSON.stringify(title);
  return [
    "export default function App(){",
    " const projects=[{name:'Product System',kind:'Product',desc:'Interface, automação e métricas em um único fluxo.'},{name:'AI Workspace',kind:'AI',desc:'Agentes, revisão e ferramentas locais.'},{name:'Mobile Experience',kind:'Mobile',desc:'Fluxo responsivo com foco em execução rápida.'}];",
    " const [filter,setFilter]=useState('All');const [copied,setCopied]=useState(false);const shown=projects.filter(p=>filter==='All'||p.kind===filter);",
    " const contact=async()=>{try{await navigator.clipboard.writeText('contact@example.com');setCopied(true);setTimeout(()=>setCopied(false),1200)}catch{setCopied(false)}};",
    " return <main className='portfolio-app'><div className='portfolio-shell'><nav><b>"+safeTitle+"</b><div className='row'><button onClick={()=>document.getElementById('work')?.scrollIntoView({behavior:'smooth'})}>Projetos</button><button onClick={contact}>{copied?'Email copiado':'Contato'}</button></div></nav><section className='portfolio-hero'><span>DESIGN + DEVELOPMENT</span><h1>Produtos claros.<br/>Interações reais.</h1><p>Portfólio funcional gerado pelo Predict DeepThink sem API externa.</p><button className='btn' onClick={()=>document.getElementById('work')?.scrollIntoView({behavior:'smooth'})}>Ver projetos</button></section><section id='work'><div className='portfolio-head'><h2>Selected work</h2><div className='row'>{['All','Product','AI','Mobile'].map(x=><button className={filter===x?'active':''} onClick={()=>setFilter(x)} key={x}>{x}</button>)}</div></div><div className='portfolio-grid'>{shown.map((p,i)=><article className='card' key={p.name}><div className={'case-art a'+i}/><span>{p.kind}</span><h3>{p.name}</h3><p>{p.desc}</p><button onClick={()=>alert(p.name+' · case aberto')}>Abrir case →</button></article>)}</div></section></div></main>",
    "}"
  ].join('\n');
}

function portfolioCss(){
  return baseCss([
    '.portfolio-app{min-height:100vh}.portfolio-shell{width:min(1100px,100%);margin:auto;padding:22px}.portfolio-shell nav{display:flex;justify-content:space-between;align-items:center}.portfolio-shell nav>div button{border:0;background:transparent;color:#8f98a8;font-size:10px}.portfolio-hero{padding:90px 0}.portfolio-hero>span{font-size:9px;letter-spacing:.16em;color:#9a88f1}.portfolio-hero h1{font-size:clamp(54px,10vw,104px);line-height:.88;letter-spacing:-.075em;margin:14px 0}.portfolio-hero p{color:var(--muted);font-size:16px}.portfolio-head{display:flex;justify-content:space-between;align-items:end;margin-bottom:13px}.portfolio-head h2{font-size:32px;letter-spacing:-.04em}.portfolio-head button{border:1px solid var(--line);background:#10131a;color:#7f899b;border-radius:999px;padding:7px 9px;font-size:9px}.portfolio-head button.active{background:#211936;color:#c4b8ff;border-color:#4b3e70}.portfolio-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;padding-bottom:70px}.portfolio-grid article{padding:13px}.case-art{height:220px;border-radius:14px;background:linear-gradient(135deg,#2d2350,#12141a);margin-bottom:13px}.case-art.a1{background:linear-gradient(135deg,#163936,#12141a)}.case-art.a2{background:linear-gradient(135deg,#3b2c20,#12141a)}.portfolio-grid span{font-size:8px;color:#8f7ee3}.portfolio-grid h3{margin:6px 0}.portfolio-grid p{color:var(--muted);font-size:10px;line-height:1.5}.portfolio-grid article button{border:0;background:transparent;color:#a28ff7;padding:0;font-size:10px}@media(max-width:760px){.portfolio-hero{padding:60px 0}.portfolio-grid{grid-template-columns:1fr}.portfolio-head{align-items:flex-start;flex-direction:column;gap:8px}}'
  ].join(''));
}

function storeApp(title:string){
  const safeTitle=JSON.stringify(title);
  return [
    "export default function App(){",
    " const products=[{id:1,name:'Orbit Headphones',price:399},{id:2,name:'Nova Keyboard',price:649},{id:3,name:'Flux Camera',price:1099}];const [cart,setCart]=useState({});",
    " const add=(id)=>setCart(c=>({...c,[id]:(c[id]||0)+1}));const remove=(id)=>setCart(c=>({...c,[id]:Math.max(0,(c[id]||0)-1)}));const total=products.reduce((s,p)=>s+(cart[p.id]||0)*p.price,0);",
    " return <main className='app'><div className='shell'><div className='top'><div><span className='pill'>Predict DeepThink · zero API</span><h1 className='shop-title'>"+safeTitle+"</h1></div><span className='pill'>Carrinho · {Object.values(cart).reduce((a,b)=>a+b,0)}</span></div><div className='shop-grid'>{products.map((p,i)=><article className='product card' key={p.id}><div className={'visual v'+i}/><h3>{p.name}</h3><span>R$ {p.price.toLocaleString('pt-BR')}</span><div className='row'><button className='btn' onClick={()=>add(p.id)}>Adicionar</button>{cart[p.id]>0&&<><button className='btn secondary' onClick={()=>remove(p.id)}>−</button><b>{cart[p.id]}</b></>}</div></article>)}</div><aside className='cart card'><div><span>Total</span><strong>R$ {total.toLocaleString('pt-BR')}</strong></div><button className='btn' disabled={!total} onClick={()=>alert('Checkout simulado: R$ '+total.toLocaleString('pt-BR'))}>Finalizar pedido</button></aside></div></main>",
    "}"
  ].join('\n');
}

function storeCss(){
  return baseCss([
    '.shop-title{font-size:clamp(38px,7vw,68px);letter-spacing:-.06em;margin:10px 0}.shop-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}.product{padding:14px}.visual{height:180px;border-radius:14px;background:linear-gradient(135deg,#27223b,#11141b);margin-bottom:14px}.v1{background:linear-gradient(135deg,#163432,#11141b)}.v2{background:linear-gradient(135deg,#33261d,#11141b)}.product h3{margin:0 0 5px}.product>span{color:var(--muted)}.product .row{margin-top:14px}.cart{margin-top:14px;padding:14px;display:flex;justify-content:space-between;align-items:center}.cart>div{display:flex;flex-direction:column}.cart span{font-size:9px;color:var(--muted)}.cart strong{font-size:24px}.cart button:disabled{opacity:.35}@media(max-width:760px){.shop-grid{grid-template-columns:1fr}.cart{align-items:flex-start;gap:14px;flex-direction:column}}'
  ].join(''));
}

function dashboardApp(title:string){
  const safeTitle=JSON.stringify(title);
  return [
    "export default function App(){",
    " const [period,setPeriod]=useState('30d');const sets={7:[42.8,1180,6.2],30:[84.2,12480,7.9],90:[231.5,38840,8.4]};const days=Number(period.replace('d',''));const data=sets[days]||sets[30];",
    " return <main className='app'><div className='shell'><div className='top'><div><span className='pill'>Predict DeepThink · zero API</span><h1 className='dash-title'>"+safeTitle+"</h1></div><div className='row'>{['7d','30d','90d'].map(x=><button className={'period '+(period===x?'active':'')} onClick={()=>setPeriod(x)} key={x}>{x}</button>)}</div></div><section className='metrics'><article className='card'><span>Receita</span><strong>R$ {data[0]}k</strong><em>+12,4%</em></article><article className='card'><span>Usuários</span><strong>{data[1].toLocaleString('pt-BR')}</strong><em>+8,1%</em></article><article className='card'><span>Conversão</span><strong>{data[2]}%</strong><em>+1,2%</em></article></section><section className='dash-grid'><article className='card chart'><header><b>Performance</b><span>{period}</span></header><div className='bars'>{[35,58,42,72,65,88,76,94].map((h,i)=><i key={i} style={{height:h+'%'}}/>)}</div></article><article className='card activity'><b>Atividade recente</b>{['Novo cliente convertido','Relatório concluído','Meta semanal atingida'].map((x,i)=><button key={x} onClick={()=>alert(x)}><span>{x}</span><small>{i+1}h atrás</small></button>)}</article></section></div></main>",
    "}"
  ].join('\n');
}

function dashboardCss(){
  return baseCss([
    '.dash-title{font-size:clamp(36px,7vw,62px);letter-spacing:-.06em;margin:10px 0}.period{border:1px solid var(--line);background:#11141b;color:var(--muted);border-radius:999px;padding:7px 10px;font-size:10px}.period.active{background:#211a39;color:#c1b4ff;border-color:#40365d}.metrics{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.metrics article{padding:15px}.metrics span{display:block;font-size:9px;color:var(--muted)}.metrics strong{display:block;font-size:30px;letter-spacing:-.04em;margin:6px 0}.metrics em{font-style:normal;color:#42d29b;font-size:10px}.dash-grid{display:grid;grid-template-columns:1.5fr .75fr;gap:12px;margin-top:12px}.chart,.activity{padding:15px}.chart header{display:flex;justify-content:space-between}.chart header span{font-size:9px;color:var(--muted)}.bars{height:270px;display:flex;align-items:flex-end;gap:9px;padding-top:25px}.bars i{flex:1;background:linear-gradient(180deg,#8c73ff,#4332a8);border-radius:7px 7px 3px 3px}.activity{display:flex;flex-direction:column;gap:7px}.activity>b{margin-bottom:5px}.activity button{border:1px solid var(--line);background:#11141b;color:var(--text);border-radius:10px;padding:10px;text-align:left;display:flex;flex-direction:column}.activity small{color:var(--muted);margin-top:3px}@media(max-width:760px){.metrics,.dash-grid{grid-template-columns:1fr}.bars{height:190px}}'
  ].join(''));
}

function landingApp(title:string,prompt:string){
  const safeTitle=JSON.stringify(title),safePrompt=JSON.stringify(prompt.slice(0,180));
  return [
    "export default function App(){",
    " const [started,setStarted]=useState(false);",
    " const go=()=>{setStarted(true);setTimeout(()=>document.getElementById('workspace')?.scrollIntoView({behavior:'smooth'}),50)};",
    " return <main className='app'><div className='shell'><div className='top'><div className='brand'>"+safeTitle+"</div><span className='pill'>Predict DeepThink · zero API</span></div><section className='hero'><span className='pill'>Functional starter</span><h1>"+safeTitle+"</h1><p>"+safePrompt+"</p><div className='row'><button className='btn' onClick={go}>{started?'Workspace aberto':'Começar'}</button><button className='btn secondary' onClick={()=>alert('Projeto pronto para exportação em ZIP')}>Como funciona</button></div></section><section id='workspace' className='workspace card'><h2>{started?'Próxima etapa desbloqueada':'Seu workspace'}</h2><p>{started?'Agora os botões executam ações reais. Edite o código ou descreva uma função mais específica no agente.':'Clique em Começar para ativar este starter.'}</p><div className='steps'>{['Build','Review','Ship'].map((x,i)=><button key={x} onClick={()=>alert(x+' · etapa '+(i+1))}><b>{x}</b><span>{i+1}</span></button>)}</div></section></div></main>",
    "}"
  ].join('\n');
}

function landingCss(){
  return baseCss([
    '.hero{padding:70px 0 45px}.hero h1{font-size:clamp(48px,9vw,96px);line-height:.93;letter-spacing:-.07em;margin:12px 0;max-width:900px}.hero p{max-width:700px;color:var(--muted);font-size:17px;line-height:1.65}.workspace{padding:22px;margin-bottom:80px}.workspace h2{font-size:30px;letter-spacing:-.04em}.workspace p{color:var(--muted)}.steps{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.steps button{border:1px solid var(--line);background:#11141b;color:var(--text);border-radius:13px;padding:14px;display:flex;justify-content:space-between}.steps span{color:#8573df}@media(max-width:760px){.steps{grid-template-columns:1fr}}'
  ].join(''));
}

function genericApp(title:string,prompt:string){
  return landingApp(title,prompt);
}
function genericCss(){return landingCss();}

function buildApp(spec:CoreSpec,prompt:string){
  if(spec.intent==='calculator')return calculatorApp(spec.title);
  if(spec.intent==='todo')return todoApp(spec.title);
  if(spec.intent==='timer')return timerApp(spec.title);
  if(spec.intent==='converter')return converterApp(spec.title);
  if(spec.intent==='crm')return crmApp(spec.title,prompt);
  if(spec.intent==='notes')return notesApp(spec.title);
  if(spec.intent==='portfolio')return portfolioApp(spec.title);
  if(spec.intent==='store')return storeApp(spec.title);
  if(spec.intent==='dashboard')return dashboardApp(spec.title);
  return genericApp(spec.title,prompt);
}

function buildCss(spec:CoreSpec){
  if(spec.intent==='calculator')return calculatorCss();
  if(spec.intent==='todo')return todoCss();
  if(spec.intent==='timer')return timerCss();
  if(spec.intent==='converter')return converterCss();
  if(spec.intent==='crm')return crmCss();
  if(spec.intent==='notes')return notesCss();
  if(spec.intent==='portfolio')return portfolioCss();
  if(spec.intent==='store')return storeCss();
  if(spec.intent==='dashboard')return dashboardCss();
  return genericCss();
}

function buildSpecFile(spec:CoreSpec,prompt:string,depth:DeepThinkLevel){
  return JSON.stringify({engine:'Predict DeepThink',version:6,depth,prompt,spec,generatedAt:new Date().toISOString()},null,2);
}

function maybeRefineExisting(prompt:string,currentFiles:WorkspaceFile[]){
  if(!currentFiles.length)return null;
  const p=prompt.toLowerCase().trim();
  const hasProject=currentFiles.some(f=>/(^|\/)App\.(tsx|jsx|js|ts)$/.test(f.path));
  const styleSignal=/\b(cor|tema|fundo|background|accent|rosa|pink|azul|blue|verde|green|vermelh|red|roxo|purple|violet|laranja|orange|amarelo|yellow|preto|black|branco|white|arredond|rounded|compact|menor|maior|fonte|font)\b/i.test(p);
  const editVerb=/mude|troque|altere|deixe|melhore|aumente|diminua|remova|adicione|corrija|fix|change|improve|make it|quero .* (rosa|azul|verde|roxo|vermelh)/i.test(p);
  const shortContextual=hasProject&&p.split(/\s+/).length<=8&&styleSignal;
  if(!(editVerb||shortContextual))return null;
  const css=currentFiles.find(f=>/styles?\.css$|globals\.css$/.test(f.path));
  if(!css)return null;
  let next=css.content;
  const changes:string[]=[];
  const setVar=(name:string,value:string)=>{
    const re=new RegExp(name+':[^;]+;');
    if(re.test(next))next=next.replace(re,name+':'+value+';');
    else next=':root{'+name+':'+value+';}\n'+next;
  };
  if(/rosa|pink/.test(p)){setVar('--accent','#ec4899');setVar('--accent2','#f9a8d4');next += '\n.keypad .equal,.btn{background:linear-gradient(135deg,#ec4899,#be185d)!important}.keypad .op{background:#3a1630!important;color:#fbcfe8!important;border-color:#6b214e!important}';changes.push('accent → pink');}
  if(/azul|blue/.test(p)){setVar('--accent','#3b82f6');setVar('--accent2','#60a5fa');changes.push('accent → blue');}
  if(/verde|green/.test(p)){setVar('--accent','#22c55e');setVar('--accent2','#6ee7b7');changes.push('accent → green');}
  if(/vermelh|red/.test(p)){setVar('--accent','#ef4444');setVar('--accent2','#fb7185');changes.push('accent → red');}
  if(/roxo|purple|violet/.test(p)){setVar('--accent','#7c5cff');setVar('--accent2','#a78bfa');changes.push('accent → violet');}
  if(/laranja|orange/.test(p)){setVar('--accent','#f97316');setVar('--accent2','#fdba74');changes.push('accent → orange');}
  if(/amarelo|yellow/.test(p)){setVar('--accent','#eab308');setVar('--accent2','#fde047');changes.push('accent → yellow');}
  if(/mais arredond|rounded/.test(p)){next += '\n.card,.btn,button,input{border-radius:18px!important}';changes.push('more rounded UI');}
  if(/compact|menor|smaller/.test(p)){next += '\n.shell{padding-top:14px!important;padding-bottom:14px!important}.card{padding:12px!important}';changes.push('compact density');}
  if(/fonte maior|texto maior|bigger font/.test(p)){next += '\nbody{font-size:17px!important}';changes.push('larger typography');}
  if(!changes.length)return null;
  return {changes,file:{...css,content:next}};
}

function existingProjectIntent(files:WorkspaceFile[]):CoreIntent|''{
  const spec=files.find(f=>f.path==='predict.spec.json');
  try{
    const value=spec?String(JSON.parse(spec.content)?.spec?.intent||''):'';
    const allowed:CoreIntent[]=['calculator','todo','notes','timer','converter','dashboard','crm','store','portfolio','landing','generic'];
    return allowed.includes(value as CoreIntent)?value as CoreIntent:'';
  }catch{return ''}
}

function explicitFreshStart(prompt:string){
  return /\b(novo projeto|nova aplicação|nova aplicacao|do zero|from scratch|recrie do zero|recomece do zero|reset project)\b/i.test(prompt);
}

export function runPredictCore(prompt: string, currentFiles:WorkspaceFile[] = [], depth:DeepThinkLevel='deep'): CoreResult {
  const normalized=cleanPrompt(prompt);
  const refinement=maybeRefineExisting(normalized,currentFiles);
  if(refinement){
    return {
      explanation:'Predict DeepThink aplicou uma edição local ao projeto existente: '+refinement.changes.join(', ')+'. Nenhuma API foi usada.',
      plan:['Detectar pedido de edição','Preservar arquivos existentes','Aplicar transformação segura','Atualizar preview','Manter histórico local'],
      files:[refinement.file]
    };
  }

  const spec=analyzePrompt(normalized);
  const existingIntent=existingProjectIntent(currentFiles);
  if(existingIntent&&!explicitFreshStart(normalized)){
    const requestedIntent=spec.intent;
    const sameOrAmbiguous=requestedIntent==='generic'||requestedIntent===existingIntent;
    if(sameOrAmbiguous){
      return {
        explanation:'O projeto atual foi preservado. O pedido foi tratado como continuação de “'+existingIntent+'”, então o DeepThink não recriou App.tsx nem styles.css.',
        plan:[
          'Ler o estado atual do projeto',
          'Manter o intent existente: '+existingIntent,
          'Preservar arquivos e funcionalidades já concluídos',
          'Continuar pelas etapas incompletas de arquitetura, backend, testes ou acabamento'
        ],
        files:[],
        spec:{...spec,intent:existingIntent,confidence:Math.max(spec.confidence,.96)}
      };
    }
    return {
      explanation:'Existe um projeto “'+existingIntent+'” ativo. Para evitar substituir o trabalho atual por “'+requestedIntent+'”, nenhuma reconstrução foi aplicada. Use “novo projeto” ou “do zero” apenas quando quiser realmente trocar o app.',
      plan:['Preservar o projeto atual','Não substituir App.tsx automaticamente','Tratar o novo pedido como extensão ou solicitar um novo projeto explícito'],
      files:[],
      spec:{...spec,intent:existingIntent,confidence:Math.max(spec.confidence,.9)}
    };
  }

  const stages=depth==='fast'
    ? ['Classificar objetivo','Selecionar blueprint funcional','Gerar preview']
    : depth==='max'
      ? ['Interpretar objetivo e idioma','Pontuar intenções','Extrair requisitos funcionais','Selecionar arquitetura local-first','Gerar interface e estado','Conectar todas as ações','Criar spec do projeto','Validar interações previstas','Preparar revisão e exportação']
      : ['Interpretar objetivo','Classificar intenção','Extrair funcionalidades','Gerar app com estado real','Conectar ações','Criar spec','Preparar revisão'];

  const files:WorkspaceFile[]=[
    {path:'App.tsx',content:buildApp(spec,normalized),language:'typescript'},
    {path:'styles.css',content:buildCss(spec),language:'css'},
    {path:'predict.spec.json',content:buildSpecFile(spec,normalized,depth),language:'json'},
    {path:'README.md',content:'# '+spec.title+'\n\nGerado pelo Predict DeepThink v6 com arquitetura local-first, validação e integração opcional.\n\n**Intent:** '+spec.intent+'\n\n**Features:** '+spec.features.join(', ')+'\n\n**Prompt:** '+normalized+'\n',language:'markdown'}
  ];

  return {
    explanation:'Predict DeepThink identificou “'+spec.intent+'” com '+Math.round(spec.confidence*100)+'% de confiança e gerou uma aplicação funcional com '+spec.features.join(', ')+'. Nenhuma API, Ollama ou modelo externo foi necessário.',
    plan:stages,
    files,
    spec
  };
}

export function explainDeepThink(prompt:string){
  const spec=analyzePrompt(prompt);
  return {
    title:spec.title,
    intent:spec.intent,
    confidence:spec.confidence,
    features:spec.features,
    summary:'Análise estruturada determinística; não expõe cadeia de raciocínio privada.'
  };
}
