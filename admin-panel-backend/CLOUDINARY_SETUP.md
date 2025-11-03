# Cloudinary Setup Instructions

## Credentials

- **Cloud Name**: `dgv0rxd60`
- **API Key**: `GgziMAcVfQvOGD44Yj0OlNqitPg`
- **API Secret**: You need to get this from your Cloudinary dashboard

## How to Get API Secret

1. Go to [Cloudinary Dashboard](https://console.cloudinary.com/)
2. Login to your account
3. Go to **Settings** → **Security**
4. Find **API Secret** section
5. Click **Reveal** to show your API Secret
6. Copy the API Secret

## Configuration

Add to your `.env` file:

```env
# Option 1: Individual variables
CLOUDINARY_CLOUD_NAME=dgv0rxd60
CLOUDINARY_API_KEY=GgziMAcVfQvOGD44Yj0OlNqitPg
CLOUDINARY_API_SECRET=YOUR_API_SECRET_HERE

# Option 2: Use CLOUDINARY_URL (alternative)
# Format: cloudinary://api_key:api_secret@cloud_name
CLOUDINARY_URL=cloudinary://GgziMAcVfQvOGD44Yj0OlNqitPg:YOUR_API_SECRET@dgv0rxd60
```

## Usage

After setting up the credentials:

1. Images are uploaded to Cloudinary folder: `properties/`
2. Single image upload: `POST /api/upload/image`
3. Multiple images upload: `POST /api/upload/images`
4. Files are automatically optimized and served via CDN

## Notes

- Maximum file size: 10MB per image
- Supported formats: JPEG, JPG, PNG, WEBP, GIF
- All uploaded images are stored in the `properties/` folder in your Cloudinary account
- Images are automatically served via HTTPS (secure_url)

