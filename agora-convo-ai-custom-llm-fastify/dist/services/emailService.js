"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.emailService = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const utils_1 = require("../libs/utils");
class EmailService {
    constructor() {
        this.transporter = null;
        this.isConfigured = false;
        this.supportEmail = utils_1.config.email.supportEmail;
        const { smtpHost, smtpPort, smtpUser, smtpPass } = utils_1.config.email;
        if (smtpUser && smtpPass) {
            const port = smtpPort ?? 587;
            const secure = port === 465;
            this.transporter = nodemailer_1.default.createTransport({
                host: smtpHost || 'smtp.gmail.com',
                port,
                secure,
                auth: {
                    user: smtpUser,
                    pass: smtpPass,
                },
                tls: {
                    rejectUnauthorized: false,
                },
            });
            this.isConfigured = true;
        }
    }
    async sendEscalationEmail(payload) {
        if (!this.isConfigured || !this.transporter) {
            console.log('📧 Email not configured - set SMTP_USER and SMTP_PASS to enable escalation emails.');
            return { success: false, error: 'Email service not configured' };
        }
        const { customerId, customerName = 'Valued Customer', customerEmail, tier = 'standard', issue, conversationHistory, timestamp = new Date().toISOString(), agentId = utils_1.config.agentId, ticketId, } = payload;
        const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #f44336; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background-color: #f9f9f9; }
    .section { margin-bottom: 20px; }
    .label { font-weight: bold; color: #666; }
    .priority-high { color: #f44336; font-weight: bold; }
    .info-box { background-color: #fff; padding: 15px; border-left: 4px solid #2196F3; margin-bottom: 15px; }
    .issue-box { background-color: #fff; padding: 15px; border-left: 4px solid #f44336; }
    .conversation { background-color: #fff; padding: 15px; max-height: 300px; overflow-y: auto; border: 1px solid #ddd; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>🚨 Customer Issue Escalation</h2>
      <p class="priority-high">REQUIRES HUMAN ATTENTION</p>
    </div>
    <div class="content">
      <div class="info-box">
        <h3>Customer Information</h3>
        <p><span class="label">Customer ID:</span> ${customerId ?? 'Unknown'}</p>
        <p><span class="label">Name:</span> ${customerName}</p>
        <p><span class="label">Email:</span> ${customerEmail ?? 'Not provided'}</p>
        <p><span class="label">Tier:</span> <strong>${tier}</strong></p>
        <p><span class="label">Escalated At:</span> ${new Date(timestamp).toLocaleString()}</p>
        ${ticketId ? `<p><span class="label">Ticket ID:</span> ${ticketId}</p>` : ''}
      </div>
      <div class="issue-box">
        <h3>Issue Summary</h3>
        <p>${issue}</p>
      </div>
      <div class="section">
        <h3>Conversation History</h3>
        <div class="conversation">
          <pre style="white-space: pre-wrap;">${conversationHistory || 'No conversation history available.'}</pre>
        </div>
      </div>
      <div class="section">
        <p><span class="label">Agent ID:</span> ${agentId}</p>
      </div>
      <div class="section" style="background-color:#fff3cd; padding:15px; border-left:4px solid #ffc107;">
        <h4>Next Steps</h4>
        <ol>
          <li>Review the customer issue and history immediately.</li>
          <li>Contact the customer within 2 hours.</li>
          <li>Document resolution in CRM.</li>
          <li>Update customer tier if severity warrants.</li>
        </ol>
      </div>
    </div>
    <div class="footer">
      <p>This is an automated escalation from SmartSupport AI Agent.</p>
      <p>© ${new Date().getFullYear()} OptiVisX - Smart Sense</p>
    </div>
  </div>
</body>
</html>`;
        const mailOptions = {
            from: `"SmartSupport AI" <${utils_1.config.email.smtpUser || 'no-reply@smartsupport.ai'}>`,
            to: this.supportEmail,
            subject: `🚨 Escalation: ${customerName} (${tier})`,
            html,
            priority: 'high',
        };
        try {
            console.log(`📧 Sending escalation email to ${this.supportEmail}`);
            const sendPromise = this.transporter.sendMail(mailOptions);
            const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Email send timeout after 3 seconds')), 3000));
            const info = await Promise.race([sendPromise, timeoutPromise]);
            console.log(`✅ Escalation email sent. Message ID: ${info.messageId}`);
            return { success: true, info };
        }
        catch (error) {
            console.error('❌ Escalation email failed:', error.message);
            return { success: false, error: error.message };
        }
    }
}
const emailService = new EmailService();
exports.emailService = emailService;
