import test from 'node:test';
import assert from 'node:assert/strict';
import { GET } from '../src/app/api/media/render/route';
import { INVALID_IMAGE_PROVIDER_MESSAGE } from '../src/lib/media/media-errors';

function req(){
  return new Request('http://predictlm.test/api/media/render?prompt=Naruto%20vs%20Sasuke&width=1024&height=1024&seed=7&model=flux');
}

test('media render retries when a provider returns HTTP 200 without image bytes',async()=>{
  const original=globalThis.fetch;
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
  }
});

test('media render returns the exact terminal error after all image attempts are invalid',async()=>{
  const original=globalThis.fetch;
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
  }
});
