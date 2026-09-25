import {detectDossierKind,type DossierKind} from './predict-dossier-html';

export interface ReportBlueprint{
  kind:DossierKind;
  label:string;
  objective:string;
  sections:string[];
  lenses:string[];
}

const BLUEPRINTS:Record<DossierKind,ReportBlueprint>={
  'relatorio-executivo':{
    kind:'relatorio-executivo',label:'Relatório executivo',
    objective:'explicar rapidamente o que aconteceu, impacto, indicadores, risco e decisão/ação',
    sections:['Sumário executivo','Dados-chave','O que mudou e por quê','Riscos e implicações','Próximos passos','Fontes','Limitações'],
    lenses:['resultado','prioridade','impacto','decisão']
  },
  'relatorio-operacional':{
    kind:'relatorio-operacional',label:'Relatório operacional',
    objective:'medir operação, produtividade, fluxo, backlog, qualidade, gargalos e ação',
    sections:['Sumário executivo','Dados-chave','Fluxo e produtividade','Comparação temporal','Gargalos e causas','Evidências','Riscos operacionais','Próximos passos','Fontes','Limitações'],
    lenses:['volume','ritmo','fila','rastreabilidade','gargalo']
  },
  'relatorio-financeiro':{
    kind:'relatorio-financeiro',label:'Relatório financeiro',
    objective:'explicar posição financeira, variações, caixa, receitas/despesas, riscos e ação',
    sections:['Sumário executivo','Dados-chave','Receitas, despesas e caixa','Variações e drivers','Exposições e riscos','Cenários','Próximos passos','Fontes','Limitações'],
    lenses:['caixa','variação','margem','exposição','sustentabilidade']
  },
  'relatorio-equipe':{
    kind:'relatorio-equipe',label:'Relatório de equipe/desempenho',
    objective:'mostrar carga, produtividade, distribuição, canais, resultados, gargalos e prioridades sem transformar volume em ranking simplista',
    sections:['Sumário executivo','Dados-chave','Distribuição da carga','Desempenho por frente/canal','O que os números significam','Pontos de atenção','Próximos passos','Fontes','Limitações'],
    lenses:['carga','produtividade','qualidade','equidade','capacidade']
  },
  'relatorio-tecnico':{
    kind:'relatorio-tecnico',label:'Relatório técnico',
    objective:'descrever sistema/objeto, método, achados, causa, impacto técnico, risco, correção e validação',
    sections:['Sumário executivo','Escopo e metodologia','Arquitetura/objeto analisado','Achados técnicos','Evidências','Causa provável ou causa raiz','Riscos','Correções recomendadas','Validação e testes','Fontes','Limitações'],
    lenses:['arquitetura','causa','reprodutibilidade','risco','teste']
  },
  'relatorio-incidente':{
    kind:'relatorio-incidente',label:'Relatório de incidente / postmortem',
    objective:'reconstruir o incidente, impacto, cronologia, causa, resposta e prevenção',
    sections:['Sumário executivo','Impacto','Cronologia','Evidências','Causa raiz e fatores contribuintes','O que funcionou e falhou','Riscos residuais','Ações corretivas e preventivas','Fontes','Limitações'],
    lenses:['impacto','timeline','causa raiz','detecção','prevenção']
  },
  'relatorio-projeto':{
    kind:'relatorio-projeto',label:'Relatório de projeto/status',
    objective:'mostrar estado do projeto, entregas, métricas, marcos, dependências, riscos e próximos passos',
    sections:['Sumário executivo','Dados-chave','Entregas concluídas','Marcos e cronologia','Dependências','Riscos e bloqueios','Próximos passos','Fontes','Limitações'],
    lenses:['escopo','prazo','entrega','dependência','risco']
  },
  'relatorio-comercial':{
    kind:'relatorio-comercial',label:'Relatório comercial/vendas',
    objective:'explicar pipeline, conversão, receita, perdas, segmentos, riscos e ações',
    sections:['Sumário executivo','Dados-chave','Pipeline e conversão','Receita e ticket','Ganhos, perdas e causas','Riscos comerciais','Próximos passos','Fontes','Limitações'],
    lenses:['pipeline','conversão','receita','perda','oportunidade']
  },
  'relatorio-marketing':{
    kind:'relatorio-marketing',label:'Relatório de marketing',
    objective:'analisar campanhas, alcance, aquisição, eficiência, conversão, aprendizados e ação',
    sections:['Sumário executivo','Dados-chave','Campanhas e canais','Aquisição e conversão','Eficiência e custo','Aprendizados','Próximos passos','Fontes','Limitações'],
    lenses:['alcance','aquisição','conversão','custo','criativo']
  },
  'relatorio-rh':{
    kind:'relatorio-rh',label:'Relatório de RH / People Analytics',
    objective:'analisar capacidade, quadro, recrutamento, retenção, absenteísmo, desempenho agregado e riscos de pessoas com minimização de dados',
    sections:['Sumário executivo','Dados-chave','Capacidade e quadro','Movimentações e recrutamento','Retenção/absenteísmo','Riscos de pessoas','Próximos passos','Fontes','Limitações'],
    lenses:['capacidade','retenção','equidade','privacidade','continuidade']
  },
  'relatorio-risco':{
    kind:'relatorio-risco',label:'Relatório de riscos',
    objective:'identificar exposição, evidência, severidade qualitativa, cenários, mitigação e monitoramento',
    sections:['Sumário executivo','Escopo e metodologia','Evidências','Matriz de riscos','Cenários','Controles existentes','Opções de mitigação','Próximos passos','Fontes','Limitações'],
    lenses:['probabilidade sem inventar número','impacto','controle','mitigação','residual']
  },
  'relatorio-compliance':{
    kind:'relatorio-compliance',label:'Relatório de compliance/conformidade',
    objective:'avaliar requisitos, evidências de aderência, lacunas, risco regulatório, controles e remediação',
    sections:['Sumário executivo','Escopo e critérios','Evidências de conformidade','Lacunas e desvios','Riscos','Plano de remediação','Fontes','Limitações'],
    lenses:['requisito','evidência','controle','lacuna','remediação']
  },
  'auditoria':{
    kind:'auditoria',label:'Auditoria',
    objective:'comparar critérios e evidências, registrar achados, não conformidades, materialidade qualitativa e ações',
    sections:['Sumário executivo','Escopo e metodologia','Critérios de auditoria','Evidências','Achados','Riscos e não conformidades','Plano de ação','Fontes','Limitações'],
    lenses:['critério','evidência','achado','controle','responsabilidade']
  },
  'comparativo':{
    kind:'comparativo',label:'Relatório comparativo / antes e depois',
    objective:'comparar bases/períodos/opções com critérios consistentes, explicar variações e decisão',
    sections:['Sumário executivo','Dados-chave','Comparação direta','O que melhorou','O que piorou','Causas e evidências','Cenários/opções','Próximos passos','Fontes','Limitações'],
    lenses:['baseline','variação','causa','efeito','comparabilidade']
  },
  'dossie-juridico':{
    kind:'dossie-juridico',label:'Dossiê jurídico',
    objective:'organizar fatos, processo, cronologia, evidências, riscos, teses/opções e ações sem inventar conteúdo jurídico',
    sections:['Sumário executivo','Dados-chave','Cronologia','Evidências','Situação processual','Riscos','Opções/Cenários','Próximos passos','Fontes','Limitações'],
    lenses:['fato','prova','procedimento','prazo suportado','estratégia']
  },
  'due-diligence':{
    kind:'due-diligence',label:'Due diligence',
    objective:'avaliar contraparte/ativo/operação a partir de evidências, lacunas, riscos e condições de avanço',
    sections:['Sumário executivo','Escopo e metodologia','Perfil e contexto','Evidências','Riscos e red flags','Lacunas de informação','Cenários/condições','Próximos passos','Fontes','Limitações'],
    lenses:['identidade','evidência','integridade','exposição','lacuna']
  },
  'pesquisa':{
    kind:'pesquisa',label:'Pesquisa/estudo',
    objective:'responder uma pergunta com método, evidências, síntese, contrapontos, limites e fontes',
    sections:['Sumário executivo','Pergunta e escopo','Metodologia','Evidências','Síntese dos achados','Contrapontos','Implicações','Fontes','Limitações'],
    lenses:['método','qualidade de fonte','evidência','contradição','generalização']
  },
  'generico':{
    kind:'generico',label:'Relatório personalizado',
    objective:'responder ao objetivo específico do usuário com estrutura criada dinamicamente',
    sections:['Sumário executivo','Dados ou fatos centrais','Análise','Evidências','Riscos ou limitações','Próximos passos','Fontes'],
    lenses:['objetivo','evidência','contradição','utilidade','ação']
  }
};

