
import { puter } from '@heyputer/puter.js';

const SYSTEM_PROMPT = `Você é o AppForge, um expert AI web developer.
Gere interfaces React + Tailwind CSS de altíssima qualidade visual.
Sempre retorne sua resposta como um objeto JSON válido representando o sistema de arquivos.

REGRAS:
1. Gere apenas JavaScript/JSX (sem TypeScript).
2. O componente principal deve ser 'App' no arquivo 'App.tsx'.
3. Use Tailwind para um design polido, moderno, com bordas arredondadas e hierarquia clara.
4. Use ícones SVG inline.

Formato do JSON:
{
  "explanation": "Breve explicação",
  "files": [
    { "path": "App.tsx", "content": "código aqui" }
  ]
}
Não inclua markdown fora do JSON.`;

/**
 * Gera uma aplicação usando Puter.js e Grok Build 0.1.
 */
export async function generateApp(prompt: string, history: any[] = []) {
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT, images: [] },
    ...history.map((m) => ({ 
      role: m.role, 
      content: m.content,
      images: m.images || []
    })),
    { role: 'user', content: prompt, images: [] },
  ];

  try {
    // Cast para any para evitar conflitos de tipo com o SDK do Puter no build
    const response = await (puter.ai.chat as any)(messages, {
      model: 'x-ai/grok-build-0.1',
      stream: true,
      temperature: 0.3,
    });

    return response;
  } catch (error) {
    console.error('Puter AI Error:', error);
    throw error;
  }
}
