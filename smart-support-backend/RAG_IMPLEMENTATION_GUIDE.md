# RAG Implementation Guide

## Overview

This implementation adds **Retrieval-Augmented Generation (RAG)** to your SmartSupport customer service system. RAG enhances your AI agent by retrieving relevant information from a knowledge base before generating responses, resulting in more accurate and contextual answers.

## Architecture

### Components

1. **RAGService** (`ragService.js`)
   - Manages embeddings and vector storage
   - Supports both Pinecone (cloud) and local in-memory storage
   - Handles document ingestion and retrieval

2. **Knowledge Base** (`knowledgeBase.js`)
   - Pre-defined FAQs and policies
   - Organized by category (Shipping, Returns, Payment, etc.)
   - Easily extendable with new documents

3. **Knowledge Base Loader** (`loadKnowledgeBase.js`)
   - Script to populate the vector database
   - Converts text to embeddings using OpenAI
   - Stores embeddings in Pinecone or local storage

4. **Server Integration** (`server.js`)
   - RAG service initialized on startup
   - System messages enhanced with retrieved context
   - API endpoints for knowledge base management

## Setup Instructions

### 1. Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Required variables:
- `OPENAI_API_KEY` - For generating embeddings and chat responses

Optional (for production):
- `PINECONE_API_KEY` - For cloud vector storage
- `PINECONE_INDEX_NAME` - Name of your Pinecone index

**Note:** If you don't provide Pinecone credentials, the system will use a local in-memory vector store (perfect for development/testing).

### 2. Load Knowledge Base

Run the loader script to populate the knowledge base:

```bash
node loadKnowledgeBase.js
```

This will:
- Initialize the RAG service
- Generate embeddings for all documents
- Store them in Pinecone or local storage
- Run a test search to verify functionality

Expected output:
```
🚀 Starting knowledge base ingestion...
✅ RAG service initialized
🗑️  Clearing existing knowledge base...
📚 Loading 30 documents...
✅ Successfully loaded 30 documents in 12.5s
📊 Knowledge Base Statistics:
   Total Documents: 30
   Storage Type: local
```

### 3. Start the Server

```bash
node server.js
```

You should see:
```
✅ RAG service ready
SmartSupport backend running on port 4000
```

## How It Works

### 1. Document Ingestion

Documents are structured with:
- **Text**: The actual content
- **Metadata**: Category, source, tags
- **ID**: Unique identifier

Example:
```javascript
{
  id: 'shipping-001',
  text: 'Standard shipping takes 3-5 business days...',
  metadata: {
    category: 'Shipping',
    source: 'Shipping Policy',
    tags: ['delivery', 'timeline']
  }
}
```

### 2. Embedding Generation

When a document is added:
1. Text is sent to OpenAI's embedding API
2. Returns a 1536-dimensional vector
3. Vector is stored with metadata

### 3. Retrieval Process

When a user asks a question:
1. Question is converted to an embedding
2. System searches for similar embeddings (cosine similarity)
3. Top K most relevant documents are retrieved
4. Documents with score > threshold are included

### 4. Context Integration

Retrieved documents are formatted and added to the system prompt:

```
Relevant Knowledge Base Information:
[1] Shipping - Shipping Policy:
Standard shipping takes 3-5 business days...

[2] Returns - Return Policy:
We offer free returns within 7 days...
```

The AI agent then uses this context to answer questions accurately.

## API Endpoints

### Search Knowledge Base
```http
POST /api/rag/search
Content-Type: application/json

{
  "query": "How long does shipping take?",
  "topK": 5,
  "minScore": 0.7
}
```

Response:
```json
{
  "query": "How long does shipping take?",
  "results": [
    {
      "id": "shipping-001",
      "score": 0.89,
      "text": "Standard shipping takes 3-5 business days...",
      "metadata": {
        "category": "Shipping",
        "source": "Shipping Policy"
      }
    }
  ],
  "count": 1
}
```

### Retrieve Formatted Context
```http
POST /api/rag/retrieve
Content-Type: application/json

{
  "query": "return policy",
  "topK": 3,
  "minScore": 0.75
}
```

Response:
```json
{
  "found": true,
  "context": "[1] Returns - Return Policy:\nWe offer free returns within 7 days...",
  "sources": [
    {
      "id": "return-001",
      "score": 0.92,
      "category": "Returns",
      "source": "Return Policy"
    }
  ]
}
```

### Add Document
```http
POST /api/rag/documents
Content-Type: application/json

{
  "text": "Our premium support is available 24/7 for Gold tier customers.",
  "metadata": {
    "category": "Support",
    "source": "Premium Support Policy",
    "tags": ["gold", "premium", "24/7"]
  }
}
```

### Add Multiple Documents
```http
POST /api/rag/documents/batch
Content-Type: application/json

{
  "documents": [
    {
      "text": "Document 1 text...",
      "metadata": { "category": "Category1" }
    },
    {
      "text": "Document 2 text...",
      "metadata": { "category": "Category2" }
    }
  ]
}
```

