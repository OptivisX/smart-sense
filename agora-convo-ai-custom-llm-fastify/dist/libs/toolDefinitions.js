"use strict";
// src/services/toolDefinitions.ts - Function definitions for OpenAI
Object.defineProperty(exports, "__esModule", { value: true });
exports.functions = void 0;
/**
 * Function definitions for LLM function calling
 */
const functions = [
    {
        name: 'fetch_customer_profile',
        description: 'Retrieve the latest customer profile JSON (preferences, history, etc.).',
        parameters: {
            type: 'object',
            properties: {
                customerId: {
                    type: 'string',
                    description: 'Customer identifier if already known. customerId is the first name of customer in small case.',
                },
                customerEmail: {
                    type: 'string',
                    description: 'Customer email to look up if id is unknown.',
                },
            },
            required: [],
        },
    },
    {
        name: 'fetch_recent_orders',
        description: 'Return the customer’s most recent orders sorted by update time. ',
        parameters: {
            type: 'object',
            properties: {
                customerId: {
                    type: 'string',
                    description: 'Customer identifier if available. customerId is the first name of customer in small case.',
                },
                customerEmail: {
                    type: 'string',
                    description: 'Email address to resolve the customer when id is unknown.',
                },
                limit: {
                    type: 'number',
                    description: 'Maximum number of orders to return (default 5, max 20).',
                },
            },
            required: [],
        },
    },
    {
        name: 'create_support_ticket',
        description: 'Create a structured support ticket tied to the current customer conversation.',
        parameters: {
            type: 'object',
            properties: {
                subject: {
                    type: 'string',
                    description: 'Short summary of the problem or request.',
                },
                description: {
                    type: 'string',
                    description: 'Detailed description of the customer issue.',
                },
                customerEmail: {
                    type: 'string',
                    description: 'Customer contact email address (required if customerId unavailable).',
                },
                customerId: {
                    type: 'string',
                    description: 'Customer identifier if already known. customerId is the first name of customer in small case.',
                },
                priority: {
                    type: 'string',
                    description: "Ticket priority such as 'low', 'normal', 'high', or 'urgent'.",
                },
                orderId: {
                    type: 'string',
                    description: 'Related order or subscription ID if known.',
                },
            },
            required: ['subject', 'description'],
        },
    },
    {
        name: 'update_ticket_status',
        description: 'Update the status of an existing support ticket and optionally add internal notes.',
        parameters: {
            type: 'object',
            properties: {
                ticketId: {
                    type: 'string',
                    description: 'Identifier of the ticket to update.',
                },
                status: {
                    type: 'string',
                    description: "New status value, e.g. 'open', 'in_progress', 'resolved', or 'closed'.",
                },
                internalNotes: {
                    type: 'string',
                    description: 'Optional internal note to append to the ticket history.',
                },
            },
            required: ['ticketId', 'status'],
        },
    },
    {
        name: 'get_ticket_details',
        description: 'Retrieve ticket metadata and recent interactions for context.',
        parameters: {
            type: 'object',
            properties: {
                ticketId: {
                    type: 'string',
                    description: 'Identifier of the ticket to inspect.',
                },
                includeInteractions: {
                    type: 'boolean',
                    description: 'Whether to include the last few interaction notes (default true).',
                },
            },
            required: ['ticketId'],
        },
    },
    {
        name: 'log_customer_interaction',
        description: 'Persist a customer interaction note for future auditing or follow ups.',
        parameters: {
            type: 'object',
            properties: {
                ticketId: {
                    type: 'string',
                    description: 'Optional ticket identifier if the note should be linked to a ticket.',
                },
                note: {
                    type: 'string',
                    description: 'The text of the note to store.',
                },
                sentiment: {
                    type: 'string',
                    description: 'Optional sentiment tag describing the tone of the interaction.',
                },
            },
            required: ['note'],
        },
    },
    {
        name: 'escalate_ticket',
        description: 'Create an escalation entry (and mark ticket escalated) for human follow-up.',
        parameters: {
            type: 'object',
            properties: {
                ticketId: {
                    type: 'string',
                    description: 'Ticket identifier tied to the escalation.',
                },
                customerId: {
                    type: 'string',
                    description: 'Customer identifier if no ticket exists yet. customerId is the first name of customer in small case.',
                },
                severity: {
                    type: 'string',
                    description: "Severity level such as 'low', 'medium', or 'high'.",
                },
                reason: {
                    type: 'string',
                    description: 'Brief explanation of why the escalation is necessary.',
                },
                metadata: {
                    type: 'object',
                    description: 'Additional structured metadata to attach.',
                },
            },
            required: [],
        },
    },
    {
        name: 'log_change_event',
        description: 'Record a change entry for auditing (e.g., a status update or refund).',
        parameters: {
            type: 'object',
            properties: {
                entityType: {
                    type: 'string',
                    description: 'Type of record that changed (order, ticket, subscription, etc.).',
                },
                entityId: {
                    type: 'string',
                    description: 'Identifier of the record that changed.',
                },
                status: {
                    type: 'string',
                    description: 'New status or outcome after the change.',
                },
                reason: {
                    type: 'string',
                    description: 'Optional text explaining why the change was made.',
                },
                data: {
                    type: 'object',
                    description: 'Structured payload with the raw change data.',
                },
            },
            required: ['entityType', 'entityId', 'status'],
        },
    },
    {
        name: 'record_agent_event',
        description: 'Log an agent decision cycle (intent, sentiment, tasks) for analytics.',
        parameters: {
            type: 'object',
            properties: {
                customerId: {
                    type: 'string',
                    description: 'Customer identifier tied to the event. customerId is the first name of customer in small case.',
                },
                intent: {
                    type: 'string',
                    description: 'High-level intent detected for the turn.',
                },
                sentimentLabel: {
                    type: 'string',
                    description: 'Sentiment label such as positive/neutral/negative.',
                },
                sentimentScore: {
                    type: 'number',
                    description: 'Optional numeric sentiment confidence.',
                },
                urgency: {
                    type: 'string',
                    description: 'Urgency classification derived from the conversation.',
                },
                tasks: {
                    type: 'object',
                    description: 'JSON structure describing tasks planned or completed.',
                },
                payload: {
                    type: 'object',
                    description: 'Raw payload to persist for downstream analytics.',
                },
            },
            required: ['customerId'],
        },
    },
];
exports.functions = functions;
