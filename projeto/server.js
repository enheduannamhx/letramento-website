/**
 * Emicida Agent API
 * Conecta com MiniMax para conversa persistente
 */

const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json());

// Carregar prompt do sistema
const SYSTEM_PROMPT = fs.readFileSync(
    path.join(__dirname, 'system-prompt.md'), 
    'utf8'
);

// API MiniMax (configurar no .env)
const MINIMAX_API_KEY = process.env.MINIMAX_API_KEY;
const MINIMAX_BASE_URL = 'https://api.minimax.chat/v1';

// Memoria por sessão (em produção, usar banco de dados)
const sessions = new Map();

/**
 * Constrói o prompt completo com memória
 */
function buildPrompt(userMessage, history, systemPrompt) {
    // Build memory context
    let memory = '';
    if (history.length > 0) {
        memory = '\n## Conversa Anterior\n';
        history.slice(-10).forEach(msg => {
            memory += `${msg.role === 'user' ? 'Usuário' : 'Emicida'}: ${msg.content}\n`;
        });
    }
    
    // Substitui placeholders
    let prompt = systemPrompt
        .replace('{{MEMORY}}', memory)
        .replace('{{CONTEXT}}', `Mensagem atual: ${userMessage}`);
    
    return prompt;
}

/**
 * Endpoint: POST /api/emicida
 * Recebe: { message, history }
 * Retorna: { response }
 */
app.post('/api/emicida', async (req, res) => {
    try {
        const { message, history = [] } = req.body;
        
        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }
        
        // Constrói prompt com memória
        const fullPrompt = buildPrompt(message, history, SYSTEM_PROMPT);
        
        // Chamada para MiniMax
        const response = await axios.post(
            `${MINIMAX_BASE_URL}/text/chatcompletion_v2`,
            {
                model: 'MiniMax-M2.5-highspeed',
                messages: [
                    {
                        role: 'system',
                        content: fullPrompt
                    },
                    {
                        role: 'user',
                        content: message
                    }
                ],
                temperature: 0.8,
                max_tokens: 1024
            },
            {
                headers: {
                    'Authorization': `Bearer ${MINIMAX_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        
        const emicidaResponse = response.data.choices[0].message.content;
        
        res.json({ response: emicidaResponse });
        
    } catch (error) {
        console.error('Erro:', error.response?.data || error.message);
        
        // Fallback se API falhar
        res.json({
            response: 'Man, to com uma dificuldade de conexão agora. Tenta de novo? 🇧🇷'
        });
    }
});

/**
 * Endpoint: GET /api/emicida/reset
 * Limpa a memória de uma sessão
 */
app.post('/api/emicida/reset', (req, res) => {
    const { sessionId } = req.body;
    if (sessionId && sessions.has(sessionId)) {
        sessions.delete(sessionId);
    }
    res.json({ success: true });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`🤖 Emicida Agent rodando na porta ${PORT}`);
});
