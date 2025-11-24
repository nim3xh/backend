# Blog Image Upload System

Complete image upload functionality for blog posts with validation, storage, and automatic cleanup.

## Features

✅ **File Upload** - Upload images via multipart/form-data  
✅ **Image Validation** - Only allows image formats (jpg, jpeg, png, gif, webp)  
✅ **Size Limit** - Maximum 5MB per image  
✅ **Unique Filenames** - Prevents filename conflicts  
✅ **Static Serving** - Images served from `/uploads` endpoint  
✅ **Automatic Cleanup** - Images deleted when blog posts are deleted  
✅ **No Duplicates** - Each upload creates a unique file  

## API Endpoints

### 1. Upload Image (Admin Only)

**Endpoint:** `POST /api/blog/upload-image`  
**Authentication:** Required (JWT token)  
**Content-Type:** `multipart/form-data`

**Request:**
```bash
curl -X POST http://localhost:3000/api/blog/upload-image \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "image=@/path/to/image.jpg"
```

**Response (Success):**
```json
{
  "success": true,
  "imageUrl": "/uploads/blog-images/blog-1732467890123-123456789.jpg",
  "filename": "blog-1732467890123-123456789.jpg",
  "size": 245678,
  "message": "Image uploaded successfully"
}
```

**Response (Error):**
```json
{
  "success": false,
  "error": "Only image files are allowed (jpg, jpeg, png, gif, webp)"
}
```

### 2. Create Blog Post with Image

**Endpoint:** `POST /api/blog/posts`  
**Authentication:** Required (JWT token)

**Request:**
```json
{
  "title": "My Blog Post",
  "excerpt": "Brief description",
  "content": "Full content here...",
  "category": "Trading Tips",
  "status": "published",
  "image": "/uploads/blog-images/blog-1732467890123-123456789.jpg"
}
```

### 3. Access Uploaded Images

**URL Pattern:** `http://localhost:3000/uploads/blog-images/{filename}`

**Example:**
```
http://localhost:3000/uploads/blog-images/blog-1732467890123-123456789.jpg
```

## File Upload Workflow

```
┌─────────────────────────────────────────────────────────┐
│  1. Upload Image                                         │
│     POST /api/blog/upload-image                          │
│     - Validate file type (jpg, png, gif, webp)          │
│     - Check file size (max 5MB)                         │
│     - Generate unique filename                          │
│     - Save to: public/uploads/blog-images/              │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│  2. Get Image URL                                        │
│     Response: /uploads/blog-images/blog-123.jpg         │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│  3. Create Blog Post                                     │
│     POST /api/blog/posts                                 │
│     { "image": "/uploads/blog-images/blog-123.jpg" }    │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│  4. Image Served                                         │
│     GET /uploads/blog-images/blog-123.jpg               │
│     - Static file serving                                │
│     - No authentication required                         │
└─────────────────────────────────────────────────────────┘
```

## Image Storage

**Directory:** `backend/public/uploads/blog-images/`

**Filename Format:** `blog-{timestamp}-{random}.{extension}`

**Example:**
- `blog-1732467890123-987654321.jpg`
- `blog-1732467891234-123456789.png`

**Git Handling:**
- Directory structure is tracked (`.gitkeep`)
- Actual image files are ignored (`.gitignore`)
- Prevents accidentally committing user uploads

## Validation Rules

### File Type
- ✅ Allowed: `.jpg`, `.jpeg`, `.png`, `.gif`, `.webp`
- ❌ Rejected: All other file types

### File Size
- ✅ Maximum: 5MB (5,242,880 bytes)
- ❌ Larger files are rejected

### Filename
- Auto-generated using timestamp + random number
- Prevents filename collisions
- Preserves original file extension

## Automatic Cleanup

When a blog post is deleted:
1. System reads the post's `image` field
2. Extracts filename from URL
3. Deletes physical file from disk
4. Logs deletion to console

**Example:**
```javascript
// Blog post deleted with image: /uploads/blog-images/blog-123.jpg
// Console output:
🗑️ Deleted image file: blog-123.jpg
```

## Frontend Integration

### Using Fetch API

```javascript
// 1. Upload image
async function uploadImage(file, token) {
  const formData = new FormData();
  formData.append('image', file);
  
  const response = await fetch('http://localhost:3000/api/blog/upload-image', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: formData
  });
  
  const data = await response.json();
  return data.imageUrl; // Returns: /uploads/blog-images/blog-123.jpg
}

// 2. Create post with image
async function createPost(postData, imageUrl, token) {
  const response = await fetch('http://localhost:3000/api/blog/posts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      ...postData,
      image: imageUrl
    })
  });
  
  return response.json();
}

// 3. Usage
const file = document.getElementById('imageInput').files[0];
const imageUrl = await uploadImage(file, userToken);
const post = await createPost({ title: 'Test', ... }, imageUrl, userToken);
```

