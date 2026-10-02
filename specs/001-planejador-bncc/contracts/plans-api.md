# REST Contract: Plans API (`/plans`)

**Service**: `apps/api` | **Consumer**: `apps/web` | **Protocol**: HTTP/1.1 JSON

---

## 1. Visão Geral de Autorização e Isolamento

- Todas as operações exigem token de acesso válido (`Authorization: Bearer <accessToken>`).
- **Isolamento Estrito (Princípio III)**: O serviço vincula toda busca e mutação ao `userId` do usuário autenticado no JWT (`where: { id, userId }`).
- **Proteção Contra Enumeração de IDs**: Tentativas de acessar ou alterar planos de outros docentes retornam invariavelmente **`404 Not Found`**, jamais `403 Forbidden`.

---

## 2. Endpoints

### 2.1 `GET /plans`
Lista todos os rascunhos de planos de aula pertencentes exclusivamente ao professor logado, ordenados decrescentemente pela data de atualização (`updatedAt DESC`).

#### Request
- **Headers**:
  - `Authorization: Bearer <accessToken>`

#### Response: 200 OK
```json
{
  "total": 2,
  "data": [
    {
      "id": "33333333-3333-4333-a333-333333333331",
      "titulo": "Organização de Objetos e Padrões com Computação Desplugada",
      "duracao": 50,
      "recursosDigitais": false,
      "status": "RASCUNHO",
      "aiAssisted": true,
      "updatedAt": "2026-10-02T14:30:00.000Z",
      "createdAt": "2026-10-02T14:28:00.000Z",
      "habilidades": [
        {
          "codigo": "EF01CO01",
          "descricao": "Organizar objetos físicos ou digitais considerando diferentes características...",
          "eixo": "Pensamento Computacional (PC)",
          "ano": 1
        }
      ]
    },
    {
      "id": "33333333-3333-4333-a333-333333333332",
      "titulo": "Diferenciando Hardware e Software no Cotidiano",
      "duracao": 45,
      "recursosDigitais": true,
      "status": "RASCUNHO",
      "aiAssisted": true,
      "updatedAt": "2026-10-01T10:15:00.000Z",
      "createdAt": "2026-10-01T10:12:00.000Z",
      "habilidades": [
        {
          "codigo": "EF02CO04",
          "descricao": "Diferenciar componentes físicos (hardware) e programas que fornecem...",
          "eixo": "Mundo Digital (MD)",
          "ano": 2
        }
      ]
    }
  ]
}
```

---

### 2.2 `POST /plans/generate`
Solicita a geração assistida de um novo plano de aula por IA.
- Dispara execução transacional que grava `AiRun` como `PENDING`.
- Em caso de sucesso da IA dentro do timeout (60s), executa transação relacional que persiste `Plan` (`status: RASCUNHO`, `aiAssisted: true`), vínculos de habilidades e marca `AiRun` como `SUCCEEDED`.
- Em caso de timeout ou erro, marca `AiRun` como `FAILED` e não persiste nenhum registro na tabela `plans`.

#### Request
- **Headers**:
  - `Content-Type: application/json`
  - `Authorization: Bearer <accessToken>`
- **Body**:
```json
{
  "habilidadeIds": [
    "22222222-2222-4222-a222-222222222221"
  ],
  "instrucao": "Criar uma dinâmica prática em duplas usando blocos de montar.",
  "duracao": 50,
  "recursosDigitais": false
}
```

#### Regras de Validação:
- `habilidadeIds`: Array de UUIDs com no mínimo 1 item válido existente no catálogo.
- `duracao`: Número inteiro maior que zero (`duracao > 0`).
- `instrucao`: Texto com orientações pedagógicas (pode ser vazio ou texto de até 2000 caracteres).
- `recursosDigitais`: Booleano obrigatório.

#### Response: 201 Created
```json
{
  "id": "33333333-3333-4333-a333-333333333333",
  "titulo": "Organização de Objetos Físicos e Identificação de Padrões",
  "duracao": 50,
  "recursosDigitais": false,
  "instrucao": "Criar uma dinâmica prática em duplas usando blocos de montar.",
  "markdownContent": "# Plano de Aula: Identificação de Padrões e Classificação\n\n## 1. Objetivos de Aprendizagem\n- Explorar e classificar elementos cotidianos...\n\n## 2. Duração e Recursos\n- **Duração**: 50 minutos\n- **Recursos**: Blocos de montar, papéis coloridos\n\n## 3. Desenvolvimento Metodológico\n- **Introdução (10 min)**: Roda de conversa...\n- **Atividade Principal (30 min)**: Desafio em duplas...\n- **Conclusão (10 min)**: Compartilhamento...",
  "status": "RASCUNHO",
  "aiAssisted": true,
  "aiRunId": "44444444-4444-4444-a444-444444444444",
  "createdAt": "2026-10-02T14:35:00.000Z",
  "updatedAt": "2026-10-02T14:35:00.000Z",
  "habilidades": [
    {
      "id": "22222222-2222-4222-a222-222222222221",
      "codigo": "EF01CO01",
      "descricao": "Organizar objetos físicos ou digitais considerando diferentes características para esta organização, explicitando semelhanças (padrões) e diferenças.",
      "eixo": "Pensamento Computacional (PC)",
      "ano": 1
    }
  ]
}
```

