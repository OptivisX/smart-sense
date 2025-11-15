require('dotenv').config({ override: true });

const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { RtcTokenBuilder, RtcRole } = require('agora-access-token');
const { DateTime } = require('luxon');

const RAGService = require('./ragService');
const EmailService = require('./emailService');
const dataService = require('./dataService');
const AgentPipeline = require('./agentPipeline');

// ----------------- CONFIGURATION -----------------
const config = Object.freeze({
  server: {
    port: Number(process.env.PORT) || 4000
  },
  agora: {
    appId: process.env.AGORA_APP_ID,
    appCertificate: process.env.AGORA_APP_CERTIFICATE,
    customerId: process.env.AGORA_CUSTOMER_ID,
    customerSecret: process.env.AGORA_CUSTOMER_SECRET
  },
  llm: {
    openaiApiKey: process.env.OPENAI_API_KEY
  },
  rag: {
    pineconeApiKey: process.env.PINECONE_API_KEY,
    indexName: process.env.PINECONE_INDEX_NAME || 'smart-support-kb'
  }
});

const AGORA_BASE_URL = `https://api.agora.io/api/conversational-ai-agent/v2/projects/${config.agora.appId}`;
const DEFAULT_CUSTOMER_ID = 'guest';
const MAX_AGENT_EVENTS = 200;
const DEFAULT_ESCALATION_SEVERITY = 'medium';

// ----------------- EXPRESS APP SETUP -----------------
const app = express();
app.use(cors());
app.use(express.json());

// ----------------- SERVICE INITIALIZATION -----------------
const ragService = new RAGService({
  openaiApiKey: config.llm.openaiApiKey,
  pineconeApiKey: config.rag.pineconeApiKey,
  indexName: config.rag.indexName
});
const emailService = new EmailService();
const agentPipeline = new AgentPipeline({ openaiApiKey: config.llm.openaiApiKey });

initializeRagService();
primeEmailService();

// ----------------- RUNTIME STATE -----------------
const sessionStore = new Map();
const escalations = [];
const agentEvents = [];

// ----------------- DATE HELPERS -----------------
function getISTDateInstance({ daysFromNow = 0, hour = 10, minute = 0 } = {}) {
  return DateTime.now()
    .setZone('Asia/Kolkata')
    .plus({ days: daysFromNow })
    .set({ hour, minute, second: 0, millisecond: 0 });
}

function formatISTDisplay(opts = {}) {
  return getISTDateInstance(opts).toFormat("dd MMM yyyy, hh:mm a 'IST'");
}

function formatISTISO(opts = {}) {
  return getISTDateInstance(opts).toISO();
}

// ----------------- MOCK DATA -----------------
const customers = {
  aman: {
    id: 'aman',
    name: 'Aman Agarwal',
    tier: 'Gold',
    language: 'en',
    lastContactReason: 'Delayed delivery',
    orders: ['A123', 'B456'],
    preferences: {
      tone: 'empathetic and proactive',
      communication: 'email updates + SMS when delayed',
      shipping: 'prefers express if delays hit twice'
    },
    history: [
      { date: '2024-11-01', topic: 'Late shipment', sentiment: 'frustrated', summary: 'Order A123 missed the promised window, requested compensation.' },
      { date: '2024-11-05', topic: 'Return follow-up', sentiment: 'neutral', summary: 'Checked on refund timeline for smartwatch return.' }
    ]
  },
  riya: {
    id: 'riya',
    name: 'Riya Sharma',
    tier: 'Silver',
    language: 'en',
    lastContactReason: 'Return request',
    orders: ['C999', 'D222'],
    preferences: {
      tone: 'friendly and concise',
      communication: 'prefers email only',
      productInterests: 'athleisure, wearables'
    },
    history: [
      { date: '2024-10-22', topic: 'Damaged item', sentiment: 'upset', summary: 'Smartwatch screen cracked, initiated exchange.' }
    ]
  },
  priya: {
    id: 'priya',
    name: 'Priya Kapur',
    tier: 'Platinum',
    language: 'en',
    lastContactReason: 'VIP styling consult',
    orders: ['E333'],
    preferences: {
      tone: 'premium and warm',
      communication: 'phone + WhatsApp',
      shipping: 'always express for launches'
    },
    history: [
      { date: '2024-11-08', topic: 'Limited edition drop', sentiment: 'excited', summary: 'Booked priority shipping for Noir Glow collection.' },
      { date: '2024-11-11', topic: 'Size exchange', sentiment: 'neutral', summary: 'Needed half-size up for limited sneakers.' }
    ]
  },
  liam: {
    id: 'liam',
    name: "Liam O'Connor",
    tier: 'Bronze',
    language: 'en',
    lastContactReason: 'Address update',
    orders: ['F444'],
    preferences: {
      tone: 'straightforward',
      communication: 'SMS first',
      shipping: 'standard'
    },
    history: [
      { date: '2024-09-30', topic: 'Sizing question', sentiment: 'neutral', summary: 'Asked if running shoes fit wide feet.' }
    ]
  }
};

