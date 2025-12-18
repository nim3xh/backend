with open('app.js', 'r', encoding='utf-8') as f:
    content = f.read()

with open('product-image-endpoints.txt', 'r', encoding='utf-8') as f:
    new_code = f.read()

# Convert CRLF to LF in new code to match app.js
new_code = new_code.replace('\r\n', '\n')

marker = '\n// ============================================\n// STRIPE SUBSCRIBERS ENDPOINT (ADMIN)'
idx = content.find(marker)

if idx == -1:
    print("Marker not found!")
    print("Searching for alternative markers...")
    # Try to find just the comment
    alt_marker = '// STRIPE SUBSCRIBERS ENDPOINT (ADMIN)'
    idx2 = content.find(alt_marker)
    if idx2 != -1:
        print(f"Found alternative marker at position {idx2}")
        # Find the start of the line
        idx = content.rfind('\n', 0, idx2)
        if idx == -1:
            idx = 0
else:
    print(f"Marker found at position {idx}")

if idx != -1 and idx != 0:
    new_content = content[:idx+1] + new_code + content[idx+1:]
    with open('app.js', 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("Code inserted successfully!")
else:
    print("Could not insert code")
