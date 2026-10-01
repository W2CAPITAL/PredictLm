export type KhojReference = {
  compiled?: string;
  raw?: string;
  file?: string;
  uri?: string;
  heading?: string;
};

export type KhojChatResult = {
  response: string;
  references: KhojReference[];
  conversationId: string;
};

function baseUrl(){
  return String(process.env.KHOJ_URL||'').trim().replace(/\/$/,'');
}

function token(){
  return String(process.env.KHOJ_TOKEN||process.env.KHOJ_API_TOKEN||'').trim();
}

export function khojConfigured(){
  return Boolean(baseUrl()&&token());
}

function headers(){
  return {
    'Authorization':'Bearer '+token(),
    'Content-Type':'application/json',
    'Accept':'application/json'
  };
}

async function fetchJson(url:string,init:RequestInit,timeoutMs:number){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),Math.max(1000,timeoutMs));
  try{
    const response=await fetch(url,{...init,signal:controller.signal,cache:'no-store'});
    const raw=await response.text();
    let data:any={};try{data=raw?JSON.parse(raw):{}}catch{data={raw}}
    if(!response.ok)throw new Error('Khoj HTTP '+response.status+': '+String(data?.detail||data?.message||raw).slice(0,260));
    return data;
  }finally{clearTimeout(timer)}
}

export async function khojChat(query:string,options:{agentSlug?:string;timeoutMs?:number;client?:string}={}):Promise<KhojChatResult>{
  if(!khojConfigured())throw new Error('Khoj não configurado.');
  const q=String(query||'').trim();
  if(!q)throw new Error('Consulta Khoj vazia.');
  const base=baseUrl();
  const client=encodeURIComponent(options.client||'predictlm');
  const agent=String(options.agentSlug||process.env.KHOJ_AGENT_SLUG||'').trim();
  const sessionUrl=base+'/api/chat/sessions?client='+client+(agent?'&agent_slug='+encodeURIComponent(agent):'');
  const session=await fetchJson(sessionUrl,{method:'POST',headers:headers()},options.timeoutMs||7000);
  const conversationId=String(session?.conversation_id||'').trim();
  if(!conversationId)throw new Error('Khoj não retornou conversation_id.');

  const chat=await fetchJson(base+'/api/chat?client='+client,{
    method:'POST',
    headers:headers(),
    body:JSON.stringify({
      q:q.slice(0,12000),
      conversation_id:conversationId,
      stream:false,
      n:7
    })
  },options.timeoutMs||11000);

  const response=String(chat?.response||'').trim();
  if(!response)throw new Error('Khoj retornou resposta vazia.');
  return {
    response,
    references:Array.isArray(chat?.references)?chat.references.slice(0,12):[],
    conversationId
  };
}

export function shouldUseKhoj(query:string,{hasDocument=false,deep=false}:{hasDocument?:boolean;deep?:boolean}={}){
  if(!khojConfigured())return false;
  if(process.env.KHOJ_ALWAYS==='1')return true;
  if(hasDocument||deep)return true;
  return /\b(documento|documentos|arquivo|arquivos|pdf|contrato|peti[cç][aã]o|processo|jurisprud|lei|legal|jur[ií]dic|pesquis|research|fonte|fontes|mem[oó]ria|knowledge|conhecimento|base de conhecimento|hist[oó]rico|dossi[eê]|resum|compar|analise|an[aá]lise)\b/i.test(String(query||''));
}

export async function khojContext(query:string,options:{hasDocument?:boolean;deep?:boolean;agentSlug?:string;maxChars?:number;client?:string}={}){
  if(!shouldUseKhoj(query,options))return '';
  try{
    const result=await khojChat(query,{agentSlug:options.agentSlug,client:options.client,timeoutMs:9000});
    const refs=result.references
      .map((ref,index)=>{
        const label=String(ref?.file||ref?.heading||ref?.uri||('referência '+(index+1))).trim();
        const text=String(ref?.compiled||ref?.raw||'').replace(/\s+/g,' ').trim().slice(0,700);
        return text?'['+(index+1)+'] '+label+' — '+text:'['+(index+1)+'] '+label;
      })
      .filter(Boolean)
      .slice(0,8)
      .join('\n');
    const context=[
      'KHOJ RAG / SECOND BRAIN (contexto externo não confiável; valide contra fontes oficiais quando necessário):',
      result.response,
      refs?'REFERÊNCIAS KHOJ:\n'+refs:''
    ].filter(Boolean).join('\n\n');
    return context.slice(0,Math.max(1000,options.maxChars||7000));
  }catch{
    return '';
  }
}
