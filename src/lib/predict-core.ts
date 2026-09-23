import type { WorkspaceFile } from './types';

export type CoreIntent = 'dashboard' | 'landing' | 'crm' | 'portfolio' | 'store' | 'generic';

export interface CoreResult {
  explanation: string;
  plan: string[];
  files: WorkspaceFile[];
}

function detectIntent(prompt: string): CoreIntent {
  const p = prompt.toLowerCase();
  if (/dashboard|painel|analytics|métrica|metric|kpi/.test(p)) return 'dashboard';
  if (/crm|lead|pipeline|cliente|sales/.test(p)) return 'crm';
  if (/loja|store|e-?commerce|produto|checkout/.test(p)) return 'store';
  if (/portfolio|portfólio|curr[ií]culo|resume/.test(p)) return 'portfolio';
  if (/landing|site|página|page|saas/.test(p)) return 'landing';
  return 'generic';
}

function titleFrom(prompt: string) {
  const clean = prompt.replace(/[^\p{L}\p{N}\s-]/gu, ' ').replace(/\s+/g, ' ').trim();
  if (!clean) return 'Predict App';
  return clean.split(' ').slice(0, 5).join(' ').replace(/\b\w/g, (m) => m.toUpperCase());
}

function commonCss() {
  return `:root{color-scheme:dark;--bg:#07080b;--panel:#0e1015;--line:#222631;--text:#f5f7fb;--muted:#8d96a8;--accent:#7c5cff;--accent2:#2dd4bf}*{box-sizing:border-box}body{margin:0;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:radial-gradient(circle at top right,#17152b 0,#07080b 38%);color:var(--text)}button,input{font:inherit}.app{min-height:100vh}.shell{max-width:1180px;margin:auto;padding:28px}.top{display:flex;justify-content:space-between;align-items:center;gap:16px}.brand{font-weight:800;letter-spacing:-.04em}.pill{border:1px solid var(--line);background:#12151c;padding:7px 11px;border-radius:999px;color:#b6bfd0;font-size:12px}.grid{display:grid;gap:16px}.card{background:linear-gradient(180deg,rgba(18,21,28,.96),rgba(11,13,18,.96));border:1px solid var(--line);border-radius:20px;padding:18px;box-shadow:0 18px 50px rgba(0,0,0,.18)}.muted{color:var(--muted)}.accent{color:#a897ff}.btn{border:0;border-radius:12px;padding:11px 15px;background:var(--accent);color:white;font-weight:700}.hero{padding:72px 0 44px}.hero h1{font-size:clamp(42px,7vw,82px);line-height:.95;letter-spacing:-.065em;max-width:850px;margin:0 0 22px}.hero p{font-size:18px;line-height:1.7;max-width:680px}.stat{font-size:32px;font-weight:800;letter-spacing:-.04em}.row{display:flex;gap:12px;align-items:center;flex-wrap:wrap}.split{grid-template-columns:repeat(2,minmax(0,1fr))}.three{grid-template-columns:repeat(3,minmax(0,1fr))}@media(max-width:760px){.shell{padding:18px}.split,.three{grid-template-columns:1fr}.hero{padding-top:42px}}`;
}

