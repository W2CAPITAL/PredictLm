export type FilingAudience='advogado'|'cidadao'|'desconhecido';

export function inferAudience(prompt:string):FilingAudience{
  const q=String(prompt||'').toLowerCase();
  if(/advogad|oab|escrit[oó]rio|procura[cç][aã]o/.test(q))return 'advogado';
  if(/sem advogado|jus postulandi|eu mesmo|cidad[aã]o|pessoa f[ií]sica/.test(q))return 'cidadao';
  return 'desconhecido';
}

export function tjspFilingChecklist(prompt:string){
  const audience=inferAudience(prompt);
  const lines=[
    '### Como transformar a estratégia em protocolo no TJSP',
    '1. **Defina foro e competência antes de escolher o sistema.** O TJSP mantém uma consulta de Peticionamento Eletrônico que informa se a combinação foro/competência usa e-SAJ ou eproc.',
    '2. **Feche a peça e a prova:** fatos numerados, fundamento, pedidos, valor da causa, documentos essenciais e prova ligada a cada alegação.',
    '3. **Feche representação e custas:** procuração/substabelecimento quando aplicável; custas ou pedido de gratuidade; dados completos das partes.',
  ];

  if(audience==='advogado'||audience==='desconhecido'){
    lines.push(
      '4. **Se for eproc como advogado:** o primeiro cadastro é feito como advogado e, segundo as orientações do TJSP, o cadastro exige certificado digital; depois disso o peticionamento inicial/intermediário ocorre no próprio eproc.',
      '5. **Se for e-SAJ:** o peticionamento exige cadastro de advogado; para uso de certificado digital o portal utiliza Web Signer e navegador compatível.'
    );
  }
  if(audience==='cidadao'||audience==='desconhecido'){
    lines.push(
      '4. **Se for cidadão/Jus Postulandi:** confirme primeiro se a matéria admite atuação sem advogado. No eproc/TJSP, o perfil Jus Postulandi usa cadastro com certificado digital; nos Juizados Especiais há também orientação presencial quando a pessoa não dispõe de certificado/meios digitais.'
    );
  }

  lines.push(
    '6. **Antes de enviar:** confira competência, classe/assunto, polo ativo/passivo, anexos, sigilo, valor, pedido de tutela, custas e assinatura.',
    '7. **Ato externo:** o PredictLM pode preparar a minuta, checklist e pacote documental, mas assinatura, pagamento e protocolo só devem ocorrer com confirmação do titular autorizado.'
  );
  return lines.join('\n');
}

export function legalAttackFramework(prompt:string){
  const q=String(prompt||'').toLowerCase();
  if(!/(atacar|estrat[eé]gia|processar|ajuizar|medida cab[ií]vel|tese|defesa)/.test(q))return '';

  return [
    '### Estratégia de ataque/defesa',
    '- **Alvo jurídico:** qual ato, cobrança, contrato, decisão ou omissão precisa ser desconstituído, compelido ou indenizado?',
    '- **Base factual:** quais fatos você consegue provar hoje e quais ainda dependem de documento, perícia, testemunha ou acesso aos autos?',
    '- **Tese principal:** argumento com melhor combinação de lei + prova + nexo com o pedido.',
    '- **Contra-tese provável:** o melhor argumento da outra parte; se ele derruba sua tese, corrija a prova ou mude o pedido antes de protocolar.',
    '- **Urgência:** tutela provisória só faz sentido quando houver probabilidade do direito e perigo/risco demonstrável; não trate urgência como frase padrão.',
    '- **Competência e rito:** juízo errado, classe errada ou pedido incompatível podem gerar atraso, emenda ou extinção.',
    '- **Custo do erro:** custas, sucumbência, preclusão, prescrição/decadência, produção de prova e efeito de um precedente desfavorável.',
    '- **Plano B:** acordo, reclamação administrativa, produção antecipada de prova, obrigação de fazer, ação declaratória/indenizatória ou recurso, conforme os fatos concretos.'
  ].join('\n');
}
