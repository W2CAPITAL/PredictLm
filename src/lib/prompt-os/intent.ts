export type PromptIntent=
  |'process_lookup'|'process_analysis'|'legal_draft'|'legal_strategy'
  |'document'|'draft_message'|'data'|'code'|'research'|'media'|'general';

export function classifyPromptIntent(text:string,hasAttachment=false):PromptIntent{
  const q=String(text||'').toLowerCase();
  const cnj=/\b\d{7}-?\d{2}\.?\d{4}\.?\d\.?\d{2}\.?\d{4}\b/.test(q);
  if(cnj&&/anal|risco|estrat|prazo|recurso|decis|senten|tese|atacar/.test(q))return 'process_analysis';
  if(cnj||/datajud|djen|e-saj|tribunal|processo judicial/.test(q))return 'process_lookup';
  if(/peti[cç][aã]o|r[eé]plica|contesta[cç][aã]o|recurso|minuta jur[ií]dica/.test(q))return 'legal_draft';
  if(/ajuizar|processar|medida cab[ií]vel|estrat[eé]gia jur[ií]dica|como atacar|onde atacar/.test(q))return 'legal_strategy';
  if(hasAttachment||/pdf|documento|contrato|anexo|autos/.test(q))return 'document';
  if(/whatsapp|email|e-mail|mensagem|resposta ao cliente/.test(q))return 'draft_message';
  if(/kpi|quantos|ranking|dados|sql|planilha|carteira/.test(q))return 'data';
  if(/c[oó]digo|typescript|javascript|react|next|build|vercel|github|bug|erro|repo/.test(q))return 'code';
  if(/pesquis|fonte|web|jurisprud|compare|verifique/.test(q))return 'research';
  if(/imagem|v[ií]deo|3d|render|cinematic|storyboard|design/.test(q))return 'media';
  return 'general';
}
