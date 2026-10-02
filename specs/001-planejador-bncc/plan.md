# Implementation Plan: Planejador BNCC

**Branch**: `docs/planejamento` | **Date**: 2026-10-02 | **Spec**: [spec.md](./spec.md)

**Input**: Especificação do Planejador BNCC a partir de `specs/001-planejador-bncc/spec.md`, design em `docs/design-reference.md`, contrato n8n em `docs/contracts/n8n.md` e catálogo em `docs/data/bncc-recorte.json`.

---

## Summary

O **Planejador BNCC** é uma aplicação web full-stack para professores da educação básica planejarem aulas alinhadas às competências e habilidades canônicas da BNCC com suporte assistido por Inteligência Artificial.

A solução é arquitetada como um **monorepo pnpm** contendo:
- **`apps/web`**: Interface web responsiva em **Next.js (TypeScript)** utilizando **CSS com Design Tokens e CSS Modules** (estritamente sem Tailwind), espelhando com fidelidade os 9 frames do Figma aprovados em `docs/design-reference.md` e garantindo renderização de Markdown segura e sanitizada. O frontend armazena o token de acesso de curta duração estritamente em memória.
- **`apps/api`**: API RESTful em **NestJS (TypeScript)** com **Prisma ORM** e **PostgreSQL 16** (via Docker Compose). A API atua como fronteira segura de dados e controle de acesso docente (ownership estrito com resposta 404 para planos alheios), encapsula o cliente HTTP para o workflow n8n (com autenticação por header `x-api-key`, rastreabilidade por `requestId`, timeout configurável de 60s, sem retentativas automáticas e modo Mock local determinístico) e assegura atomicidade transacional: a geração com IA grava `AiRun` como `PENDING`; em sucesso, persiste o plano como `RASCUNHO` na mesma transação; em falha ou timeout, aborta a gravação sem criar planos parciais e preserva os campos no formulário.

---

## Technical Context

**Language/Version**: TypeScript 5.x estrito, Node.js `v24.21.0` LTS (conforme inspecionado no ambiente).

**Primary Dependencies**:
- **Monorepo**: `pnpm` 12.8.x (`pnpm-workspace.yaml`, lockfile `pnpm-lock.yaml`).
- **Frontend (`apps/web`)**: Next.js 15+ (App Router), React 19/18, `react-markdown`, `rehype-sanitize`, CSS nativo com Design Tokens e CSS Modules. *(Proibido uso de Tailwind CSS)*.
- **Backend (`apps/api`)**: NestJS 11/10 (`@nestjs/common`, `@nestjs/core`, `@nestjs/config`, `@nestjs/jwt`, `@nestjs/passport`), Prisma ORM 5/6, Zod / `class-validator`, `argon2` / `bcrypt` para hash de senhas e tokens de atualização, `cookie-parser`.

**Storage**: PostgreSQL 16 Alpine orquestrado via `docker-compose.yml`, gerenciado por migrações versionadas do Prisma e populado por scripts de seed idempotentes.

**Testing**:
- Testes Unitários e de Componentes: Vitest / Jest, `@testing-library/react`.
- Testes de Integração e Contrato de API: Supertest, NestJS Testing Module, Prisma Test Client.
- Scripts raiz: `pnpm test` e `pnpm test:integration`.

**Target Platform**: Servidor Node.js em containers Linux/Docker; Clientes navegadores modernos (Desktop, Tablet e Mobile) cumprindo acessibilidade WCAG AA.

**Project Type**: Aplicação Web Full-Stack Monorepo (`apps/web` na porta `3000` e `apps/api` na porta `3001`).

**Performance Goals**:
- Busca e filtragem no catálogo da BNCC com resposta inferior a 1 segundo.
- Alternância instantânea (< 200ms) entre as abas de "Editor Markdown" e "Pré-visualização".
- Resposta da geração por IA delimitada por timeout estrito de 60 segundos com feedback visual imediato.

