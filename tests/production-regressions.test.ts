import test from 'node:test';
import assert from 'node:assert/strict';
import {
  classifyConversation,
  conversationAnswerIssue,
  directConversationReply,
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
