"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.processResponses = processResponses;
const openai_1 = __importDefault(require("openai"));
const toolDefinitions_1 = require("../libs/toolDefinitions");
const tools_1 = require("../libs/tools");
const ragService_1 = require("./ragService");
const utils_1 = require("../libs/utils");
const promptTemplates_1 = require("../libs/promptTemplates");
// Initialize OpenAI client
const openai = new openai_1.default({
    apiKey: utils_1.config.llm.openaiApiKey,
});
// const debug = process.env.NODE_ENV === 'development'
const debug = false;
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
    return {
        role: 'system',
        content: (0, promptTemplates_1.buildSupportSystemPrompt)(ragData),
    };
}
/**
 * Process a request using OpenAI Responses API but with the same interface as ChatCompletions
 * @param {ChatMessage[]} messages - Chat messages
 * @param {ChatCompletionOptions} options - Additional options
 * @returns {Promise<Object>} OpenAI response reformatted to match Chat Completions API
 */
async function processResponses(messages, options) {
    const { model = 'gpt-4o-mini', stream = false, userId, channel, appId } = options;
    if (debug)
        console.log(`Processing request with OpenAI Responses API, model: ${model}, streaming: ${stream}`);
    // Add system message with RAG data
    const systemMessage = await createSystemMessage(messages);
    const fullMessages = [systemMessage, ...messages];
    // Convert the tools definition to the Responses API format
    // The Responses API expects tools in a slightly different format than Chat Completions
    // Each tool must have a type property and a function property with name, description, and parameters
    const tools = toolDefinitions_1.functions.length > 0
        ? toolDefinitions_1.functions.map((fn) => ({
            name: fn.name,
            type: 'function',
            function: {
                description: fn.description,
                parameters: fn.parameters,
            },
        }))
        : undefined;
    // Add debug logging to see what the tool structure looks like
    if (debug)
        console.log('Tools for Responses API:', JSON.stringify(tools, null, 2));
    if (!stream) {
        // Non-streaming mode
        return processNonStreamingRequest(model, fullMessages, tools, {
            userId,
            channel,
            appId,
        });
    }
    else {
        // Streaming mode
        return processStreamingRequest(model, fullMessages, tools, {
            userId,
            channel,
            appId,
        });
    }
}
/**
 * Process a non-streaming request
 * @param {string} model - Model to use
 * @param {ChatMessage[]} fullMessages - Complete message history
 * @param {any[] | undefined} tools - Tools configuration
 * @param {RequestContext} context - Request context (userId, channel, appId)
 * @returns {Promise<Object>} Final response formatted to match Chat Completions API
 */
