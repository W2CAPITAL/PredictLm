import test from 'node:test';
import assert from 'node:assert/strict';
import {cloudflareImageConfig,generateCloudflareImage} from '../src/lib/media/cloudflare-image';

test('Cloudflare image adapter is disabled without server credentials',()=>{
  const oldAccount=process.env.CLOUDFLARE_ACCOUNT_ID;
  const oldToken=process.env.CLOUDFLARE_API_TOKEN;
  delete process.env.CLOUDFLARE_ACCOUNT_ID;
  delete process.env.CLOUDFLARE_API_TOKEN;
  try{
    assert.equal(cloudflareImageConfig().enabled,false);
  }finally{
    if(oldAccount===undefined)delete process.env.CLOUDFLARE_ACCOUNT_ID;else process.env.CLOUDFLARE_ACCOUNT_ID=oldAccount;
    if(oldToken===undefined)delete process.env.CLOUDFLARE_API_TOKEN;else process.env.CLOUDFLARE_API_TOKEN=oldToken;
  }
});

test('Cloudflare image adapter converts Workers AI JSON output to a data URL',async()=>{
  const previousFetch=globalThis.fetch;
  let requestedUrl='';
  let requestedBody:any=null;
  globalThis.fetch=async(input:any,init:any)=>{
    requestedUrl=String(input);
    requestedBody=JSON.parse(String(init?.body||'{}'));
    return new Response(JSON.stringify({success:true,result:{image:'YWJj'}}),{
      status:200,
      headers:{'content-type':'application/json'}
    });
  };
  try{
    const result=await generateCloudflareImage({
      prompt:'uma paisagem cinematográfica',
      seed:42,
      config:{
        accountId:'account-test',
        token:'token-test',
        model:'@cf/black-forest-labs/flux-1-schnell',
        steps:4,
        timeoutMs:5000,
        enabled:true
      }
    });
    assert.match(requestedUrl,/api\.cloudflare\.com\/client\/v4\/accounts\/account-test\/ai\/run\/@cf\/black-forest-labs\/flux-1-schnell/);
    assert.equal(requestedBody.prompt,'uma paisagem cinematográfica');
    assert.equal(requestedBody.seed,42);
    assert.equal(requestedBody.steps,4);
    assert.equal(result.provider,'cloudflare-workers-ai');
    assert.equal(result.model,'@cf/black-forest-labs/flux-1-schnell');
    assert.equal(result.dataUrl,'data:image/jpeg;base64,YWJj');
  }finally{
    globalThis.fetch=previousFetch;
  }
});