const orders = {
  A123: {
    id: 'A123',
    customerId: 'aman',
    status: 'Shipped',
    eta: formatISTDisplay({ daysFromNow: 1, hour: 18, minute: 0 }),
    etaISO: formatISTISO({ daysFromNow: 1, hour: 18, minute: 0 }),
    items: ['Noise Cancelling Headphones'],
    lastUpdate: `Out for delivery as of ${formatISTDisplay({ daysFromNow: 0, hour: 11, minute: 30 })}`,
    lastUpdateISO: formatISTISO({ daysFromNow: 0, hour: 11, minute: 30 })
  },
  B456: {
    id: 'B456',
    customerId: 'aman',
    status: 'Delivered',
    eta: formatISTDisplay({ daysFromNow: -2, hour: 14, minute: 15 }),
    etaISO: formatISTISO({ daysFromNow: -2, hour: 14, minute: 15 }),
    items: ['Running Shoes'],
    lastUpdate: `Delivered and signed on ${formatISTDisplay({ daysFromNow: -2, hour: 14, minute: 15 })}`,
    lastUpdateISO: formatISTISO({ daysFromNow: -2, hour: 14, minute: 15 })
  },
  C999: {
    id: 'C999',
    customerId: 'riya',
    status: 'Return in progress',
    eta: `Refund scheduled by ${formatISTDisplay({ daysFromNow: 4, hour: 17, minute: 30 })}`,
    etaISO: formatISTISO({ daysFromNow: 4, hour: 17, minute: 30 }),
    items: ['Smartwatch'],
    lastUpdate: `Pickup window ${formatISTDisplay({ daysFromNow: 0, hour: 16, minute: 0 })}`,
    lastUpdateISO: formatISTISO({ daysFromNow: 0, hour: 16, minute: 0 })
  },
  D222: {
    id: 'D222',
    customerId: 'riya',
    status: 'Processing exchange',
    eta: `Replacement ships ${formatISTDisplay({ daysFromNow: 1, hour: 13, minute: 0 })}`,
    etaISO: formatISTISO({ daysFromNow: 1, hour: 13, minute: 0 }),
    items: ['Smart Fitness Band'],
    lastUpdate: `Label generated at ${formatISTDisplay({ daysFromNow: 0, hour: 9, minute: 45 })}`,
    lastUpdateISO: formatISTISO({ daysFromNow: 0, hour: 9, minute: 45 })
  },
  E333: {
    id: 'E333',
    customerId: 'priya',
    status: 'Awaiting payment confirmation',
    eta: `Express dispatch ${formatISTDisplay({ daysFromNow: 0, hour: 20, minute: 0 })} once payment clears`,
    etaISO: formatISTISO({ daysFromNow: 0, hour: 20, minute: 0 }),
    items: ['Noir Glow Limited Sneakers'],
    lastUpdate: `VIP payment link sent ${formatISTDisplay({ daysFromNow: 0, hour: 8, minute: 15 })}`,
    lastUpdateISO: formatISTISO({ daysFromNow: 0, hour: 8, minute: 15 })
  },
  F444: {
    id: 'F444',
    customerId: 'liam',
    status: 'Shipped',
    eta: formatISTDisplay({ daysFromNow: 2, hour: 17, minute: 45 }),
    etaISO: formatISTISO({ daysFromNow: 2, hour: 17, minute: 45 }),
    items: ['Trail Runner 2.0'],
    lastUpdate: `Departed distribution center ${formatISTDisplay({ daysFromNow: -1, hour: 19, minute: 10 })}`,
    lastUpdateISO: formatISTISO({ daysFromNow: -1, hour: 19, minute: 10 })
  }
};

