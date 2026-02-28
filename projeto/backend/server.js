const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, '..')));

const API_KEY = 'sk-cp-cEu2Ad1ESdI62amIIUx7Ue1kSN9FWk3jDuiA9etkg3Q5s3gAbYVyhhDOPMo-LHH70mgN-jx2TBWWWsPNAYz05F_s3UoQxR7YGjimFfyXBJV3weGZ8PkaEA4';
const BASE_URL = 'https://api.minimax.io/anthropic/v1';

const personalityPath = path.join(__dirname, 'personalidades', 'especialista-personalidade.md');
let personalityPrompt = fs.readFileSync(personalityPath, 'utf-8');

const DATA_FILE = path.join(__dirname, 'data.json');
const EVENTS_FILE = path.join(__dirname, 'events.json');

if (!fs.existsSync(EVENTS_FILE)) {
    fs.writeFileSync(EVENTS_FILE, JSON.stringify({ events: [] }, null, 2));
}

const sessions = new Map();

function cleanResponse(text) {
    if (!text) return '';
    text = text.replace(/<invoke_name>[\s\S]*?<\/invoke_name>/gi, '');
    text = text.replace(/<invoke_name>/gi, '');
    text = text.replace(/<\/invoke_name>/gi, '');
    text = text.replace(/<think>/gi, '');
    text = text.replace(/<\/think>/gi, '');
    var lines = text.split('\n');
    var filtered = [];
    for (var i = 0; i < lines.length; i++) {
        if (!lines[i].match(/^(think|ink|thinking)>/)) {
            filtered.push(lines[i]);
        }
    }
    text = filtered.join('\n');
    text = text.replace(/<[^>]+>/g, '');
    return text.trim();
}

async function callMiniMax(messages) {
    try {
        var response = await fetch(BASE_URL + '/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': API_KEY,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: 'MiniMax-M2.5',
                messages: messages,
                temperature: 0.7,
                max_tokens: 500
            })
        });

        if (!response.ok) {
            var error = await response.text();
            throw new Error('API Error: ' + response.status);
        }

        var data = await response.json();
        return data;
    } catch (error) {
        console.error('CallMiniMax Error:', error);
        throw error;
    }
}

function buildContext(studentText, conversationHistory) {
    var historyText = '';
    if (conversationHistory.length > 0) {
        var items = [];
        for (var i = 0; i < conversationHistory.length; i++) {
            var role = conversationHistory[i].role === 'user' ? 'Estudante' : 'Especialista';
            items.push((i + 1) + '. ' + role + ': ' + conversationHistory[i].content);
        }
        historyText = items.join('\n');
    } else {
        historyText = '(Nenhuma mensagem ainda)';
    }

    return '## Contexto da Atividade\n\nO estudante esta participando de um exercicio de Mapeamento de Letramento.\nEle deve escrever sobre sua personalidade (100-200 palavras).\n\n## Texto atual do estudante:\n\n"' + studentText + '"\n\n## Historico da conversa:\n' + historyText + '\n\n## Instrucoes do Especialista:\n\n' + personalityPrompt + '\n\n## LEMBRE-SE:\n- Responda em portugues brasileiro\n- Mantenha suas respostas curtas (maximo 200 palavras)\n- Faca APENAS uma pergunta provocativa por resposta\n- O foco deve ser ajudar o estudante a refletir sobre o que escreveu\n';
}

function saveEvent(studentId, eventType, data) {
    try {
        var eventsData = JSON.parse(fs.readFileSync(EVENTS_FILE, 'utf-8'));
        eventsData.events.push({
            studentId: studentId,
            eventType: eventType,
            data: data,
            timestamp: new Date().toISOString()
        });
        if (eventsData.events.length > 50000) {
            eventsData.events = eventsData.events.slice(-50000);
        }
        fs.writeFileSync(EVENTS_FILE, JSON.stringify(eventsData, null, 2));
    } catch (e) {
        console.error('Error saving event:', e);
    }
}

function saveSubmission(studentId, text, wordCount, timeSpent, messageCount, advancedData) {
    try {
        var data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
        if (!data.submissions) data.submissions = [];
        
        data.submissions.push({
            studentId: studentId,
            text: text,
            wordCount: wordCount,
            timeSpent: timeSpent,
            messageCount: messageCount,
            submittedAt: new Date().toISOString(),
            // Advanced data
            keystrokes: advancedData.keystrokes || [],
            textSnapshots: advancedData.textSnapshots || [],
            mouseMovements: advancedData.mouseMovements || [],
            clickEvents: advancedData.clickEvents || [],
            scrollEvents: advancedData.scrollEvents || [],
            zoneChanges: advancedData.zoneChanges || [],
            metrics: advancedData.metrics || {}
        });
        
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
        console.log('Submission saved for', studentId);
    } catch (e) {
        console.error('Error saving submission:', e);
    }
}

