"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
// Load environment variables from .env file
dotenv_1.default.config();
function validateEnv() {
    const requiredEnvVars = [
        'OPENAI_API_KEY',
        'OPENAI_MODEL',
        'PINECONE_API_KEY',
        'PINECONE_INDEX',
        'SUPABASE_URL',
        'SUPABASE_SERVICE_ROLE_KEY',
    ];
    const missingEnvVars = requiredEnvVars.filter((envVar) => !process.env[envVar]);
    if (missingEnvVars.length > 0) {
        throw new Error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
    }
    const config = {
        port: parseInt(process.env.PORT || '3000', 10),
        agora: {
            appId: process.env.AGORA_APP_ID,
            appCertificate: process.env.AGORA_APP_CERTIFICATE,
            authToken: `Basic ${Buffer.from(`${process.env.AGORA_CUSTOMER_ID}:${process.env.AGORA_CUSTOMER_SECRET}`).toString('base64')}`,
        },
        llm: {
            openaiApiKey: process.env.OPENAI_API_KEY,
            model: process.env.OPENAI_MODEL,
            embeddingModel: process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small',
            useResponsesApi: process.env.USE_RESPONSES_API === 'true',
        },
        rag: {
            pineconeApiKey: process.env.PINECONE_API_KEY,
            pineconeIndex: process.env.PINECONE_INDEX,
            pineconeNamespace: process.env.PINECONE_NAMESPACE,
            pineconeControllerHost: process.env.PINECONE_CONTROLLER_HOST,
            topK: parseInt(process.env.PINECONE_TOP_K || '4', 10),
        },
        supabase: {
            url: process.env.SUPABASE_URL,
            serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
        },
        support: {
            ticketsTable: process.env.SUPPORT_TICKETS_TABLE || 'support_tickets',
            interactionsTable: process.env.SUPPORT_INTERACTIONS_TABLE || 'support_interactions',
        },
        email: {
            supportEmail: process.env.SUPPORT_EMAIL || 'info@optivisx.com',
            smtpHost: process.env.SMTP_HOST,
            smtpPort: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : undefined,
            smtpUser: process.env.SMTP_USER,
            smtpPass: process.env.SMTP_PASS,
        },
        agentId: process.env.AGENT_ID,
    };
    return config;
}
exports.config = validateEnv();
