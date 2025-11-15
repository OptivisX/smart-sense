# SmartSupport MVP Flow Overview

This doc captures the "whiteboard" view of the new planning-and-execution loop so managers can see how a user utterance flows through the stack.

```
┌──────────────┐   1. Voice/Text Turn   ┌────────────────────┐
│ Customer App │───────────────────────▶│ /api/agent/process │
└──────────────┘                        │      -turn          │
                                          │  (Server.js)       │
                                          └────────┬──────────┘
                                                   │
                              ┌────────────────────┴────────────────────┐
                              │ AgentPipeline (agentPipeline.js)        │
                              │  - classifyIntent()  (OpenAI GPT-4o)    │
                              │  - analyzeSentiment()                   │
                              │  - planTasks()                          │
                              └────────┬───────────────────────────────┘
                                       │ structured actions
             ┌──────────────────────────┼───────────────────────────┐
             │                          │                           │
     log Intent/Sentiment        update Task List            Feeds metadata
   (Supabase.agent_events)   (tasks array + escalation)     into webhook/LLM
             │                          │                           │
┌────────────▼────────────┐   ┌─────────▼─────────┐        ┌────────▼────────┐
│Product Ops Dashboards   │   │Automation Routines│        │Agora/LLM Prompt │
│- review trends          │   │- update orders    │        │- personalized   │
│- see escalations        │   │- create tickets   │        │  response        │
└─────────────────────────┘   └───────────────────┘        └────────────────┘
```

## Step-by-step

1. **User turn arrives** (voice/text). Frontend or webhook calls `POST /api/agent/process-turn` with `customerId`, `agentId`, `channelName`, and the utterance transcript.
2. **AgentPipeline**
   - `classifyIntent()` asks GPT-4o-mini for a strict JSON verdict (`order_status`, `delivery_change`, etc.) + escalation hint.
   - `analyzeSentiment()` labels tone/urgency and surfaces triggers ("threatening legal action", "delivery missed twice", etc.).
   - `planTasks()` combines intent, sentiment, and order snapshot to build an ordered task list (lookup order, update ETA, escalate, etc.) and chooses the right channel (`self-serve`, `assisted`, `specialist`).
3. **Event logging**
   - We persist every turn to Supabase `agent_events` so dashboards / BI can inspect real conversations, see how often we escalate, and trace automation safety.
   - Latest events are also cached in memory for quick inspection via `GET /api/agent/events` without hitting the DB.
4. **Action fan-out**
   - The webhook (or any orchestrator) reads the task list and executes actions: call `/api/bot/update-order`, `/api/escalate`, fetch RAG snippets, etc.
   - Because tasks are structured, we can route specific categories to billing, technical, or general flows—mirroring the diagram you shared.
5. **LLM response**
   - The outcome of tasks (status lookup, updates, escalation confirmation) is fed back into the Agora/OpenAI prompt so the customer hears an informed, personalized reply.

## Key Endpoints / Tables

| Component | Location | Purpose |
|-----------|----------|---------|
| `POST /api/agent/process-turn` | `server.js` | Single entry point for running intent/sentiment analysis + task planning |
| `GET /api/agent/events` | `server.js` | Inspect latest planning decisions (from Supabase if configured) |
| `agentPipeline.js` | root | Encapsulates OpenAI calls + deterministic task planner |
| `agent_events` table | Supabase | Durable log of every turn (intent, sentiment, tasks, escalation flag) |

This overlays cleanly with the "Plan-and-Execute" figure: `agentPipeline` is the Plan/Task-List brain, the webhook/back-end automations are the Single-Task executors, and Supabase acts as the shared state for replanning, analytics, and stakeholder visibility.
