// Comprehensive Portuguese Linguistic Analyzer
// Uses LanguageTool API for deep text analysis

const LANGUAGE_TOOL_API = 'https://languagetool.org/api/v2/check';

// Common Portuguese corrections database
const PORTUGUESE_CORRECTIONS = {
    // Common misspellings
    'vc': 'você',
    'vcs': 'vocês',
    'tb': 'também',
    'tbm': 'também',
    'pq': 'porque',
    'p/': 'para',
    'c/': 'com',
    'q': 'que',
    'n': 'não',
    'msm': 'mesmo',
    'flw': 'falou',
    'blz': 'beleza',
    'oq': 'o que',
    'ne': 'não é',
    'td': 'tudo',
    'tds': 'todos',
    'hj': 'hoje',
    'lng': 'laranja',
    'ngm': 'ninguém',
    'cmg': 'comigo',
    'ctg': 'contigo',
    'houve': 'houve',
    'haver': 'a ver',
    'aonde': 'onde',
    'ex': 'ex',
    
    // Accent errors
    'voce': 'você',
    'vocÊ': 'você',
    'agora': 'agora',
    'portugues': 'português',
    'portugues': 'português',
    'ingles': 'inglês',
    'muit': 'muito',
    'muinto': 'muito',
    'bastant': 'bastante',
    
    // Common grammar errors
    'emos': 'emos',
    'houver': 'haver',
    'fazer': 'fazer',
    'pro': 'para o',
    'pras': 'para as',
    'tá': 'está',
    'tah': 'está',
    'pá': 'para',
    
    // Homophones
    'se': 'se',
    'cé': 'cé',
    'sé': 'sé',
    'por': 'por',
    'pôr': 'pôr',
    'ao': 'ao',
    'aо': 'ao',
    'mal': 'mal',
    'mau': 'mau',
    'senão': 'se não',
    'senã': 'se não',
    
    // Conjugation errors
    'fui': 'fui',
    'foi': 'foi',
    'sou': 'sou',
    'é': 'é',
    'são': 'são',
    'estou': 'estou',
    'está': 'está',
    'estão': 'estão',
    
    // Words that should have accents
    'faca': 'faça',
    'saber': 'saber',
    'poder': 'poder',
    'querer': 'querer',
    'ter': 'ter',
    'vir': 'vir',
    'dar': 'dar',
    'dizer': 'dizer',
    'ver': 'ver',
    'conhecer': 'conhecer',
    'sentir': 'sentir',
    'chegar': 'chegar',
    'começar': 'começar',
    'pensar': 'pensar',
    'olhar': 'olhar',
    'ouvir': 'ouvir',
    'dormir': 'dormir',
    'sair': 'sair',
    'voltar': 'voltar',
    'ficar': 'ficar',
    'andar': 'andar',
    'correr': 'correr',
    'pular': 'pular',
    'olhar': 'olhar',
    'esperar': 'esperar',
    'achar': 'achar',
    'contar': 'contar',
    'parar': 'parar',
    'começar': 'começar',
    'tentar': 'tentar',
    'conseguir': 'conseguir',
    'gostar': 'gostar',
    'precisar': 'precisar',
    'querer': 'querer',
    'saber': 'saber',
    'entender': 'entender',
    'lembrar': 'lembrar',
    'pensar': 'pensar',
    'querer': 'querer',
    'esperar': 'esperar',
    'ajudar': 'ajudar',
    'mandar': 'mandar',
    'perguntar': 'perguntar',
    'responder': 'responder',
    'falar': 'falar',
    'dizer': 'dizer',
    'contar': 'contar',
    'chamar': 'chamar',
    'pedir': 'pedir',
    'oferecer': 'oferecer',
    'sugerir': 'sugerir',
    'impedir': 'impedir',
    'medir': 'medir',
    'vestir': 'vestir',
    'seguir': 'seguir',
    'conseguir': 'conseguir',
    'divertir': 'divertir',
    'sentir': 'sentir',
    'preferir': 'preferir',
    'adquirir': 'adquirir',
    'atingir': 'atingir',
    'fugir': 'fugir',
    'sumir': 'sumir',
    'garantir': 'garantir',
    'intervir': 'intervir',
    'vir': 'vir',
    'trazer': 'trazer',
    'colocar': 'colocar',
    'jogar': 'jogar',
    'tocar': 'tocar',
    'sacar': 'sacar',
    'ligar': 'ligar',
    'mexer': 'mexer',
    'largar': 'largar',
    'passar': 'passar',
    'levar': 'levar',
    'botar': 'botar',
    'chorar': 'chorar',
    'rir': 'rir',
    'sorrir': 'sorrir',
    'balançar': 'balançar',
    'cortar': 'cortar',
    'pintar': 'pintar',
    'desenhar': 'desenhar',
    'estudar': 'estudar',
    'trabalhar': 'trabalhar',
    'morar': 'morar',
    'viajar': 'viajar',
    'comprar': 'comprar',
    'vender': 'vender',
    'gastar': 'gastar',
    'economizar': 'economizar',
    'poupar': 'poupar',
    'pagar': 'pagar',
    'custar': 'custar',
    'valer': 'valer',
    'pesar': 'pesar',
    'importar': 'importar',
    'exportar': 'exportar',
    'produzir': 'produzir',
    'consumir': 'consumir',
    'usar': 'usar',
    'utilizar': 'utilizar',
    'aproveitar': 'aproveitar',
    'perder': 'perder',
    'achar': 'achar',
    'encontrar': 'encontrar',
    'procurar': 'procurar',
    'buscar': 'buscar',
    'localizar': 'localizar',
    'descobrir': 'descobrir',
    'inventar': 'inventar',
    'criar': 'criar',
    'produzir': 'produzir',
    'formar': 'formar',
    'educar': 'educar',
    'ensinar': 'ensinar',
    'aprender': 'aprender',
    'estudar': 'estudar',
    'ler': 'ler',
    'escrever': 'escrever',
    'ouvir': 'ouvir',
    'ver': 'ver',
    'assistir': 'assistir',
    'assistir': 'assistir',
    'deitar': 'deitar',
    'levantar': 'levantar',
    'sentar': 'sentar',
    'em pé': 'em pé',
    'em pé': 'em pé'
};

