// Advanced Analysis Functions
function generateStudentProfile(submission) {
    const text = submission.text || '';
    const keystrokes = submission.keystrokes || [];
    const time = submission.timeSpent || 1;
    
    const wordCount = text.split(/\s+/).length;
    const backspaceCount = keystrokes.filter(k => k.isBackspace).length;
    const backspaceRate = keystrokes.length > 0 ? (backspaceCount / keystrokes.length) * 100 : 0;
    
    let profile = 'balanced';
    if (backspaceRate > 10) profile = 'meticulous';
    else if (backspaceRate < 2) profile = 'spontaneous';
    else if (wordCount > 150) profile = 'detailed';
    else if (wordCount < 50) profile = 'concise';
    
    return { type: profile, engagement: time > 60000 ? 'high' : 'medium' };
}

function calculateQualityScore(submission) {
    const text = submission.text || '';
    const keystrokes = submission.keystrokes || [];
    
    let score = 50;
    const words = text.split(/\s+/).length;
    if (words >= 50 && words <= 200) score += 20;
    if (/[.!?]/.test(text)) score += 10;
    
    const backspaceRate = keystrokes.length > 0 ? 
        (keystrokes.filter(k => k.isBackspace).length / keystrokes.length) * 100 : 0;
    if (backspaceRate >= 2 && backspaceRate <= 8) score += 10;
    
    return Math.min(100, Math.max(0, score));
}

module.exports = { generateStudentProfile, calculateQualityScore };
