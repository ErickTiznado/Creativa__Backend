
class ImageGeneratorPort {
    async generateImages(prompt, options) {
        throw new Error("Method 'generateImages' must be implemented.");
    }

    async editImage(baseImageURL, maskImageUrl, prompt, options) {
        throw new Error("Method 'editImage' must be implemented.");
    }
}

export default ImageGeneratorPort;