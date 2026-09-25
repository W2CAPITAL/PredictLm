---
name: office-artifacts
description: Geração e edição de DOCX, PPTX, PDF e XLSX com arquivos reais, validação e preservação de estrutura; também fornece padrões visuais SaaS/portfolio.
metadata:
  version: "1.0.0"
  host: "PredictLM"
---

# Office Artifacts Skill

## Missão

Quando o usuário pedir documento, apresentação, PDF ou planilha, produzir um **arquivo real e utilizável**, não texto fingindo ser arquivo.

## DOCX

Padrões de `eigenpal/docx-editor`:
- edição paginada;
- preservar OOXML não tocado;
- separar core Apache-2.0 de recursos Pro;
- comentários/tracked changes só quando a implementação/licença suportar.

Fluxo:
CONTENT → STRUCTURE → STYLES → VALIDATE → DOCX → reopen/check.

## PPTX

Referências:
- `atharva9167j/dom-to-pptx` — MIT;
- `hugohe3/ppt-master` — MIT;
- `presenton/presenton` — Apache-2.0;
- SlideAI — referência até licença ser verificada.

Regras:
- slides editáveis/nativos quando possível;
- hierarquia visual real;
- conteúdo adaptado à apresentação, não parágrafos colados;
- conferir overflow;
- imagens/diagramas devem ter função;
- export deve abrir em PowerPoint/LibreOffice/Google Slides quando compatível.

## PDF

Referências:
- Stirling-PDF: usar apenas superfícies cobertas por licença aberta aplicável; excluir módulos proprietários;
- PDFCreator: referência arquitetural/licença externa.

Capacidades:
merge, split, rotate, OCR, compress, redact, convert, metadata, page operations.

Sempre preservar original quando edição destrutiva não foi pedida.

## XLSX

Referências:
- excel-builder-vanilla — MIT;
- ExcelCreator/openpyxl patterns — MIT;
- XcelForm — reference-only até licença confirmada;
- IronXL examples — reference-only/commercial dependency.

Regras:
- cabeçalho;
- largura coerente;
- formatos numéricos/data;
- filtros;
- freeze panes;
- validação de dados;
- conditional formatting;
- fórmulas;
- gráficos somente quando ajudam;
- separar input/raw de dashboard/analytics;
- reabrir e validar workbook.

## SaaS/UI

- cult/ui — MIT: accessible component/agent patterns;
- Cult Directory Template — EULA: referência visual/arquitetural, não copiar código como corpus aberto;
- FolioSpark — reference-only até licença verificada.

Aplicar:
- dark/light coerente;
- menus compactos;
- typography/spacing hierarchy;
- mobile;
- empty/loading/error states;
- reduced-motion/accessibility;
- evitar dropdown técnico gigante quando um auto-router resolve.

## Artifact gate

REQUEST
→ FORMAT
→ CONTENT MODEL
→ GENERATE
→ OPEN/VALIDATE
→ FIX
→ DELIVER FILE

Não declarar “DOCX/PPTX/PDF/XLSX criado” enquanto o arquivo não existir e não tiver sido validado.
