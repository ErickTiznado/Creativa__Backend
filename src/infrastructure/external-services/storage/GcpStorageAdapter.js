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

    // Construct Public URL base
    // Use env var GCS_PUBLIC_URL if set, otherwise standard GCS URL
    const publicUrlBase = process.env.GCS_PUBLIC_URL || `https://storage.googleapis.com/${this.bucket.name}`;
    
    // Ensure no double slashes if env var has trailing slash
    const baseUrl = publicUrlBase.replace(/\/$/, ""); 

    try {
      await Promise.all([
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
        originalUrl: `${baseUrl}/${fileName}`,
        thumbnailUrl: `${baseUrl}/${thumbnailFileName}`,
        status: "gcp",
      };
    } catch (error) {
      console.error("Falló la subida a GCS, usando almacenamiento local...", error);
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
        originalUrl: null, // Local files don't have a GCS public URL
        thumbnailUrl: null,
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

    const publicUrlBase = process.env.GCS_PUBLIC_URL || `https://storage.googleapis.com/${this.bucket.name}`;
    const baseUrl = publicUrlBase.replace(/\/$/, "");

    return {
      mainApproved,
      thumbnailApproved,
      mainApprovedUrl: `${baseUrl}/${mainApproved}`,
      thumbnailApprovedUrl: `${baseUrl}/${thumbnailApproved}`,
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
