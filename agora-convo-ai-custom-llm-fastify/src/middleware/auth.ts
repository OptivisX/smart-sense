import { FastifyRequest, FastifyReply } from 'fastify'
import { config } from '../libs/utils'

export const validateRequest = (req: FastifyRequest, reply: FastifyReply, done: () => void) => {
  const authHeader = req.headers.authorization || ''
  const token = authHeader.replace('Bearer ', '')

  if (process.env.NODE_ENV === 'development') {
    console.log('Received auth header:', authHeader)
    console.log('Received token:', token)
    console.log('Expected token:', config.llm.openaiApiKey)
    console.log('Token comparison:', token === config.llm.openaiApiKey)
  }

  if (!token || token !== config.llm.openaiApiKey) {
    return reply.code(403).send({ error: 'Invalid or missing token' })
  }

  done()
}