// Semantic field categories
const SEMANTIC_FIELDS = {
    emotions: ['alegria', 'tristeza', 'raiva', 'medo', 'amor', 'odio', 'esperança', 'desespero', 'ansiedade', 'alegre', 'triste', 'feliz', 'chorar', 'rir', 'sorrir', 'feliz', 'contente', 'satisfeito', 'frustrado', 'nervoso', 'calmo', 'sereno', 'tranq', 'stress', 'nervos', 'ánsia', 'pavor', 'terror', 'horror'],
    social: ['amigo', 'família', 'pai', 'mãe', 'irmão', 'irmã', 'filho', 'filha', 'avô', 'avó', 'tio', 'tia', 'primo', 'prima', 'colega', 'companheiro', 'parceiro', 'namorado', 'noivo', 'esposo', 'marido', 'mulher', 'namorada', 'noiva', 'esposa', 'vizinho', 'colega', 'chefe', 'funcionário', 'professor', 'aluno', 'mestre', 'mentor'],
    work: ['trabalho', 'emprego', 'carreira', 'profissão', 'ofício', 'negócio', 'empresa', 'escritório', 'reunião', 'projeto', 'tarefa', 'deadline', 'promoção', 'salário', 'contrato', 'entrevista', 'currículo', 'vaga', 'emprego', 'desemprego', 'estágio', ' traineeship'],
    education: ['escola', 'faculdade', 'universidade', 'curso', 'aula', 'prova', 'exame', 'trabalho', 'tese', 'dissertação', 'artigo', 'pesquisa', 'estudo', 'aprendizado', 'conhecimento', 'saber', 'ciência', 'teoria', 'prática'],
    leisure: ['jogo', 'esporte', 'música', 'filme', 'série', 'livro', 'leitura', 'viagem', 'praia', 'piscina', 'festa', 'bar', 'restaurante', 'cinema', 'show', 'concerto', 'teatro', 'exposição', 'museu'],
    personality: ['timido', 'extrovertido', 'introvertido', 'criativo', 'analítico', 'prático', 'idealista', 'realista', 'otimista', 'pessimista', 'leader', 'lider', 'seguidor', 'independente', 'dependente', 'confiante', 'inseguro', 'forte', 'fraco', 'corajoso', 'medroso', 'inteligente', 'sábio', 'burro', 'estúpido', 'esperto', '笨', 'lento', 'rápido', 'cego', 'surdo', 'mudo'],
    time: ['amanhã', 'hoje', 'ontem', 'passado', 'futuro', 'presente', 'dia', 'noite', 'madrugada', 'tarde', 'manhã', 'semana', 'mês', 'ano', 'década', 'século', 'milênio', 'idade', 'juventude', 'infância', 'adolescência', 'adulto', 'velhice', 'nascido', 'morre', 'viver', 'sobreviv', 'morte', 'falecer', 'falece'],
    space: ['casa', 'apartamento', 'rua', 'avenida', 'praça', 'bairro', 'cidade', 'campo', 'pátio', 'jardim', 'praia', 'montanha', 'rio', 'mar', 'lago', 'bosque', 'floresta', 'deserto', 'ilha', 'continente', 'país', 'estado', 'região', 'zona', 'local', 'lugar', 'espaço', 'ambiente'],
    quantity: ['um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove', 'dez', 'cem', 'mil', 'milhão', 'bilhão', 'trilhão', 'pouco', 'muito', 'bastante', 'demais', 'excesso', 'falta', 'quase', 'aproximadamente', 'exatamente', 'precisamente', 'cerca', 'mais', 'menos', 'tanto', 'quanto']
};

