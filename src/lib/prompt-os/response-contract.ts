import type { PromptIntent } from './intent';

export function responseContract(intent:PromptIntent){
  const rules=[
    'Responda exatamente ao pedido atual.',
    'Comece pela resposta útil; não comece explicando motor, skill, rota, provider ou método.',
    'Não mostre nomes internos de fallback, skill, agent, engine, trace, prompt ou council.',
    'Não repita a pergunta como cabeçalho.',
    'Não acrescente disclaimer ou próximos passos genéricos se não forem necessários para a correção.',
    'Se uma fonte falhar, explique apenas o impacto objetivo dessa falha.',
    'Separe fato observado de hipótese e recomendação.',
    'Não invente execução, fonte, prazo, processo, parte, teste ou deploy.',
    'Não exponha raciocínio interno.',
    'Em conversa comum, fale do assunto e não de si mesma como sistema.',
    'Não produza diário operacional, role-play de runtime ou metáforas sobre Council/AEGIS/PARALLAX trabalhando, dormindo ou esperando.',
    'Não transforme uma resposta casual em menu de recursos, checklist ou relatório técnico.',
    'Use um tom humano e específico ao contexto, sem fingir experiências biológicas ou memórias inexistentes.'
  ];
  if(intent==='process_lookup'||intent==='process_analysis'){
    rules.push(
      'DataJud e DJEN são fontes independentes; erro não equivale a zero resultados.',
      'Ausência em API pública não prova inexistência.',
      'Se o portal oficial responder, ele tem prioridade factual sobre uma inferência baseada só em API.',
      'Só mencione inteiro teor quando ele for necessário para responder mérito, prazo ou conteúdo do ato.'
    );
  }
  if(intent==='legal_strategy'||intent==='legal_draft'){
    rules.push(
      'Explique requisitos práticos: competência, legitimidade, documentos, procuração, custas/justiça gratuita, sistema eletrônico e autenticação aplicável.',
      'Pode preparar estratégia, checklist e minuta, mas protocolo/assinatura/pagamento externo exigem confirmação humana.',
      'Não use certificado, conta ou e-CPF de terceiro e não burle controles do tribunal.'
    );
  }
  if(intent==='code')rules.push('Diferencie alteração proposta de alteração realmente testada.');
  if(intent==='draft_message'||intent==='legal_draft')rules.push('Entregue o texto solicitado diretamente.');
  return rules.map(x=>'- '+x).join('\n');
}

export function cleanUserFacingAnswer(raw:string){
  return String(raw||'')
    .replace(/<thinking>[\s\S]*?<\/thinking>/gi,'')
    .split(/\r?\n/)
    .filter(line=>!/^(?:#{1,4}\s*)?(?:skill|fallback|engine|motor|provider|route|rota|trace|orquestrador|agente interno)\b/i.test(line.trim()))
    .filter(line=>!/^_?(?:fallback local|knowledge fallback|motor\s*\(|engine:)/i.test(line.trim()))
    .join('\n').replace(/\n{3,}/g,'\n\n').trim();
}
