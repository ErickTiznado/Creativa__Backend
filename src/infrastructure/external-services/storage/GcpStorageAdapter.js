import Storageport from "../../../application/ports/StoragePort.js";
import fs from "fs/promises";
import path from "path";

class GcpStorageAdapter extends Storageport {
  constructor(bucket) {
    super();
    this.bucket = bucket;
  }
  async uploadFile(mainBuffer, thumbnailBuffer, context) {
    const timestamp = Date.now();
    const { brandId, campaignId } = context;
    const fileName = `drafts/${brandId}/${campaignId}/${timestamp}.png`;
    const thumbnailFileName = `drafts/${brandId}/${campaignId}/${timestamp}_thumb.png`;
    try {
      const [mainFile, thumbnailFile] = await Promise.all([
        this.bucket.file(fileName).save(mainBuffer, {
          metadata: {
            contentType: "image/png",
          },
        }),
        this.bucket.file(thumbnailFileName).save(thumbnailBuffer, {
          metadata: {
            contentType: "image/png",
          },
        }),
      ]);
      return {
        fileName,
        thumbnailFileName,
        status: "gcp",
      };
    } catch (error) {
      const localFileName = path.join("local-storage", fileName);
      const localThumbnailFileName = path.join(
        "local-storage",
        thumbnailFileName,
      );
      await fs.mkdir(path.dirname(localFileName), { recursive: true });
      await fs.writeFile(localFileName, mainBuffer);
      await fs.writeFile(localThumbnailFileName, thumbnailBuffer);
      return {
        fileName,
        thumbnailFileName,
        status: "local",
      };
    }
  }
  async approveAsset(main, thumb) {
    const mainFile = this.bucket.file(main);
    const thumbnailFile = this.bucket.file(thumb);
    const mainApproved = main.replace("drafts", "approved");
    const thumbnailApproved = thumb.replace("drafts", "approved");
    await Promise.all([
      mainFile.move(mainApproved),
      thumbnailFile.move(thumbnailApproved),
    ]);

    return {
      mainApproved,
      thumbnailApproved,
    };
  }
  async deleteAsset(main, thumb) {
    try {
      const mainFile = this.bucket.file(main);
      const thumbnailFile = this.bucket.file(thumb);
      await Promise.all([mainFile.delete(), thumbnailFile.delete()]);
      return {
        message: "Assets deleted successfully",
        status: "success",
      };
    } catch (error) {
      if (error.code === 404) {
        return {
          status: "success",
        };
      }
      throw error;
    }
  }
  async syncLocalFallbacks() {
    try {
      const localDir = path.join("local-storage");
      const files = await fs.readdir(localDir, { recursive: true });
      const images = files.filter((file) => file.endsWith(".png"));

      await Promise.all(
        images.map(async (image) => {
          const file = this.bucket.file(image);
          const buffer = await fs.readFile(path.join(localDir, image));

          await file.save(buffer, {
            metadata: {
              contentType: "image/png",
            },
          });

          await fs.unlink(path.join(localDir, image));
        }),
      );
    } catch {
      console.log("No hay archivos pendientes de sincronización");
    }
  }
}

export default GcpStorageAdapter;
