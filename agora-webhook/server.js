// server.js
require('dotenv').config();
const express = require('express');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 4001;
const BACKEND_BASE_URL = process.env.BACKEND_BASE_URL || 'http://localhost:4000';
const ESCALATION_TAG = '[ESCALATE_REQUIRED]';
const UPDATE_TAG = '[BOT_UPDATE]';
const processedEscalations = new Set();
const processedUpdates = new Set();

// Parse JSON body from Agora
app.use(express.json({ type: '*/*' }));

// Health check endpoint (used when you click "Check" in console)
app.get('/agora-webhook', (req, res) => {
  res.status(200).send('OK');
});

// Main webhook – Agora will POST here for events (101,102,103,...)
app.post('/agora-webhook', (req, res) => {
  console.log('===== AGORA WEBHOOK RECEIVED =====');
  console.log('Headers:', req.headers);
  console.log('Body:', JSON.stringify(req.body, null, 2));
  console.log('===================================');

  // Always respond quickly with 200 so Agora treats it as success
  res.status(200).send('ok');

  const payload = req.body;
  setImmediate(() => {
    processWebhookEvent(payload).catch(err => {
      console.error('⚠️  Error processing webhook event:', err.message);
    });
  });
});

// Optional: root route so you can test in browser
app.get('/', (req, res) => {
  res.send('Agora webhook server is running 👍');
});

app.listen(PORT, () => {
  console.log(`Webhook listening on http://localhost:${PORT}`);
});

async function processWebhookEvent(payload) {
  const agentId = findAgentId(payload);
  if (!agentId) {
    console.warn('⚠️  Could not determine agentId from webhook payload');
  }

  const escalateMessages = collectTaggedStrings(payload, ESCALATION_TAG);
  for (const message of escalateMessages) {
    await triggerEscalation(agentId, message);
  }

  const updateMessages = collectTaggedStrings(payload, UPDATE_TAG);
  for (const message of updateMessages) {
    const updates = parseBotUpdatePayloads(message);
    for (const update of updates) {
      await forwardBotUpdate(agentId, update);
    }
  }
}

function findAgentId(payload) {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const stack = [payload];
  while (stack.length) {
    const current = stack.pop();
    if (!current || typeof current !== 'object') {
      continue;
    }

    for (const [key, value] of Object.entries(current)) {
      if ((key === 'agent_id' || key === 'agentId') && typeof value === 'string') {
        return value;
      }

      if (typeof value === 'object') {
        stack.push(value);
      }
    }
  }

  return null;
}

function collectTaggedStrings(payload, tag) {
  const matches = new Set();

  function traverse(node) {
    if (node === null || node === undefined) {
      return;
    }

    if (typeof node === 'string') {
      if (node.includes(tag)) {
        matches.add(node);
      }
      return;
    }

    if (Array.isArray(node)) {
      node.forEach(traverse);
      return;
    }

    if (typeof node === 'object') {
      Object.values(node).forEach(traverse);
    }
  }

  traverse(payload);
  return Array.from(matches);
}

function parseBotUpdatePayloads(message) {
  const payloads = [];
  let searchIndex = 0;

  while (searchIndex < message.length) {
    const markerIndex = message.indexOf(UPDATE_TAG, searchIndex);
    if (markerIndex === -1) {
      break;
    }

    const jsonStart = message.indexOf('{', markerIndex);
    if (jsonStart === -1) {
      break;
    }

    let depth = 0;
    let endIndex = jsonStart;

    for (; endIndex < message.length; endIndex++) {
      const char = message[endIndex];
      if (char === '{') {
        depth += 1;
      } else if (char === '}') {
        depth -= 1;
        if (depth === 0) {
          break;
        }
      }
    }

    if (depth === 0) {
      const jsonString = message.slice(jsonStart, endIndex + 1);
      try {
        payloads.push(JSON.parse(jsonString));
      } catch (err) {
        console.error('❌ Failed to parse BOT_UPDATE payload:', err.message);
      }
      searchIndex = endIndex + 1;
    } else {
      break;
    }
  }

  return payloads;
}

function rememberProcessing(set, key, limit = 500) {
  if (!key) {
    return false;
  }

  if (set.has(key)) {
    return false;
  }

  set.add(key);
  if (set.size > limit) {
    const first = set.values().next().value;
    if (first) {
      set.delete(first);
    }
  }

  return true;
}

async function triggerEscalation(agentId, botResponse) {
  if (!agentId) {
    console.warn('⚠️  Cannot trigger escalation without agentId');
    return;
  }

  const dedupeKey = `${agentId}:${botResponse}`;
  if (!rememberProcessing(processedEscalations, dedupeKey)) {
    return;
  }

  try {
    await axios.post(`${BACKEND_BASE_URL}/api/escalate/check`, {
      agentId,
      botResponse,
      conversationHistory: botResponse
    }, {
      timeout: 5000
    });

    console.log(`🚨 Forwarded escalation for agent ${agentId}`);
  } catch (error) {
    console.error('❌ Failed to call escalation endpoint:', error.response?.data || error.message);
  }
}

async function forwardBotUpdate(agentId, updatePayload) {
  if (!updatePayload || !updatePayload.entityType || !updatePayload.entityId || !updatePayload.updates) {
    console.warn('⚠️  Invalid BOT_UPDATE payload, skipping');
    return;
  }

  const dedupeKey = `${agentId || 'unknown'}:${JSON.stringify(updatePayload)}`;
  if (!rememberProcessing(processedUpdates, dedupeKey)) {
    return;
  }

  const reason = updatePayload.reason || 'Bot simple update';
  const baseOptions = {
    reason,
    updates: updatePayload.updates,
    agentId
  };

  let url;
  let body;

  if (updatePayload.entityType === 'order') {
    url = `${BACKEND_BASE_URL}/api/bot/update-order`;
    body = { ...baseOptions, orderId: updatePayload.entityId };
  } else if (updatePayload.entityType === 'customer') {
    url = `${BACKEND_BASE_URL}/api/bot/update-customer`;
    body = { ...baseOptions, customerId: updatePayload.entityId };
  } else {
    console.warn('⚠️  Unknown entityType in BOT_UPDATE payload:', updatePayload.entityType);
    return;
  }

  try {
    await axios.post(url, body, { timeout: 5000 });
    console.log(`🤖 Applied ${updatePayload.entityType} update for ${updatePayload.entityId}`);
  } catch (error) {
    console.error('❌ Failed to forward BOT_UPDATE payload:', error.response?.data || error.message);
  }
}