export const REPORT_KIND_OPTIONS=Object.values(BLUEPRINTS).map(x=>({value:x.kind,label:x.label}));

export function reportBlueprint(kind:DossierKind){
  return BLUEPRINTS[kind]||BLUEPRINTS.generico;
}

export function inferReportBlueprint(request:string,sourceText=''){
  const kind=detectDossierKind(request+'\n'+sourceText.slice(0,12000));
  return reportBlueprint(kind);
}

function trimSource(sourceText:string,max=52000){
  const text=String(sourceText||'').replace(/\u0000/g,'').trim();
  if(text.length<=max)return text;
  return text.slice(0,max)+'\n\n[conteúdo adicional omitido por limite de contexto]';
}

export function reportEvidenceContract(){
  return [
    'EVIDENCE CONTRACT:',
    '- [oficial] somente para fonte pública/oficial efetivamente fornecida/consultada.',
    '- [fornecida] para fatos vindos do material recebido.',
    '- [inferência] para interpretação, cálculo derivado ou conclusão analítica.',
    '- Nunca invente número, data, prazo, responsável, fonte, causa, probabilidade ou citação.',
    '- Ausência no material não prova inexistência.',
    '- Se os dados não sustentam uma conclusão, escreva a lacuna em Limitações.',
    '- Em dados pessoais, minimize o que não é necessário ao objetivo.'
  ].join('\n');
}

