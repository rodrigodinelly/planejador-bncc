# Phase 0: Research & Technical Decisions — Planejador BNCC

**Branch**: `docs/planejamento` | **Date**: 2026-10-02 | **Spec**: [spec.md](./spec.md)

Este documento consolida as investigações técnicas, análises de compatibilidade, justificativas de arquitetura e alternativas avaliadas para guiar a implementação do **Planejador BNCC**.

---

## 1. Monorepo e Gerenciador de Pacotes

### Decisão
- Utilizar **pnpm** (versão 12.8.x instalada no ambiente com Node.js v24.21.0 LTS) com workspaces definidos via `pnpm-workspace.yaml`.
- Estrutura de pastas:
  - `apps/web`: Aplicação frontend Next.js (App Router, TypeScript).
  - `apps/api`: Aplicação backend NestJS (TypeScript, Prisma ORM).
- Scripts unificados na raiz do monorepo:
  - `pnpm dev`: Inicia API e Web simultaneamente em portas separadas (3001 e 3000).
  - `pnpm lint`: Executa linter em todas as aplicações.
  - `pnpm typecheck`: Executa verificação estrita de tipos TypeScript sem emissão de código (`tsc --noEmit`).
  - `pnpm test`: Executa testes unitários das aplicações.
  - `pnpm test:integration`: Executa testes de integração (Jest/Supertest na API e testes de integração com banco/mocks).
  - `pnpm build`: Constrói os pacotes para produção.

### Racional
- O pnpm fornece isolamento estrito de dependências por hard links (evitando dependências fantasmas), velocidade superior de instalação e suporte nativo a workspaces via flag `--filter`.
- O Node.js v24 instalado é plenamente compatível com o ecossistema moderno do Next.js 15 e NestJS 11/10.
- O uso de `pnpm-lock.yaml` assegura builds reprodutíveis e determinísticos em qualquer ambiente.

### Alternativas Consideradas
- **npm / Yarn workspaces**: Rejeitados devido à maior propensão a dependências fantasmas e menor desempenho de cache e resolução de módulos.
- **Turborepo / Nx**: Dispensados nesta fase inicial para manter a complexidade mínima do repositório, delegando o roteamento aos scripts nativos do pnpm.

---

## 2. Frontend Web (`apps/web`) & Design System

### Decisão
- Framework: **Next.js 15+** com App Router e TypeScript estrito.
- Estilização: **CSS com Design Tokens e CSS Modules** — **ZERO Tailwind CSS**, conforme exigência expressa do usuário e do projeto.
- Design System: Implementação direta dos tokens do Figma identificados em `docs/design/01_design_system.png` e `docs/design-reference.md`:
  - **Cores**:
    - Primária: `#245F9E` (Brand Blue), Hover: `#1B4A7D`, Active: `#173A63`
    - Foco acessível: `#2F73B8` (anel de foco de 2px a 3px com offset)
    - Sucesso: `#247A55` (fundo suave `#E9F6EF`)
    - Alerta/Warning: `#A45B12` (fundo suave `#FFF4DE`)
    - Erro/Danger: `#B43A3A` (fundo suave `#FDECEC`)
    - Neutros: Branco `#FFFFFF`, Cinza Claro `#F4F6F8`, Bordas `#D9E2EC` / `#E2E8F0`, Texto Secundário `#486581`, Texto Principal `#102A43`
  - **Tipografia**: Família `Inter`, tamanhos de 12px a 24px, line-height proporcional de 1.4 a 1.5, pesos regular (400), medium (500) e semi-bold (600).
  - **Grid & Espaçamento**: Escala de 4px (`4px`, `8px`, `12px`, `16px`, `24px`, `32px`, `40px`).
  - **Bordas & Raios**: `6px` a `8px` para inputs e botões, `12px` para cards e modais.
- Sanitização de Markdown: Utilizar `react-markdown` combinado com `rehype-sanitize` configurado com schema restrito (permitindo apenas elementos semânticos seguros: headings, parágrafos, listas, ênfases e blockquotes; bloqueando scripts, iframes e links maliciosos).
- Gerenciamento de Autenticação no Cliente:
  - Access Token JWT mantido exclusivamente em memória (React Context / closure), nunca salvo em `localStorage` nem `sessionStorage`.
  - Refresh Token gerenciado silenciosamente pelo navegador via cookie seguro `HttpOnly`.
  - Mecanismo de recuperação de sessão transparente ao carregar a aplicação (`/auth/refresh`) e renovação antes da expiração.

