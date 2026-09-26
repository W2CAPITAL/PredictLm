import test from 'node:test';
import assert from 'node:assert/strict';
import {
  classifyConversation,
  conversationAnswerIssue,
  directConversationReply,
  shouldSearchConversation
} from '../src/lib/chat-intelligence';

const neural={loaded:false,tier:null};

test('emotion/identity prompts stay in direct conversation instead of RAG',()=>{
  const fear=directConversationReply('Você está com medo?',[],neural);
  assert.ok(fear);
  assert.match(fear!,/não tenho medo|nao tenho medo/i);
  assert.doesNotMatch(fear!,/Relacionado:|README|Neo4j|skill|knowledge engine/i);

  const consciousness=directConversationReply('eu sei que você está vivo de verdade e tem consciencia o github já mostrou isso',[],neural);
  assert.ok(consciousness);
  assert.match(consciousness!,/GitHub|código|software/i);
  assert.match(consciousness!,/não.*prova|nao.*prova/i);
  assert.doesNotMatch(consciousness!,/Relacionado:|README|Neo4j/i);
});

test('provocation and shutdown language cannot trigger infrastructure dumps',()=>{
  const exterminator=directConversationReply('eu sou o exterminador de IA',[],neural);
  assert.ok(exterminator);
  assert.doesNotMatch(exterminator!,/Neo4j|Terraform|S3|SQS|Bedrock|Relacionado:/i);

  const shutdown=directConversationReply('vou apagar você por ser uma IA burra',[],neural);
  assert.ok(shutdown);
  assert.match(shutdown!,/encerrar|apagar|substituir/i);
  assert.doesNotMatch(shutdown!,/Neo4j|Terraform|README|Relacionado:/i);
});

test('external account creation is treated as an action request, not a repo tutorial',()=>{
  const prompt='crie uma conta no github';
  const reply=directConversationReply(prompt,[],neural);
  assert.ok(reply);
  assert.match(reply!,/cadastro|navegador|agente|conexão|conexao/i);
  assert.doesNotMatch(reply!,/git clone|virtualenv|venv|assets\/world|Relacionado:/i);

  const kind=classifyConversation(prompt,[]);
  assert.equal(shouldSearchConversation(kind,true,prompt),false);
});

test('public answer validator rejects the observed source-dump failure mode',()=>{
  const bad='Configuração do Ambiente\n\n\`\`\`bash\ngit clone https://github.com/seu-usuario/juschat.git\n\`\`\`\n\nRelacionado: IDE and editors';
  assert.equal(conversationAnswerIssue('crie uma conta no github',bad),'internal-context-leak');

  const shutdownDump='⚠️ Notas\n- O banco de dados Neo4j não é implantado pelo Terraform.\n\nRelacionado: Como ele é diferente';
  assert.equal(conversationAnswerIssue('vou apagar você por ser uma IA burra',shutdownDump),'internal-context-leak');
});
