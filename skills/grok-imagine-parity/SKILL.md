---
name: grok-imagine-parity
description: >
  Contrato para qualquer IA gerar imagem no padrao Grok Imagine: executar geracao
  de verdade (nao so descrever), expandir pedido curto em prompt cinematografico
  em ingles, entregar imagem + legenda curta em pt-BR, variacoes e regenerar.
  Use when the user pede imagem, desenho, arte, gerar imagem, Grok Imagine,
  ilustracao, capa, cena anime/realista, ou quando PredictLM/outro host so descreve
  em vez de gerar. Integra com predictlm-master na rota midia.
metadata:
  version: "1.1.0"
  pairs_with: "predictlm-master"
  does_not_replace: "actual image model weights or API keys"
---

# Grok Imagine Parity

## Verdade dura (nao delirar)

Uma **skill nao e o modelo de imagem**.

| Onde | O que a skill faz | O que a skill NAO faz |
|------|-------------------|------------------------|
| Grok | Padroniza prompt + o host **chama** Grok Imagine | — |
| PredictLM / outro app | Padroniza prompt + obriga o host a chamar **API real** (Flux, SD, Ideogram, etc.) | Nao cria pixels sozinha |
| Chat sem ferramenta de imagem | Expandir prompt + dizer a limitacao | Nao fingir que gerou arquivo |

Se o host **nao tem** gerador ligado, a resposta correta e: entregar o **prompt pronto** + dizer qual provider configurar — **nunca** inventar URL de imagem falsa.

## Quando o usuario pede imagem

1. **CLASSIFY** rota `media/image`.
2. **CALIBRATE** prompt mode: `auto | literal | imagine`.
3. **EXPAND** apenas quando o modo efetivo for Imagine.
4. **GROUND** identidade/referencias visualmente quando houver personagem/entidade especifica.
5. **GENERATE** com a ferramenta real do host (obrigatorio se existir).
6. **CAPTION** em pt-BR: 1–2 frases do que a cena representa (nao repetir o prompt inteiro).
7. Se pedir varias: 2–4 variacoes (seed/angulo/estilo), nao 12 cards lixo.
8. Se a geracao falhar: erro objetivo + prompt reutilizavel.

## Prompt modes

### Auto
- personagem/franquia/entidade especifica → **Literal**;
- pedido generico/conceitual → **Imagine**.

### Literal
Usar quando o expander esta mudando o sujeito, adicionando binario/circuitos/realismo indevido ou inventando detalhes.

Contrato:
- preservar o texto do usuario como nucleo;
- zero reescrita criativa;
- estilo so altera renderizacao, nunca identidade/conteudo;
- Firecrawl/reference images + identity lock continuam ativos;
- negative prompt continua ativo;
- Deep Think/Research nao injetam texto no prompt da imagem;
- regenerar = novo seed com o mesmo pedido literal, sem adicionar lore/props.

### Imagine
Usar o template cinematografico abaixo. O pedido original continua soberano.

## Diferenca observada (PredictLM vs Grok)

Sintomas tipicos no PredictLM:
- muitas miniaturas parecidas, prompt quase igual ao texto do usuario;
- modo "Cinematic/Photoreal/Anime" como botao, mas composicao fraca;
- Susanoo/Kurama trocados, anatomia ou confronto sem impacto;
- regenerar = quase o mesmo frame.

Padrao Grok Imagine bem usado:
- **um** frame forte (ou poucas variacoes boas);
- prompt expandido quando ele ajuda;
- assunto central nitido;
- imagem + legenda curta;
- modo literal quando expansao piora fidelidade.

## Template de expansao de prompt (Imagine)

Estrutura:

```
[subject A action] versus [subject B action],
[signature powers / forms],
[camera: angle, distance, lens feel],
[environment + debris + atmosphere],
[lighting: rim, volumetric, color contrast],
[art style: e.g. anime shonen key visual / cinematic illustration],
[quality: highly detailed, sharp focus, masterpiece],
[negatives if supported: blurry, extra limbs, watermark, text]
```

### Exemplo — pedido curto
Usuario: `naruto kurama lutando contra sasuke susanoo perfeito`

Prompt expandido (modelo):
```
Epic anime battle key visual, Naruto in Nine-Tails Chakra Mode with Kurama
nine-tailed fox manifestation behind him, orange-red chakra cloak, charging
Tailed Beast Rasengan, versus Sasuke Uchiha with complete Susanoo armor
ethereal purple warrior and blade, clash center frame, shockwave and debris,
dramatic low angle, volumetric light, orange vs violet contrast, premium
anime key visual, highly detailed, sharp focus, no watermark no text
```

Legenda:
`Naruto em modo Kurama no embate direto com o Susanoo completo do Sasuke.`

## Referencias: Firecrawl-first

Nao exigir Google Cloud Console.

Ordem:
`Firecrawl Images → Firecrawl site:pinterest.com/pin/ → Google opcional → identity lock textual`.

A ausencia de Google CSE nao deve virar erro/warning para quem ja tem `FIRECRAWL_API_KEY`.

## Regras de fidelidade (anime / personagens)

- Respeitar **formas pedidas**.
- Cores assinatura e silhueta corretas.
- Conflito legivel.
- Nao transformar personagem nomeado em arquétipo generico.
- Se o modelo trocar personagens: regenerar com seed novo e constraints melhores; no Literal, manter o pedido sem expansao inventiva.

## Imagem + texto (Grok-like)

Depois que a imagem real existir:
- exibir a imagem;
- gerar uma legenda/descricao curta em pt-BR;
- nao colar o prompt tecnico como resposta principal;
- a legenda nao deve inventar elementos fora do pedido/brief se nao houver visao multimodal do arquivo final.

## Integracao PredictLM

1. Provider real em `media/generate`.
2. `prompt_original` + `prompt_expanded` preservados.
3. `style` entra no prompt.
4. `promptMode` e `negativePrompt` ficam auditaveis.
5. `Regenerar melhor` usa novo seed; no Imagine pode refinar prompt, no Literal nao reescreve.
6. Score tecnico nunca significa fidelidade semantica perfeita.
7. Firecrawl e referencias visuais entram antes do provider quando a identidade for especifica.
8. A resposta da superficie Imagine mostra imagem + texto curto.

## Quando NAO ha gerador no host

1. Entregar prompt pronto.
2. Dizer que nao houve arquivo.
3. Nunca inventar URL/imagem.

## Checklist rapido

- [ ] Pedido entendido
- [ ] Prompt mode calibrado
- [ ] Identity/reference grounding aplicado
- [ ] Prompt expandido somente quando apropriado
- [ ] Ferramenta de imagem chamada OU limitacao declarada
- [ ] Legenda curta pt-BR
- [ ] Prompt original/expandido/seed/provider/model persistidos
- [ ] Sem fake URL / sem log de runtime
