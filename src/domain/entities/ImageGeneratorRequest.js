class ImageGeneratorRequest {
  constructor({ 
    prompt, 
    numberOfImages, 
    config, 
    brandId, 
    campaignId, 
    style, 
    methodToUse, 
    referenceImageURLs, 
    referenceType,
    resolution, // Nuevo parámetro de la v2.0
    logoType    // Nuevo parámetro de la v2.0
  }) {
    if (!prompt) {
      throw new Error("El prompt es requerido para generar la imagen.");
    }

    this.prompt = prompt;
    this.numberOfImages = numberOfImages || 1;
    this.config = config || {};
    this.brandId = brandId;
    this.campaignId = campaignId;
    this.style = style;
    this.referenceImageURLs = referenceImageURLs || null;
    this.referenceType = referenceType || 'style'; // 'style' o 'subject'

    // Lo guardamos en la entidad. Si viene vacío, por defecto es 'sharp'
    this.methodToUse = methodToUse || 'sharp';

    // --- NUEVOS CAMPOS V2.0 ---
    // Si no viene resolución, le clavamos 1080x1080 por defecto para que no truene
    this.resolution = resolution || '1080x1080'; 
    
    // Puede ser 'Creativa', 'Visible' o 'Ninguno'. Le dejamos 'Creativa' de default por compatibilidad con la v1
    this.logoType = logoType || 'Creativa'; 
  }
}

export default ImageGeneratorRequest;