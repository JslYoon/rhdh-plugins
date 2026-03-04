# AI Notebooks API - cURL Examples

Complete examples for testing all AI Notebooks API endpoints.

## Prerequisites

```bash
# Set your base URL
export API_URL="http://localhost:7007/api/ai-notebooks"

# Set your authentication token (optional, depends on your config)
export AUTH_TOKEN="your-backstage-token-here"
```

---

## Health Check

```bash
curl -X GET "${API_URL}/health"
```

**Response:**

```json
{
  "status": "ok"
}
```

---

## Sessions API

### 1. Create a Session

**Basic example:**

```bash
curl -X POST "${API_URL}/v1/sessions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -d '{
    "name": "Data Analysis Project"
  }'
```

**With full metadata:**

```bash
curl -X POST "${API_URL}/v1/sessions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -d '{
    "name": "Data Analysis Project",
    "description": "Analyzing customer behavior data",
    "metadata": {
      "category": "analytics",
      "tags": ["data-science", "python"],
      "project": "customer-insights"
    }
  }'
```

**Response:**

```json
{
  "status": "success",
  "session": {
    "session_id": "vs_1234567890abcdef",
    "user_id": "user:default/alice",
    "name": "Data Analysis Project",
    "description": "Analyzing customer behavior data",
    "created_at": "2026-03-04T10:30:00.000Z",
    "updated_at": "2026-03-04T10:30:00.000Z",
    "metadata": {
      "category": "analytics",
      "tags": ["data-science", "python"],
      "project": "customer-insights",
      "document_ids": [],
      "embedding_model": "sentence-transformers/nomic-ai/nomic-embed-text-v1.5",
      "embedding_dimension": 768,
      "provider_id": "faiss"
    }
  },
  "message": "Session created successfully"
}
```

### 2. List All Sessions

**List all sessions:**

```bash
curl -X GET "${API_URL}/v1/sessions" \
  -H "Authorization: Bearer ${AUTH_TOKEN}"
```

**Filter by category:**

```bash
curl -X GET "${API_URL}/v1/sessions?category=analytics" \
  -H "Authorization: Bearer ${AUTH_TOKEN}"
```

**Filter by tags:**

```bash
curl -X GET "${API_URL}/v1/sessions?tags=data-science,python" \
  -H "Authorization: Bearer ${AUTH_TOKEN}"
```

**Filter by project:**

```bash
curl -X GET "${API_URL}/v1/sessions?project=customer-insights" \
  -H "Authorization: Bearer ${AUTH_TOKEN}"
```

**Combined filters:**

```bash
curl -X GET "${API_URL}/v1/sessions?category=analytics&tags=python&project=customer-insights" \
  -H "Authorization: Bearer ${AUTH_TOKEN}"
```

**Response:**

```json
{
  "status": "success",
  "sessions": [
    {
      "session_id": "vs_1234567890abcdef",
      "user_id": "user:default/alice",
      "name": "Data Analysis Project",
      "description": "Analyzing customer behavior data",
      "created_at": "2026-03-04T10:30:00.000Z",
      "updated_at": "2026-03-04T10:30:00.000Z",
      "metadata": {
        "category": "analytics",
        "tags": ["data-science", "python"],
        "project": "customer-insights",
        "document_ids": ["research-paper", "dataset-notes"]
      }
    }
  ],
  "count": 1
}
```

### 3. Get a Session by ID

```bash
# Set session ID
export SESSION_ID="vs_1234567890abcdef"

curl -X GET "${API_URL}/v1/sessions/${SESSION_ID}" \
  -H "Authorization: Bearer ${AUTH_TOKEN}"
```

**Response:**

```json
{
  "status": "success",
  "session": {
    "session_id": "vs_1234567890abcdef",
    "user_id": "user:default/alice",
    "name": "Data Analysis Project",
    "description": "Analyzing customer behavior data",
    "created_at": "2026-03-04T10:30:00.000Z",
    "updated_at": "2026-03-04T10:30:00.000Z",
    "metadata": {
      "category": "analytics",
      "tags": ["data-science", "python"],
      "project": "customer-insights",
      "document_ids": ["research-paper", "dataset-notes"]
    }
  },
  "message": "Session retrieved successfully"
}
```

