/**
 * ============================================
 * ENHEDUANNA - Metrics Library
 * Sistema Avançado de Métricas de Letramento
 * Baseado em pesquisa extensa em:
 * - Cognitive Load Theory
 * - Writing Fluency Research  
 * - Eye Tracking Studies
 * - Educational Assessment
 * ============================================
 */

// 1. WRITING FLUENCY METRICS
const WritingFluency = {
    // keystrokes per minute
    calculateWPM(keystrokes, timeMs) {
        if (!keystrokes || !timeMs || timeMs === 0) return 0;
        const minutes = timeMs / 60000;
        return Math.round(keystrokes.length / minutes);
    },
    
    // revision ratio (total keystrokes / final text length)
    calculateRevisionRatio(keystrokes, finalLength) {
        if (!keystrokes || !finalLength || finalLength === 0) return 0;
        return (keystrokes.length / finalLength).toFixed(2);
    },
    
    // backspace rate (what % of keystrokes are corrections)
    calculateBackspaceRate(keystrokes) {
        if (!keystrokes || keystrokes.length === 0) return 0;
        const backspaces = keystrokes.filter(k => 
            k.isBackspace || k.key === 'Backspace'
        ).length;
        return ((backspaces / keystrokes.length) * 100).toFixed(1);
    },
    
    // pause analysis (gaps between keystrokes)
    calculatePausePattern(keystrokes) {
        if (!keystrokes || keystrokes.length < 2) return { pauses: 0, avgPause: 0 };
        
        const sorted = [...keystrokes].sort((a, b) => a.time - b.time);
        const gaps = [];
        
        for (let i = 1; i < sorted.length; i++) {
            const gap = sorted[i].time - sorted[i-1].time;
            if (gap > 500) gaps.push(gap); // pauses > 500ms
        }
        
        return {
            pauses: gaps.length,
            avgPause: gaps.length ? Math.round(gaps.reduce((a,b) => a+b, 0) / gaps.length) : 0,
            longPauses: gaps.filter(g => g > 2000).length
        };
    },
    
    // rhythm consistency (variation in typing speed)
    calculateRhythmConsistency(keystrokes) {
        if (!keystrokes || keystrokes.length < 10) return 0;
        
        const sorted = [...keystrokes].sort((a, b) => a.time - b.time);
        const intervals = [];
        
        for (let i = 1; i < Math.min(50, sorted.length); i++) {
            intervals.push(sorted[i].time - sorted[i-1].time);
        }
        
        const avg = intervals.reduce((a,b) => a+b, 0) / intervals.length;
        const variance = intervals.reduce((a,b) => a + Math.pow(b - avg, 2), 0) / intervals.length;
        const stdDev = Math.sqrt(variance);
        
        // Lower stdDev = more consistent rhythm
        const consistency = Math.max(0, 100 - (stdDev / avg * 50));
        return Math.round(consistency);
    }
};

// 2. READING/INTERACTION METRICS (Mouse/Touch)
const ReadingBehavior = {
    // mouse movement efficiency
    calculateMovementEfficiency(movements, area) {
        if (!movements || movements.length === 0) return 0;
        
        const totalDistance = movements.reduce((sum, m) => 
            sum + (m.distance || 0), 0
        );
        
        // Normalize by area size (assuming ~800x600 = 480000 pixels)
        const normalizedArea = area || 480000;
        return Math.round((totalDistance / normalizedArea) * 100);
    },
    
    // exploration vs focus score
    calculateExplorationScore(movements, zones) {
        if (!movements || movements.length === 0) return 50;
        
        const zoneVariety = Object.keys(zones || {}).filter(k => zones[k] > 0).length;
        const totalMovements = movements.length;
        
        // High variety + moderate movement = good exploration
        return Math.min(100, Math.round((zoneVariety * 15) + (totalMovements / 20)));
    },
    
    // time distribution across zones
    calculateZoneDistribution(zones) {
        const total = Object.values(zones || {}).reduce((a, b) => a + b, 0);
        if (total === 0) return {};
        
        const distribution = {};
        for (const [zone, time] of Object.entries(zones)) {
            distribution[zone] = ((time / total) * 100).toFixed(1);
        }
        return distribution;
    },
    
    // mouse velocity (speed of movements)
    calculateMouseVelocity(movements) {
        if (!movements || movements.length === 0) return 0;
        
        const velocities = movements
            .filter(m => m.velocity)
            .map(m => m.velocity);
        
        if (velocities.length === 0) return 0;
        
        return Math.round(velocities.reduce((a, b) => a + b, 0) / velocities.length);
    }
};

