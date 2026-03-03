/**
 * Vercel API Route - Emicida Agent
 * Configuração correta da MiniMax
 */

const MINIMAX_API_KEY = "sk-cp-cEu2Ad1ESdI62amIIUx7Ue1kSN9FWk3jDuiA9etkg3Q5s3gAbYVyhhDOPMo-LHH70mgN-jx2TBWWWsPNAYz05F_s3UoQxR7YGjimFfyXBJV3weGZ8PkaEA4";
const MINIMAX_BASE_URL = "https://api.minimax.io/anthropic";

module.exports = async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message, history } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const messages = [
      {
        role: 'system',
        content: `Você é Emicida, rapper brasileiro. Fale como ele:
- Use "a gente" (não "nós")
- Valide: "né?", "sabe?", "tá ligado?"
- Frases curtas (12-15 palavras)
- Tom: 70% positivo, 20% reflexivo, 10% combativo
- Expressões: "mano", "aí", "cara"
- Conecte passado e presente
- Use metáforas
Responda em português brasileiro.`
      }
    ];

    // Histórico
    if (history && Array.isArray(history)) {
      history.slice(-10).forEach(msg => {
        messages.push({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: msg.content
        });
      });
    }

    messages.push({ role: 'user', content: message });

    // Chamada correta para MiniMax
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
        max_tokens: 1024
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('MiniMax error:', response.status, errorText);
      return res.status(500).json({ 
        response: 'Man, to com uma dificuldade de conexão. Tenta de novo? 🇧🇷' 
      });
    }

    const data = await response.json();
    const emicidaResponse = data.content?.[0]?.text || 'Não consegui responder. Tenta de novo?';

    return res.status(200).json({ response: emicidaResponse });

  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ 
      response: 'Man, deu um erro aqui. Tenta de novo? 🇧🇷' 
    });
  }
};
