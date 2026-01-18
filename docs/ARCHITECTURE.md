# Arquitectura

## Visión general

La API está construida con **Nicola Framework** (router `Remote`, middlewares, `Regulator` para `.env`). El punto de entrada es `app.js`, que monta tres módulos principales:

- `/auth` → autenticación (Supabase)
- `/ai` → chat/brief + persistencia en Supabase
- `/rag` → ingesta RAG desde PDF y persistencia de embeddings

## Módulos

### Auth

- Ruta: `POST /auth/login`
- Controller: `src/controllers/AuthController.js`
- Cliente Supabase: `src/services/SupabaseClient.js`

Flujo:

1) Validación de request body
2) `supabase.auth.signInWithPassword(...)`
3) Se firma JWT con `Coherer.sign(...)`

### IA / Brief

- Ruta: `POST /ai/chat`
- Controller: `src/controllers/BriefChatController.js`
- Esquema/modelo: `src/shemas/chatBrief.shemaIA.js`

Características clave:

- Manejo de sesión en memoria con `Map(sessionID → { message[], data{} })`.
- El modelo puede invocar function calling para completar campos del brief.

Limitación: al reiniciar el proceso se pierde estado (sesiones).

### Persistencia de campañas

- Ruta: `POST /ai/createCampaing`
- Controller: `src/controllers/Brief_BD_save.js`

Persistencia vía Supabase en tabla `campaigns` (schema `public`).

### RAG (Ingesta de manual)

- Ruta: `POST /rag/ingestManual`
- Controller: `src/controllers/RagController.js`

Servicios:

- `src/services/PdfService.js`: valida magic number y extrae texto con `pdf-parse`.
- `src/services/ChunkingService.js`: divide texto en chunks.
- `src/services/VectorCore.js`: embeddings vía Vertex AI.
- `src/model/brand_manual_vectors.model.js`: persistencia de chunks+embeddings (Dynamo/Nicola).

Flujo:

1) Validar archivo `manual`
2) Extraer `fullText`, `totalPages`, `info`
3) Generar chunks
4) Para cada chunk: embedding → persistir contenido + metadata + embedding

## Configuración

- `src/config/index.js` centraliza configuración GCP/Supabase/servidor y valida variables requeridas.

## Consideraciones de despliegue

- **Case-sensitivity**: en Linux, imports con casing distinto al nombre real del archivo pueden fallar.
- **Secrets**: no versionar `.env` ni credenciales; usar Secret Manager/CI.
- **Escalabilidad**: el estado de sesión del chat está en memoria; para escalar horizontalmente se recomienda Redis u otra capa de estado.
