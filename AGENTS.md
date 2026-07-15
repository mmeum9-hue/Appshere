# AppShare - Regras de Desenvolvimento e Preservação de Dados (Development & Data Preservation Rules)

This file contains strict, persistent development instructions for all AI models, agents, and developers working on AppShare. The system automatically injects these rules into the AI instructions on every turn.

---

## 🚨 REGRA CRÍTICA: PRESERVAÇÃO INTEGRAL DE DADOS (CRITICAL DATA PRESERVATION RULE)

Sempre que o AppShare for atualizado, corrigido ou receber novas funcionalidades, **absolutamente nenhum dado** cadastrado pelo administrador ou pelos usuários no banco de dados (Firestore) ou no armazenamento de arquivos (Firebase Storage) pode ser apagado, alterado, resetado ou sobrescrito de forma automática.

### 1. Elementos que devem ser Preservados Integralmente:
- **Aplicativos publicados e Arquivos APK:** Todas as referências e metadados de aplicativos compartilhados.
- **Mídia e Design:** Ícones de aplicativos, capturas de tela (screenshots), banners e imagens promocionais.
- **Conteúdo Informativo:** Descrições, categorias, versões cadastradas e links de download gerados.
- **Interações e Estatísticas:** Avaliações, comentários de usuários, histórico de downloads e estatísticas gerais.
- **Contas de Usuários:** Perfis, permissões (p. ex., funções de administrador), e listas de favoritos.

---

## 🛠️ DIRETRIZES DE ATUALIZAÇÃO E DESENVOLVIMENTO (UPDATE GUIDELINES)

Para manter a conformidade com essa regra de preservação, qualquer alteração no código deve seguir estas restrições técnicas:

1. **Sem Scripts de Limpeza ou Reinicialização (No Flush/Seeding Scripts):**
   - É terminantemente **proibido** criar rotinas que limpem coleções do Firestore ou deletem objetos do Firebase Storage ao iniciar o servidor (`server.ts`) ou ao renderizar o frontend (`src/App.tsx`).
   - Evite adicionar dados falsos ("mock data") ou substituir os documentos existentes na inicialização do aplicativo.

2. **Retrocompatibilidade de Dados (Data Backwards-Compatibility):**
   - Se uma nova funcionalidade exigir alterações na estrutura de dados (schema), novos campos devem ser criados como **opcionais** (nullables) ou possuir valores padrões definidos no próprio código do cliente.
   - **Nunca** renomeie ou remova chaves de dados existentes se houver registros antigos que dependem delas.

3. **Uso de Bancos e Storage Reais:**
   - O aplicativo está conectado às instâncias reais do Firestore e do Firebase Storage configuradas em `src/firebase.ts`. Essas bases são persistentes por natureza. O código deve apenas ler e gravar de forma incremental e protegida.

---

## 🇬🇧 ENGLISH TRANSLATION FOR PARSERS

Whenever AppShare is updated, corrected, or receives new features, **absolutely no data** registered by the administrator or users in the database (Firestore) or storage (Firebase Storage) may be deleted, modified, or overwritten automatically.

1. **Preserved Items:** All published apps, APK files, icons, screenshots, banners, descriptions, categories, versions, download links, reviews, comments, users, download statistics, and other registered records.
2. **Backwards-Compatibility:** Schema additions must be optional. Do not rename or remove existing keys.
3. **No Automatic Destructive Routines:** Any cleanups, format commands, or destructive seed scripts on application boot are strictly forbidden. Updates must modify only the codebase and system features, preserving database states intact.
