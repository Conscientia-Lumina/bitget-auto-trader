# 🔐 ENV EXAMPLE - Environment Variables

## Overview

This file documents all required environment variables. Copy this to `.env.local` and fill in your values.

---

## Quick Setup

```bash
# Copy the example file
cp .env.example .env.local

# Edit with your values
nano .env.local
```

---

## Complete `.env.example`

```env
# ============================================
# SUPABASE CONFIGURATION
# ============================================
# Get these from: https://supabase.com/dashboard/project/YOUR_PROJECT/settings/api

# Public URL - safe to expose in browser
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co

# Anon Key - safe to expose in browser (RLS protects data)
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Service Role Key - NEVER expose this! Server-side only
# Used for admin operations that bypass RLS
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...


# ============================================
# BITGET API CONFIGURATION
# ============================================
# Get these from: https://www.bitget.com/account/newapi
# 
# IMPORTANT SETTINGS WHEN CREATING API KEY:
# - Enable "Futures" permission
# - Enable "Trade" permission
# - Optionally whitelist your server IP for security
# - Use USDT-M Futures (not Coin-M)

BITGET_API_KEY=bg_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
BITGET_API_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
BITGET_API_PASSPHRASE=your-api-passphrase-here


# ============================================
# WEBHOOK SECURITY
# ============================================
# Create a strong random passphrase for TradingView webhook validation
# Generate one: openssl rand -base64 32

WEBHOOK_SECRET=your-super-secret-passphrase-minimum-32-characters


# ============================================
# APPLICATION SETTINGS
# ============================================

# Your app's public URL (used for webhooks, callbacks)
# Development: http://localhost:3000
# Production: https://your-domain.vercel.app
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Node environment
NODE_ENV=development


# ============================================
# OPTIONAL: DEVELOPMENT HELPERS
# ============================================

# Enable verbose logging (development only)
DEBUG=true

# Disable trading (dry run mode) - orders logged but not sent
# DRY_RUN=true

# Use Bitget testnet instead of mainnet
# BITGET_TESTNET=true
```

---

## Variable Reference

### Supabase Variables

| Variable | Required | Exposed | Description |
|----------|----------|---------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Client | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Client | Public anonymous key (RLS enforced) |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Server Only | Admin key that bypasses RLS |

### Bitget Variables

| Variable | Required | Exposed | Description |
|----------|----------|---------|-------------|
| `BITGET_API_KEY` | ✅ | Server Only | Your Bitget API key |
| `BITGET_API_SECRET` | ✅ | Server Only | Your Bitget API secret |
| `BITGET_API_PASSPHRASE` | ✅ | Server Only | Passphrase set when creating API key |

### Security Variables

| Variable | Required | Exposed | Description |
|----------|----------|---------|-------------|
| `WEBHOOK_SECRET` | ✅ | Server Only | Passphrase for TradingView webhooks |

### App Variables

| Variable | Required | Exposed | Description |
|----------|----------|---------|-------------|
| `NEXT_PUBLIC_APP_URL` | ✅ | Client | Your app's public URL |
| `NODE_ENV` | ❌ | Server | `development` or `production` |

---

## Getting Your Credentials

### 1. Supabase Setup

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Wait for the project to initialize (~2 minutes)
3. Go to **Settings** → **API**
4. Copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY`

### 2. Bitget API Setup

1. Log into [Bitget](https://www.bitget.com)
2. Go to **Account** → **API Management**
3. Click **Create API**
4. Configure:
   - **Label**: `trading-dashboard` (or any name)
   - **Passphrase**: Create a strong passphrase (you'll need this!)
   - **Permissions**: Enable `Trade` and `Futures`
   - **IP Whitelist**: Optional but recommended for production
5. Complete 2FA verification
6. Copy:
   - **API Key** → `BITGET_API_KEY`
   - **Secret Key** → `BITGET_API_SECRET`
   - **Passphrase** (the one you created) → `BITGET_API_PASSPHRASE`

### 3. Webhook Secret

Generate a secure random string:

```bash
# Option 1: OpenSSL
openssl rand -base64 32

# Option 2: Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Option 3: Online generator
# https://generate-secret.vercel.app/32
```

---

## Environment by Stage

### Development (`.env.local`)

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx
BITGET_API_KEY=xxx
BITGET_API_SECRET=xxx
BITGET_API_PASSPHRASE=xxx
WEBHOOK_SECRET=dev-secret-for-local-testing
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
DEBUG=true
```

### Production (Vercel Environment Variables)

Set these in Vercel Dashboard → Project → Settings → Environment Variables:

```
NEXT_PUBLIC_SUPABASE_URL      → All environments
NEXT_PUBLIC_SUPABASE_ANON_KEY → All environments
SUPABASE_SERVICE_ROLE_KEY     → Production only
BITGET_API_KEY                → Production only
BITGET_API_SECRET             → Production only
BITGET_API_PASSPHRASE         → Production only
WEBHOOK_SECRET                → Production only
NEXT_PUBLIC_APP_URL           → Production (set to your domain)
```

---

## Security Checklist

Before going to production:

- [ ] **Never commit `.env.local`** - It's in `.gitignore`
- [ ] **Use different API keys** for development vs production
- [ ] **Enable IP whitelist** on Bitget API for production server
- [ ] **Rotate webhook secret** periodically
- [ ] **Use Vercel's encrypted env vars** - Never put secrets in code
- [ ] **Enable 2FA** on all accounts (Bitget, Supabase, Vercel)
- [ ] **Limit API permissions** - Only enable what you need
- [ ] **Monitor API usage** - Set up alerts for unusual activity

---

## Vercel Deployment

When deploying to Vercel:

1. Push your code to GitHub
2. Import project in Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

```bash
# Or use Vercel CLI
vercel env add SUPABASE_SERVICE_ROLE_KEY production
vercel env add BITGET_API_KEY production
vercel env add BITGET_API_SECRET production
vercel env add BITGET_API_PASSPHRASE production
vercel env add WEBHOOK_SECRET production
```

---

## Troubleshooting

### "Invalid API Key" from Bitget

- Double-check the API key is copied correctly (no extra spaces)
- Ensure the API key has Futures + Trade permissions
- Check if IP whitelist is blocking your requests
- Verify the passphrase matches exactly

### "Invalid JWT" from Supabase

- Ensure you're using the correct project URL
- Check that anon key matches the project
- Service role key should only be used server-side

### Webhook Not Receiving

- Verify `WEBHOOK_SECRET` matches TradingView alert passphrase
- Check Vercel function logs for errors
- Ensure URL is publicly accessible (not localhost)
- TradingView requires Pro subscription for webhooks

### Environment Variables Not Loading

```bash
# Check if .env.local exists
ls -la .env.local

# Restart dev server after changes
npm run dev

# Verify variables are loaded
console.log(process.env.NEXT_PUBLIC_SUPABASE_URL)
```
