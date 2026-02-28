# Editor de Personalidade

## Versão 3.0 - Com API

### Novidades desta versão:

1. **Agente faz PERGUNTAS**
   - Não dá respostas, faz perguntas reflexivas
   - Limite: 5 perguntas
   - Sistema prompt especializado

2. **Conexão com API**
   - MiniMax API configurada
   - Modo fallback para testes

3. **Espaço para perguntas**
   - Usuário pode fazer perguntas
   - Agent responde com perguntas

### Configuração da API

Edite o arquivo e substitua:
```javascript
const API_CONFIG = {
    apiKey: 'SUA_CHAVE_AQUI',
    // ...
};
```

### Como Funciona

1. Estudante escreve sobre personalidade
2. Pode fazer perguntas ao agente (máx 5)
3. Agente faz PERGUNTAS reflexivas
4. Finaliza e vai para tela intermediária

### Regras do Agente

| Regra | Valor |
|-------|-------|
| Tipo | Perguntas (não respostas) |
| Limite | 5 perguntas |
| Palavras por resposta | 50 máx |
| Foco | Reflexão profunda |

### Eventos Rastreados

- session_start/end
- input, keydown, click
- mousemove, scroll
- agent_request/response
- finish_clicked
- intermediate_screen_shown

### Git

Repositório inicializado. Commits:
- Initial commit
- v2: Agent improvements

---

_Last updated: 2026-02-25_
