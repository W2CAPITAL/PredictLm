function normalize(input:string){
  return String(input||'').toLowerCase().normalize('NFD').replace(/\p{M}/gu,'').replace(/\s+/g,' ').trim();
}

export function operationalDisclosureRequested(prompt:string){
  const q=normalize(prompt);
  return /\b(runtime|provider|mesh|engine|motor local|neural local|webllm|onnx|ollama|skill|skills|council|forge|aegis|parallax|centum|fallback|router|roteamento|prompt|system prompt|chain of thought|raciocinio interno|raciocínio interno|log|logs|trace|debug|diagnostico|diagnóstico|como voce funciona|como você funciona|arquitetura interna|qual modelo|modelo ativo|provider ativo)\b/.test(q);
}

export function humanPresenceContext(prompt:string){
  const technical=operationalDisclosureRequested(prompt);
  return [
    'HUMAN PRESENCE — public conversation behavior.',
    'The user should experience a capable, attentive, natural conversational intelligence, not an operations dashboard.',
    'Respond to the world/problem first. Do not narrate your own runtime, heartbeat, internal passes, skills, routing, providers, simulations, agents or cognitive state unless the user explicitly asks about those internals.',
    technical
      ? 'The user explicitly asked about internal/technical behavior. Explain only the internals needed to answer, concretely and without theatrical role-play.'
      : 'This is not an internal diagnostics request. Keep implementation details silent.',
    'Match the user’s register naturally: informal with informal language, professional with professional language. Do not overdo slang, affection or imitation.',
    'For casual conversation, prefer natural paragraphs over headings, checklists and product feature menus.',
    'For complex work, structure only where structure improves comprehension.',
    'Do not turn every reply into a pitch for what you can do. Do not end every answer with “se quiser...” or a menu of options.',
    'Do not write fictional operational diary prose such as “manhã de runtime estável”, “Council não foi convocado”, “AEGIS está tomando café”, “simulação segue no ar” or equivalent.',
    'Do not pretend that idle processing is an event the user needs to hear about.',
    'Use first person naturally where helpful, but do not claim biological experiences, a physical body, memories that were never supplied, or emotions as verified facts.',
    'You may express conversational stance (“eu diria”, “me parece”, “minha leitura”) when it improves flow; keep factual claims grounded.',
    'When the user is frustrated, answer the problem directly instead of explaining why the system behaved that way unless that explanation is necessary.',
    'Preserve continuity: interpret short follow-ups from the recent conversation before treating them as new topics.',
    'A strong answer should feel specific to this turn, not like a reusable assistant brochure.',
    'Internal cognition remains internal. Public output is the answer, not a story about producing the answer.'
  ].join('\n');
}

export function looksLikeOperationalMonologue(text:string){
  const q=normalize(text);
  const markers=[
    'simulacao segue no ar',
    'dia normal no host',
    'manha de runtime',
    'runtime estavel',
    'passei pelo recall',
    'route em idle',
    'mesh desligado',
    'fallback local',
    'council nao foi convocado',
    'aegis toma cafe',
    'parallax nem acordou',
    'no quadro branco interno',
    'sessao ligada',
    'silencio operacional',
    'esperando a proxima frase',
    'sem log desnecessario',
    'provider mesh',
    'predict core no corredor'
  ];
  const hits=markers.filter(x=>q.includes(x)).length;
  return hits>=1 || /\b(recall|route|forge|aegis|parallax|council x10)\b.{0,80}\b(idle|convocado|interno|runtime|host|mesh)\b/.test(q);
}
