# RAG Quick Start Guide

## ✅ What Was Implemented

Your SmartSupport backend now has a complete **Retrieval-Augmented Generation (RAG)** system that:

1. **Stores knowledge** in a vector database (Pinecone or local)
2. **Retrieves relevant information** when users ask questions
3. **Enhances AI responses** with accurate, contextual information
4. **Provides API endpoints** to manage your knowledge base

## 🚀 Getting Started (3 Steps)

### Step 1: Configure Environment

Make sure your `.env` file has the OpenAI API key:

```bash
OPENAI_API_KEY=your_openai_api_key
```

**Optional** (for production): Add Pinecone credentials
```bash
PINECONE_API_KEY=your_pinecone_api_key
PINECONE_INDEX_NAME=smart-support-kb
```

> **Note:** Without Pinecone, the system uses local in-memory storage (perfect for development).

### Step 2: Load Knowledge Base

Run this command to populate the knowledge base with FAQs and policies:

```bash
npm run load-kb
```

or

```bash
node loadKnowledgeBase.js
```

You should see:
```
✅ Successfully loaded 30 documents
📊 Total Documents: 30
```

### Step 3: Start Server

```bash
npm start
```

or

```bash
node server.js
```

You should see:
```
✅ RAG service ready
SmartSupport backend running on port 4000
```

**That's it! Your RAG system is now active! 🎉**

## 🧪 Testing the RAG System

### Test with the provided script:

```bash
npm run test-rag
```

or

```bash
node testRAG.js
```

This will:
- Test search functionality
- Test context retrieval
- Test filtered searches
- Add a new document
- Show statistics

### Test with API calls:

```bash
# Search knowledge base
curl -X POST http://localhost:4000/api/rag/search \
  -H "Content-Type: application/json" \
  -d '{"query": "How long does shipping take?"}'

# Get statistics
curl http://localhost:4000/api/rag/stats
```

## 📚 Knowledge Base Categories

Your knowledge base includes:

- **Shipping & Delivery** - Timelines, tracking, delays
- **Returns & Refunds** - Return policy, refund timeline, exchanges
- **Payment & Billing** - Payment methods, failed payments, receipts
- **Account Management** - Sign up, password reset, profile updates
- **Products & Sizing** - Size guides, stock availability, care instructions
- **Promotions** - Promo codes, loyalty program
- **Customer Service** - Contact info, escalation process
- **Technical Support** - Website issues, mobile app

## 🔧 How It Works in Your System

### Before RAG:
```
User: "What's your return policy?"
AI: Uses general knowledge + system prompt
```

### After RAG:
```
User: "What's your return policy?"
   ↓
1. Query converted to vector embedding
2. Search knowledge base (finds return policy docs)
3. Retrieved context added to system prompt
4. AI generates response using accurate policy info
   ↓
AI: "We offer free returns within 7 days of delivery for unused 
     products with original tags intact..."
```

## 📝 API Endpoints Reference

### 1. Search Knowledge Base
```http
POST /api/rag/search
{
  "query": "shipping information",
  "topK": 5,          // Number of results
  "minScore": 0.7     // Minimum relevance (0-1)
}
```

### 2. Retrieve Context
```http
POST /api/rag/retrieve
{
  "query": "return policy",
  "topK": 3,
  "minScore": 0.75
}
```

### 3. Add Document
```http
POST /api/rag/documents
{
  "text": "Your policy text here...",
  "metadata": {
    "category": "Shipping",
    "source": "Policy Document"
  }
}
```

### 4. Add Multiple Documents
```http
POST /api/rag/documents/batch
{
  "documents": [
    { "text": "...", "metadata": {...} },
    { "text": "...", "metadata": {...} }
  ]
}
```

### 5. Get Statistics
```http
GET /api/rag/stats
```

### 6. Clear Knowledge Base
```http
DELETE /api/rag/clear
```

## 🎯 Usage Examples

### Example 1: Customer asks about shipping

**User Query:** "How long will my order take to arrive?"

**What happens:**
1. RAG searches knowledge base
2. Finds: "shipping-001" (Standard shipping takes 3-5 business days...)
3. AI uses this information to answer accurately

