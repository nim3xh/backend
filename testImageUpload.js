/**
 * Test Image Upload for Blog Posts
 * 
 * This script demonstrates how to upload an image using the blog image upload API.
 * 
 * Prerequisites:
 * 1. Server must be running (npm start or npm run dev)
 * 2. You must have a valid JWT token (login first)
 * 3. Have a test image file ready
 * 
 * Usage:
 *   node testImageUpload.js
 */

require("dotenv").config();
const fs = require("fs");
const path = require("path");
const FormData = require("form-data");
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const API_BASE_URL = `http://localhost:${process.env.PORT || 3000}`;

// Test credentials (use admin account)
const TEST_EMAIL = "nim3xh@gmail.com";
const TEST_PASSWORD = "admin123"; // Update with actual password

/**
 * Login to get JWT token
 */
async function login() {
  try {
    const response = await fetch(`${API_BASE_URL}/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
      }),
    });

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || "Login failed");
    }

    console.log("✅ Login successful");
    return data.token;
  } catch (error) {
    console.error("❌ Login error:", error.message);
    throw error;
  }
}

/**
 * Upload image
 */
async function uploadImage(token, imagePath) {
  try {
    // Check if image exists
    if (!fs.existsSync(imagePath)) {
      throw new Error(`Image file not found: ${imagePath}`);
    }

    // Create form data
    const form = new FormData();
    form.append("image", fs.createReadStream(imagePath));

    console.log(`\n📤 Uploading image: ${path.basename(imagePath)}`);

    const response = await fetch(`${API_BASE_URL}/api/blog/upload-image`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: form,
    });

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || "Upload failed");
    }

    console.log("✅ Image uploaded successfully");
    console.log("📸 Image URL:", data.imageUrl);
    console.log("📁 Filename:", data.filename);
    console.log("📊 Size:", (data.size / 1024).toFixed(2), "KB");

    return data;
  } catch (error) {
    console.error("❌ Upload error:", error.message);
    throw error;
  }
}

/**
 * Create blog post with uploaded image
 */
async function createBlogPostWithImage(token, imageUrl) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/blog/posts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        title: "Test Blog Post with Image",
        excerpt: "This is a test blog post with an uploaded image",
        content: "This blog post was created to test the image upload functionality. The image should be displayed in the blog post.",
        category: "Testing",
        status: "published",
        author: "Test Admin",
        readTime: "2 min read",
        image: imageUrl, // Use the uploaded image URL
      }),
    });

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || "Failed to create post");
    }

    console.log("\n✅ Blog post created with image");
    console.log("📝 Post ID:", data.post.id);
    console.log("📸 Image URL:", data.post.image);

    return data.post;
  } catch (error) {
    console.error("❌ Create post error:", error.message);
    throw error;
  }
}

/**
 * Main test function
 */
async function runTest() {
  console.log("🧪 Testing Blog Image Upload System\n");
  console.log("=".repeat(50));

  try {
    // Step 1: Login
    console.log("\n[1] Logging in...");
    const token = await login();

    // Step 2: Upload image
    // You need to provide a test image path
    const testImagePath = path.join(__dirname, "test-image.jpg");
    
    // Create a dummy test image if it doesn't exist
    if (!fs.existsSync(testImagePath)) {
      console.log("\n⚠️  Test image not found. Please place a test image at:");
      console.log(`   ${testImagePath}`);
      console.log("\n💡 Or update the testImagePath variable in this script.");
      console.log("\n📝 You can manually test the upload using curl:");
      console.log(`   curl -X POST ${API_BASE_URL}/api/blog/upload-image \\`);
      console.log(`        -H "Authorization: Bearer YOUR_TOKEN" \\`);
      console.log(`        -F "image=@/path/to/image.jpg"`);
      return;
    }

    console.log("\n[2] Uploading image...");
    const uploadResult = await uploadImage(token, testImagePath);

    // Step 3: Create blog post with image
    console.log("\n[3] Creating blog post with uploaded image...");
    const post = await createBlogPostWithImage(token, uploadResult.imageUrl);

    console.log("\n" + "=".repeat(50));
    console.log("✅ All tests completed successfully!");
    console.log("\n📋 Summary:");
    console.log(`   - Image uploaded: ${uploadResult.imageUrl}`);
    console.log(`   - Blog post created: ID ${post.id}`);
    console.log(`   - Access image at: ${API_BASE_URL}${uploadResult.imageUrl}`);
    console.log(`   - View post at: ${API_BASE_URL}/api/blog/posts/${post.id}`);
  } catch (error) {
    console.error("\n❌ Test failed:", error.message);
    process.exit(1);
  }
}

// Run the test
runTest();
