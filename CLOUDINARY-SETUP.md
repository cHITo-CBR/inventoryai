# Cloudinary Setup Instructions

## 1. Install Required Packages

Run this command in your terminal:
```bash
npm install cloudinary next-cloudinary
```

## 2. Get Cloudinary Credentials

1. Go to [https://cloudinary.com/](https://cloudinary.com/) and sign up for a free account
2. After signing in, go to your Dashboard
3. Copy these values:
   - **Cloud Name**
   - **API Key**
   - **API Secret**

## 3. Add Environment Variables

Add these to your `.env.local` file:

```env
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name_here
CLOUDINARY_API_KEY=your_api_key_here
CLOUDINARY_API_SECRET=your_api_secret_here
```

Replace the placeholder values with your actual Cloudinary credentials from step 2.

## 4. Update Database Schema

The product images will now be stored as Cloudinary URLs. Your `image_url` column in the `products` table will store the full Cloudinary URL (e.g., `https://res.cloudinary.com/...`).

## 5. Features Included

✅ **Automatic Image Optimization**
- Images are automatically resized to max 800x800px
- Quality is optimized for web
- Format is auto-selected (WebP for modern browsers)

✅ **CDN Delivery**
- Images are served from Cloudinary's global CDN
- Faster loading times worldwide

✅ **Upload & Delete**
- Upload images from product form
- Delete old images when updating products

## 6. Usage

The product form now supports:
- Uploading images directly to Cloudinary
- Viewing existing Cloudinary-hosted images
- Automatic cleanup of old images on update

## 7. Free Tier Limits

Cloudinary free tier includes:
- 25 GB storage
- 25 GB bandwidth/month
- Unlimited transformations

This is more than enough for most small to medium projects.

## Next Steps

After setting up environment variables:
1. Restart your dev server: `npm run dev`
2. Go to the product catalog
3. Try adding/editing a product with an image
4. The image will be uploaded to Cloudinary automatically

## Troubleshooting

If uploads fail:
- Check that environment variables are set correctly
- Restart the dev server after adding env vars
- Check Cloudinary dashboard for upload errors
- Ensure your Cloudinary account is active
