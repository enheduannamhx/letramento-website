
// Advanced Metrics for Letramento Digital
const Metrics = {
    writingFluency: {
        calculateWPM: (text, timeMs) => {
            const words = text.trim().split(/\s+/).length;
            const minutes = timeMs / 60000;
            return Math.round(words / minutes) || 0;
        },
        
        calculateRevisionRatio: (keystrokes, backspaces) => {
            if (!keystrokes || keystrokes === 0) return 0;
            return (backspaces / keystrokes * 100).toFixed(1);
        },
        
        calculatePausePattern: (events) => {
            const pauses = events.filter(e => e.type === 'pause' && e.duration > 2000);
            return {
                count: pauses.length,
                avgDuration: pauses.reduce((a,b) => a + b.duration, 0) / pauses.length || 0
            };
        },
        
        analyzeBurstPause: (keystrokes, timeStamps) => {
            let bursts = 0, pauses = 0, lastTime = 0;
            for (let ts of timeStamps) {
                if (ts - lastTime > 2000) pauses++;
                else bursts++;
                lastTime = ts;
            }
            return { bursts, pauses, ratio: (bursts / (pauses + 1)).toFixed(2) };
        }
    },
    
    readingFluency: {
        calculateMouseVelocity: (movements) => {
            if (!movements || movements.length < 2) return 0;
            let totalDist = 0, totalTime = 0;
            for (let i = 1; i < movements.length; i++) {
                const dx = movements[i].x - movements[i-1].x;
                const dy = movements[i].y - movements[i-1].y;
                totalDist += Math.sqrt(dx*dx + dy*dy);
                totalTime += movements[i].time - movements[i-1].time;
            }
            return totalTime > 0 ? Math.round(totalDist / totalTime * 1000) : 0;
        },
        
        calculateZoneFocus: (events) => {
            const zones = { editor: 0, agent: 0, instructions: 0 };
            let lastZone = null, lastTime = null;
            for (let e of events) {
                if (e.zone && e.time) {
                    if (lastZone && lastTime) zones[lastZone] += e.time - lastTime;
                    lastZone = e.zone;
                    lastTime = e.time;
                }
            }
            const total = zones.editor + zones.agent + zones.instructions;
            return {
                editor: ((zones.editor / total) * 100).toFixed(1),
                agent: ((zones.agent / total) * 100).toFixed(1)
            };
        }
    },
    
    textQuality: {
        calculateLexicalDiversity: (text) => {
            const words = text.toLowerCase().match(/\b[a-z]+\b/g) || [];
            const unique = new Set(words);
            return ((unique.size / words.length) * 100).toFixed(1);
        },
        
        calculateAvgWordLength: (text) => {
            const words = text.split(/\s+/);
            const total = words.reduce((a, w) => a + w.length, 0);
            return (total / words.length).toFixed(1);
        },
        
        calculateReadability: (text) => {
            const sentences = text.split(/[.!?]+/).filter(s => s.trim()).length;
            const words = text.split(/\s+/).length;
            const syllables = text.split(/[aeiouáéíóúàèìòùâêîôûãõ]/i).length;
            if (sentences === 0 || words === 0) return 0;
            const score = 206.835 - 1.015 * (words / sentences) - 84.6 * (syllables / words);
            return Math.max(0, Math.min(100, Math.round(score)));
        }
    }
};

module.exports = Metrics;

// ADDITIONAL RESEARCH METRICS

const ResearchMetrics = {
    // Engagement Metrics
    engagement: {
        interactionDensity: (events, timeMs) => {
            return ((events.length / timeMs) * 60000).toFixed(2); // events per minute
        },
        
        responseLatency: (messages) => {
            if (messages.length < 2) return 0;
            let total = 0;
            for (let i = 1; i < messages.length; i++) {
                total += messages[i].timestamp - messages[i-1].timestamp;
            }
            return (total / (messages.length - 1)).toFixed(0);
        },
        
        explorationScore: (zoneTimes) => {
            const zones = Object.keys(zoneTimes);
            const total = Object.values(zoneTimes).reduce((a, b) => a + b, 0);
            // Higher = more exploration
            return ((zones.length / total) * 1000).toFixed(2);
        }
    },
    
    // Cognitive Load
    cognitive: {
        processingSpeed: (keystrokes, timeMs) => {
            return ((keystrokes.length / timeMs) * 1000).toFixed(2); // keystrokes per second
        },
        
        hesitationIndex: (pauses) => {
            const longPauses = pauses.filter(p => p > 3000);
            return longPauses.length;
        },
        
        cognitiveFatigue: (timeMs, keystrokes) => {
            // Higher = more fatigue
            return (timeMs / keystrokes.length).toFixed(2);
        }
    }
};

module.exports = { ...Metrics, ...ResearchMetrics };
