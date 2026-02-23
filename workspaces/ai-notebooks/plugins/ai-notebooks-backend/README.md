# AI Notebooks Backend

Backend plugin for AI Notebooks that provides session and document management with RAG capabilities.

## Features

- **Session Management**: Create, read, update, delete notebook sessions
- **Document Upload**: Upload documents to sessions for RAG
- **Vector Search**: Query documents using Llama Stack vector search
- **User Isolation**: Application-level security via session ID prefixes
- **SQLite Backend**: Persistence via Llama Stack's SQLite configuration

## Installation

```bash
# From workspace root
yarn install
yarn workspace @red-hat-developer-hub/backstage-plugin-ai-notebooks-backend build
```

## Configuration

Add to your `app-config.yaml`:

```yaml
aiNotebooks:
  llamaStack:
    url: http://localhost:8321  # Llama Stack service URL
```

## Integration

Add to your backend in `packages/backend/src/index.ts`:

```typescript
import aiNotebooks from '@red-hat-developer-hub/backstage-plugin-ai-notebooks-backend';

const backend = createBackend();
// ... other plugins
backend.add(aiNotebooks());
```

## API Endpoints

### Sessions

- `POST /api/ai-notebooks/v1/sessions` - Create session
- `GET /api/ai-notebooks/v1/sessions` - List sessions (with optional filters)
- `GET /api/ai-notebooks/v1/sessions/:sessionId` - Get session
- `PUT /api/ai-notebooks/v1/sessions/:sessionId` - Update session
- `DELETE /api/ai-notebooks/v1/sessions/:sessionId` - Delete session

### Documents

- `POST /api/ai-notebooks/v1/sessions/:sessionId/documents` - Upload document
- `GET /api/ai-notebooks/v1/sessions/:sessionId/documents` - List documents

### Query

- `POST /api/ai-notebooks/v1/sessions/:sessionId/query` - Query with RAG

## Development

```bash
yarn start
yarn test
yarn lint
```

## Architecture

The backend uses **ONLY** Llama Stack APIs:
- `vectorDBs.register()` - Create session vector DB
- `vectorDBs.list()` - List user's sessions
- `vectorDBs.unregister()` - Delete session
- `vectorIo.insert()` - Upload document chunks
- `vectorIo.query()` - Search documents

No direct database access! Llama Stack handles all storage via SQLite.

## License

Apache-2.0
