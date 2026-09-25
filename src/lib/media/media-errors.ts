export function mediaErrorText(value:any,fallback='Falha de mídia.'):string{
  if(value==null)return fallback;
  if(typeof value==='string')return value.trim()||fallback;
  if(value instanceof Error)return value.message||fallback;
  if(typeof value==='number'||typeof value==='boolean')return String(value);
  if(Array.isArray(value)){
    const parts=value.map(x=>mediaErrorText(x,'')).filter(Boolean);
    return parts.join(' · ')||fallback;
  }
  if(typeof value==='object'){
    for(const key of ['message','error_description','detail','error','reason','statusText','code']){
      const candidate=(value as any)[key];
      if(candidate!=null){
        const text=mediaErrorText(candidate,'');
        if(text)return text;
      }
    }
    try{
      const json=JSON.stringify(value);
      if(json&&json!=='{}')return json.slice(0,800);
    }catch{}
  }
  const text=String(value);
  return text&&text!=='[object Object]'?text:fallback;
}
