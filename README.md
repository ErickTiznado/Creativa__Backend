# Creativa Backend

Backend de Creativa: API en Node.js (ESM) basada en **Nicola Framework**, con autenticación vía **Supabase** e integraciones con **Google Cloud Vertex AI** (Gemini/embeddings) y **Google Cloud Storage**. Incluye un flujo RAG para ingerir manuales en PDF, generar embeddings y persistirlos.

## Características

- Autenticación: `POST /auth/login` (Supabase Auth + JWT firmado por el backend).
- Chat asistido por IA para completar briefs: `POST /ai/chat`.
- Persistencia de campañas (brief) en Supabase: `POST /ai/createCampaing`.
- Ingesta RAG de PDF: `POST /rag/ingestManual` (PDF → texto → chunks → embeddings → almacenamiento).

## Requisitos

- Node.js **>= 18** (recomendado LTS). 
- npm **>= 9**.
- Credenciales y proyecto de Google Cloud (Vertex AI + Storage).
- Proyecto de Supabase (Auth y tabla(s) usadas por el módulo de campañas).

## Instalación

1) Instalar dependencias

```bash
npm install
```

2) Configurar variables de entorno

- Copia `.env.example` a `.env` y completa los valores.
- Guía detallada: [docs/ENV.md](docs/ENV.md)

3) Iniciar servidor

```bash
npm start
```

Por defecto el servidor escucha en `http://localhost:3000`.

Nota: en el código actual `app.js` usa `3000` de forma fija; si necesitas que respete `PORT`, ajusta `app.listen(...)`.

## Documentación

- Variables de entorno: [docs/ENV.md](docs/ENV.md)
- API (endpoints, ejemplos cURL): [docs/API.md](docs/API.md)
- Arquitectura y flujos: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)

## Scripts

- `npm start`: levanta el servidor (`app.js`).

## Notas de operación

- Sesiones de chat: el módulo de brief mantiene estado en memoria (Map). Reiniciar el proceso borra sesiones.
- Subida de archivos: el endpoint de RAG espera `multipart/form-data` con el campo `manual`.
- Sistemas de archivos sensibles a mayúsculas (Linux): algunas importaciones usan casing distinto al nombre del archivo. En Windows funciona; en Linux puede fallar. Recomendación: normalizar casing de imports antes de desplegar.

## Troubleshooting rápido

- Error “Falta variable de entorno requerida: …”: revisa [docs/ENV.md](docs/ENV.md) y confirma rutas/valores.
- Problemas con credenciales GCP: valida `GOOGLE_APPLICATION_CREDENTIALS` apuntando al JSON del service account.
- Lockfile corrupto tras merge: regenera con `npm install --package-lock-only`.

## Contribución

- Mantén los cambios pequeños y con commits descriptivos.
- No subas secretos: `.env`, llaves, o JSON de service accounts.

## Licencia

ISC (ver `package.json`).
