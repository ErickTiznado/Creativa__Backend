class Storageport {
  async uploadFile(mainBuffer, thumbnailBuffer, context) {
    throw new Error("Method 'uploadFile' must be implemented.");
  }
  async approveAsset(main, thumb) {
    throw new Error("Method 'approveAsset' must be implemented.");
  }
  async deleteAsset(assetId) {
    throw new Error("Method 'deleteAsset' must be implemented.");
  }
  async syncLocalFallbacks() {
    throw new Error("Method 'syncLocalFallbacks' must be implemented.");
  }
}

export default Storageport;
