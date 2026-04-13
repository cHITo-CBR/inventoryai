import { v2 as cloudinary } from 'cloudinary';

/**
 * CLOUDINARY CONFIGURATION
 * This file initializes the Cloudinary SDK for server-side image management.
 * It uses environment variables to authenticate with your Cloudinary account,
 * enabling features like image uploads, transformations, and deletions.
 */

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Export the configured cloudinary instance for use in server actions (e.g., product image uploads)
export default cloudinary;