async function analyzeLinguistic(text, useAPI = true) {
    const result = {
        spelling: [],
        grammar: [],
        suggestions: [],
        statistics: {},
        semantics: {},
        morphology: {},
        style: {},
        corrections: []
    };
    
    if (!text || text.length < 3) return result;
    
    // 1. Basic text statistics
    result.statistics = getTextStatistics(text);
    
    // 2. Local corrections (Portuguese dictionary)
    const localCorrections = analyzeLocalCorrections(text);
    result.corrections = localCorrections;
    
    // 3. Grammar patterns (rule-based)
    const grammarErrors = analyzeGrammarPatterns(text);
    result.grammar = grammarErrors;
    
    // 4. Semantic analysis
    result.semantics = analyzeSemantics(text);
    
    // 5. Morphological analysis
    result.morphology = analyzeMorphology(text);
    
    // 6. Style analysis
    result.style = analyzeStyle(text);
    
    // 7. Try LanguageTool API if enabled
    if (useAPI) {
        try {
            const apiErrors = await analyzeWithLanguageTool(text);
            result.spelling = apiErrors.spelling;
            result.grammar = [...result.grammar, ...apiErrors.grammar];
        } catch(e) {
            console.log('LanguageTool API error:', e.message);
        }
    }
    
    // Calculate overall quality score
    result.qualityScore = calculateQualityScore(result, text);
    
    return result;
}

function getTextStatistics(text) {
    const words = text.split(/\s+/).filter(w => w.length > 0);
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 0);
    const characters = text.length;
    const charactersNoSpaces = text.replace(/\s/g, '').length;
    
    // Syllable estimation (Portuguese)
    const syllables = estimateSyllables(text);
    
    return {
        words: words.length,
        sentences: sentences.length,
        paragraphs: paragraphs.length,
        characters: characters,
        charactersNoSpaces: charactersNoSpaces,
        averageWordLength: charactersNoSpaces / (words.length || 1),
        averageSentenceLength: words.length / (sentences.length || 1),
        syllables: syllables,
        readingTime: Math.ceil(syllables / 200),
        speakingTime: Math.ceil(syllables / 150)
    };
}

function estimateSyllables(text) {
    const vowels = 'aeiouáéíóúàèìòùâêîôûãõ';
    let count = 0;
    for (const char of text.toLowerCase()) {
        if (vowels.includes(char)) count++;
    }
    return count;
}

