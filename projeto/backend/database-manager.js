/**
 * ============================================
 * Database Manager - Enhanced
 * Backup, Validation, Integrity
 * ============================================
 */

const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, 'data.json');
const BACKUP_DIR = path.join(__dirname, 'backups');

// Ensure backup directory exists
if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

const DatabaseManager = {
    // Create automatic backup
    createBackup() {
        try {
            const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
            
            const backup = {
                timestamp: new Date().toISOString(),
                version: '2.0',
                data: {
                    submissions: data.submissions || [],
                    events: data.events || [],
                    sessions: data.sessions || [],
                    conversations: data.conversations || [],
                    continuum: data.continuum || []
                },
                stats: {
                    totalSubmissions: data.submissions?.length || 0,
                    totalEvents: data.events?.length || 0,
                    lastSubmission: data.submissions?.[data.submissions.length - 1]?.studentId
                }
            };
            
            const filename = `backup_${Date.now()}.json`;
            const filepath = path.join(BACKUP_DIR, filename);
            
            fs.writeFileSync(filepath, JSON.stringify(backup, null, 2));
            console.log('✅ Backup created:', filename);
            
            return { success: true, filename };
        } catch (e) {
            console.error('❌ Backup failed:', e.message);
            return { success: false, error: e.message };
        }
    },
    
    // Validate data integrity
    validate() {
        try {
            const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
            const issues = [];
            
            // Check submissions
            if (!Array.isArray(data.submissions)) {
                issues.push('submissions is not an array');
            }
            
            // Check for duplicates
            const studentIds = (data.submissions || []).map(s => s.studentId);
            const duplicates = studentIds.filter((id, i) => studentIds.indexOf(id) !== i);
            if (duplicates.length > 0) {
                issues.push(`Found ${duplicates.length} duplicate studentIds`);
            }
            
            // Check for null/missing fields
            (data.submissions || []).forEach((s, i) => {
                if (!s.studentId) issues.push(`Submission ${i} missing studentId`);
                if (!s.text) issues.push(`Submission ${i} missing text`);
            });
            
            return {
                valid: issues.length === 0,
                issues,
                stats: {
                    total: data.submissions?.length || 0,
                    valid: (data.submissions?.length || 0) - issues.length
                }
            };
        } catch (e) {
            return { valid: false, error: e.message };
        }
    },
    
    // Clean old data (keep last 1000 submissions)
    clean(keepCount = 1000) {
        try {
            const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
            
            if (data.submissions && data.submissions.length > keepCount) {
                const removed = data.submissions.length - keepCount;
                data.submissions = data.submissions.slice(-keepCount);
                
                fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
                console.log(`✅ Cleaned ${removed} old submissions`);
                
                return { success: true, removed };
            }
            
            return { success: true, removed: 0 };
        } catch (e) {
            return { success: false, error: e.message };
        }
    },
    
    // Get statistics
    getStats() {
        try {
            const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
            
            const submissions = data.submissions || [];
            const events = data.events || [];
            const continuum = data.continuum || [];
            
            // Calculate averages
            const avgWords = submissions.length > 0
                ? submissions.reduce((sum, s) => sum + (s.wordCount || 0), 0) / submissions.length
                : 0;
            
            const avgTime = submissions.length > 0
                ? submissions.reduce((sum, s) => sum + (s.timeSpent || 0), 0) / submissions.length
                : 0;
            
            return {
                submissions: submissions.length,
                events: events.length,
                continuum: continuum.length,
                averages: {
                    words: Math.round(avgWords),
                    timeSeconds: Math.round(avgTime / 1000)
                },
                lastSubmission: submissions[submissions.length - 1]?.studentId,
                lastUpdate: new Date().toISOString()
            };
        } catch (e) {
            return { error: e.message };
        }
    },
    
    // Export data
    export(format = 'json') {
        const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
        
        if (format === 'csv') {
            // Convert submissions to CSV
            const headers = ['studentId', 'wordCount', 'timeSpent', 'submittedAt'];
            const rows = (data.submissions || []).map(s => 
                headers.map(h => (s[h] || '').toString().replace(/,/g, ';')).join(',')
            );
            
            return [headers.join(','), ...rows].join('\n');
        }
        
        return JSON.stringify(data, null, 2);
    }
};

// Auto-backup every hour
setInterval(() => {
    DatabaseManager.createBackup();
}, 60 * 60 * 1000);

// Auto-clean every day
setInterval(() => {
    DatabaseManager.clean(1000);
}, 24 * 60 * 60 * 1000);

module.exports = DatabaseManager;