**Constraints**:
- **Zero Tailwind CSS**: Estilização baseada exclusivamente em CSS moderno com tokens compartilhados.
- **Isolamento de Segredos**: Frontend sem acesso a chaves do n8n ou senhas de banco.
- **Isolamento Docente Rigoroso**: Resposta `404 Not Found` em qualquer tentativa de leitura ou mutação de plano pertencente a outro professor.
- **Consistência Transacional**: Falhas da IA resultam em zero planos parciais ou órfãos no banco de dados e retenção total dos dados no formulário do cliente.
- **Sem retentativas automáticas**: O backend não realiza retry ao n8n.
- **Sanitização de Markdown**: Proibição de execução de tags HTML arbitrárias (`<script>`, `<iframe>`, manipuladores inline de eventos).

**Scale/Scope**:
- 2 contas de demonstração pré-cadastradas: `Profª Ana Souza` (`ana@demo.bncc.br`) e `Prof. Marcos Lima` (`marcos@demo.bncc.br`).
- Catálogo inicial com 5 habilidades canônicas em `docs/data/bncc-recorte.json`.
- 9 telas e estados aprovados no Figma (`docs/design/`).

---

## Constitution Check

*GATE: Avaliação prévia e pós-design com base em `.specify/memory/constitution.md`.*

| Princípio Constitucional | Status | Avaliação Técnica no Planejamento |
|---|---|---|
| **I. Especificação Prévia e Critérios de Aceitação** | **PASS** | Todas as 5 User Stories possuem critérios de aceitação independentes e verificáveis (`spec.md`), e o plano não antecipa escopo não documentado (sem admin, sem PDF, sem publicação). |
| **II. Separação de Camadas e Isolamento de Segredos** | **PASS** | API NestJS atua como barreira estrita entre a web e o n8n. Variáveis `N8N_API_KEY` e `DATABASE_URL` residem exclusivamente em `apps/api/.env`. O frontend recebe apenas endpoints da API local (`:3001`). |
| **III. Autenticação e Autorização por Professor** | **PASS** | Todas as rotas de planos filtram por `where: { id, userId }`. Violações de ownership retornam invariavelmente HTTP 404, protegendo a privacidade docente e impedindo a enumeração de IDs. |
| **IV. IA como Rascunho com Supervisão Docente** | **PASS** | Todo plano gerado recebe obrigatoriamente `status: RASCUNHO`, selo visual `Auxílio por IA`, e só é alterado mediante ação explícita do professor no editor com salvamento manual. |
| **V. Validação Estrita e Consistência Transacional** | **PASS** | A geração por IA inicia `AiRun` como `PENDING`. Em sucesso, cria o `Plan` e atualiza `AiRun` para `SUCCEEDED` na mesma transação atômica do Prisma. Em falha, marca `FAILED` e nenhum plano parcial é criado. Resposta do n8n validada via schema Zod estrito. |
| **VI. Migrações e Seeds Reproduzíveis** | **PASS** | O banco PostgreSQL é gerenciado por migrações auditáveis do Prisma. O script `pnpm --filter api seed` é totalmente idempotente (utilizando `upsert` por e-mail e por código da BNCC). |
| **VII. Design System, Acessibilidade e Responsividade** | **PASS** | Mapeamento exato dos 9 frames do Figma (`docs/design/`) para tokens CSS nativos (cores `#245F9E`, `#247A55`, `#B43A3A`, espaçamento base 4px, raios 8px/12px). Sem Tailwind. Adaptação fluida para desktop, tablet e mobile. |
| **VIII. Testabilidade Crítica e Segurança de Credenciais** | **PASS** | Roteiro de testes unitários e de integração documentado em `quickstart.md`. Suporte a Mock local para execução de testes sem gastar workflow externo. Arquivos de ambiente ignorados no Git. |

*Resultado do Gate*: **APROVADO (0 violações)**.

---

## Project Structure

### Documentation (this feature)

