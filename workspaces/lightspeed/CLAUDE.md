# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Lightspeed Workspace Overview

The Lightspeed workspace provides AI-powered chat capabilities for Red Hat Developer Hub (RHDH). It includes three main plugins that work together to deliver a natural language interface within the RHDH console:

- **lightspeed** (frontend): PatternFly-based chat UI with conversation management
- **lightspeed-backend**: Backend API that proxies to LLM services and manages sessions/documents
- **lightspeed-common**: Shared types, permissions, and utilities

## Key Commands

All commands should be run from the workspace root (`workspaces/lightspeed/`) unless otherwise specified.

### Development

```bash
# Start full Backstage development environment with all plugins
yarn dev

# Start only frontend app (packages/app)
yarn start

# Start only backend (packages/backend)
yarn start-backend

# Build backend only
yarn build:backend
```

### Testing

```bash
# Run all tests with coverage
yarn test:all

# Run tests without coverage
yarn test

# Run tests for a specific file
yarn test path/to/file.test.ts
```

### Code Quality

```bash
# Lint changes since main branch
yarn lint

# Lint all files in workspace
yarn lint:all

# Fix linting issues
yarn fix

# TypeScript type checking
yarn tsc
yarn tsc:full  # Skip lib check, no incremental

# Format checking and fixing
yarn prettier:check
yarn prettier:fix
```

### Build and Release

```bash
# Build all packages
yarn build:all

# Generate API reports (required when modifying public APIs)
yarn build:api-reports

# Generate API reports for specific plugin
yarn build:api-reports plugins/lightspeed-backend

# Create a changeset for release
yarn changeset
```

### Plugin Development

```bash
# Create new plugin or package within workspace
yarn new

# Start standalone plugin development (from plugin directory)
cd plugins/lightspeed
yarn start
```

## Architecture

### Plugin Structure

```
workspaces/lightspeed/
├── plugins/
│   ├── lightspeed/              # Frontend plugin
│   │   ├── src/
│   │   │   ├── components/      # React components (PatternFly Chatbot)
│   │   │   ├── hooks/           # Custom React hooks
│   │   │   ├── api/             # API client for backend
│   │   │   ├── utils/           # Utility functions
│   │   │   └── translations/    # i18n resources
│   │   └── package.json
│   ├── lightspeed-backend/      # Backend plugin
│   │   ├── src/
│   │   │   ├── service/
│   │   │   │   ├── router.ts           # Main Express router (chat + notebooks)
│   │   │   │   ├── notebooks/          # Session and document services
│   │   │   │   │   ├── session-service.ts   # Notebook session management
│   │   │   │   │   └── document-service.ts  # RAG document management
│   │   │   │   ├── auth-helpers.ts     # Permission checking utilities
│   │   │   │   ├── fileParser.ts       # PDF parsing for RAG
│   │   │   │   ├── validation.ts       # Request validation
│   │   │   │   └── types.ts            # Backend-specific types
│   │   │   ├── plugin.ts        # Backend plugin registration
│   │   │   └── index.ts
│   │   ├── config.d.ts          # Configuration schema
│   │   └── package.json
│   └── lightspeed-common/       # Shared package
│       ├── src/
│       │   ├── permissions.ts   # Permission definitions
│       │   ├── notebooks-types.ts  # Notebook session/document types
│       │   └── index.ts
│       └── package.json
├── packages/
│   ├── app/                     # Full Backstage frontend for development
│   └── backend/                 # Full Backstage backend for development
└── package.json                 # Workspace root
```

### Backend Architecture

The backend plugin (`lightspeed-backend`) provides two main feature areas:

#### 1. Chat API (LLM Proxy)

- **Endpoint**: `/v1/query` - Proxies requests to LlamaStack-compatible LLM services
- **Configuration**: Uses `lightspeed.servicePort` (default: 8080) and `lightspeed.systemPrompt`
- **Features**:
  - Conversation history management (default: 10 messages)
  - RAG support via `vector_store_ids` parameter
  - MCP (Model Context Protocol) server integration (single server support)
  - File upload support (PDF parsing up to 20MB)

#### 2. Notebooks API (Session/Document Management)

- **Sessions**: Organize related documents for RAG (Retrieval Augmented Generation)
  - Endpoints: `GET/POST/PATCH/DELETE /sessions`
  - Each session has a unique `vector_db_id` for LlamaStack
- **Documents**: Upload and manage files within sessions
  - Endpoints: `POST /sessions/:id/documents`, `DELETE /sessions/:id/documents/:documentId`
  - Supports PDF files with automatic text extraction
- **LlamaStack Integration**: Uses `lightspeed.llamaStackPort` (default: 8321)

#### Services

- **SessionService** (`notebooks/session-service.ts`): Manages notebook sessions via LlamaStack API
- **DocumentService** (`notebooks/document-service.ts`): Handles document uploads and RAG data ingestion
- **fileParser** (`fileParser.ts`): PDF text extraction using `pdfjs-dist`

