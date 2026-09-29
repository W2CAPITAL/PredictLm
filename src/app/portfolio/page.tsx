import Link from 'next/link';

const card:React.CSSProperties={
  border:'1px solid #273238',
  borderRadius:16,
  padding:20,
  background:'#0d1317'
};

export default function PortfolioPage(){
  return <main style={{minHeight:'100vh',background:'#070b0f',color:'#edf3f4',fontFamily:'system-ui',padding:'40px 20px'}}>
    <div style={{maxWidth:980,margin:'0 auto',display:'grid',gap:18}}>
      <header>
        <Link href="/" style={{color:'#9fb2bb',textDecoration:'none'}}>← PredictLM</Link>
        <p style={{margin:'28px 0 8px',fontSize:12,letterSpacing:'.12em',color:'#7f9299'}}>PORTFÓLIO TÉCNICO</p>
        <h1 style={{fontSize:'clamp(30px,6vw,56px)',lineHeight:1.02,margin:0}}>AI confiável para trabalho jurídico. Agentes reproduzíveis no Minecraft.</h1>
        <p style={{maxWidth:760,color:'#aebdc2',lineHeight:1.65,fontSize:16}}>O PredictLM demonstra duas histórias de engenharia: um assistente com fallback multi-provedor e inteligência processual, e um laboratório voxel persistente para agentes autônomos. Módulos experimentais ficam fora da navegação principal.</p>
      </header>

      <section style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))',gap:12}}>
        <article style={card}><h2>Jurídico</h2><p>CNJ/DataJud + DJEN, linha do tempo, proveniência e dossiê. A interpretação gerada fica separada das fontes oficiais.</p></article>
        <article style={card}><h2>Chat</h2><p>Roteamento com tentativa principal + failover limitado, fallback local/browser, pesquisa e Build sem expor credenciais no cliente.</p></article>
        <article style={card}><h2>Minecraft Agent Lab</h2><p>Mundo voxel persistente, seed reproduzível, POV por controller, contrato observation → action, replay e renderer WebGL adaptativo.</p></article>
        <article style={card}><h2>Segurança</h2><p>Gate autenticado, sessão HttpOnly assinada, same-origin para mutações, rate limit distribuído quando Supabase está configurado e proteção anti-SSRF com resolução DNS.</p></article>
      </section>

      <section style={card}>
        <h2 style={{marginTop:0}}>Demo em 60 segundos</h2>
        <ol style={{lineHeight:1.8,color:'#c7d2d6'}}>
          <li>Entrar pelo access gate e abrir o Chat.</li>
          <li>Consultar um CNJ e mostrar DataJud/DJEN → timeline → dossiê.</li>
          <li>Demonstrar uma resposta do Chat e o fallback sem expor raciocínio interno.</li>
          <li>Abrir Minecraft, trocar o POV entre controllers e mostrar a mesma seed/mundo persistente.</li>
          <li>Fechar no CI: typecheck, testes, build e smoke de exportação.</li>
        </ol>
      </section>

      <section style={card}>
        <h2 style={{marginTop:0}}>Escopo público</h2>
        <p style={{color:'#aebdc2',lineHeight:1.65}}>Chat · Jurídico · Minecraft · Imagine. Vision utilities, plugins, neurociência e influencer permanecem como infraestrutura interna/laboratório e não competem com a história principal do produto.</p>
      </section>
    </div>
  </main>;
}
