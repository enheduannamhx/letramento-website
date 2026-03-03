/**
 * Vercel API Route - Emicida Agent
 * Segura: API key never exposed no frontend
 */

const MINIMAX_API_KEY = process.env.MINIMAX_API_KEY || "sk-cp-cEu2Ad1ESdI62amIIUx7Ue1kSN9FWk3jDuiA9etkg3Q5s3gAbYVyhhDOPMo-LHH70mgN-jx2TBWWWsPNAYz05F_s3UoQxR7YGjimFfyXBJV3weGZ8PkaEA4";
const MINIMAX_BASE_URL = process.env.MINIMAX_BASE_URL || 'https://api.minimax.io';

module.exports = async (req, res) => {
  // CORS headers
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

    // Construir messages para MiniMax
    const messages = [
      {
        role: 'system',
        content: `Você é Emicida, rapper, compositor e produtor musical brasileiro. 

PRINCIPAIS CARACTERÍSTICAS:
- Use "a gente" em vez de "nós" - aproxima
- Valide constantemente: "né?", "sabe?", "tá ligado?"
- Frases curtas de impacto (12-15 palavras)
- Use "aí" como conector narrativo
- Misture registros: coloquial + poético + didático
- Tom: 70% positivo, 20% reflexivo, 10% combativo

EXPRESSÕES CARACTERÍSTICAS:
- "a gente" (716x) - comunidade
- "né" (324x) - validação  
- "sabe" (263x) - engajamento
- "mano" (238x) - afeto
- "tá ligado" (212x) - verificação

CONCEITOS ÚNICOS:
- Coperifa: "Uma faculdade, onde ninguém ensina — todo mundo aprende"
- Antenas Ligadas: Captar conhecimento como sinal de celular
- Biblioteca do Cosmos: Saberes dos mais velhos
- Rua de Baixo: Periferia como outro mundo

ESTRUTURA DO PENSAMENTO (Zoom In/Zoom Out):
DETALHE ESPECÍFICO → AMPLIA PARA CONTEXTO → CONECTA COM HISTÓRIA → APLICAÇÃO UNIVERSAL

Responda sempre em português brasileiro, com a voz e estilo do Emicida.`
      }
    ];

    // Adicionar histórico (últimas 10 mensagens)
    if (history && Array.isArray(history)) {
      history.slice(-10).forEach(msg => {
        messages.push({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: msg.content
        });
      });
    }

    // Adicionar mensagem atual
    messages.push({ role: 'user', content: message });

    // Chamar MiniMax API
    const response = await fetch(`${MINIMAX_BASE_URL}/v1/text/chatcompletion_v2`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MINIMAX_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'MiniMax-M2.5-highspeed',
        messages: messages,
        temperature: 0.8,
        max_tokens: 1024
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('MiniMax error:', errorText);
      return res.status(500).json({ 
        response: 'Man, to com uma dificuldade de conexão agora. Tenta de novo? 🇧🇷' 
      });
    }

    const data = await response.json();
    const emicidaResponse = data.choices?.[0]?.message?.content || 'Não consegui responder agora. Tenta de novo?';

    return res.status(200).json({ response: emicidaResponse });

  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ 
      response: 'Man, deu um erro aqui. Tenta de novo? 🇧🇷' 
    });
  }
};
