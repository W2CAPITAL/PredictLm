import test from 'node:test';
import assert from 'node:assert/strict';
import {classifyConversation,shouldSearchConversation,practicalHowToReply,filterRelevantResearchItems,stableFactualReply,conversationAnswerIssue,responseTopicAlignment} from '../src/lib/chat-intelligence';
import {publicAnswerGate} from '../src/lib/public-answer-gate';
import {buildLiteralImagePrompt,buildDefaultNegativePrompt} from '../src/lib/media/grok-imagine-parity';
import {canonicalMatchupLock,matchupReferenceQueries,parseSemanticImageReview,isNarutoKuramaVsSasukeSusanooPrompt} from '../src/lib/media/canonical-matchup';
import {recommendedImageStyle} from '../src/lib/media/media-fidelity';
import {animalResult,validateAnimalFile} from '../src/lib/vision/animal-contract';

for(const prompt of ['como chocar um ovo','como plantar um morango','como cuidar de suculenta','como fazer arroz'])test(prompt,()=>{
  assert.equal(classifyConversation(prompt),'howto');
  assert.equal(shouldSearchConversation('howto',true,prompt),false);
  const answer=practicalHowToReply(prompt);assert.ok(answer);assert.equal(conversationAnswerIssue(prompt,answer),'');
  assert.equal(publicAnswerGate(answer,'pt-BR',prompt).ok,true);
});
test('search permission and explicit source requests',()=>{
  assert.equal(shouldSearchConversation('current',false,'notícias hoje'),false);
  assert.equal(shouldSearchConversation('howto',true,'como plantar morango? pesquise fontes'),true);
  assert.equal(shouldSearchConversation('howto',true,'como mexer na instalação elétrica'),true);
  assert.equal(classifyConversation('como abrir uma empresa legalmente'),'howto');
  assert.equal(classifyConversation('como funciona a fotossíntese'),'factual');
});
test('unrelated historical snippet never becomes planting advice, even when repeated',()=>{
  const bad={title:'Nipo-brasileiros',url:'https://pt.wikipedia.org/?curid=7742049',summary:'suas próprias terras e se tornaram pequenos proprietários. Passaram a plantar morango, chá e arroz. Apenas 6% das crianças eram fruto de casamentos inter-raciais'};
  const good={title:'Guia de plantio do morango',url:'https://example.org/morango',summary:'Plante a muda com a coroa ao nível do solo; regue sem encharcar.'};
  for(let i=0;i<2;i++)assert.deepEqual(filterRelevantResearchItems('como plantar um morango',[bad,good]).map(x=>x.url),[good.url]);
  assert.equal(publicAnswerGate(bad.summary,'pt-BR','como plantar um morango').ok,false);
  assert.equal(publicAnswerGate('Não tenho contexto local suficiente para responder.','pt-BR','como chocar um ovo').ok,false);
});
for(const prompt of ['quem é naruto','quem é elon musk'])test(prompt,()=>{
  const answer=stableFactualReply(prompt);assert.ok(answer);assert.equal(publicAnswerGate(answer,'pt-BR',prompt).ok,true);
  assert.equal(shouldSearchConversation(classifyConversation(prompt),true,prompt),false);
});
test('factual identity does not accept unsolicited rankings',()=>assert.equal(publicAnswerGate('Elon Musk é o mais rico, com fortuna de trilhões.','pt-BR','quem é elon musk').ok,false));
const scene='naruto kurama lutando contra sasuke susanoo perfeito no vale do fim';
test('canonical lock survives compilation with reference notes and negatives',()=>{
  assert.equal(isNarutoKuramaVsSasukeSusanooPrompt(scene),true);
  assert.equal(recommendedImageStyle(scene),'Anime');
  const text=buildLiteralImagePrompt({originalPrompt:scene,style:'Anime',identityLock:canonicalMatchupLock(scene),referenceEvidence:'reference '.repeat(50),negativePrompt:buildDefaultNegativePrompt(scene)});
  for(const pattern of [/LEFT:/,/RIGHT:/,/nine distinct tails/,/Hashirama and Madara/,/missing Kurama/,/missing Perfect Susanoo/])assert.match(text,pattern);
  assert.equal(matchupReferenceQueries(scene).length,3);
  assert.doesNotMatch(canonicalMatchupLock('naruto kurama vs sasuke susanoo perfeito em Marte'),/SETTING: Valley/);
});
test('semantic review rejects malformed results and keeps unavailable separate from passed',()=>{
  assert.equal(parseSemanticImageReview({},scene).status,'unavailable');
  assert.equal(parseSemanticImageReview({issues:['made-up']},scene).status,'unavailable');
  assert.equal(parseSemanticImageReview({issues:[]},scene).status,'passed');
  const failed=parseSemanticImageReview({issues:['missing-kurama','central-explosion']},scene);
  assert.equal(failed.status,'failed');assert.match(failed.retryPrompt,/Reduce/);
});
test('animal scores stay calibrated to the model output and non-animals remain visible',()=>{
  const input=[{label:'Cat',score:.25,animal:true},{label:'Dog',score:.24,animal:true}];
  const r=animalResult('browser','test',input);assert.equal(r.verdict,'uncertain');assert.equal(r.predictions[0].score,.25);
  assert.equal(animalResult('browser','test',[{label:'Car',score:.9,animal:false}]).verdict,'not-animal');
  for(const score of [NaN,Infinity,-1,90])assert.throws(()=>animalResult('browser','test',[{label:'Cat',score,animal:true}]));
  assert.throws(()=>validateAnimalFile({size:30,type:'text/html'}));assert.throws(()=>validateAnimalFile({size:9*1024*1024,type:'image/png'}));
});

test('hypothetical prompts stay isolated from retrieval topics',()=>{
  const prompt='E se Alexandre de Moraes fosse uma mosca?';
  assert.equal(classifyConversation(prompt),'hypothetical');
  assert.equal(shouldSearchConversation('hypothetical',true,prompt),false);
  assert.equal(conversationAnswerIssue(prompt,'Como mosca, a hipótese mudaria tudo para uma escala minúscula: voar, pousar em paredes e enxergar o ambiente de outra perspectiva.'),'');
  assert.equal(responseTopicAlignment(prompt,'Taxas bancárias, Java e computação quântica para perícia financeira.').relevant,false);
});
test('canonical matchup recommends wide aspect when default square is unlocked',async()=>{
  const {recommendedMatchupAspect}=await import('../src/lib/media/canonical-matchup');
  assert.equal(recommendedMatchupAspect('Naruto Kurama vs Sasuke Perfect Susanoo','1:1'),'16:9');
  assert.equal(recommendedMatchupAspect('Naruto Kurama vs Sasuke Perfect Susanoo','4:3'),'4:3');
});