### 4. Update a Session

**Update name only:**

```bash
curl -X PUT "${API_URL}/v1/sessions/${SESSION_ID}" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -d '{
    "name": "Advanced Data Analysis"
  }'
```

**Update description only:**

```bash
curl -X PUT "${API_URL}/v1/sessions/${SESSION_ID}" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -d '{
    "description": "Deep dive into customer behavior patterns"
  }'
```

**Update metadata (replaces existing metadata):**

```bash
curl -X PUT "${API_URL}/v1/sessions/${SESSION_ID}" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -d '{
    "metadata": {
      "category": "advanced-analytics",
      "tags": ["data-science", "python", "pandas", "ml"],
      "project": "customer-insights-v2"
    }
  }'
```

**Update all fields:**

```bash
curl -X PUT "${API_URL}/v1/sessions/${SESSION_ID}" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -d '{
    "name": "Advanced Data Analysis",
    "description": "Deep dive into customer behavior patterns",
    "metadata": {
      "category": "advanced-analytics",
      "tags": ["data-science", "python", "pandas", "ml"],
      "project": "customer-insights-v2"
    }
  }'
```

**Response:**

```json
{
  "status": "success",
  "session": {
    "session_id": "vs_1234567890abcdef",
    "user_id": "user:default/alice",
    "name": "Advanced Data Analysis",
    "description": "Deep dive into customer behavior patterns",
    "created_at": "2026-03-04T10:30:00.000Z",
    "updated_at": "2026-03-04T11:15:00.000Z",
    "metadata": {
      "category": "advanced-analytics",
      "tags": ["data-science", "python", "pandas", "ml"],
      "project": "customer-insights-v2",
      "document_ids": ["research-paper", "dataset-notes"]
    }
  },
  "message": "Session updated successfully"
}
```

### 5. Delete a Session

```bash
curl -X DELETE "${API_URL}/v1/sessions/${SESSION_ID}" \
  -H "Authorization: Bearer ${AUTH_TOKEN}"
```

**Response:**

```json
{
  "status": "success",
  "session": {
    "session_id": "vs_1234567890abcdef",
    "user_id": "user:default/alice",
    "name": "Advanced Data Analysis",
    "description": "Deep dive into customer behavior patterns",
    "created_at": "2026-03-04T10:30:00.000Z",
    "updated_at": "2026-03-04T11:15:00.000Z",
    "metadata": {
      "category": "advanced-analytics",
      "tags": ["data-science", "python", "pandas", "ml"],
      "project": "customer-insights-v2",
      "document_ids": ["research-paper", "dataset-notes"]
    }
  },
  "message": "Session deleted successfully"
}
```

---

## Documents API

### 1. Upload a Document

**Upload a text file:**

```bash
curl -X POST "${API_URL}/v1/sessions/${SESSION_ID}/documents/upload" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -F "fileType=txt" \
  -F "file=@/path/to/notes.txt"
```

**Upload a text file with custom title:**

```bash
curl -X POST "${API_URL}/v1/sessions/${SESSION_ID}/documents/upload" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -F "fileType=txt" \
  -F "file=@/path/to/notes.txt" \
  -F "title=Dataset Analysis Notes"
```

**Upload a PDF:**

```bash
curl -X POST "${API_URL}/v1/sessions/${SESSION_ID}/documents/upload" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -F "fileType=pdf" \
  -F "file=@/path/to/research-paper.pdf" \
  -F "title=Research Paper on Neural Networks"
```

**Upload a markdown file:**

```bash
curl -X POST "${API_URL}/v1/sessions/${SESSION_ID}/documents/upload" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -F "fileType=md" \
  -F "file=@/path/to/documentation.md" \
  -F "title=Project Documentation"
```

**Upload a JSON file:**

```bash
curl -X POST "${API_URL}/v1/sessions/${SESSION_ID}/documents/upload" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -F "fileType=json" \
  -F "file=@/path/to/config.json" \
  -F "title=Configuration File"
```

**Upload a YAML file:**