```text
specs/001-planejador-bncc/
├── spec.md              # Especificação de requisitos e critérios de aceitação
├── plan.md              # Este plano técnico de implementação
├── research.md          # Decisões arquiteturais, análises de bibliotecas e compatibilidade
├── data-model.md        # Diagrama ERD, entidades, estados e schema Prisma
├── quickstart.md        # Roteiro de execução, inicialização, testes e validação ponta a ponta
├── contracts/           # Especificação detalhada dos contratos de interface
│   ├── auth-api.md      # Contrato dos endpoints /auth (login, refresh, logout, me)
│   ├── bncc-api.md      # Contrato dos endpoints /bncc (catálogo de habilidades)
│   ├── plans-api.md     # Contrato dos endpoints /plans (geração, listagem, edição, 404)
│   └── n8n-client.md    # Contrato HTTP, headers x-api-key, timeout e mock do workflow n8n
└── checklists/
    └── requirements.md  # Checklist de conformidade de requisitos
```

### Source Code (repository root)

```text
planejador-bncc/
├── .specify/                         # Configurações do Spec Kit e constituição
├── docs/                             # Documentos de referência e design
│   ├── contracts/n8n.md              # Contrato oficial de referência do n8n
│   ├── data/bncc-recorte.json        # Catálogo canônico inicial de 5 habilidades BNCC
│   ├── design-reference.md           # Links dos nós aprovados do Figma
│   └── design/                       # 9 frames PNG aprovados exportados do Figma
├── docker-compose.yml                # Serviço PostgreSQL 16 Alpine
├── pnpm-workspace.yaml               # Configuração do monorepo pnpm
├── package.json                      # Scripts unificados (dev, lint, typecheck, test, build)
├── pnpm-lock.yaml                    # Lockfile reprodutível de dependências
├── apps/
│   ├── api/                          # Backend NestJS (porta 3001)
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── .env.example
│   │   ├── prisma/
│   │   │   ├── schema.prisma         # Modelos User, RefreshToken, Habilidade, Plan, AiRun
│   │   │   ├── migrations/           # Migrações versionadas do banco de dados
│   │   │   └── seed.ts               # Seed idempotente (2 contas demo + 5 habilidades)
│   │   ├── src/
│   │   │   ├── main.ts               # Bootstrap da API, CORS, cookies, validação global
│   │   │   ├── app.module.ts         # Módulo raiz da aplicação
│   │   │   ├── common/               # Filtros de exceção, decorators e guards de ownership
│   │   │   ├── auth/                 # Módulo de autenticação JWT, cookies HttpOnly e CSRF
│   │   │   │   ├── auth.controller.ts
│   │   │   │   ├── auth.service.ts
│   │   │   │   ├── jwt.strategy.ts
│   │   │   │   └── dto/
│   │   │   ├── bncc/                 # Módulo de catálogo e busca de habilidades BNCC
│   │   │   │   ├── bncc.controller.ts
│   │   │   │   ├── bncc.service.ts
│   │   │   │   └── dto/
│   │   │   ├── plans/                # Módulo de planos de aula (listagem, edição, 404)
│   │   │   │   ├── plans.controller.ts
│   │   │   │   ├── plans.service.ts
│   │   │   │   └── dto/
│   │   │   └── ai/                   # Adaptador do cliente n8n e Mock local determinístico
│   │   │       ├── ai.service.ts     # Orquestrador transacional de AiRun + Plan
│   │   │       ├── n8n-client.service.ts # Cliente HTTP com x-api-key e timeout 60s
│   │   │       ├── n8n-mock.adapter.ts   # Adaptador simulado para testes e dev offline
│   │   │       └── dto/
│   │   └── test/                     # Testes de integração (e2e com Supertest)
│   │
│   └── web/                          # Frontend Next.js App Router (porta 3000)
│       ├── package.json
│       ├── tsconfig.json
│       ├── next.config.js
│       ├── .env.example
│       └── src/
│           ├── app/
│           │   ├── layout.tsx        # Layout raiz com fontes e provedores
│           │   ├── page.tsx          # Tela de Login com acesso de 1 clique demo
│           │   ├── planos/
│           │   │   ├── page.tsx      # Tela "Meus planos" (rascunhos e estado vazio)
│           │   │   ├── novo/
│           │   │   │   └── page.tsx  # Formulário de criação, filtros BNCC e estados
│           │   │   └── [id]/
│           │   │       └── page.tsx  # Editor Markdown, pré-visualização e modal de saída
│           ├── components/           # Componentes do Design System (sem Tailwind)
│           │   ├── ui/               # Button, Input, Select, Badge, Card, Toast, Modal
│           │   ├── layout/           # AppHeader (identificação e logout), Container
│           │   ├── bncc/             # HabilidadeCard, HabilidadeFilter, ActiveChips
│           │   └── editor/           # MarkdownEditor, MarkdownPreview (sanitizado)
│           ├── contexts/             # AuthContext (Access Token estrito em memória)
│           ├── services/             # Clientes de API (fetch com credentials: include)
│           └── styles/
│               ├── tokens.css        # Tokens CSS de cores, tipografia e espaçamentos
│               ├── globals.css       # Estilos globais e reset acessível
│               └── *.module.css      # Estilização modular por componente/página
```

