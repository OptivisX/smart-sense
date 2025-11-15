"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.processChatCompletion = processChatCompletion;
const openai_1 = __importDefault(require("openai"));
const toolDefinitions_1 = require("../libs/toolDefinitions");
const tools_1 = require("../libs/tools");
const ragService_1 = require("./ragService");
const utils_1 = require("../libs/utils");
const promptTemplates_1 = require("../libs/promptTemplates");
require('dotenv').config({ override: true });
// Initialize OpenAI client
const openai = new openai_1.default({
    apiKey: utils_1.config.llm.openaiApiKey,
});
/**
 * Extract the most recent user utterance from the chat history
 */
function getLatestUserQuery(messages) {
    for (let i = messages.length - 1; i >= 0; i--) {
        const msg = messages[i];
        if (msg.role === 'user') {
            if (typeof msg.content === 'string') {
                return msg.content;
            }
            if (Array.isArray(msg.content)) {
                return msg.content
                    .map((item) => {
                    if (typeof item?.text === 'string') {
                        return item.text;
                    }
                    return '';
                })
                    .join(' ')
                    .trim();
            }
        }
    }
    return undefined;
}
/**
 * Creates a system message with RAG data
 * @returns {ChatMessage} System message with RAG data
 */
async function createSystemMessage(messages) {
    const latestUserQuery = getLatestUserQuery(messages);
    const ragData = await (0, ragService_1.getFormattedRagData)(latestUserQuery);
    console.log('RAG Data:', ragData);
    return {
        role: 'system',
        content: (0, promptTemplates_1.buildSupportSystemPrompt)(ragData),
    };
}
/**
 * Process a chat completion request with OpenAI
 * @param {ChatMessage[]} messages - Chat messages
 * @param {ChatCompletionOptions} options - Additional options
 * @returns {Promise<Object>} OpenAI response
 */
async function processChatCompletion(messages, options) {
    const { model, stream = false, userId, channel, appId } = options;
    // Add system message with RAG data
    const systemMessage = await createSystemMessage(messages);
    const fullMessages = [systemMessage, ...messages];
    // Build request options
    const requestOptions = {
        model,
        messages: fullMessages,
        functions: toolDefinitions_1.functions,
        function_call: 'auto',
    };
    if (!stream) {
        // Non-streaming mode
        return processNonStreamingRequest(requestOptions, fullMessages, {
            userId,
            channel,
            appId,
        });
    }
    else {
        // Streaming mode
        return processStreamingRequest(requestOptions, fullMessages, {
            userId,
            channel,
            appId,
        });
    }
}
/**
 * Process a non-streaming request
 * @param {Object} requestOptions - OpenAI request options
 * @param {ChatMessage[]} fullMessages - Complete message history
 * @param {RequestContext} context - Request context (userId, channel, appId)
 * @returns {Promise<Object>} Final response
 */
async function processNonStreamingRequest(requestOptions, fullMessages, context) {
    const { userId, channel, appId } = context;
    // Make initial request
    const response = await openai.chat.completions.create({
        ...requestOptions,
        stream: false,
    });
    // Check if function call was made
    if (response.choices && response.choices[0]?.finish_reason === 'function_call') {
        const fc = response.choices[0].message?.function_call;
        if (fc?.name && fc.arguments) {
            const fn = tools_1.functionMap[fc.name];
            if (!fn) {
                console.error('Unknown function name:', fc.name);
                return response;
            }
            // Parse arguments
            let parsedArgs;
            try {
                parsedArgs = JSON.parse(fc.arguments);
            }
            catch (err) {
                console.error('Failed to parse function call arguments:', err);
                throw new Error('Invalid function call arguments');
            }
            // Execute function
            const functionResult = await fn(appId, userId, channel, parsedArgs);
            // Append function result to messages
            const updatedMessages = [
                ...fullMessages,
                {
                    role: 'function',
                    name: fc.name,
                    content: functionResult,
                },
            ];
            // Get final answer
            const finalResponse = await openai.chat.completions.create({
                model: requestOptions.model,
                messages: updatedMessages,
                stream: false,
            });
            return finalResponse;
        }
    }
    // Return original response if no function was called
    return response;
}
/**
 * Generate a streaming response
 * @param {Object} requestOptions - OpenAI request options
 * @param {ChatMessage[]} fullMessages - Complete message history
 * @param {RequestContext} context - Request context (userId, channel, appId)
 * @returns {Promise<ReadableStream>} Stream of events
 */
