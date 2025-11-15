import Fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import { chatCompletionRoutes } from './routes/chatCompletion'
import { config } from './libs/utils'
import { registerStructuredDataChannel } from './libs/websocketHub'

require('dotenv').config({override: true})

// Create Fastify instance
const fastify = Fastify({
  logger: {
    transport: {
      target: 'pino-pretty',
      options: {
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname',
      },
    },
  },
})

registerStructuredDataChannel(fastify.server)

// Register plugins
fastify.register(helmet)
fastify.register(cors)

// Register routes
const v1Router = async (fastify: any) => {
  fastify.register(chatCompletionRoutes, { prefix: '/chat' })
}

fastify.register(v1Router, { prefix: '/v1' })

// Default route
fastify.get('/', async () => {
  return {
    message:
      'Welcome to a custom LLM using OpenAI API and built for Agora Convo AI Engine! Documentation is available at https://github.com/AgoraIO-Community/agora-convo-ai-custom-llm-fastify',
  }
})

// Health check endpoint
fastify.get('/ping', async () => {
  return { message: 'pong' }
})

// Start the server
const start = async () => {
  try {
    await fastify.listen({ port: config.port, host: '0.0.0.0' })
    console.log(`Server is running on port ${config.port}`)
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}

// Only start the server if this file is run directly
if (require.main === module) {
  start()
}

export default fastify
