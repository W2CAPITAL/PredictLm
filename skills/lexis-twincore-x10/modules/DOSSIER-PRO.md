# DOSSIER PRO

## Objetivo

Elevar o dossiê de consulta processual exportada para um artefato jurídico-operacional rastreável.

## Pipeline

RECALL → CNJ → DataJud + DJEN → documentos suplementares → normalização → cronologia → matriz de evidência → balanço de forças → pontos críticos → riscos → Council → Chair → plano de ação → HTML.

## Pacote suplementar

O runtime pode receber:
- documents: documento, origem, resumo e confiança;
- contracts: bloco contratual + itens/cláusulas relevantes;
- timeline: fatos externos às APIs públicas;
- favorable / adverse: elementos sustentados pela evidência;
- failures: ator, título, consequência e base;
- risks: nível qualitativo + justificativa;
- quotes: trecho + origem;
- recommendations: imediato / médio / evitar;
- council: síntese opcional do Chair.

## Gate de evidência

Cada afirmação sensível deve ser classificada internamente como:
- official: DataJud/DJEN/portal;
- document: anexo/contrato/comprovante;
- inference: interpretação;
- unknown: lacuna.

unknown nunca é convertido em fato.

## Padrão visual

O HTML deve ter navegação sticky e seções:
Visão geral · Evidências · Timeline · A favor/contra · Pontos críticos · Riscos · Council · Ações · Fontes.

Quando não houver documento suplementar, exibir “lacuna de evidência” em vez de esconder a seção ou inventar conteúdo.

## Segurança analítica

- risco Alto/Médio/Baixo é qualitativo, não probabilidade;
- acusações contra pessoa/empresa exigem documento/fonte;
- citações só entram se o texto original foi fornecido;
- modo agressivo não dispensa evidência;
- nenhuma seção deve transformar opinião do modelo em fato.


## Report Architect — camada comum

O Dossier Pro continua responsável pela investigação e análise jurídica: DataJud/DJEN, documentos, cronologia, balanço de forças, Council/Chair, riscos e estratégia.

A apresentação final deve preferir o módulo comum Report Architect quando o pedido for relatório/dossiê exportável:

EVIDÊNCIA JURÍDICA → DOSSIER MARKDOWN → validateDossier → HTML/JSON → artefato.

Regras:
- cada afirmação relevante recebe [oficial], [fornecida] ou [inferência];
- falha de DataJud/DJEN entra em Limitações e não vira prova de inexistência;
- risco permanece Alto/Médio/Baixo, sem porcentagem inventada;
- ação só recebe prazo/responsável quando houver base; caso contrário usar responsável: a definir e omitir prazo;
- meta de entrega do documento: qualidade >=85 e nenhum erro;
- numeração, âncoras, quebra de seções, HTML e impressão pertencem a src/lib/predict-dossier-html.ts;
- se houver ato com efeito jurídico (protocolo, assinatura, acordo ou pagamento), exigir confirmação humana.

O renderer jurídico legado pode continuar para telas específicas de processo, mas novos relatórios genéricos e exportações devem compartilhar o contrato Report Architect para evitar dois padrões incompatíveis.
