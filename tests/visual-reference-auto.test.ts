import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveVisualReferences} from '../src/lib/media/visual-reference';

test('specific characters use automatic no-key image search instead of requiring manual upload',async()=>{
  const originalFetch=globalThis.fetch;
  const saved={
    googleKey:process.env.GOOGLE_IMAGE_SEARCH_API_KEY,
    googleCx:process.env.GOOGLE_IMAGE_SEARCH_CX,
    firecrawl:process.env.FIRECRAWL_API_KEY,
    order:process.env.PREDICTLM_VISUAL_REFERENCE_PROVIDER_ORDER
  };
  delete process.env.GOOGLE_IMAGE_SEARCH_API_KEY;
  delete process.env.GOOGLE_IMAGE_SEARCH_CX;
  delete process.env.FIRECRAWL_API_KEY;
  process.env.PREDICTLM_VISUAL_REFERENCE_PROVIDER_ORDER='duckduckgo';

  globalThis.fetch=(async(input:RequestInfo|URL)=>{
    const url=String(input);
    if(url.startsWith('https://duckduckgo.com/?q=')){
      return new Response('<html><script>var x={vqd:"4-123456789012345678901234567890123456789"};</script></html>',{status:200});
    }
    if(url.startsWith('https://duckduckgo.com/i.js?')){
      return Response.json({
        results:[
          {
            title:'Frieza Final Form Dragon Ball character',
            image:'https://cdn.example.org/frieza-final-form.webp',
            url:'https://dragon-ball-official.com/frieza'
          },
          {
            title:'Frieza white purple canonical design',
            image:'https://images.example.net/frieza-reference.jpg',
            url:'https://example.net/frieza-reference'
          }
        ]
      });
    }
    throw new Error('unexpected fetch '+url);
  }) as typeof fetch;

  try{
    const plan=await resolveVisualReferences('crie uma imagem do Freeza de Dragon Ball',3);
    assert.ok(plan.references.length>=1);
    assert.equal(plan.references[0].provider,'duckduckgo-images');
    assert.match(plan.references[0].title,/Frieza/i);
    assert.match(plan.query,/Frieza|Dragon Ball/i);
    assert.ok(!plan.warnings.some(x=>/manual|upload|envie/i.test(x)));
  }finally{
    globalThis.fetch=originalFetch;
    if(saved.googleKey===undefined)delete process.env.GOOGLE_IMAGE_SEARCH_API_KEY;else process.env.GOOGLE_IMAGE_SEARCH_API_KEY=saved.googleKey;
    if(saved.googleCx===undefined)delete process.env.GOOGLE_IMAGE_SEARCH_CX;else process.env.GOOGLE_IMAGE_SEARCH_CX=saved.googleCx;
    if(saved.firecrawl===undefined)delete process.env.FIRECRAWL_API_KEY;else process.env.FIRECRAWL_API_KEY=saved.firecrawl;
    if(saved.order===undefined)delete process.env.PREDICTLM_VISUAL_REFERENCE_PROVIDER_ORDER;else process.env.PREDICTLM_VISUAL_REFERENCE_PROVIDER_ORDER=saved.order;
  }
});