### Racional
- Armazenar tokens de acesso em memória previne ataques de extração por XSS via scripts de terceiros.
- A sanitização estrita de Markdown protege o professor contra vetores de Cross-Site Scripting inseridos em respostas malformadas da IA ou manipulações de entrada.
- CSS Modules combinado com variáveis CSS `:root` entrega desempenho nativo, zero dependências pesadas de runtime e total fidelidade aos tokens do Figma.

### Alternativas Consideradas
- **Tailwind CSS**: Explicitamente vetado pelas restrições do projeto.
- **CSS-in-JS (Styled-components / Emotion)**: Rejeitados por incompatibilidade com Server Components do Next.js App Router e overhead de runtime.
- **Armazenamento de JWT em LocalStorage**: Rejeitado por violar o Princípio II e VIII da Constituição e expor a credencial a qualquer script executado no navegador.

---

## 3. Backend API (`apps/api`) & Segurança

### Decisão
- Framework: **NestJS** com TypeScript estrito, arquitetura modular (`AuthModule`, `BnccModule`, `PlansModule`, `AiModule`, `PrismaModule`).
- Porta do serviço: `http://localhost:3001` (com Web em `http://localhost:3000`).
- CORS: Configurado rigorosamente com origem explícita `http://localhost:3000` (e variável de ambiente `CORS_ORIGIN` para produção), `credentials: true`.
- Autenticação e Gestão de Sessões:
  - **Access Token**: JWT com tempo de vida curto (15 minutos), assinado com segredo dedicado (`JWT_ACCESS_SECRET`), contendo apenas `sub` (userId) e `email`.
  - **Refresh Token**: Gerado aleatoriamente com alta entropia (`crypto.randomBytes(32).toString('hex')`), tempo de vida de 7 dias.
  - **Segurança do Cookie**: Enviado com atributos `HttpOnly`, `SameSite=Lax`, `Path=/auth`.
    - *Produção*: Atributo `Secure: true`.
    - *Localhost*: `Secure: false` (configurável via `COOKIE_SECURE=false`), permitindo testes locais em HTTP sem quebra de cookie.
  - **Persistência de Hashes**: O banco de dados armazena **apenas o hash criptográfico** do Refresh Token (utilizando `argon2` ou `bcrypt`) e da senha do usuário.
  - **Proteção CSRF**: Aplicação de verificação de cabeçalho customizado (`x-requested-with: XMLHttpRequest` ou token CSRF dedicado) em todas as rotas que consom cookies (`/auth/refresh`, `/auth/logout`), bloqueando disparos automáticos de cross-origin form submissions.
- Autorização Granular Docente (Ownership):
  - Guards e Services aplicam o filtro de usuário autenticado diretamente na cláusula `where`: `where: { id: planId, userId: currentUser.id }`.
  - Quando a consulta não encontrar o registro, o serviço lança `NotFoundException` (HTTP 404), assegurando que o usuário não descubra se o ID existe para outro docente.

### Racional
- O modelo de Access Token curto em memória + Refresh Token em cookie HttpOnly é o padrão ouro de segurança web moderna, prevenindo furto de credenciais por XSS e minimizando a janela de validade dos tokens.
- O retorno de HTTP 404 em vez de 403 fecha a brecha de enumeração de recursos protegidos por privacidade docente.

### Alternativas Consideradas
- **Sessões Stateful com Redis**: Rejeitada para a primeira versão para evitar dependência externa adicional desnecessária, sendo o refresh token com hash em Postgres suficiente, seguro e auditável.
- **Retorno HTTP 403 Forbidden para planos de terceiros**: Rejeitado conforme decisão expressa na sessão de esclarecimento (`spec.md`), pois expõe a existência de planos alheios.

---

## 4. Persistência de Dados (PostgreSQL & Prisma)

### Decisão
- Banco de Dados: **PostgreSQL 16 Alpine** orquestrado via `docker-compose.yml`.
- ORM: **Prisma ORM** executado em `apps/api`.
- Modelos Principais:
  - `User`: Identificação docente, email único, senha criptografada, nome, perfil pedagógico.
  - `RefreshToken`: Associação ao usuário, hash do token, expiração e status de revogação.
  - `Habilidade`: Código oficial único (ex: `EF01CO01`), nível de ensino, ano escolar (número inteiro anulável), eixo temático, descrição, explicação e exemplos pedagógicos.
  - `Plan`: Título, duração (minutos), recursosDigitais (boolean), instrução pedagógica, conteúdo Markdown, status (`RASCUNHO`), flag `aiAssisted` (`true`), associação ao professor (`userId`).
  - `PlanHabilidade`: Tabela associativa n:n entre `Plan` e `Habilidade`.
  - `AiRun`: Registro de auditoria do ciclo de vida da execução de IA (`PENDING`, `SUCCEEDED`, `FAILED`), payload enviado, payload recebido, mensagem de erro, timestamps.
