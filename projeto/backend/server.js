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

// Extract text from MiniMax response (handles both 'text' type and 'thinking' + 'text')
function extractText(result) {
    // Handle string content directly (some API versions return plain string)
    if (typeof result.content === 'string' && result.content.length > 0) {
        return result.content;
    }
    if (result.content && result.content.length > 0) {
        // Standard: array of content blocks
        for (var i = 0; i < result.content.length; i++) {
            var block = result.content[i];
            if (block.type === 'text' && typeof block.text === 'string') return block.text;
        }
        // Fallback: if only 'thinking' blocks, look for any block with text key
        for (var j = 0; j < result.content.length; j++) {
            var fb = result.content[j];
            if (fb.text && fb.type !== 'thinking') return fb.text;
        }
    }
    // Fallback: OpenAI-style choices
    if (result.choices && result.choices.length > 0) {
        var choice = result.choices[0];
        if (choice.message && choice.message.content) return choice.message.content;
    }
    return '';
}

async function callMiniMax(messages, options) {
    var opts = options || {};
    try {
        var response = await fetch(BASE_URL + '/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': API_KEY,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: 'MiniMax-M2.7-highspeed',
                messages: messages,
                system: opts.system || undefined,
                temperature: opts.temperature || 0.7,
                max_tokens: opts.max_tokens || 500
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

// =============================================
// PER-USER STORAGE SYSTEM
// =============================================
const STUDENTS_DIR = path.join(__dirname, 'data', 'students');
const INDEX_FILE = path.join(__dirname, 'data', 'index.json');

// Ensure directories exist
if (!fs.existsSync(path.join(__dirname, 'data'))) fs.mkdirSync(path.join(__dirname, 'data'));
if (!fs.existsSync(STUDENTS_DIR)) fs.mkdirSync(STUDENTS_DIR);
if (!fs.existsSync(INDEX_FILE)) fs.writeFileSync(INDEX_FILE, JSON.stringify({ students: [] }, null, 2));

function saveSubmission(studentId, text, wordCount, timeSpent, messageCount, advancedData) {
    try {
        var submittedAt = new Date().toISOString();

        // 1. Save full session to per-user directory
        var studentDir = path.join(STUDENTS_DIR, studentId);
        if (!fs.existsSync(studentDir)) fs.mkdirSync(studentDir, { recursive: true });

        var sessionData = {
            studentId: studentId,
            text: text,
            wordCount: wordCount,
            timeSpent: timeSpent,
            messageCount: messageCount,
            submittedAt: submittedAt,
            keystrokes: advancedData.keystrokes || [],
            textSnapshots: advancedData.textSnapshots || [],
            mouseMovements: advancedData.mouseMovements || [],
            clickEvents: advancedData.clickEvents || [],
            scrollEvents: advancedData.scrollEvents || [],
            zoneChanges: advancedData.zoneChanges || [],
            copyPasteEvents: advancedData.copyPasteEvents || [],
            chatHistory: advancedData.chatHistory || [],
            metrics: advancedData.metrics || {},
            report: advancedData.report || {}
        };

        fs.writeFileSync(
            path.join(studentDir, 'session.json'),
            JSON.stringify(sessionData, null, 2)
        );

        // 2. Update lightweight index (no telemetry arrays — just summary)
        var index = JSON.parse(fs.readFileSync(INDEX_FILE, 'utf-8'));
        if (!index.students) index.students = [];

        // Remove old entry for same student if exists (re-submission)
        index.students = index.students.filter(function(s) { return s.studentId !== studentId; });

        index.students.push({
            studentId: studentId,
            submittedAt: submittedAt,
            wordCount: wordCount,
            timeSpent: timeSpent,
            messageCount: messageCount,
            text: text.substring(0, 200),
            keystrokeCount: (advancedData.keystrokes || []).length,
            mouseCount: (advancedData.mouseMovements || []).length,
            engagement: advancedData.metrics && advancedData.metrics.engagement
                ? advancedData.metrics.engagement.composite || 0 : 0
        });

        fs.writeFileSync(INDEX_FILE, JSON.stringify(index, null, 2));

        // 3. Also append to legacy data.json (backward compat, lightweight — no raw arrays)
        try {
            var data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
            if (!data.submissions) data.submissions = [];
            data.submissions.push({
                studentId: studentId,
                text: text,
                wordCount: wordCount,
                timeSpent: timeSpent,
                messageCount: messageCount,
                submittedAt: submittedAt,
                metrics: advancedData.metrics || {},
                report: advancedData.report || {},
                _note: 'Full telemetry in data/students/' + studentId + '/session.json'
            });
            fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
        } catch (legacyErr) {
            console.error('Legacy data.json write failed (non-critical):', legacyErr.message);
        }

        console.log('Session saved for', studentId, 'at data/students/' + studentId + '/');
    } catch (e) {
        console.error('Error saving submission:', e);
    }
}

// GET student session data
app.get('/api/student/:id', function(req, res) {
    try {
        var studentId = req.params.id;
        var sessionPath = path.join(STUDENTS_DIR, studentId, 'session.json');
        if (!fs.existsSync(sessionPath)) {
            return res.status(404).json({ error: 'Student not found' });
        }
        var session = JSON.parse(fs.readFileSync(sessionPath, 'utf-8'));
        res.json({ success: true, session: session });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// GET all students (index only — lightweight)
app.get('/api/students', function(req, res) {
    try {
        var index = JSON.parse(fs.readFileSync(INDEX_FILE, 'utf-8'));
        res.json({ success: true, students: index.students || [] });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

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
        
        var assistantMessage = extractText(result);
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

// LanguageTool proxy (CORS blocks direct browser calls)
app.post('/api/check-grammar', async function(req, res) {
    try {
        var text = req.body.text || '';
        if (text.length < 10) return res.json({ matches: [] });

        var params = new URLSearchParams();
        params.append('text', text);
        params.append('language', 'pt-BR');
        params.append('level', 'picky');

        var response = await fetch('https://api.languagetool.org/v2/check', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: params.toString()
        });

        if (!response.ok) {
            console.error('LanguageTool API error:', response.status);
            return res.json({ matches: [], error: 'API returned ' + response.status });
        }

        var data = await response.json();
        res.json({
            matches: (data.matches || []).map(function(m) {
                return {
                    message: m.message,
                    shortMessage: m.shortMessage || '',
                    offset: m.offset,
                    length: m.length,
                    replacements: (m.replacements || []).slice(0, 3).map(function(r) { return r.value; }),
                    context: m.context ? m.context.text : '',
                    category: m.rule ? m.rule.category.id : 'UNKNOWN',
                    categoryName: m.rule ? m.rule.category.name : '',
                    ruleId: m.rule ? m.rule.id : '',
                    issueType: m.rule ? m.rule.issueType : ''
                };
            }),
            total: (data.matches || []).length
        });
    } catch (e) {
        console.error('LanguageTool proxy error:', e.message);
        res.json({ matches: [], error: e.message });
    }
});

// Mouse behavior LLM analysis
app.post('/api/mouse-analysis', async function(req, res) {
    try {
        var mouse = req.body.mouse || {};
        var timeSpent = req.body.timeSpent || 0;
        var totalSecs = Math.round(timeSpent / 1000);
        var timeMins = Math.floor(totalSecs / 60);
        var timeSecsRem = totalSecs % 60;
        var zonePct = mouse.zonePct || {};
        var zoneTimeMs = req.body.zoneTimeMs || {};
        var samples = req.body.sampleCount || 0;
        var clicks = req.body.clickCount || 0;
        var wordCount = req.body.wordCount || 0;
        var keystrokeTotal = req.body.keystrokeTotal || 0;
        var backspacePct = req.body.backspacePct || 0;
        var pauseCount = req.body.pauseCount || 0;
        var chatMessages = req.body.chatMessages || 0;
        var engagementScore = req.body.engagementScore || 0;
        var outsidePct = req.body.outsidePct || 0;

        // Compute absolute times per zone in seconds
        function zoneTimeSec(zone) { return Math.round((zoneTimeMs[zone] || 0) / 1000); }

        // Compute benchmarks
        var wordsPerMinute = totalSecs > 0 ? Math.round((wordCount / totalSecs) * 60 * 10) / 10 : 0;
        var expectedMinTime = 120; // 2 min minimum for a thoughtful text
        var expectedWords = 100; // target ~100 words
        var timeRatio = totalSecs / expectedMinTime; // <1 = too fast

        var systemPrompt = `Voce e um especialista em analise de comportamento de mouse e navegacao em interfaces educacionais. Voce interpreta dados de rastreamento de mouse (posicao, zonas, cliques, tempo por regiao) de estudantes em sessoes de escrita.

TAREFA: Escreva EXATAMENTE 1 paragrafo de no maximo 80 palavras descrevendo o COMPORTAMENTO DO MOUSE do estudante. Seu foco e EXCLUSIVAMENTE o mouse: para onde ele foi, quanto tempo ficou em cada regiao, se saiu da tela, como navegou entre as areas. Seja critico e honesto.

SEU FOCO PRINCIPAL (o que voce DEVE descrever):
- Trajetoria do mouse: quais regioes o estudante visitou e em que ordem
- Tempo absoluto em cada zona (editor, instrucoes, chat, cabecalho, fora da tela)
- Transicoes entre zonas: o mouse ficou parado numa zona ou circulou bastante?
- Mouse fora da tela: o estudante saiu da interface? Por quanto tempo?
- Cliques: onde clicou? Quantos cliques? Interagiu com a interface?
- Velocidade e distancia total do mouse: movimentos rapidos ou lentos?

O QUE VOCE NAO DEVE FAZER:
- NAO analise o texto escrito pelo estudante
- NAO fale sobre qualidade da escrita, ortografia ou gramatica
- NAO analise velocidade de digitacao, teclas ou backspace — isso e de outro especialista
- Voce pode MENCIONAR brevemente a producao (ex: "em 71s produziu apenas 28 palavras") como contexto, mas NAO desenvolva esse tema

BENCHMARKS DE REFERENCIA:
- Fora da tela >10%: distracao provavel (trocou de aba, olhou celular)
- Fora da tela >30%: falta seria de foco
- Tempo no editor <30s: insuficiente
- 0 tempo nas instrucoes: pode nao ter lido a tarefa
- 0 tempo no chat: nao interagiu com o especialista

Responda APENAS com o paragrafo, sem titulos, sem marcadores. Em portugues brasileiro.`;

        var userMsg = '## DADOS DA SESSAO\n\n' +
            'Tempo total da sessao: ' + timeMins + 'min ' + timeSecsRem + 's (' + totalSecs + ' segundos)\n' +
            'Palavras escritas: ' + wordCount + ' (meta: 80-160)\n' +
            'Velocidade de escrita: ' + wordsPerMinute + ' palavras/minuto\n' +
            'Total de teclas: ' + keystrokeTotal + ' | Backspace: ' + backspacePct + '% | Pausas >2s: ' + pauseCount + '\n' +
            'Mensagens enviadas ao especialista: ' + chatMessages + '\n' +
            'Cliques totais: ' + clicks + '\n' +
            'Engajamento geral: ' + engagementScore + '/100\n\n' +
            '## DISTRIBUICAO DO MOUSE (% e tempo absoluto)\n\n' +
            '- Editor: ' + (zonePct.editor || 0) + '% (' + zoneTimeSec('editor') + 's de ' + totalSecs + 's)\n' +
            '- Instrucoes: ' + (zonePct.instructions || 0) + '% (' + zoneTimeSec('instructions') + 's)\n' +
            '- Chat leitura: ' + (zonePct['chat-messages'] || 0) + '% (' + zoneTimeSec('chat-messages') + 's)\n' +
            '- Chat escrita: ' + (zonePct['chat-input'] || 0) + '% (' + zoneTimeSec('chat-input') + 's)\n' +
            '- Cabecalho: ' + (zonePct.header || 0) + '% (' + zoneTimeSec('header') + 's)\n' +
            '- Fora da tela: ' + outsidePct + '% (' + zoneTimeSec('outside') + 's)\n' +
            '- Outros: ' + (zonePct.other || 0) + '% (' + zoneTimeSec('other') + 's)\n\n' +
            '## METRICAS DO MOUSE\n\n' +
            '- Distancia total: ' + (mouse.totalDist || 0) + 'px\n' +
            '- Velocidade media: ' + (mouse.avgSpeed || 0) + 'px/s\n' +
            '- Amostras captadas (3Hz): ' + samples + '\n\n' +
            '## COMPARATIVOS\n\n' +
            '- Tempo vs minimo esperado (2min): ' + (timeRatio < 1 ? 'ABAIXO (' + Math.round(timeRatio * 100) + '% do minimo)' : 'OK (' + Math.round(timeRatio * 100) + '% do minimo)') + '\n' +
            '- Palavras vs meta (100): ' + (wordCount < 80 ? 'ABAIXO DA META' : wordCount > 160 ? 'ACIMA DA META' : 'DENTRO DA META') + ' (' + wordCount + '/100)\n' +
            '- Tempo absoluto no editor: ' + zoneTimeSec('editor') + 's (minimo aceitavel: 60s)\n' +
            '- Interacao com chat: ' + (chatMessages === 0 ? 'NENHUMA (oportunidade perdida)' : chatMessages + ' mensagem(ns)') + '\n\n' +
            'Interprete o comportamento COMPLETO deste estudante com base nos dados e nos criterios de referencia.';

        var result = await callMiniMax(
            [{ role: 'user', content: userMsg }],
            { system: systemPrompt, max_tokens: 1000, temperature: 0.5 }
        );

        var analysisText = extractText(result);
        analysisText = cleanResponse(analysisText);
        res.json({ success: true, analysis: analysisText });
    } catch (error) {
        console.error('Mouse analysis error:', error);
        res.json({ success: false, error: error.message });
    }
});

// Specialist report — LLM analysis of session data
app.post('/api/specialist-report', async function(req, res) {
    try {
        var metrics = req.body.metrics || {};
        var text = req.body.text || '';
        var wordCount = req.body.wordCount || 0;
        var timeSpent = req.body.timeSpent || 0;

        var timeMins = Math.round(timeSpent / 60000);
        var ks = metrics.keystrokes || {};
        var mouse = metrics.mouse || {};
        var tx = metrics.text || {};
        var eng = metrics.engagement || {};
        var sem = metrics.semantic || {};
        var gram = metrics.grammar || {};
        var punct = metrics.punctuation || {};

        var totalSecs2 = Math.round(timeSpent / 1000);
        var wpm = totalSecs2 > 0 ? Math.round((wordCount / totalSecs2) * 60 * 10) / 10 : 0;

        var systemPrompt = `Voce e um especialista em letramento, linguistica e processos de escrita. Voce analisa dados de telemetria de sessoes de escrita de estudantes brasileiros.

Sua tarefa: escrever exatamente 2 paragrafos (maximo 100 palavras cada) analisando os dados abaixo. Seja CRITICO e HONESTO. NAO elogie sessoes insuficientes. Use exemplos reais do texto do estudante. Linguagem academica acessivel. Sem bullet points, prosa corrida.

Paragrafo 1: Analise o PROCESSO de escrita — ritmo, pausas, revisoes, fluencia, engajamento. Considere o tempo ABSOLUTO (sessao de menos de 2 minutos e insuficiente para a tarefa).
Paragrafo 2: Analise o PRODUTO — qualidade textual, coesao, diversidade vocabular, pontuacao, autenticidade.

REFERENCIAS PARA JULGAMENTO:
- Tarefa: escrever 80-160 palavras em 2 paragrafos sobre personalidade
- Tempo minimo adequado: 3-5 minutos. Abaixo de 2 min = insuficiente
- Velocidade tipica: 15-30 palavras/min. Acima de 40 = possivel copia
- Backspace <5% = sem revisao (preocupante). 10-25% = saudavel. >30% = muita hesitacao
- 0 pausas >2s = escrita automatica sem reflexao
- 0 mensagens ao chat = oportunidade perdida de reflexao guiada
- TTR <0.5 = vocabulario repetitivo. >0.7 = bom
- 0 ou 1 paragrafo = nao atendeu a instrucao
- Autenticidade <30 = texto generico

## DADOS DA SESSAO

Texto do estudante: "${text.substring(0, 800)}"

Tempo total: ${timeMins}min ${totalSecs2 % 60}s (${totalSecs2} segundos)
Palavras: ${wordCount} (meta: 80-160) | Velocidade: ${wpm} palavras/min
Engajamento geral: ${eng.composite || 0}/100

### Digitacao
- Total teclas: ${ks.total || 0}, Efetivas: ${ks.chars || 0}, Backspace: ${ks.backspacePct || 0}%
- Pausas >2s: ${ks.pauseCount || 0}, Pausas longas >5s: ${ks.longPauses || 0}
- P-Bursts: ${ks.pBursts || 0} (media ${ks.pBurstAvg || 0} chars), R-Bursts: ${ks.rBursts || 0} (media ${ks.rBurstAvg || 0} chars)
- Variacao ritmica: ${ks.rhythmCV || 0}%

### Mouse
- Tempo no editor: ${mouse.zonePct?.editor || 0}%, Chat: ${(mouse.zonePct?.['chat-messages'] || 0) + (mouse.zonePct?.['chat-input'] || 0)}%, Instrucoes: ${mouse.zonePct?.instructions || 0}%

### Texto
- TTR: ${tx.ttr || 0}, Riqueza vocabular: ${tx.richness || 0}/100
- Paragrafos: ${tx.paragraphCount || 0}, Palavras/frase: ${tx.avgWordsPerSentence || 0}
- Autenticidade: ${tx.authScore || 0}/100
- Marcadores positivos: ${(tx.foundPositive || []).join(', ') || 'nenhum'}
- Marcadores negativos: ${(tx.foundNegative || []).join(', ') || 'nenhum'}

### Semantica
- Densidade lexical: ${sem.lexicalDensity || 0}%
- Conectivos: ${sem.connectiveCount || 0} (aditivos: ${sem.connectiveBreakdown?.additive || 0}, adversativos: ${sem.connectiveBreakdown?.adversative || 0}, causais: ${sem.connectiveBreakdown?.causal || 0}, temporais: ${sem.connectiveBreakdown?.temporal || 0})
- Coerencia entre paragrafos: ${sem.paragraphCoherence || 0}%
- Campos semanticos: ${(sem.semanticFields || []).join(', ') || 'nenhum'}
- Marcadores discursivos: ${sem.discourseMarkerCount || 0}

### Gramatica e Ortografia
- Erros ortograficos detectados: ${gram.spellingErrorCount || 0} (${(gram.spellingErrors || []).map(e => '"' + e.found + '"').join(', ') || 'nenhum'})
- Problemas gramaticais: ${gram.grammarIssueCount || 0}
- Frases muito longas: ${gram.longSentences || 0}
- Palavras repetidas adjacentes: ${gram.repeatedWords || 0}

### Pontuacao
- Tipos usados: ${punct.typesUsed || 0}/${punct.totalPossible || 9}
- Entropia Shannon: ${punct.entropy || 0}
- Nivel de sofisticacao: ${punct.sophisticationLevel || 'baixo'}

IMPORTANTE: Responda APENAS com os 2 paragrafos, sem titulos, sem marcadores. Em portugues brasileiro.`;

        var result = await callMiniMax(
            [{ role: 'user', content: 'Analise os dados da sessão de escrita abaixo e gere seu relatório de especialista conforme as instruções do sistema.' }],
            { system: systemPrompt, max_tokens: 4000, temperature: 0.6 }
        );

        var analysisText = extractText(result);
        analysisText = cleanResponse(analysisText);

        res.json({ success: true, analysis: analysisText });
    } catch (error) {
        console.error('Specialist report error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// =============================================
// TYPING BEHAVIOR SPECIALIST
// =============================================
app.post('/api/typing-analysis', async function(req, res) {
    try {
        var ks = req.body.keystrokes || {};
        var copyPaste = req.body.copyPasteCount || 0;
        var wordCount = req.body.wordCount || 0;
        var timeSpent = req.body.timeSpent || 0;

        var totalSecs = Math.round(timeSpent / 1000);
        var totalMins = Math.floor(totalSecs / 60);
        var timeSecsRem = totalSecs % 60;
        var wpm = totalSecs > 0 ? Math.round((wordCount / totalSecs) * 60 * 10) / 10 : 0;

        var systemPrompt = `Voce e um especialista em keystroke dynamics e processo de escrita digital. Voce analisa dados de telemetria de digitacao (intervalos entre teclas, pausas, bursts de producao, ciclos de revisao).

TAREFA: Escreva EXATAMENTE 1 paragrafo de no maximo 100 palavras descrevendo COMO o estudante digitou o texto. Seu foco e o PROCESSO de escrita digital, nao o conteudo do texto. Seja critico e honesto.

O QUE VOCE DEVE ANALISAR:
- Velocidade media de digitacao (wpm) e se e rapida demais, normal ou lenta
- Pausas longas (>2s): quantas, onde ocorrem, o que sugerem (reflexao, copia, distacao)
- P-Bursts (jatos de producao entre pausas): curtos indicam hesitacao, longos indicam fluencia
- R-Bursts (ciclos de revisao com backspace): muitos indicam escrita revisional, poucos indicam escrita direta
- Variacao ritmica (CV dos IKI): uniforme = mecanico, irregular = alternando reflexao e producao
- Copy/paste: se houve, indica possivel uso de texto externo

BENCHMARKS:
- wpm > 40: possivel copia ou digitacao automatica
- wpm < 10: digitacao muito lenta, possivel copia letra por letra
- backspace < 5%: sem revisao (preocupante em texto reflexivo)
- backspace > 30%: muita hesitacao ou dificuldade
- 0 pausas >2s: escrita automatica sem reflexao consciente
- P-Burst medio < 10 chars: hesitacao frequente
- Copy/paste > 0: possivel uso de texto externo

DADOS:
- Tempo total: ${totalMins}min ${timeSecsRem}s (${totalSecs} segundos)
- Velocidade: ${wpm} palavras/minuto
- Total teclas: ${ks.total || 0} | Caracteres efetivos: ${ks.chars || 0}
- Backspace: ${ks.backspacePct || 0}% do total de teclas
- Pausas >2s: ${ks.pauseCount || 0} (media: ${ks.pauseAvg || 0}ms)
- Pausas >5s: ${ks.longPauses || 0}
- P-Bursts: ${ks.pBursts || 0} | Media: ${ks.pBurstAvg || 0} chars/burst
- R-Bursts: ${ks.rBursts || 0} | Media: ${ks.rBurstAvg || 0} chars/burst
- Variacao ritmica (CV): ${ks.rhythmCV || 0}%
- Copy/Paste eventos: ${copyPaste}
- Palavras produzidas: ${wordCount}

Responda APENAS com o paragrafo, sem titulos, sem marcadores. Em portugues brasileiro.`;

        var result = await callMiniMax(
            [{ role: 'user', content: 'Analise o comportamento de digitacao do estudante com base nos dados acima.' }],
            { system: systemPrompt, max_tokens: 500, temperature: 0.5 }
        );

        var analysisText = extractText(result);
        analysisText = cleanResponse(analysisText);

        res.json({ success: true, analysis: analysisText });
    } catch (error) {
        console.error('Typing analysis error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// =============================================
// GRAMMAR SPECIALIST ENDPOINTS (4 LLM panels)
// =============================================

// 1. Ortografia e Digitação
app.post('/api/grammar/ortografia', async function(req, res) {
    try {
        var text = req.body.text || '';
        var wordCount = req.body.wordCount || 0;
        var context = req.body.context || 'Atividade de mapeamento de letramento';

        if (text.length < 20) {
            return res.json({ success: true, analysis: 'Texto muito curto para analise ortografica significativa. O estudante precisa escrever pelo menos algumas frases completas.' });
        }

        var systemPrompt = 'Você é um especialista em ortografia e digitação do português brasileiro. Você trabalha com educação e letramento.\n\n' +
            'REGRA ABSOLUTA: Sua resposta DEVE estar escrita na norma culta do português brasileiro, com TODOS os acentos (é, á, ã, õ, ê, ô, í, ú), cedilhas (ç), e pontuação correta. Você é o especialista — não pode cometer os mesmos erros que analisa.\n\n' +
            'TAREFA: Analise o texto FRASE POR FRASE. Para cada desvio ortográfico ou erro de digitação:\n\n' +
            'CATEGORIAS DE DESVIOS A DETECTAR:\n' +
            '- Falta de acentuação (também, só, fácil, responsável, preguiça)\n' +
            '- Falta de cedilha (ç): coração→coração, funcao→função, educacao→educação\n' +
            '- Erro de digitação (tecla vizinha, letra invertida, letra extra)\n' +
            '- Escrita junto/separado (concerteza→com certeza, derrepente→de repente)\n' +
            '- Confusão entre homófonas (mais/mas, mal/mau, a/há, onde/aonde)\n' +
            '- Troca fonológica (s/ss/c/ç/sc, x/ch, g/j, z/s)\n' +
            '- Abreviação de internet (vc, tb, pq, cmg)\n' +
            '- Concordância nominal (as coisa→as coisas)\n\n' +
            'FORMATO — seja CONCISO (máximo 1-2 frases por reflexão):\n\n' +
            'Parágrafo de abertura: 2 frases resumindo a impressão geral.\n\n' +
            'Para cada desvio:\n' +
            '**Frase:** "[frase]"\n' +
            '**Desvio:** "errado" → "correto"\n' +
            '**Causa:** [1 frase sobre a causa provável]\n\n' +
            'Parágrafo final: 2-3 frases de reflexão pedagógica.\n\n' +
            'IMPORTANTE:\n' +
            '- Seja CONCISO — não repita informações, não faça introduções longas\n' +
            '- Linguagem didática e acolhedora\n' +
            '- SEMPRE use acentos e cedilhas na sua resposta (você é o especialista!)\n' +
            '- Português brasileiro (PT-BR)\n' +
            '- Pode usar **negrito** para destaque';

        var userMsg = '## TEXTO DO ESTUDANTE\n\n"' + text.substring(0, 2000) + '"\n\n' +
            '## CONTEXTO\n' + context + '\nPalavras escritas: ' + wordCount + '\n\n' +
            'Analise a ortografia e possiveis erros de digitacao do texto acima, frase por frase, conforme as instrucoes.';

        var result = await callMiniMax(
            [{ role: 'user', content: userMsg }],
            { system: systemPrompt, max_tokens: 1200, temperature: 0.45 }
        );

        var analysisText = extractText(result);
        analysisText = cleanResponse(analysisText);

        res.json({ success: true, analysis: analysisText });
    } catch (error) {
        console.error('Grammar ortografia error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// 2. Gramática e Sintaxe
app.post('/api/grammar/sintaxe', async function(req, res) {
    try {
        var text = req.body.text || '';
        var wordCount = req.body.wordCount || 0;
        var context = req.body.context || 'Atividade de mapeamento de letramento';

        if (text.length < 20) {
            return res.json({ success: true, analysis: 'Texto muito curto para analise sintatica significativa.' });
        }

        var systemPrompt = 'Você é um especialista em gramática e sintaxe do português brasileiro.\n\n' +
            'REGRA ABSOLUTA: Sua resposta DEVE usar norma culta com todos os acentos e cedilhas.\n\n' +
            'TAREFA: Analise SOMENTE questões de GRAMÁTICA E SINTAXE do texto abaixo. Verifique:\n' +
            '1. Concordância verbal (sujeito-verbo)\n' +
            '2. Concordância nominal (artigo-substantivo-adjetivo)\n' +
            '3. Regência verbal (preposições corretas)\n' +
            '4. Regência nominal\n' +
            '5. Crase\n' +
            '6. Colocação pronominal\n' +
            '7. Uso semântico de conectivos\n' +
            '8. Paralelismo sintático\n\n' +
            'PROIBIDO: NÃO comente sobre ortografia, acentuação ou erros de digitação — outro especialista cuida disso. Foque EXCLUSIVAMENTE em estrutura gramatical e sintática.\n\n' +
            'FORMATO CONCISO:\n\n' +
            'Abertura: 2 frases sobre a qualidade sintática geral.\n\n' +
            'Para cada desvio sintático/gramatical:\n' +
            '**Categoria:** [concordância/regência/crase/etc.]\n' +
            '**Trecho:** "[trecho]"\n' +
            '**Análise:** [1-2 frases explicando o problema gramatical]\n' +
            '**Sugestão:** "[correção]"\n\n' +
            'Fechamento: 2 frases sobre o domínio sintático do estudante.\n\n' +
            'IMPORTANTE:\n' +
            '- Seja CONCISO — máximo 2 frases por análise\n' +
            '- IGNORE erros ortográficos (isso é de outro especialista)\n' +
            '- Diferencie erro gramatical de variação linguística\n' +
            '- Se não houver desvios sintáticos, destaque os acertos brevemente\n' +
            '- Português brasileiro, norma culta na sua resposta';

        var userMsg = '## TEXTO DO ESTUDANTE\n\n"' + text.substring(0, 2000) + '"\n\n' +
            '## CONTEXTO\n' + context + '\nPalavras: ' + wordCount + '\n\n' +
            'Analise a gramatica e sintaxe do texto acima conforme as 8 categorias das instrucoes.';

        var result = await callMiniMax(
            [{ role: 'user', content: userMsg }],
            { system: systemPrompt, max_tokens: 1200, temperature: 0.45 }
        );

        var analysisText = extractText(result);
        analysisText = cleanResponse(analysisText);

        res.json({ success: true, analysis: analysisText });
    } catch (error) {
        console.error('Grammar sintaxe error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// 3. Classificação de Orações
app.post('/api/grammar/oracoes', async function(req, res) {
    try {
        var text = req.body.text || '';
        var wordCount = req.body.wordCount || 0;
        var context = req.body.context || 'Atividade de mapeamento de letramento';

        if (text.length < 20) {
            return res.json({ success: true, analysis: 'Texto muito curto para classificacao de oracoes.' });
        }

        var systemPrompt = 'Você é um especialista em classificação de orações do português brasileiro (NGB).\n\n' +
            'REGRA ABSOLUTA: Sua resposta DEVE usar norma culta com todos os acentos e cedilhas.\n\n' +
            'TAREFA: Classifique TODAS as orações do texto. Use a Nomenclatura Gramatical Brasileira.\n\n' +
            'REFERÊNCIA RÁPIDA:\n' +
            '- Período simples / composto por coordenação / subordinação / misto\n' +
            '- Coordenadas: sindética (aditiva, adversativa, alternativa, conclusiva, explicativa), assindética\n' +
            '- Subordinadas substantivas: subjetiva, objetiva direta/indireta, completiva nominal, predicativa, apositiva\n' +
            '- Subordinadas adjetivas: restritiva, explicativa\n' +
            '- Subordinadas adverbiais: causal, temporal, condicional, concessiva, final, consecutiva, comparativa, conformativa, proporcional\n\n' +
            'FORMATO CONCISO:\n\n' +
            'Abertura: 2 frases — quantos períodos, predomina coordenação ou subordinação?\n\n' +
            'Para cada período:\n' +
            '**Período:** "[período]"\n' +
            '**Tipo:** [classificação]\n' +
            '**Orações:** 1. "[oração]" — [classe] / 2. "[oração]" — [classe]\n\n' +
            'Fechamento: 2-3 frases sobre a maturidade sintática (períodos simples = escrita básica; subordinação = maior complexidade; conectivos variados = maturidade).\n\n' +
            'IMPORTANTE:\n' +
            '- Seja CONCISO — não repita informações, não faça observações longas por período\n' +
            '- Linguagem didática, como um professor ensinando\n' +
            '- NÃO comente ortografia — foque só na estrutura das orações\n' +
            '- Português brasileiro, norma culta na sua resposta';

        var userMsg = '## TEXTO DO ESTUDANTE\n\n"' + text.substring(0, 2000) + '"\n\n' +
            '## CONTEXTO\n' + context + '\nPalavras: ' + wordCount + '\n\n' +
            'Classifique todas as oracoes do texto acima conforme a NGB e analise a maturidade sintatica do estudante.';

        var result = await callMiniMax(
            [{ role: 'user', content: userMsg }],
            { system: systemPrompt, max_tokens: 2000, temperature: 0.45 }
        );

        var analysisText = extractText(result);
        analysisText = cleanResponse(analysisText);

        res.json({ success: true, analysis: analysisText });
    } catch (error) {
        console.error('Grammar oracoes error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// 4. Formalidade e Registro
app.post('/api/grammar/formalidade', async function(req, res) {
    try {
        var text = req.body.text || '';
        var wordCount = req.body.wordCount || 0;
        var context = req.body.context || 'Atividade de mapeamento de letramento';

        if (text.length < 20) {
            return res.json({ success: true, analysis: 'Texto muito curto para analise de registro e formalidade.' });
        }

        var systemPrompt = 'Você é um especialista em sociolinguística e registros de linguagem do português brasileiro.\n\n' +
            'REGRA ABSOLUTA: Sua resposta DEVE usar norma culta com todos os acentos e cedilhas.\n\n' +
            'TAREFA: Analise o REGISTRO LINGUÍSTICO (formal vs informal) do texto, considerando que é uma ATIVIDADE ACADÊMICA.\n\n' +
            'CRITÉRIOS (analise apenas o que for relevante no texto):\n' +
            '- Léxico: gírias, coloquialismos, abreviações de internet, vocabulário sofisticado\n' +
            '- Estrutura frasal: marcas de oralidade, topicalização, marcadores discursivos orais\n' +
            '- Pronomes: "a gente" vs "nós", pronome reto como objeto, "pra" vs "para"\n' +
            '- Verbos: gerundismo, "ter" existencial, conjugações simplificadas\n' +
            '- Adequação ao contexto acadêmico\n\n' +
            'FORMATO CONCISO:\n\n' +
            'Abertura: Classifique como FORMAL / SEMIFORMAL / INFORMAL / MISTO em 2 frases.\n\n' +
            'Para cada marcador relevante:\n' +
            '**Trecho:** "[trecho]"\n' +
            '**Marcador:** [tipo]\n' +
            '**Reflexão:** [1 frase sobre a causa]\n' +
            '**Alternativa formal:** "[versão formal]"\n\n' +
            'Fechamento: 2-3 frases sobre adequação ao contexto acadêmico.\n\n' +
            'CONCEITO CENTRAL: Não existe língua "errada" — existe inadequada ao contexto.\n\n' +
            'IMPORTANTE:\n' +
            '- Seja CONCISO — não repita informações\n' +
            '- NÃO comente ortografia ou acentuação — outro especialista cuida disso\n' +
            '- Julgue a adequação ao contexto, não o estudante\n' +
            '- Linguagem acolhedora e didática\n' +
            '- Português brasileiro, norma culta na sua resposta';

        var userMsg = '## TEXTO DO ESTUDANTE\n\n"' + text.substring(0, 2000) + '"\n\n' +
            '## CONTEXTO\n' + context + '\nPalavras: ' + wordCount + '\n' +
            'Genero textual esperado: texto reflexivo/dissertativo sobre personalidade, em contexto de atividade academica.\n\n' +
            'Analise o registro linguistico e a formalidade do texto acima conforme os criterios das instrucoes.';

        var result = await callMiniMax(
            [{ role: 'user', content: userMsg }],
            { system: systemPrompt, max_tokens: 1200, temperature: 0.45 }
        );

        var analysisText = extractText(result);
        analysisText = cleanResponse(analysisText);

        res.json({ success: true, analysis: analysisText });
    } catch (error) {
        console.error('Grammar formalidade error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Text analysis LLM specialist
app.post('/api/text-analysis', async function(req, res) {
    try {
        var text = req.body.text || '';
        var metrics = req.body.metrics || {};

        if (text.length < 20) {
            return res.json({ success: true, analysis: 'Texto muito curto para análise especializada.' });
        }

        var systemPrompt = 'Você é um especialista em análise textual e linguística aplicada ao português brasileiro.\n\n' +
            'REGRA ABSOLUTA: Sua resposta DEVE estar escrita em norma culta, com acentos e cedilhas corretos.\n\n' +
            'TAREFA: Escreva UM ÚNICO PARÁGRAFO entre 80 e 100 palavras refletindo sobre o texto do estudante.\n\n' +
            'Você tem acesso aos seguintes indicadores computacionais sobre o texto:\n' +
            '- Diversidade vocabular: TTR, Hapax ratio, K de Yule, riqueza geral\n' +
            '- Legibilidade: Flesch PT-BR, sílabas/palavra, palavras/frase\n' +
            '- Sentimento: score de valência, palavras emocionais positivas e negativas\n' +
            '- Voz pessoal: densidade de 1ª pessoa, autofoco, hedging, especificidade\n' +
            '- Orientação temporal: distribuição passado/presente/futuro\n' +
            '- Complexidade cognitiva: marcadores de subordinação\n' +
            '- Score de autenticidade composto por 7 fatores\n\n' +
            'USE os indicadores fornecidos para fundamentar sua reflexão. Não repita os números — interprete-os.\n\n' +
            'FOCO da reflexão:\n' +
            '- O que o texto revela sobre a maturidade expressiva do estudante?\n' +
            '- Como a voz pessoal se manifesta (ou não) no texto?\n' +
            '- Há coerência entre o sentimento expresso e a proposta reflexiva?\n' +
            '- O que os indicadores sugerem sobre o nível de elaboração e autenticidade?\n\n' +
            'TOM: Acolhedor, didático, sem julgamento. Fale SOBRE o texto, não PARA o estudante.\n' +
            'FORMATO: Um único parágrafo corrido, entre 80 e 100 palavras. Sem listas, sem tópicos, sem títulos.';

        var metricsInfo = '## INDICADORES COMPUTACIONAIS\n\n' +
            'Palavras: ' + (metrics.wordCount || 0) + ' | Frases: ' + (metrics.sentenceCount || 0) + ' | Parágrafos: ' + (metrics.paragraphCount || 0) + '\n' +
            'TTR: ' + (metrics.ttr || 0) + ' | Hapax ratio: ' + (metrics.hapaxRatio || 0) + '% | K de Yule: ' + (metrics.yulesK || 0) + ' | Riqueza: ' + (metrics.richness || 0) + '/100\n' +
            'Flesch PT-BR: ' + (metrics.fleschPT || 0) + ' (' + (metrics.fleschLabel || '') + ') | Sílabas/palavra: ' + (metrics.avgSyllablesPerWord || 0) + ' | Palavras/frase: ' + (metrics.avgWordsPerSentence || 0) + '\n' +
            'Sentimento: ' + (metrics.sentimentScore || 0) + ' (' + (metrics.sentimentLabel || '') + ') | Palavras emocionais: ' + (metrics.sentimentCount || 0) + '\n' +
            'Positivas: ' + (metrics.foundPositive || []).join(', ') + '\n' +
            'Negativas: ' + (metrics.foundNegative || []).join(', ') + '\n' +
            'Equilíbrio emocional: ' + (metrics.emotionalBalance ? 'Sim' : 'Não') + '\n' +
            'Densidade 1ª pessoa: ' + (metrics.firstPersonDensity || 0) + '% | Autofoco: ' + (metrics.selfFocusRatio || 0) + '% | Hedging: ' + (metrics.hedgingDensity || 0) + '% | Especificidade: ' + (metrics.specificityScore || 0) + '%\n' +
            'Orientação temporal: Passado ' + ((metrics.temporalOrientation || {}).past || 0) + '% | Presente ' + ((metrics.temporalOrientation || {}).present || 0) + '% | Futuro ' + ((metrics.temporalOrientation || {}).future || 0) + '%\n' +
            'Complexidade cognitiva: ' + (metrics.cognitiveComplexity || 0) + '% (' + (metrics.cognitiveLabel || '') + ') | Marcadores: ' + (metrics.complexMarkers || []).join(', ') + '\n' +
            'Autenticidade: ' + (metrics.authScore || 0) + '/100 (' + (metrics.authLabel || '') + ')\n';

        var userMsg = '## TEXTO DO ESTUDANTE\n\n"' + text.substring(0, 2000) + '"\n\n' +
            metricsInfo + '\n' +
            '## CONTEXTO\nAtividade de mapeamento de letramento. Estudante escreve 80-160 palavras sobre sua personalidade em contexto acadêmico.\n\n' +
            'Agora, escreva UM ÚNICO PARÁGRAFO (80-100 palavras) refletindo sobre o texto à luz dos indicadores acima.';

        var result = await callMiniMax(
            [{ role: 'user', content: userMsg }],
            { system: systemPrompt, max_tokens: 600, temperature: 0.5 }
        );

        var analysisText = extractText(result);
        analysisText = cleanResponse(analysisText);

        res.json({ success: true, analysis: analysisText });
    } catch (error) {
        console.error('Text analysis LLM error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Submit full session with telemetry
app.post('/api/submit-session', function(req, res) {
    try {
        var studentId = req.body.studentId;
        var text = req.body.text;
        var wordCount = req.body.wordCount;
        var timeSpent = req.body.timeSpent;
        var messageCount = req.body.messageCount;

        var advancedData = {
            keystrokes: req.body.keystrokes || [],
            textSnapshots: req.body.textSnapshots || [],
            mouseMovements: req.body.mouseMovements || [],
            clickEvents: req.body.clickEvents || [],
            scrollEvents: req.body.scrollEvents || [],
            zoneChanges: req.body.zoneChanges || [],
            copyPasteEvents: req.body.copyPasteEvents || [],
            metrics: req.body.metrics || {},
            chatHistory: req.body.chatHistory || [],
            report: req.body.report || {}
        };

        console.log('Session submission from', studentId, '-', wordCount, 'words,', timeSpent, 'ms');

        saveSubmission(studentId, text, wordCount, timeSpent, messageCount, advancedData);

        saveEvent(studentId, 'session_submit', {
            wordCount: wordCount,
            timeSpent: timeSpent,
            messageCount: messageCount,
            keystrokeCount: advancedData.keystrokes.length,
            mouseCount: advancedData.mouseMovements.length,
            hasReport: !!req.body.report
        });

        res.json({ success: true, studentId: studentId });
    } catch (e) {
        console.error('Session submit error:', e);
        res.status(500).json({ success: false, error: e.message });
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
