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
  {id:'crm',words:/crm|leads?|pipeline|clientes?|sales|vendas?|oportunidades?/i,features:['adicionar lead','pipeline','mover status','buscar']},
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
  const financial=/finance|financeiro|receita|fatura|cobrança|cobranca/i.test(prompt);
  return [
    "export default function App(){",
    " const statuses=['Novo','Qualificado','Proposta','Fechado'];",
    " const [view,setView]=useState('Dashboard');const [query,setQuery]=useState('');const [name,setName]=useState('');const [company,setCompany]=useState('');",
    " const [leads,setLeads]=useState([{id:1,name:'Marina Costa',company:'Atlas Consultoria',status:'Novo',value:2400,mrr:490,owner:'Ana',last:'Hoje'},{id:2,name:'Rafael Lima',company:'Nova Capital',status:'Qualificado',value:8200,mrr:890,owner:'Davi',last:'Ontem'},{id:3,name:'Aline Rocha',company:'Orbit Labs',status:'Proposta',value:14900,mrr:1290,owner:'Ana',last:'2d'},{id:4,name:'Carlos Melo',company:'Melo & Co.',status:'Fechado',value:21900,mrr:1890,owner:'Davi',last:'4d'}]);const [backend,setBackend]=useState('local');const API='http://localhost:8787';",
    " const invoices=[{id:'INV-1048',client:'Orbit Labs',value:1290,status:'Pendente',due:'28/09'},{id:'INV-1047',client:'Nova Capital',value:890,status:'Pago',due:'18/09'},{id:'INV-1046',client:'Melo & Co.',value:1890,status:'Pago',due:'12/09'}];",
    " useEffect(()=>{fetch(API+'/api/leads').then(r=>r.ok?r.json():Promise.reject()).then(rows=>{if(Array.isArray(rows)&&rows.length){setLeads(rows.map(x=>({...x,company:x.company||'Sem empresa',status:x.status||'Novo',value:Number(x.value||0),mrr:Number(x.mrr||0),owner:x.owner||'Você',last:x.last||'Agora'})));setBackend('connected')}}).catch(()=>setBackend('local'))},[]);",
    " const shown=leads.filter(x=>(x.name+' '+x.company).toLowerCase().includes(query.toLowerCase()));",
    " const total=leads.reduce((s,x)=>s+x.value,0);const mrr=leads.reduce((s,x)=>s+x.mrr,0);const won=leads.filter(x=>x.status==='Fechado').reduce((s,x)=>s+x.value,0);",
    " const add=()=>{if(!name.trim())return;const item={id:Date.now(),name:name.trim(),company:company.trim()||'Sem empresa',status:'Novo',value:0,mrr:0,owner:'Você',last:'Agora'};setLeads(x=>[item,...x]);setName('');setCompany('');fetch(API+'/api/leads',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(item)}).then(r=>{if(r.ok)setBackend('connected')}).catch(()=>{})};",
    " const move=(id,dir)=>setLeads(xs=>xs.map(x=>{if(x.id!==id)return x;const i=statuses.indexOf(x.status);return {...x,status:statuses[Math.max(0,Math.min(statuses.length-1,i+dir))],last:'Agora'}}));",
    " const remove=id=>{setLeads(x=>x.filter(y=>y.id!==id));fetch(API+'/api/leads/'+id,{method:'DELETE'}).then(r=>{if(r.ok)setBackend('connected')}).catch(()=>{})};",
    " const money=n=>'R$ '+n.toLocaleString('pt-BR');",
    " return <main className='crm-app'><aside className='crm-nav'><div className='crm-logo'>P</div><div className='crm-name'><b>"+safeTitle+"</b><span>agent-ready workspace</span></div><nav>{['Dashboard','Pipeline','Clientes','Financeiro'].map(x=><button className={view===x?'active':''} onClick={()=>setView(x)} key={x}><span>{x[0]}</span>{x}</button>)}</nav><div className='crm-agent'><span className='agent-live'/>Build agent ready<small>{backend==='connected'?'backend conectado':'preview local'}</small></div></aside>",
    " <section className='crm-main'><header className='crm-bar'><div><span className='crumb'>Workspace / {view}</span><h1>{view}</h1></div><div className='crm-bar-actions'><input value={query} onChange={e=>setQuery(e.target.value)} placeholder='Buscar cliente ou empresa'/><button onClick={()=>setView('Clientes')}>+ Novo cliente</button></div></header>",
    " {view==='Dashboard'&&<div className='crm-content'><section className='crm-metrics'><article><span>Pipeline total</span><strong>{money(total)}</strong><em>+18,4% no mês</em></article><article><span>Receita recorrente</span><strong>{money(mrr)}</strong><em>MRR estimado</em></article><article><span>Receita ganha</span><strong>{money(won)}</strong><em>{leads.filter(x=>x.status==='Fechado').length} negócio fechado</em></article><article><span>Conversão</span><strong>{Math.round(leads.filter(x=>x.status==='Fechado').length/leads.length*100)}%</strong><em>pipeline atual</em></article></section><section className='crm-dashboard-grid'><article className='crm-card chart-card'><div className='card-head'><div><b>Forecast financeiro</b><span>Valor por estágio</span></div><button onClick={()=>setView('Pipeline')}>Ver pipeline</button></div><div className='forecast-bars'>{statuses.map((st,i)=>{const v=leads.filter(x=>x.status===st).reduce((s,x)=>s+x.value,0);return <div key={st}><i style={{height:Math.max(14,Math.min(100,v/220))+'%'}}/><span>{st}</span><b>{money(v)}</b></div>})}</div></article><article className='crm-card agent-card'><div className='card-head'><div><b>Agent brief</b><span>próximas ações baseadas em dados</span></div><span className='agent-live'/></div>{[['Orbit Labs','Proposta de R$ 14,9k parada há 2 dias.'],['Nova Capital','Qualificada; preparar proposta e próxima reunião.'],['Melo & Co.','Cliente fechado; confirmar onboarding e primeira entrega.']].map(([a,b])=><button key={a} onClick={()=>setQuery(a)}><b>{a}</b><span>{b}</span></button>)}</article></section><section className='crm-card crm-table-card'><div className='card-head'><div><b>Contas recentes</b><span>atividade e valor em aberto</span></div><button onClick={()=>setView('Clientes')}>Todos</button></div><LeadTable rows={shown.slice(0,4)} money={money} setView={setView}/></section></div>}",
    " {view==='Pipeline'&&<div className='crm-content'><div className='pipeline'>{statuses.map(status=><section className='column' key={status}><header><div><b>{status}</b><span>{shown.filter(x=>x.status===status).length}</span></div><small>{money(shown.filter(x=>x.status===status).reduce((s,x)=>s+x.value,0))}</small></header>{shown.filter(x=>x.status===status).map(x=><article key={x.id}><span className='company'>{x.company}</span><b>{x.name}</b><strong>{money(x.value)}</strong><small>{x.owner} · {x.last}</small><div className='move'><button disabled={status==='Novo'} onClick={()=>move(x.id,-1)}>←</button><button disabled={status==='Fechado'} onClick={()=>move(x.id,1)}>→</button></div></article>)}</section>)}</div></div>}",
    " {view==='Clientes'&&<div className='crm-content'><section className='crm-card client-create'><div><b>Novo cliente</b><span>Registro local no preview; o ZIP inclui camada de backend.</span></div><input value={name} onChange={e=>setName(e.target.value)} placeholder='Nome'/><input value={company} onChange={e=>setCompany(e.target.value)} placeholder='Empresa'/><button onClick={add}>Adicionar</button></section><section className='crm-card crm-table-card'><div className='card-head'><div><b>Clientes e oportunidades</b><span>{shown.length} registros</span></div></div><LeadTable rows={shown} money={money} setView={setView} onDelete={remove}/></section></div>}",
    " {view==='Financeiro'&&<div className='crm-content'><section className='finance-grid'><article className='crm-card'><span>MRR</span><strong>{money(mrr)}</strong><small>receita recorrente estimada</small></article><article className='crm-card'><span>A receber</span><strong>{money(invoices.filter(x=>x.status==='Pendente').reduce((s,x)=>s+x.value,0))}</strong><small>1 fatura pendente</small></article><article className='crm-card'><span>Ticket pipeline</span><strong>{money(Math.round(total/leads.length))}</strong><small>média por oportunidade</small></article></section><section className='crm-card invoice-card'><div className='card-head'><div><b>Faturas</b><span>visão financeira operacional</span></div><button onClick={()=>alert('Exportação financeira preparada')}>Exportar</button></div>{invoices.map(x=><div className='invoice' key={x.id}><b>{x.id}</b><span>{x.client}</span><strong>{money(x.value)}</strong><em className={x.status==='Pago'?'paid':'pending'}>{x.status}</em><small>{x.due}</small></div>)}</section></div>}",
    " </section></main>",
    "}",
    "function LeadTable({rows,money,setView,onDelete}){return <div className='lead-table'><div className='lead-row head'><span>Cliente</span><span>Estágio</span><span>Valor</span><span>Responsável</span><span></span></div>{rows.map(x=><div className='lead-row' key={x.id}><span><b>{x.name}</b><small>{x.company}</small></span><span><em>{x.status}</em></span><span><strong>{money(x.value)}</strong><small>MRR {money(x.mrr)}</small></span><span>{x.owner}<small>{x.last}</small></span><span className='table-actions'><button onClick={()=>setView('Pipeline')}>Abrir</button>{onDelete&&<button onClick={()=>onDelete(x.id)}>×</button>}</span></div>)}</div>}",
  ].join('\n');
}