// 3. TEXT QUALITY METRICS
const TextQuality = {
    // vocabulary richness (unique words / total words)
    calculateVocabularyRichness(text) {
        if (!text) return 0;
        
        const words = text.toLowerCase().split(/\s+/).filter(w => w);
        const unique = new Set(words);
        
        return ((unique.size / words.length) * 100).toFixed(1);
    },
    
    // average word length (indicator of complexity)
    calculateAvgWordLength(text) {
        if (!text) return 0;
        
        const words = text.split(/\s+/).filter(w => w);
        if (words.length === 0) return 0;
        
        const totalLength = words.reduce((sum, w) => sum + w.length, 0);
        return (totalLength / words.length).toFixed(1);
    },
    
    // sentence complexity (avg words per sentence)
    calculateSentenceComplexity(text) {
        if (!text) return 0;
        
        const sentences = text.split(/[.!?]+/).filter(s => s.trim());
        if (sentences.length === 0) return 0;
        
        const words = text.split(/\s+/).filter(w => w);
        return (words.length / sentences.length).toFixed(1);
    },
    
    // punctuation usage (indicator of structure)
    calculatePunctuationScore(text) {
        if (!text) return 0;
        
        const punctuation = {
            period: (text.match(/\./g) || []).length,
            comma: (text.match(/,/g) || []).length,
            exclamation: (text.match(/!/g) || []).length,
            question: (text.match(/\?/g) || []).length,
            semicolon: (text.match(/;/g) || []).length
        };
        
        const total = Object.values(punctuation).reduce((a, b) => a + b, 0);
        const words = text.split(/\s+/).length;
        
        // Good punctuation ratio: 1 punctuation per 10-20 words
        const ratio = words > 0 ? total / words : 0;
        
        if (ratio < 0.05) return 30; // Too little
        if (ratio > 0.2) return 60; // Too much
        return 100; // Good
    },
    
    // emotional expression indicators
    calculateEmotionalExpression(text) {
        if (!text) return { score: 0, indicators: [] };
        
        const positive = /alegria|feliz|amor|esperança|alegre|contente|felicidade|otimismo|sonho|desejo|querer|gostar|adorar|apaixonar|maravilhoso|incrível|ótimo|bom|bel|encantador/gi;
        const negative = /tristeza|triste|fel|medo|receio|angústia|ansiedade|desespero|raiva|odio|ressentimento|frustração|decepção|mal|malvado|cruel/gi;
        
        const posMatches = (text.match(positive) || []).length;
        const negMatches = (text.match(negative) || []).length;
        
        return {
            score: Math.min(100, posMatches * 20 - negMatches * 10 + 50),
            positive: posMatches,
            negative: negMatches,
            indicators: [...text.match(positive) || [], ...text.match(negative) || []].slice(0, 10)
        };
    }
};

// 4. COGNITIVE LOAD METRICS
const CognitiveLoad = {
    // estimate cognitive load based on pauses and revisions
    estimateCognitiveLoad(keystrokes, text) {
        const pauses = WritingFluency.calculatePausePattern(keystrokes);
        const revision = WritingFluency.calculateBackspaceRate(keystrokes);
        const complexity = TextQuality.calculateSentenceComplexity(text);
        
        // High pauses + high revisions + high complexity = high load
        const pauseScore = pauses.pauses > 5 ? 40 : 0;
        const revisionScore = parseFloat(revision) > 15 ? 30 : 0;
        const complexityScore = parseFloat(complexity) > 20 ? 30 : 0;
        
        return {
            level: pauseScore + revisionScore + complexityScore > 70 ? 'Alto' : 
                   pauseScore + revisionScore + complexityScore > 40 ? 'Médio' : 'Baixo',
            score: pauseScore + revisionScore + complexityScore,
            factors: { pauses: pauses.pauses, revision, complexity }
        };
    }
};

// 5. ENGAGEMENT METRICS
const Engagement = {
    // time-based engagement
    calculateTimeEngagement(timeSpent, wordCount) {
        const minutes = timeSpent / 60000;
        const wordsPerMinute = minutes > 0 ? wordCount / minutes : 0;
        
        if (minutes < 0.5) return { level: 'Baixo', score: 30 };
        if (wordsPerMinute < 5) return { level: 'Médio', score: 60 };
        return { level: 'Alto', score: 100 };
    },
    
    // interaction engagement (mouse movements, clicks)
    calculateInteractionEngagement(movements, clicks) {
        if (!movements) return { level: 'Baixo', score: 30 };
        
        const movementIntensity = movements.length / 100; // normalize
        
        if (movementIntensity < 1) return { level: 'Baixo', score: 30 };
        if (movementIntensity < 5) return { level: 'Médio', score: 60 };
        return { level: 'Alto', score: 100 };
    },
    
    // chat engagement
    calculateChatEngagement(messages) {
        const count = messages?.length || 0;
        
        if (count === 0) return { level: 'Nenhum', score: 0 };
        if (count <= 2) return { level: 'Baixo', score: 40 };
        if (count <= 5) return { level: 'Médio', score: 70 };
        return { level: 'Alto', score: 100 };
    }
};

// 6. OVERALL PROFICIENCY CALCULATION
const Proficiency = {
    calculate(submission) {
        const scores = [];
        
        // Writing fluency
        const wpm = WritingFluency.calculateWPM(
            submission.keystrokes, 
            submission.timeSpent
        );
        scores.push(Math.min(100, wpm * 2)); // 50 WPM = 100 points
        
        // Text quality
        const vocab = TextQuality.calculateVocabularyRichness(submission.text);
        scores.push(parseFloat(vocab));
        
        // Task adherence
        const wordCount = submission.text?.split(/\s+/).length || 0;
        const adherence = wordCount >= 50 && wordCount <= 200 ? 100 : 
                         wordCount >= 30 && wordCount <= 250 ? 70 : 40;
        scores.push(adherence);
        
        // Calculate average
        const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
        
        return {
            score: Math.round(avg),
            level: avg >= 80 ? 'Avançado' : 
                   avg >= 60 ? 'Intermediário' : 
                   avg >= 40 ? 'Básico' : 'Iniciante',
            breakdown: {
                fluency: Math.round(scores[0]),
                quality: Math.round(scores[1]),
                adherence: Math.round(scores[2])
            }
        };
    }
};

module.exports = {
    WritingFluency,
    ReadingBehavior,
    TextQuality,
    CognitiveLoad,
    Engagement,
    Proficiency
};
