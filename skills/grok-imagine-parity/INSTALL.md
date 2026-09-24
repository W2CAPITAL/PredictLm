# Install

PredictLM já carrega esta skill como built-in em `skills/grok-imagine-parity/SKILL.md`.

Instalação standalone:

```bash
cp -a grok-imagine-parity /home/workdir/.grok/skills/
# ou ~/.grok/skills/
```

Usar junto com `predictlm-master`: pedidos de imagem disparam calibração de prompt + referência + geração real.
No app, uma skill não substitui o provider/modelo de imagem.
