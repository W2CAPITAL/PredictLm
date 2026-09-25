const STATE_TRIBUNALS:Record<string,{alias:string;label:string}> = {
  '01':{alias:'tjac',label:'TJAC'},'02':{alias:'tjal',label:'TJAL'},'03':{alias:'tjap',label:'TJAP'},
  '04':{alias:'tjam',label:'TJAM'},'05':{alias:'tjba',label:'TJBA'},'06':{alias:'tjce',label:'TJCE'},
  '07':{alias:'tjdft',label:'TJDFT'},'08':{alias:'tjes',label:'TJES'},'09':{alias:'tjgo',label:'TJGO'},
  '10':{alias:'tjma',label:'TJMA'},'11':{alias:'tjmt',label:'TJMT'},'12':{alias:'tjms',label:'TJMS'},
  '13':{alias:'tjmg',label:'TJMG'},'14':{alias:'tjpa',label:'TJPA'},'15':{alias:'tjpb',label:'TJPB'},
  '16':{alias:'tjpr',label:'TJPR'},'17':{alias:'tjpe',label:'TJPE'},'18':{alias:'tjpi',label:'TJPI'},
  '19':{alias:'tjrj',label:'TJRJ'},'20':{alias:'tjrn',label:'TJRN'},'21':{alias:'tjrs',label:'TJRS'},
  '22':{alias:'tjro',label:'TJRO'},'23':{alias:'tjrr',label:'TJRR'},'24':{alias:'tjsc',label:'TJSC'},
  '25':{alias:'tjse',label:'TJSE'},'26':{alias:'tjsp',label:'TJSP'},'27':{alias:'tjto',label:'TJTO'}
};

const TRE:Record<string,string> = {
  '01':'tre-ac','02':'tre-al','03':'tre-ap','04':'tre-am','05':'tre-ba','06':'tre-ce','07':'tre-dft',
  '08':'tre-es','09':'tre-go','10':'tre-ma','11':'tre-mt','12':'tre-ms','13':'tre-mg','14':'tre-pa',
  '15':'tre-pb','16':'tre-pr','17':'tre-pe','18':'tre-pi','19':'tre-rj','20':'tre-rn','21':'tre-rs',
  '22':'tre-ro','23':'tre-rr','24':'tre-sc','25':'tre-se','26':'tre-sp','27':'tre-to'
};

export function cnjDigits(value:string){
  return String(value||'').replace(/\D/g,'');
}

export function maskCnj(value:string){
  const d=cnjDigits(value);
  if(d.length!==20)return value.trim();
  return d.slice(0,7)+'-'+d.slice(7,9)+'.'+d.slice(9,13)+'.'+d.slice(13,14)+'.'+d.slice(14,16)+'.'+d.slice(16);
}

export function findCnjNumber(text:string){
  const masked=text.match(/\b\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}\b/);
  if(masked)return maskCnj(masked[0]);
  const digits=text.match(/\b\d{20}\b/);
  return digits?maskCnj(digits[0]):null;
}

export function isValidCnj(value:string){
  const d=cnjDigits(value);
  if(d.length!==20)return false;
  try{
    const seq=d.slice(0,7);
    const dv=Number(d.slice(7,9));
    const year=d.slice(9,13);
    const branch=d.slice(13,14);
    const tribunal=d.slice(14,16);
    const origin=d.slice(16,20);
    const base=BigInt(seq+year+branch+tribunal+origin+'00');
    const expected=98-Number(base%97n);
    return expected===dv;
  }catch{return false}
}

export function datajudTribunal(value:string){
  const d=cnjDigits(value);
  if(d.length!==20)return null;
  const branch=d.slice(13,14);
  const tr=d.slice(14,16);
  if(branch==='8')return STATE_TRIBUNALS[tr]||null;
  if(branch==='4'&&/^0[1-6]$/.test(tr))return {alias:'trf'+Number(tr),label:'TRF'+Number(tr)};
  if(branch==='5'&&Number(tr)>=1&&Number(tr)<=24)return {alias:'trt'+Number(tr),label:'TRT'+Number(tr)};
  if(branch==='6'){
    if(tr==='00')return {alias:'tse',label:'TSE'};
    const alias=TRE[tr];
    return alias?{alias,label:alias.toUpperCase()}:null;
  }
  if(branch==='3'&&tr==='00')return {alias:'stj',label:'STJ'};
  if(branch==='7'&&tr==='00')return {alias:'stm',label:'STM'};
  if(branch==='9'){
    if(tr==='13')return {alias:'tjmmg',label:'TJMMG'};
    if(tr==='21')return {alias:'tjmrs',label:'TJMRS'};
    if(tr==='26')return {alias:'tjmsp',label:'TJMSP'};
  }
  return null;
}


function normalizeReference(text:string){
  return String(text||'').toLowerCase().normalize('NFD').replace(/\p{M}/gu,'').replace(/\s+/g,' ').trim();
}

export function isCnjContextReference(prompt:string){
  const p=normalizeReference(prompt);
  return /\b(dossie|processo|autos?|caso|acao)\b.*\b(isso|esse|essa|este|esta)\b/.test(p)||
    /^(sobre )?(isso|esse|essa|este|esta)(\b|[?.!])/.test(p)||
    /^(gere|gerar|faca|faça|crie|criar)\b.*\b(dossie)\b/.test(p);
}

export function recentCnjNumber(texts:string[],limit=14){
  const start=Math.max(0,texts.length-limit);
  for(let i=texts.length-1;i>=start;i--){
    const found=findCnjNumber(String(texts[i]||''));
    if(found)return found;
  }
  return null;
}

export function resolveCnjFromContext(prompt:string,historyTexts:string[]=[]){
  const explicit=findCnjNumber(prompt);
  if(explicit)return explicit;
  if(!historyTexts.length||!isCnjContextReference(prompt))return null;
  return recentCnjNumber(historyTexts);
}
