---
name: grok-imagine-parity
description: Contrato de geração visual do PredictLM para transformar pedidos curtos em geração de imagem real, com expansão cinematográfica, identidade fiel, provider real e resultado verificável.
metadata:
  version: "1.0.0"
  app: "PredictLM"
  language_default: "pt-BR"
---

# Grok Imagine Parity

Objetivo: aproximar o **comportamento de geração** de uma experiência Imagine forte sem fingir que prompt/skill substitui o peso do modelo.

## Contrato

Quando o usuário pedir imagem:

1. Roteie para **media/image**, não responda apenas com texto.
2. Preserve o pedido original e produza um prompt expandido de produção, predominantemente em inglês, sem apagar nomes, formas, cores, roupas, poderes, marcas ou relações pedidas.
3. Aplique identity lock e referências visuais quando o sujeito for específico.
4. Use um **provider de imagem real** quando configurado. Nunca invente URL/arquivo.
5. Se só houver fallback público, identifique internamente o provider real usado; não finja paridade de modelo.
6. Regenerar = novo seed + composição/câmera/staging diferentes + correção objetiva da anterior.
7. Salve `prompt_original`, `prompt_expanded`, seed, provider e model nos metadados/histórico.
8. Legenda pública curta em pt-BR; mecanismo interno só aparece em diagnóstico.

## Firecrawl-first references

A referência visual padrão é **Firecrawl**, porque não deve depender de Google Cloud Console.

Ordem recomendada:

`Firecrawl Images → Firecrawl com site:pinterest.com/pin/ → Google Images opcional → identity lock textual`

`FIRECRAWL_API_KEY` é suficiente para a rota principal de referências. Google CSE é opcional e sua ausência não é erro.

## Prompt expansion

Um pedido curto vira:

**pedido literal → sujeito/identidade → ação → composição → câmera/lente → iluminação → materiais/efeitos → qualidade → artefatos proibidos → referências**

O prompt expandido não pode trocar o conteúdo central. Para Anime/Cinematic, estilo é uma direção de produção real no prompt, não apenas um botão de UI.

## Gate de fidelidade

Para personagens específicos, validar antes de aceitar a geração como boa:

- identidade reconhecível;
- silhueta/roupa/cores/símbolos corretos;
- forma/poder solicitado correto;
- sujeitos distintos não fundidos;
- ação pedida visível;
- composição coerente com a cena.

Caso de regressão:

**Naruto Uzumaki em Kurama Chakra Mode vs Sasuke Uchiha com Perfect Susanoo**

- Naruto/Kurama: dourado-laranja, raposa/chakra/tails, Naruto reconhecível;
- Sasuke/Susanoo: violeta/púrpura, avatar humanoide blindado completo, Sasuke reconhecível;
- dois combatentes distintos em confronto real;
- nunca substituir por dragão/leão/robô genérico.

## Score

Não mostrar **100/100** com base apenas em brilho/contraste/nitidez. Métrica técnica não comprova fidelidade semântica. Sem revisão semântica multimodal, o score deve ser identificado como técnico e não tratado como aprovação total da imagem.

## Falha honesta

Sem gerador real disponível:
- não retornar URL falsa;
- não transformar metadado em “imagem pronta”;
- manter o prompt expandido e informar apenas a limitação específica quando necessário.

A skill governa o contrato; qualidade de pixel continua dependendo do modelo/provider executado.
