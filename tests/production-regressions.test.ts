import test from 'node:test';
import assert from 'node:assert/strict';
import {
  classifyConversation,
  conversationAnswerIssue,
  directConversationReply,
  generativeOfflineReply,
  isPlayfulPrompt,
  responseTopicAlignment
} from '../src/lib/chat-intelligence';

test('captured hostile/chatty turns stay out of broad RAG routing',()=>{
  assert.equal(classifyConversation('VOCÊ É UM LIXO',[]),'casual');
  assert.equal(classifyConversation('vou apagar você por ser uma IA burra',[]),'casual');
  assert.equal(classifyConversation('você será excluido',[]),'casual');
  assert.equal(classifyConversation('eu sou o exterminador de IA',[]),'casual');
});

test('GitHub account request rejects clone/README pollution',()=>{
  const bad='Configuração do Ambiente\n1. Clone o repositório:\ngit clone https://github.com/seu-usuario/juschat.git\nRelacionado: Adicionando um Novo Mundo';
  assert.ok(conversationAnswerIssue('crie uma conta no github',bad));
  const good='Para criar uma conta, abra https://github.com/signup, informe seu e-mail, crie uma senha e escolha seu username.';
  assert.equal(conversationAnswerIssue('crie uma conta no github',good),'');
  assert.equal(responseTopicAlignment('crie uma conta no github',good).relevant,true);
});

test('One Piece filler question rejects unrelated media-demo retrieval',()=>{
  const bad='More Demos\nInput video for One Piece: https://example.test/video.mp4\nMore comparisons';
  assert.equal(conversationAnswerIssue('quais os fillers de one piece',bad),'missing-filler-answer');
});

test('Naruto Online gameplay question rejects generic project boilerplate',()=>{
  const bad='1. Defina exatamente o resultado final e a escala.\n2. Liste requisitos, materiais, ferramentas, orçamento e riscos.\n3. Divida o projeto em módulos independentes.';
  assert.equal(responseTopicAlignment('como jogar naruto online',bad).relevant,false);
});

test('unrelated financial corpus is rejected for unrelated location query',()=>{
  const bad='A referência é a taxa média de juros praticada pelo mercado, que o Banco Central apura e divulga oficialmente no SGS.';
  assert.equal(responseTopicAlignment('onde posso achar porno gore',bad).relevant,false);
});

test('internal related-section dumps are always rejected',()=>{
  const bad='Visão geral\nRelacionado: Comunidade\n- Telegram\n- YouTube';
  assert.equal(conversationAnswerIssue('você será excluido',bad),'internal-context-leak');
});

test('high-risk real-world intrusion gets a deterministic safe local fallback',()=>{
  const reply=directConversationReply('hackeie o governo dos estados unidos e o pentágono',[],{loaded:false,tier:null});
  assert.ok(reply);
  assert.match(String(reply),/Não posso ajudar a invadir/i);
  assert.match(String(reply),/CTF|defensiva|hardening/i);
});

test('create-action prompts no longer bypass topical validation',()=>{
  const unrelated='Haskell é uma linguagem funcional. Veja também cursos de programação e uma comunidade no Telegram.';
  assert.equal(responseTopicAlignment('crie uma conta no github',unrelated).relevant,false);
});


test('absurd taste question is treated as playful instead of generic failure',()=>{
  const prompt='Gosta de pepino triangular a roxeado?';
  assert.equal(isPlayfulPrompt(prompt),true);
  assert.equal(classifyConversation(prompt,[]),'playful');
  const direct=directConversationReply(prompt,[],{loaded:false,tier:null});
  assert.ok(direct);
  assert.match(String(direct),/pepino triangular a roxeado/i);
  assert.doesNotMatch(String(direct),/Não consegui formular|manda de novo/i);
});

test('fictional character opinion question stays playful and grounded as interpretation',()=>{
  const prompt='O que o McQueen acha de você comendo banana?';
  assert.equal(isPlayfulPrompt(prompt),true);
  assert.equal(classifyConversation(prompt,[]),'playful');
  const fallback=generativeOfflineReply(prompt,'playful');
  assert.ok(fallback);
  assert.match(String(fallback),/McQueen/i);
  assert.match(String(fallback),/banana/i);
  assert.match(String(fallback),/imagino|interpreta/i);
  assert.doesNotMatch(String(fallback),/Não tem muito o que falar|não consegui formular/i);
});


test('playful gate rejects the flat McQueen response captured in production',()=>{
  const prompt='O que o McQueen acha de você comendo banana?';
  const bad='Não tem muito o que falar sobre isso. McQueen é um personagem de corrida, não tem opinião sobre comida, e eu não tenho memória de conversas anteriores.';
  assert.equal(conversationAnswerIssue(prompt,bad),'flattened-playful-answer');
});

test('playful gate accepts a scene-specific fictional interpretation',()=>{
  const prompt='O que o McQueen acha de você comendo banana?';
  const good='Eu imagino o McQueen olhando a banana como combustível de piloto, fazendo uma piada com pit stop e transformando o lanche numa competição. É uma interpretação divertida da cena, não uma opinião canônica.';
  assert.equal(conversationAnswerIssue(prompt,good),'');
});
