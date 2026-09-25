
/**
 * Groq API Integration for AppForge
 */

export async function generateAppSimple(prompt: string, history: any[]) {
  const apiKey = process.env.GROQ_API_KEY || process.env.NEXT_PUBLIC_GROQ_API_KEY;
  
  if (!apiKey) {
    throw new Error('GROQ_API_KEY não encontrada. Por favor, configure-a no arquivo .env.');
  }

  const systemPrompt = `Você é o AppForge, um desenvolvedor React + Tailwind experiente.
Gere uma aplicação web funcional baseada no prompt do usuário.

REGRAS CRÍTICAS:
1. USE APENAS JAVASCRIPT PURO (JSX). NUNCA use TypeScript ou anotações de tipo (ex: :string, :React.FC).
2. O componente principal DEVE se chamar 'App'.
3. Use os hooks do React (useState, useEffect, etc.) DIRETAMENTE. Eles estão disponíveis globalmente no ambiente de preview.
4. Use SVGs inline para ícones.
5. Todo o código essencial deve estar em um único arquivo chamado 'App.tsx'.
6. O código deve ser compatível com React 18 e o CDN do Tailwind.
7. Retorne um objeto JSON:
   {
     "explanation": "Breve explicação do app",
     "files": [
       { "path": "App.tsx", "content": "Código JSX aqui" }
     ]
   }`;

  const messages = [
    { role: 'system', content: systemPrompt },
    ...history.slice(-5).map(m => ({ role: m.role, content: m.content })),
    { role: 'user', content: prompt }
  ];

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages,
      response_format: { type: "json_object" },
      temperature: 0.3
    })
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error?.message || 'Erro na API do Groq.');
  }

  const data = await response.json();
  return JSON.parse(data.choices[0].message.content);
}
