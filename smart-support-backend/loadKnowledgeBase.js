/**
 * Knowledge Base Loader
 * Run this script to populate the vector database with knowledge base documents
 */

require('dotenv').config({ override: true });

const RAGService = require('./ragService');
const knowledgeBase = require('./knowledgeBase');

async function loadKnowledgeBase() {
  console.log('🚀 Starting knowledge base ingestion...\n');

  try {
    // Initialize RAG service
    const ragService = new RAGService({
      openaiApiKey: process.env.OPENAI_API_KEY,
      pineconeApiKey: process.env.PINECONE_API_KEY, // Optional - will use local store if not provided
      indexName: process.env.PINECONE_INDEX_NAME || 'smart-support-kb'
    });

    await ragService.initialize();
    console.log('✅ RAG service initialized\n');

    // Clear existing data (optional - comment out if you want to preserve existing data)
    console.log('🗑️  Clearing existing knowledge base...');
    try {
      await ragService.clearAll();
      console.log('✅ Cleared\n');
    } catch (error) {
      // If index is empty, that's fine - just continue
      if (error.message && error.message.includes('404')) {
        console.log('✅ Index is empty, ready to load\n');
      } else {
        throw error;
      }
    }

    // Load documents
    console.log(`📚 Loading ${knowledgeBase.length} documents...`);
    const startTime = Date.now();

    const documentIds = await ragService.addDocuments(knowledgeBase);
    
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    console.log(`✅ Successfully loaded ${documentIds.length} documents in ${duration}s\n`);

    // Display statistics
    const stats = await ragService.getStats();
    console.log('📊 Knowledge Base Statistics:');
    console.log(`   Total Documents: ${stats.totalDocuments}`);
    console.log(`   Storage Type: ${stats.storageType}`);
    
    // Test search (wait a moment for Pinecone to index, then test with lower threshold)
    console.log('\n🔍 Testing search functionality...');
    console.log('   Waiting 2 seconds for Pinecone to index vectors...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const testQuery = 'How long does shipping take?';
    console.log(`   Query: "${testQuery}"`);
    
    const searchResults = await ragService.search(testQuery, { topK: 3, minScore: 0.5 });
    console.log(`   Found ${searchResults.length} relevant documents:\n`);
    
    searchResults.forEach((result, idx) => {
      console.log(`   [${idx + 1}] Score: ${result.score.toFixed(3)} | Category: ${result.metadata.category}`);
      console.log(`       ${result.text.substring(0, 100)}...\n`);
    });

    console.log('✅ Knowledge base loaded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error loading knowledge base:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  loadKnowledgeBase();
}

module.exports = loadKnowledgeBase;