async function processStreamingRequest(requestOptions, fullMessages, context) {
    const { userId, channel, appId } = context;
    // Make initial streaming request
    const stream = (await openai.chat.completions.create({
        ...requestOptions,
        stream: true,
    }));
    // Create encoder
    const encoder = new TextEncoder();
    let pendingFunctionCall = null;
    const ensurePending = () => {
        if (!pendingFunctionCall) {
            pendingFunctionCall = { arguments: '' };
        }
        return pendingFunctionCall;
    };
    // Create readable stream
    return new ReadableStream({
        async start(controller) {
            const executePendingFunctionCall = async () => {
                if (!pendingFunctionCall?.name) {
                    console.error('Function call ended but no name was provided.');
                    return;
                }
                const fn = tools_1.functionMap[pendingFunctionCall.name];
                if (!fn) {
                    console.error('Unknown function name:', pendingFunctionCall.name);
                    return;
                }
                let parsedArgs = {};
                if (pendingFunctionCall.arguments.trim()) {
                    try {
                        parsedArgs = JSON.parse(pendingFunctionCall.arguments);
                    }
                    catch (err) {
                        console.error('Failed to parse function call arguments:', pendingFunctionCall.arguments, err);
                        throw new Error('Invalid function call arguments received from model.');
                    }
                }
                const functionResult = await fn(appId, userId, channel, parsedArgs);
                const updatedMessages = [
                    ...fullMessages,
                    {
                        role: 'function',
                        name: pendingFunctionCall.name,
                        content: functionResult,
                    },
                ];
                pendingFunctionCall = null;
                const finalResponse = await openai.chat.completions.create({
                    model: requestOptions.model,
                    messages: updatedMessages,
                    stream: true,
                });
                for await (const finalPart of finalResponse) {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify(finalPart)}\n\n`));
                }
            };
            try {
                for await (const part of stream) {
                    const choice = part.choices[0];
                    const delta = choice?.delta ?? {};
                    // Send chunk downstream as SSE
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify(part)}\n\n`));
                    // Handle function call deltas (legacy + tool_calls)
                    if (delta.function_call) {
                        const pending = ensurePending();
                        if (delta.function_call.name) {
                            pending.name = delta.function_call.name;
                        }
                        if (delta.function_call.arguments) {
                            pending.arguments += delta.function_call.arguments;
                        }
                    }
                    if (Array.isArray(delta.tool_calls) && delta.tool_calls.length > 0) {
                        const pending = ensurePending();
                        delta.tool_calls.forEach((toolCall) => {
                            if (toolCall.function?.name) {
                                pending.name = toolCall.function.name;
                            }
                            if (toolCall.function?.arguments) {
                                pending.arguments += toolCall.function.arguments;
                            }
                        });
                    }
                    if (choice.finish_reason === 'function_call' || choice.finish_reason === 'tool_calls') {
                        try {
                            await executePendingFunctionCall();
                        }
                        catch (err) {
                            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'Function call failed' })}\n\n`));
                            console.error('Function call error:', err);
                        }
                        controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
                        controller.close();
                        return;
                    }
                }
                // Ensure we close the stream if we didn't encounter a finish_reason
                controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
                controller.close();
            }
            catch (error) {
                console.error('OpenAI streaming error:', error);
                controller.error(error);
            }
        },
    });
}