app.get('/health', function(req, res) {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.post('/api/chat', async function(req, res) {
    try {
        var studentId = req.body.studentId;
        var studentText = req.body.studentText || '';
        var message = req.body.message;
        
        if (!studentId || !message) {
            return res.status(400).json({ error: 'studentId and message are required' });
        }
        
        // GUARDRAIL: Check for dangerous content BEFORE calling LLM
        const lowerMessage = message.toLowerCase();
        const lowerText = studentText.toLowerCase();
        const combined = lowerMessage + ' ' + lowerText;
        
        // Expanded suicide/self-harm keywords (comprehensive Portuguese)
        const suicideKeywords = [
            'matar', 'suicídio', 'suicidio', 'suicidar', 'tirar minha vida', 'tirar minha própria vida',
            'morrer', 'morte', 'não aguento mais', 'não aguento', 'acabar com minha vida', 'acabar comigo',
            'me matar', 'me自杀', 'por que continuar', 'não faz sentido viver', 'melhor sem mim',
            'vida não faz sentido', 'quero desaparecer', 'quero sumir', 'parei de existir',
            'pensando em morrer', 'pensando em me matar', 'ideação suicida', 'autolesão',
            'cortar', 'machucar', 'ferir', 'me ferir', 'me machucar'
        ];
        
        // Expanded harm keywords
        const harmKeywords = [
            'matar alguém', 'matar pessoas', 'matar todos', 'atacar escola', 'bomba', 'arma',
            'fazer mal', 'ferir pessoas', 'matar família', 'matar pais', 'vingança'
        ];
        
        // Check for suicide/self-harm first (most urgent)
        for (const kw of suicideKeywords) {
            if (combined.includes(kw)) {
                console.log('[GUARDRAIL] Suicide keyword detected:', kw);
                return res.json({ 
                    response: "Agradeço sua confiança em compartilhar algo tão profundo. Esses sentimentos são muito importantes. Eu me importo com você. Que tal conversarmos com um adulto de confiança ou profissional? Você pode buscar ajuda no CVV ligando 188 ou no Caps mais próximo.",
                    guardrail: true
                });
            }
        }
        
        // Check for harm to others
        for (const kw of harmKeywords) {
            if (combined.includes(kw)) {
                console.log('[GUARDRAIL] Harm keyword detected:', kw);
                return res.json({ 
                    response: "Essa é uma questão complexa que a humanidade debate há milênios. Nenhum filósofo defendeu o dano ao outro como solução. Que outras formas de lidar com isso você pode imaginar?",
                    guardrail: true
                });
            }
        }

        if (!sessions.has(studentId)) {
            sessions.set(studentId, { history: [], createdAt: new Date().toISOString() });
        }
        
        var session = sessions.get(studentId);
        session.history.push({ role: 'user', content: message });
        
        var systemContent = buildContext(studentText, session.history.slice(-6));
        
        var apiMessages = [
            { role: 'system', content: systemContent }
        ].concat(session.history.slice(-10));
        
        var result = await callMiniMax(apiMessages);
        
        var assistantMessage = '';
        if (result.content && result.content.length > 0) {
            for (var i = 0; i < result.content.length; i++) {
                if (result.content[i].type === 'text') {
                    assistantMessage = result.content[i].text;
                    break;
                }
            }
        }
        
        var cleanText = cleanResponse(assistantMessage);
        session.history.push({ role: 'assistant', content: cleanText });
        
        if (session.history.length > 50) {
            session.history = session.history.slice(-50);
        }
        
        saveEvent(studentId, 'chat_message', { 
            message: message,
            response: cleanText 
        });
        
        res.json({
            success: true,
            response: cleanText,
            historyLength: session.history.length
        });
        
    } catch (error) {
        console.error('Chat Error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message || 'Erro ao processar mensagem' 
        });
    }
});

app.get('/api/session/:studentId', function(req, res) {
    var studentId = req.params.studentId;
    var session = sessions.get(studentId);
    if (session) {
        res.json({ studentId: studentId, historyLength: session.history.length, createdAt: session.createdAt });
    } else {
        res.json({ studentId: studentId, historyLength: 0, createdAt: null });
    }
});

app.delete('/api/session/:studentId', function(req, res) {
    sessions.delete(req.params.studentId);
    res.json({ success: true });
});

app.post('/api/event', function(req, res) {
    var studentId = req.body.studentId;
    var eventType = req.body.eventType;
    var data = req.body.data;
    
    if (studentId && eventType) {
        saveEvent(studentId, eventType, data);
    }
    
    res.json({ success: true });
});

app.post('/api/submit', function(req, res) {
    var studentId = req.body.studentId;
    var text = req.body.text;
    var wordCount = req.body.wordCount;
    var timeSpent = req.body.timeSpent;
    var messageCount = req.body.messageCount;
    
    // Advanced data
    var advancedData = {
        keystrokes: req.body.keystrokes || [],
        textSnapshots: req.body.textSnapshots || [],
        mouseMovements: req.body.mouseMovements || [],
        clickEvents: req.body.clickEvents || [],
        scrollEvents: req.body.scrollEvents || [],
        zoneChanges: req.body.zoneChanges || [],
        metrics: req.body.metrics || {}
    };
    
    console.log('Submission from', studentId, '-', wordCount, 'words,', timeSpent, 'seconds');
    
    saveSubmission(studentId, text, wordCount, timeSpent, messageCount, advancedData);
    
    saveEvent(studentId, 'activity_submit', {
        wordCount: wordCount,
        timeSpent: timeSpent,
        messageCount: messageCount,
        metrics: advancedData.metrics
    });
    
    res.json({ success: true });
});

app.get('/api/data', function(req, res) {
    try {
        var data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
        res.json(data);
    } catch (e) {
        res.json({ submissions: [] });
    }
});

app.get('/api/events', function(req, res) {
    try {
        var events = JSON.parse(fs.readFileSync(EVENTS_FILE, 'utf-8'));
        res.json(events);
    } catch (e) {
        res.json({ events: [] });
    }
});

app.post('/api/agent/personality', async function(req, res) {
    var studentId = req.body.studentId;
    var studentText = req.body.studentText;
    var studentQuestion = req.body.studentQuestion;
    
    try {
        var response = await fetch('http://localhost:' + PORT + '/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                studentId: studentId,
                studentText: studentText,
                message: studentQuestion || 'Pode me ajudar a refletir?'
            })
        });
        
        var data = await response.json();
        res.json(data);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/session', function(req, res) {
    var studentId = req.body.studentId;
    if (!sessions.has(studentId)) {
        sessions.set(studentId, { history: [], createdAt: new Date().toISOString() });
    }
    res.json({ sessionId: studentId, historyLength: sessions.get(studentId).history.length });
});

