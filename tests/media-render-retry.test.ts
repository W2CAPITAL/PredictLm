import test from 'node:test';
import assert from 'node:assert/strict';
import { GET } from '../src/app/api/media/render/route';
import { INVALID_IMAGE_PROVIDER_MESSAGE } from '../src/lib/media/media-errors';
import {compactImagePromptForTransport} from '../src/lib/media/image-runtime';
import {resetProviderHealthForTests} from '../src/lib/server/provider-health';

function req(prompt='Naruto vs Sasuke'){
  resetProviderHealthForTests();
  return new Request('http://predictlm.test/api/media/render?prompt='+encodeURIComponent(prompt)+'&width=1024&height=1024&seed=7&model=flux');
}

test('media render retries when a provider returns HTTP 200 without image bytes',async()=>{
  const original=globalThis.fetch;
  const oldKey=process.env.POLLINATIONS_API_KEY;
  process.env.POLLINATIONS_API_KEY='pollinations-test';
  const calls:string[]=[];
  const png=new Uint8Array(1400);
  png.set([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a],0);
  globalThis.fetch=async(input:any)=>{
    calls.push(String(input));
    if(calls.length===1){
      return new Response(JSON.stringify({error:'not-an-image'}),{
        status:200,
        headers:{'Content-Type':'application/json'}
      });
    }
    return new Response(png,{status:200,headers:{'Content-Type':'image/png'}});
  };
  try{
    const response=await GET(req());
    assert.equal(response.status,200);
    assert.equal(response.headers.get('content-type'),'image/png');
    assert.equal(response.headers.get('x-predict-render-attempt'),'2');
    assert.equal(calls.length,2);
  }finally{
    globalThis.fetch=original;
    if(oldKey===undefined)delete process.env.POLLINATIONS_API_KEY; else process.env.POLLINATIONS_API_KEY=oldKey;
  }
});

test('media render returns the exact terminal error after all image attempts are invalid',async()=>{
  const original=globalThis.fetch;
  const oldKey=process.env.POLLINATIONS_API_KEY;
  process.env.POLLINATIONS_API_KEY='pollinations-test';
  globalThis.fetch=async()=>new Response(JSON.stringify({ok:true}),{
    status:200,
    headers:{'Content-Type':'application/json'}
  });
  try{
    const response=await GET(req());
    const body=await response.json();
    assert.equal(response.status,502);
    assert.equal(body.error,INVALID_IMAGE_PROVIDER_MESSAGE);
    assert.equal(body.error,'O provider não entregou uma imagem válida');
    assert.ok(body.attempts>=2);
  }finally{
    globalThis.fetch=original;
    if(oldKey===undefined)delete process.env.POLLINATIONS_API_KEY; else process.env.POLLINATIONS_API_KEY=oldKey;
  }
});

test('media render refuses unauthenticated Pollinations instead of making a doomed request',async()=>{
  const original=globalThis.fetch;
  const oldKey=process.env.POLLINATIONS_API_KEY;
  const oldBase=process.env.PREDICT_PUBLIC_IMAGE_URL;
  delete process.env.POLLINATIONS_API_KEY;
  process.env.PREDICT_PUBLIC_IMAGE_URL='https://gen.pollinations.ai/image/';
  let calls=0;
  globalThis.fetch=async()=>{calls++;return new Response('unexpected')};
  try{
    const response=await GET(req('Naruto vs Sasuke'));
    const body=await response.json();
    assert.equal(response.status,503);
    assert.equal(body.code,'NO_IMAGE_RENDER_PROVIDER');
    assert.equal(calls,0);
  }finally{
    globalThis.fetch=original;
    if(oldKey===undefined)delete process.env.POLLINATIONS_API_KEY; else process.env.POLLINATIONS_API_KEY=oldKey;
    if(oldBase===undefined)delete process.env.PREDICT_PUBLIC_IMAGE_URL; else process.env.PREDICT_PUBLIC_IMAGE_URL=oldBase;
  }
});


test('public render transport compacts oversized orchestration prompts but preserves identity locks',()=>{
  const huge=[
    'crie o naruto modo avatar kurama lutando contra o sasuke modo susanoo perfeito',
    'CANONICAL MATCHUP MASTER LOCK: Naruto versus Sasuke.',
    'LEFT: Naruto with gigantic complete Kurama Nine-Tails avatar.',
    'RIGHT: Sasuke with gigantic complete Perfect Susanoo.',
    'CENTER: one controlled clash.',
    'NEGATIVE CONSTRAINTS: '+('duplicate character, wrong identity, generic explosion, '.repeat(180))
  ].join('\n');
  const compact=compactImagePromptForTransport(huge,'crie o naruto modo avatar kurama lutando contra o sasuke modo susanoo perfeito',1800);
  assert.ok(compact.length<=1800);
  assert.match(compact,/modo avatar kurama/i);
  assert.match(compact,/LEFT:/);
  assert.match(compact,/RIGHT:/);
  assert.match(compact,/Perfect Susanoo/i);
});

test('media render falls back from a configured public base to default public image base',async()=>{
  const original=globalThis.fetch;
  const oldBase=process.env.PREDICT_PUBLIC_IMAGE_URL;
  const oldAttempts=process.env.PREDICTLM_IMAGE_RENDER_ATTEMPTS;
  const oldKey=process.env.POLLINATIONS_API_KEY;
  const calls:string[]=[];
  const authByUrl=new Map<string,string>();
  const png=new Uint8Array(1500);
  png.set([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a],0);
  process.env.PREDICT_PUBLIC_IMAGE_URL='https://broken.example/image/';
  process.env.PREDICTLM_IMAGE_RENDER_ATTEMPTS='4';
  process.env.POLLINATIONS_API_KEY='pollinations-test';
  globalThis.fetch=async(input:any,init?:RequestInit)=>{
    const url=String(input);
    calls.push(url);
    authByUrl.set(url,String((init?.headers as any)?.Authorization||''));
    if(url.startsWith('https://broken.example/')){
      return new Response(JSON.stringify({error:'down'}),{status:503,headers:{'Content-Type':'application/json'}});
    }
    return new Response(png,{status:200,headers:{'Content-Type':'image/png'}});
  };
  try{
    const response=await GET(req('Naruto vs Sasuke'));
    assert.equal(response.status,200);
    const custom=calls.find(url=>url.startsWith('https://broken.example/'))||'';
    const pollinations=calls.find(url=>url.startsWith('https://gen.pollinations.ai/image/'))||'';
    assert.ok(custom);
    assert.ok(pollinations);
    assert.equal(authByUrl.get(custom),'','Pollinations key must not leak to a custom image proxy');
    assert.equal(authByUrl.get(pollinations),'Bearer pollinations-test');
  }finally{
    globalThis.fetch=original;
    if(oldBase===undefined)delete process.env.PREDICT_PUBLIC_IMAGE_URL; else process.env.PREDICT_PUBLIC_IMAGE_URL=oldBase;
    if(oldAttempts===undefined)delete process.env.PREDICTLM_IMAGE_RENDER_ATTEMPTS; else process.env.PREDICTLM_IMAGE_RENDER_ATTEMPTS=oldAttempts;
    if(oldKey===undefined)delete process.env.POLLINATIONS_API_KEY; else process.env.POLLINATIONS_API_KEY=oldKey;
  }
});
