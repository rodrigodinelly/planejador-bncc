# Integration Contract: n8n Workflow Client

**Client**: `apps/api` (AiModule / N8nClientService) | **Target**: n8n Webhook Workflow | **Protocol**: HTTP/1.1 POST JSON

---

## 1. Visão Geral

Este documento define o contrato de integração entre o backend do **Planejador BNCC** e o workflow de Inteligência Artificial hospedado no **n8n**, em estrita conformidade com o documento base [`docs/contracts/n8n.md`](file:///docs/contracts/n8n.md).

O frontend da aplicação web **NUNCA** acessa diretamente o n8n e não tem visibilidade da URL nem das chaves de API (`Princípio II - Isolamento de Segredos`).

---

## 2. Configurações e Variáveis de Ambiente

| Variável | Tipo | Padrão | Descrição |
|---|---|---|---|
| `N8N_WEBHOOK_URL` | URL | `""` | URL pública ou interna do webhook do workflow n8n. |
| `N8N_API_KEY` | String | `""` | Chave de autenticação enviada no header HTTP `x-api-key`. |
| `N8N_TIMEOUT_MS` | Número | `60000` | Tempo limite da chamada em milissegundos (60 segundos). |
| `N8N_MOCK_ENABLED` | Booleano | `true` (dev/test) | Quando `true`, desvia as chamadas para o Mock determinístico local sem consumir cotas do n8n. |

---

## 3. Especificação da Chamada HTTP

### 3.1 Headers da Requisição
```http
POST /webhook/gerar-plano-bncc HTTP/1.1
Host: [n8n-host]
Content-Type: application/json
x-api-key: [N8N_API_KEY]
x-request-id: [UUID v4 gerado para correlação e auditoria]
```

### 3.2 Payload da Requisição (`N8nGenerateRequestDto`)

```json
{
  "sessao": "ana@demo.bncc.br",
  "habilidade": "EF01CO01 — Organizar objetos físicos ou digitais considerando diferentes características para esta organização, explicitando semelhanças (padrões) e diferenças.",
  "instrucao": "Criar uma dinâmica prática em duplas usando blocos de montar.",
  "duracao": 50,
  "recursos_digitais": false
}
```

#### Regras de Mapeamento dos Campos:
1. `sessao` (string): Preenchido obrigatoriamente com o e-mail do professor autenticado (`currentUser.email`).
2. `habilidade` (string):
   - Se 1 habilidade selecionada: formato `"CODIGO — descrição oficial"`.
   - Se múltiplas habilidades selecionadas: itens concatenados com quebra de linha (`\n`), mantendo o formato `"CODIGO — descrição oficial"`.
3. `instrucao` (string): Texto livre digitado pelo professor.
4. `duracao` (number): Número inteiro positivo representando os minutos.
5. `recursos_digitais` (boolean): Booleano indicando presença de tecnologias digitais.

---

## 4. Especificação da Resposta

### 4.1 Resposta de Sucesso (`N8nGenerateResponseDto`)
- **Status HTTP**: `200 OK`
- **Body**:
```json
{
  "success": true,
  "sessao": "ana@demo.bncc.br",
  "habilidade": "EF01CO01 — Organizar objetos físicos ou digitais considerando diferentes características para esta organização, explicitando semelhanças (padrões) e diferenças.",
  "answer": "# Plano de Aula: Identificação de Padrões\n\n## 1. Objetivos\n...",
  "format": "markdown"
}
```

### 4.2 Schema de Validação Estrita (Zod)
Antes de processar qualquer persistência, a resposta recebida é submetida ao validador:
```typescript
export const N8nResponseSchema = z.object({
  success: z.literal(true),
  sessao: z.string().min(1),
  habilidade: z.string().min(1),
  answer: z.string().min(10, "Conteúdo do plano gerado insuficiente"),
  format: z.literal('markdown')
});
```
Se a validação falhar (ex: `success: false`, campo ausente ou formato incorreto), a chamada é considerada com falha (`AI_VALIDATION_ERROR`).

---

## 5. Política de Execução e Tolerância a Falhas

1. **Timeout**: A requisição utiliza `AbortController` com cancelamento estrito em `N8N_TIMEOUT_MS` (60.000 ms). Ao expirar, lança `AiTimeoutException`.
2. **Sem Retentativa Automática**: **Zero retries** (`retries: 0`). O backend não dispara nova requisição em caso de falha de rede ou timeout, cabendo a decisão de retentativa exclusivamente ao professor.
3. **Fronteira Transacional**:
   - Criação inicial de `AiRun` com status `PENDING` e payload auditável.
   - Sucesso da chamada e validação: Transação Prisma atômica:
     - `AiRun` -> `SUCCEEDED` (com `responsePayload`).
     - Criação de `Plan` (`status: RASCUNHO`, `aiAssisted: true`).
     - Criação das associações `PlanHabilidade`.
   - Falha ou Timeout:
     - `AiRun` -> `FAILED` (com `errorMessage`).
     - **Nenhum `Plan` criado**. A API responde com erro semântico (502 ou 504), permitindo que a interface web preserve 100% dos dados informados no formulário.

---

## 6. Adaptador Mock Local (`N8nMockAdapter`)

Para garantir testes determinísticos, execução offline e ausência de consumo da cota do n8n em desenvolvimento local:
- O adaptador gera respostas válidas e consistentes no formato esperado pelo schema.
- Permite configurar tempo de resposta artificial (ex.: 1000ms a 2000ms) para validação da transição de UI (estado de preparação).
- Permite forçar cenários de falha determinísticos através de cabeçalhos de teste ou flags de ambiente (`MOCK_FORCE_TIMEOUT=true` ou `MOCK_FORCE_ERROR=true`) para testes automatizados.