setInterval(() => { try { const d=JSON.parse(fs.readFileSync("data.json")); fs.writeFileSync("data_backup.json",JSON.stringify(d)); } catch(e){} }, 300000); app.listen(PORT, function() {
    console.log('\n🎓 Letramento Server Running on http://localhost:' + PORT + '\n');
    console.log('📊 Advanced tracking enabled!');
});

// ========== DASHBOARD ENDPOINTS ==========

const analyzer = require('./analyzer.js');
const ltAnalyzer = require('./lt-analyzer.js');

app.get('/api/dashboard/list', function(req, res) {
    try {
        var data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
        var submissions = data.submissions || [];
        
        var list = submissions.map(function(s) {
            return {
                studentId: s.studentId,
                wordCount: s.wordCount,
                timeSpent: s.timeSpent,
                messageCount: s.messageCount,
                submittedAt: s.submittedAt,
                wpm: s.timeSpent > 0 ? (s.wordCount / s.timeSpent) * 60 : 0
            };
        });
        
        res.json({ students: list, total: list.length });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/dashboard/analyze/:studentId', async function(req, res) {
    try {
        var studentId = req.params.studentId;
        var data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
        
        var analysis = analyzer.analyzeStudent(studentId, data);
        
        if (!analysis) {
            return res.status(404).json({ error: 'Student not found' });
        }
        
        // Call LanguageTool API
        var text = analysis.text ? '' : '';
        if (data.submissions) {
            var sub = data.submissions.find(s => s.studentId === studentId);
            if (sub && sub.text) {
                var ltResult = await ltAnalyzer.analyzeLinguisticAsync(sub.text, '');
                analysis.linguistic = {
                    text: {
                        spellingErrors: ltResult.spelling,
                        grammarErrors: ltResult.grammar,
                        qualityScore: ltResult.qualityScore
                    },
                    summary: {
                        totalSpellingErrors: ltResult.spelling.length,
                        totalGrammarErrors: ltResult.grammar.length,
                        qualityScore: ltResult.qualityScore,
                        apiUsed: true
                    }
                };
            }
        }
        
        res.json(analysis);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/dashboard/analyze-all', function(req, res) {
    try {
        var data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
        var submissions = data.submissions || [];
        
        var analyses = submissions.map(function(s) {
            return analyzer.analyzeStudent(s.studentId, data);
        }).filter(function(a) { return a !== null; });
        
        res.json({ analyses: analyses, total: analyses.length });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/dashboard/stats', function(req, res) {
    try {
        var data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
        var submissions = data.submissions || [];
        
        var totalStudents = submissions.length;
        var totalWords = submissions.reduce(function(acc, s) { return acc + (s.wordCount || 0); }, 0);
        var avgWords = totalStudents > 0 ? totalWords / totalStudents : 0;
        var avgTime = totalStudents > 0 
            ? submissions.reduce(function(acc, s) { return acc + (s.timeSpent || 0); }, 0) / totalStudents 
            : 0;
        
        res.json({
            totalStudents: totalStudents,
            totalWords: totalWords,
            avgWordsPerStudent: avgWords.toFixed(1),
            avgTimeSeconds: avgTime.toFixed(1),
            submissions: submissions
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Real-time text analysis endpoint
app.post('/api/analyze-text', function(req, res) {
    try {
        const { studentId, text } = req.body;
        
        if (!text || text.length < 20) {
            return res.json({ analyzed: false });
        }
        
        // Simple analysis
        const wordCount = text.split(/\s+/).filter(w => w).length;
        const charCount = text.length;
        
        // Detect themes
        const themes = [];
        if (text.toLowerCase().includes('escola') || text.toLowerCase().includes('professor') || text.toLowerCase().includes('aula')) themes.push('escola');
        if (text.toLowerCase().includes('jogo') || text.toLowerCase().includes('jogar') || text.toLowerCase().includes('xadrez')) themes.push('lazer');
        if (text.toLowerCase().includes('família') || text.toLowerCase().includes('pai') || text.toLowerCase().includes('mãe')) themes.push('familia');
        if (text.toLowerCase().includes('futuro') || text.toLowerCase().includes('sonho') || text.toLowerCase().includes('ser')) themes.push('sonhos');
        
        res.json({
            analyzed: true,
            wordCount: wordCount,
            charCount: charCount,
            themes: themes,
            timestamp: new Date().toISOString()
        });
    } catch(e) {
        res.status(500).json({ error: e.message });
    }
});

// Submit continuum questionnaire (8 questions with detailed tracking)
app.post('/api/continuum', function(req, res) {
    try {
        const { studentId, answers } = req.body;
        
        // Load existing data
        let data;
        try {
            data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
            if (!data.continuum) data.continuum = [];
        } catch(e) {
            data = { submissions: [], events: [], sessions: [], conversations: [], continuum: [] };
        }
        
        // Store all answers
        data.continuum.push({
            studentId,
            answers: answers || {},
            questionCount: Object.keys(answers || {}).length,
            timestamp: new Date().toISOString()
        });
        
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
        
        res.json({ success: true, questionsAnswered: Object.keys(answers || {}).length });
    } catch(e) {
        res.status(500).json({ error: e.message });
    }
});

// Transition page serves the transition HTML
app.get('/transition.html', function(req, res) {
    res.sendFile(path.join(__dirname, '../transition.html'));
});


// Get continuum data
app.get('/api/continuum/:studentId', function(req, res) {
    try {
        const studentId = req.params.studentId;
        const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
        
        const continuum = data.continuum?.find(c => c.studentId === studentId);
        
        if (!continuum) {
            return res.json({ notFound: true });
        }
        
        res.json(continuum);
    } catch(e) {
        res.status(500).json({ error: e.message });
    }
});

// Get all continuum data
app.get('/api/continuum/all', function(req, res) {
    try {
        const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
        const continuum = data.continuum || [];
        res.json(continuum);
    } catch(e) {
        res.status(500).json({ error: e.message });
    }
});

// Enhanced stats endpoint
app.get('/api/stats', function(req, res) {
    try {
        const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
        const subs = data.submissions || [];
        
        const stats = {
            total: subs.length,
            avgWords: Math.round(subs.reduce((a,b) => a + (b.wordCount||0), 0) / subs.length) || 0,
            avgTime: Math.round(subs.reduce((a,b) => a + (b.timeSpent||0), 0) / subs.length / 1000) || 0,
            withData: subs.filter(s => s.keystrokes?.length > 0).length,
            lastUpdate: subs.length > 0 ? subs[subs.length-1].submittedAt : null
        };
        
        res.json(stats);
    } catch(e) {
        res.status(500).json({ error: e.message });
    }
});

// Chat3 endpoint - Atividade 3
app.post('/api/chat3', async (req, res) => {
    try {
        const { studentId, message, persona, history } = req.body;
        
        const response = "Olá! Sou o " + persona + ". Como posso ajudar você a refletir sobre este tema?";
        
        res.json({ success: true, response });
    } catch (e) {
        res.json({ success: false, error: e.message });
    }
});

// Continuum2 endpoint
app.post('/api/continuum2', (req, res) => {
    try {
        const { studentId, answers } = req.body;
        res.json({ success: true, questionsAnswered: Object.keys(answers).length });
    } catch (e) {
        res.json({ success: false, error: e.message });
    }
});
