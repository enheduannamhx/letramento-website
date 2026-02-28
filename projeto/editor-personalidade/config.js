// Configurações do Sistema de Letramento
// PROTEÇÃO: Este arquivo contém credenciais sensíveis

const CONFIG = {
    // MiniMax API - Usada para o Agente de Personalidade
    API_KEY: 'sk-cp-cEu2Ad1ESdI62amIIUx7Ue1kSN9FWk3jDuiA9etkg3Q5s3gAbYVyhhDOPMo-LHH70mgN-jx2TBWWWsPNAYz05F_s3UoQxR7YGjimFfyXBJV3weGZ8PkaEA4',
    API_BASE_URL: 'https://api.minimax.chat/v1/text/chatcompletion_v2',
    MODEL: 'abab6.5s-chat',
    
    // Configurações do Agente
    AGENT: {
        MAX_INTERACTIONS: 5,
        MAX_WORDS_RESPONSE: 80,
        MAX_SENTENCES: 2
    }
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}