### Using HTML Form

```html
<form id="imageForm">
  <input type="file" name="image" accept="image/*" required>
  <button type="submit">Upload</button>
</form>

<script>
document.getElementById('imageForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const formData = new FormData(e.target);
  const response = await fetch('/api/blog/upload-image', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: formData
  });
  
  const data = await response.json();
  console.log('Uploaded:', data.imageUrl);
});
</script>
```

## Testing

### Using cURL

```bash
# 1. Login to get token
TOKEN=$(curl -X POST http://localhost:3000/login \
  -H "Content-Type: application/json" \
  -d '{"email":"nim3xh@gmail.com","password":"admin123"}' \
  | jq -r '.token')

# 2. Upload image
curl -X POST http://localhost:3000/api/blog/upload-image \
  -H "Authorization: Bearer $TOKEN" \
  -F "image=@/path/to/image.jpg"

# 3. Create post with image
curl -X POST http://localhost:3000/api/blog/posts \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Post",
    "excerpt": "Test excerpt",
    "content": "Test content",
    "image": "/uploads/blog-images/blog-123.jpg"
  }'
```

### Using Test Script

```bash
# Run the test script (requires test image)
node testImageUpload.js
```

### Using Postman

1. **Upload Image:**
   - Method: POST
   - URL: `http://localhost:3000/api/blog/upload-image`
   - Headers: `Authorization: Bearer YOUR_TOKEN`
   - Body: form-data
     - Key: `image` (type: File)
     - Value: Select image file

2. **Create Post:**
   - Method: POST
   - URL: `http://localhost:3000/api/blog/posts`
   - Headers: 
     - `Authorization: Bearer YOUR_TOKEN`
     - `Content-Type: application/json`
   - Body: raw (JSON)
     ```json
     {
       "title": "Test",
       "excerpt": "Test",
       "content": "Test",
       "image": "/uploads/blog-images/blog-123.jpg"
     }
     ```

## Error Handling

### Invalid File Type
```json
{
  "success": false,
  "error": "Only image files are allowed (jpg, jpeg, png, gif, webp)"
}
```

### File Too Large
```json
{
  "success": false,
  "error": "File too large"
}
```

### No File Provided
```json
{
  "success": false,
  "error": "No image file provided"
}
```

### Unauthorized
```json
{
  "success": false,
  "error": "Access denied"
}
```

## Security Features

1. **Authentication Required** - Only authenticated admin users can upload
2. **File Type Validation** - Only image formats allowed
3. **Size Limits** - Prevents large file uploads
4. **Unique Filenames** - Prevents overwriting existing files
5. **Extension Validation** - Validates file extensions
6. **Automatic Cleanup** - Orphaned images are removed

## No Duplicate Issues

### Unique Filenames
Every uploaded file gets a unique name:
```
blog-{timestamp}-{random}.{extension}
```

**Example:**
- Upload 1: `blog-1732467890123-987654321.jpg`
- Upload 2: `blog-1732467890456-123456789.jpg`
- Upload 3: `blog-1732467890789-456789123.jpg`

**No collisions possible** - timestamp + random number ensures uniqueness.

### Automatic Deletion
When a blog post is deleted, its image is automatically removed:
- No orphaned files
- No storage bloat
- No manual cleanup needed

## Production Considerations

### CDN Integration
For production, consider using a CDN:
- Upload to AWS S3, Cloudinary, or similar
- Store CDN URL in `image` field
- Faster delivery, better scalability

### Backup Strategy
- Backup `public/uploads/blog-images/` regularly
- Consider cloud storage sync
- Implement disaster recovery plan

### Monitoring
- Track upload failures
- Monitor disk space usage
- Log all upload attempts

## Troubleshooting

### Upload Fails
- Check file size (must be < 5MB)
- Verify file type is image
- Ensure `public/uploads/blog-images/` exists
- Check folder permissions

### Image Not Displaying
- Verify URL is correct
- Check static file serving is enabled
- Ensure file exists in directory
- Test direct URL access

### Permission Errors
- Ensure backend has write permissions
- Check folder ownership
- Verify directory exists

---

**Status:** ✅ Complete and Ready to Use

**Next Steps:**
1. Start backend server
2. Login to get JWT token
3. Upload test image
4. Create blog post with image
5. Access image via URL
