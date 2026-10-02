# Quickstart & Validation Guide: Planejador BNCC

**Branch**: `docs/planejamento` | **Date**: 2026-10-02 | **Spec**: [spec.md](./spec.md)

Este guia apresenta o roteiro para execução do ambiente local, execução das suítes de testes automatizados e validação ponta a ponta dos fluxos críticos do **Planejador BNCC**.

---

## 1. Pré-requisitos do Sistema

- **Node.js**: `v20.x` ou `v24.x` LTS (detectado no ambiente: `v24.21.0`)
- **pnpm**: `v9.x` ou `v12.x` (detectado no ambiente: `12.8.1`)
- **Docker & Docker Compose**: (detectados: Docker `29.8.0`, Compose `v5.5.1`)
- **Portas locais livres**:
  - `5432`: PostgreSQL
  - `3001`: API NestJS (`apps/api`)
  - `3000`: Web Next.js (`apps/web`)

---

## 2. Preparação do Ambiente e Inicialização

### Passo 1: Inicializar o Banco de Dados Relacional
```bash
# Subir o container PostgreSQL em segundo plano
docker compose up -d postgres
```

### Passo 2: Configuração de Variáveis de Ambiente
Copiar os arquivos de exemplo para os diretórios de cada aplicação:

**Em `apps/api/.env`**:
```ini
PORT=3001
NODE_ENV=development
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/planejador_bncc?schema=public"
JWT_ACCESS_SECRET="dev-jwt-access-secret-super-seguro-trocar-em-prod"
JWT_ACCESS_EXPIRATION="15m"
REFRESH_TOKEN_EXPIRATION_DAYS=7
COOKIE_SECURE=false
CORS_ORIGIN="http://localhost:3000"

# Integração n8n (em dev/test, mock habilitado por padrão)
N8N_MOCK_ENABLED=true
N8N_TIMEOUT_MS=60000
N8N_WEBHOOK_URL="https://n8n.exemplo.com/webhook/gerar-plano"
N8N_API_KEY="dev-n8n-api-key"
```

**Em `apps/web/.env.local`**:
```ini
PORT=3000
NEXT_PUBLIC_API_URL="http://localhost:3001"
```

### Passo 3: Instalar Dependências e Executar Migrações / Seed
```bash
# Instalar dependências de todos os workspaces
pnpm install

# Gerar o client Prisma e rodar migrações
pnpm --filter api prisma migrate dev --name init

# Executar o seed idempotente (contas demo e catálogo BNCC)
pnpm --filter api seed
```

### Passo 4: Iniciar os Servidores em Modo de Desenvolvimento
```bash
# Executa simultaneamente web (:3000) e api (:3001)
pnpm dev
```

---

## 3. Comandos Raiz de Verificação e Qualidade

O repositório disponibiliza scripts unificados na raiz:

```bash
# Verificação de tipos TypeScript em todo o monorepo
pnpm typecheck

# Análise estática de código e estilos
pnpm lint

# Testes unitários (API e Web)
pnpm test

# Testes de integração (testes de endpoints, banco e mock de IA)
pnpm test:integration

# Build de produção de todos os pacotes
pnpm build
```

---

## 4. Cenários de Validação Ponta a Ponta

### Cenário 1: Autenticação com 1 Clique e Identificação Visual
1. Acessar `http://localhost:3000` no navegador.
2. A tela inicial de login exibe os botões de acesso rápido:
   - "Entrar como Profª Ana Souza" (`ana@demo.bncc.br`)
   - "Entrar como Prof. Marcos Lima" (`marcos@demo.bncc.br`)
3. Clicar no botão da **Profª Ana Souza**.
4. **Resultado Esperado**:
   - Redirecionamento imediato para `http://localhost:3000/planos`.
   - O cabeçalho exibe o nome `Profª Ana Souza` e o botão "Sair".
   - O cookie `refreshToken` é registrado com flag `HttpOnly`.

### Cenário 2: Consulta e Seleção de Habilidades BNCC
1. Clicar no botão "Novo plano" (`/planos/novo`).
2. No painel de catálogo, selecionar o filtro:
   - Nível: `Ensino Fundamental`
   - Ano: `1º ano`
3. Digitar no campo de busca: `EF01CO01`.
4. Marcar a habilidade encontrada.
5. **Resultado Esperado**:
   - Um chip com o código `EF01CO01` aparece na área de habilidades ativas com botão de remoção (`x`).

### Cenário 3: Geração com IA (Modo Mock Local) e Estado de Preparação
1. No formulário de novo plano, manter o chip `EF01CO01` selecionado.
2. Preencher os parâmetros:
   - Duração: `50` minutos
   - Usar recursos digitais: Não marcado
   - Instrução pedagógica: `Criar atividade desplugada em grupo com objetos coloridos.`
3. Clicar no botão "Gerar rascunho".
4. **Resultado Esperado**:
   - A tela transita para o estado visual de preparação ("A IA está estruturando seu plano... Isso pode levar até 60 segundos").
   - O botão é desabilitado contra cliques duplos.
   - Após a conclusão pelo mock (1-2s), a página é redirecionada para `/planos/[id]` exibindo o plano gerado em status `RASCUNHO` com a tag `Auxílio por IA`.

### Cenário 4: Edição e Pré-visualização com Salvamento Manual
1. Na tela do plano gerado, clicar na aba "Pré-visualização".
2. Constatar a renderização tipográfica limpa e segura (títulos, listas, seções).
3. Alternar para a aba "Editor Markdown".
4. Alterar o título para: `Plano de Aula: Padrões com Objetos - Turma 101`.
5. Clicar no botão "Salvar alterações".
6. **Resultado Esperado**:
   - Um toast de sucesso confirma: `Alterações salvas com sucesso.`
   - O registro atualiza no banco com novo título e novo timestamp `updatedAt`.

### Cenário 5: Verificação de Isolamento Estrito entre Professores
1. Estando autenticado como `Profª Ana Souza`, copiar a URL do plano gerado (ex.: `http://localhost:3000/planos/33333333-3333-4333-a333-333333333331`).
2. Clicar em "Sair" no cabeçalho.
3. Clicar em "Entrar como Prof. Marcos Lima".
4. Colar diretamente na barra de endereços a URL do plano da Profª Ana.
5. **Resultado Esperado**:
   - A requisição à API retorna status **`404 Not Found`**.
   - O frontend apresenta feedback de plano não encontrado e redireciona para a lista `/planos` do Prof. Marcos.
   - A lista de planos do Prof. Marcos não exibe nenhum plano da Profª Ana.

### Cenário 6: Simulação de Falha de IA e Preservação de Formulário
1. Acessar `/planos/novo`.
2. Selecionar uma habilidade e preencher os dados de duração e instrução.
3. Com o mock configurado para simular falha (ou desconectado), submeter o formulário.
4. **Resultado Esperado**:
   - Nenhum plano é salvo no banco de dados.
   - O formulário permanece com **100% dos dados preenchidos**.
   - É exibido um banner semântico de erro: `Não foi possível gerar - Nenhum plano foi salvo.`
   - O botão "Gerar rascunho" é reabilitado para nova tentativa manual.
