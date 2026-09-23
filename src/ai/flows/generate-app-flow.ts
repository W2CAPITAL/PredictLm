
'use server';

/**
 * @fileOverview Fluxo de geração legado. 
 * O AppForge agora utiliza Puter.js diretamente no cliente para streaming e User-Pays.
 */

export async function generateApp(input: any) {
  // Este fluxo foi movido para o cliente (ChatColumn.tsx) para suportar streaming via Puter.js
  return {
    explanation: "Fluxo migrado para Puter.js no cliente.",
    files: []
  };
}
