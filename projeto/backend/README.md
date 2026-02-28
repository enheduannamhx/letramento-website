# Backend - Sistema de Letramento

## Arquitetura de Produção

```
[Navegador Estudante]
       ↓ HTTPS
[Backend API (Node.js)]
       ↓
[MiniMax API] ← Chave PROTEGIDA
       ↓
[Database]
       ↓
[Admin Dashboard]
```

## Para Rodar em Produção

### 1. Instalar dependências
```bash
cd backend
npm install
```

### 2. Configurar variáveis de ambiente
```bash
export MINIMAX_API_KEY="sua_chave_aqui"
export PORT=3000
export ALLOWED_ORIGINS="https://seudominio.com"
```

### 3. Iniciar servidor
```bash
npm start
```

### 4. Usar com HTTPS (obrigatório em produção)
- Usar Nginx ou similar como proxy reverso
- Configurar SSL/TLS

## Proteções Implementadas

| Proteção | Descrição |
|----------|-----------|
| API Key protegida | Nunca exposta no frontend |
| Rate limiting | Limite de requisições por IP |
| CORS configurado | Origins permitidos |
| Logging de segurança | IPs registrados |
| Batch events | Performance com muitos usuários |

## API Endpoints

| Endpoint | Método | Descrição |
|----------|--------|------------|
| /health | GET | Health check |
| /api/session | POST | Criar sessão |
| /api/event | POST | Registrar evento |
| /api/events/batch | POST | Batch de eventos |
| /api/agent/personality | POST | Agente de personalidade |
| /api/dashboard/stats | GET | Estatísticas |

## Para Escala (milhares de usuários)

1. **Banco de dados**: PostgreSQL (não memória)
2. **Cache**: Redis para rate limiting
3. **Load balancer**:nginx
4. **SSL**: Let's Encrypt
5. **Autenticação**: JWT ou OAuth2
6. **Logs**: ELK Stack ou similar

---

_Last updated: 2026-02-25_
