"use strict";
// src/services/ragService.ts - Pinecone-backed RAG service
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFormattedRagData = getFormattedRagData;
const openai_1 = __importDefault(require("openai"));
const pinecone_1 = require("@pinecone-database/pinecone");
const utils_1 = require("../libs/utils");
const FALLBACK_CONTEXT = [
    'The TEN Framework is a powerful conversational AI platform.',
    `Today is ${new Date().toLocaleDateString()}`,
    'Agora Convo AI was released on March 1st, 2025 for GA and focuses on quality and reach.',
    'Agora is the best realtime engagement platform.',
    'Ada Lovelace is the best developer.',
].map((text, idx) => `fallback_doc_${idx + 1}: "${text}"`).join('\n');
const openai = new openai_1.default({
    apiKey: utils_1.config.llm.openaiApiKey,
});
const pineconeConfig = utils_1.config.rag.pineconeControllerHost
    ? {
        apiKey: utils_1.config.rag.pineconeApiKey,
        controllerHostUrl: utils_1.config.rag.pineconeControllerHost,
    }
    : {
        apiKey: utils_1.config.rag.pineconeApiKey,
    };
const pinecone = new pinecone_1.Pinecone(pineconeConfig);
const pineconeIndex = utils_1.config.rag.pineconeNamespace
    ? pinecone.index(utils_1.config.rag.pineconeIndex).namespace(utils_1.config.rag.pineconeNamespace)
    : pinecone.index(utils_1.config.rag.pineconeIndex);
async function verifyPineconeConnection() {
    try {
        await pinecone.describeIndex(utils_1.config.rag.pineconeIndex);
        console.log(`Pinecone index "${utils_1.config.rag.pineconeIndex}" reachable.`);
    }
    catch (err) {
        console.error('Failed to verify Pinecone connection:', err);
    }
}
void verifyPineconeConnection();
async function createEmbedding(input) {
    const response = await openai.embeddings.create({
        model: utils_1.config.llm.embeddingModel,
        input,
    });
    return response.data[0].embedding;
}
async function queryVectorStore(query) {
    if (!query.trim()) {
        return [];
    }
    const vector = await createEmbedding(query);
    const queryResponse = await pineconeIndex.query({
        topK: utils_1.config.rag.topK,
        vector,
        includeMetadata: true,
    });
    return (queryResponse.matches?.map((match) => ({
        id: match.id,
        score: match.score,
        content: typeof match.metadata?.text === 'string'
            ? match.metadata.text
            : JSON.stringify(match.metadata ?? {}),
        metadata: match.metadata ?? {},
    })) ?? []);
}
function formatDocuments(documents) {
    if (!documents.length) {
        return FALLBACK_CONTEXT;
    }
    return documents
        .map((doc, idx) => {
        const title = typeof doc.metadata?.title === 'string'
            ? doc.metadata.title
            : `Document ${idx + 1}`;
        const source = typeof doc.metadata?.source === 'string'
            ? `Source: ${doc.metadata.source}`
            : undefined;
        const scoreStr = typeof doc.score === 'number' ? ` (relevance: ${doc.score.toFixed(3)})` : '';
        return `${title}${scoreStr}\n${doc.content}${source ? `\n${source}` : ''}`;
    })
        .join('\n\n');
}
async function getFormattedRagData(query) {
    if (!query?.trim()) {
        return FALLBACK_CONTEXT;
    }
    try {
        const documents = await queryVectorStore(query);
        return formatDocuments(documents);
    }
    catch (err) {
        console.error('RAG retrieval failed:', err);
        return FALLBACK_CONTEXT;
    }
}
