import type { Server } from 'http'
import type { IncomingMessage } from 'http'
import { WebSocketServer, WebSocket } from 'ws'

type UpgradeHandler = (
  request: IncomingMessage,
  socket: import('net').Socket,
  head: Buffer,
) => void

const structuredDataClients = new Set<WebSocket>()
let structuredDataServer: WebSocketServer | null = null
let upgradeHandlerAttached = false

function ensureUpgradeHandler(server: Server, handler: UpgradeHandler) {
  if (upgradeHandlerAttached) {
    return
  }
  server.on('upgrade', handler)
  upgradeHandlerAttached = true
}

function handleUpgrade(request: IncomingMessage, socket: import('net').Socket, head: Buffer) {
  const targetPath = '/ws/structured-data'
  if (!request.url || !request.url.startsWith(targetPath)) {
    socket.destroy()
    return
  }

  if (!structuredDataServer) {
    structuredDataServer = new WebSocketServer({ noServer: true })
    structuredDataServer.on('connection', (ws) => {
      structuredDataClients.add(ws)
      ws.on('close', () => structuredDataClients.delete(ws))
    })
  }

  structuredDataServer.handleUpgrade(request, socket, head, (ws) => {
    structuredDataServer?.emit('connection', ws, request)
  })
}

function registerStructuredDataChannel(server: Server) {
  ensureUpgradeHandler(server, handleUpgrade)
}

function broadcastStructuredData(payload: Record<string, any>) {
  if (!structuredDataServer || structuredDataClients.size === 0) {
    return
  }

  const message = JSON.stringify({
    type: 'structured_data',
    timestamp: new Date().toISOString(),
    payload,
  })

  for (const client of structuredDataClients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message)
    }
  }
}

export { registerStructuredDataChannel, broadcastStructuredData }
