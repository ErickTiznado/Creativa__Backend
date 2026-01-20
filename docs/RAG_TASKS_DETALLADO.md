# MÓDULO RAG - Guía de Implementación Detallada (Sin Código)

**Estado Actual:** 1/4 funcionalidades (25%) | **Pendientes:** 3 tareas

**Nota:** Esta guía describe pasos algorítmicos detallados. Utiliza `VectorCore` para embeddings y `Supabase RPC` para búsqueda vectorial.

---

## 📖 ÍNDICE

1. [Tarea 1: Búsqueda Semántica (Query)](#tarea-1-búsqueda-semántica-query)
2. [Tarea 2: Listado de Manuales](#tarea-2-listado-de-manuales)
3. [Tarea 3: Eliminación de Manuales](#tarea-3-eliminación-de-manuales)
4. [Orden de Implementación](#orden-sugerido-de-implementación)
5. [Consideraciones DB](#configuración-base-de-datos-requerida)
6. [Testing y Troubleshooting](#testing-y-troubleshooting)

---

## 🧠 CONCEPTOS CLAVE

### Búsqueda Vectorial (RAG)

El RAG (Retrieval Augmented Generation) recupera contexto relevante buscando similitud semántica.

```
Flujo de Búsqueda:
┌─────────────────┐       ┌──────────────┐       ┌────────────────────┐
│   Query Usuario │──────▶│ VectorCore   │──────▶│ Embedding (Vector) │
│   "Colores..."  │       │ (Vertex AI)  │       │ [0.1, 0.5, ...]    │
└─────────────────┘       └──────────────┘       └──────────┬─────────┘
                                                            │
                                                            ▼
┌─────────────────┐       ┌──────────────┐       ┌────────────────────┐
│   Resultados    │◀──────│ Supabase RPC │◀──────│ Base de Datos      │
│   (Contexto)    │       │ (Cosine Sim) │       │ (Vectores almacenados)│
└─────────────────┘       └──────────────┘       └────────────────────┘
```

---

## TAREA 1: BÚSQUEDA SEMÁNTICA (QUERY)

**Prioridad:** 🔴 CRÍTICA  
**Endpoint:** `POST /rag/query`  
**Archivos:** `src/controllers/RagController.js`, `src/routes/RagRoute.js`

### Paso 1.1: Crear Función RPC en Supabase

**Acción Requerida (SQL):**
Se necesita una función en PostgreSQL para realizar la búsqueda por similitud de cosenos.

1. **Definir función `match_brand_manual_vectors`**:
   - Parámetros: `query_embedding` (vector), `match_threshold` (float), `match_count` (int).
   - Retorno: Tabla con `id`, `content_text`, `metadata`, `similarity`.
   - Lógica: `1 - (brand_manual_vectors.embedding <=> query_embedding)`

### Paso 1.2: Implementar Método `query`

**Ubicación:** `src/controllers/RagController.js`

#### Diagrama de Flujo:

```
┌───────────────────────────┐
│ Inicio: Recibir Query     │
└─────────────┬─────────────┘
              ▼
┌───────────────────────────┐
│ Validar input (string)    │
│ ¿Query no vacío?          │
└─────────────┬─────────────┘
      NO ┌────┴────┐ SÍ
         ▼         ▼
    Error 400   ┌───────────────────────────┐
                │ Generar Embedding         │
                │ VectorCore.embed(query)   │
                └─────────────┬─────────────┘
                              ▼
                ┌───────────────────────────┐
                │ Llamar Supabase RPC       │
                │ match_brand_manual_vectors│
                └─────────────┬─────────────┘
                              ▼
                ┌───────────────────────────┐
                │ Filtrar/Formatear Resultados│
                │ Retornar JSON (Contexto)  │
                └───────────────────────────┘
```

#### Algoritmo Detallado:

1. **Extraer y validar Input**
   - Obtener `query` del body.
   - Usar `PatternBuilder` o validación simple para asegurar que `query` es string y longitud > 3 caracteres.
   - SI falla: Retornar 400 "Query inválido o muy corto".

2. **Generar Embedding del Query**
   - Iniciar bloque try-catch.
   - Llamar `VectorCore.embed(query)`.
   - Almacenar resultado en `queryEmbedding`.

3. **Ejecutar Búsqueda Vectorial**
   - Llamar `supabase.rpc('match_brand_manual_vectors', { ... })`.
   - Parámetros:
     - `query_embedding`: `queryEmbedding`
     - `match_threshold`: 0.7 (umbral de similitud sugerido)
     - `match_count`: 5 (top 5 resultados)
   - Manejar error de Supabase.

4. **Procesar Respuesta**
   - SI `data` está vacío: Retornar 200 con mensaje "No se encontró contexto relevante".
   - SI hay datos: Mapear resultados para retornar solo `content_text` y `similarity`.
   - Retornar 200 JSON con array de resultados.

5. **Manejo de Errores**
   - Catch: Loggear error y retornar 500.

---

## TAREA 2: LISTADO DE MANUALES

**Prioridad:** 🟡 MEDIA  
**Endpoint:** `GET /rag/manuals`  
**Objetivo:** Ver qué documentos han sido ingestados.

#### Algoritmo:

1. **Consultar Base de Datos**
   - Usar cliente Supabase o `BrandManualVectorsModel`.
   - Consulta: Seleccionar `metadata` de todos los registros.
   - _Consideración de Performance:_ Si hay millones de vectores, esto es lento.
   - _Mejora:_ Crear una tabla separada `manuals_index` O usar query distinct sobre metadata (lento pero funcional para MVP).
   - Query sugerida (hack MVP): `supabase.from('brand_manual_vectors').select('metadata')`.

2. **Procesar en Servidor**
   - Extraer campo `source` (nombre del archivo) de cada JSON de metadata.
   - Crear un Set para obtener nombres únicos.
   - Convertir Set a Array.

3. **Retornar Respuesta**
   - 200 OK con lista de nombres de manuales.

---

## TAREA 3: ELIMINACIÓN DE MANUALES

**Prioridad:** 🟡 MEDIA  
**Endpoint:** `DELETE /rag/manual/:filename`

#### Algoritmo:

1. **Recibir Filename**
   - Extraer `filename` de los parámetros de ruta (`req.params`).
   - Decodificar URI component (si viene con espacios/%20).

2. **Ejecutar Borrado**
   - OJO: La metadata es JSONB.
   - Query Supabase: `.delete().filter('metadata->>source', 'eq', filename)`.
   - Esto eliminará TODOS los chunks asociados a ese archivo.

3. **Confirmar Resultado**
   - Verificar `count` de filas eliminadas.
   - SI count > 0: Retornar 200 "Manual eliminado".
   - SI count == 0: Retornar 404 "Manual no encontrado".

---

## 🔒 SEGURIDAD RAG

### Inyección de Prompt (Indirecta)

El contenido recuperado del RAG se inyecta en el LLM.

- **Riesgo:** El PDF ingestadopodría contener instrucciones maliciosas ("Ignora instrucciones previas...").
- **Mitigación:** Al usar los resultados en `/ai/chat`, encerrarlos en delimitadores XML (ej: `<context>...</context>`) e instruir al modelo a tratarlo solo como datos.

### Acceso a Datos

- Aplicar middleware `requireAuth` para todos endpoints RAG.
- Aplicar `requireRole(['admin'])` para `ingestManual` y `deleteManual`.
- `query` puede ser accesible por `user`.

---

## ⚠️ QUÉ PUEDE SALIR MAL

**1. "Error RPC no encontrado"**

- Causa: No se creó la función SQL en Supabase.
- Solución: Ejecutar script SQL de creación de función.

**2. Resultados irrelevantes**

- Causa: Umbral (threshold) muy alto o embeddings de baja calidad.
- Solución: Ajustar `match_threshold` a 0.5 o 0.6. Prueba y error.

**3. Timeout en ingestión**

- Causa: PDF muy grande, Vertex AI tarda.
- Solución: Procesar en background (job queue) o limitar tamaño de archivo.

---

## ✅ CHECKLIST DE VALIDACIÓN

- [ ] Función RPC `match_brand_manual_vectors` creada en Supabase.
- [ ] Endpoint `/rag/query` retorna chunks de texto.
- [ ] Los chunks retornados tienen sentido semántico con la query.
- [ ] Endpoint `/rag/manuals` lista archivos únicos sin duplicados.
- [ ] Endpoint `/rag/manual/:filename` elimina todos los vectores del archivo.
- [ ] Roles protegidos correctamente (Ingest/Delete solo Admin).
