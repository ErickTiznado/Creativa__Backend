// src/domain/services/prompt/BrandSanitizer.js

/**
 * Servicio de Sanitización de Contexto de Marca.
 * Su objetivo es filtrar el ruido textual del RAG (misión, visión, valores abstractos)
 * y extraer únicamente señales visuales seguras (Colores, Entorno) y flags de riesgo (Tech -> Hologramas).
 */
export class BrandSanitizer {
  static clean(ragContext) {
    if (!ragContext || (!ragContext.data && !Array.isArray(ragContext))) return null;

    // 1. Aplanar todo el texto del RAG para análisis
    const dataToProcess = ragContext.data || ragContext;
    const rawText = Array.isArray(dataToProcess)
      ? dataToProcess.map((d) => d.content_text || "").join(" ")
      : JSON.stringify(dataToProcess);

    // 2. Extraer SOLO Colores Hex (Lo único que no miente)
    // Regex para capturar hex de 6 dígitos
    const colors = [...new Set(rawText.match(/#[a-fA-F0-9]{6}/g) || [])];

    // 3. Detectar "Triggers" de Alucinación y generar antídotos
    // Palabras clave que suelen confundir a los modelos generando Sci-Fi
    const techKeywords =
      /tecnología|software|digital|oracle|java|sistemas|plataforma|ciberseguridad|datos|technology|cybersecurity|\bdata\b|platform|cloud|artificial intelligence|machine learning|saas|fintech/i;
    const isTech = techKeywords.test(rawText);

    return {
      colors: colors.slice(0, 3), // Quedarnos con los 3 principales para no saturar
      // Si es tech, forzamos un entorno realista de oficina. Si no, null (dejar libertad).
      environment: isTech
        ? "Modern clean office environment, authentic commercial photography style"
        : null,
      // Flag para activar escudos anti-holograma en PromptBuilder
      requiresRealismShield: isTech,
    };
  }
}
