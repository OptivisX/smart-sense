"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.chatCompletionRoutes = void 0;
const openaiCompletionsService_1 = require("../services/openaiCompletionsService");
const openaiResponsesService_1 = require("../services/openaiResponsesService");
const utils_1 = require("../libs/utils");
const structuredDataUtils_1 = require("../libs/structuredDataUtils");
const streamDecoder = new TextDecoder();
function getAssistantMessageContent(result) {
    const content = result?.choices?.[0]?.message?.content;
    if (!content) {
        return '';
    }
    if (typeof content === 'string') {
        return content;
    }
    if (Array.isArray(content)) {
        return content
            .map((item) => {
            if (typeof item === 'string') {
                return item;
            }
            if (item && typeof item.text === 'string') {
                return item.text;
            }
            return '';
        })
            .join('');
    }
    return '';
}
function createStreamLogger() {
    let buffer = '';
    const capturedChunks = [];
    const appendCaptured = (text) => {
        if (text) {
            capturedChunks.push(text);
        }
    };
    const processEvents = (force = false) => {
        const segments = buffer.split('\n\n');
        if (!force) {
            buffer = segments.pop() ?? '';
        }
        else {
            buffer = '';
        }
        for (const segment of segments) {
            segment
                .split('\n')
                .map((line) => line.trim())
                .filter((line) => line.startsWith('data:'))
                .forEach((line) => {
                const payload = line.replace('data:', '').trim();
                if (!payload || payload === '[DONE]') {
                    return;
                }
                try {
                    const parsed = JSON.parse(payload);
                    const delta = parsed?.choices?.[0]?.delta;
                    if (!delta) {
                        return;
                    }
                    let contentPieces = [];
                    if (typeof delta.content === 'string') {
                        contentPieces = [delta.content];
                    }
                    else if (Array.isArray(delta.content)) {
                        contentPieces = delta.content
                            .map((item) => {
                            if (typeof item === 'string') {
                                return item;
                            }
                            if (item && typeof item.text === 'string') {
                                return item.text;
                            }
                            return '';
                        })
                            .filter(Boolean);
                    }
                    const rawCombined = contentPieces.join('');
                    const trimmedForLog = rawCombined.trim();
                    if (trimmedForLog) {
                        console.log('Streaming text:', trimmedForLog);
                    }
                    appendCaptured(rawCombined);
                }
                catch (err) {
                    console.warn('Failed to parse streaming chunk for logging', err);
                }
            });
        }
    };
    return {
        push(chunk) {
            buffer += streamDecoder.decode(chunk, { stream: true });
            processEvents();
        },
        flush() {
            buffer += streamDecoder.decode(new Uint8Array(), { stream: false });
            processEvents(true);
            return capturedChunks.join('');
        },
    };
}
const chatCompletionRoutes = async (fastify) => {
    // Hook to validate API token
    // fastify.addHook('preHandler', validateRequest)
    // Chat completion endpoint
    fastify.post('/completion', async (req, reply) => {
        try {
            const { messages, model = 'gpt-4o', stream = false, channel = 'ccc', userId = '111', appId = '20b7c51ff4c644ab80cf5a4e646b0537', } = req.body;
            console.log(`Heyyyy Received Chat Completion Request:`);
            console.log('Received Chat Completion Request:', {
                model,
                stream,
                channel,
                userId,
                appId,
                messagesLength: messages?.length,
            });
            if (!messages) {
                return reply.code(400).send({ error: 'Missing "messages" in request body' });
            }
            if (!appId) {
                return reply.code(400).send({ error: 'Missing "appId" in request body' });
            }
            // This server supports both the Chat Completions API and the Responses API
            // Use either processChatCompletion or processResponses based on config
            const processHandler = utils_1.config.llm.useResponsesApi ? openaiResponsesService_1.processResponses : openaiCompletionsService_1.processChatCompletion;
            console.log(`Using ${utils_1.config.llm.useResponsesApi ? 'OpenAI Responses API' : 'OpenAI Chat Completions API'} for request`);
            const result = await processHandler(messages, {
                model,
                stream,
                channel,
                userId,
                appId,
            });
            console.log(result, 'Processed Chat Completion Request');
            if (stream) {
                // Set SSE headers
                reply.raw.setHeader('Content-Type', 'text/event-stream');
                reply.raw.setHeader('Cache-Control', 'no-cache');
                reply.raw.setHeader('Connection', 'keep-alive');
                if (result instanceof ReadableStream) {
                    // Handle Web ReadableStream
                    const reader = result.getReader();
                    const streamLogger = createStreamLogger();
                    // Process stream chunks
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) {
                            const aggregatedText = streamLogger.flush();
                            (0, structuredDataUtils_1.emitStructuredDataFromText)(aggregatedText);
                            break;
                        }
                        if (value) {
                            streamLogger.push(value);
                            // Write chunks to response
                            reply.raw.write(value);
                        }
                    }
                    // End the response
                    reply.raw.end();
                }
                else {
                    // Fallback for non-streaming response
                    const completionText = getAssistantMessageContent(result);
                    (0, structuredDataUtils_1.emitStructuredDataFromText)(completionText);
                    return result;
                }
            }
            else {
                const completionText = getAssistantMessageContent(result);
                (0, structuredDataUtils_1.emitStructuredDataFromText)(completionText);
                return result;
            }
        }
        catch (err) {
            console.error('Chat Completions Error:', err);
            return reply.code(500).send({ error: err.message });
        }
    });
};
exports.chatCompletionRoutes = chatCompletionRoutes;