```bash
curl -X POST "${API_URL}/v1/sessions/${SESSION_ID}/documents/upload" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -F "fileType=yaml" \
  -F "file=@/path/to/spec.yaml" \
  -F "title=API Specification"
```

**Upload from URL:**

```bash
curl -X POST "${API_URL}/v1/sessions/${SESSION_ID}/documents/upload" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -F "fileType=url" \
  -F "file=https://example.com/documentation.md"
```

**Upload from URL with custom title:**

```bash
curl -X POST "${API_URL}/v1/sessions/${SESSION_ID}/documents/upload" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -F "fileType=url" \
  -F "file=https://example.com/documentation.md" \
  -F "title=External API Documentation"
```

**Response:**

```json
{
  "status": "success",
  "document_id": "research-paper-on-neural-networks",
  "title": "Research Paper on Neural Networks",
  "session_id": "vs_1234567890abcdef",
  "replaced": false,
  "message": "Document created successfully"
}
```

### 2. List All Documents in a Session

**List all documents:**

```bash
curl -X GET "${API_URL}/v1/sessions/${SESSION_ID}/documents" \
  -H "Authorization: Bearer ${AUTH_TOKEN}"
```

**Filter by file type:**

```bash
# List only PDF documents
curl -X GET "${API_URL}/v1/sessions/${SESSION_ID}/documents?fileType=pdf" \
  -H "Authorization: Bearer ${AUTH_TOKEN}"

# List only markdown documents
curl -X GET "${API_URL}/v1/sessions/${SESSION_ID}/documents?fileType=md" \
  -H "Authorization: Bearer ${AUTH_TOKEN}"

# List only URL documents
curl -X GET "${API_URL}/v1/sessions/${SESSION_ID}/documents?fileType=url" \
  -H "Authorization: Bearer ${AUTH_TOKEN}"
```

**Response:**

```json
{
  "status": "success",
  "session_id": "vs_1234567890abcdef",
  "documents": [
    {
      "document_id": "research-paper-on-neural-networks",
      "title": "Research Paper on Neural Networks",
      "session_id": "vs_1234567890abcdef",
      "user_id": "user:default/alice",
      "source_type": "pdf",
      "created_at": "2026-03-04T10:35:00.000Z"
    },
    {
      "document_id": "dataset-analysis-notes",
      "title": "Dataset Analysis Notes",
      "session_id": "vs_1234567890abcdef",
      "user_id": "user:default/alice",
      "source_type": "txt",
      "created_at": "2026-03-04T10:40:00.000Z"
    },
    {
      "document_id": "external-api-documentation",
      "title": "External API Documentation",
      "session_id": "vs_1234567890abcdef",
      "user_id": "user:default/alice",
      "source_type": "url",
      "created_at": "2026-03-04T10:45:00.000Z"
    }
  ],
  "count": 3
}
```

### 3. Update a Document

**Update title only (content preserved):**

```bash
export DOCUMENT_ID="research-paper-on-neural-networks"

curl -X PUT "${API_URL}/v1/sessions/${SESSION_ID}/documents/${DOCUMENT_ID}" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -F "title=Updated Research Paper Title"
```

**Update content only with new file:**

```bash
curl -X PUT "${API_URL}/v1/sessions/${SESSION_ID}/documents/${DOCUMENT_ID}" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -F "fileType=pdf" \
  -F "file=@/path/to/updated-paper.pdf"
```

**Update content from URL:**

```bash
curl -X PUT "${API_URL}/v1/sessions/${SESSION_ID}/documents/${DOCUMENT_ID}" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -F "fileType=url" \
  -F "file=https://example.com/updated-doc.md"
```

**Update both title and content:**

```bash
curl -X PUT "${API_URL}/v1/sessions/${SESSION_ID}/documents/${DOCUMENT_ID}" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -F "title=Revised Neural Networks Paper" \
  -F "fileType=pdf" \
  -F "file=@/path/to/revised-paper.pdf"
```

**Response:**

```json
{
  "status": "success",
  "document_id": "revised-neural-networks-paper",
  "title": "Revised Neural Networks Paper",
  "session_id": "vs_1234567890abcdef",
  "replaced": true,
  "message": "Document updated successfully"
}
```

