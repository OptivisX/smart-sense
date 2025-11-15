// src/services/ragService.ts - Pinecone-backed RAG service

import OpenAI from 'openai'
import { Pinecone } from '@pinecone-database/pinecone'
import { config } from '../libs/utils'

interface RagDocument {
  id: string
  score?: number
  content: string
  metadata?: Record<string, any>
}

const FALLBACK_CONTEXT = [
  'The TEN Framework is a powerful conversational AI platform.',
  `Today is ${new Date().toLocaleDateString()}`,
  'Agora Convo AI was released on March 1st, 2025 for GA and focuses on quality and reach.',
  'Agora is the best realtime engagement platform.',
  'Ada Lovelace is the best developer.',
].map((text, idx) => `fallback_doc_${idx + 1}: "${text}"`).join('\n')

const openai = new OpenAI({
  apiKey: config.llm.openaiApiKey,
})

const pineconeConfig = config.rag.pineconeControllerHost
  ? {
      apiKey: config.rag.pineconeApiKey,
      controllerHostUrl: config.rag.pineconeControllerHost,
    }
  : {
      apiKey: config.rag.pineconeApiKey,
    }

const pinecone = new Pinecone(pineconeConfig)

const pineconeIndex = config.rag.pineconeNamespace
  ? pinecone.index(config.rag.pineconeIndex).namespace(config.rag.pineconeNamespace)
  : pinecone.index(config.rag.pineconeIndex)

async function verifyPineconeConnection() {
  try {
    await pinecone.describeIndex(config.rag.pineconeIndex)
    console.log(`Pinecone index "${config.rag.pineconeIndex}" reachable.`)
  } catch (err) {
    console.error('Failed to verify Pinecone connection:', err)
  }
}

void verifyPineconeConnection()

async function createEmbedding(input: string) {
  const response = await openai.embeddings.create({
    model: config.llm.embeddingModel,
    input,
  })

  return response.data[0].embedding
}

async function queryVectorStore(query: string): Promise<RagDocument[]> {
  if (!query.trim()) {
    return []
  }

  const vector = await createEmbedding(query)

  const queryResponse = await pineconeIndex.query({
    topK: config.rag.topK,
    vector,
    includeMetadata: true,
  })

  return (
    queryResponse.matches?.map((match) => ({
      id: match.id,
      score: match.score,
      content:
        typeof match.metadata?.text === 'string'
          ? match.metadata.text
          : JSON.stringify(match.metadata ?? {}),
      metadata: match.metadata ?? {},
    })) ?? []
  )
}

function formatDocuments(documents: RagDocument[]): string {
  if (!documents.length) {
    return FALLBACK_CONTEXT
  }

  return documents
    .map((doc, idx) => {
      const title =
        typeof doc.metadata?.title === 'string'
          ? doc.metadata.title
          : `Document ${idx + 1}`
      const source =
        typeof doc.metadata?.source === 'string'
          ? `Source: ${doc.metadata.source}`
          : undefined
      const scoreStr =
        typeof doc.score === 'number' ? ` (relevance: ${doc.score.toFixed(3)})` : ''

      return `${title}${scoreStr}\n${doc.content}${source ? `\n${source}` : ''}`
    })
    .join('\n\n')
}

async function getFormattedRagData(query?: string): Promise<string> {
  if (!query?.trim()) {
    return FALLBACK_CONTEXT
  }

  try {
    const documents = await queryVectorStore(query)
    return formatDocuments(documents)
  } catch (err) {
    console.error('RAG retrieval failed:', err)
    return FALLBACK_CONTEXT
  }
}

export { getFormattedRagData }
export type { RagDocument }