// ----------------- DATA SYNC -----------------
dataService.loadInitialData(customers, orders)
  .then(result => {
    if (result.seeded) {
      console.log('🌱 Supabase seeded with initial mock data');
    } else if (result.customersLoaded || result.ordersLoaded) {
      console.log(`🔄 Loaded ${result.customersLoaded} customers & ${result.ordersLoaded} orders from Supabase`);
    }
  })
  .catch(err => {
    console.error('Supabase bootstrap failed:', err.message);
  });

// ----------------- HELPERS -----------------
function initializeRagService() {
  ragService.initialize()
    .then(() => console.log('✅ RAG service ready'))
    .catch(err => console.error('⚠️  RAG service initialization failed:', err.message));
}

function primeEmailService() {
  setImmediate(() => {
    emailService.testConnection().catch(err => {
      console.warn('📧 Email service not configured:', err.message);
    });
  });
}

function createId(prefix) {
  return `${prefix}-${Date.now()}`;
}

function createTimestamp() {
  return new Date().toISOString();
}

function formatPreferences(preferences = {}) {
  const entries = Object.entries(preferences || {});
  if (!entries.length) {
    return 'No saved preferences.';
  }
  return entries.map(([key, value]) => `${key}: ${value}`).join('; ');
}

function formatHistory(history = []) {
  if (!history || !history.length) {
    return 'No prior interactions recorded.';
  }
  return history
    .slice(-3)
    .map(item => `${item.date} - ${item.topic}: ${item.summary}`)
    .join('\n');
}

function buildPersonalizationContext(profile) {
  return `Customer Preferences:\n${formatPreferences(profile.preferences)}\n\nRecent Interactions:\n${formatHistory(profile.history)}\n`;
}

async function getCustomerProfile(customerId) {
  const fallback = {
    id: DEFAULT_CUSTOMER_ID,
    name: 'Guest',
    tier: 'Bronze',
    language: 'en',
    orders: []
  };

  if (!customerId) return fallback;

  let profile = customers[customerId];
  if (!profile && dataService.isSupabaseConfigured()) {
    profile = await dataService.fetchCustomerById(customerId);
    if (profile) {
      customers[customerId] = profile;
    }
  }

  return profile || fallback;
}

async function getOrderDetails(orderId) {
  if (!orderId) return null;
  let order = orders[orderId];
  if (!order && dataService.isSupabaseConfigured()) {
    order = await dataService.fetchOrderById(orderId);
    if (order) {
      orders[orderId] = order;
    }
  }
  return order;
}

async function getOrderSnapshot(orderIds = []) {
  const snapshot = await Promise.all(
    (orderIds || []).map(async id => ({ id, details: await getOrderDetails(id) }))
  );
  return snapshot.filter(entry => entry.details);
}

function formatOrderSummary(orderSnapshot = []) {
  if (!orderSnapshot.length) {
    return 'No active orders on file.';
  }

  return orderSnapshot
    .map(({ id, details }) => `${id}: status=${details.status}, ETA=${details.eta}, last_update=${details.lastUpdate}`)
    .join('\n');
}

async function buildKnowledgeContext(conversationContext = '') {
  if (!conversationContext) {
    return '';
  }

  try {
    const ragResults = await ragService.retrieveContext(conversationContext, {
      topK: 3,
      minScore: 0.75
    });

    if (ragResults.found) {
      return `\n\nRelevant Knowledge Base Information:\n${ragResults.context}`;
    }
  } catch (error) {
    console.error('RAG retrieval error:', error.message);
  }

  return '';
}