function analyzeLocalCorrections(text) {
    const corrections = [];
    const words = text.split(/\s+/);
    const lowerText = text.toLowerCase();
    
    for (const [wrong, correct] of Object.entries(PORTUGUESE_CORRECTIONS)) {
        const regex = new RegExp('\\b' + wrong + '\\b', 'gi');
        let match;
        while ((match = regex.exec(text)) !== null) {
            corrections.push({
                type: 'spelling',
                error: wrong,
                correction: correct,
                position: match.index,
                context: text.substring(Math.max(0, match.index - 20), match.index + wrong.length + 20),
                rule: 'common_portuguese_mistake'
            });
        }
    }
    
    return corrections;
}

function analyzeGrammarPatterns(text) {
    const errors = [];
    
    // Concordância verbal
    const subjectVerbPatterns = [
        { pattern: /\beu\s+(sou|era|foi|estou|estava)\b/gi, error: 'eu + verbo na 3ª pessoa', suggestion: 'eu sou/estou/era/estava' },
        { pattern: /\beles\s+(somos|estamos)\b/gi, error: 'eles + verbo na 1ª pessoa', suggestion: 'eles são/estão' },
        { pattern: /\belas\s+(somos|estamos)\b/gi, error: 'elas + verbo na 1ª pessoa', suggestion: 'elas são/estão' }
    ];
    
    // Concordância nominal
    const nounAdjPatterns = [
        { pattern: /\bmuito\b\s+\b(pessoas|coisas|casas|meninos|meninas)\b/gi, error: 'muito + plural', suggestion: 'muitas pessoas/coisas' },
        { pattern: /\bpouco\b\s+\b(pessoas|coisas|casas|meninos|meninas)\b/gi, error: 'pouco + plural', suggestion: 'poucas pessoas/coisas' }
    ];
    
    // Regência
    const regenciaPatterns = [
        { pattern: /\b(de|em)\s+que\b/gi, error: 'de/em + que (redundante)', suggestion: 'que' },
        { pattern: /\bpro\b\s+(que|quem)\b/gi, error: 'pro + que/quem', suggestion: 'para o/para quem' }
    ];
    
    // Uso do infinitivo
    const infinitivoPatterns = [
        { pattern: /\bde\s+(fazer|ser|ter|estar|ir|dar|dizer|ver|poder|querer)\b/gi, error: 'de + infinitivo', suggestion: 'de + inf' },
        { pattern: /\bpara\s+(fazer|ser|ter|estar|ir|dar|dizer|poder|querer)\b/gi, error: 'para + infinitivo', suggestion: 'para + inf' }
    ];
    
    // Run all patterns
    [...subjectVerbPatterns, ...nounAdjPatterns, ...regenciaPatterns, ...infinitivoPatterns].forEach(p => {
        let match;
        const regex = new RegExp(p.pattern.source, 'gi');
        while ((match = regex.exec(text)) !== null) {
            errors.push({
                type: 'grammar',
                error: match[0],
                suggestion: p.suggestion,
                rule: p.error,
                position: match.index
            });
        }
    });
    
    return errors;
}

function analyzeSemantics(text) {
    const lowerText = text.toLowerCase();
    const words = lowerText.split(/\s+/);
    
    const fieldCounts = {};
    
    for (const [field, keywords] of Object.entries(SEMANTIC_FIELDS)) {
        let count = 0;
        for (const keyword of keywords) {
            const regex = new RegExp('\\b' + keyword + '\\b', 'gi');
            const matches = lowerText.match(regex);
            if (matches) count += matches.length;
        }
        fieldCounts[field] = count;
    }
    
    // Find dominant field
    let dominantField = 'general';
    let maxCount = 0;
    for (const [field, count] of Object.entries(fieldCounts)) {
        if (count > maxCount) {
            maxCount = count;
            dominantField = field;
        }
    }
    
    return {
        fields: fieldCounts,
        dominantField: dominantField,
        vocabularyRichness: new Set(words).size / (words.length || 1),
        abstractWords: fieldCounts.emotions + fieldCounts.personality,
        concreteWords: fieldCounts.objects || 0
    };
}

