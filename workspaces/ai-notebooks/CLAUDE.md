# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## AI Notebooks Overview

AI Notebooks provides session-based document management with Retrieval Augmented Generation (RAG) capabilities for Red Hat Developer Hub. It includes a backend plugin that interfaces with Llama Stack for vector database operations and document management.

## Key Commands

All commands run from workspace root (`workspaces/ai-notebooks/`):

### Development

```bash
# Start full Backstage environment (app + backend)
yarn dev

# Start only frontend
yarn start

# Start only backend
yarn start-backend

# Build backend only
yarn build:backend
```

### Testing

```bash
# Run tests with coverage
yarn test:all

# Run tests without coverage
yarn test

# Run specific test file
yarn test path/to/file.test.ts
```

### Code Quality

```bash
# Lint changes since main branch
yarn lint

# Lint all files
yarn lint:all

# Fix linting issues
yarn fix

# TypeScript type checking
yarn tsc
yarn tsc:full  # Skip lib check, no incremental

# Format checking
yarn prettier:check
```

### Build and Release

```bash
# Build all packages
yarn build:all

# Generate API reports (required when modifying public APIs)
yarn build:api-reports

# Create changeset for release
yarn changeset
```

## Architecture

### Plugin Structure

```
workspaces/ai-notebooks/
├── plugins/
│   └── ai-notebooks-backend/     # Backend plugin
│       ├── src/
│       │   ├── service/
│       │   │   ├── router.ts              # Express router with all endpoints
│       │   │   ├── session-service.ts     # Session management via Llama Stack
│       │   │   ├── document-service.ts    # Document upload and RAG
│       │   │   ├── fileParser.ts          # PDF/text parsing
│       │   │   ├── auth-helpers.ts        # Permission checks
│       │   │   └── permissions.ts         # Permission definitions
│       │   ├── types/
│       │   │   └── index.ts               # TypeScript types
│       │   ├── plugin.ts                  # Plugin registration
│       │   └── index.ts                   # Public exports
│       └── config.d.ts                    # Configuration schema
├── packages/
│   ├── app/                     # Full Backstage frontend for development
│   └── backend/                 # Full Backstage backend for development
└── package.json                 # Workspace root
```

### Backend Services

The backend plugin provides two main services:

#### SessionService (session-service.ts)

Manages notebook sessions with dedicated vector databases:

- **Session ID format**: `session-{sanitized_user_id}-{timestamp}-{random}`
- **Metadata storage**: Stored as special chunk (`__session_metadata__`) in vector DB
- **User isolation**: Application-level via session ID prefixes
- **Vector DB provider**: FAISS (configured via `providerId` property)

**Critical Implementation Details**:
- When calling `this.client.vectorIo.query()` or `this.client.vectorIo.insert()`, you MUST pass `provider_id: this.providerId` as a top-level parameter
- Example: `await this.client.vectorIo.query({ vector_db_id: vectorDbId, provider_id: this.providerId, ... })`
- The provider_id tells Llama Stack which vector IO provider to use (defaults to 'faiss')

#### DocumentService (document-service.ts)

Handles document uploads and RAG data ingestion:

- **File parsing**: Supports PDF (via pdfjs-dist), text, markdown, JSON, YAML, logs, and URLs
- **Chunking**: Content split into ~512 word chunks for vector storage
- **Metadata tracking**: Documents tracked in session metadata (`document_ids`, `document_count`)
- **File size limit**: 20MB max upload size

### API Endpoints

All endpoints under `/api/ai-notebooks`:

**Sessions**:
- `POST /v1/sessions` - Create session
- `GET /v1/sessions` - List sessions (with optional filters: category, tags, project)
- `GET /v1/sessions/:sessionId` - Get session details
- `PUT /v1/sessions/:sessionId` - Update session
- `DELETE /v1/sessions/:sessionId` - Delete session

**Documents**:
- `POST /v1/sessions/:sessionId/documents/upload` - Upload document (multipart/form-data or URL)
- `GET /v1/sessions/:sessionId/documents` - List documents

**Query**:
- `POST /v1/sessions/:sessionId/query` - Query session with RAG (streams response)

## Configuration

### app-config.yaml

