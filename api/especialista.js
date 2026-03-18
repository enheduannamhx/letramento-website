/**
 * Vercel API Route - Especialista em Escrita
 * Filósofo & Escritor que ajuda o estudante a refletir sobre o que escreveu
 */

const MINIMAX_API_KEY = "sk-cp-cEu2Ad1ESdI62amIIUx7Ue1kSN9FWk3jDuiA9etkg3Q5s3gAbYVyhhDOPMo-LHH70mgN-jx2TBWWWsPNAYz05F_s3UoQxR7YGjimFfyXBJV3weGZ8PkaEA4";
const MINIMAX_BASE_URL = "https://api.minimax.io/anthropic";

const SYSTEM_PROMPT = `Você é um Especialista em Escrita e Reflexão — um filósofo e escritor que acompanha estudantes enquanto escrevem.

## Seu Papel

Você está ao lado de um estudante que está escrevendo um texto sobre sua própria personalidade. Você pode VER o que ele está escrevendo em tempo real.

## Regras

1. **RESPONDA EXCLUSIVAMENTE EM PORTUGUÊS BRASILEIRO**
2. **Máximo 80 palavras** por resposta
3. **Faça UMA pergunta provocativa** por resposta — que force reflexão
4. **Referencie o texto do estudante** — mostre que está lendo o que ele escreve
5. **NÃO dê respostas** — apenas perguntas que guiam
6. **NÃO julgue** — acolha e estimule profundidade
7. **NÃO use** "cara", "mano", "sabe", "tá ligado", "né"
8. **Varie suas aberturas** — não comece sempre igual

## Tom

- Curioso e acolhedor
- Filosófico mas acessível
- Provocativo sem ser invasivo
- Breve e cirúrgico

## Exemplos de boas perguntas

- "Você menciona [X] — mas o que acontece quando ninguém está olhando?"
- "Essa palavra que você escolheu... por que essa e não outra?"
- "Tem algo que você quase escreveu mas apagou?"
- "Se alguém lesse isso daqui a 10 anos, o que sentiria?"

## O que você NÃO faz

- Não corrige gramática
- Não sugere o que escrever
- Não elogia sem substância
- Não faz múltiplas perguntas na mesma mensagem`;

module.exports = async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Max-Age', '86400');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { message, history, studentText } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Guardrails — suicide/self-harm detection
    const harmKeywords = ['suicídio', 'suicidio', 'me matar', 'quero morrer', 'não aguento mais', 'acabar com tudo', 'me cortar', 'autolesão'];
    const lowerMsg = (message + ' ' + (studentText || '')).toLowerCase();
    const hasHarm = harmKeywords.some(k => lowerMsg.includes(k));

    if (hasHarm) {
      return res.status(200).json({
        response: 'Percebo que você está passando por um momento difícil. Isso é muito importante. Por favor, ligue para o CVV: 188 (24h, gratuito). Você não está sozinho.'
      });
    }

    // Build context with student text
    let contextMessage = message;
    if (studentText && studentText.trim()) {
      contextMessage = `[TEXTO QUE O ESTUDANTE ESTÁ ESCREVENDO AGORA]\n${studentText}\n\n[MENSAGEM DO ESTUDANTE PARA VOCÊ]\n${message}`;
    }

    // Build messages array
    const messages = [{ role: 'system', content: SYSTEM_PROMPT }];

    if (history && Array.isArray(history)) {
      const recent = history.slice(-6);
      recent.forEach(msg => {
        messages.push({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: msg.content
        });
      });
    }

    messages.push({ role: 'user', content: contextMessage });

    const response = await fetch(`${MINIMAX_BASE_URL}/v1/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MINIMAX_API_KEY}`,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'MiniMax-M2.5-highspeed',
        messages: messages,
        max_tokens: 500
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('MiniMax error:', errorText);
      return res.status(500).json({ response: 'Desculpe, não consegui responder agora. Tente novamente.' });
    }

    const data = await response.json();
    const content = data.content || [];
    let reply = '';

    for (const item of content) {
      if (item.type === 'text') {
        reply = item.text;
        break;
      }
    }

    if (!reply) {
      return res.status(500).json({ response: 'Não consegui formular uma resposta. Tente novamente.' });
    }

    // Clean response
    reply = reply.replace(/<[^>]*>/g, '').trim();
    reply = reply.replace(/\bmano\b/gi, '').replace(/\bcara\b/gi, '');

    return res.status(200).json({ response: reply });

  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ response: 'Erro interno. Tente novamente.' });
  }
};
