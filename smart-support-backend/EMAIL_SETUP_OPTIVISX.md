# Email Setup for optivisx.com Domain

## Common Email Providers for Custom Domains

### Option 1: Google Workspace (Gmail for Business)
If you use Google Workspace for optivisx.com:

```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=info@optivisx.com
SMTP_PASS=your_app_password
```

**Setup:**
1. Go to Google Admin Console
2. Enable 2-Factor Authentication for your account
3. Generate App Password: https://myaccount.google.com/apppasswords
4. Use the 16-character password as SMTP_PASS

---

### Option 2: Microsoft 365 / Office 365
If you use Microsoft 365 for optivisx.com:

```bash
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_USER=info@optivisx.com
SMTP_PASS=your_password
```

**Note:** May require app-specific password if MFA is enabled

---

### Option 3: Zoho Mail
If you use Zoho Mail for optivisx.com:

```bash
SMTP_HOST=smtp.zoho.com
SMTP_PORT=587
SMTP_USER=info@optivisx.com
SMTP_PASS=your_password
```

---

### Option 4: SendGrid (Transactional Email)
If you use SendGrid:

```bash
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your_sendgrid_api_key
```

**Setup:**
1. Create SendGrid account
2. Generate API key
3. Use "apikey" as SMTP_USER
4. Use API key as SMTP_PASS

---

### Option 5: Mailgun
If you use Mailgun:

```bash
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_USER=postmaster@mg.optivisx.com
SMTP_PASS=your_mailgun_password
```

---

### Option 6: AWS SES (Amazon Simple Email Service)
If you use AWS SES:

```bash
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_USER=your_ses_smtp_username
SMTP_PASS=your_ses_smtp_password
```

**Setup:**
1. Go to AWS SES Console
2. Create SMTP credentials
3. Verify your domain optivisx.com
4. Use provided SMTP credentials

---

### Option 7: Generic SMTP (cPanel, Hosting Provider)
If your domain is hosted with a provider like:
- GoDaddy
- Namecheap
- Bluehost
- SiteGround
- etc.

Check your hosting control panel for SMTP settings. Usually:

```bash
SMTP_HOST=mail.optivisx.com
# OR
SMTP_HOST=smtp.optivisx.com
SMTP_PORT=587
SMTP_USER=info@optivisx.com
SMTP_PASS=your_email_password
```

**To find your SMTP settings:**
1. Log into your hosting control panel (cPanel, etc.)
2. Go to Email Accounts
3. Find SMTP settings or "Mail Server Settings"
4. Use the provided SMTP server and port

---

## Quick Setup Steps

1. **Identify your email provider** (check where you manage info@optivisx.com)

2. **Add to your `.env` file:**
```bash
SMTP_HOST=your_smtp_server
SMTP_PORT=587
SMTP_USER=info@optivisx.com
SMTP_PASS=your_password_or_app_password
```

3. **Test the configuration:**
```bash
npm start
# Should see: ✅ Email service is ready
```

4. **Test sending an escalation:**
```bash
curl -X POST http://localhost:4000/api/escalate \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "aman",
    "issue": "Test escalation",
    "conversationHistory": "Test",
    "agentId": "test"
  }'
```

---

## Troubleshooting

**"Authentication failed"**
- Check username/password are correct
- If using Gmail/Google Workspace, use App Password (not regular password)
- Ensure 2FA is enabled if required

**"Connection timeout"**
- Check SMTP_HOST is correct
- Try port 465 with secure: true
- Check firewall/network allows SMTP

**"Relay access denied"**
- Verify your IP is allowed (for some providers)
- Check if you need to whitelist IP addresses

---

## Security Note

Never commit your `.env` file with real credentials to git!