### Frontend Architecture

The frontend plugin (`lightspeed`) is built on PatternFly Chatbot components:

- **Components**: PatternFly Chatbot UI with conversation sidebar
- **API Client**: TanStack Query (React Query) for API interaction
- **State Management**: React hooks with local state
- **UI Libraries**:
  - PatternFly (@patternfly/chatbot, @patternfly/react-core)
  - Material-UI (for Backstage integration)
  - react-markdown for message rendering

### Common Package

The `lightspeed-common` package provides shared code between frontend and backend:

- **Permissions**: RBAC permission definitions for chat and notebooks operations
  - Chat: `lightspeed.chat.{read,create,update,delete}`
  - Notebooks Sessions: `lightspeed.notebooks.session.{read,create,update,delete}`
  - Notebooks Documents: `lightspeed.notebooks.document.manage`
- **Types**: Session/document types, operation enums, request/response interfaces

## Configuration

### Backend Configuration (app-config.yaml)

```yaml
lightspeed:
  # Optional - Change the LS service port number. Defaults to 8080
  servicePort: 8080

  # Optional - Change the LlamaStack service port. Defaults to 8321
  llamaStackPort: 8321

  # Optional - Override the default system prompt
  systemPrompt: 'You are a helpful AI assistant...'

  # Optional - Configure MCP server (only one server supported currently)
  mcpServers:
    - name: github # Must match name configured in LlamaStack
      token: ${MCP_TOKEN} # Secret token from environment
```

### Frontend Configuration (app-config.yaml)

```yaml
lightspeed:
  # Optional - Custom welcome prompts displayed to users
  prompts:
    - title: 'Getting Started'
      message: Can you guide me through the first steps?
```

## Permission Framework

The Lightspeed plugins integrate with Backstage RBAC permissions. When RBAC is enabled, configure permissions in `rbac-policy.csv`:

```csv
# Chat permissions
p, role:default/team_a, lightspeed.chat.read, read, allow
p, role:default/team_a, lightspeed.chat.create, create, allow
p, role:default/team_a, lightspeed.chat.update, update, allow
p, role:default/team_a, lightspeed.chat.delete, delete, allow

# Notebook permissions
p, role:default/team_a, lightspeed.notebooks.session.read, read, allow
p, role:default/team_a, lightspeed.notebooks.session.create, create, allow
p, role:default/team_a, lightspeed.notebooks.session.update, update, allow
p, role:default/team_a, lightspeed.notebooks.session.delete, delete, allow
p, role:default/team_a, lightspeed.notebooks.document.manage, update, allow

# Assign role to user
g, user:default/<username>, role:default/team_a
```

**Note**: Some endpoints (`/health`, `/sessions`, `/v1/query`, `/v1/feedback`) allow unauthenticated access for testing purposes.

## External Dependencies

### LlamaStack Service

The backend requires a running LlamaStack service for LLM queries and RAG functionality:

- Default URL: `http://0.0.0.0:8321`
- Provides chat completions API (OpenAI-compatible)
- Manages vector databases for RAG
- Handles MCP server integrations

### File Size Limits

- **Upload limit**: 20MB for file uploads (configured via multer and Express body parser)
- **Supported formats**: Currently optimized for PDF files (`pdfjs-dist`)

## Common Development Patterns

### Adding New API Endpoints

1. Define request/response types in `lightspeed-common/src/` if shared, or `lightspeed-backend/src/service/types.ts` if backend-only
2. Add route handler in `lightspeed-backend/src/service/router.ts`
3. Add permission check using `checkPermission()` helper
4. Update API client in `lightspeed/src/api/` (if frontend needs it)
5. Generate API reports: `yarn build:api-reports`

### Adding New Permissions

1. Define permission in `lightspeed-common/src/permissions.ts` using `createPermission()`
2. Export from `lightspeedPermissions` or `lightspeedNotebooksPermissions` array
3. Add permission check in router using `checkPermission()` helper
4. Update documentation with new RBAC policy examples

### Working with Notebooks (RAG)

The notebooks feature uses a two-tier structure:

1. **Sessions**: Containers for related documents with unique `vector_db_id`
2. **Documents**: Individual files uploaded to a session for RAG

Each session's documents are stored in LlamaStack under the session's `vector_db_id`. When querying the chat API, pass `vector_store_ids: ['session-xyz']` to include that session's documents in the RAG context.

## Testing Notes

- Backend tests use `@backstage/backend-test-utils` and `supertest`
- Frontend tests use `@testing-library/react` with `@backstage/test-utils`
- Mock service worker (MSW) for API mocking in tests
- Test files follow pattern: `*.test.ts` or `*.test.tsx`
- Run tests with coverage: `yarn test:all`

## Dynamic Plugin Support

The frontend plugin supports dynamic loading in RHDH via Scalprum:

- Exposed modules defined in `scalprum` section of package.json
- Translation resources for i18n
- Dynamic routes for `/lightspeed` page
- App icon exports for navigation