**Structure Decision**:
Adotou-se a arquitetura monorepo com `apps/web` e `apps/api` compartilhando a raiz do repositório gerenciada pelo pnpm. Essa divisão assegura total desacoplamento e isolamento de dependências, permitindo que o frontend execute Next.js puro focado na interface do usuário enquanto a API encapsula a comunicação segura com o banco PostgreSQL e com o webhook do n8n.

---

## Mapeamento de Telas Figma e Adaptação Responsiva

Com base na inspeção dos 9 frames em `docs/design/` e `docs/design-reference.md`:

### Frame 01: Design System (`docs/design/01_design_system.png`)
- **Implementação**: Arquivo de tokens CSS `apps/web/src/styles/tokens.css` contendo variáveis CSS:
  - `--color-brand-primary`: `#245F9E`
  - `--color-brand-dark`: `#173A63`
  - `--color-focus-ring`: `#2F73B8`
  - `--color-success`: `#247A55` (fundo `--color-success-bg`: `#E9F6EF`)
  - `--color-warning`: `#A45B12` (fundo `--color-warning-bg`: `#FFF4DE`)
  - `--color-danger`: `#B43A3A` (fundo `--color-danger-bg`: `#FDECEC`)
  - `--color-text-main`: `#102A43`
  - `--color-text-secondary`: `#486581`
  - `--color-bg-page`: `#F4F6F8`
  - `--radius-sm`: `6px`, `--radius-md`: `8px`, `--radius-lg`: `12px`
- **Componentes**: `Button` (variantes primary, secondary, danger), `Badge`, `Card`, `InputField`, `TextareaField`, `CheckboxField`, `ToastNotification`.

### Frame 02: Login — Credenciais Inválidas (`docs/design/02_login_credenciais_invalidas.png`)
- **Componentes**: Card central de login, cabeçalho institucional, botões de 1 clique para demonstração:
  - Botão 1: `Entrar como Profª Ana Souza` (`ana@demo.bncc.br`)
  - Botão 2: `Entrar como Prof. Marcos Lima` (`marcos@demo.bncc.br`)
  - Divisor "ou entre com suas credenciais", campos de e-mail e senha, botão de submit e banner de erro semântico para credenciais inválidas.
- **Responsividade**: Desktop: centralizado em viewport com largura máxima de 420px; Mobile: card ocupa 100% da largura útil com padding lateral de 16px e alvos de toque com altura mínima de 48px.

### Frame 03: Meus Planos — Rascunhos (`docs/design/03_meus_planos_rascunhos.png`)
- **Componentes**: Barra superior com nome do professor autenticado e botão "Sair", título "Meus planos", botão principal "Novo plano", grid de cards com status `RASCUNHO`, data da última modificação, código da habilidade BNCC em badge e título do plano.
- **Responsividade**: Desktop: grid responsivo de 3 colunas (>= 1200px) ou 2 colunas (768px a 1199px); Mobile: coluna vertical única (< 768px).