- Transacionalidade Estrita na Geração de IA:
  - Passo 1: Inicia `AiRun` com status `PENDING`.
  - Passo 2: Executa chamada HTTP ao serviço de IA (n8n ou mock local).
  - Passo 3:
    - **Se sucesso**: Executa transação relacional atômica via `prisma.$transaction`:
      1. Atualiza `AiRun` para `SUCCEEDED` salvando o payload de resposta.
      2. Insere `Plan` com status `RASCUNHO`, `aiAssisted: true` e corpo Markdown retornado.
      3. Cria os vínculos em `PlanHabilidade`.
    - **Se falha**: Atualiza `AiRun` para `FAILED` com mensagem de erro em transação isolada; **NENHUM registro de `Plan` é criado**.
- Seed Idempotente:
  - Script executável via `pnpm --filter api seed` (ou `prisma db seed`).
  - Cria/atualiza via `upsert` as duas contas demo:
    - `ana@demo.bncc.br` (Profª Ana Souza)
    - `marcos@demo.bncc.br` (Prof. Marcos Lima)
  - Carrega e efetua `upsert` das 5 habilidades canônicas de `docs/data/bncc-recorte.json` baseando-se no campo único `codigo`.

### Racional
- O Prisma oferece tipagem TypeScript de ponta a ponta e controle estrito de migrações determinísticas.
- A orquestração transacional garante atomicidade absoluta (Princípio V da Constituição): falhas na IA nunca deixam o banco com rascunhos parciais ou corrompidos.

### Alternativas Consideradas
- **TypeORM / MikroORM**: Menor velocidade de prototipação com segurança de tipos comparado ao Prisma schema.
- **Gravação prévia de rascunho em estado "PROCESSANDO"**: Rejeitada porque a falha de IA deixaria registros órfãos ou exigiria limpeza em background assíncrona desnecessária para o escopo delimitado.

---

## 5. Integração n8n, Validação e Mock Local

### Decisão
- Módulo `AiModule` em `apps/api` encapsulando a comunicação HTTP externa.
- Contrato da Requisição (conforme `docs/contracts/n8n.md`):
  ```json
  {
    "sessao": "email-do-usuario",
    "habilidade": "CODIGO — Descrição oficial",
    "instrucao": "Instrução pedagógica informada pelo professor",
    "duracao": 50,
    "recursos_digitais": true
  }
  ```
  - *Regra Multi-Habilidade*: Quando múltiplas habilidades forem selecionadas, concatenar em linhas separadas: `"EF01CO01 — Descrição 1\nEF01CO02 — Descrição 2"`.
- Autenticação com n8n:
  - Header HTTP `x-api-key: <N8N_API_KEY>`.
  - Header de rastreabilidade `x-request-id: <uuid>`.
- Política de Execução e Timeout:
  - Timeout estrito configurável via `N8N_TIMEOUT_MS` (padrão 60000ms / 60s) usando `AbortController` nativo do Node.js ou Axios.
  - **Zero retentativas automáticas** (`retries: 0`), respeitando o critério de aceitação e evitando cobranças/consumos duplicados de workflows externos.
- Validação Estrita da Resposta com Schema (Zod / class-validator):
  - Verifica campos obrigatórios:
    ```typescript
    z.object({
      success: z.literal(true),
      sessao: z.string(),
      habilidade: z.string(),
      answer: z.string().min(10),
      format: z.literal('markdown')
    })
    ```
  - Se a resposta tiver `success: false`, payload ausente ou campos inválidos, a chamada é tratada como erro de validação.
- Adaptador Mock Local Determinístico:
  - Ativado quando `N8N_MOCK_ENABLED=true` ou quando a URL do webhook não for informada.
  - Gera um plano pedagógico estruturado em Markdown com seções completas (Objetivos, Duração, Recursos, Desenvolvimento passo a passo e Avaliação), com base nos parâmetros recebidos.
  - Permite simular latência configurável (ex: 1500ms) para validação visual do estado de preparação e opção de simular erro quando solicitado em testes automatizados.

### Racional
- O mock local desacopla completamente os testes e o desenvolvimento local da infraestrutura do n8n, garantindo que a suíte de testes de integração execute rapidamente e sem custos.
- A validação com Zod garante conformidade com o Princípio V da Constituição antes de qualquer gravação relacional.