function crmCss(){
  return baseCss([
    '.crm-app{min-height:100vh;display:grid;grid-template-columns:220px 1fr;background:#08090c}.crm-nav{border-right:1px solid var(--line);padding:18px 12px;display:flex;flex-direction:column;background:#0a0c10}.crm-logo{width:34px;height:34px;border-radius:11px;background:linear-gradient(135deg,#7c5cff,#4c35b8);display:grid;place-items:center;font-weight:900;margin-bottom:10px}.crm-name{display:flex;flex-direction:column;padding:0 5px 18px}.crm-name b{font-size:12px}.crm-name span{font-size:8px;color:var(--muted);margin-top:3px}.crm-nav nav{display:flex;flex-direction:column;gap:3px}.crm-nav nav button{border:0;background:transparent;color:#768195;border-radius:9px;padding:9px;text-align:left;display:flex;align-items:center;gap:8px;font-size:10px}.crm-nav nav button>span{width:20px;height:20px;border:1px solid #252a33;border-radius:6px;display:grid;place-items:center;font-size:8px}.crm-nav nav button.active{background:#151821;color:#eceef3}.crm-agent{margin-top:auto;border:1px solid var(--line);background:#0e1116;border-radius:10px;padding:9px;font-size:9px;display:grid;grid-template-columns:auto 1fr;align-items:center;gap:6px}.crm-agent small{grid-column:2;color:var(--muted);font-size:7px}.agent-live{width:7px;height:7px;border-radius:50%;background:#42d29b;box-shadow:0 0 10px rgba(66,210,155,.45)}',
    '.crm-main{min-width:0}.crm-bar{height:76px;border-bottom:1px solid var(--line);display:flex;align-items:center;justify-content:space-between;padding:0 22px;background:#0b0d11}.crm-bar>div:first-child{display:flex;flex-direction:column}.crumb{font-size:8px;color:#5e697b}.crm-bar h1{font-size:22px;letter-spacing:-.04em;margin:3px 0}.crm-bar-actions{display:flex;gap:7px}.crm-bar-actions input{width:240px;border:1px solid var(--line);background:#10131a;color:var(--text);border-radius:9px;padding:9px;font-size:9px}.crm-bar-actions button,.client-create button,.card-head button{border:1px solid #463b68;background:#211936;color:#b9a8ff;border-radius:9px;padding:8px 10px;font-size:8px}.crm-content{padding:18px;min-width:0}.crm-card{border:1px solid var(--line);background:#0e1015;border-radius:15px;padding:14px}',
    '.crm-metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}.crm-metrics article{border:1px solid var(--line);background:#0e1015;border-radius:13px;padding:13px}.crm-metrics span,.finance-grid article>span{display:block;font-size:8px;color:var(--muted)}.crm-metrics strong,.finance-grid article>strong{display:block;font-size:24px;letter-spacing:-.04em;margin:5px 0}.crm-metrics em{font-size:8px;color:#50c99b;font-style:normal}.crm-dashboard-grid{display:grid;grid-template-columns:1.45fr .75fr;gap:10px;margin-top:10px}.card-head{display:flex;justify-content:space-between;align-items:center;gap:8px}.card-head>div{display:flex;flex-direction:column}.card-head b{font-size:10px}.card-head span{font-size:8px;color:var(--muted);margin-top:2px}.forecast-bars{height:240px;display:flex;align-items:flex-end;gap:10px;padding:25px 5px 0}.forecast-bars>div{flex:1;height:100%;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;gap:5px}.forecast-bars i{width:100%;max-width:70px;background:linear-gradient(180deg,#866eff,#41319d);border-radius:8px 8px 3px 3px}.forecast-bars span{font-size:7px;color:var(--muted)}.forecast-bars b{font-size:8px}.agent-card{display:flex;flex-direction:column;gap:7px}.agent-card>.card-head{margin-bottom:2px}.agent-card>button{border:1px solid var(--line);background:#11141b;color:var(--text);border-radius:10px;padding:10px;text-align:left;display:flex;flex-direction:column}.agent-card>button b{font-size:9px}.agent-card>button span{font-size:8px;color:var(--muted);margin-top:4px;line-height:1.4}.crm-table-card{margin-top:10px}',
    '.pipeline{display:grid;grid-template-columns:repeat(4,minmax(180px,1fr));gap:10px;overflow:auto}.column{border:1px solid var(--line);background:#0d0f14;border-radius:13px;padding:10px;min-height:420px}.column>header{display:flex;justify-content:space-between;align-items:start;padding:3px 2px 8px}.column>header>div{display:flex;align-items:center;gap:6px}.column>header b{font-size:9px}.column>header span{font-size:7px;border:1px solid var(--line);border-radius:999px;padding:2px 5px;color:var(--muted)}.column>header small{font-size:7px;color:#6b7586}.column article{border:1px solid var(--line);background:#12151b;border-radius:11px;padding:10px;margin-top:7px}.column article .company{font-size:7px;color:#7d6fbb}.column article>b{display:block;font-size:10px;margin:3px 0 8px}.column article>strong{font-size:13px}.column article>small{display:block;font-size:7px;color:var(--muted);margin-top:4px}.move{display:flex;gap:4px;margin-top:8px}.move button{width:28px;height:25px;border:1px solid var(--line);background:#181b23;color:#8993a5;border-radius:7px}.move button:disabled{opacity:.25}',
    '.client-create{display:grid;grid-template-columns:1.2fr 1fr 1fr auto;gap:8px;align-items:center;margin-bottom:10px}.client-create>div{display:flex;flex-direction:column}.client-create b{font-size:10px}.client-create span{font-size:8px;color:var(--muted);margin-top:3px}.client-create input{min-width:0;border:1px solid var(--line);background:#0b0d12;color:var(--text);border-radius:9px;padding:9px;font-size:9px}.lead-table{margin-top:11px;overflow:auto}.lead-row{min-width:680px;display:grid;grid-template-columns:1.4fr .8fr .8fr .8fr .6fr;gap:10px;align-items:center;border-top:1px solid #1c2028;padding:9px 3px}.lead-row.head{border:0;color:#5f697a;font-size:7px;text-transform:uppercase;letter-spacing:.08em}.lead-row>span{font-size:9px;display:flex;flex-direction:column}.lead-row small{font-size:7px;color:var(--muted);margin-top:2px}.lead-row em{font-style:normal;font-size:7px;border:1px solid #38304f;background:#17131f;color:#a899ee;border-radius:999px;padding:4px 7px;width:max-content}.table-actions{flex-direction:row!important;gap:4px}.table-actions button{border:1px solid var(--line);background:#141720;color:#8c96a7;border-radius:7px;padding:5px 7px;font-size:7px}',
    '.finance-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.finance-grid article small{color:var(--muted);font-size:8px}.invoice-card{margin-top:10px}.invoice{display:grid;grid-template-columns:.6fr 1.4fr .8fr .7fr .5fr;align-items:center;gap:10px;padding:10px 2px;border-top:1px solid #1b1e25;font-size:9px}.invoice em{font-style:normal;font-size:7px;border-radius:999px;padding:4px 7px;width:max-content}.invoice em.paid{background:#10251c;color:#64d7a6}.invoice em.pending{background:#2b2211;color:#d6b36b}.invoice small{color:var(--muted)}',
    '@media(max-width:900px){.crm-app{grid-template-columns:64px 1fr}.crm-name,.crm-nav nav button:not(.active){font-size:0}.crm-nav nav button{justify-content:center}.crm-nav nav button>span{font-size:8px}.crm-agent{display:none}.crm-metrics{grid-template-columns:1fr 1fr}.crm-dashboard-grid{grid-template-columns:1fr}.client-create{grid-template-columns:1fr 1fr}.client-create>div{grid-column:1/-1}.crm-bar-actions input{width:150px}}@media(max-width:620px){.crm-app{grid-template-columns:1fr}.crm-nav{display:none}.crm-bar{height:auto;padding:12px;align-items:flex-start}.crm-bar-actions{flex-direction:column}.crm-bar-actions input{width:180px}.crm-content{padding:10px}.crm-metrics,.finance-grid{grid-template-columns:1fr 1fr}.client-create{grid-template-columns:1fr}.client-create>div{grid-column:auto}.forecast-bars{height:190px}}'
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
  return JSON.stringify({engine:'Predict DeepThink',version:4,depth,prompt,spec,generatedAt:new Date().toISOString()},null,2);
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
  const stages=depth==='fast'
    ? ['Classificar objetivo','Selecionar blueprint funcional','Gerar preview']
    : depth==='max'
      ? ['Interpretar objetivo e idioma','Pontuar intenções','Extrair requisitos funcionais','Selecionar arquitetura local-first','Gerar interface e estado','Conectar todas as ações','Criar spec do projeto','Validar interações previstas','Preparar revisão e exportação']
      : ['Interpretar objetivo','Classificar intenção','Extrair funcionalidades','Gerar app com estado real','Conectar ações','Criar spec','Preparar revisão'];

  const files:WorkspaceFile[]=[
    {path:'App.tsx',content:buildApp(spec,normalized),language:'typescript'},
    {path:'styles.css',content:buildCss(spec),language:'css'},
    {path:'predict.spec.json',content:buildSpecFile(spec,normalized,depth),language:'json'},
    {path:'README.md',content:'# '+spec.title+'\n\nGerado pelo Predict DeepThink v4 sem API externa.\n\n**Intent:** '+spec.intent+'\n\n**Features:** '+spec.features.join(', ')+'\n\n**Prompt:** '+normalized+'\n',language:'markdown'}
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