async function buildSystemMessages(customerId, conversationContext = '') {
  const profile = await getCustomerProfile(customerId);
  const orderSnapshot = await getOrderSnapshot(profile.orders || []);
  const personalizationContext = buildPersonalizationContext(profile);
  const orderContext = formatOrderSummary(orderSnapshot);
  const knowledgeContext = await buildKnowledgeContext(conversationContext);

  const policyText = `
You are SmartSense, a friendly but efficient customer support AI for an e-commerce brand.

Your goals:
1. Solve customer's issue in as few steps as possible.
2. Always check if the question is:
   - FAQ (policy / general info)
   - ORDER_STATUS
   - RETURN_OR_REFUND
   - SIMPLE UPDATE REQUEST
   - COMPLEX / EDGE CASE (REQUIRES ESCALATION)
3. If the case is COMPLEX, you MUST escalate to a human agent.

Customer profile:
- Name: ${profile.name}
- Tier: ${profile.tier}

Orders:
${orderContext}

${personalizationContext}${knowledgeContext}
`;

  return [
    { role: 'system', content: policyText }
  ];
}

function buildChannelName(customerId) {
  return `support_${customerId}_${Date.now()}`;
}

function generateRtcToken(channelName, uid) {
  const role = RtcRole.PUBLISHER;
  const expirationInSeconds = 60 * 60;
  const currentTimestamp = Math.floor(Date.now() / 1000);
  const privilegeExpiredTs = currentTimestamp + expirationInSeconds;

  return RtcTokenBuilder.buildTokenWithUid(
    config.agora.appId,
    config.agora.appCertificate,
    channelName,
    uid,
    role,
    privilegeExpiredTs
  );
}

function getAgoraAuthHeader() {
  const creds = Buffer.from(`${config.agora.customerId}:${config.agora.customerSecret}`).toString('base64');
  return `Basic ${creds}`;
}

function buildAgoraJoinPayload({ agentName, channelName, rtcToken, systemMessages }) {
  return {
    name: agentName,
    properties: {
      channel: channelName,
      token: rtcToken,
      agent_rtc_uid: '1',
      remote_rtc_uids: ['*'],
      enable_string_uid: false,
      idle_timeout: 300,
      llm: {
        url: 'https://ca0e779644e8.ngrok-free.app/v1/chat/completion',
        api_key: '',
        system_messages: systemMessages
      },
      asr: {
        language: 'en-US'
      },
      tts: {
        vendor: 'openai',
        params: {
          api_key: config.llm.openaiApiKey,
          voice: 'coral',
          model: 'gpt-4o-mini-tts',
          instructions: 'Please use standard American English, natural tone, moderate pace, and steady intonation',
          speed: 1
        },
        skip_patterns: [1, 2, 5]
      }
    }
  };
}

async function recordAgentPipelineEvent({ customerId, agentId, channelName, pipelineResult, utterance, conversationSummary }) {
  const event = {
    eventId: createId('AGENT_EVT'),
    timestamp: createTimestamp(),
    customerId,
    agentId,
    channelName,
    utterance,
    conversationSummary,
    intent: pipelineResult?.intent || null,
    sentiment: pipelineResult?.sentiment || null,
    tasks: pipelineResult?.tasks || []
  };

  agentEvents.push(event);
  if (agentEvents.length > MAX_AGENT_EVENTS) {
    agentEvents.shift();
  }

  dataService.logAgentEvent(event).catch(err => {
    console.error('Agent event logging error:', err.message);
  });

  return event;
}

async function processInitialQuery({ customerProfile, customerId, agentId, channelName, utterance }) {
  try {
    const orderSnapshot = await getOrderSnapshot(customerProfile?.orders || []);
    const pipelineResult = await agentPipeline.processTurn({
      customerProfile,
      orderSnapshot,
      utterance,
      convoSummary: null
    });

    await recordAgentPipelineEvent({
      customerId,
      agentId,
      channelName,
      pipelineResult,
      utterance,
      conversationSummary: null
    });
  } catch (error) {
    console.error('Agent pipeline initial query error:', error.message);
  }
}

