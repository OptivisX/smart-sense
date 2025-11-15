"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.functionMap = void 0;
exports.sendPeerMessage = sendPeerMessage;
exports.createSupportTicket = createSupportTicket;
exports.updateTicketStatus = updateTicketStatus;
exports.logCustomerInteraction = logCustomerInteraction;
exports.fetchCustomerProfile = fetchCustomerProfile;
exports.fetchRecentOrders = fetchRecentOrders;
exports.getTicketDetails = getTicketDetails;
exports.escalateTicket = escalateTicket;
exports.logChangeEvent = logChangeEvent;
exports.recordAgentEvent = recordAgentEvent;
const supabase_js_1 = require("@supabase/supabase-js");
const axios_1 = __importDefault(require("axios"));
const crypto_1 = require("crypto");
const utils_1 = require("./utils");
const emailService_1 = require("../services/emailService");
const supabase = (0, supabase_js_1.createClient)(utils_1.config.supabase.url, utils_1.config.supabase.serviceRoleKey);
/**
 * Send a peer message using Agora RTM REST API
 * @param {string} appId - Agora app ID
 * @param {string} fromUser - Sender user ID
 * @param {string} toUser - Recipient user ID
 * @returns {Promise<PeerMessageResponse>}
 */
async function sendPeerMessage(appId, fromUser, toUser, payload) {
    const url = `https://api.agora.io/dev/v2/project/${appId}/rtm/users/${fromUser}/peer_messages`;
    const data = {
        destination: String(toUser),
        enable_offline_messaging: true,
        enable_historical_messaging: true,
        payload: payload,
    };
    try {
        const response = await axios_1.default.post(url, data, {
            headers: {
                Authorization: 'Basic ' + utils_1.config.agora.authToken,
                'Content-Type': 'application/json',
            },
        });
        console.log('Message sent successfully:', response.data);
        return response;
    }
    catch (error) {
        console.error('Error sending peer message:', error);
        throw error;
    }
}
async function resolveCustomerId(customerId, customerEmail) {
    if (customerId) {
        return customerId;
    }
    if (!customerEmail) {
        return null;
    }
    const { data, error } = await supabase
        .from('customers')
        .select('id')
        .filter('data->>email', 'eq', customerEmail)
        .maybeSingle();
    if (error) {
        console.error('Failed to resolve customer by email:', error);
        throw new Error(`Unable to resolve customer with email ${customerEmail}`);
    }
    return data?.id ?? null;
}
async function createSupportTicket(appId, userId, channel, args) {
    const { subject, description, customerEmail, priority = 'normal', orderId, customerId } = args;
    if (!subject || !description) {
        throw new Error('create_support_ticket requires subject and description.');
    }
    if (!customerEmail && !customerId) {
        throw new Error('create_support_ticket requires customerEmail or customerId.');
    }
    let resolvedCustomerId = await resolveCustomerId(customerId, customerEmail);
    if (!resolvedCustomerId && customerEmail) {
        // Create placeholder customer record so we have a reference
        const { data, error } = await supabase
            .from('customers')
            .insert({
            id: customerEmail,
            data: { email: customerEmail },
        })
            .select()
            .maybeSingle();
        if (error) {
            console.error('Failed to seed customer record:', error);
        }
        else {
            resolvedCustomerId = data?.id ?? null;
        }
    }
    let resolvedEmail = customerEmail ?? null;
    if (!resolvedEmail && resolvedCustomerId) {
        const { data: customer } = await supabase
            .from('customers')
            .select('data')
            .eq('id', resolvedCustomerId)
            .maybeSingle();
        resolvedEmail = customer?.data?.email ?? null;
    }
    if (!resolvedEmail) {
        throw new Error('Unable to determine customer email for ticket.');
    }
    const payload = {
        subject,
        description,
        customer_email: resolvedEmail,
        priority,
        order_id: orderId ?? null,
        customer_id: resolvedCustomerId ?? null,
        channel,
        user_id: userId,
        app_id: appId,
        status: 'open',
    };
    const { data, error } = await supabase
        .from(utils_1.config.support.ticketsTable)
        .insert(payload)
        .select()
        .single();
    if (error) {
        console.error('Failed to create support ticket:', error);
        throw new Error(`Failed to create support ticket: ${error.message}`);
    }
    const ticketId = data?.id;
    return ticketId
        ? `Support ticket ${ticketId} created with priority ${data.priority ?? priority}.`
        : 'Support ticket created.';
}
async function updateTicketStatus(_appId, userId, channel, args) {
    const { ticketId, status, internalNotes } = args;
    if (!ticketId || !status) {
        throw new Error('update_ticket_status requires ticketId and status.');
    }
    const updates = {
        status,
        updated_by: userId,
        updated_channel: channel,
        updated_at: new Date().toISOString(),
    };
    const { data, error } = await supabase
        .from(utils_1.config.support.ticketsTable)
        .update(updates)
        .eq('id', ticketId)
        .select()
        .single();
    if (error) {
        console.error('Failed to update support ticket:', error);
        throw new Error(`Failed to update ticket: ${error.message}`);
    }
    if (!data) {
        return `Ticket ${ticketId} not found.`;
    }
    if (internalNotes) {
        await logCustomerInteraction(_appId, userId, channel, {
            ticketId,
            note: internalNotes,
        });
    }
    return `Ticket ${ticketId} updated to status ${status}.`;
}
async function logCustomerInteraction(appId, userId, channel, args) {
    const { ticketId, note, sentiment } = args;
    if (!note) {
        throw new Error('log_customer_interaction requires a note field.');
    }
    const payload = {
        ticket_id: ticketId ?? null,
        note,
        sentiment: sentiment ?? null,
        channel,
        user_id: userId,
        app_id: appId,
    };
    const { data, error } = await supabase
        .from(utils_1.config.support.interactionsTable)
        .insert(payload)
        .select()
        .single();
    if (error) {
        console.error('Failed to log customer interaction:', error);
        throw new Error(`Failed to log customer interaction: ${error.message}`);
    }
    const interactionId = data?.id;
    return interactionId
        ? `Interaction ${interactionId} logged${ticketId ? ` for ticket ${ticketId}` : ''}.`
        : 'Customer interaction logged.';
}
async function fetchCustomerProfile(_appId, _userId, _channel, args) {
    const { customerId, customerEmail } = args;
    const resolvedCustomerId = await resolveCustomerId(customerId, customerEmail);
    if (!resolvedCustomerId) {
        throw new Error('fetch_customer_profile requires customerId or customerEmail.');
    }
    const { data, error } = await supabase.from('customers').select('*').eq('id', resolvedCustomerId).maybeSingle();
    if (error) {
        console.error('Failed to fetch customer profile:', error);
        throw new Error(`Failed to fetch customer profile: ${error.message}`);
    }
    if (!data) {
        return `No customer found with id ${resolvedCustomerId}.`;
    }
    return `Customer ${data.id} profile:\n${JSON.stringify(data.data, null, 2)}`;
}
async function fetchRecentOrders(_appId, _userId, _channel, args) {
    const { customerId, customerEmail, limit = 5 } = args;
    const resolvedCustomerId = await resolveCustomerId(customerId, customerEmail);
    console.log('Resolved customer ID:', resolvedCustomerId);
    console.log('Resolved customer Email:', customerEmail);
    if (!resolvedCustomerId) {
        throw new Error('fetch_recent_orders requires customerId or customerEmail.');
    }
    const { data, error } = await supabase
        .from('orders')
        .select('id, customer_id, data, updated_at')
        .eq('customer_id', resolvedCustomerId)
        .order('updated_at', { ascending: false })
        .limit(Math.max(1, Math.min(20, limit)));
    if (error) {
        console.error('Failed to fetch recent orders:', error);
        throw new Error(`Failed to fetch recent orders: ${error.message}`);
    }
    if (!data || data.length === 0) {
        return `No recent orders found for customer ${resolvedCustomerId}.`;
    }
    const orders = data.map((order) => {
        const orderData = (order.data ?? {});
        return {
            orderId: order.id,
            status: orderData.status ?? null,
            summary: orderData.summary ?? orderData.description ?? null,
            total: orderData.total ?? null,
            currency: orderData.currency ?? orderData.currency_code ?? null,
            updatedAt: order.updated_at,
            lineItems: Array.isArray(orderData.items) ? orderData.items : undefined,
        };
    });
    return JSON.stringify({
        type: 'orders',
        customerId: resolvedCustomerId,
        generatedAt: new Date().toISOString(),
        orders,
    });
}
async function getTicketDetails(_appId, _userId, _channel, args) {
    const { ticketId, includeInteractions = true } = args;
    if (!ticketId) {
        throw new Error('get_ticket_details requires ticketId.');
    }
    const { data, error } = await supabase
        .from(utils_1.config.support.ticketsTable)
        .select('*')
        .eq('id', ticketId)
        .maybeSingle();
    if (error) {
        console.error('Failed to fetch ticket:', error);
        throw new Error(`Failed to load ticket ${ticketId}: ${error.message}`);
    }
    if (!data) {
        return `Ticket ${ticketId} not found.`;
    }
    let interactionEntries;
    if (includeInteractions) {
        const { data: interactions } = await supabase
            .from(utils_1.config.support.interactionsTable)
            .select('*')
            .eq('ticket_id', ticketId)
            .order('created_at', { ascending: false })
            .limit(5);
        if (interactions && interactions.length > 0) {
            interactionEntries = interactions.map((item) => ({
                id: item.id,
                createdAt: item.created_at,
                note: item.note,
                sentiment: item.sentiment ?? null,
            }));
        }
    }
    const ticketSummary = {
        ticketId,
        status: data.status,
        priority: data.priority,
        subject: data.subject,
        summary: data.description ?? data.subject ?? '',
        customerId: data.customer_id ?? null,
        lastUpdated: data.updated_at ?? data.created_at,
        interactions: interactionEntries,
    };
    return JSON.stringify({
        type: 'ticket_details',
        generatedAt: new Date().toISOString(),
        ticket: ticketSummary,
    });
}
async function escalateTicket(_appId, userId, channel, args) {
    const { ticketId, customerId, severity = 'medium', reason, metadata } = args;
    if (!ticketId && !customerId) {
        throw new Error('escalate_ticket requires at least a ticketId or customerId.');
    }
    let resolvedCustomerId = customerId ?? null;
    if (!resolvedCustomerId && ticketId) {
        const { data: ticket } = await supabase
            .from(utils_1.config.support.ticketsTable)
            .select('customer_id')
            .eq('id', ticketId)
            .maybeSingle();
        resolvedCustomerId = ticket?.customer_id ?? null;
    }
    const escalationId = (0, crypto_1.randomUUID)();
    const payload = {
        escalation_id: escalationId,
        customer_id: resolvedCustomerId,
        status: 'open',
        severity,
        data: {
            reason: reason ?? 'Customer issue escalated by assistant.',
            metadata: metadata ?? null,
            triggered_by: userId,
            channel,
        },
    };
    const { error } = await supabase.from('escalations').insert(payload);
    if (error) {
        console.error('Failed to escalate ticket:', error);
        throw new Error(`Failed to escalate: ${error.message}`);
    }
    if (ticketId) {
        await supabase
            .from(utils_1.config.support.ticketsTable)
            .update({
            status: 'escalated',
            updated_by: userId,
            updated_channel: channel,
            updated_at: new Date().toISOString(),
        })
            .eq('id', ticketId);
    }
    const summary = `Escalation ${escalationId} created${ticketId ? ` for ticket ${ticketId}` : ''}.`;
    const conversationHistory = metadata?.conversationHistory ||
        (metadata ? JSON.stringify(metadata, null, 2) : undefined);
    emailService_1.emailService
        .sendEscalationEmail({
        customerId: resolvedCustomerId,
        customerName: metadata?.customerName,
        customerEmail: metadata?.customerEmail,
        tier: metadata?.tier || severity,
        issue: reason ?? 'Customer issue escalated by assistant.',
        conversationHistory,
        timestamp: new Date().toISOString(),
        agentId: userId,
        ticketId,
    })
        .catch((err) => {
        console.error('Failed to dispatch escalation email:', err?.message || err);
    });
    return summary;
}
async function logChangeEvent(_appId, userId, _channel, args) {
    const { entityType, entityId, status, data, reason } = args;
    if (!entityType || !entityId || !status) {
        throw new Error('log_change_event requires entityType, entityId, and status.');
    }
    const payload = {
        change_id: (0, crypto_1.randomUUID)(),
        entity_type: entityType,
        entity_id: entityId,
        status,
        made_by: userId,
        agent_id: utils_1.config.agentId,
        reason: reason ?? null,
        data: data ?? null,
    };
    const { error } = await supabase.from('changes').insert(payload);
    if (error) {
        console.error('Failed to log change event:', error);
        throw new Error(`Failed to log change: ${error.message}`);
    }
    return `Change event logged for ${entityType} ${entityId} with status ${status}.`;
}
async function recordAgentEvent(appId, _userId, channel, args) {
    const { customerId, intent, sentimentLabel, sentimentScore, urgency, tasks, payload } = args;
    if (!customerId && !payload?.customerId) {
        throw new Error('record_agent_event requires customerId.');
    }
    const eventPayload = {
        event_id: (0, crypto_1.randomUUID)(),
        customer_id: customerId ?? payload?.customerId,
        agent_id: utils_1.config.agentId,
        channel_name: channel,
        intent: intent ?? null,
        sentiment_label: sentimentLabel ?? null,
        sentiment_score: typeof sentimentScore === 'number' ? sentimentScore : null,
        urgency: urgency ?? null,
        tasks: tasks ?? null,
        payload: {
            ...(payload ?? {}),
            source_app_id: appId,
        },
    };
    const { error } = await supabase.from('agent_events').insert(eventPayload);
    if (error) {
        console.error('Failed to record agent event:', error);
        throw new Error(`Failed to record agent event: ${error.message}`);
    }
    return `Agent event recorded for customer ${eventPayload.customer_id}.`;
}
/**
 * Function map to execute functions by name
 */
const functionMap = {
    fetch_customer_profile: (appId, userId, channel, args) => fetchCustomerProfile(appId, userId, channel, args),
    fetch_recent_orders: (appId, userId, channel, args) => fetchRecentOrders(appId, userId, channel, args),
    create_support_ticket: (appId, userId, channel, args) => createSupportTicket(appId, userId, channel, args),
    update_ticket_status: (appId, userId, channel, args) => updateTicketStatus(appId, userId, channel, args),
    log_customer_interaction: (appId, userId, channel, args) => logCustomerInteraction(appId, userId, channel, args),
    get_ticket_details: (appId, userId, channel, args) => getTicketDetails(appId, userId, channel, args),
    escalate_ticket: (appId, userId, channel, args) => escalateTicket(appId, userId, channel, args),
    log_change_event: (appId, userId, channel, args) => logChangeEvent(appId, userId, channel, args),
    record_agent_event: (appId, userId, channel, args) => recordAgentEvent(appId, userId, channel, args),
};
exports.functionMap = functionMap;
