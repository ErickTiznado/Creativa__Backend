class ImageGeneratorRequest {
  constructor({ prompt, numberOfImages, config, brandId, campaignId }) {
    this.prompt = prompt;
    this.numberOfImages = numberOfImages;
    this.config = config;
    this.brandId = brandId;
    this.campaignId = campaignId;
    this.#validate();
  }
  #validate() {
    if (!this.prompt) {
      throw new Error("Prompt is required");
    }
    if (!this.numberOfImages) {
      throw new Error("Number of images is required");
    }
    if (!this.config) {
      throw new Error("Config is required");
    }
    if (!this.brandId) {
      throw new Error("Brand ID is required");
    }
    if (!this.campaignId) {
      throw new Error("Campaign ID is required");
    }
  }
}

export default ImageGeneratorRequest;
