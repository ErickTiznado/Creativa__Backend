class StoragePort {
  async uploadFile(mainBuffer, thumbnailBuffer, context) {
    throw new Error("Not implemented");
  }
  async approveAsset(main, thumb) {
    throw new Error("Not implemented");
  }
  async deleteAsset(main, thumb) {
    throw new Error("Not implemented");
  }
  async syncLocalFallbacks() {
    throw new Error("Not implemented");
  }
}

export default StoragePort;