### 4. Delete a Document

```bash
curl -X DELETE "${API_URL}/v1/sessions/${SESSION_ID}/documents/${DOCUMENT_ID}" \
  -H "Authorization: Bearer ${AUTH_TOKEN}"
```

**Response:**

```json
{
  "status": "success",
  "document_id": "research-paper-on-neural-networks",
  "session_id": "vs_1234567890abcdef",
  "message": "Document deleted successfully"
}
```

---

## Query API

### 1. Query Session with RAG

**Basic query:**

```bash
curl -X POST "${API_URL}/v1/sessions/${SESSION_ID}/query" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -d '{
    "query": "What are the key findings about neural network architectures in the uploaded research papers?"
  }'
```

**Query with conversation ID (for chat history):**

```bash
curl -X POST "${API_URL}/v1/sessions/${SESSION_ID}/query" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -d '{
    "query": "Can you explain the first point in more detail?",
    "conversation_id": "conv_abc123"
  }'
```

**Query with model and parameters:**

```bash
curl -X POST "${API_URL}/v1/sessions/${SESSION_ID}/query" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -d '{
    "query": "What are the key findings about neural network architectures?",
    "model": "meta-llama/Llama-3.3-70B-Instruct",
    "temperature": 0.7,
    "max_tokens": 2048,
    "top_p": 0.9
  }'
```

**Response (Server-Sent Events stream):**

```
data: {"type":"chunk","content":"Based on the"}

data: {"type":"chunk","content":" research papers"}

data: {"type":"chunk","content":" uploaded to"}

data: {"type":"chunk","content":" your session"}

data: {"type":"chunk","content":", the key"}

data: {"type":"chunk","content":" findings about"}

data: {"type":"chunk","content":" neural network"}

data: {"type":"chunk","content":" architectures include"}

data: {"type":"chunk","content":":\n\n1. Transformer"}

data: {"type":"chunk","content":" architectures"}

data: {"type":"done"}
```

---

## Error Examples

### 400 Bad Request

**Missing required field:**

```bash
curl -X POST "${API_URL}/v1/sessions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -d '{
    "description": "Missing name field"
  }'
```

**Response:**

```json
{
  "status": "error",
  "error": "name is required"
}
```

**Duplicate document title:**

```bash
curl -X POST "${API_URL}/v1/sessions/${SESSION_ID}/documents/upload" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -F "fileType=txt" \
  -F "file=@notes.txt" \
  -F "title=Dataset Analysis Notes"
```

**Response:**

```json
{
  "status": "error",
  "error": "A document with the title \"Dataset Analysis Notes\" already exists in this session. Please use a different title or update the existing document."
}
```

**File size exceeded:**

```bash
# Upload file larger than 20MB
curl -X POST "${API_URL}/v1/sessions/${SESSION_ID}/documents/upload" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -F "fileType=pdf" \
  -F "file=@large-file-25mb.pdf"
```

**Response:**

```json
{
  "status": "error",
  "error": "File size exceeds 20MB limit"
}
```

### 403 Forbidden

**Insufficient permissions:**

```bash
curl -X POST "${API_URL}/v1/sessions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer invalid_token" \
  -d '{
    "name": "Test Session"
  }'
```

**Response:**

```json
{
  "status": "error",
  "error": "Permission denied: ai.notebooks.use"
}
```

### 404 Not Found

**Session not found:**

```bash
curl -X GET "${API_URL}/v1/sessions/nonexistent_session_id" \
  -H "Authorization: Bearer ${AUTH_TOKEN}"
```

**Response:**

```json
{
  "status": "error",
  "error": "Session nonexistent_session_id has no metadata"
}
```

**Document not found:**

```bash
curl -X DELETE "${API_URL}/v1/sessions/${SESSION_ID}/documents/nonexistent-doc" \
  -H "Authorization: Bearer ${AUTH_TOKEN}"
```

**Response:**

```json
{
  "status": "error",
  "error": "Document not found: nonexistent-doc"
}
```

**User access denied:**

