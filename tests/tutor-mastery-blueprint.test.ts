import test from 'node:test';
import assert from 'node:assert/strict';
import {isMasteryBlueprintRequest,isTutorRequest,tutorSystemContext} from '../src/lib/tutor-mode';

test('mentor specialist prompt activates Tutor Mode and mastery blueprint',()=>{
  const prompt='Se comporte como um mentor especialista em TypeScript. Me ensine a dominar esse assunto com fundamentos essenciais, estratégias avançadas, exemplos práticos, erros comuns e plano de ação de 7 dias.';
  assert.equal(isTutorRequest(prompt),true);
  assert.equal(isMasteryBlueprintRequest(prompt),true);
  const ctx=tutorSystemContext(prompt);
  assert.match(ctx,/MODO DOMÍNIO/);
  assert.match(ctx,/Fundamentos essenciais/);
  assert.match(ctx,/Estratégias avançadas/);
  assert.match(ctx,/Exemplos práticos/);
  assert.match(ctx,/Erros comuns a evitar/);
  assert.match(ctx,/Plano de ação de 7 dias/);
  assert.match(ctx,/Aplicação no mundo real/);
  assert.match(ctx,/objetivo observável/);
});

test('normal factual chat does not accidentally activate mastery blueprint',()=>{
  const prompt='qual é a capital do Japão?';
  assert.equal(isTutorRequest(prompt),false);
  assert.equal(isMasteryBlueprintRequest(prompt),false);
  assert.equal(tutorSystemContext(prompt),'');
});
