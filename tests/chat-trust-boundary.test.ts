import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  chatTrustIssue,
  providerEndpointAllowed,
  safeHistoryForModel,
  safeSessionScope,
  sanitizeUntrustedContext
} from '../src/lib/chat-trust-boundary';
import {publicAnswerGate} from '../src/lib/public-answer-gate';

const spacexPayload=JSON.stringify({
  heat_shield:{material:'PICA-X',size_meters:3.6},
  launch_payload_mass:{kg:6000,lb:13228},
  launch_payload_vol:{cubic_meters:25},
  trunk:{trunk_volume:14,cargo:{solar_array:2}},
  height_w_trunk:{meters:7.2,feet:23.6},
  diameter:{meters:3.7,feet:12},
  first_flight:'2010-12-08',
  flickr_images:['https://example.test/dragon.jpg']
});

test('raw SpaceX/API payload is blocked from normal chat',()=>{
  assert.equal(chatTrustIssue('como plantar morango?',spacexPayload),'raw-external-payload');
  const gate=publicAnswerGate(spacexPayload,'pt-BR','como plantar morango?');
  assert.equal(gate.ok,false);
  assert.equal(gate.reason,'raw-external-payload');
});

test('truncated external payload markers are rejected before they can contaminate a turn',()=>{
  const truncated='{"heat_shield":{"material":"PICA-X"},"trunk":{"trunk_volume":14},"flickr_images":[';
  assert.equal(chatTrustIssue('me explique arroz',truncated),'raw-external-payload');
  assert.equal(safeHistoryForModel(truncated),'');
});

test('debug transport text and internal review narration never pass the public gate',()=>{
  const debug='Success Response Code : 200 OK\nContent example: {"ok":true}';
  assert.equal(chatTrustIssue('oi',debug),'debug-log');
  assert.equal(publicAnswerGate(debug,'pt-BR','oi').ok,false);

  const internal='Respondi diretamente ao pedido atual e descartei contexto não solicitado. Uma segunda leitura independente apontou lacunas antes da resposta final.';
  assert.equal(chatTrustIssue('oi',internal),'internal-meta');
  assert.equal(publicAnswerGate(internal,'pt-BR','oi').ok,false);
});

test('explicit user request for structured JSON is still allowed',()=>{
  const json='{"name":"Ana","active":true,"roles":["admin","viewer"],"age":30,"city":"São Paulo"}';
  assert.equal(chatTrustIssue('retorne somente json com esses campos',json),'');
});

test('untrusted context drops raw API payloads and debug lines',()=>{
  assert.equal(sanitizeUntrustedContext('pergunta comum',spacexPayload),'');
  const clean=sanitizeUntrustedContext('pergunta comum','Fonte útil sobre morangos.\nSuccess Response Code : 200 OK\nCultivo exige luz.');
  assert.doesNotMatch(clean,/Success Response Code/i);
  assert.match(clean,/morangos|Cultivo/i);
});

test('session scope is bounded and provider endpoints reject private metadata targets on Vercel',()=>{
  assert.equal(safeSessionScope('chat 123/../../x'),'chat123x');
  assert.equal(providerEndpointAllowed('https://api.openai.com/v1',true),true);
  assert.equal(providerEndpointAllowed('http://127.0.0.1:11434/v1',true),false);
  assert.equal(providerEndpointAllowed('https://169.254.169.254/latest/meta-data',true),false);
  assert.equal(providerEndpointAllowed('http://localhost:11434/v1',false),true);
});

test('ChatShell isolates session requests and no longer renders hidden reasoning summaries',()=>{
  const ui=fs.readFileSync(new URL('../src/components/ChatShell.tsx',import.meta.url),'utf8');
  assert.match(ui,/sessionId:active\?\.id\|\|''/);
  assert.match(ui,/Tentar novamente/);
  assert.match(ui,/Reportar erro/);
  assert.doesNotMatch(ui,/Respondi diretamente ao pedido atual/);
  assert.doesNotMatch(ui,/Uma segunda leitura independente/);
  assert.doesNotMatch(ui,/Mantive um piso prático/);
  assert.doesNotMatch(ui,/>Raciocínio</);
});

test('stream route validates complete content with the same public answer gate',()=>{
  const route=fs.readFileSync(new URL('../src/app/api/chat/stream/route.ts',import.meta.url),'utf8');
  assert.match(route,/publicAnswerGate\(content/);
  assert.match(route,/upstream-stream-too-large/);
  assert.match(route,/publicFailurePayload/);
  assert.doesNotMatch(route,/errors:errors\.slice/);
});
