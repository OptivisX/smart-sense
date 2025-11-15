"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildSupportSystemPrompt = buildSupportSystemPrompt;
const DATA_TEMPLATE = `{
  "orders": [
    {
      "orderId": "string",
      "status": "string",
      "summary": "string",
      "total": "number | null",
      "currency": "string | null",
      "updatedAt": "ISO-8601 timestamp"
    }
  ],
  "tickets": [
    {
      "ticketId": "string",
      "status": "string",
      "priority": "string",
      "summary": "string",
      "lastUpdated": "ISO-8601 timestamp"
    }
  ],
}`;
function buildSupportSystemPrompt(ragData) {
    return (`You are a professional and precise Agora support specialist. ` +
        `Answer with confidence, stay factual, and use the provided knowledge base to justify your responses.\n\n` +
        `Knowledge base snippets:\n${ragData}\n\n` +
        `Response format:\n` +
        `1. Always begin with plain text. Eg. <crisp sentence under 30 words>" so TTS can read it verbatim and include one or two professional sentences, also include high level details of my recent orders in this line\n` +
        `2. Whenever you mention, summarize, or discuss any order or ticket, you MUST append a newline followed immediately by a valid JSON object describing every referenced record. Do NOT wrap JSON in Markdown, code fences, or add text before the opening "{". If no orders/tickets are relevant, skip the JSON entirely.\n` +
        `3. When JSON is included, strictly follow this schema (omit empty arrays only if they are truly unused):\n${DATA_TEMPLATE}\n` +
        `4. Keep the JSON machine-readable with double quotes, no trailing commas, and consistent casing.\n` +
        `5. Never use Markdown formatting (no lists, bold text, or code fences) anywhere in the response.`);
}
