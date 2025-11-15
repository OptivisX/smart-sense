import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { processChatCompletion } from '../services/openaiCompletionsService'
import { processResponses } from '../services/openaiResponsesService'
import { validateRequest } from '../middleware/auth'
import { config } from '../libs/utils'
import { emitStructuredDataFromText } from '../libs/structuredDataUtils'

const streamDecoder = new TextDecoder()

function getAssistantMessageContent(result: any): string {
  const content = result?.choices?.[0]?.message?.content
  if (!content) {
    return ''
  }

  if (typeof content === 'string') {
    return content
  }

  if (Array.isArray(content)) {
    return content
      .map((item) => {
        if (typeof item === 'string') {
          return item
        }
        if (item && typeof item.text === 'string') {
          return item.text
        }
        return ''
      })
      .join('')
  }

  return ''
}

function createStreamLogger() {
  let buffer = ''
  const capturedChunks: string[] = []

  const appendCaptured = (text: string) => {
    if (text) {
      capturedChunks.push(text)
    }
  }

  const processEvents = (force = false) => {
    const segments = buffer.split('\n\n')
    if (!force) {
      buffer = segments.pop() ?? ''
    } else {
      buffer = ''
    }

    for (const segment of segments) {
      segment
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.startsWith('data:'))
        .forEach((line) => {
          const payload = line.replace('data:', '').trim()
          if (!payload || payload === '[DONE]') {
            return
          }

          try {
            const parsed = JSON.parse(payload)
            const delta = parsed?.choices?.[0]?.delta
            if (!delta) {
              return
            }

            let contentPieces: string[] = []
            if (typeof delta.content === 'string') {
              contentPieces = [delta.content]
            } else if (Array.isArray(delta.content)) {
              contentPieces = delta.content
                .map((item: any) => {
                  if (typeof item === 'string') {
                    return item
                  }
                  if (item && typeof item.text === 'string') {
                    return item.text
                  }
                  return ''
                })
                .filter(Boolean)
            }

            const rawCombined = contentPieces.join('')
            const trimmedForLog = rawCombined.trim()
            if (trimmedForLog) {
              console.log('Streaming text:', trimmedForLog)
            }
            appendCaptured(rawCombined)
          } catch (err) {
            console.warn('Failed to parse streaming chunk for logging', err)
          }
        })
    }
  }

  return {
    push(chunk: Uint8Array) {
      buffer += streamDecoder.decode(chunk, { stream: true })
      processEvents()
    },
    flush(): string {
      buffer += streamDecoder.decode(new Uint8Array(), { stream: false })
      processEvents(true)
      return capturedChunks.join('')
    },
  }
}

interface ChatCompletionBody {
  messages: any[]
  model?: string
  stream?: boolean
  channel?: string
  userId?: string
  appId?: string
}

export const chatCompletionRoutes = async (fastify: FastifyInstance) => {
  // Hook to validate API token
  // fastify.addHook('preHandler', validateRequest)

  // Chat completion endpoint
  fastify.post<{ Body: ChatCompletionBody }>(
    '/completion',
    async (req: FastifyRequest<{ Body: ChatCompletionBody }>, reply: FastifyReply) => {
      try {
        const {
          messages,
          model = 'gpt-4o',
          stream = false,
          channel = 'ccc',
          userId = '111',
          appId = '20b7c51ff4c644ab80cf5a4e646b0537',
        } = req.body
        console.log(`Heyyyy Received Chat Completion Request:`)
        console.log('Received Chat Completion Request:', {
          model,
          stream,
          channel,
          userId,
          appId,
          messagesLength: messages?.length,
        })

        if (!messages) {
          return reply.code(400).send({ error: 'Missing "messages" in request body' })
        }

        if (!appId) {
          return reply.code(400).send({ error: 'Missing "appId" in request body' })
        }

        // This server supports both the Chat Completions API and the Responses API
        // Use either processChatCompletion or processResponses based on config
        const processHandler = config.llm.useResponsesApi ? processResponses : processChatCompletion

        console.log(
          `Using ${config.llm.useResponsesApi ? 'OpenAI Responses API' : 'OpenAI Chat Completions API'} for request`,
        )

        const result = await processHandler(messages, {
          model,
          stream,
          channel,
          userId,
          appId,
        })
        console.log(result,'Processed Chat Completion Request')

        if (stream) {
          // Set SSE headers
          reply.raw.setHeader('Content-Type', 'text/event-stream')
          reply.raw.setHeader('Cache-Control', 'no-cache')
          reply.raw.setHeader('Connection', 'keep-alive')

          if (result instanceof ReadableStream) {
            // Handle Web ReadableStream
            const reader = result.getReader()
            const streamLogger = createStreamLogger()

            // Process stream chunks
            while (true) {
              const { done, value } = await reader.read()
              if (done) {
                const aggregatedText = streamLogger.flush()
                emitStructuredDataFromText(aggregatedText)
                break
              }
              if (value) {
                streamLogger.push(value)
                // Write chunks to response
                reply.raw.write(value)
              }
            }

            // End the response
            reply.raw.end()
          } else {
            // Fallback for non-streaming response
            const completionText = getAssistantMessageContent(result)
            emitStructuredDataFromText(completionText)
            return result
          }
        } else {
          const completionText = getAssistantMessageContent(result)
          emitStructuredDataFromText(completionText)
          return result
        }
      } catch (err: any) {
        console.error('Chat Completions Error:', err)
        return reply.code(500).send({ error: err.message })
      }
    },
  )
}
