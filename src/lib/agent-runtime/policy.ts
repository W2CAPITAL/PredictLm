import type { PolicyDecision, ToolRisk } from './types';

const DENY=[
  'bypass-captcha','bypass-waf','e-cpf-de-terceiro','ecpf-de-terceiro',
  'disable-rls','service-role-client','cross-tenant','doxxing','delete-tenant'
];
const ASK=[
  'protocolar','ajuizar','assinar','peticionar','pagar','acordo','desistir',
  'send-email','write-db','merge-pr','deploy-production','change-billing','elevate-role'
];

export function policyDecision(id:string,risk:ToolRisk='read'):PolicyDecision{
  const q=String(id||'').toLowerCase();
  if(DENY.some(x=>q.includes(x)))return 'deny';
  if(ASK.some(x=>q.includes(x))||risk==='write'||risk==='privileged')return 'ask';
  return 'allow';
}
