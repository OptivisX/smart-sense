"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_1 = __importDefault(require("fastify"));
const cors_1 = __importDefault(require("@fastify/cors"));
const helmet_1 = __importDefault(require("@fastify/helmet"));
const chatCompletion_1 = require("./routes/chatCompletion");
const utils_1 = require("./libs/utils");
const websocketHub_1 = require("./libs/websocketHub");
require('dotenv').config({ override: true });
// Create Fastify instance
const fastify = (0, fastify_1.default)({
    logger: {
        transport: {
            target: 'pino-pretty',
            options: {
                translateTime: 'HH:MM:ss Z',
                ignore: 'pid,hostname',
            },
        },
    },
});
(0, websocketHub_1.registerStructuredDataChannel)(fastify.server);
// Register plugins
fastify.register(helmet_1.default);
fastify.register(cors_1.default);
// Register routes
const v1Router = async (fastify) => {
    fastify.register(chatCompletion_1.chatCompletionRoutes, { prefix: '/chat' });
};
fastify.register(v1Router, { prefix: '/v1' });
// Default route
fastify.get('/', async () => {
    return {
        message: 'Welcome to a custom LLM using OpenAI API and built for Agora Convo AI Engine! Documentation is available at https://github.com/AgoraIO-Community/agora-convo-ai-custom-llm-fastify',
    };
});
// Health check endpoint
fastify.get('/ping', async () => {
    return { message: 'pong' };
});
// Start the server
const start = async () => {
    try {
        await fastify.listen({ port: utils_1.config.port, host: '0.0.0.0' });
        console.log(`Server is running on port ${utils_1.config.port}`);
    }
    catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
};
// Only start the server if this file is run directly
if (require.main === module) {
    start();
}
exports.default = fastify;
