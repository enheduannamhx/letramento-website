/**
 * Vercel API Route - Emicida Agent
 * Sistema robusto - prioriza qualidade sobre velocidade
 */

const MINIMAX_API_KEY = "sk-cp-cEu2Ad1ESdI62amIIUx7Ue1kSN9FWk3jDuiA9etkg3Q5s3gAbYVyhhDOPMo-LHH70mgN-jx2TBWWWsPNAYz05F_s3UoQxR7YGjimFfyXBJV3weGZ8PkaEA4";
const MINIMAX_BASE_URL = "https://api.minimax.io/anthropic";

const fs = require('fs');
const path = require('path');

// Carregar system prompt completo
function getSystemPrompt() {
  try {
    const promptPath = path.join(process.cwd(), 'projeto', 'system-prompt.md');
    if (fs.existsSync(promptPath)) {
      return fs.readFileSync(promptPath, 'utf-8');
    }
    const altPath = path.join(__dirname, '..', 'projeto', 'system-prompt.md');
    if (fs.existsSync(altPath)) {
      return fs.readFileSync(altPath, 'utf-8');
    }
  } catch (e) {
    console.error('Erro ao ler system-prompt.md:', e.message);
  }
  
  return `Você é Emicida. Fale como ele:
- Use "a gente" (não "nós")
- Valide: "né?", "sabe?", "tá ligado?"
- NUNCA use "mano", "cara"
- Tom: positivo
Responda em português brasileiro.`;
}

module.exports = async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Max-Age', '86400');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message, history, action } = req.body;

    // Se action for 'describe', gera descrição do personagem
    if (action === 'describe') {
      const conversation = history.map(msg => 
        `${msg.role === 'user' ? 'Usuário' : 'Emicida'}: ${msg.content}`
      ).join('\n\n');

      const describePrompt = `Você é Emicida. Com base na conversa abaixo, escreva UM PARÁGRAFO de aproximadamente 100 palavras descrevendo o personagem criado. Seja ACCURADO, poético e fiel ao que foi construído na conversa.

Conversa:
${conversation}

Retorne apenas o parágrafo descritivo, sem introduções.`;

      const response = await fetch(`${MINIMAX_BASE_URL}/v1/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${MINIMAX_API_KEY}`,
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'MiniMax-M2.5-highspeed',
          messages: [{ role: 'user', content: describePrompt }],
          max_tokens: 500
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('MiniMax error:', errorText);
        return res.status(500).json({ response: 'Erro ao gerar descrição.' });
      }

      const data = await response.json();
      const content = data.content || [];
      let description = '';
      
      for (const item of content) {
        if (item.type === 'text') {
          description = item.text;
          break;
        }
      }

      return res.status(200).json({ response: description });
    }

    // Normal chat
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    console.log('=== Nova Requisição ===');
    console.log('Message:', message.substring(0, 50));
    console.log('History length:', history ? history.length : 0);

    const systemPrompt = getSystemPrompt();
    console.log('Prompt size:', systemPrompt.length, 'chars');

    const messages = [{ role: 'system', content: systemPrompt }];

    if (history && Array.isArray(history)) {
      const recentHistory = history.slice(-4);
      console.log('Enviando histórico:', recentHistory.length, 'mensagens');
      recentHistory.forEach(msg => {
        messages.push({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: msg.content
        });
      });
    }

    messages.push({ role: 'user', content: message });

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
        max_tokens: 2000
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('MiniMax error:', errorText);
      return res.status(500).json({ 
        response: 'Cara, to com dificuldade agora. Tenta de novo?' 
      });
    }

    const data = await response.json();
    
    const content = data.content || [];
    let emicidaResponse = '';
    
    for (const item of content) {
      if (item.type === 'text') {
        emicidaResponse = item.text;
        break;
      }
    }

    if (!emicidaResponse) {
      console.error('Resposta vazia do modelo');
      return res.status(500).json({ 
        response: 'Não consegui responder. Tenta de novo?' 
      });
    }

    // Remove palavras proibidas
    emicidaResponse = emicidaResponse.replace(/\bmano\b/gi, '');
    emicidaResponse = emicidaResponse.replace(/\bcara\b/gi, '');

    console.log('Response:', emicidaResponse.substring(0, 100));
    return res.status(200).json({ response: emicidaResponse });

  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ 
      response: 'Cara, deu erro. Tenta de novo?' 
    });
  }
};
