# Pesquisa: Arquitetura de Banco de Dados para Web/Mobile

## Opções de Arquitetura

### 1. Web Puro (PWAs)

**O que é:** Progressive Web App - funciona como app mas no navegador

| Prós | Contras |
|------|---------|
| Funciona em qualquer dispositivo | Não disponível em app stores |
| Sem install | Recursos nativos limitados |
| Atualizações automáticas | Não aparece na homescreen |
| IndexedDB para dados locais | |

**Para celular:** Pode ser "instalado" como PWA

### 2. App Nativo (Android/iOS)

| Prós | Contras |
|------|---------|
| Acesso completo a recursos nativos | Desenvolvimento mais complexo |
| Lojas de apps (Play Store, App Store) | Atualizações precisam de review |
| Melhor performance | Maior custo de desenvolvimento |

### 3. Arquitetura Híbrida

| Abordagem | Descrição |
|-----------|-----------|
| **PWA + API** | Web app que sincroniza com servidor |
| **Electron** | App desktop usando web technologies |
| **Capacitor/Flutter** | Código único para web + mobile |

---

## Recomendação para Este Projeto

### Fase 1: PWA
- App web que funciona em desktop e mobile
- IndexedDB para dados locais
- Sync com servidor quando online

### Fase 2: App Nativo (futuro)
- Wrapper ao redor do PWA
- Disponível em lojas de apps

---

## Como Armazenar Dados

### No Navegador (IndexedDB)
```javascript
// Estrutura local
{
  events: [...],      // Todos os eventos
  sessions: [...],    // Sessões
  drafts: [...]      // Rascunhos do usuário
}
```

### No Servidor (futuro)
```javascript
// API REST
POST /api/events    // Salvar eventos
GET  /api/events    // Listar eventos
POST /api/sync     // Sincronizar
```

---

## Conclusão

**Podemos usar inteiramente a interface web!**

- PWA funciona em desktop e mobile
- IndexedDB armazena tudo localmente
- Futuro: adicionar API para sincronização
- Não precisa de app nativo para começar