### Get Statistics
```http
GET /api/rag/stats
```

Response:
```json
{
  "totalDocuments": 30,
  "storageType": "local"
}
```

### Clear Knowledge Base
```http
DELETE /api/rag/clear
```

**⚠️ Warning:** This deletes all documents from the knowledge base!

## Adding New Knowledge

### Option 1: Update knowledgeBase.js

Add new documents to the array:

```javascript
{
  id: 'warranty-001',
  text: 'All electronics come with a 1-year manufacturer warranty...',
  metadata: {
    category: 'Warranty',
    source: 'Warranty Policy',
    tags: ['warranty', 'guarantee', 'protection']
  }
}
```

Then reload:
```bash
node loadKnowledgeBase.js
```

### Option 2: Use API

```bash
curl -X POST http://localhost:4000/api/rag/documents \
  -H "Content-Type: application/json" \
  -d '{
    "text": "New policy information...",
    "metadata": {
      "category": "Policy",
      "source": "New Policy Document"
    }
  }'
```

## Configuration Options

### RAG Service Parameters

```javascript
const ragService = new RAGService({
  openaiApiKey: 'your-key',           // Required
  pineconeApiKey: 'your-key',         // Optional
  indexName: 'custom-index-name',     // Default: 'smart-support-kb'
  embeddingModel: 'text-embedding-3-small'  // OpenAI model
});
```

### Search Parameters

```javascript
await ragService.search(query, {
  topK: 5,          // Number of results (default: 5)
  minScore: 0.7,    // Minimum similarity score (default: 0.7)
  filter: {         // Metadata filters (optional)
    category: 'Shipping'
  }
});
```

### Retrieval Parameters

In `buildSystemMessages()`:

```javascript
const ragResults = await ragService.retrieveContext(conversationContext, {
  topK: 3,          // Number of documents to retrieve
  minScore: 0.75    // Minimum relevance score
});
```

## Best Practices

### 1. Document Structure

- **Keep documents focused**: Each document should cover one topic
- **Use descriptive metadata**: Helps with filtering and organization
- **Add relevant tags**: Improves searchability

### 2. Embedding Strategy

- **Batch processing**: Use `addDocuments()` for multiple documents
- **Regular updates**: Re-index when policies change
- **Monitor costs**: OpenAI embeddings cost ~$0.10 per 1M tokens

### 3. Retrieval Tuning

- **Adjust minScore**: Lower for more results, higher for precision
- **Optimize topK**: Balance between context size and relevance
- **Use filters**: Narrow searches by category when appropriate

### 4. Production Considerations

- **Use Pinecone**: For persistent storage and scalability
- **Cache embeddings**: Avoid regenerating for same queries
- **Monitor performance**: Track retrieval latency and accuracy
- **Version control**: Keep knowledge base in version control

## Troubleshooting

### RAG service initialization fails

**Issue**: Error connecting to Pinecone

**Solution**: 
- Verify `PINECONE_API_KEY` is correct
- Check if index name already exists
- System will fall back to local storage automatically

### No results returned

**Issue**: Search returns empty results

**Solution**:
- Lower `minScore` threshold
- Check if knowledge base is loaded (`GET /api/rag/stats`)
- Verify documents were indexed successfully

### Poor search quality

**Issue**: Irrelevant documents retrieved

**Solution**:
- Increase `minScore` for higher precision
- Improve document structure and metadata
- Use more specific queries
- Add category filters

### Memory issues (local storage)

**Issue**: High memory usage with local vector store

**Solution**:
- Switch to Pinecone for production
- Reduce number of documents
- Clear unused documents periodically

## Performance Metrics

### Embedding Generation
- **Speed**: ~50-100 docs/second
- **Cost**: ~$0.10 per 1M tokens
- **Model**: text-embedding-3-small (1536 dimensions)

### Search Performance
- **Latency**: 
  - Local: <10ms
  - Pinecone: 50-200ms
- **Accuracy**: Cosine similarity with threshold filtering

## Future Enhancements

Potential improvements:
1. **Conversation history**: Store and retrieve past conversations
2. **Dynamic updates**: Webhook to auto-update knowledge base
3. **Analytics**: Track which documents are most helpful
4. **Multi-language**: Support for multiple languages
5. **Hybrid search**: Combine vector + keyword search
6. **Fine-tuning**: Custom embedding models for domain

## Support

For questions or issues:
1. Check this guide first
2. Review server logs for error messages
3. Test with provided API endpoints
4. Verify environment variables are set correctly

## Resources

- [OpenAI Embeddings](https://platform.openai.com/docs/guides/embeddings)
- [Pinecone Documentation](https://docs.pinecone.io/)
- [RAG Best Practices](https://www.pinecone.io/learn/retrieval-augmented-generation/)