```bash
# User Bob trying to access Alice's session
curl -X GET "${API_URL}/v1/sessions/${SESSION_ID}" \
  -H "Authorization: Bearer ${BOB_TOKEN}"
```

**Response:**

```json
{
  "status": "error",
  "error": "User user:default/bob does not have access to session vs_1234567890abcdef"
}
```

---

## Complete Workflow Example

Here's a complete workflow from creating a session to querying with RAG:

```bash
# 1. Create a session
SESSION_RESPONSE=$(curl -s -X POST "${API_URL}/v1/sessions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -d '{
    "name": "ML Research Session",
    "description": "Machine learning research papers",
    "metadata": {
      "category": "research",
      "tags": ["ml", "deep-learning"],
      "project": "ai-research"
    }
  }')

# Extract session ID
SESSION_ID=$(echo $SESSION_RESPONSE | jq -r '.session.session_id')
echo "Created session: $SESSION_ID"

# 2. Upload documents
echo "Uploading PDF..."
curl -X POST "${API_URL}/v1/sessions/${SESSION_ID}/documents/upload" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -F "fileType=pdf" \
  -F "file=@transformer-paper.pdf" \
  -F "title=Attention Is All You Need"

echo "Uploading from URL..."
curl -X POST "${API_URL}/v1/sessions/${SESSION_ID}/documents/upload" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -F "fileType=url" \
  -F "file=https://arxiv.org/abs/1706.03762" \
  -F "title=BERT Paper"

# 3. List all documents
echo "Listing documents..."
curl -X GET "${API_URL}/v1/sessions/${SESSION_ID}/documents" \
  -H "Authorization: Bearer ${AUTH_TOKEN}"

# 4. Query with RAG
echo "Querying..."
curl -X POST "${API_URL}/v1/sessions/${SESSION_ID}/query" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -d '{
    "query": "What is the main innovation in the transformer architecture?",
    "model": "meta-llama/Llama-3.3-70B-Instruct",
    "temperature": 0.7
  }'

# 5. Follow-up query with conversation ID
curl -X POST "${API_URL}/v1/sessions/${SESSION_ID}/query" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -d '{
    "query": "How does it compare to previous architectures?",
    "conversation_id": "conv_ml_research_1",
    "model": "meta-llama/Llama-3.3-70B-Instruct"
  }'

# 6. Update a document
curl -X PUT "${API_URL}/v1/sessions/${SESSION_ID}/documents/attention-is-all-you-need" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -F "title=Transformer Architecture Paper (2017)"

# 7. Clean up (optional)
# curl -X DELETE "${API_URL}/v1/sessions/${SESSION_ID}" \
#   -H "Authorization: Bearer ${AUTH_TOKEN}"
```

---

## Tips for Testing

1. **Use jq for JSON parsing:**

   ```bash
   # Install jq: sudo apt install jq (Ubuntu) or brew install jq (macOS)

   # Pretty print responses
   curl -X GET "${API_URL}/v1/sessions" | jq '.'

   # Extract specific fields
   SESSION_ID=$(curl -s -X POST "${API_URL}/v1/sessions" -d '{"name":"Test"}' | jq -r '.session.session_id')
   ```

2. **Save responses to files:**

   ```bash
   curl -X GET "${API_URL}/v1/sessions/${SESSION_ID}" -o session.json
   ```

3. **Verbose output for debugging:**

   ```bash
   curl -v -X POST "${API_URL}/v1/sessions" -d '{"name":"Test"}'
   ```

4. **Test streaming responses:**

   ```bash
   # Use --no-buffer to see streaming output in real-time
   curl -N --no-buffer -X POST "${API_URL}/v1/sessions/${SESSION_ID}/query" \
     -H "Content-Type: application/json" \
     -d '{"query":"Test query"}'
   ```

5. **Load test data from files:**

   ```bash
   # Store request body in file
   cat > create-session.json <<EOF
   {
     "name": "Test Session",
     "description": "Testing API",
     "metadata": {
       "category": "test"
     }
   }
   EOF

   curl -X POST "${API_URL}/v1/sessions" \
     -H "Content-Type: application/json" \
     -d @create-session.json
   ```