async function processNonStreamingRequest(model, fullMessages, tools, context) {
    const { userId, channel, appId } = context;
    if (debug)
        console.log('Processing non-streaming request with model:', model);
    // Convert messages to appropriate Responses API format
    const messageContent = fullMessages
        .map((msg) => {
        if (msg.role === 'system') {
            return `System: ${msg.content}`;
        }
        else if (msg.role === 'user') {
            return `User: ${msg.content}`;
        }
        else if (msg.role === 'assistant') {
            return `Assistant: ${msg.content}`;
        }
        else if (msg.role === 'function') {
            return `Function (${msg.name}): ${msg.content}`;
        }
        return `${msg.role}: ${msg.content}`;
    })
        .join('\n\n');
    if (debug)
        console.log('Formatted message content for Responses API:', messageContent.substring(0, 100) + '...');
    // Make initial request
    try {
        if (debug) {
            console.log('Sending request to OpenAI Responses API...');
            console.log('Request params:', { model, tools: tools ? 'defined' : 'undefined' });
        }
        const response = await openai.responses.create({
            model,
            input: messageContent,
            ...(tools ? { tools } : {}),
        });
        if (debug) {
            console.log('Received response from OpenAI Responses API:', {
                id: response.id,
                model: response.model,
                output_length: response.output?.length || 0,
                has_output_text: !!response.output_text,
            });
        }
        // Type guard to ensure response has output
        if (!response.output || response.output.length === 0) {
            console.warn('⚠️ Response has no output array');
            return formatResponseAsCompletion({
                id: response.id || 'response_id',
                model: response.model || model,
                output: [],
                output_text: 'No content returned from API.',
            });
        }
        // Log output array structure
        if (debug) {
            console.log('Response output structure:', response.output.map((item) => ({
                type: item.type,
                role: 'role' in item ? item.role : undefined,
                content_type: 'content' in item && Array.isArray(item.content)
                    ? item.content.map((c) => c.type)
                    : typeof item.type === 'string'
                        ? 'string'
                        : undefined,
            })));
        }
        // Find assistant message in the output
        const assistantMessage = response.output.find((item) => item.type === 'message' && 'role' in item && item.role === 'assistant');
        if (debug)
            console.log('Found assistant message:', assistantMessage ? 'yes' : 'no');
        // Check if function call was made
        const functionCall = response.output.find((item) => item.type === 'function_call');
        if (debug)
            console.log('Found function call:', functionCall ? `yes, name: ${functionCall.name}` : 'no');
        if (functionCall) {
            let functionName = '';
            let functionArgs = '';
            // Extract function call details
            if (functionCall.type === 'function_call') {
                functionName = functionCall.name;
                functionArgs = functionCall.arguments;
                if (debug) {
                    console.log('Function call details:', {
                        functionName,
                        functionArgs: functionArgs.substring(0, 100) + '...',
                    });
                }
                // Execute function if it exists in our map
                const fn = tools_1.functionMap[functionName];
                if (!fn) {
                    console.error('Unknown function name:', functionName);
                    return formatResponseAsCompletion(response);
                }
                try {
                    // Parse arguments
                    const parsedArgs = JSON.parse(functionArgs);
                    if (debug)
                        console.log('Parsed arguments:', parsedArgs);
                    // Execute function
                    if (debug)
                        console.log(`Executing function: ${functionName}`);
                    const functionResult = await fn(appId, userId, channel, parsedArgs);
                    if (debug)
                        console.log('Function result:', functionResult);
                    // Add the function result to our messages
                    const updatedMessages = [
                        ...fullMessages,
                        {
                            role: 'function',
                            name: functionName,
                            content: functionResult,
                        },
                    ];
                    // Prepare the updated message content for a new API call
                    const updatedMessageContent = updatedMessages
                        .map((msg) => {
                        if (msg.role === 'system') {
                            return `System: ${msg.content}`;
                        }
                        else if (msg.role === 'user') {
                            return `User: ${msg.content}`;
                        }
                        else if (msg.role === 'assistant') {
                            return `Assistant: ${msg.content}`;
                        }
                        else if (msg.role === 'function') {
                            return `Function (${msg.name}): ${msg.content}`;
                        }
                        return `${msg.role}: ${msg.content}`;
                    })
                        .join('\n\n');
                    if (debug)
                        console.log('Making follow-up request with function result...');
                    // Make a follow-up request with the function result
                    const finalResponse = await openai.responses.create({
                        model,
                        input: updatedMessageContent,
                    });
                    if (debug)
                        console.log('Received final response with function result');
                    // Convert to Chat Completions API format
                    return formatResponseAsCompletion(finalResponse);
                }
                catch (err) {
                    console.error('Function execution error:', err);
                    return formatResponseAsCompletion(response);
                }
            }
        }
        // No function call, just format the response to match Chat Completions API
        return formatResponseAsCompletion(response);
    }
    catch (err) {
        console.error('OpenAI Responses API error:', err);
        throw err;
    }
}
/**
 * Process a streaming request
 * @param {string} model - Model to use
 * @param {ChatMessage[]} fullMessages - Complete message history
 * @param {any[] | undefined} tools - Tools configuration
 * @param {RequestContext} context - Request context (userId, channel, appId)
 * @returns {Promise<ReadableStream>} Stream of events
 */
