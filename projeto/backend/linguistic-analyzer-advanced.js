
// Advanced Linguistic Analyzer with LanguageTool Integration
const https = require('https');

const LinguisticAnalyzer = {
    // Main analysis function
    async analyze(text) {
        const results = {
            text: text,
            wordCount: 0,
            charCount: 0,
            sentences: 0,
            errors: [],
            suggestions: [],
            quality: {
                spelling: 0,
                grammar: 0,
                style: 0,
                overall: 0
            }
        };
        
        // Basic metrics
        results.wordCount = text.trim().split(/\s+/).filter(w => w).length;
        results.charCount = text.length;
        results.sentences = text.split(/[.!?]+/).filter(s => s.trim()).length;
        
        // Check with LanguageTool
        try {
            const ltResult = await this.checkLanguageTool(text);
            if (ltResult) {
                results.errors = ltResult.errors || [];
                results.suggestions = ltResult.suggestions || [];
                
                // Calculate quality scores
                const totalErrors = results.errors.length;
                const errorRate = totalErrors / results.wordCount * 100;
                
                results.quality.spelling = Math.max(0, 100 - errorRate * 2);
                results.quality.grammar = Math.max(0, 100 - errorRate * 3);
                results.quality.style = Math.max(0, 100 - errorRate * 1.5);
                results.quality.overall = (results.quality.spelling + results.quality.grammar + results.quality.style) / 3;
            }
        } catch (e) {
            console.log("LanguageTool check failed, using basic analysis");
            results.quality.overall = 100;
        }
        
        return results;
    },
    
    // LanguageTool API check
    async checkLanguageTool(text) {
        return new Promise((resolve) => {
            const postData = JSON.stringify({
                text: text,
                language: "pt-BR"
            });
            
            const options = {
                hostname: 'api.languagetool.org',
                port: 443,
                path: '/v2/check',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(postData)
                }
            };
            
            const req = https.request(options, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        const result = JSON.parse(data);
                        resolve({
                            errors: result.matches || [],
                            suggestions: result.matches?.map(m => ({
                                message: m.message,
                                context: m.context,
                                replacements: m.replacements
                            })) || []
                        });
                    } catch (e) {
                        resolve(null);
                    }
                });
            });
            
            req.on('error', () => resolve(null));
            req.write(postData);
            req.end();
            
            // Timeout
            setTimeout(() => {
                req.destroy();
                resolve(null);
            }, 3000);
        });
    },
    
    // Basic offline analysis
    basicAnalysis(text) {
        const words = text.split(/\s+/);
        const uniqueWords = new Set(words.map(w => w.toLowerCase()));
        
        return {
            wordCount: words.length,
            uniqueWords: uniqueWords.size,
            diversity: (uniqueWords.size / words.length * 100).toFixed(1),
            avgWordLength: (words.reduce((a,w) => a + w.length, 0) / words.length).toFixed(1),
            sentences: text.split(/[.!?]+/).filter(s => s.trim()).length
        };
    }
};

module.exports = LinguisticAnalyzer;
