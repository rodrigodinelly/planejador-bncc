# REST Contract: Authentication API (`/auth`)

**Service**: `apps/api` | **Consumer**: `apps/web` | **Protocol**: HTTP/1.1 JSON + HttpOnly Cookies

---

## 1. Visão Geral de Segurança

- **Access Token**: JWT com validade de 15 minutos, emitido no corpo JSON e mantido exclusivamente em memória no cliente frontend.
- **Refresh Token**: Cadeia criptograficamente aleatória mantida em cookie `HttpOnly`, `SameSite=Lax`, com validade de 7 dias. O backend persiste exclusivamente o hash do token.
  - *Ambiente de Produção*: Flag `Secure: true`.
  - *Ambiente Localhost*: Flag `Secure: false` (configurável via `COOKIE_SECURE=false`) para viabilizar testes em `http://localhost:3000` e `http://localhost:3001`.
- **Proteção CSRF**: Endpoints que operam sobre cookies (`/auth/refresh` e `/auth/logout`) exigem a presença do cabeçalho customizado `x-requested-with: XMLHttpRequest` (ou token CSRF correspondente).

---

## 2. Endpoints

### 2.1 `POST /auth/login`
Autentica o professor utilizando credenciais cadastradas (ou pelos botões de 1 clique das contas de demonstração).

#### Request
- **Headers**: `Content-Type: application/json`
- **Body**:
```json
{
  "email": "ana@demo.bncc.br",
  "password": "demo123"
}
```

#### Response: 200 OK
- **Set-Cookie**:
  ```http
  Set-Cookie: refreshToken=d6b8f...; HttpOnly; Path=/auth; SameSite=Lax; Max-Age=604800
  ```
- **Body**:
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsIn...",
  "user": {
    "id": "11111111-1111-4111-a111-111111111111",
    "email": "ana@demo.bncc.br",
    "name": "Profª Ana Souza",
    "role": "PROFESSOR"
  }
}
```

#### Response: 401 Unauthorized
```json
{
  "statusCode": 401,
  "message": "Credenciais inválidas. Verifique seu e-mail e senha.",
  "error": "Unauthorized"
}
```

---

### 2.2 `POST /auth/refresh`
Renova o Access Token em memória utilizando o Refresh Token presente no cookie `HttpOnly`.

#### Request
- **Headers**:
  - `x-requested-with: XMLHttpRequest`
- **Cookies**: `refreshToken=<token>`

#### Response: 200 OK
- **Set-Cookie**:
  ```http
  Set-Cookie: refreshToken=<novo_token_rotacionado>; HttpOnly; Path=/auth; SameSite=Lax; Max-Age=604800
  ```
- **Body**:
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsIn...",
  "user": {
    "id": "11111111-1111-4111-a111-111111111111",
    "email": "ana@demo.bncc.br",
    "name": "Profª Ana Souza",
    "role": "PROFESSOR"
  }
}
```

#### Response: 401 Unauthorized
*(Quando o cookie estiver ausente, expirado ou revogado no banco)*
```json
{
  "statusCode": 401,
  "message": "Sessão expirada. Faça login novamente.",
  "error": "Unauthorized"
}
```

---

### 2.3 `POST /auth/logout`
Encerra a sessão do professor, revoga o Refresh Token no banco de dados e limpa o cookie no cliente.

#### Request
- **Headers**:
  - `x-requested-with: XMLHttpRequest`
  - `Authorization: Bearer <accessToken>` (opcional)
- **Cookies**: `refreshToken=<token>`

#### Response: 200 OK
- **Set-Cookie**:
  ```http
  Set-Cookie: refreshToken=; HttpOnly; Path=/auth; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT
  ```
- **Body**:
```json
{
  "success": true,
  "message": "Sessão encerrada com sucesso."
}
```

---

### 2.4 `GET /auth/me`
Retorna os dados do professor autenticado atualmente.

#### Request
- **Headers**:
  - `Authorization: Bearer <accessToken>`

#### Response: 200 OK
```json
{
  "id": "11111111-1111-4111-a111-111111111111",
  "email": "ana@demo.bncc.br",
  "name": "Profª Ana Souza",
  "role": "PROFESSOR"
}
```

#### Response: 401 Unauthorized
```json
{
  "statusCode": 401,
  "message": "Token de acesso inválido ou expirado.",
  "error": "Unauthorized"
}
```
