# Memory / Segundo Cérebro

Recall-first: projeto, decisões, falhas, convenções, prompts e runs.
Capture: decisão, fato de projeto, eval, causa de bug, rollback e melhoria aprovada.

Estrutura sugerida:
inbox/ notes/ decisions/ projects/ runs/ prompts/ skills/ evals/

Nunca guardar senha, token ou PII sensível.


## Cognitive Lab memory layers

O runtime cognitivo mantém memória persistente separada do provider:

1. **working** — contexto ativo curto;
2. **episodic** — sequência de prompts, respostas, recompensa e prediction error;
3. **autobiographical** — identidade, preferências, eventos e continuidade do agente/usuário quando apropriado;
4. **semantic** — conceitos estáveis do próprio sistema;
5. **perceptual** — o que humano e mosca realmente perceberam na simulação;
6. **associative** — associação de estímulo/saliência/recompensa inspirada no mushroom body do Fly Core.

Regras:
- recall-first para “qual sua lembrança?”, “você lembra...?” e perguntas de identidade;
- nunca usar autobiografia do provider como memória do agente;
- nomes de modelos não são identidade;
- memórias da simulação devem registrar percepção/ação observável, não chain-of-thought;
- persistência local via IndexedDB deve migrar estados antigos sem descarte.


## Emotional memory tagging

Frank Stein tags experiences with:
- valence;
- arousal;
- emotional salience;
- dominant feelings.

High-salience experiences receive stronger consolidation/retrieval weight. Emotional tagging is an internal software signal; it is not a biological memory trace copied from a donor.


## Hippocampal engrams

Frank stores computational engrams with:
- cue and gist;
- sparse dentate vector;
- CA3 completion state;
- CA1 mismatch/novelty;
- emotional vector;
- salience, strength, repetitions and consolidation.

Recall is cue-based and weighted by similarity + strength + salience + consolidation.

Never describe FlyWire/H01 donor data as the donor's recoverable memories or thoughts. A connectome/atlas is structural evidence, not autobiographical content.