#### Response: 400 Bad Request
*(Parâmetros inválidos de entrada)*
```json
{
  "statusCode": 400,
  "message": [
    "Informe pelo menos uma habilidade da BNCC.",
    "A duração da aula deve ser maior que zero minutos."
  ],
  "error": "Bad Request"
}
```

#### Response: 504 Gateway Timeout
*(Timeout de 60 segundos esgotado pelo serviço n8n)*
```json
{
  "statusCode": 504,
  "message": "O serviço de IA demorou para responder (tempo limite de 60 segundos esgotado). Nenhum plano foi salvo.",
  "errorCode": "AI_TIMEOUT",
  "error": "Gateway Timeout"
}
```

#### Response: 502 Bad Gateway
*(Erro retornado pelo webhook n8n ou falha de rede)*
```json
{
  "statusCode": 502,
  "message": "Não foi possível gerar o rascunho. O serviço externo retornou um erro inesperado. Nenhum plano foi salvo.",
  "errorCode": "AI_SERVICE_ERROR",
  "error": "Bad Gateway"
}
```

---

### 2.3 `GET /plans/:id`
Recupera o detalhe completo de um rascunho de plano de aula para edição e visualização.

#### Request
- **Headers**:
  - `Authorization: Bearer <accessToken>`

#### Response: 200 OK
```json
{
  "id": "33333333-3333-4333-a333-333333333333",
  "titulo": "Organização de Objetos Físicos e Identificação de Padrões",
  "duracao": 50,
  "recursosDigitais": false,
  "instrucao": "Criar uma dinâmica prática em duplas usando blocos de montar.",
  "markdownContent": "# Plano de Aula: Identificação de Padrões e Classificação\n\n## 1. Objetivos de Aprendizagem\n- Explorar e classificar elementos cotidianos...\n\n## 2. Duração e Recursos\n- **Duração**: 50 minutos\n- **Recursos**: Blocos de montar, papéis coloridos\n\n## 3. Desenvolvimento Metodológico\n- **Introdução (10 min)**: Roda de conversa...\n- **Atividade Principal (30 min)**: Desafio em duplas...\n- **Conclusão (10 min)**: Compartilhamento...",
  "status": "RASCUNHO",
  "aiAssisted": true,
  "aiRunId": "44444444-4444-4444-a444-444444444444",
  "createdAt": "2026-10-02T14:35:00.000Z",
  "updatedAt": "2026-10-02T14:35:00.000Z",
  "habilidades": [
    {
      "id": "22222222-2222-4222-a222-222222222221",
      "codigo": "EF01CO01",
      "descricao": "Organizar objetos físicos ou digitais considerando diferentes características para esta organização, explicitando semelhanças (padrões) e diferenças.",
      "eixo": "Pensamento Computacional (PC)",
      "ano": 1
    }
  ]
}
```

#### Response: 404 Not Found
*(Retornado caso o plano não exista OU caso pertença a outro professor)*
```json
{
  "statusCode": 404,
  "message": "Plano de aula não encontrado.",
  "error": "Not Found"
}
```

---

### 2.4 `PUT /plans/:id`
Salva alterações manuais realizadas pelo professor no título ou no conteúdo Markdown do rascunho.

#### Request
- **Headers**:
  - `Content-Type: application/json`
  - `Authorization: Bearer <accessToken>`
- **Body**:
```json
{
  "titulo": "Organização de Objetos e Padrões - Turma 101",
  "markdownContent": "# Plano de Aula Atualizado\n\n## 1. Objetivos Revistos..."
}
```

#### Regras de Validação:
- `titulo`: Texto obrigatório não vazio (`titulo.trim().length > 0`).
- `markdownContent`: Texto obrigatório não vazio (`markdownContent.trim().length > 0`).

#### Response: 200 OK
```json
{
  "id": "33333333-3333-4333-a333-333333333333",
  "titulo": "Organização de Objetos e Padrões - Turma 101",
  "duracao": 50,
  "recursosDigitais": false,
  "instrucao": "Criar uma dinâmica prática em duplas usando blocos de montar.",
  "markdownContent": "# Plano de Aula Atualizado\n\n## 1. Objetivos Revistos...",
  "status": "RASCUNHO",
  "aiAssisted": true,
  "updatedAt": "2026-10-02T14:42:00.000Z",
  "createdAt": "2026-10-02T14:35:00.000Z",
  "habilidades": [
    {
      "id": "22222222-2222-4222-a222-222222222221",
      "codigo": "EF01CO01",
      "descricao": "Organizar objetos físicos...",
      "eixo": "Pensamento Computacional (PC)",
      "ano": 1
    }
  ]
}
```

#### Response: 400 Bad Request
*(Tentativa de salvar com título ou corpo em branco)*
```json
{
  "statusCode": 400,
  "message": [
    "O título do plano não pode ficar em branco.",
    "O conteúdo em Markdown do plano não pode ficar em branco."
  ],
  "error": "Bad Request"
}
```

#### Response: 404 Not Found
*(Retornado caso o ID pertença a outro docente)*
```json
{
  "statusCode": 404,
  "message": "Plano de aula não encontrado.",
  "error": "Not Found"
}
```