### Frame 04: Meus Planos — Estado Vazio (`docs/design/04_meus_planos_estado_vazio.png`)
- **Componentes**: Card com ilustração/ícone pedagógico, mensagem "Nenhum rascunho ainda", texto explicativo convidando a iniciar e botão destacado "Criar meu primeiro plano".
- **Responsividade**: Centralizado vertical e horizontalmente na área de conteúdo.

### Frame 05: Novo Plano — Formulário com Validações (`docs/design/05_novo_plano_formulario.png`)
- **Componentes**: Painel dividido:
  - Seção de habilidades: Filtros de Nível, Ano e Eixo, campo de busca com debounce, lista rolável de habilidades com checkbox, barra de chips ativos com botão de exclusão (`x`).
  - Seção de parâmetros: Duração em minutos (número inteiro > 0), checkbox para recursos digitais, campo de texto para instrução pedagógica, botão de ação "Gerar rascunho". Mensagens de validação inline nos campos obrigatórios.
- **Responsividade**: Desktop: duas colunas lado a lado; Mobile: layout linear verticalizado em coluna única, com chips colapsáveis ou roláveis horizontalmente.

### Frame 06: Novo Plano — Preparando Rascunho (`docs/design/06_novo_plano_preparando.png`)
- **Componentes**: Overlay/estado de processamento com indicador visual de carregamento (spinner), mensagem "Preparando seu rascunho pedagógico...", texto explicativo "A IA está estruturando seu plano com base nas habilidades BNCC. Isso pode levar até 60 segundos.", formulário congelado para prevenir reenvio acidental.
- **Responsividade**: Ajuste proporcional da tipografia e espaçamento para visualização confortável em telas pequenas.

### Frame 07: Novo Plano — Falha de Geração (`docs/design/07_novo_plano_falha_geracao.png`)
- **Componentes**: Banner semântico de erro com destaque no topo: `Não foi possível gerar - Nenhum plano foi salvo. O serviço demorou a responder ou encontrou um erro.`, preservação integral de 100% dos dados digitados e botão "Tentar novamente" reabilitado para nova submissão voluntária pelo professor.
- **Responsividade**: Ancoragem com scroll automático até o topo do formulário para garantir visibilidade do erro no mobile.

### Frame 08: Rascunho Gerado — Editor e Pré-visualização (`docs/design/08_rascunho_editor_preview.png`)
- **Componentes**: Barra de ferramentas do plano com campo de título editável, badge `RASCUNHO`, tag `Auxílio por IA`, alternador de abas ("Editor Markdown" / "Pré-visualização"), editor com suporte a sintaxe Markdown monoespaçada, área de pré-visualização renderizada e sanitizada (sem HTML perigoso), botão "Salvar alterações", botão "Voltar".
- **Responsividade**: Desktop: suporte a abas de largura total; Mobile: abas em cabeçalho fixo com botão "Salvar" acessível em barra inferior fixa.

### Frame 09: Rascunho — Confirmação de Saída (`docs/design/09_rascunho_confirmacao_saida.png`)
- **Componentes**: Diálogo modal bloqueante com backdrop escuro (`aria-modal="true"`): título "Sair sem salvar?", texto de alerta comunicando que as alterações não salvas serão perdidas, botões "Continuar editando" (secundário) e "Sair sem salvar" (ação destrutiva / perigo). Foco acessível retido dentro do modal (focus trap) e fechamento por tecla `Escape`.
- **Responsividade**: Desktop: modal centralizado (largura 480px); Mobile: renderizado como gaveta inferior (bottom sheet) com botões com altura mínima de 48px para facilitar o toque.

---

## Scripts Raiz do Monorepo

No `package.json` raiz:
```json
{
  "name": "planejador-bncc-root",
  "private": true,
  "scripts": {
    "dev": "pnpm --parallel --filter api --filter web dev",
    "lint": "pnpm --recursive run lint",
    "typecheck": "pnpm --recursive run typecheck",
    "test": "pnpm --recursive run test",
    "test:integration": "pnpm --filter api test:integration",
    "build": "pnpm --recursive run build"
  }
}
```

---

## Complexity Tracking

> **Não há violações da Constituição nem do escopo**. Todas as decisões técnicas seguem os padrões e limites deliberados.
