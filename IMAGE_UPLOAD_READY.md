# Test Image Upload - Quick Guide

## Server is Running ✅

The backend server is now running with image upload support!

**What's New:**
- 📸 Image upload endpoint: `POST /api/blog/upload-image`
- 📁 Static serving: `GET /uploads/blog-images/{filename}`
- 🗑️ Automatic cleanup when blog posts are deleted
- ✅ No duplicate images - unique filenames for each upload

## Quick Test with cURL

### 1. Login to Get Token
```powershell
$response = Invoke-RestMethod -Uri "http://localhost:3000/login" -Method Post -ContentType "application/json" -Body '{"email":"nim3xh@gmail.com","password":"admin123"}'
$token = $response.token
Write-Host "Token: $token"
```

### 2. Upload an Image (PowerShell)
```powershell
$headers = @{
    "Authorization" = "Bearer $token"
}

$filePath = "C:\path\to\your\image.jpg"  # Change this to your image path

$form = @{
    image = Get-Item -Path $filePath
}

$response = Invoke-RestMethod -Uri "http://localhost:3000/api/blog/upload-image" -Method Post -Headers $headers -Form $form
Write-Host "Image URL: $($response.imageUrl)"
```

### 3. Create Blog Post with Image
```powershell
$postData = @{
    title = "Test Post with Image"
    excerpt = "This post has an uploaded image"
    content = "Testing the new image upload feature..."
    category = "Testing"
    status = "published"
    image = $response.imageUrl
} | ConvertTo-Json

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

$newPost = Invoke-RestMethod -Uri "http://localhost:3000/api/blog/posts" -Method Post -Headers $headers -Body $postData
Write-Host "Post created with ID: $($newPost.post.id)"
Write-Host "Access image at: http://localhost:3000$($newPost.post.image)"
```

## Test with Postman

1. **Import this endpoint:**
   - Method: `POST`
   - URL: `http://localhost:3000/api/blog/upload-image`
   - Authorization: Bearer Token (get from login)
   - Body: form-data
     - Key: `image` (type: File)
     - Value: Select your image file

2. **Expected Response:**
```json
{
  "success": true,
  "imageUrl": "/uploads/blog-images/blog-1732467890123-123456789.jpg",
  "filename": "blog-1732467890123-123456789.jpg",
  "size": 245678,
  "message": "Image uploaded successfully"
}
```

3. **Access Image:**
   - Open: `http://localhost:3000/uploads/blog-images/blog-1732467890123-123456789.jpg`

## Image Upload Features

### ✅ What Works
- Upload images (jpg, jpeg, png, gif, webp)
- Max file size: 5MB
- Unique filenames prevent collisions
- Images stored in: `backend/public/uploads/blog-images/`
- Automatic deletion when post is deleted
- Static serving from `/uploads` endpoint

### ✅ No Duplicate Issues
- Each upload creates unique filename: `blog-{timestamp}-{random}.{ext}`
- Example: `blog-1732467890123-987654321.jpg`
- Impossible to have filename collisions
- Old images automatically deleted with posts

## File Structure

```
backend/
  public/
    uploads/
      blog-images/
        .gitkeep                              # Keeps directory in git
        blog-1732467890123-987654321.jpg     # Your uploaded images
        blog-1732467891234-123456789.png
  app.js                                      # Image upload endpoint added
  BLOG_IMAGE_UPLOAD.md                       # Full documentation
  testImageUpload.js                         # Test script
```

## Validation

- ✅ Only image files (jpg, jpeg, png, gif, webp)
- ✅ Max 5MB per image
- ✅ Authentication required (admin only)
- ✅ Unique filenames
- ✅ Safe file storage

## Console Output

When uploading:
```
📸 Blog image uploaded: blog-1732467890123-987654321.jpg (245.67 KB)
```

When deleting post with image:
```
🗑️ Deleted image file: blog-1732467890123-987654321.jpg
```

## Next Steps

1. **Test Upload**: Use Postman or cURL to upload a test image
2. **Verify Storage**: Check `backend/public/uploads/blog-images/`
3. **Access Image**: Open the returned URL in browser
4. **Create Post**: Use the image URL in a blog post
5. **Test Deletion**: Delete post and verify image is removed

## Need Help?

See full documentation: `BLOG_IMAGE_UPLOAD.md`

---

✅ **Image upload system is ready to use!**

🔒 **Security:** Only authenticated admins can upload
📦 **Storage:** Local file system with automatic cleanup
🚫 **No Duplicates:** Unique filenames for every upload
