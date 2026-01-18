# Variables de entorno

Este proyecto usa variables de entorno para:

- Configuración del servidor
- Credenciales de Supabase
- Integración con Google Cloud (Vertex AI + Cloud Storage)

La forma recomendada es copiar `.env.example` a `.env`.

## Servidor

- `PORT` (opcional): puerto HTTP.
- `NODE_ENV` (opcional): `development` | `production`.
- `NICOLA_SECRET` (requerida): clave para firmar/verificar tokens (JWT) en Nicola.

Nota: actualmente `app.js` inicia el servidor en el puerto 3000 de forma fija.

> Nota: el controlador de Auth firma tokens con `Coherer.sign(...)`. Asegura que `NICOLA_SECRET` esté configurada en producción.

## Supabase

- `SUPABASE_URL` (requerida): URL del proyecto.
- `SUPABASE_KEY` (requerida): anon/public key.

> Nota: en el código actual el cliente se inicializa con `SUPABASE_URL` + `SUPABASE_KEY` (ver `src/services/SupabaseClient.js`).

## Google Cloud / Vertex AI / Storage

Requeridas por `src/config/index.js` y los módulos de IA:

- `GOOGLE_APPLICATION_CREDENTIALS` (requerida): ruta al JSON del Service Account.
  - Windows ejemplo: `C:\\ruta\\a\\service-account.json`
- `GOOGLE_PROJECT_ID` (requerida): ID del proyecto.
- `GOOGLE_LOCATION` (opcional): región (default: `us-central1`).
- `GCS_BUCKET_NAME` (requerida): nombre del bucket para assets (usado por `vertexAdapter`).
- `GCS_PUBLIC_URL` (opcional): URL pública base. Si no se define se calcula como `https://storage.googleapis.com/<bucket>`.

## Checklist de seguridad

- No commitear `.env` ni llaves (ya están ignoradas por `.gitignore`).
- Rotar claves si se filtran.
- En producción, usar secretos administrados (GitHub Actions secrets, Secret Manager, etc.).
