import {lookup} from 'node:dns/promises';
import {isIP} from 'node:net';

function ipv4Private(ip:string){
  const parts=ip.split('.').map(Number);
  if(parts.length!==4||parts.some(n=>!Number.isInteger(n)||n<0||n>255))return true;
  const [a,b]=parts;
  if(a===0||a===10||a===127)return true;
  if(a===100&&b>=64&&b<=127)return true;
  if(a===169&&b===254)return true;
  if(a===172&&b>=16&&b<=31)return true;
  if(a===192&&(b===0||b===168))return true;
  if(a===198&&(b===18||b===19))return true;
  if(a>=224)return true;
  return false;
}

function ipv6Private(ip:string){
  const value=ip.toLowerCase().replace(/^[|]$/g,'');
  if(value==='::'||value==='::1')return true;
  if(value.startsWith('fc')||value.startsWith('fd'))return true;
  if(/^fe[89ab]/.test(value))return true;
  if(value.startsWith('ff'))return true;
  if(value.startsWith('2001:db8:'))return true;
  const mapped=value.match(/::ffff:(d+.d+.d+.d+)$/);
  if(mapped)return ipv4Private(mapped[1]);
  return false;
}

export function isPrivateIp(ip:string){
  const version=isIP(ip);
  if(version===4)return ipv4Private(ip);
  if(version===6)return ipv6Private(ip);
  return true;
}

function blockedHostname(hostname:string){
  const h=hostname.toLowerCase().replace(/.$/,'');
  return h==='localhost'||h==='metadata.google.internal'||h.endsWith('.localhost')||h.endsWith('.local')||h.endsWith('.internal')||h.endsWith('.home');
}

export async function assertPublicUrl(input:string|URL){
  const url=input instanceof URL?new URL(input.toString()):new URL(String(input));
  if(!['http:','https:'].includes(url.protocol))throw new Error('PUBLIC_URL_PROTOCOL');
  if(url.username||url.password)throw new Error('PUBLIC_URL_CREDENTIALS');
  const host=url.hostname.replace(/^[|]$/g,'');
  if(blockedHostname(host))throw new Error('PUBLIC_URL_PRIVATE_HOST');

  const literal=isIP(host);
  if(literal){
    if(isPrivateIp(host))throw new Error('PUBLIC_URL_PRIVATE_IP');
    return url;
  }

  const addresses=await lookup(host,{all:true,verbatim:true});
  if(!addresses.length)throw new Error('PUBLIC_URL_DNS_EMPTY');
  if(addresses.some(entry=>isPrivateIp(entry.address)))throw new Error('PUBLIC_URL_PRIVATE_DNS');
  return url;
}

export async function fetchPublicUrl(input:string|URL,init:RequestInit={},maxRedirects=3){
  let current=await assertPublicUrl(input);
  for(let i=0;i<=maxRedirects;i++){
    const response=await fetch(current,{
      ...init,
      redirect:'manual',
      cache:init.cache||'no-store'
    });
    if(response.status<300||response.status>=400)return response;
    const location=response.headers.get('location');
    if(!location)return response;
    if(i===maxRedirects)throw new Error('PUBLIC_URL_TOO_MANY_REDIRECTS');
    current=await assertPublicUrl(new URL(location,current));
  }
  throw new Error('PUBLIC_URL_REDIRECT_FAILURE');
}
