# REST Contract: BNCC Catalog API (`/bncc`)

**Service**: `apps/api` | **Consumer**: `apps/web` | **Protocol**: HTTP/1.1 JSON

---

## 1. Visão Geral

Disponibiliza os endpoints de consulta ao catálogo canônico de habilidades da BNCC.
- Todas as rotas deste recurso exigem autenticação (`Authorization: Bearer <accessToken>`).
- Suporta filtros por nível de ensino, ano escolar, eixo temático e busca textual combinada por código ou descrição.

---

## 2. Endpoints

### 2.1 `GET /bncc/habilidades`
Lista habilidades da BNCC aplicando filtros e busca textual.

#### Request
- **Headers**:
  - `Authorization: Bearer <accessToken>`
- **Query Parameters**:
  - `search` (opcional, string): Busca textual insensível a maiúsculas/minúsculas sobre `codigo` e `descricao`.
  - `nivel` (opcional, string): Filtro exato por nível de ensino (ex.: `Ensino Fundamental`).
  - `ano` (opcional, integer): Filtro por ano escolar (ex.: `1`, `2`).
  - `eixo` (opcional, string): Filtro por eixo temático (ex.: `Pensamento Computacional (PC)`).

#### Response: 200 OK
```json
{
  "total": 5,
  "data": [
    {
      "id": "22222222-2222-4222-a222-222222222221",
      "codigo": "EF01CO01",
      "nivel": "Ensino Fundamental",
      "ano": 1,
      "eixo": "Pensamento Computacional (PC)",
      "descricao": "Organizar objetos físicos ou digitais considerando diferentes características para esta organização, explicitando semelhanças (padrões) e diferenças.",
      "explicacao": "Objetos de um mesmo conjunto podem ser organizados...",
      "exemplos": "O professor pode pedir que os alunos organizem..."
    },
    {
      "id": "22222222-2222-4222-a222-222222222222",
      "codigo": "EF01CO02",
      "nivel": "Ensino Fundamental",
      "ano": 1,
      "eixo": "Pensamento Computacional (PC)",
      "descricao": "Identificar e seguir sequências de passos aplicados no dia a dia para resolver problemas.",
      "explicacao": "O objetivo é que os alunos possam identificar passos...",
      "exemplos": "O professor pode fornecer sequências de passos..."
    }
  ]
}
```

---

### 2.2 `GET /bncc/habilidades/:id`
Recupera o detalhe completo de uma habilidade da BNCC pelo identificador.

#### Request
- **Headers**:
  - `Authorization: Bearer <accessToken>`

#### Response: 200 OK
```json
{
  "id": "22222222-2222-4222-a222-222222222221",
  "codigo": "EF01CO01",
  "nivel": "Ensino Fundamental",
  "ano": 1,
  "eixo": "Pensamento Computacional (PC)",
  "descricao": "Organizar objetos físicos ou digitais considerando diferentes características para esta organização, explicitando semelhanças (padrões) e diferenças.",
  "explicacao": "Objetos de um mesmo conjunto podem ser organizados...",
  "exemplos": "O professor pode pedir que os alunos organizem..."
}
```

#### Response: 404 Not Found
```json
{
  "statusCode": 404,
  "message": "Habilidade não encontrada no catálogo da BNCC.",
  "error": "Not Found"
}
```
