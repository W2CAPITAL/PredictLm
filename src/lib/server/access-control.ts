import {createHmac,createHash,timingSafeEqual} from 'node:crypto';

export const ACCESS_COOKIE='predictlm_access';
const DEFAULT_TTL_SECONDS=12*60*60;

function envToken(){
  return String(process.env.PREDICTLM_ACCESS_TOKEN||'').trim();
}

function envApiKeys(){
  const single=String(process.env.PREDICTLM_API_KEY||'').trim();
  const many=String(process.env.PREDICTLM_API_KEYS||'').split(/[\n,]+/).map(value=>value.trim()).filter(Boolean);
  return [...new Set([single,...many].filter(Boolean))];
}

function envSessionSecret(){
  return String(process.env.PREDICTLM_SESSION_SECRET||envToken()).trim();
}

function digest(value:string){
  return createHash('sha256').update(value).digest();
}

export function accessControlConfigured(){
  return !!envToken();
}

export function apiAccessConfigured(){
  return !!envToken()||envApiKeys().length>0;
}

export function verifyAccessToken(candidate:string){
  const expected=envToken();
  if(!expected||!candidate)return false;
  return timingSafeEqual(digest(candidate),digest(expected));
}

export function verifyApiKey(candidate:string){
  if(!candidate)return false;
  return envApiKeys().some(expected=>timingSafeEqual(digest(candidate),digest(expected)));
}

function signExpiry(exp:number){
  const secret=envSessionSecret();
  if(!secret)return '';
  return createHmac('sha256',secret).update('predictlm-access:'+String(exp)).digest('base64url');
}

export function createAccessSession(ttlSeconds=DEFAULT_TTL_SECONDS,now=Date.now()){
  const ttl=Math.max(300,Math.min(7*24*60*60,Number(ttlSeconds)||DEFAULT_TTL_SECONDS));
  const exp=Math.floor(now/1000)+ttl;
  return exp+'.'+signExpiry(exp);
}

export function verifyAccessSession(value:string,now=Date.now()){
  const [rawExp,rawSig,...rest]=String(value||'').split('.');
  if(rest.length||!rawExp||!rawSig)return false;
  const exp=Number(rawExp);
  if(!Number.isInteger(exp)||exp<Math.floor(now/1000))return false;
  const expected=signExpiry(exp);
  if(!expected)return false;
  return timingSafeEqual(digest(rawSig),digest(expected));
}

export function accessCookieOptions(){
  return {
    httpOnly:true,
    sameSite:'strict' as const,
    secure:process.env.NODE_ENV==='production',
    path:'/',
    maxAge:DEFAULT_TTL_SECONDS
  };
}
