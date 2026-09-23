import type { RuntimeErrorShape } from './types';

export function classifyRuntimeError(error:unknown,status?:number):RuntimeErrorShape{
  const msg=String((error as any)?.message||error||'').toLowerCase();
  const code=Number(status||(error as any)?.status||0);
  if(code===429||/rate.?limit|429/.test(msg))return {kind:'rate-limit',retryable:true,waitMs:60000,userMessage:'A fonte limitou a taxa de consulta.'};
  if(code===403&&/djen|cloudfront|geo|pje/.test(msg))return {kind:'geo-block',retryable:true,waitMs:15000,userMessage:'O DJEN recusou a origem de rede; priorize gru1 e consulta oficial direta como fallback.'};
  if(code===401||/unauthor|api.?key|token|credencial/.test(msg))return {kind:'auth',retryable:false,waitMs:0,userMessage:'Credencial ou configuração inválida.'};
  if(/abort|timeout|timed out|tempo de resposta/.test(msg))return {kind:'timeout',retryable:true,waitMs:1500,userMessage:'A fonte excedeu o tempo de resposta.'};
  if(/cnj inv|invalid input|payload/.test(msg))return {kind:'invalid-input',retryable:false,waitMs:0,userMessage:'A entrada precisa ser corrigida antes de repetir.'};
  if(code>=500||/502|503|504|gateway|upstream|shard/.test(msg))return {kind:'upstream',retryable:true,waitMs:2000,userMessage:'O serviço externo está instável.'};
  if(/fetch failed|network|enotfound|econn|rede/.test(msg))return {kind:'network',retryable:true,waitMs:1500,userMessage:'Falha de rede.'};
  return {kind:'unknown',retryable:false,waitMs:0,userMessage:'Falha não classificada.'};
}