function analyzeMorphology(text) {
    const words = text.split(/\s+/);
    
    const pronouns = ['eu', 'tu', 'ele', 'ela', 'nós', 'vós', 'eles', 'elas', 'me', 'te', 'se', 'nos', 'vos', 'lhe', 'lhes', 'mim', 'ti', 'si', 'comigo', 'contigo', 'consigo', 'conosco', 'convosco', 'meu', 'teu', 'seu', 'nosso', 'vosso', 'esse', 'esse', 'este', 'esse', 'aquele', 'qual', 'que', 'quem'];
    const articles = ['o', 'a', 'os', 'as', 'um', 'uma', 'uns', 'umas'];
    const prepositions = ['a', 'de', 'para', 'com', 'sem', 'em', 'por', 'sobre', 'sob', 'ante', 'após', 'até', 'contra', 'desde', 'entre', 'perante', 'sob'];
    const conjunctions = ['e', 'mas', 'ou', 'porque', 'assim', 'então', 'quando', 'se', 'logo', 'contudo', 'todavia', 'porém', 'portanto', 'logo'];
    const interjections = ['ah', 'oh', 'ei', 'uy', 'opa', 'eita', 'nossa', 'caramba', 'puta', 'merda'];
    
    const countType = (words) => words.filter(w => w.length > 0).length;
    
    return {
        pronouns: countType(words.filter(w => pronouns.includes(w.toLowerCase()))),
        articles: countType(words.filter(w => articles.includes(w.toLowerCase()))),
        prepositions: countType(words.filter(w => prepositions.includes(w.toLowerCase()))),
        conjunctions: countType(words.filter(w => conjunctions.includes(w.toLowerCase()))),
        interjections: countType(words.filter(w => interjections.includes(w.toLowerCase())))
    };
}

function analyzeStyle(text) {
    const issues = [];
    
    // Very short sentences
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const shortSentences = sentences.filter(s => s.split(/\s+/).length < 4);
    
    if (shortSentences.length > sentences.length * 0.3) {
        issues.push('Muitas frases muito curtas');
    }
    
    // Very long sentences
    const longSentences = sentences.filter(s => s.split(/\s+/).length > 25);
    if (longSentences.length > 0) {
        issues.push(`${longSentences.length} frases muito longas`);
    }
    
    // Repetition
    const words = text.toLowerCase().split(/\s+/);
    const wordCounts = {};
    words.forEach(w => { wordCounts[w] = (wordCounts[w] || 0) + 1; });
    const repeated = Object.entries(wordCounts).filter(([w, c]) => c > 5 && w.length > 3);
    if (repeated.length > 0) {
        issues.push('Palavras repetidas em excesso');
    }
    
    return {
        issues: issues,
        shortSentenceRatio: shortSentences.length / (sentences.length || 1),
        longSentenceCount: longSentences.length,
        repeatedWords: repeated.slice(0, 5)
    };
}

function calculateQualityScore(result, text) {
    let score = 100;
    
    // Deduct for spelling errors
    score -= result.corrections.length * 3;
    score -= result.spelling.length * 5;
    
    // Deduct for grammar errors
    score -= result.grammar.length * 5;
    
    // Deduct for style issues
    score -= result.style.issues.length * 2;
    
    // Bonus for vocabulary richness
    if (result.semantics.vocabularyRichness > 0.7) score += 5;
    
    return Math.max(0, Math.min(100, score));
}

async function analyzeWithLanguageTool(text) {
    const formData = new URLSearchParams();
    formData.append('text', text);
    formData.append('language', 'pt-BR');
    formData.append('level', 'picky');
    
    try {
        const response = await fetch(LANGUAGE_TOOL_API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: formData
        });
        
        if (!response.ok) throw new Error('API error');
        
        const data = await response.json();
        
        const spelling = [];
        const grammar = [];
        
        for (const match of data.matches || []) {
            const error = {
                type: match.rule?.category?.name || 'unknown',
                message: match.message,
                context: match.context?.text,
                offset: match.context?.offset,
                length: match.context?.length,
                replacements: match.replacements?.slice(0, 3)
            };
            
            if (match.rule?.category?.name?.toLowerCase().includes('spelling')) {
                spelling.push(error);
            } else {
                grammar.push(error);
            }
        }
        
        return { spelling, grammar };
    } catch(e) {
        return { spelling: [], grammar: [] };
    }
}

module.exports = { analyzeLinguistic };
