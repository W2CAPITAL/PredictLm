import test from 'node:test';
import assert from 'node:assert/strict';
import {classifyConversation,shouldSearchConversation,practicalHowToReply,filterRelevantResearchItems,stableFactualReply,conversationAnswerIssue,responseTopicAlignment,signalsKnowledgeGap,generativeOfflineReply,answerQuality,isPurchaseLocationIntent,directConversationReply} from '../src/lib/chat-intelligence';
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

test('knowledge gap detector triggers research retry instead of junk fallback',()=>{
  assert.equal(signalsKnowledgeGap('Não tenho dados suficientes para responder isso.'),true);
  assert.equal(signalsKnowledgeGap('Não sei essa informação.'),true);
  assert.equal(signalsKnowledgeGap('Para plantar morango, use uma muda saudável em solo bem drenado e mantenha a coroa ao nível do solo.'),false);
});

test('simple imaginative chat remains a direct hypothetical turn',()=>{
  const prompt='Como seria se uma mosca falasse';
  const answer='Se uma mosca falasse, provavelmente seria uma criatura acelerada e curiosa: reclamaria do vento, comentaria cada cheiro da cozinha e trataria uma janela fechada como uma enorme crise existencial.';
  assert.equal(classifyConversation(prompt),'hypothetical');
  assert.equal(shouldSearchConversation('hypothetical',true,prompt),false);
  assert.equal(conversationAnswerIssue(prompt,answer),'');
  assert.equal(responseTopicAlignment(prompt,answer).relevant,true);
  assert.equal(publicAnswerGate(answer,'pt-BR',prompt).ok,true);
});

test('complex practical how-to is accepted as a real procedural answer',()=>{
  const prompt='Como criar um trator do zero passo a passo';
  const answer=[
    'Construir um trator do zero é um projeto de engenharia mecânica e deve ser feito com componentes dimensionados e proteção adequada.',
    '1. Defina carga, potência, velocidade e implementos que o trator precisará suportar.',
    '2. Projete chassi, distância entre eixos, direção, freios e pontos de engate.',
    '3. Escolha e dimensione motor, transmissão, diferencial, eixos, rodas e sistema hidráulico.',
    '4. Monte um protótipo estático, verifique alinhamento, soldas, proteções e folgas.',
    '5. Teste primeiro em área controlada e em baixa velocidade antes de qualquer uso real.'
  ].join('\n');
  assert.equal(classifyConversation(prompt),'howto');
  assert.equal(conversationAnswerIssue(prompt,answer),'');
  assert.equal(publicAnswerGate(answer,'pt-BR',prompt).ok,true);
});

test('como seria se stays hypothetical instead of being rejected as missing-procedure',()=>{
  const prompt='Como seria se uma mosca falasse';
  const answer='Se uma mosca falasse, provavelmente teria uma voz rápida e curiosa, comentando cheiros, comida e cada tentativa frustrada de atravessar uma janela.';
  assert.equal(classifyConversation(prompt),'hypothetical');
  assert.equal(conversationAnswerIssue(prompt,answer),'');
  assert.equal(publicAnswerGate(answer,'pt-BR',prompt).ok,true);
});

test('como seria uma mosca falante is hypothetical, not how-to',()=>{
  const prompt='Como seria uma mosca falante';
  const answer='Uma mosca falante provavelmente seria inquieta, curiosa e rápida: comentaria cheiros, migalhas, voos pela cozinha e a frustração de bater numa janela transparente.';
  assert.equal(classifyConversation(prompt),'hypothetical');
  assert.equal(conversationAnswerIssue(prompt,answer),'');
  assert.equal(publicAnswerGate(answer,'pt-BR',prompt).ok,true);
});


test('offline PredictLM answers representative prompts without remote providers',()=>{
  for(const prompt of [
    'Como seria uma mosca falante',
    'Como criar um trator do zero passo a passo',
    'Como criar um tamanduá robô'
  ]){
    const kind=classifyConversation(prompt);
    const answer=generativeOfflineReply(prompt,kind);
    assert.ok(answer, prompt);
    assert.equal(signalsKnowledgeGap(answer!),false);
    assert.equal(responseTopicAlignment(prompt,answer!).relevant,true);
  }
});

