# MÓDULO MARKETING (BRIEFING ASSISTANT) - Guía de Implementación Detallada (Sin Código)

**Estado Actual:** 7/9 funcionalidades (77.8%) | **Pendientes:** 2 tareas

**Nota:** Esta guía describe pasos algorítmicos detallados. Utiliza Gemini 1.5 Flash con function calling para recopilar datos de campañas.

---

## 📖 ÍNDICE

1. [Tarea 1: Integración con RAG (Contexto de Marca)](#tarea-1-integración-con-rag-contexto-de-marca)
2. [Tarea 2: Generación de Imágenes con IA](#tarea-2-generación-de-imágenes-con-ia)
3. [Orden de Implementación](#orden-sugerido-de-implementación)
4. [Testing Completo](#testing-del-módulo)
5. [Troubleshooting](#troubleshooting-común)
6. [Mejores Prácticas](#mejores-prácticas-de-seguridad)

---

## 🧠 CONCEPTOS CLAVE

### Function Calling en Gemini

El function calling permite que el modelo invoque funciones definidas automáticamente cuando detecta información relevante en la conversación.

```
Flujo de Function Calling:
┌─────────────────────────────────────┐
│   Usuario: "Quiero un post para     │
│   Instagram sobre café orgánico"    │
└───────────┬─────────────────────────┘
            ▼
┌─────────────────────────────────────┐
│   Gemini analiza mensaje            │
│   Detecta: Platform, Topic          │
└───────────┬─────────────────────────┘
            ▼
┌─────────────────────────────────────┐
│   Invoca collectBriefData()         │
│   { Platform: "Instagram",          │
│     Topic: "Café orgánico" }        │
└───────────┬─────────────────────────┘
            ▼
┌─────────────────────────────────────┐
│   Backend actualiza sesión          │
│   Retorna confirmación al usuario   │
└─────────────────────────────────────┘
```

### Gestión de Sesiones

El sistema mantiene un `Map` en memoria con la estructura:

```
sessionID → {
  messages: [
    { role: "user", content: "..." },
    { role: "model", content: "..." }
  ],
  collectedData: {
    ContentType: "Post",
    Platform: "Instagram",
    ...
  }
}
```

---

## TAREA 1: INTEGRACIÓN CON RAG (CONTEXTO DE MARCA)

**Prioridad:** 🔴 CRÍTICA  
**Archivos a modificar:** 1

### Paso 1.1: Modificar Método `handleChat`

**Ubicación:** `src/controllers/BriefChatController.js`

#### Diagrama de Flujo:

```
┌─────────────────────────────────────┐
│   Inicio: Recibir mensaje usuario  │
└───────────┬─────────────────────────┘
            ▼
┌─────────────────────────────────────┐
│   Recuperar sesión existente        │
│   O crear nueva sesión              │
└───────────┬─────────────────────────┘
            ▼
┌─────────────────────────────────────┐
│   Consultar RAG con userMessage     │
│   POST /rag/query                   │
└───────────┬─────────────────────────┘
            ▼
      ┌─────────────┐
      │ ¿Contexto   │──NO──▶ Continuar sin contexto
      │ encontrado? │
      └─────┬───────┘
            │ SÍ
            ▼
┌─────────────────────────────────────┐
│   Inyectar contexto en prompt       │
│   "Contexto de marca: [chunks]"     │
└───────────┬─────────────────────────┘
            ▼
┌─────────────────────────────────────┐
│   Construir prompt completo         │
│   + System instruction              │
│   + Historial de mensajes           │
│   + Contexto de RAG                 │
│   + Datos ya recopilados            │
└───────────┬─────────────────────────┘
            ▼
┌─────────────────────────────────────┐
│   Enviar a Gemini 1.5 Flash         │
└───────────┬─────────────────────────┘
            ▼
┌─────────────────────────────────────┐
│   Procesar respuesta                │
│   Actualizar sesión                 │
│   Retornar al usuario               │
└─────────────────────────────────────┘
```

#### Algoritmo Detallado:

1. **Consultar RAG para Contexto de Marca**
   - Antes de enviar a Gemini, hacer petición interna
   - Endpoint: `POST /rag/query`
   - Body: `{ query: userMessage, match_threshold: 0.7, match_count: 3 }`
   - Almacenar respuesta en variable `ragContext`

2. **Manejar respuesta de RAG**
   - SI `ragContext` tiene datos:
     - Extraer campo `content_text` de cada resultado
     - Concatenar en un solo string separado por saltos de línea
     - Almacenar en variable `brandContext`
   - SI NO hay datos:
     - Establecer `brandContext` como cadena vacía
     - Continuar sin contexto (no es error fatal)

3. **Inyectar contexto en el prompt**
   - Modificar el system instruction para incluir:

     ```
     "Eres un asistente de marketing experto.

     CONTEXTO DE MARCA:
     [brandContext]

     Usa este contexto para mantener consistencia con la identidad de marca
     al generar respuestas y recopilar información de la campaña."
     ```

4. **Construir historial de mensajes**
   - Recuperar `session.messages` del Map
   - Agregar nuevo mensaje del usuario al final
   - Incluir system instruction con contexto de marca

5. **Enviar a Gemini**
   - Llamar a `model.generateContent()` con:
     - System instruction modificado
     - Historial completo de mensajes
     - Function declaration de `collectBriefData`

6. **Procesar respuesta normalmente**
   - Verificar si hay function call
   - Actualizar datos recopilados
   - Calcular campos faltantes
   - Retornar respuesta al usuario

---

#### ⚠️ QUÉ PUEDE SALIR MAL

**Problema 1: RAG endpoint no responde**

- **Causa:** Servicio RAG caído o timeout
- **Solución:** Implementar timeout de 2 segundos y continuar sin contexto
- **Código de manejo:**
  - Usar try-catch alrededor de la llamada a RAG
  - En catch: loggear error y establecer `brandContext = ""`
  - NO fallar toda la petición por esto

**Problema 2: Contexto de RAG demasiado largo**

- **Causa:** Muchos chunks retornados, excede límite de tokens
- **Solución:** Limitar a 3 chunks máximo (ya configurado en `match_count`)
- **Prevención:** Truncar `brandContext` a 2000 caracteres máximo

**Problema 3: Contexto irrelevante confunde al modelo**

- **Causa:** Query del usuario no relacionado con marca
- **Solución:** Usar threshold alto (0.7) para filtrar resultados poco relevantes
- **Mejora:** Agregar prefijo al query: "Información de marca sobre: [userMessage]"

**Problema 4: Latencia aumentada**

- **Causa:** Llamada adicional a RAG agrega ~200-500ms
- **Solución:** Implementar caché de contextos frecuentes
- **Optimización:** Hacer llamada a RAG en paralelo con recuperación de sesión

---

#### 📋 CHECKLIST DE VALIDACIÓN

- [ ] Llamada a `/rag/query` se ejecuta antes de Gemini
- [ ] Timeout de 2 segundos implementado
- [ ] Contexto se inyecta correctamente en system instruction
- [ ] Si RAG falla, el chat continúa funcionando
- [ ] Contexto se trunca si excede 2000 caracteres
- [ ] Respuestas del modelo reflejan identidad de marca
- [ ] Latencia total no excede 3 segundos
- [ ] Logs muestran si se usó contexto o no

---

## TAREA 2: GENERACIÓN DE IMÁGENES CON IA

**Prioridad:** 🟡 MEDIA  
**Archivos a crear:** 1 nuevo  
**Archivos a modificar:** 2

### Paso 2.1: Crear Servicio de Generación de Imágenes

**Ubicación:** `src/services/ImageGenerationService.js` **(ARCHIVO NUEVO)**

#### Algoritmo Detallado:

1. **Importar dependencias**
   - Importar `VertexAI` desde `@google-cloud/vertexai`
   - Importar configuración de GCP desde `../config`

2. **Definir método `generateImage`**
   - Parámetros:
     - `briefData`: objeto con datos del brief
     - `brandContext`: string con contexto de marca (opcional)
   - Retorno: URL de la imagen generada

3. **Construir prompt de generación**
   - Extraer campos relevantes del brief:
     - `Topic`, `KeyMessage`, `Tone`, `Platform`
   - Construir descripción detallada:

     ```
     "Genera una imagen para [Platform] sobre [Topic].
     Mensaje clave: [KeyMessage]
     Tono: [Tone]

     Estilo de marca:
     [brandContext]

     La imagen debe ser profesional, atractiva y alineada con la identidad de marca."
     ```

4. **Configurar parámetros de generación**
   - Modelo: `imagegeneration@006`
   - Parámetros:
     - `aspectRatio`: "1:1" (para Instagram/Facebook)
     - `numberOfImages`: 1
     - `sampleCount`: 1

5. **Llamar a Vertex AI Imagen**
   - Iniciar try-catch
   - Llamar a `model.generateImages()` con prompt construido
   - Obtener respuesta con imagen generada

6. **Procesar respuesta**
   - Extraer imagen en base64 de la respuesta
   - Opción A: Retornar base64 directamente
   - Opción B: Subir a Cloud Storage y retornar URL pública

7. **Manejo de errores**
   - En catch: loggear error completo
   - Retornar null o lanzar error descriptivo
   - Incluir mensaje de error amigable

---

### Paso 2.2: Crear Endpoint de Generación

**Ubicación:** `src/controllers/ImageController.js` **(ARCHIVO NUEVO)**

#### Algoritmo:

1. **Definir método `generateCampaignImage`**
   - Recibe: `req`, `res`
   - Parámetros esperados en body:
     - `briefData`: objeto con datos del brief
     - `sessionID`: para recuperar contexto (opcional)

2. **Validar datos del brief**
   - Verificar que `briefData` existe
   - Verificar campos mínimos requeridos:
     - `Topic`, `Platform`
   - SI falta alguno: retornar 400 "Datos insuficientes"

3. **Obtener contexto de marca**
   - SI `sessionID` proporcionado:
     - Recuperar sesión del Map
     - Hacer query a RAG con `briefData.Topic`
     - Obtener `brandContext`
   - SI NO: establecer `brandContext = ""`

4. **Llamar servicio de generación**
   - Importar `ImageGenerationService`
   - Llamar `generateImage(briefData, brandContext)`
   - Almacenar resultado en variable `imageUrl`

5. **Guardar referencia en BD (opcional)**
   - SI la campaña ya existe (`briefData.campaignId`):
     - Actualizar registro en tabla `campaigns`
     - Agregar campo `generated_image_url`

6. **Retornar respuesta**
   - Código 200
   - JSON con:
     - `imageUrl`: URL de la imagen generada
     - `message`: "Imagen generada exitosamente"

7. **Manejo de errores**
   - En catch: código 500
   - Mensaje: "Error al generar imagen"
   - Loggear error completo

---

### Paso 2.3: Registrar Ruta

**Ubicación:** `src/routes/chatRoutes.js`

#### Algoritmo:

1. **Importar controller**
   - Importar `ImageController` desde `../controllers/ImageController.js`

2. **Registrar ruta**
   - Método HTTP: POST
   - Path: `'/generateImage'`
   - Middleware: `requireAuth` (cuando esté implementado)
   - Handler: `ImageController.generateCampaignImage`

---

#### ⚠️ QUÉ PUEDE SALIR MAL

**Problema 1: Imagen generada no coincide con marca**

- **Causa:** Contexto de RAG insuficiente o mal formulado
- **Solución:** Mejorar prompt con más detalles específicos
- **Mejora:** Agregar ejemplos de estilo en el manual de marca

**Problema 2: Generación muy lenta (>10 segundos)**

- **Causa:** Vertex AI Imagen puede tardar 5-15 segundos
- **Solución:** Implementar generación asíncrona
- **Flujo recomendado:**
  - Retornar 202 Accepted inmediatamente
  - Procesar en background
  - Notificar al frontend vía webhook o polling

**Problema 3: Cuota de API excedida**

- **Causa:** Límites de Vertex AI Imagen
- **Solución:** Implementar rate limiting
- **Prevención:** Máximo 10 generaciones por usuario por día

**Problema 4: Imagen inapropiada generada**

- **Causa:** Prompt mal construido o contenido sensible
- **Solución:** Implementar filtros de contenido
- **Prevención:** Usar safety settings de Vertex AI

---

#### 📋 CHECKLIST DE VALIDACIÓN

- [ ] Servicio `ImageGenerationService` creado
- [ ] Prompt incluye contexto de marca
- [ ] Parámetros de generación configurados correctamente
- [ ] Endpoint `/generateImage` funciona
- [ ] Imágenes se generan en formato correcto
- [ ] URLs de imágenes son accesibles
- [ ] Errores se manejan apropiadamente
- [ ] Tiempo de generación es aceptable (<15s)
- [ ] Rate limiting implementado
- [ ] Imágenes se guardan en Cloud Storage (opcional)

---

## ORDEN SUGERIDO DE IMPLEMENTACIÓN

### Secuencia Óptima:

1. **DÍA 1-2:** TAREA 1 - Integración con RAG
   - Razón: Mejora inmediata en calidad de respuestas
   - Modificar `BriefChatController.js`
   - Implementar consulta a RAG
   - Testing con diferentes queries

2. **DÍA 3-5:** TAREA 2 - Generación de Imágenes
   - Razón: Funcionalidad nueva, requiere más tiempo
   - Crear `ImageGenerationService.js`
   - Crear `ImageController.js`
   - Configurar Vertex AI Imagen
   - Testing de generación

3. **DÍA 6:** Testing Integral
   - Probar flujo completo: Chat → Brief → Imagen
   - Verificar consistencia de marca
   - Optimizar prompts

---

## TESTING DEL MÓDULO

### Test 1: Chat con Contexto de Marca

**Pasos:**

1. Ingestar manual de marca con `/rag/ingestManual`
2. Iniciar chat con `POST /ai/chat`
3. Enviar mensaje: "Quiero una campaña de café"
4. Verificar que respuesta menciona elementos del manual
5. Completar brief conversacionalmente
6. Guardar campaña

**Resultado esperado:**

- Respuestas alineadas con identidad de marca
- Datos recopilados correctamente
- Campaña guardada en BD

### Test 2: Generación de Imagen

**Pasos:**

1. Completar un brief mediante chat
2. Llamar `POST /ai/generateImage` con `briefData`
3. Esperar respuesta (puede tardar 10-15s)
4. Verificar que imagen se generó
5. Validar que imagen refleja el brief

**Resultado esperado:**

- Imagen generada exitosamente
- URL accesible
- Imagen visualmente coherente con brief

---

## TROUBLESHOOTING COMÚN

### Problema: "Contexto de RAG no se aplica"

**Causa:** Query a RAG no retorna resultados relevantes  
**Solución:**

- Verificar que manual de marca está ingestado
- Revisar threshold (bajar a 0.5 si es necesario)
- Mejorar query agregando contexto: "Información de marca sobre: [topic]"

### Problema: "Imágenes genéricas, no reflejan marca"

**Causa:** Contexto de marca no se inyecta en prompt de imagen  
**Solución:**

- Verificar que `brandContext` se pasa a `generateImage()`
- Mejorar prompt con más detalles específicos
- Agregar ejemplos visuales en manual de marca

### Problema: "Generación de imagen falla con error 429"

**Causa:** Cuota de API excedida  
**Solución:**

- Implementar rate limiting
- Usar caché para imágenes similares
- Considerar plan de mayor cuota

---

## MEJORES PRÁCTICAS DE SEGURIDAD

1. **Validar inputs del usuario**
   - Sanitizar mensajes antes de enviar a Gemini
   - Prevenir inyección de prompts maliciosos
   - Limitar longitud de mensajes (máx 1000 caracteres)

2. **Proteger endpoints**
   - Aplicar `requireAuth` a todas las rutas
   - Implementar rate limiting por usuario
   - Loggear todas las generaciones de imágenes

3. **Gestión de sesiones**
   - Implementar TTL de 1 hora para sesiones inactivas
   - Limpiar sesiones antiguas periódicamente
   - Migrar a Redis para producción

4. **Costos de API**
   - Monitorear uso de Gemini y Vertex AI Imagen
   - Establecer límites por usuario
   - Alertar si costos exceden presupuesto

---

**Fin del Documento**
