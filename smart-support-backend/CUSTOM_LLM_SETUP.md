# Custom LLM Bridge with RAG

Agora's Conversational AI engine can call any service that matches the OpenAI Chat Completions API. The `/custom-llm/chat/completions` endpoint in `server.js` acts as that bridge and layers SmartSense data + RAG context on every turn.

## How it works

1. **Authentication** – Set `CUSTOM_LLM_API_KEY` (or `AGORA_CUSTOM_LLM_API_KEY`) in `.env`. Agora should send the same value via the `Authorization: Bearer <key>` header when hitting the bridge.
2. **Profile + Order snapshot** – The handler resolves the `customerId` from `request.metadata.customerId` (fallback `guest`), fetches the latest profile/orders from Supabase, and builds the personalization block.
3. **RAG injection** – The latest user utterance (plus the conversation transcript) is sent to `buildSystemMessages`, which already calls `ragService.retrieveContext` to pull the top knowledge-base chunks.
4. **OpenAI proxy** – After prepending SmartSense system prompts, the endpoint calls OpenAI (`CUSTOM_LLM_MODEL`, default `gpt-4o-mini`) and returns the response in pure OpenAI JSON so Agora believes it’s talking to a custom LLM.
5. **Non-streaming** – The bridge currently responds with a single JSON payload (SSE streaming can be added later if needed).

## Agora config snippet

Update the `llm` block when you POST to `/api/session` (or wherever you start the agent):

```jsonc
{
  "llm": {
    "url": "https://<your-backend-domain>/custom-llm/chat/completions",
    "api_key": "${CUSTOM_LLM_API_KEY}",
    "input_modalities": ["text"],
    "output_modalities": ["text"],
    "system_messages": [
      { "role": "system", "content": "You are SmartSense, a helpful support agent." }
    ]
  }
}
```

Agora will now POST every transcript turn to our endpoint instead of OpenAI directly. Because we control the bridge, we can attach RAG, run safety checks, log every turn, and even swap the underlying model without changing the Agora integration.

## Local testing

```bash
curl -X POST http://localhost:4000/custom-llm/chat/completions \
  -H "Authorization: Bearer $CUSTOM_LLM_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
        "metadata": {"customerId": "aman"},
        "messages": [
          {"role":"user","content":"Where is order A123?"}
        ]
      }'
```

Expected output: standard OpenAI chat completion JSON with the SmartSense policy + RAG context baked in.