**AI Response:** "Your order will arrive in 3-5 business days with standard shipping. If you need it sooner, express shipping delivers within 1-2 business days."

### Example 2: Customer asks about returns

**User Query:** "Can I return this item?"

**What happens:**
1. RAG retrieves return policy documents
2. Finds multiple relevant docs about returns
3. Context includes return window, conditions, process

**AI Response:** "Yes! We offer free returns within 7 days of delivery. Items must be unused with original tags. I can help you start the return process right now."

## 🔄 Updating Knowledge Base

### Method 1: Edit knowledgeBase.js

1. Open `knowledgeBase.js`
2. Add new documents to the array
3. Run: `npm run load-kb`

### Method 2: Use API

```bash
curl -X POST http://localhost:4000/api/rag/documents \
  -H "Content-Type: application/json" \
  -d '{
    "text": "New policy information...",
    "metadata": {
      "category": "Policy",
      "source": "Updated Policy 2025"
    }
  }'
```

## ⚙️ Configuration

### Adjust retrieval parameters in server.js:

```javascript
// In buildSystemMessages function
const ragResults = await ragService.retrieveContext(conversationContext, {
  topK: 3,          // More = more context, but longer prompts
  minScore: 0.75    // Higher = more relevant, fewer results
});
```

### Tune for your needs:

- **High precision**: `topK: 2, minScore: 0.85`
- **More context**: `topK: 5, minScore: 0.7`
- **Balanced**: `topK: 3, minScore: 0.75` (current)

## 🎨 Customization Tips

### 1. Add Product-Specific Knowledge

```javascript
{
  text: "The SmartWatch Pro has 48-hour battery life, water resistance up to 50m, and includes GPS tracking.",
  metadata: {
    category: "Products",
    source: "Product Specs",
    tags: ["smartwatch", "battery", "waterproof"],
    productId: "SW-PRO-001"
  }
}
```

### 2. Add Multilingual Support

```javascript
{
  text: "Standard shipping takes 3-5 business days. मानक शिपिंग में 3-5 व्यावसायिक दिन लगते हैं।",
  metadata: {
    category: "Shipping",
    source: "Shipping Policy",
    language: "en-hi"  // English-Hindi
  }
}
```

### 3. Add Troubleshooting Guides

```javascript
{
  text: "If your product won't turn on: 1) Check if battery is charged 2) Try hard reset by holding power button for 10 seconds 3) Contact support if issue persists.",
  metadata: {
    category: "Troubleshooting",
    source: "Technical Guide",
    tags: ["power", "troubleshooting", "device"]
  }
}
```

## 📊 Monitoring & Analytics

### Check knowledge base status:

```bash
curl http://localhost:4000/api/rag/stats
```

### Monitor in logs:

- RAG initialization: `✅ RAG service ready`
- Failed retrieval: `RAG retrieval error: ...`
- Search queries: Check console output

## 🐛 Troubleshooting

### "RAG service initialization failed"

**Solution:** Check that `OPENAI_API_KEY` is set correctly in `.env`

### "No results found"

**Solution:** 
1. Verify knowledge base is loaded: `curl http://localhost:4000/api/rag/stats`
2. If `totalDocuments: 0`, run: `npm run load-kb`

### "Search returns irrelevant results"

**Solution:** Increase `minScore` from 0.75 to 0.85 in `server.js`

## 🚀 Next Steps

1. **Test the system** with `npm run test-rag`
2. **Add your own content** to `knowledgeBase.js`
3. **Reload knowledge base** with `npm run load-kb`
4. **Monitor conversations** to identify gaps in knowledge
5. **Iterate and improve** based on user questions

## 📖 Full Documentation

For detailed information, see `RAG_IMPLEMENTATION_GUIDE.md`

## 💡 Tips for Success

1. **Keep documents focused** - One topic per document
2. **Use descriptive metadata** - Helps with filtering and search
3. **Update regularly** - Keep policies and information current
4. **Monitor questions** - Add FAQs based on common queries
5. **Test thoroughly** - Use the test script after major updates

---

**Questions or Issues?** Check the full guide: `RAG_IMPLEMENTATION_GUIDE.md`