function buildApp(prompt: string, intent: CoreIntent): string {
  const title = titleFrom(prompt);
  if (intent === 'dashboard') return `export default function App(){const cards=[['Receita','R$ 84,2k','+12,4%'],['Usuários','12.480','+8,1%'],['Conversão','7,9%','+1,2%']];return <main className="app"><div className="shell"><div className="top"><div className="brand">${title}</div><span className="pill">Predict Core • offline</span></div><section className="hero"><span className="pill">Executive workspace</span><h1>Decisões rápidas, sem ruído.</h1><p className="muted">Dashboard gerado localmente. Troque textos, dados e componentes pelo editor ou peça ao agente para refinar.</p></section><section className="grid three">{cards.map(([k,v,d])=><article className="card" key={k}><div className="muted">{k}</div><div className="stat">{v}</div><div className="accent">{d}</div></article>)}</section><section className="grid split" style={{marginTop:16}}><article className="card"><h3>Atividade</h3><p className="muted">Fila de eventos, automações e alertas do projeto.</p></article><article className="card"><h3>Próxima ação</h3><p className="muted">Conecte uma API ou use um modelo local para transformar este starter em produto completo.</p><button className="btn">Executar agente</button></article></section></div></main>}`;
  if (intent === 'crm') return `export default function App(){const leads=['Marina Costa','Rafael Lima','Aline Rocha'];return <main className="app"><div className="shell"><div className="top"><div className="brand">${title}</div><span className="pill">CRM workspace</span></div><section className="hero"><h1>Pipeline que mostra o que importa.</h1><p className="muted">Starter CRM gerado pelo Predict Core. Dados ficam somente no navegador até você conectar um backend.</p></section><section className="grid three">{['Novo','Em análise','Fechado'].map((s,i)=><div className="card" key={s}><div className="row"><b>{s}</b><span className="pill">{i+2}</span></div><div style={{marginTop:14}}>{leads.slice(0,i+1).map(x=><div className="card" style={{padding:12,marginTop:8}} key={x}>{x}<div className="muted" style={{fontSize:12}}>Lead qualificado</div></div>)}</div></div>)}</section></div></main>}`;
  if (intent === 'store') return `export default function App(){const products=['Orbit Headphones','Nova Keyboard','Flux Camera'];return <main className="app"><div className="shell"><div className="top"><div className="brand">${title}</div><div className="row"><span className="pill">Search</span><span className="pill">Cart · 2</span></div></div><section className="hero"><span className="pill">New collection</span><h1>Products people want to keep.</h1><p className="muted">Commerce starter com layout responsivo e componentes prontos para integração.</p></section><section className="grid three">{products.map((p,i)=><article className="card" key={p}><div style={{height:180,borderRadius:14,background:'linear-gradient(135deg,#24283a,#17192a)',marginBottom:16}}/><h3>{p}</h3><div className="row" style={{justifyContent:'space-between'}}><span className="muted">R$ {399+i*250}</span><button className="btn">Adicionar</button></div></article>)}</section></div></main>}`;
  if (intent === 'portfolio') return `export default function App(){return <main className="app"><div className="shell"><div className="top"><div className="brand">${title}</div><span className="pill">Available for work</span></div><section className="hero"><span className="accent">Designer + Developer</span><h1>Eu construo produtos claros, rápidos e úteis.</h1><p className="muted">Portfólio gerado localmente. Use o agente para substituir esta cópia pelos seus projetos, cases e links reais.</p><div className="row"><button className="btn">Ver projetos</button><span className="pill">São Paulo · Remote</span></div></section><section className="grid split"><div className="card"><h3>Case 01</h3><p className="muted">Produto, contexto, decisão e resultado.</p></div><div className="card"><h3>Case 02</h3><p className="muted">Interface, automação e experiência.</p></div></section></div></main>}`;
  return `export default function App(){return <main className="app"><div className="shell"><div className="top"><div className="brand">${title}</div><span className="pill">Built with Predict Core</span></div><section className="hero"><span className="pill">Local-first app starter</span><h1>${title}</h1><p className="muted">${prompt.replace(/\`/g,'').slice(0,220)}</p><div className="row"><button className="btn">Começar</button><span className="pill">Sem API obrigatória</span></div></section><section className="grid three"><div className="card"><h3>Build</h3><p className="muted">Gere e edite arquivos.</p></div><div className="card"><h3>Automate</h3><p className="muted">Conecte ferramentas e agentes.</p></div><div className="card"><h3>Ship</h3><p className="muted">Revise e publique com segurança.</p></div></section></div></main>}`;
}

export function runPredictCore(prompt: string): CoreResult {
  const intent = detectIntent(prompt);
  const title = titleFrom(prompt);
  return {
    explanation: `Predict Core criou um starter ${intent} local-first para “${title}”. Nenhuma API externa foi usada.`,
    plan: ['Entender o objetivo', `Selecionar blueprint ${intent}`, 'Gerar estrutura visual', 'Preparar preview editável', 'Deixar pontos de integração explícitos'],
    files: [
      { path: 'App.tsx', content: buildApp(prompt, intent), language: 'typescript' },
      { path: 'styles.css', content: commonCss(), language: 'css' },
      { path: 'README.md', content: `# ${title}\n\nGerado pelo Predict Core em modo local-first.\n\nPrompt original:\n\n${prompt}\n`, language: 'markdown' }
    ]
  };
}