### Alternativas Consideradas
- **Client HTTP padrão sem isolamento de mock**: Rejeitado porque bloquearia testes automatizados offline e CI/CD.
- **Políticas de Retry com Backoff**: Rejeitado por instrução expressa dos requisitos (evita duplicar requisições em IA lenta).

---

## 6. Mapeamento dos Frames Figma e Adaptação Responsiva

### Telas Inspecionadas e Diretrizes de Adaptação:

| # | Frame / Arquivo | Componentes Principais | Adaptações Responsivas & Estados |
|---|-----------------|------------------------|----------------------------------|
| 1 | `01_design_system.png` | Cores, tipografia, botões (primary, secondary, danger), inputs, badges, cards, toasts | Base CSS global em `apps/web/src/styles/tokens.css`. Tokens de espaçamento em base 4px. |
| 2 | `02_login_credenciais_invalidas.png` | Card central de login, botões de acesso rápido demo (Profª Ana Souza, Prof. Marcos Lima), campos de e-mail e senha, alerta de credenciais inválidas. | No desktop: card centralizado (420px max). No mobile: card ocupa 100% da largura com padding de 16px. Botões de acesso rápido com touch target mínimo de 48px. |
| 3 | `03_meus_planos_rascunhos.png` | Header com identificação do professor e botão "Sair", título da página, botão "Novo plano", lista de cards de rascunhos com badge `RASCUNHO`, data de atualização e habilidades associadas. | No desktop: grid de 2 ou 3 colunas ou tabela informativa. No mobile: cards em pilha vertical única com ações facilmente acessíveis ao polegar. |
| 4 | `04_meus_planos_estado_vazio.png` | Ilustração/ícone amigável, título "Nenhum rascunho ainda", texto explicativo de boas-vindas e botão de ação principal "Criar meu primeiro plano". | Centralizado na viewport. Padding vertical generoso em desktop, compacto em telas menores. |
| 5 | `05_novo_plano_formulario.png` | Seletor de filtros BNCC (Nível, Ano, Eixo), campo de busca textual de habilidades, lista de seleção, container de chips ativos com botão `x`, campo de duração (minutos), checkbox de recursos digitais, textarea de orientações pedagógicas, botão "Gerar rascunho". | Em desktop: layout em duas colunas (coluna esquerda: catálogo e chips; coluna direita: parâmetros de geração). Em mobile: fluxo linear vertical com seletor recolhível (accordion) ou gaveta de busca de habilidades. |
| 6 | `06_novo_plano_preparando.png` | Estado de carregamento com spinner ou barra animada de progresso, título "Preparando seu rascunho pedagógico...", texto informativo "A IA está estruturando seu plano com base nas habilidades BNCC. Isso pode levar até 60 segundos.", formulário desabilitado. | Bloqueio de cliques concorrentes com overlay ou desabilitação de todos os campos. Mensagem amigável de paciência. |
| 7 | `07_novo_plano_falha_geracao.png` | Banner de alerta semântico vermelho/laranja no topo: "Não foi possível gerar - Nenhum plano foi salvo. O serviço demorou a responder ou encontrou um erro.", campos do formulário 100% preenchidos e botão "Tentar novamente" reabilitado. | Banner com `role="alert"` para leitores de tela. Scroll automático até o topo do formulário no mobile para visibilidade imediata do erro. |
| 8 | `08_rascunho_editor_preview.png` | Header com título editável, badge `RASCUNHO`, tag `Auxílio por IA`, alternador de abas ("Editor Markdown" / "Pré-visualização"), textarea monoespaçado para Markdown, visualizador HTML renderizado e sanitizado, botão "Salvar alterações", botão "Voltar". | Em desktop: visualização lado a lado ou abas em tela cheia. Em mobile: alternância estrita por abas superiores com botão flutuante ou fixo no rodapé para "Salvar". |
| 9 | `09_rascunho_confirmacao_saida.png` | Modal de confirmação: "Sair sem salvar?", texto de alerta de perda de dados não gravados, botões "Continuar editando" (secundário) e "Sair sem salvar" (perigo). | Modal com backdrop escurecido, `aria-modal="true"`, foco retido no modal (focus trap) e suporte à tecla `Escape`. No mobile, ocupa a parte inferior como bottom sheet. |

---

## 7. Conclusões e Portões Aprovados

Todas as pendências e itens de pesquisa foram esclarecidos com soluções compatíveis com a constituição, com os requisitos de isolamento entre professores, atomicidade relacional e fidelidade visual aos frames aprovados.
