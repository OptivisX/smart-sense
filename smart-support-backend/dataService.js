const { supabase, isSupabaseConfigured } = require('./supabaseClient');

function safeCopy(data) {
  return JSON.parse(JSON.stringify(data));
}

async function loadInitialData(customersStore, ordersStore) {
  if (!isSupabaseConfigured() || !supabase) {
    return { customersLoaded: 0, ordersLoaded: 0, seeded: false };
  }

  try {
    const [{ data: customerRows, error: customerError }, { data: orderRows, error: orderError }] = await Promise.all([
      supabase.from('customers').select('id, data'),
      supabase.from('orders').select('id, customer_id, data')
    ]);

    if (customerError) {
      console.error('Supabase customers fetch error:', customerError.message);
    }

    if (orderError) {
      console.error('Supabase orders fetch error:', orderError.message);
    }

    const customersLoaded = (customerRows || []).length;
    const ordersLoaded = (orderRows || []).length;

    if (!customersLoaded && !ordersLoaded) {
      // Seed Supabase with local mock data on first run
      await seedSupabase(customersStore, ordersStore);
      return { customersLoaded: 0, ordersLoaded: 0, seeded: true };
    }

    (customerRows || []).forEach(row => {
      if (row && row.id && row.data) {
        customersStore[row.id] = row.data;
      }
    });

    (orderRows || []).forEach(row => {
      if (row && row.id && row.data) {
        ordersStore[row.id] = {
          ...row.data,
          customerId: row.customer_id || row.data.customerId
        };
      }
    });

    return { customersLoaded, ordersLoaded, seeded: false };
  } catch (error) {
    console.error('Supabase initialization error:', error.message);
    return { customersLoaded: 0, ordersLoaded: 0, seeded: false };
  }
}

async function seedSupabase(customersStore, ordersStore) {
  if (!isSupabaseConfigured() || !supabase) {
    return;
  }

  const customerPayload = Object.values(customersStore).map(customer => ({
    id: customer.id,
    data: safeCopy(customer)
  }));

  const orderPayload = Object.values(ordersStore).map(order => ({
    id: order.id,
    customer_id: order.customerId,
    data: safeCopy(order)
  }));

  if (customerPayload.length) {
    await supabase.from('customers').upsert(customerPayload, { onConflict: 'id' });
  }

  if (orderPayload.length) {
    await supabase.from('orders').upsert(orderPayload, { onConflict: 'id' });
  }
}

async function persistCustomer(customer) {
  if (!isSupabaseConfigured() || !supabase) return;
  try {
    await supabase.from('customers').upsert({
      id: customer.id,
      data: safeCopy(customer),
      updated_at: new Date().toISOString()
    }, { onConflict: 'id' });
  } catch (error) {
    console.error(`Supabase persistCustomer error (${customer.id}):`, error.message);
  }
}

async function persistOrder(order) {
  if (!isSupabaseConfigured() || !supabase) return;
  try {
    await supabase.from('orders').upsert({
      id: order.id,
      customer_id: order.customerId,
      data: safeCopy(order),
      updated_at: new Date().toISOString()
    }, { onConflict: 'id' });
  } catch (error) {
    console.error(`Supabase persistOrder error (${order.id}):`, error.message);
  }
}

async function recordChange(change) {
  if (!isSupabaseConfigured() || !supabase) return;
  try {
    await supabase.from('changes').upsert({
      change_id: change.changeId,
      entity_type: change.entityType,
      entity_id: change.entityId,
      status: change.status,
      made_by: change.madeBy,
      agent_id: change.agentId,
      reason: change.reason,
      data: safeCopy(change),
      created_at: change.timestamp
    }, { onConflict: 'change_id' });
  } catch (error) {
    console.error('Supabase recordChange error:', error.message);
  }
}

async function updateChange(changeId, fields) {
  if (!isSupabaseConfigured() || !supabase) return;
  try {
    await supabase.from('changes')
      .update(fields)
      .eq('change_id', changeId);
  } catch (error) {
    console.error('Supabase updateChange error:', error.message);
  }
}

async function fetchChanges(filters = {}) {
  if (!isSupabaseConfigured() || !supabase) return null;
  try {
    let query = supabase.from('changes').select('*').order('created_at', { ascending: false });
    if (filters.status) query = query.eq('status', filters.status);
    if (filters.entityType) query = query.eq('entity_type', filters.entityType);
    if (filters.madeBy) query = query.eq('made_by', filters.madeBy);
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Supabase fetchChanges error:', error.message);
    return null;
  }
}