```yaml
aiNotebooks:
  enabled: true  # Feature toggle (default: true)

  llamaStack:
    url: ${AI_NOTEBOOKS_LLAMA_STACK_URL:-http://0.0.0.0:8321}
    embeddingModel: ${AI_NOTEBOOKS_EMBEDDING_MODEL:-all-MiniLM-L6-v2}
    embeddingDimension: ${AI_NOTEBOOKS_EMBEDDING_DIMENSION:-384}

  # Optional system prompt for notebook queries
  # systemPrompt: "You are an AI assistant..."
```

### Permission Framework

Uses simplified RBAC with feature-level access control:

- **Single permission**: `ai.notebooks.use` (action: 'update')
- **Binary access**: Users either have full access or no access
- **Data isolation**: Enforced by application logic (session ID prefixes)

**RBAC Policy Example** (`rbac-policy.csv`):

```csv
# Grant access to AI Notebooks feature
p, role:default/ai-notebooks-users, ai.notebooks.use, update, allow

# Assign users
g, user:default/alice, role:default/ai-notebooks-users
g, group:default/engineering-team, role:default/ai-notebooks-users
```

**Note**: Several endpoints currently have permission checks commented out for testing. See router.ts lines 114-119, 159-164, 296-301, 335-340, 443-448, 483-488.

## External Dependencies

### Llama Stack

Required service for vector operations and LLM queries:

- Default URL: `http://0.0.0.0:8321`
- Provides chat completions API (OpenAI-compatible)
- Manages vector databases with FAISS provider
- SQLite backend for persistence

**Key APIs used**:
- `client.vectorStores.create()` - Register new vector database
- `client.vectorStores.list()` - List vector databases
- `client.vectorStores.delete()` - Unregister vector database
- `client.vectorIo.insert()` - Insert chunks into vector DB (requires `provider_id`)
- `client.vectorIo.query()` - Query vector DB (requires `provider_id`)

### File Upload Handling

- **Max size**: 20MB (configured via multer)
- **Supported types**: md, txt, pdf, json, yaml, yml, log, url
- **PDF parsing**: Uses `pdfjs-dist` library
- **Chunking**: 512 word chunks for vector storage

## Common Development Patterns

### Working with Vector IO

Always specify `provider_id` when calling vectorIo methods:

```typescript
// Correct
await this.client.vectorIo.query({
  vector_db_id: vectorDbId,
  provider_id: this.providerId,  // Required!
  query: searchTerm,
  params: { max_chunks: 10 }
});

// Incorrect - will fail with "not served by provider" error
await this.client.vectorIo.query({
  vector_db_id: vectorDbId,
  query: searchTerm,
  params: { max_chunks: 10 }
});
```

### Session Metadata Storage

Session metadata is stored as a special chunk in the vector database:

- **Document ID**: `__session_metadata__`
- **Content**: JSON-stringified session object
- **Retrieval**: Queried by `SESSION_METADATA_DOC_ID` constant
- **Updates**: Stored via `storeMetadata()` private method

### User Isolation

Sessions are isolated by user ID via naming convention:

- **Format**: `session-{sanitized_user_id}-{timestamp}-{random}`
- **Sanitization**: Lowercase, replace non-alphanumeric with hyphens
- **Filtering**: `listSessions()` filters by user prefix
- **Ownership**: `readSession()` verifies `session.user_id === userId`

### Adding New Endpoints

1. Add route handler in `src/service/router.ts`
2. Add permission check: `await checkPermission(req, aiNotebooksUsePermission, httpAuth, permissions)`
3. Get user ID: `const userId = await getUserRef(req, httpAuth, userInfo)`
4. Define request/response types in `src/types/index.ts`
5. Update API documentation in README.md

## Testing Notes

- Backend tests use `@backstage/backend-test-utils` and `supertest`
- Test files follow pattern: `*.test.ts`
- Run with coverage: `yarn test:all`
- Mock Llama Stack API responses in tests

## Important Files

- `src/service/router.ts` - All API endpoints (567 lines)
- `src/service/session-service.ts` - Session CRUD operations with Llama Stack
- `src/service/document-service.ts` - Document upload and chunking
- `src/service/fileParser.ts` - PDF and file parsing logic
- `src/service/permissions.ts` - Single permission definition
- `src/types/index.ts` - TypeScript interfaces for sessions/documents/responses
- `config.d.ts` - Configuration schema for app-config.yaml
