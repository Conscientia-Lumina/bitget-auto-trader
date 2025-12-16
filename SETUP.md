# Pilot Trading Dashboard - Complete Setup Guide

This guide walks you through setting up the Pilot Trading Dashboard from scratch, including all dependencies, database configuration, API setup, and deployment.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Project Installation](#project-installation)
3. [Supabase Setup](#supabase-setup)
4. [Bitget API Setup](#bitget-api-setup)
5. [Environment Configuration](#environment-configuration)
6. [Database Schema Setup](#database-schema-setup)
7. [Running the Application](#running-the-application)
8. [TradingView Webhook Setup](#tradingview-webhook-setup)
9. [Production Deployment](#production-deployment)
10. [Testing the Setup](#testing-the-setup)
11. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before starting, ensure you have the following installed:

- **Node.js** (v18.17 or higher) - [Download](https://nodejs.org/)
- **npm** or **pnpm** (comes with Node.js)
- **Git** - [Download](https://git-scm.com/)
- **A code editor** (VS Code recommended)

You'll also need accounts on:

- **Supabase** (free tier works) - [supabase.com](https://supabase.com)
- **Bitget** (with API access) - [bitget.com](https://www.bitget.com)
- **TradingView** (Pro+ for webhooks) - [tradingview.com](https://www.tradingview.com)
- **Vercel** (for deployment, optional) - [vercel.com](https://vercel.com)

---

## Project Installation

### Step 1: Clone or Navigate to the Project

```bash
cd bitget-auto-trader
```

### Step 2: Install Dependencies

```bash
npm install
```

This will install all required packages including:
- Next.js 14 (React framework)
- Supabase client libraries
- Bitget API SDK
- UI components (Radix UI, Tailwind CSS)
- State management (Zustand, React Query)
- Charts (Recharts, Lightweight Charts)

### Step 3: Verify Installation

```bash
npm run lint
```

If there are no errors, the installation was successful.

---

## Supabase Setup

Supabase provides the PostgreSQL database and real-time subscriptions.

### Step 1: Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click **"New Project"**
3. Fill in the details:
   - **Name**: `pilot-trading` (or any name)
   - **Database Password**: Generate a strong password (save this!)
   - **Region**: Choose the closest to you
4. Click **"Create new project"**
5. Wait 2-3 minutes for the project to initialize

### Step 2: Get Your API Credentials

1. In your Supabase project, go to **Settings** (gear icon) → **API**
2. You'll need three values:

| Setting | Environment Variable | Where to Find |
|---------|---------------------|---------------|
| Project URL | `NEXT_PUBLIC_SUPABASE_URL` | Under "Project URL" |
| anon public | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Under "Project API keys" |
| service_role | `SUPABASE_SERVICE_ROLE_KEY` | Under "Project API keys" (click "Reveal") |

**Important**: The `service_role` key bypasses Row Level Security. Never expose it in client-side code.

### Step 3: Enable Realtime

1. Go to **Database** → **Replication**
2. Under "Realtime", ensure the following tables are enabled (after you create them):
   - `positions`
   - `trades`
   - `bot_state`

---

## Bitget API Setup

### Step 1: Create API Keys

1. Log into [Bitget](https://www.bitget.com)
2. Go to **Account** → **API Management** (or visit directly: `https://www.bitget.com/account/newapi`)
3. Click **"Create API"**
4. Configure the API key:

| Setting | Value |
|---------|-------|
| **Label** | `trading-dashboard` (or any name) |
| **Passphrase** | Create a strong passphrase (16+ characters) - **SAVE THIS!** |
| **Permissions** | Enable: `Trade`, `Futures` |
| **IP Whitelist** | Optional but recommended for production |

5. Complete 2FA verification
6. **Immediately save** all three values:
   - API Key
   - Secret Key
   - Passphrase (the one you created)

### Step 2: Fund Your Futures Account

1. Go to **Assets** → **Futures**
2. Transfer USDT from Spot to USDT-M Futures
3. Minimum recommended: $100 for testing

### Step 3: Set Margin Mode (Optional)

1. Go to **Futures** → **USDT-M**
2. Click on the settings gear
3. Set **Margin Mode** to **Cross** (recommended)
4. Set your preferred leverage (default: 10x)

---

## Environment Configuration

### Step 1: Create Environment File

```bash
cp .env.example .env.local
```

### Step 2: Fill in Your Credentials

Open `.env.local` in your editor and fill in all values:

```env
# ============================================
# SUPABASE CONFIGURATION
# ============================================
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6...

# ============================================
# BITGET API CONFIGURATION
# ============================================
BITGET_API_KEY=bg_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
BITGET_API_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
BITGET_API_PASSPHRASE=your-passphrase-here

# ============================================
# WEBHOOK SECURITY
# ============================================
# Generate with: openssl rand -base64 32
WEBHOOK_SECRET=your-super-secret-webhook-passphrase-here

# ============================================
# APPLICATION SETTINGS
# ============================================
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

### Step 3: Generate Webhook Secret

Run this command to generate a secure webhook secret:

```bash
# On Mac/Linux
openssl rand -base64 32

# On Windows (PowerShell)
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))

# Or use Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Copy the output and paste it as your `WEBHOOK_SECRET`.

---

## Database Schema Setup

### Step 1: Open Supabase SQL Editor

1. In your Supabase project, go to **SQL Editor**
2. Click **"New query"**

### Step 2: Run the Schema

1. Open the file `supabase/schema.sql` from this project
2. Copy the entire contents
3. Paste into the SQL Editor
4. Click **"Run"** (or press Ctrl/Cmd + Enter)

You should see: "Success. No rows returned"

### Step 3: Verify Tables Were Created

1. Go to **Table Editor** in Supabase
2. You should see these tables:
   - `trade_signals`
   - `orders`
   - `trades`
   - `positions`
   - `performance_snapshots`
   - `bot_state`
   - `audit_logs`
   - `settings`

### Step 4: Verify Bot State Initialization

1. Click on the `bot_state` table
2. You should see one row with `id = 1`
3. All boolean fields should be `false`

### Step 5: Enable Realtime (if not automatic)

1. Go to **Database** → **Replication**
2. Under "Source", find the publication `supabase_realtime`
3. Ensure `positions`, `trades`, and `bot_state` are included

---

## Running the Application

### Development Mode

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### What You Should See

1. **Dashboard** with stats cards (all zeros initially)
2. **Sidebar** with navigation links
3. **Bot status** showing "STOPPED" in the sidebar

### Verify API Connection

Open the browser console (F12) and check for errors. Common issues:
- "Supabase URL not configured" → Check `.env.local`
- "Bitget connection failed" → Verify API credentials

---

## TradingView Webhook Setup

### Step 1: Get Your Webhook URL

**For Development (with ngrok):**

```bash
# Install ngrok
npm install -g ngrok

# In a new terminal, expose your local server
ngrok http 3000
```

Copy the HTTPS URL (e.g., `https://abc123.ngrok.io`)

Your webhook URL: `https://abc123.ngrok.io/api/webhook`

**For Production:**

Your webhook URL: `https://your-domain.vercel.app/api/webhook`

### Step 2: Configure TradingView Alert

1. Open TradingView and go to your chart with your strategy
2. Click **"Alert"** (clock icon) → **"Create Alert"**
3. Configure:

| Setting | Value |
|---------|-------|
| **Condition** | Your strategy alert |
| **Expiration** | Open-ended (for production) |
| **Alert actions** | Check "Webhook URL" |
| **Webhook URL** | Your webhook URL from Step 1 |

4. In the **Message** field, paste:

```json
{
  "passphrase": "YOUR_WEBHOOK_SECRET_HERE",
  "ticker": "{{ticker}}",
  "action": "{{strategy.order.action}}",
  "price": "{{close}}",
  "quantity": "{{strategy.order.contracts}}",
  "strategy": "{{strategy.order.comment}}",
  "pilot": 1,
  "timeframe": "{{interval}}"
}
```

5. Replace `YOUR_WEBHOOK_SECRET_HERE` with your actual `WEBHOOK_SECRET`
6. Click **"Create"**

### Step 3: Test the Webhook

**Option 1: Use curl**

```bash
curl -X POST http://localhost:3000/api/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "passphrase": "your-webhook-secret",
    "ticker": "BTCUSDT",
    "action": "buy",
    "price": "50000",
    "pilot": 1
  }'
```

**Option 2: Use the test script**

Create a file `test-webhook.js`:

```javascript
const webhookUrl = 'http://localhost:3000/api/webhook';
const secret = 'your-webhook-secret';

fetch(webhookUrl, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    passphrase: secret,
    ticker: 'BTCUSDT',
    action: 'buy',
    price: '50000',
    pilot: 1,
  }),
})
  .then(res => res.json())
  .then(console.log)
  .catch(console.error);
```

Run it:
```bash
node test-webhook.js
```

Expected response:
```json
{
  "success": true,
  "signalId": "uuid-here",
  "message": "Signal received"
}
```

---

## Production Deployment

### Deploying to Vercel

#### Step 1: Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/yourusername/pilot-trading.git
git push -u origin main
```

#### Step 2: Import to Vercel

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click **"Add New..."** → **"Project"**
3. Import your GitHub repository
4. Configure the project:
   - **Framework Preset**: Next.js (auto-detected)
   - **Root Directory**: `./` (default)
   - **Build Command**: `npm run build` (default)

#### Step 3: Add Environment Variables

In Vercel project settings → **Environment Variables**, add:

| Name | Value | Environment |
|------|-------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your URL | All |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your key | All |
| `SUPABASE_SERVICE_ROLE_KEY` | Your key | Production |
| `BITGET_API_KEY` | Your key | Production |
| `BITGET_API_SECRET` | Your secret | Production |
| `BITGET_API_PASSPHRASE` | Your passphrase | Production |
| `WEBHOOK_SECRET` | Your secret | Production |
| `NEXT_PUBLIC_APP_URL` | `https://your-domain.vercel.app` | Production |

#### Step 4: Deploy

Click **"Deploy"** and wait for the build to complete.

#### Step 5: Update TradingView Webhook

Update your TradingView alert webhook URL to your Vercel domain:
```
https://your-project.vercel.app/api/webhook
```

---

## Testing the Setup

### 1. Test Database Connection

Visit your dashboard at `http://localhost:3000`. If you see the page load without errors, the database is connected.

### 2. Test Bitget Connection

```bash
# Create a test file: test-bitget.js
```

```javascript
// test-bitget.js
require('dotenv').config({ path: '.env.local' });

async function test() {
  const { RestClientV2 } = require('bitget-api');

  const client = new RestClientV2({
    apiKey: process.env.BITGET_API_KEY,
    apiSecret: process.env.BITGET_API_SECRET,
    apiPass: process.env.BITGET_API_PASSPHRASE,
  });

  try {
    const result = await client.getFuturesAccountAsset({
      productType: 'USDT-FUTURES',
      marginCoin: 'USDT',
    });
    console.log('Connection successful!');
    console.log('Account equity:', result.data?.accountEquity);
  } catch (error) {
    console.error('Connection failed:', error.message);
  }
}

test();
```

Run:
```bash
node test-bitget.js
```

### 3. Test Webhook

Use the curl command from the TradingView section above.

### 4. Test Bot Controls

1. Go to the dashboard
2. Click **"Start"** in the sidebar
3. Bot status should change to "RUNNING"
4. Click **"Stop"** to stop it

---

## Troubleshooting

### Common Issues

#### "Module not found" errors

```bash
# Delete node_modules and reinstall
rm -rf node_modules
rm package-lock.json
npm install
```

#### "Invalid API key" from Bitget

- Double-check API key, secret, and passphrase
- Ensure no extra spaces were copied
- Verify the API key has Futures + Trade permissions
- Check if IP whitelist is blocking requests

#### "Unauthorized" on webhook

- Verify `WEBHOOK_SECRET` in `.env.local` matches TradingView alert
- Check for extra spaces or characters
- Ensure the passphrase is exactly the same in both places

#### Database errors

- Verify Supabase URL and keys are correct
- Ensure the schema was fully executed
- Check the Supabase dashboard for any error logs

#### "Rate limit exceeded"

- Bitget has rate limits (10 requests/second)
- Wait a moment and try again
- The app has built-in rate limiting

#### Real-time updates not working

1. Go to Supabase → Database → Replication
2. Ensure `positions`, `trades`, `bot_state` are in the publication
3. Or run this SQL:
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE positions;
ALTER PUBLICATION supabase_realtime ADD TABLE trades;
ALTER PUBLICATION supabase_realtime ADD TABLE bot_state;
```

### Getting Help

1. Check the browser console for errors (F12 → Console)
2. Check Vercel function logs (if deployed)
3. Check Supabase logs (Database → Logs)
4. Review the API route files in `app/api/` for error handling

---

## Security Checklist

Before going to production, ensure:

- [ ] `.env.local` is in `.gitignore` (it is by default)
- [ ] API keys are only in environment variables, not in code
- [ ] Webhook secret is at least 32 characters
- [ ] Bitget API has IP whitelist enabled (optional but recommended)
- [ ] 2FA is enabled on all accounts (Bitget, Supabase, Vercel, TradingView)
- [ ] Service role key is only used server-side
- [ ] Production environment variables are set in Vercel, not committed

---

## Quick Reference

| Task | Command |
|------|---------|
| Install dependencies | `npm install` |
| Start development server | `npm run dev` |
| Build for production | `npm run build` |
| Start production server | `npm start` |
| Run linter | `npm run lint` |

| URL | Purpose |
|-----|---------|
| `http://localhost:3000` | Dashboard |
| `http://localhost:3000/api/webhook` | Webhook endpoint |
| `http://localhost:3000/api/bot/status` | Bot status API |

---

## Next Steps

Once everything is set up:

1. **Configure your strategy settings** in the Settings page
2. **Set up your TradingView alerts** for your trading strategy
3. **Start with small position sizes** to test the system
4. **Monitor the audit logs** in Supabase for any issues
5. **Set up daily performance snapshots** (can be automated with a cron job)

Happy trading!
