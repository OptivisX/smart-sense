const OpenAI = require('openai');
const { v4: uuidv4 } = require('uuid');

class AgentPipeline {
  constructor(options = {}) {
    this.openai = new OpenAI({
      apiKey: options.openaiApiKey || process.env.OPENAI_API_KEY
    });

    this.intentModel = options.intentModel || 'gpt-4o-mini';
    this.sentimentModel = options.sentimentModel || 'gpt-4o-mini';
  }

  async processTurn({ customerProfile, utterance, convoSummary, orderSnapshot }) {
    if (!utterance) {
      throw new Error('utterance is required');
    }

    const [intentResult, sentimentResult] = await Promise.all([
      this.classifyIntent({ customerProfile, utterance, convoSummary }),
      this.analyzeSentiment({ customerProfile, utterance, convoSummary })
    ]);

    const plan = this.planTasks({
      customerProfile,
      orderSnapshot,
      intent: intentResult.intent,
      labels: intentResult.labels,
      needsEscalation: intentResult.needsEscalation,
      sentiment: sentimentResult
    });

    return {
      eventId: uuidv4(),
      timestamp: new Date().toISOString(),
      intent: intentResult,
      sentiment: sentimentResult,
      tasks: plan.tasks,
      recommendedChannel: plan.channel,
      recommendedEscalation: plan.escalate,
      rationale: plan.reasoning
    };
  }

  async classifyIntent({ customerProfile, utterance, convoSummary }) {
    const prompt = `You are a customer-support routing analyst. Given customer context and the latest user utterance, classify the intent.
Return STRICT JSON with keys intent (string), confidence (0-1), labels (array), needsEscalation (boolean), rationale (string).
Example intents: order_status, return_refund, delivery_change, billing_issue, product_info, sentiment_only, unknown.`;

    const messages = [
      { role: 'system', content: prompt },
      { role: 'user', content: JSON.stringify({
        customer: customerProfile || null,
        utterance,
        conversation_summary: convoSummary || null
      }) }
    ];

    const result = await this.openai.chat.completions.create({
      model: this.intentModel,
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages
    });

    return this.safeJson(result.choices?.[0]?.message?.content, {
      intent: 'unknown',
      confidence: 0.3,
      labels: [],
      needsEscalation: false,
      rationale: 'Default fallback'
    });
  }

  async analyzeSentiment({ customerProfile, utterance, convoSummary }) {
    const prompt = `You are a CX sentiment detector. Respond with JSON sentiment:{label:'positive|neutral|negative', score:0-1},
tone:'calm|frustrated|angry|excited', urgency:'low|medium|high',
triggers:['string'], rationale`;

    const messages = [
      { role: 'system', content: prompt },
      { role: 'user', content: JSON.stringify({
        customer: customerProfile || null,
        utterance,
        conversation_summary: convoSummary || null
      }) }
    ];

    const result = await this.openai.chat.completions.create({
      model: this.sentimentModel,
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages
    });

    return this.safeJson(result.choices?.[0]?.message?.content, {
      sentiment: { label: 'neutral', score: 0.5 },
      tone: 'calm',
      urgency: 'low',
      triggers: [],
      rationale: 'Default sentiment fallback'
    });
  }

  planTasks({ customerProfile, orderSnapshot = [], intent, labels = [], needsEscalation, sentiment }) {
    const tasks = [];
    const reasoning = [];
    let channel = 'self-serve';
    let escalate = false;

    const lastOrderId = orderSnapshot[0]?.id || customerProfile?.orders?.[0];

    const requireEscalation = needsEscalation || sentiment?.urgency === 'high' || sentiment?.tone === 'angry';

    switch (intent) {
      case 'order_status':
        tasks.push({ type: 'lookup_order', orderId: lastOrderId, description: 'Fetch latest tracking status' });
        reasoning.push('User asked about order progress');
        break;
      case 'delivery_change':
        tasks.push({ type: 'update_order', orderId: lastOrderId, fields: ['eta', 'delivery_notes'], description: 'Apply delivery preference change' });
        channel = 'assisted';
        reasoning.push('Customer requested delivery modification');
        break;
      case 'return_refund':
        tasks.push({ type: 'lookup_order', orderId: lastOrderId, description: 'Verify return status' });
        tasks.push({ type: 'policy_lookup', policy: 'return' });
        reasoning.push('Return/refund request');
        break;
      case 'billing_issue':
        tasks.push({ type: 'lookup_order', orderId: lastOrderId, description: 'Check billing attempts' });
        tasks.push({ type: 'create_ticket', queue: 'billing' });
        channel = 'specialist';
        reasoning.push('Billing concern requires human oversight');
        escalate = true;
        break;
      case 'product_info':
        tasks.push({ type: 'rag_search', query: labels.join(', ') || 'product info', description: 'Retrieve KB snippets' });
        reasoning.push('Product info question answered via RAG');
        break;
      default:
        tasks.push({ type: 'clarify', description: 'Ask user for more detail' });
        reasoning.push('Intent unclear - prompt for clarification');
        break;
    }

    if (requireEscalation) {
      escalate = true;
      tasks.push({ type: 'escalate', destination: 'support', description: 'Escalate due to urgency/sentiment' });
      reasoning.push('High urgency or anger detected');
    }

    if (sentiment?.sentiment?.label === 'negative') {
      tasks.push({ type: 'acknowledge_emotion', description: 'Acknowledge frustration before resolution' });
      reasoning.push('User emotion needs acknowledgment');
    }

    return {
      tasks,
      channel,
      escalate,
      reasoning: reasoning.join(' | ')
    };
  }

  safeJson(raw, fallback) {
    if (!raw) return fallback;
    try {
      return JSON.parse(raw);
    } catch (err) {
      try {
        const fixed = raw.trim().replace(/^```json/gi, '').replace(/```$/, '');
        return JSON.parse(fixed);
      } catch (error) {
        return fallback;
      }
    }
  }
}

module.exports = AgentPipeline;