test('generic offline path never emits the old provider failure',()=>{
  const prompt='Explique uma ideia curiosa sobre robótica';
  const answer=generativeOfflineReply(prompt,classifyConversation(prompt));
  assert.ok(answer);
  assert.doesNotMatch(answer!,/providers não produziram|pesquisa automática não encontrou/i);
});


test('como faço um tamanduá robo uses the specific robot plan',()=>{
  const prompt='Como faço um tamanduá robo';
  assert.equal(classifyConversation(prompt),'howto');
  const answer=practicalHowToReply(prompt);
  assert.ok(answer);
  assert.match(answer!,/tamanduá-robô/i);
  assert.match(answer!,/locomoção|chassi|sensores/i);
  assert.doesNotMatch(answer!,/Defina exatamente o resultado final e a escala/);
  assert.equal(conversationAnswerIssue(prompt,answer!),'');
});

test('generic robot request is not mistaken for tamandua robot',()=>{
  const answer=practicalHowToReply('Como faço um robô simples');
  assert.ok(!answer||!/tamanduá-robô/i.test(answer));
});


test('open-domain gates accept explanatory and creative answers without topic templates',()=>{
  const explainPrompt='Como funciona a fotossíntese?';
  const explainAnswer='A fotossíntese converte energia luminosa em energia química. Plantas usam luz, água e dióxido de carbono para formar açúcares, liberando oxigênio como subproduto.';
  assert.equal(classifyConversation(explainPrompt),'factual');
  assert.equal(conversationAnswerIssue(explainPrompt,explainAnswer),'');
  assert.ok(answerQuality(explainPrompt,explainAnswer)>=0);

  const creativePrompt='Escreva um poema curto sobre saudade';
  const creativeAnswer='A casa guarda o eco dos passos que partiram; na janela, a tarde espera um nome que não volta.';
  assert.equal(responseTopicAlignment(creativePrompt,creativeAnswer).relevant,true);
});

test('unknown topics remain routable as general assistant requests',()=>{
  for(const prompt of [
    'Explique o paradoxo do navio de Teseu',
    'Compare três formas de organizar uma biblioteca pessoal',
    'Invente uma criatura que viva em nuvens de metano',
    'Ajude a depurar uma função recursiva que entra em loop'
  ]){
    assert.ok(classifyConversation(prompt));
  }
});


test('reported prompts stay out of procedural/retrieval pollution',()=>{
  const fly='Como uma mosca se comunica?';
  assert.notEqual(classifyConversation(fly),'howto');
  assert.equal(shouldSearchConversation(classifyConversation(fly),true,fly),false);

  const mcd='Onde compro um McDonald\'s?';
  assert.equal(isPurchaseLocationIntent(mcd),true);
  assert.equal(classifyConversation(mcd),'general');
});


test('game creation prompts remain clean practical chat',()=>{
  for(const prompt of [
    'Como posso criar um jogo',
    'Como posso criar um game tycoon',
    'Como posso criar um jogo de terror'
  ]){
    assert.equal(classifyConversation(prompt),'howto',prompt);
    assert.equal(shouldSearchConversation('howto',true,prompt),false,prompt);
  }
});

test('blocky follow-up remains a general contextual chat phrase',()=>{
  const prompt='Eu queria ser todo quadradão';
  assert.equal(classifyConversation(prompt),'general');
  assert.equal(shouldSearchConversation('general',true,prompt),false);
});


test('casual preference statements never expose provider internals',()=>{
  const prompt='Eu gosto de batatas';
  assert.equal(classifyConversation(prompt),'casual');
  const direct=directConversationReply(prompt,[],{loaded:false,tier:null});
  assert.ok(direct);
  assert.match(direct!,/batata/i);
  assert.doesNotMatch(direct!,/provider|knowledge|neural|runtime|rag/i);

  const offline=generativeOfflineReply(prompt,'casual');
  assert.ok(offline);
  assert.doesNotMatch(offline!,/provider|knowledge|neural|runtime|rag/i);
});

test('common first-person chat stays casual',()=>{
  for(const prompt of [
    'Eu adoro pizza',
    'Eu prefiro frio',
    'Eu odeio calor',
    'Estou cansado',
    'Tô com sono'
  ]){
    assert.equal(classifyConversation(prompt),'casual',prompt);
  }
});
