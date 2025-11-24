# Blog Posts Storage

This directory contains all blog posts stored as individual JSON files.

## File Structure

Each blog post is saved as a separate JSON file named with its unique ID:
- `{postId}.json` - Contains the complete blog post data

## Example Post File

```json
{
  "id": "1",
  "title": "Sample Blog Post",
  "excerpt": "A brief description of the post",
  "content": "The full content of the blog post...",
  "category": "Trading Tips",
  "status": "published",
  "date": "2025-11-24",
  "author": "Admin",
  "views": 100,
  "readTime": "5 min read",
  "image": ""
}
```

## How It Works

- **Create**: New posts are automatically saved as JSON files
- **Read**: Posts are loaded from JSON files on each request
- **Update**: Existing JSON files are overwritten with updated data
- **Delete**: JSON files are permanently removed from disk

## Initialization

When the server starts:
1. The `blog_posts` directory is automatically created if it doesn't exist
2. If empty, 3 sample blog posts are created automatically
3. All existing posts are available immediately

## Benefits

✅ **Persistent Storage**: Posts survive server restarts  
✅ **Easy Backup**: Simply copy the directory  
✅ **Version Control**: JSON files can be tracked in git  
✅ **Human Readable**: Easy to inspect and edit manually  
✅ **No Database Required**: Simple file-based storage  

## Notes

- Each post is stored independently
- File names match the post ID
- Posts are loaded fresh on each API request
- No caching is implemented (loads from disk each time)

## Migration to Database

When ready to scale, you can migrate to a database (MongoDB, PostgreSQL, etc.) by:
1. Exporting all JSON files
2. Importing them into your database
3. Updating the API endpoints to use database queries
4. Keeping these files as a backup
