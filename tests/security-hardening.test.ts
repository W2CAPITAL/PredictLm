import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createAccessSession,verifyAccessSession,verifyAccessToken,verifyApiKey} from '../src/lib/server/access-control';
import {assertPublicUrl,isPrivateIp} from '../src/lib/server/public-url';

test('access sessions are signed, expiring and do not contain the deployment token',()=>{
  const oldToken=process.env.PREDICTLM_ACCESS_TOKEN;
  const oldSecret=process.env.PREDICTLM_SESSION_SECRET;
  process.env.PREDICTLM_ACCESS_TOKEN='correct-horse-battery-staple';
  process.env.PREDICTLM_SESSION_SECRET='session-signing-secret';
  try{
    assert.equal(verifyAccessToken('correct-horse-battery-staple'),true);
    assert.equal(verifyAccessToken('wrong'),false);
    const now=1_800_000_000_000;
    const session=createAccessSession(600,now);
    assert.equal(session.includes('correct-horse-battery-staple'),false);
    assert.equal(verifyAccessSession(session,now+1000),true);
    assert.equal(verifyAccessSession(session,now+700_000),false);
    assert.equal(verifyAccessSession(session.replace(/.$/,'x'),now+1000),false);
  }finally{
    if(oldToken===undefined)delete process.env.PREDICTLM_ACCESS_TOKEN;else process.env.PREDICTLM_ACCESS_TOKEN=oldToken;
    if(oldSecret===undefined)delete process.env.PREDICTLM_SESSION_SECRET;else process.env.PREDICTLM_SESSION_SECRET=oldSecret;
  }
});


test('dedicated API keys are distinct from the owner browser credential when configured',()=>{
  const oldToken=process.env.PREDICTLM_ACCESS_TOKEN;
  const oldApiKey=process.env.PREDICTLM_API_KEY;
  const oldApiKeys=process.env.PREDICTLM_API_KEYS;
  process.env.PREDICTLM_ACCESS_TOKEN='owner-browser-credential';
  process.env.PREDICTLM_API_KEY='sheetspredict-client-key';
  process.env.PREDICTLM_API_KEYS='secondary-client-key';
  try{
    assert.equal(verifyAccessToken('owner-browser-credential'),true);
    assert.equal(verifyApiKey('sheetspredict-client-key'),true);
    assert.equal(verifyApiKey('secondary-client-key'),true);
    assert.equal(verifyApiKey('owner-browser-credential'),false);
    assert.equal(verifyApiKey('wrong'),false);
  }finally{
    if(oldToken===undefined)delete process.env.PREDICTLM_ACCESS_TOKEN;else process.env.PREDICTLM_ACCESS_TOKEN=oldToken;
    if(oldApiKey===undefined)delete process.env.PREDICTLM_API_KEY;else process.env.PREDICTLM_API_KEY=oldApiKey;
    if(oldApiKeys===undefined)delete process.env.PREDICTLM_API_KEYS;else process.env.PREDICTLM_API_KEYS=oldApiKeys;
  }
});

test('public URL guard rejects private and loopback address families',async()=>{
  for(const ip of ['127.0.0.1','10.0.0.5','172.16.2.1','192.168.1.4','169.254.169.254','::1','fd00::1','fe80::1']){
    assert.equal(isPrivateIp(ip),true,ip);
  }
  assert.equal(isPrivateIp('8.8.8.8'),false);
  await assert.rejects(()=>assertPublicUrl('http://127.0.0.1/admin'));
  await assert.rejects(()=>assertPublicUrl('http://localhost/internal'));
});

test('security-sensitive surfaces have explicit guards',()=>{
  const root=process.cwd();
  const middleware=fs.readFileSync(path.join(root,'middleware.ts'),'utf8');
  const publish=fs.readFileSync(path.join(root,'src/app/api/social/publish/route.ts'),'utf8');
  const docs=fs.readFileSync(path.join(root,'src/app/api/documents/parse/route.ts'),'utf8');
  const groq=fs.readFileSync(path.join(root,'src/lib/groq.ts'),'utf8');
  const dossier=fs.readFileSync(path.join(root,'src/components/DossierStudio.tsx'),'utf8');
  const ci=fs.readFileSync(path.join(root,'.github/workflows/ci.yml'),'utf8');
  assert.match(middleware,/PREDICTLM_ACCESS_TOKEN/);
  assert.match(middleware,/PREDICTLM_API_KEY/);
  assert.match(middleware,/ACCESS_CONTROL_NOT_CONFIGURED/);
  assert.match(middleware,/publicApi=pathname===\'\/api\/health\'/);
  assert.match(middleware,/predict_take_rate_limit/);
  assert.match(publish,/confirmPublish===true/);
  assert.match(docs,/500_000/);
  assert.doesNotMatch(groq,/NEXT_PUBLIC_GROQ_API_KEY/);
  assert.match(dossier,/sandbox=""/);
  assert.match(ci,/npm run typecheck/);
});

test('scheduled learning workflows never push generated commits directly to main',()=>{
  for(const file of ['github-knowledge.yml','auto-learning.yml','global-learning.yml']){
    const body=fs.readFileSync(path.resolve('.github/workflows',file),'utf8');
    assert.doesNotMatch(body,/git push origin HEAD:main/);
    assert.match(body,/gh pr create/);
    assert.match(body,/pull-requests: write/);
  }
});