async function buildEscalationPayload({ customerId, issue, conversationHistory, agentId, severity = DEFAULT_ESCALATION_SEVERITY }) {
  const customer = await getCustomerProfile(customerId);
  return {
    escalationId: createId('ESC'),
    customerId,
    customerName: customer.name,
    customerEmail: customer.email,
    tier: customer.tier,
    issue,
    conversationHistory,
    agentId,
    severity,
    timestamp: createTimestamp(),
    status: 'open',
    assignedTo: null,
    resolvedAt: null
  };
}

async function dispatchEscalation(escalation) {
  escalations.push(escalation);
  console.log(`🚨 Escalation triggered: ${escalation.escalationId} for ${escalation.customerName}`);

  let emailResult = { success: false, error: 'Email service not configured' };
  try {
    emailResult = await emailService.sendEscalationEmail(escalation);
  } catch (err) {
    console.error(`📧 Email sending error: ${err.message}`);
    emailResult = { success: false, error: err.message };
  }

  escalation.emailSent = !!emailResult?.success;
  escalation.emailResult = emailResult;
  await dataService.recordEscalation(escalation);

  return { emailResult };
}

async function triggerEscalationFlow(params) {
  const escalation = await buildEscalationPayload(params);
  const { emailResult } = await dispatchEscalation(escalation);
  return { escalation, emailResult };
}

// ----------------- ROUTES -----------------
app.post('/api/session', async (req, res) => {
  try {
    const { customerId, initialQuery } = req.body;
    const resolvedCustomerId = customerId || DEFAULT_CUSTOMER_ID;
    const channelName = buildChannelName(resolvedCustomerId);
    const uid = 0;

    const rtcToken = generateRtcToken(channelName, uid);
    const customerProfile = await getCustomerProfile(resolvedCustomerId);
    const systemMessages = await buildSystemMessages(resolvedCustomerId, initialQuery || '');
    const agentName = `agent_${resolvedCustomerId}_${Date.now()}`;
    const payload = buildAgoraJoinPayload({
      agentName,
      channelName,
      rtcToken,
      systemMessages
    });

    const response = await axios.post(`${AGORA_BASE_URL}/join`, payload, {
      headers: {
        Authorization: getAgoraAuthHeader(),
        'Content-Type': 'application/json'
      }
    });

    const agentId = response.data.agent_id;

    sessionStore.set(agentId, {
      agentId,
      customerId: resolvedCustomerId,
      channelName,
      agentName,
      customerName: customerProfile?.name || 'Guest',
      createdAt: createTimestamp()
    });

    console.log(`🎧 Session registered for ${resolvedCustomerId} via agent ${agentId}`);

    if (initialQuery) {
      setImmediate(() => {
        processInitialQuery({
          customerProfile,
          customerId: resolvedCustomerId,
          agentId,
          channelName,
          utterance: initialQuery
        });
      });
    }

    return res.json({
      appId: config.agora.appId,
      channelName,
      token: rtcToken,
      uid,
      agentId,
      customerProfile: customerProfile?.id ? customerProfile : null
    });
  } catch (err) {
    console.error('Error starting session:', err.response?.data || err.message);
    return res.status(500).json({ error: 'Failed to start AI agent' });
  }
});

app.post('/api/stop', async (req, res) => {
  try {
    const { agentId } = req.body;
    if (!agentId) return res.status(400).json({ error: 'agentId required' });

    const url = `${AGORA_BASE_URL}/agents/${agentId}/leave`;

    await axios.post(url, {}, {
      headers: {
        Authorization: getAgoraAuthHeader(),
        'Content-Type': 'application/json'
      }
    });

    if (sessionStore.has(agentId)) {
      sessionStore.delete(agentId);
      console.log(`🧹 Cleaned up session for agent ${agentId}`);
    }

    return res.json({ ok: true });
  } catch (err) {
    console.error('Error stopping agent:', err.response?.data || err.message);
    return res.status(500).json({ error: 'Failed to stop AI agent' });
  }
});

// ----------------- SERVER START -----------------
app.listen(config.server.port, () => {
  console.log(`SmartSupport backend running on port ${config.server.port}`);
});
