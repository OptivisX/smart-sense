/**
 * Test script to demonstrate RAG functionality
 * Run: node testRAG.js
 */

require('dotenv').config({ override: true });

const RAGService = require('./ragService');

async function testRAG() {
  console.log('🧪 Testing RAG Implementation\n');
  console.log('='.repeat(60));

  try {
    // Initialize RAG service
    console.log('\n1️⃣  Initializing RAG service...');
    const ragService = new RAGService({
      openaiApiKey: process.env.OPENAI_API_KEY,
      pineconeApiKey: process.env.PINECONE_API_KEY,
      indexName: process.env.PINECONE_INDEX_NAME || 'smart-support-kb'
    });

    await ragService.initialize();
    console.log('   ✅ RAG service initialized');

    // Get statistics
    console.log('\n2️⃣  Knowledge Base Statistics:');
    const stats = await ragService.getStats();
    console.log(`   📊 Total documents: ${stats.totalDocuments}`);
    console.log(`   💾 Storage type: ${stats.storageType}`);

    if (stats.totalDocuments === 0) {
      console.log('\n   ⚠️  Knowledge base is empty!');
      console.log('   Run: node loadKnowledgeBase.js');
      process.exit(1);
    }

    // Test queries
    const testQueries = [
      'How long does shipping take?',
      'What is your return policy?',
      'How can I track my order?',
      'What payment methods do you accept?',
      'How do I reset my password?'
    ];

    console.log('\n3️⃣  Testing Search Functionality:');
    console.log('   ' + '-'.repeat(58));

    for (const query of testQueries) {
      console.log(`\n   🔍 Query: "${query}"`);
      
      const results = await ragService.search(query, {
        topK: 2,
        minScore: 0.7
      });

      if (results.length === 0) {
        console.log('      ❌ No results found');
      } else {
        console.log(`      ✅ Found ${results.length} result(s):\n`);
        results.forEach((result, idx) => {
          console.log(`      [${idx + 1}] Score: ${result.score.toFixed(3)}`);
          console.log(`          Category: ${result.metadata.category}`);
          console.log(`          Source: ${result.metadata.source}`);
          console.log(`          Preview: ${result.text.substring(0, 80)}...`);
          console.log();
        });
      }
    }

    // Test context retrieval
    console.log('\n4️⃣  Testing Context Retrieval:');
    console.log('   ' + '-'.repeat(58));
    
    const contextQuery = 'I want to return an item and get a refund';
    console.log(`\n   🔍 Query: "${contextQuery}"`);
    
    const context = await ragService.retrieveContext(contextQuery, {
      topK: 3,
      minScore: 0.75
    });

    if (context.found) {
      console.log(`   ✅ Retrieved context with ${context.sources.length} sources\n`);
      console.log('   📄 Formatted Context:');
      console.log('   ' + '-'.repeat(58));
      
      // Split context into lines and indent each line
      const contextLines = context.context.split('\n');
      contextLines.forEach(line => {
        console.log(`   ${line}`);
      });
      
      console.log('\n   📚 Sources:');
      context.sources.forEach((source, idx) => {
        console.log(`   [${idx + 1}] ${source.category} - ${source.source} (Score: ${source.score.toFixed(3)})`);
      });
    } else {
      console.log('   ❌ No relevant context found');
    }

    // Test with category filter
    console.log('\n5️⃣  Testing Filtered Search:');
    console.log('   ' + '-'.repeat(58));
    
    const filteredQuery = 'How does it work?';
    const category = 'Shipping';
    console.log(`\n   🔍 Query: "${filteredQuery}"`);
    console.log(`   🏷️  Filter: category = "${category}"`);
    
    const filteredResults = await ragService.search(filteredQuery, {
      topK: 3,
      minScore: 0.6,
      filter: { category }
    });

    if (filteredResults.length === 0) {
      console.log('      ❌ No results found with filter');
    } else {
      console.log(`      ✅ Found ${filteredResults.length} result(s):\n`);
      filteredResults.forEach((result, idx) => {
        console.log(`      [${idx + 1}] ${result.metadata.category} - Score: ${result.score.toFixed(3)}`);
        console.log(`          ${result.text.substring(0, 100)}...`);
        console.log();
      });
    }

    // Test adding a new document
    console.log('\n6️⃣  Testing Document Addition:');
    console.log('   ' + '-'.repeat(58));
    
    const newDoc = {
      text: 'Our gift cards never expire and can be used for any product on our website. They make perfect gifts for any occasion!',
      metadata: {
        category: 'Promotions',
        source: 'Gift Card Policy',
        tags: ['gift card', 'expiry', 'gifts']
      }
    };

    console.log('\n   ➕ Adding new document...');
    const docId = await ragService.addDocument(newDoc);
    console.log(`   ✅ Document added with ID: ${docId}`);

    // Search for the newly added document
    console.log('\n   🔍 Searching for newly added document...');
    const newDocResults = await ragService.search('Do gift cards expire?', {
      topK: 1,
      minScore: 0.7
    });

    if (newDocResults.length > 0) {
      console.log('   ✅ New document found!');
      console.log(`      Score: ${newDocResults[0].score.toFixed(3)}`);
      console.log(`      Text: ${newDocResults[0].text}`);
    } else {
      console.log('   ⚠️  New document not found (may need higher similarity)');
    }

    // Final statistics
    console.log('\n7️⃣  Final Statistics:');
    console.log('   ' + '-'.repeat(58));
    const finalStats = await ragService.getStats();
    console.log(`   📊 Total documents: ${finalStats.totalDocuments}`);

    console.log('\n' + '='.repeat(60));
    console.log('✅ All tests completed successfully!');
    console.log('='.repeat(60) + '\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run tests
if (require.main === module) {
  testRAG();
}

module.exports = testRAG;