async function fetchChangeById(changeId) {
  if (!isSupabaseConfigured() || !supabase) return null;
  try {
    const { data, error } = await supabase
      .from('changes')
      .select('*')
      .eq('change_id', changeId)
      .single();
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Supabase fetchChangeById error:', error.message);
    return null;
  }
}

async function fetchChangesByEntity(entityType, entityId) {
  if (!isSupabaseConfigured() || !supabase) return null;
  try {
    const { data, error } = await supabase
      .from('changes')
      .select('*')
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Supabase fetchChangesByEntity error:', error.message);
    return null;
  }
}

async function recordEscalation(escalation) {
  if (!isSupabaseConfigured() || !supabase) return;
  try {
    await supabase.from('escalations').upsert({
      escalation_id: escalation.escalationId,
      customer_id: escalation.customerId,
      status: escalation.status,
      severity: escalation.severity,
      email_sent: !!escalation.emailSent,
      email_result: escalation.emailResult || null,
      data: safeCopy(escalation),
      created_at: escalation.timestamp
    }, { onConflict: 'escalation_id' });
  } catch (error) {
    console.error('Supabase recordEscalation error:', error.message);
  }
}

async function updateEscalation(escalationId, fields) {
  if (!isSupabaseConfigured() || !supabase) return;
  try {
    await supabase.from('escalations')
      .update(fields)
      .eq('escalation_id', escalationId);
  } catch (error) {
    console.error('Supabase updateEscalation error:', error.message);
  }
}

async function fetchEscalations(filters = {}) {
  if (!isSupabaseConfigured() || !supabase) return null;
  try {
    let query = supabase.from('escalations').select('*').order('created_at', { ascending: false });
    if (filters.status) query = query.eq('status', filters.status);
    if (filters.customerId) query = query.eq('customer_id', filters.customerId);
    const { data, error } = await query;
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Supabase fetchEscalations error:', error.message);
    return null;
  }
}

async function logAgentEvent(event) {
  if (!isSupabaseConfigured() || !supabase) return;
  try {
    await supabase.from('agent_events').insert({
      event_id: event.eventId,
      customer_id: event.customerId,
      agent_id: event.agentId,
      channel_name: event.channelName,
      intent: event.intent?.intent,
      sentiment_label: event.sentiment?.sentiment?.label,
      sentiment_score: event.sentiment?.sentiment?.score,
      urgency: event.sentiment?.urgency,
      tasks: safeCopy(event.tasks || []),
      payload: safeCopy(event),
      created_at: event.timestamp
    });
  } catch (error) {
    console.error('Supabase logAgentEvent error:', error.message);
  }
}

async function fetchAgentEvents(filters = {}) {
  if (!isSupabaseConfigured() || !supabase) return null;
  try {
    let query = supabase.from('agent_events').select('*').order('created_at', { ascending: false });
    if (filters.customerId) query = query.eq('customer_id', filters.customerId);
    if (filters.agentId) query = query.eq('agent_id', filters.agentId);
    const { data, error } = await query;
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Supabase fetchAgentEvents error:', error.message);
    return null;
  }
}

async function fetchCustomerById(customerId) {
  if (!isSupabaseConfigured() || !supabase) return null;
  try {
    const { data, error } = await supabase
      .from('customers')
      .select('id, data')
      .eq('id', customerId)
      .single();
    if (error) throw error;
    return data?.data || null;
  } catch (error) {
    console.error('Supabase fetchCustomerById error:', error.message);
    return null;
  }
}

async function fetchOrderById(orderId) {
  if (!isSupabaseConfigured() || !supabase) return null;
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('id, data')
      .eq('id', orderId)
      .single();
    if (error) throw error;
    return data?.data || null;
  } catch (error) {
    console.error('Supabase fetchOrderById error:', error.message);
    return null;
  }
}

module.exports = {
  loadInitialData,
  seedSupabase,
  persistCustomer,
  persistOrder,
  recordChange,
  updateChange,
  fetchChanges,
  fetchChangeById,
  fetchChangesByEntity,
  recordEscalation,
  updateEscalation,
  fetchEscalations,
  logAgentEvent,
  fetchAgentEvents,
  fetchCustomerById,
  fetchOrderById,
  isSupabaseConfigured
};
