# Manual de Implementación: RAG y Embeddings de Imágenes

Este documento detalla la verificación del sistema RAG actual y proporciona una guía paso a paso para implementar la generación y almacenamiento de embeddings de imágenes en el sistema Creativa Backend.

## 1. Verificación del Contexto de Marca (RAG)

**Pregunta del Usuario:** ¿Estamos trayendo el RAG del manual (base de datos vectorial)?

**Respuesta:** **SÍ**.

Se ha verificado en el código fuente que el sistema consulta activamente la base de datos vectorial para obtener el contexto de marca antes de generar el prompt.

### Evidencia en el Código

Archivo: `src/controllers/GeneratorController.js`

El controlador utiliza `VectorCore.embed(brief)` para vectorizar la solicitud del usuario y consulta la colección `brand_manual_vectors`.

```javascript
// src/controllers/GeneratorController.js (Líneas aproximadas 402-407)

async getContextWithFallback(brandId, brief, requestId) {
    try {
        // 1. Vectoriza el brief del usuario
        const embedding = await VectorCore.embed(brief);

        // 2. Consulta la base de datos vectorial (VectorCore / QuerySearchService)
        const results = await brand_manual_vectors.query()
            .vector(embedding)
            .limit(3)
            .where('brandId', brandId)
            .get();

        // 3. Retorna los resultados encontrados (RAG)
        if (results && results.length > 0) {
            return {
                source: 'rag',
                relevanceScore: 0.85,
                data: this.formatRagResults(results)
            };
        }
        // ... Logica de fallback
    }
    // ...
}
```

La lógica confirma que el contexto "cocinado" en el `PromptBuilder` proviene efectivamente de una búsqueda semántica en los manuales de marca indexados.

---

## 2. Implementación de Embeddings de Imágenes

Actualmente, el sistema **NO** genera ni guarda embeddings de las imágenes generadas. El archivo `src/services/VectorCore.js` tiene la capacidad (`embedImage`), pero no se está utilizando en el flujo de guardado.

A continuación, se detallan los pasos para implementar esta funcionalidad.

### Objetivo
Permitir la búsqueda semántica de imágenes (ej: "buscar fotos con iluminación oscura") y recomendaciones basadas en similitud visual.

### Paso 1: Actualizar el Modelo de Base de Datos

Primero, debemos asegurar que la tabla `campaign_assets` y su modelo puedan almacenar el vector.

**Archivo:** `src/model/CampaignAsset.model.js`

Agrega el campo `image_embedding` al esquema. Dependiendo de la base de datos subyacente (Postgres con `pgvector` recomendado para producción), esto será un array de flotantes.

```javascript
import { Dynamo } from "nicola-framework";

export default class CampaignAsset extends Dynamo.Model {
    static tableName = "devschema.campaign_assets";

    static schema = {
        campaign_assets: { type: "string", required: true },
        img_url: { type: "object", required: true },
        prompt_used: { type: "string", required: false },
        is_approved: { type: "boolean", required: false },
        
        // [NUEVO] Campo para almacenar el vector multimodal (1408 dimensiones para multimodalembedding@001)
        image_embedding: { type: "array", required: false } 
    };
}
```

> **Nota:** Asegúrate de ejecutar cualquier migración SQL necesaria para agregar la columna `image_embedding` (tipo `vector(1408)` o `float8[]`) a tu tabla `campaign_assets` en la base de datos.

### Paso 2: Integrar Generación de Embeddings en el Controlador

Modificar el `GeneratorController` para que, al momento de procesar y subir la imagen, también genere su embedding y lo guarde.

**Archivo:** `src/controllers/GeneratorController.js`

Requerimos llamar a `VectorCore.embedImage` dentro del método auxiliar `_processAndSaveImage`.

**Código a Modificar:**

```javascript
// Asegúrate de importar VectorCore si no está ya (Línea 12)
import VectorCore from '../services/VectorCore.js';

// ...

// Método _processAndSaveImage
async _processAndSaveImage({ buffer, campaignId, prompt, parentAssetId = null }) {
    // 1. Procesamiento de imagen existente (Sharp, GCS...)
    const metadata = await sharp(buffer).metadata();
    // ... (lógica de subida a GCS) ...

    // [NUEVO] 2. Generar Embedding Multimodal
    // Generamos el embedding antes de guardar en BD. 
    // Usamos un try/catch para no bloquear el guardado de la imagen si falla el embedding.
    let embedding = null;
    try {
        console.log("Generando embedding multimodal para la imagen...");
        embedding = await VectorCore.embedImage(buffer);
    } catch (err) {
        console.error("Error generando embedding de imagen (se guardará sin vector):", err.message);
    }

    // ... (lógica de URLs) ...

    const assetData = {
        campaign_assets: finalCampaignId,
        img_url: assetJson,
        prompt_used: prompt || "",
        is_approved: true,
        parent_asset_id: parentAssetId,
        
        // [NUEVO] 3. Guardar el embedding
        image_embedding: embedding 
    };

    const newAsset = await CampaignAsset.create(assetData);
    return {
        ...assetData,
        id: newAsset?.id,
    };
}
```

### Paso 3: Verificar Funcionalidad

1.  Reinicia el servidor backend.
2.  Genera una nueva imagen desde el frontend/API.
3.  Verifica en los logs de la consola que aparezca el mensaje "Generando embedding multimodal...".
4.  Revisa la base de datos para confirmar que el registro en `campaign_assets` tiene un array de números en la columna `image_embedding`.

### (Opcional) Paso 4: Backfill de Imágenes Existentes

Para las imágenes ya creadas que no tienen embedding, se recomienda crear un script temporal que:
1.  Recorra `CampaignAsset` donde `image_embedding` es nulo.
2.  Descargue la imagen de GCS (`img_url`).
3.  Genere el embedding con `VectorCore.embedImage`.
4.  Actualice el registro en la base de datos.
