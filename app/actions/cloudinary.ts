"use server";
import cloudinary from "@/lib/cloudinary";

/**
 * Uploads a raw File object to Cloudinary.
 * 1. Converts File to Buffer.
 * 2. Streams the buffer to Cloudinary's uploader.
 * 3. Applies transformations for consistent image sizing and quality.
 */
export async function uploadToCloudinary(file: File): Promise<{
  success: boolean;
  url?: string;
  publicId?: string;
  error?: string;
}> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: "products",
          resource_type: "auto",
          transformation: [
            { width: 800, height: 800, crop: "limit" }, // Resize to fit 800x800
            { quality: "auto" }, // Automatic quality optimization
            { fetch_format: "auto" }, // Serve the most efficient format (WebP/AVIF)
          ],
        },
        (error, result) => {
          if (error) {
            reject({ success: false, error: error.message });
          } else if (result) {
            resolve({
              success: true,
              url: result.secure_url,
              publicId: result.public_id,
            });
          }
        }
      );

      uploadStream.end(buffer);
    });
  } catch (error) {
    console.error("Cloudinary upload error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Upload failed",
    };
  }
}

/**
 * Deletes an existing asset from Cloudinary using its Public ID.
 */
export async function deleteFromCloudinary(publicId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    await cloudinary.uploader.destroy(publicId);
    return { success: true };
  } catch (error) {
    console.error("Cloudinary delete error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Delete failed",
    };
  }
}

/**
 * Uploads an image provided as a Base64 string to Cloudinary.
 * Used for client-side previews or mobile uploads where the file is already encoded.
 */
export async function uploadImageFromBase64(
  base64: string,
  folder: string = "products"
): Promise<{
  success: boolean;
  url?: string;
  publicId?: string;
  error?: string;
}> {
  try {
    const result = await cloudinary.uploader.upload(base64, {
      folder,
      resource_type: "auto",
      transformation: [
        { width: 800, height: 800, crop: "limit" },
        { quality: "auto" },
        { fetch_format: "auto" },
      ],
    });

    return {
      success: true,
      url: result.secure_url,
      publicId: result.public_id,
    };
  } catch (error) {
    console.error("Cloudinary upload error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Upload failed",
    };
  }
}
