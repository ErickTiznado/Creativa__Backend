# API

Base URL (local): `http://localhost:3000`

## Health

### GET /

Respuesta:

```json
{ "message": "Bienvenido a Creativa" }
```

## Auth

### POST /auth/login

Autentica contra Supabase y devuelve un JWT firmado por el backend.

Body (JSON):

```json
{ "email": "user@example.com", "password": "secret" }
```

Respuesta 200:

```json
{
  "message": "Login exitoso",
  "token": "<jwt>",
  "user": { "id": "<uuid>", "email": "user@example.com" }
}
```

Errores comunes:

- 400: faltan `email`/`password`
- 401: credenciales inválidas
- 500: error interno

cURL:

```bash
curl -X POST "http://localhost:3000/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"user@example.com\",\"password\":\"secret\"}"
```

### POST /auth/register

Endpoint reservado (actualmente devuelve “pendiente”).

## IA (Brief)

### POST /ai/chat

Chat para recolectar los campos del brief. Mantiene sesión en memoria mediante `sessionID`.

Body (JSON):

```json
{ "sessionID": "abc123", "userMessage": "Quiero una campaña para café orgánico" }
```

Respuesta (ejemplo):

```json
{
  "type": "message",
  "text": "...",
  "collectedData": { "ContentType": "..." },
  "missingFields": ["Topic", "Objective"]
}
```

Notas:

- Si el modelo realiza un function-call, el API responde con `type: "data_collected"`.
- `missingFields` se calcula contra un esquema base (campos esperados).

cURL:

```bash
curl -X POST "http://localhost:3000/ai/chat" \
  -H "Content-Type: application/json" \
  -d "{\"sessionID\":\"abc123\",\"userMessage\":\"Hola\"}"
```

### POST /ai/createCampaing

Crea (o intenta actualizar) una campaña en Supabase.

Body (JSON):

```json
{ "data": { "ContentType": "..." }, "idCampaing": null }
```

Notas:

- En el flujo actual, `idCampaing` se usa para validar si existe un registro a actualizar.

## RAG

### POST /rag/ingestManual

Ingiere un manual de marca en PDF:

1) Extrae texto (`pdf-parse`)
2) Divide en chunks
3) Genera embeddings (Vertex AI)
4) Persiste vectores (Dynamo/Nicola)

Request: `multipart/form-data`

- Campo archivo: `manual`

cURL:

```bash
curl -X POST "http://localhost:3000/rag/ingestManual" \
  -F "manual=@./manual.pdf"
```

Respuesta:

- 200: texto plano indicando éxito o éxito parcial
- 400: falta el archivo
- 500: error procesando PDF
