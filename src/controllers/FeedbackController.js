import { supabase } from "../services/SupabaseClient.js";

/**
 * Catálogo de tipos de incidencias permitidas.
 * Actúa como lista blanca (whitelist) para validar los reportes de calidad.
 */
const ISSUE_TYPES = [
  'HALLUCINATION',
  'BAD_HANDS',
  'WRONG_COLOR',
  'WRONG_COMPOSITION',
  'LOW_QUALITY',
  'TEXT_ERROR',
  'ANATOMICAL_ERROR',
  'STYLE_MISMATCH',
  'OTHER'
];

/**
 * Controlador para registrar o actualizar la calificación (rating) de un asset.
 * Implementa lógica de "Upsert" para evitar duplicidad de votos por usuario.
 */
export const submitRating = async (req, res) => {
  try {
    // Extracción de parámetros del cuerpo de la solicitud
    let { imageId, rating } = req.body;
    
    // Recuperación del ID del usuario desde el token decodificado (inyectado por AuthMiddleware)
    // Soporta tanto 'id' como 'userId' para compatibilidad con diferentes estructuras de payload
    const userId = req.user ? (req.user.id || req.user.userId) : null;

    // --- 1. Sanitización y Validación de Entradas ---

    // Validación de integridad: El ID del asset es obligatorio para la asociación
    if (!imageId) {
      res.statusCode = 400;
      return res.json({ error: "El ID del asset (imageId) es obligatorio" });
    }
    
    // Validación de seguridad: Se requiere contexto de usuario autenticado
    if (!userId) {
      res.statusCode = 401;
      return res.json({ error: "Usuario no autenticado" });
    }

    // Normalización de tipos: Asegura que el rating sea numérico antes de validar
    // Esto previene errores si el frontend envía "5" como string
    rating = parseInt(rating);

    // Validación de dominio: El rating debe ser un entero dentro del rango establecido (1-5)
    if (isNaN(rating) || rating < 1 || rating > 5) {
      res.statusCode = 400;
      return res.json({ error: "El rating debe ser un número entero entre 1 y 5" });
    }

    // --- 2. Verificación de Integridad Referencial (Opcional) ---
    // Consulta ligera para asegurar que el asset objetivo existe en la base de datos
    // Evita inconsistencias de datos huérfanos
    const { data: assetData, error: assetError } = await supabase
      .schema('devschema')
      .from('campaign_assets')
      .select('id')
      .eq('id', imageId)
      .single();

    if (assetError || !assetData) {
      res.statusCode = 404;
      return res.json({ error: "El asset (imagen) no existe o no se encuentra disponible" });
    }

    // --- 3. Persistencia de Datos (Upsert) ---
    // Utiliza 'upsert' para manejar la idempotencia:
    // - Si no existe registro para (user_id, asset_id), lo crea.
    // - Si ya existe, actualiza el rating existente.
    const { data: logData, error: logError } = await supabase
      .schema('devschema')
      .from('feedback_logs')
      .upsert({ 
        asset_id: imageId,
        user_id: userId,
        rating: rating,
        created_at: new Date() // Actualiza la marca de tiempo de la última interacción
      }, { onConflict: 'user_id, asset_id' }) // Dependencia de restricción UNIQUE en BD
      .select();

    if (logError) {
      console.error("Error crítico en persistencia (Supabase):", logError);
      res.statusCode = 500;
      return res.json({ error: "Error interno al procesar la calificación" });
    }

    // Respuesta exitosa con los datos actualizados
    res.statusCode = 201;
    res.json({
      message: "Calificación procesada exitosamente",
      data: logData[0]
    });

  } catch (error) {
    // Captura de excepciones no controladas para evitar caídas del servicio
    console.error("Excepción no controlada en submitRating:", error);
    res.statusCode = 500;
    res.json({ error: "Error interno del servidor" });
  }
};

/**
 * Controlador para reportar problemas cualitativos (issues) sobre un asset.
 * Incluye validaciones estrictas de tipos de error y saneamiento de descripciones.
 */
export const reportIssue = async (req, res) => {
  try {
    // Extracción de datos del payload
    let { imageId, issueType, description } = req.body;

    const userId = req.user ? (req.user.id || req.user.userId) : null;

    // --- 1. Validaciones de Seguridad y Formato ---

    if (!imageId) {
      res.statusCode = 400;
      return res.json({ error: "ID de imagen obligatorio" });
    }

    if (!userId) {
      res.statusCode = 401;
      return res.json({ error: "Usuario no autenticado" });
    }

    if (!issueType) {
      res.statusCode = 400;
      return res.json({ error: "El tipo de issue es obligatorio" });
    }

    // Normalización: Convierte a mayúsculas y elimina espacios para asegurar coincidencia exacta
    issueType = issueType.toUpperCase().trim();

    // Validación de lista blanca: Verifica que el tipo de error pertenezca al catálogo permitido
    if (!ISSUE_TYPES.includes(issueType)) {
      res.statusCode = 400;
      return res.json({
        error: "Categoría de issue no válida",
        validTypes: ISSUE_TYPES
      });
    }

    // Validación condicional: La categoría 'OTHER' exige una descripción detallada
    if (issueType === 'OTHER' && !description) {
      res.statusCode = 400;
      return res.json({ error: "Se requiere una descripción detallada para la categoría OTHER" });
    }

    // Seguridad: Limitación de longitud para mitigar vectores de ataque (DoS/Spam)
    if (description && description.length > 500) {
      res.statusCode = 400;
      return res.json({ error: "La descripción excede el límite permitido de 500 caracteres" });
    }

    // --- 2. Verificación de Existencia del Recurso ---
    const { data: assetData, error: assetError } = await supabase
      .schema('devschema')
      .from('campaign_assets')
      .select('id')
      .eq('id', imageId)
      .single();

    if (assetError || !assetData) {
      res.statusCode = 404;
      return res.json({ error: "Recurso no encontrado (Imagen inexistente)" });
    }

    // --- 3. Persistencia del Reporte ---
    // Actualiza el registro existente agregando los detalles del error cualitativo.
    // Mantiene el rating si ya existía previamente.
    const { data: logData, error: logError } = await supabase
      .schema('devschema')
      .from('feedback_logs')
      .upsert({
        asset_id: imageId,
        user_id: userId,
        error_type: issueType,        // Mapeo directo al campo de la BD
        comment: description || null, // Almacena descripción si existe
        // status: 'PENDING',         // Descomentar si se implementa flujo de revisión manual
        created_at: new Date()
      }, { onConflict: 'user_id, asset_id' })
      .select();

    if (logError) {
      console.error("Error crítico en persistencia (Supabase):", logError);
      res.statusCode = 500;
      return res.json({ error: "Fallo al registrar el reporte de incidencia" });
    }

    // Confirmación de operación exitosa
    res.statusCode = 201;
    res.json({
      message: "Reporte de incidencia registrado correctamente",
      issueId: logData[0].id,
      issueType: issueType
    });

  } catch (error) {
    console.error("Excepción no controlada en reportIssue:", error);
    res.statusCode = 500;
    res.json({ error: "Error interno del servidor" });
  }
};