# Project Structure with RAG Implementation

## 📁 File Organization

```
smart-support-backend/
│
├── server.js                      # Main Express server with RAG integration
├── ragService.js                  # RAG service (embeddings, vector storage, retrieval)
├── knowledgeBase.js              # Knowledge base documents (FAQs, policies)
├── loadKnowledgeBase.js          # Script to populate vector database
├── testRAG.js                    # Test script for RAG functionality
│
├── package.json                   # Dependencies and scripts
├── .env                          # Environment variables (API keys)
├── .env.example                  # Example environment configuration
│
├── RAG_QUICKSTART.md             # Quick start guide (START HERE!)
├── RAG_IMPLEMENTATION_GUIDE.md   # Detailed implementation documentation
└── PROJECT_STRUCTURE.md          # This file
```

## 🔄 Data Flow

### 1. System Initialization

```
server.js starts
    ↓
Initialize RAGService
    ↓
Connect to Pinecone OR use local vector store
    ↓
✅ RAG service ready
```

### 2. Knowledge Base Loading

```
Run: npm run load-kb
    ↓
loadKnowledgeBase.js
    ↓
Read knowledgeBase.js (30 documents)
    ↓
For each document:
  - Generate embedding via OpenAI
  - Store in vector database
    ↓
✅ Knowledge base populated
```

### 3. User Request Flow

```
User asks question via /api/session
    ↓
buildSystemMessages(customerId, initialQuery)
    ↓
ragService.retrieveContext(query)
    ├─> Generate query embedding
    ├─> Search vector database
    ├─> Retrieve top K relevant documents
    └─> Format context
    ↓
System prompt + Retrieved context → OpenAI
    ↓
AI generates response with accurate information
    ↓
Response sent to user via Agora
```

### 4. Knowledge Base Management

```
POST /api/rag/documents
    ↓
ragService.addDocument()
    ↓
Generate embedding
    ↓
Store in vector database
    ↓
✅ Document added
```

## 🧩 Component Interactions

```
┌─────────────────────────────────────────────────────────────┐
│                         server.js                           │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Express Server                                       │  │
│  │  - /api/session (with RAG integration)                │  │
│  │  - /api/rag/* endpoints                               │  │
│  └───────────────────────────────────────────────────────┘  │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ uses
                     ↓
┌─────────────────────────────────────────────────────────────┐
│                      ragService.js                          │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  RAGService Class                                     │  │
│  │  - generateEmbedding()                                │  │
│  │  - addDocument() / addDocuments()                     │  │
│  │  - search()                                           │  │
│  │  - retrieveContext()                                  │  │
│  └───────────────────────────────────────────────────────┘  │
└────────┬───────────────────────────────┬────────────────────┘
         │                               │
         │ calls                         │ stores/retrieves
         ↓                               ↓
┌──────────────────┐         ┌────────────────────────────────┐
│  OpenAI API      │         │  Vector Database               │
│  - Embeddings    │         │  ┌──────────────────────────┐  │
│  - Chat          │         │  │  Pinecone (cloud)        │  │
└──────────────────┘         │  │  OR                      │  │
                             │  │  Local in-memory store   │  │
                             │  └──────────────────────────┘  │
                             └────────────────────────────────┘
         ↑
         │ populated by
         │
┌─────────────────────────────────────────────────────────────┐
│                  loadKnowledgeBase.js                       │
│  - Reads knowledgeBase.js                                   │
│  - Generates embeddings                                     │
│  - Stores in vector database                                │
└─────────────────────────────────────────────────────────────┘
         ↑
         │ reads
         │
┌─────────────────────────────────────────────────────────────┐
│                    knowledgeBase.js                         │
│  Array of documents:                                        │
│  - Shipping policies                                        │
│  - Return policies                                          │
│  - Payment info                                             │
│  - FAQs                                                     │
└─────────────────────────────────────────────────────────────┘
```

## 📊 Database Schema

### Vector Database Records

Each document in the vector database has:

```javascript
{
  id: "shipping-001",              // Unique identifier
  vector: [0.123, -0.456, ...],    // 1536-dimensional embedding
  metadata: {
    text: "Full document text...", // Original text
    category: "Shipping",          // Classification
    source: "Shipping Policy",     // Source document
    tags: ["delivery", "timeline"] // Search tags
  }
}
```

## 🔌 API Endpoints

### Core Endpoints (Existing)

| Method | Endpoint      | Description                    |
|--------|---------------|--------------------------------|
| POST   | `/api/session`| Start AI agent session (RAG-enhanced) |
| POST   | `/api/stop`   | Stop AI agent session         |

### RAG Management Endpoints (New)

| Method | Endpoint                 | Description                    |
|--------|--------------------------|--------------------------------|
| POST   | `/api/rag/search`        | Search knowledge base          |
| POST   | `/api/rag/retrieve`      | Get formatted context          |
| POST   | `/api/rag/documents`     | Add single document            |
| POST   | `/api/rag/documents/batch`| Add multiple documents        |
| GET    | `/api/rag/stats`         | Get knowledge base statistics  |
| DELETE | `/api/rag/clear`         | Clear all documents            |

## 🛠️ NPM Scripts