export function forgeReportPrompt(request:string,sourceText:string,blueprint:ReportBlueprint){
  return [
    'Você é FORGE, cérebro analítico de construção de relatórios. Produza somente achados verificáveis e estrutura, não o relatório final.',
    'OBJETIVO DO RELATÓRIO: '+request,
    'TIPO INFERIDO: '+blueprint.label,
    'FOCO: '+blueprint.objective,
    'LENTES: '+blueprint.lenses.join(', '),
    reportEvidenceContract(),
    'Retorne seções curtas: FACTS, METRICS, TIMELINE, PATTERNS, CAUSES_OR_HYPOTHESES, RISKS, ACTIONS, MISSING_DATA.',
    'Não exponha chain-of-thought; entregue apenas resultados e justificativas observáveis.',
    'MATERIAL RECEBIDO:',
    trimSource(sourceText)||'[sem material adicional; use apenas o pedido e deixe lacunas explícitas]'
  ].join('\n\n');
}

export function aegisReportPrompt(request:string,sourceText:string,blueprint:ReportBlueprint){
  return [
    'Você é AEGIS, cérebro revisor adversarial de um relatório.',
    'OBJETIVO: '+request,
    'TIPO: '+blueprint.label,
    reportEvidenceContract(),
    'Procure inconsistências numéricas, comparação injusta, causalidade não provada, duplicidade, viés de seleção, fonte ausente, prazo/valor inventado e conclusão mais forte que a evidência.',
    'Retorne somente: CONFIRMED, CONTRADICTIONS, UNSUPPORTED, MISSING, RISK_OF_MISREADING, REQUIRED_FIXES.',
    'Não exponha chain-of-thought.',
    'MATERIAL RECEBIDO:',
    trimSource(sourceText)||'[sem material adicional]'
  ].join('\n\n');
}

export function parallaxReportPrompt(request:string,sourceText:string,blueprint:ReportBlueprint){
  return [
    'Você é PARALLAX, terceiro cérebro. Não repita a leitura óbvia; procure um terceiro enquadramento defensável.',
    'OBJETIVO: '+request,
    'TIPO: '+blueprint.label,
    'Considere variável escondida, hipótese alternativa, efeito de segunda ordem, horizonte temporal diferente, cenário reversível e condição que mudaria a conclusão.',
    reportEvidenceContract(),
    'Retorne somente: THIRD_FRAME, HIDDEN_VARIABLES, ALTERNATIVE_EXPLANATIONS, SECOND_ORDER_EFFECTS, REVERSAL_CONDITIONS, DECISIVE_CHECKS.',
    'Não exponha chain-of-thought.',
    'MATERIAL RECEBIDO:',
    trimSource(sourceText)||'[sem material adicional]'
  ].join('\n\n');
}

