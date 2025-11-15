const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.supportEmail = 'info@optivisx.com';
    this.isConfigured = false;
    
    // Only configure transporter if credentials are provided
    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      const smtpPort = parseInt(process.env.SMTP_PORT) || 587;
      const useSecure = smtpPort === 465; // Port 465 uses SSL/TLS
      
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: smtpPort,
        secure: useSecure, // true for 465, false for other ports
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        },
        // Additional options for better compatibility
        tls: {
          rejectUnauthorized: false // Allow self-signed certificates if needed
        }
      });
      this.isConfigured = true;
    } else {
      // Email not configured - that's fine, it's optional
      this.transporter = null;
    }
  }

  /**
   * Send escalation email to support team
   */
  async sendEscalationEmail(escalationData) {
    // If email is not configured, return immediately without logging
    if (!this.isConfigured || !this.transporter) {
      console.log('📧 Email not configured - add SMTP_USER and SMTP_PASS to .env');
      return { success: false, error: 'Email service not configured' };
    }
    const {
      customerId,
      customerName,
      customerEmail,
      tier,
      issue,
      conversationHistory,
      timestamp,
      agentId
    } = escalationData;

    const emailContent = `
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
    .customer-info { background-color: #fff; padding: 15px; border-left: 4px solid #2196F3; margin-bottom: 15px; }
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
      <div class="customer-info">
        <h3>Customer Information</h3>
        <p><span class="label">Customer ID:</span> ${customerId}</p>
        <p><span class="label">Name:</span> ${customerName}</p>
        <p><span class="label">Email:</span> ${customerEmail || 'Not provided'}</p>
        <p><span class="label">Tier:</span> <strong>${tier}</strong></p>
        <p><span class="label">Escalated At:</span> ${new Date(timestamp).toLocaleString()}</p>
      </div>

      <div class="issue-box">
        <h3>Issue Summary</h3>
        <p>${issue}</p>
      </div>

      <div class="section">
        <h3>Conversation History</h3>
        <div class="conversation">
          <pre style="white-space: pre-wrap; font-family: Arial, sans-serif;">${conversationHistory || 'No conversation history available'}</pre>
        </div>
      </div>

      <div class="section">
        <p><span class="label">Agent ID:</span> ${agentId}</p>
      </div>

      <div class="section" style="background-color: #fff3cd; padding: 15px; border-left: 4px solid #ffc107;">
        <h4>⚠️ Next Steps</h4>
        <ol>
          <li>Review the customer issue and conversation history</li>
          <li>Contact the customer directly within 2 hours</li>
          <li>Document resolution in the CRM system</li>
          <li>Update customer tier if necessary based on issue severity</li>
        </ol>
      </div>
    </div>

    <div class="footer">
      <p>This is an automated escalation from SmartSupport AI Agent</p>
      <p>© ${new Date().getFullYear()} OptiVisX - Smart Sense</p>
    </div>
  </div>
</body>
</html>
    `;

    const mailOptions = {
      from: `"SmartSupport AI" <${process.env.SMTP_USER}>`,
      to: this.supportEmail,
      subject: `🚨 ESCALATION: ${customerName} (${tier} Tier) - ${issue.substring(0, 50)}...`,
      html: emailContent,
      priority: 'high'
    };

    try {
      console.log(`📧 Attempting to send escalation email to ${this.supportEmail}...`);
      
      // Add short timeout to prevent hanging
      const sendPromise = this.transporter.sendMail(mailOptions);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Email send timeout after 3 seconds')), 3000)
      );
      
      const info = await Promise.race([sendPromise, timeoutPromise]);
      console.log(`✅ Escalation email sent successfully! Message ID: ${info.messageId}`);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error(`❌ Email send failed: ${error.message}`);
      if (error.message.includes('timeout')) {
        console.error('   → Check your SMTP settings (SMTP_HOST, SMTP_PORT)');
        console.error('   → Verify your network connection');
      } else if (error.message.includes('Authentication')) {
        console.error('   → Check SMTP_USER and SMTP_PASS in .env');
        console.error('   → For Gmail, use App Password (not regular password)');
      } else if (error.message.includes('ECONNREFUSED') || error.message.includes('ENOTFOUND')) {
        console.error('   → Cannot connect to SMTP server');
        console.error('   → Check SMTP_HOST is correct');
      }
      return { success: false, error: error.message };
    }
  }

  /**
   * Test email configuration
   */
  async testConnection() {
    if (!this.isConfigured || !this.transporter) {
      return false;
    }
    
    try {
      // Add short timeout to verification
      const verifyPromise = this.transporter.verify();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Connection timeout')), 3000)
      );
      
      await Promise.race([verifyPromise, timeoutPromise]);
      return true;
    } catch (error) {
      // Silently fail - email is optional
      return false;
    }
  }
}

module.exports = EmailService;

