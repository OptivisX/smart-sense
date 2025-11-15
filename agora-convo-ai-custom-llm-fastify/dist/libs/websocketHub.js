"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerStructuredDataChannel = registerStructuredDataChannel;
exports.broadcastStructuredData = broadcastStructuredData;
const ws_1 = require("ws");
const structuredDataClients = new Set();
let structuredDataServer = null;
let upgradeHandlerAttached = false;
function ensureUpgradeHandler(server, handler) {
    if (upgradeHandlerAttached) {
        return;
    }
    server.on('upgrade', handler);
    upgradeHandlerAttached = true;
}
function handleUpgrade(request, socket, head) {
    const targetPath = '/ws/structured-data';
    if (!request.url || !request.url.startsWith(targetPath)) {
        socket.destroy();
        return;
    }
    if (!structuredDataServer) {
        structuredDataServer = new ws_1.WebSocketServer({ noServer: true });
        structuredDataServer.on('connection', (ws) => {
            structuredDataClients.add(ws);
            ws.on('close', () => structuredDataClients.delete(ws));
        });
    }
    structuredDataServer.handleUpgrade(request, socket, head, (ws) => {
        structuredDataServer?.emit('connection', ws, request);
    });
}
function registerStructuredDataChannel(server) {
    ensureUpgradeHandler(server, handleUpgrade);
}
function broadcastStructuredData(payload) {
    if (!structuredDataServer || structuredDataClients.size === 0) {
        return;
    }
    const message = JSON.stringify({
        type: 'structured_data',
        timestamp: new Date().toISOString(),
        payload,
    });
    for (const client of structuredDataClients) {
        if (client.readyState === ws_1.WebSocket.OPEN) {
            client.send(message);
        }
    }
}
