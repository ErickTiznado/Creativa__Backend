const MIN_PROMPT_LENGTH = 10;
const MAX_IMAGES = 4;

class ImageGeneratorRequest {
  constructor({
    prompt,
    numberOfImages = 1,
    config = null,
    brandId,
    campaignId,
    style = null,
    context = null,
  }) {
    this.prompt = prompt;
    this.numberOfImages = numberOfImages;
    this.config = config;
    this.brandId = brandId;
    this.campaignId = campaignId;
    this.style = style;
    this.context = context;
    this.#validate();
  }

  #validate() {
    if (!this.prompt) {
      throw new Error("Prompt is required.");
    }
    if (this.prompt.length < MIN_PROMPT_LENGTH) {
      throw new Error(
        `Prompt must be at least ${MIN_PROMPT_LENGTH} characters. Provide a more descriptive prompt.`,
      );
    }

    if (!Number.isInteger(this.numberOfImages)) {
      throw new Error("numberOfImages must be a valid integer.");
    }
    if (this.numberOfImages < 1 || this.numberOfImages > MAX_IMAGES) {
      throw new Error(`numberOfImages must be between 1 and ${MAX_IMAGES}.`);
    }

    // brandId is optional now that storage paths use campaignId
    // if (!this.brandId) {
    //   throw new Error("Brand ID is required.");
    // }
    if (!this.campaignId) {
      throw new Error("Campaign ID is required.");
    }
  }
}

export default ImageGeneratorRequest;
