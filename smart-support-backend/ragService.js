const { Pinecone } = require('@pinecone-database/pinecone');
const OpenAI = require('openai');
const { v4: uuidv4 } = require('uuid');

class RAGService {
  constructor(options = {}) {
    this.openai = new OpenAI({
      apiKey: options.openaiApiKey || process.env.OPENAI_API_KEY
    });
    
    // Initialize Pinecone
    this.pinecone = options.pineconeApiKey ? new Pinecone({
      apiKey: options.pineconeApiKey
    }) : null;
    
    this.indexName = options.indexName || 'smart-support-kb';
    this.embeddingModel = options.embeddingModel || 'text-embedding-3-small';
    this.embeddingDimension = 1536; // dimension for text-embedding-3-small
    
    // In-memory vector store as fallback if Pinecone is not configured
    this.localVectorStore = [];
    this.usePinecone = !!options.pineconeApiKey;
    
    this.initialized = false;
  }

  /**
   * Initialize the RAG service (connect to Pinecone or use local store)
   */
  async initialize() {
    if (this.initialized) return;

    if (this.usePinecone && this.pinecone) {
      try {
        // Get or create index
        const indexList = await this.pinecone.listIndexes();
        const indexExists = indexList.indexes?.some(idx => idx.name === this.indexName);
        
        if (!indexExists) {
          console.log(`Creating Pinecone index: ${this.indexName}`);
          await this.pinecone.createIndex({
            name: this.indexName,
            dimension: this.embeddingDimension,
            metric: 'cosine',
            spec: {
              serverless: {
                cloud: 'aws',
                region: 'us-east-1'
              }
            }
          });
          
          // Wait for index to be ready
          await this.waitForIndexReady();
        }
        
        this.index = this.pinecone.index(this.indexName);
        console.log('✅ Pinecone RAG service initialized');
      } catch (error) {
        console.error('Error initializing Pinecone, falling back to local store:', error.message);
        this.usePinecone = false;
      }
    } else {
      console.log('✅ Using local in-memory vector store for RAG');
    }
    
    this.initialized = true;
  }

  /**
   * Wait for Pinecone index to be ready
   */
  async waitForIndexReady(maxAttempts = 60) {
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const indexList = await this.pinecone.listIndexes();
        const index = indexList.indexes?.find(idx => idx.name === this.indexName);
        
        if (index && index.status?.ready) {
          return true;
        }
      } catch (error) {
        console.log('Waiting for index to be ready...');
      }
      
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    throw new Error('Index creation timeout');
  }

  /**
   * Generate embeddings for text using OpenAI
   */
  async generateEmbedding(text) {
    try {
      const response = await this.openai.embeddings.create({
        model: this.embeddingModel,
        input: text
      });
      
      return response.data[0].embedding;
    } catch (error) {
      console.error('Error generating embedding:', error.message);
      throw error;
    }
  }

  /**
   * Add a document to the knowledge base
   */
  async addDocument(document) {
    if (!this.initialized) await this.initialize();

    const { id, text, metadata = {} } = document;
    const docId = id || uuidv4();
    
    // Generate embedding
    const embedding = await this.generateEmbedding(text);
    
    if (this.usePinecone && this.index) {
      // Store in Pinecone
      await this.index.upsert([{
        id: docId,
        values: embedding,
        metadata: {
          text,
          ...metadata
        }
      }]);
    } else {
      // Store locally
      this.localVectorStore.push({
        id: docId,
        embedding,
        text,
        metadata
      });
    }
    
    return docId;
  }

  /**
   * Add multiple documents in batch
   */
  async addDocuments(documents) {
    if (!this.initialized) await this.initialize();

    const results = [];
    
    // Process in batches of 100 for efficiency
    const batchSize = 100;
    for (let i = 0; i < documents.length; i += batchSize) {
      const batch = documents.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(doc => this.addDocument(doc))
      );
      results.push(...batchResults);
    }
    
    return results;
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  cosineSimilarity(vecA, vecB) {
    const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
    const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
    const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
    return dotProduct / (magnitudeA * magnitudeB);
  }

  /**
   * Search for relevant documents
   */
  async search(query, options = {}) {
    if (!this.initialized) await this.initialize();

    const topK = options.topK || 5;
    const minScore = options.minScore || 0.7;
    const filter = options.filter || {};
    
    // Generate query embedding
    const queryEmbedding = await this.generateEmbedding(query);
    
    if (this.usePinecone && this.index) {
      // Search in Pinecone
      const queryRequest = {
        vector: queryEmbedding,
        topK,
        includeMetadata: true
      };
      
      if (Object.keys(filter).length > 0) {
        queryRequest.filter = filter;
      }
      
      const results = await this.index.query(queryRequest);
      
      return results.matches
        .filter(match => match.score >= minScore)
        .map(match => ({
          id: match.id,
          score: match.score,
          text: match.metadata.text,
          metadata: match.metadata
        }));
    } else {
      // Search locally using cosine similarity
      const results = this.localVectorStore
        .map(doc => ({
          id: doc.id,
          score: this.cosineSimilarity(queryEmbedding, doc.embedding),
          text: doc.text,
          metadata: doc.metadata
        }))
        .filter(result => {
          // Apply minimum score filter
          if (result.score < minScore) return false;
          
          // Apply metadata filters
          if (Object.keys(filter).length > 0) {
            return Object.entries(filter).every(([key, value]) => {
              return result.metadata[key] === value;
            });
          }
          
          return true;
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, topK);
      
      return results;
    }
  }

  /**
   * Retrieve context for a query
   */
  async retrieveContext(query, options = {}) {
    const results = await this.search(query, options);
    
    if (results.length === 0) {
      return {
        found: false,
        context: '',
        sources: []
      };
    }
    
    // Build context string from retrieved documents
    const context = results
      .map((result, idx) => {
        const source = result.metadata.source || 'Knowledge Base';
        const category = result.metadata.category || 'General';
        return `[${idx + 1}] ${category} - ${source}:\n${result.text}`;
      })
      .join('\n\n');
    
    return {
      found: true,
      context,
      sources: results.map(r => ({
        id: r.id,
        score: r.score,
        category: r.metadata.category,
        source: r.metadata.source
      }))
    };
  }

  /**
   * Clear all documents from the knowledge base
   */
  async clearAll() {
    if (!this.initialized) await this.initialize();

    if (this.usePinecone && this.index) {
      try {
        // Check if index has any records first
        const stats = await this.index.describeIndexStats();
        const recordCount = stats.totalRecordCount || 0;
        
        if (recordCount > 0) {
          // Delete all vectors in Pinecone
          await this.index.deleteAll();
          console.log(`   Deleted ${recordCount} existing records`);
        } else {
          console.log('   Index is already empty, skipping clear');
        }
      } catch (error) {
        // If index is empty, deleteAll() throws 404 - that's fine
        if (error.message && error.message.includes('404')) {
          console.log('   Index is empty, nothing to clear');
        } else {
          throw error;
        }
      }
    } else {
      // Clear local store
      this.localVectorStore = [];
    }
  }

  /**
   * Get statistics about the knowledge base
   */
  async getStats() {
    if (!this.initialized) await this.initialize();

    if (this.usePinecone && this.index) {
      const stats = await this.index.describeIndexStats();
      return {
        totalDocuments: stats.totalRecordCount || 0,
        storageType: 'pinecone'
      };
    } else {
      return {
        totalDocuments: this.localVectorStore.length,
        storageType: 'local'
      };
    }
  }
}

module.exports = RAGService;

