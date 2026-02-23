# AI Notebooks

AI Notebooks provides session-based document management with Retrieval Augmented Generation (RAG) capabilities for Red Hat Developer Hub.

## Features

- **Session Management**: Create isolated sessions for organizing related documents
- **Document Upload**: Upload and manage documents within sessions
- **Vector Search**: Powered by Llama Stack with FAISS and SQLite backend
- **User Isolation**: Application-level security with session ID prefixes

## Architecture

The AI Notebooks workspace includes:

- **ai-notebooks-backend**: Backend plugin that provides REST API for session and document management
- Uses Llama Stack APIs for vector database operations
- SQLite-backed storage for persistence (configured in Llama Stack)

## Prerequisites

- Node.js 20 or 22
- Llama Stack running on port 8321 (default)
- Configured with SQLite storage backend

## Development

```bash
# Install dependencies
yarn install

# Start development environment
yarn dev

# Start only backend
yarn start-backend

# Run tests
yarn test:all

# Lint code
yarn lint
```

## Configuration

Configure in `app-config.yaml`:

```yaml
aiNotebooks:
  llamaStack:
    url: http://localhost:8321  # Llama Stack service URL
```

## API Endpoints

- `POST /api/ai-notebooks/v1/sessions` - Create a session
- `GET /api/ai-notebooks/v1/sessions` - List sessions for user
- `GET /api/ai-notebooks/v1/sessions/:sessionId` - Get session details
- `PUT /api/ai-notebooks/v1/sessions/:sessionId` - Update session
- `DELETE /api/ai-notebooks/v1/sessions/:sessionId` - Delete session
- `POST /api/ai-notebooks/v1/sessions/:sessionId/documents` - Upload document
- `POST /api/ai-notebooks/v1/sessions/:sessionId/query` - Query session with RAG

## Learn More

- [Llama Stack Documentation](https://github.com/meta-llama/llama-stack)
- [Red Hat Developer Hub](https://developers.redhat.com/rhdh)
