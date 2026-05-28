import { cloudinary } from "@/config/cloudinary";

export interface CloudinaryUploadResult {
  url: string;
  publicId: string;
  bytes: number;
  format: string;
}

export interface CloudinaryDocInfo {
  url: string;
  publicId: string;
  bytes: number;
  format: string;
  createdAt: string;
}

const FOLDER = "knowledge-base";

export class CloudinaryService {
  async uploadDoc(
    buffer: Buffer,
    filename: string
  ): Promise<CloudinaryUploadResult> {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          resource_type: "raw",
          folder: FOLDER,
          public_id: filename,
          unique_filename: true,
          use_filename: true,
        },
        (err, result) => {
          if (err || !result) {
            return reject(err ?? new Error("Cloudinary upload failed"));
          }
          resolve({
            url: result.secure_url,
            publicId: result.public_id,
            bytes: result.bytes,
            format: result.format ?? "",
          });
        }
      );
      stream.end(buffer);
    });
  }

  async deleteDoc(publicId: string): Promise<void> {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: "raw",
    });
    if (result.result !== "ok" && result.result !== "not found") {
      throw new Error(`Cloudinary delete failed: ${result.result}`);
    }
  }

  async getDoc(publicId: string): Promise<CloudinaryDocInfo> {
    const result = await cloudinary.api.resource(publicId, {
      resource_type: "raw",
    });
    return {
      url: result.secure_url,
      publicId: result.public_id,
      bytes: result.bytes,
      format: result.format ?? "",
      createdAt: result.created_at,
    };
  }

  getSignedUrl(publicId: string, expiresInSeconds = 3600): string {
    return cloudinary.url(publicId, {
      resource_type: "raw",
      type: "authenticated",
      sign_url: true,
      expires_at: Math.floor(Date.now() / 1000) + expiresInSeconds,
    });
  }
}