async function processStreamingRequest(model, fullMessages, tools, context) {
    const { userId, channel, appId } = context;
    if (debug)
        console.log('Processing streaming request with model:', model);
    // Convert messages to appropriate Responses API format
    const messageContent = fullMessages
        .map((msg) => {
        if (msg.role === 'system') {
            return `System: ${msg.content}`;
        }
        else if (msg.role === 'user') {
            return `User: ${msg.content}`;
        }
        else if (msg.role === 'assistant') {
            return `Assistant: ${msg.content}`;
        }
        else if (msg.role === 'function') {
            return `Function (${msg.name}): ${msg.content}`;
        }
        return `${msg.role}: ${msg.content}`;
    })
        .join('\n\n');
    if (debug)
        console.log('Formatted message content for Responses API:', messageContent.substring(0, 100) + '...');
    // Create encoder for SSE
    const encoder = new TextEncoder();
    // Create function call accumulators
    let functionCallName;
    let functionCallArgs = '';
    let functionCallInProgress = false;
    try {
        // Create streaming response
        const stream = await openai.responses.create({
            model,
            input: messageContent,
            ...(tools ? { tools } : {}),
            stream: true,
        });
        // Create readable stream
        return new ReadableStream({
            async start(controller) {
                try {
                    for await (const part of stream) {
                        // Handle text output deltas
                        if (part.type === 'response.output_text.delta') {
                            const chatCompletionChunk = {
                                id: part.item_id || 'chunk_id',
                                object: 'chat.completion.chunk',
                                created: Math.floor(Date.now() / 1000),
                                model,
                                choices: [
                                    {
                                        index: 0,
                                        delta: {
                                            content: part.delta || '',
                                        },
                                        finish_reason: null,
                                    },
                                ],
                            };
                            // Send chunk downstream as SSE
                            controller.enqueue(encoder.encode(`data: ${JSON.stringify(chatCompletionChunk)}\n\n`));
                        }
                        // Handle function call argument deltas
                        else if (part.type === 'response.function_call_arguments.delta') {
                            functionCallInProgress = true;
                            // Accumulate arguments
                            functionCallArgs += part.delta || '';
                            const chatCompletionChunk = {
                                id: part.item_id || 'chunk_id',
                                object: 'chat.completion.chunk',
                                created: Math.floor(Date.now() / 1000),
                                model,
                                choices: [
                                    {
                                        index: 0,
                                        delta: {
                                            function_call: {
                                                arguments: part.delta || '',
                                            },
                                        },
                                        finish_reason: null,
                                    },
                                ],
                            };
                            // Send chunk downstream as SSE
                            controller.enqueue(encoder.encode(`data: ${JSON.stringify(chatCompletionChunk)}\n\n`));
                        }
                        // Handle complete function call arguments
                        else if (part.type === 'response.function_call_arguments.done') {
                            functionCallInProgress = true;
                            functionCallArgs = part.arguments || functionCallArgs;
                            // Send completion of function call
                            const completionEnd = {
                                id: part.item_id || 'chunk_id',
                                object: 'chat.completion.chunk',
                                created: Math.floor(Date.now() / 1000),
                                model,
                                choices: [
                                    {
                                        index: 0,
                                        delta: {},
                                        finish_reason: 'function_call',
                                    },
                                ],
                            };
                            controller.enqueue(encoder.encode(`data: ${JSON.stringify(completionEnd)}\n\n`));
                        }
                        // Handle function call name if available
                        else if (part.type === 'response.output_item.added' && part.item && part.item.type === 'function_call') {
                            functionCallName = part.item.name;
                            functionCallInProgress = true;
                            const chatCompletionChunk = {
                                id: part.item.id || 'chunk_id',
                                object: 'chat.completion.chunk',
                                created: Math.floor(Date.now() / 1000),
                                model,
                                choices: [
                                    {
                                        index: 0,
                                        delta: {
                                            function_call: {
                                                name: part.item.name,
                                            },
                                        },
                                        finish_reason: null,
                                    },
                                ],
                            };
                            controller.enqueue(encoder.encode(`data: ${JSON.stringify(chatCompletionChunk)}\n\n`));
                        }
                        // Also handle the text.done event
                        else if (part.type === 'response.output_text.done') {
                            // This event indicates a complete text segment - we don't need to emit anything here
                            // as we're already sending deltas, but we could log it or process complete text if needed
                            if (debug) {
                                console.log(`Complete text segment received, length: ${part.text?.length || 0}`);
                            }
                        }
                        // Handle refusal content
                        else if (part.type === 'response.refusal.delta') {
                            // Convert refusal content into regular content for compatibility
                            const chatCompletionChunk = {
                                id: part.item_id || 'chunk_id',
                                object: 'chat.completion.chunk',
                                created: Math.floor(Date.now() / 1000),
                                model,
                                choices: [
                                    {
                                        index: 0,
                                        delta: {
                                            content: part.delta || '',
                                        },
                                        finish_reason: null,
                                    },
                                ],
                            };
                            controller.enqueue(encoder.encode(`data: ${JSON.stringify(chatCompletionChunk)}\n\n`));
                        }
                        // Handle end of response
                        else if (part.type === 'response.completed') {
                            if (functionCallInProgress && functionCallName) {
                                // Execute the function
                                const fn = tools_1.functionMap[functionCallName];
                                if (fn) {
                                    try {
                                        // Parse arguments
                                        const parsedArgs = JSON.parse(functionCallArgs);
                                        // Execute function
                                        const functionResult = await fn(appId, userId, channel, parsedArgs);
                                        // Prepare follow-up input with function result
                                        const followUpMessage = `${messageContent}\n\nAssistant: I'll call the function '${functionCallName}' with these arguments: ${functionCallArgs}\n\nFunction (${functionCallName}): ${functionResult}`;
                                        // Final streaming call
                                        const finalResponseStream = await openai.responses.create({
                                            model,
                                            input: followUpMessage,
                                            stream: true,
                                        });
                                        for await (const part of finalResponseStream) {
                                            if (part.type === 'response.output_text.delta') {
                                                const chatCompletionChunk = {
                                                    id: part.item_id || 'chunk_id',
                                                    object: 'chat.completion.chunk',
                                                    created: Math.floor(Date.now() / 1000),
                                                    model,
                                                    choices: [
                                                        {
                                                            index: 0,
                                                            delta: {
                                                                content: part.delta || '',
                                                            },
                                                            finish_reason: null,
                                                        },
                                                    ],
                                                };
                                                controller.enqueue(encoder.encode(`data: ${JSON.stringify(chatCompletionChunk)}\n\n`));
                                            }
                                            else if (part.type === 'response.completed') {
                                                // Final completion chunk
                                                const completionEnd = {
                                                    id: part.response?.id || 'chunk_id',
                                                    object: 'chat.completion.chunk',
                                                    created: Math.floor(Date.now() / 1000),
                                                    model,
                                                    choices: [
                                                        {
                                                            index: 0,
                                                            delta: {},
                                                            finish_reason: 'stop',
                                                        },
                                                    ],
                                                };
                                                controller.enqueue(encoder.encode(`data: ${JSON.stringify(completionEnd)}\n\n`));
                                            }
                                        }
                                    }
                                    catch (err) {
                                        console.error('Function call error:', err);
                                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'Function call failed' })}\n\n`));
                                    }
                                }
                                else {
                                    console.error('Unknown function name:', functionCallName);
                                }
                            }
                            else {
                                // Regular completion end
                                const completionEnd = {
                                    id: part.response?.id || 'chunk_id',
                                    object: 'chat.completion.chunk',
                                    created: Math.floor(Date.now() / 1000),
                                    model,
                                    choices: [
                                        {
                                            index: 0,
                                            delta: {},
                                            finish_reason: 'stop',
                                        },
                                    ],
                                };
                                controller.enqueue(encoder.encode(`data: ${JSON.stringify(completionEnd)}\n\n`));
                            }
                            // End SSE stream
                            controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
                            controller.close();
                            return;
                        }
                    }
                    // Ensure we close the stream if we didn't encounter a completion event
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
    catch (err) {
        console.error('OpenAI streaming error:', err);
        throw err;
    }
}
/**
 * Format a Responses API response to match the Chat Completions API format
 * @param {any} response - Response from Responses API
 * @returns {Object} Formatted response matching Chat Completions API
 */
function formatResponseAsCompletion(response) {
    // Extract message content
    let messageContent = '';
    let functionCall = null;
    if (response.output && response.output.length > 0) {
        // Look for assistant messages
        for (const item of response.output) {
            if (item.type === 'message' && 'role' in item && item.role === 'assistant' && 'content' in item) {
                if (Array.isArray(item.content)) {
                    for (const content of item.content) {
                        if (content.type === 'text' && 'text' in content) {
                            messageContent += content.text;
                        }
                    }
                }
            }
            else if (item.type === 'function_call') {
                functionCall = {
                    name: item.name,
                    arguments: item.arguments,
                };
            }
        }
    }
    else if (response.output_text) {
        // Fallback to output_text if there's no structured output
        messageContent = response.output_text;
    }
    // Create a structure matching Chat Completions API
    const formattedResponse = {
        id: response.id || 'resp_' + Math.random().toString(36).substring(2),
        object: 'chat.completion',
        created: Math.floor(Date.now() / 1000),
        model: response.model || 'unknown',
        choices: [
            {
                index: 0,
                message: {
                    role: 'assistant',
                    content: messageContent,
                    ...(functionCall ? { function_call: functionCall } : {}),
                },
                finish_reason: functionCall ? 'function_call' : 'stop',
            },
        ],
        usage: {
            prompt_tokens: 0,
            completion_tokens: 0,
            total_tokens: 0,
        },
    };
    return formattedResponse;
}