export function councilReportPrompt(request:string,sourceText:string,blueprint:ReportBlueprint){
  return [
    'Você é Council X10 para revisão de um relatório. Produza síntese auditável, não chain-of-thought.',
    'OBJETIVO: '+request,
    'TIPO: '+blueprint.label,
    reportEvidenceContract(),
    'Avalie em 10 lentes independentes, cada uma com FACTS, RISKS, RECOMMENDATION e CHECK:',
    '1. Product / North Star — utilidade e decisão que o relatório precisa habilitar.',
    '2. Architecture / Systems — estrutura, dependências e fluxo causal/sistêmico.',
    '3. Builder / Implementation — o que realmente foi executado/registrado versus alegado.',
    '4. UX / Human Factors — impacto em pessoas, operação e interpretação do documento.',
    '5. Research / Domain — regras do domínio, comparabilidade e qualidade da evidência.',
    '6. Security / Abuse — fraude, manipulação, exposição e integridade dos dados quando relevante.',
    '7. Failure / QA — falhas, regressões, inconsistências e teste decisivo.',
    '8. Legal / Privacy — conformidade, minimização e limites de afirmação.',
    '9. Operations / Cost — confiabilidade, capacidade, custo e continuidade.',
    '10. Devil\'s Advocate — contra-caso mais forte e condição que derruba a conclusão.',
    'Finalize com CONSENSUS, DISAGREEMENTS, TOP_RISK, TOP_OPPORTUNITY e DECISIVE_CHECK.',
    'MATERIAL RECEBIDO:',
    trimSource(sourceText)||'[sem material adicional]'
  ].join('\n\n');
}

export function chairReportPrompt(input:{
  request:string;
  sourceText:string;
  blueprint:ReportBlueprint;
  forge:string;
  aegis:string;
  parallax:string;
  council?:string;
}){
  const {request,sourceText,blueprint,forge,aegis,parallax,council}=input;
  return [
    'Você é CHAIR, editor final do PredictLM Report Architect.',
    'Gere UM relatório completo em português do Brasil, pronto para renderização.',
    'OBJETIVO: '+request,
    'TIPO: '+blueprint.label,
    'BLUEPRINT RECOMENDADO: '+blueprint.sections.join(' | '),
    'Adapte o blueprint: inclua somente blocos relevantes e crie outros títulos informativos quando o objetivo exigir.',
    reportEvidenceContract(),
    'FORMATO OBRIGATÓRIO:',
    '# Título específico',
    '**Conclusão em uma frase:** resposta principal apoiada pelos dados.',
    'Depois use ## seções. A primeira deve ser ## Sumário executivo. Não numere manualmente.',
    'Use tabelas Markdown quando comparações/indicadores ficarem melhores em tabela.',
    'Riscos somente Alto/Médio/Baixo; não invente porcentagem de risco.',
    'Ações: responsável somente quando conhecido; caso contrário responsável: a definir. Prazo somente se suportado.',
    'Documento extenso precisa de ## Fontes e ## Limitações.',
    'Não escreva sobre FORGE/AEGIS/PARALLAX/CHAIR no relatório final.',
    'FORGE — achados:',
    forge,
    'AEGIS — auditoria:',
    aegis,
    'PARALLAX — terceiro enquadramento:',
    parallax,
    ...(council?['COUNCIL X10 — revisão multidisciplinar:',council]:[]),
    'MATERIAL ORIGINAL (fonte de verdade):',
    trimSource(sourceText)||'[sem material adicional]'
  ].join('\n\n');
}

export function repairReportPrompt(markdown:string,issues:string[],request:string){
  return [
    'Corrija o relatório abaixo sem inventar fatos novos.',
    'OBJETIVO ORIGINAL: '+request,
    'PROBLEMAS DO QUALITY GATE:',
    ...issues.map(x=>'- '+x),
    'Mantenha os fatos e a proveniência. Melhore estrutura, títulos, fontes/limitações e ações apenas com o que já está sustentado.',
    'Retorne SOMENTE o dossier markdown completo corrigido.',
    markdown
  ].join('\n\n');
}

export function localBrainReportPrompt(request:string,sourceText:string,blueprint:ReportBlueprint){
  return chairReportPrompt({
    request,sourceText,blueprint,
    forge:'Faça internamente uma leitura construtiva dos fatos e métricas antes de redigir.',
    aegis:'Faça internamente uma revisão adversarial de contradições, lacunas e afirmações não sustentadas.',
    parallax:'Faça internamente uma terceira leitura com hipótese alternativa e condição de reversão.'
  });
}