```json
{
  "start": "node server.js",           // Start production server
  "dev": "nodemon server.js",          // Start with auto-reload
  "load-kb": "node loadKnowledgeBase.js", // Populate knowledge base
  "test-rag": "node testRAG.js"        // Test RAG functionality
}
```

## 🔑 Environment Variables

### Required
- `OPENAI_API_KEY` - For embeddings and chat completions

### Optional (Pinecone)
- `PINECONE_API_KEY` - For cloud vector storage
- `PINECONE_INDEX_NAME` - Index name (default: "smart-support-kb")

### Agora (Existing)
- `AGORA_APP_ID`
- `AGORA_APP_CERTIFICATE`
- `AGORA_CUSTOMER_ID`
- `AGORA_CUSTOMER_SECRET`

## 📦 Dependencies

### Core Dependencies
- `express` - Web framework
- `openai` - OpenAI API client (embeddings + chat)
- `@pinecone-database/pinecone` - Vector database client
- `uuid` - Generate unique IDs
- `axios` - HTTP client
- `cors` - Cross-origin resource sharing
- `dotenv` - Environment variables

### Agora Dependencies
- `agora-access-token` - Generate Agora tokens

## 🎯 Key Functions

### ragService.js

```javascript
class RAGService {
  async initialize()              // Setup vector database connection
  async generateEmbedding(text)   // Convert text → vector
  async addDocument(doc)          // Add single document
  async addDocuments(docs)        // Batch add documents
  async search(query, options)    // Semantic search
  async retrieveContext(query)    // Get formatted context
  async getStats()                // Get database statistics
  async clearAll()                // Delete all documents
}
```

### server.js

```javascript
async function buildSystemMessages(customerId, conversationContext)
  // Builds system prompt with RAG context
  
// RAG Endpoints
POST   /api/rag/search           // Search knowledge base
POST   /api/rag/retrieve         // Get formatted context  
POST   /api/rag/documents        // Add document
POST   /api/rag/documents/batch  // Add multiple documents
GET    /api/rag/stats            // Get statistics
DELETE /api/rag/clear            // Clear knowledge base
```

## 🔄 Development Workflow

### 1. Initial Setup
```bash
npm install                    # Install dependencies
cp .env.example .env          # Configure environment
npm run load-kb               # Load knowledge base
```

### 2. Development
```bash
npm run dev                   # Start with auto-reload
npm run test-rag              # Test RAG functionality
```

### 3. Update Knowledge Base
```bash
# Edit knowledgeBase.js
npm run load-kb               # Reload knowledge base
npm run test-rag              # Verify changes
```

### 4. Production
```bash
npm start                     # Start production server
```

## 🧪 Testing Flow

```
npm run test-rag
    ↓
testRAG.js executes:
    1. Initialize RAG service
    2. Check statistics
    3. Test search with 5 queries
    4. Test context retrieval
    5. Test filtered search
    6. Test document addition
    7. Display final statistics
    ↓
✅ All tests pass
```

## 📈 Scaling Considerations

### Local Storage (Development)
- **Pros**: No external dependencies, fast setup
- **Cons**: Not persistent, limited by memory
- **Use case**: Development, testing, small datasets

### Pinecone (Production)
- **Pros**: Persistent, scalable, fast queries
- **Cons**: Requires API key, costs for large datasets
- **Use case**: Production, large datasets

### Migration Path
```
Development (Local) 
    ↓
Testing (Local with real data)
    ↓
Staging (Pinecone)
    ↓
Production (Pinecone)
```

## 🎨 Customization Points

### 1. Embedding Model
```javascript
// In ragService.js
this.embeddingModel = 'text-embedding-3-small'  // Fast, cheap
// OR
this.embeddingModel = 'text-embedding-3-large'  // Better quality
```

### 2. Search Parameters
```javascript
// In server.js buildSystemMessages()
topK: 3,         // Number of documents to retrieve
minScore: 0.75   // Minimum relevance threshold
```

### 3. Knowledge Base Structure
```javascript
// In knowledgeBase.js
{
  id: "custom-001",
  text: "Your content",
  metadata: {
    category: "YourCategory",
    source: "YourSource",
    customField: "customValue"  // Add your own fields
  }
}
```

## 🔒 Security Considerations

1. **API Keys**: Never commit `.env` file
2. **Rate Limiting**: Consider adding rate limits to RAG endpoints
3. **Input Validation**: Validate user queries before processing
4. **Access Control**: Add authentication for management endpoints

## 📚 Documentation Files

- `RAG_QUICKSTART.md` - Start here for quick setup
- `RAG_IMPLEMENTATION_GUIDE.md` - Detailed technical documentation
- `PROJECT_STRUCTURE.md` - This file (architecture overview)

## 🎓 Learning Resources

To understand the code better, read in this order:

1. `RAG_QUICKSTART.md` - Understand what was built
2. `knowledgeBase.js` - See the data structure
3. `ragService.js` - Understand the core RAG logic
4. `loadKnowledgeBase.js` - See how data is loaded
5. `server.js` - See how RAG integrates with your API
6. `testRAG.js` - See usage examples

---

**Need help?** Check `RAG_QUICKSTART.md` for common issues and solutions.

