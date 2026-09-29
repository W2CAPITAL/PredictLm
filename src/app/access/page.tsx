export default async function AccessPage({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){
  const params=await searchParams;
  const rawReturn=Array.isArray(params.returnTo)?params.returnTo[0]:params.returnTo;
  const returnTo=typeof rawReturn==='string'&&rawReturn.startsWith('/')&&!rawReturn.startsWith('//')?rawReturn:'/';
  const invalid=Boolean(params.error);
  const configured=Boolean(process.env.PREDICTLM_ACCESS_TOKEN);
  return <main style={{minHeight:'100vh',display:'grid',placeItems:'center',background:'#070b0f',color:'#eef4f3',fontFamily:'system-ui',padding:24}}>
    <section style={{width:'min(440px,100%)',border:'1px solid #26343a',borderRadius:16,padding:24,background:'#0d1419'}}>
      <h1 style={{margin:'0 0 8px',fontSize:22}}>PredictLM protegido</h1>
      <p style={{margin:'0 0 20px',color:'#9fb0b4',lineHeight:1.5}}>Informe a credencial de acesso deste deployment. Ela é trocada por uma sessão HttpOnly e não é armazenada no navegador como texto legível.</p>
      {!configured?<p style={{padding:12,borderRadius:10,background:'#2b1719',color:'#ffd0d5'}}>Configure <code>PREDICTLM_ACCESS_TOKEN</code> no servidor antes de liberar o app.</p>:null}
      {invalid?<p style={{padding:10,borderRadius:10,background:'#2b1719',color:'#ffd0d5'}}>Credencial inválida.</p>:null}
      <form method="post" action="/api/auth/session" style={{display:'grid',gap:12}}>
        <input type="hidden" name="returnTo" value={returnTo}/>
        <label style={{display:'grid',gap:6,fontSize:13}}>Credencial
          <input name="token" type="password" autoComplete="current-password" required disabled={!configured} style={{padding:'12px 13px',borderRadius:10,border:'1px solid #34464d',background:'#081014',color:'#fff'}}/>
        </label>
        <button type="submit" disabled={!configured} style={{padding:'12px 14px',border:0,borderRadius:10,fontWeight:700,cursor:configured?'pointer':'not-allowed'}}>Entrar</button>
      </form>
    </section>
  </main>;
}
