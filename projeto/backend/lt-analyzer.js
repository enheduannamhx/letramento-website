const https = require('https');

function analyzeLinguisticAsync(text, chatText) {
    return new Promise((resolve) => {
        if (!text || text.length < 5) {
            resolve({ spelling: [], grammar: [], qualityScore: 100 });
            return;
        }
        
        const postData = new URLSearchParams();
        postData.append('text', text);
        postData.append('language', 'pt-BR');
        
        const options = {
            hostname: 'languagetool.org',
            port: 443,
            path: '/api/v2/check',
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': postData.toString().length },
            timeout: 5000
        };
        
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    const matches = json.matches || [];
                    const spelling = matches.filter(m => (m.rule?.category?.name || '').toLowerCase().includes('spelling'));
                    const grammar = matches.filter(m => !(m.rule?.category?.name || '').toLowerCase().includes('spelling'));
                    resolve({ spelling, grammar, qualityScore: Math.max(0, 100 - (spelling.length + grammar.length) * 5) });
                } catch(e) { resolve({ spelling: [], grammar: [], qualityScore: 100 }); }
            });
        });
        req.on('error', () => resolve({ spelling: [], grammar: [], qualityScore: 100 }));
        req.on('timeout', () => { req.destroy(); resolve({ spelling: [], grammar: [], qualityScore: 100 }); });
        req.write(postData.toString());
        req.end();
    });
}

module.exports = { analyzeLinguisticAsync };
