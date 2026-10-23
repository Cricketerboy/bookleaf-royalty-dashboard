# n8n setup (15 min)

## 1. Account
https://n8n.io → **Get started for free** → n8n Cloud 14-day free trial (no payment needed).
Pick any workspace name, e.g. `bookleaf-mohit` → your host becomes `https://bookleaf-mohit.app.n8n.cloud`.

> Fully free alternative: self-host with `npx n8n` (needs Node 24+) plus a free tunnel (`cloudflared tunnel --url http://localhost:5678`). The Cloud trial is simpler, and reviewers can be given view access to it.

## 2. Import the workflow
**Workflows → ⋯ / Create → Import from file** → choose `n8n/bookleaf-royalty-summary.workflow.json`.

## 3. Create the credentials (no keys live in the export)
Open each node with a ⚠️ credential warning:

| Node | Credential type | Name field | Value field |
|---|---|---|---|
| **Bubble Webhook** | Header Auth | `X-BookLeaf-Key` | a long random secret — generate with `openssl rand -hex 24` |
| **Groq (primary)** | Header Auth | `Authorization` | `Bearer ` + your Groq key from https://console.groq.com/keys (free, no card) |
| **Gemini (fallback 1)** and **Gemini lite (fallback 2)** | Header Auth | `x-goog-api-key` | your Gemini API key from https://aistudio.google.com/apikey |

Select the same Gemini credential in both Gemini nodes. Groq answers in about a second; Gemini's free tier is the backup (it can be slow or out of quota at busy hours). If Groq has no key, that step fails instantly and Gemini takes over.

The same webhook secret goes into Bubble → API Connector → shared header `X-BookLeaf-Key` (marked Private).

## 4. Optional: real email (bonus)
`Send Email (optional)` is **disabled** by default. To use it:
1. Gmail → Google Account → Security → 2-Step Verification on → **App passwords** → create one.
2. In the node: credential **SMTP** → host `smtp.gmail.com`, port `465`, SSL on, user = your Gmail, password = the app password.
3. Set **From** = your Gmail and **To** = your own test inbox. The sample author addresses (`@email.com`) are not real inboxes, so never point it at them.
4. Right-click the node → **Activate** (un-disable).

## 5. Go live
Top right: **Save**, then toggle **Active** / **Publish**.
Open **Bubble Webhook** → copy the **Production URL**:
`https://YOUR-HOST/webhook/bookleaf-royalty-summary`

(The *Test URL* only works while you click "Listen for test event". Bubble must use the Production URL.)

Idempotency uses workflow static data, which n8n only saves for **production** runs, so test the duplicate check against the Production URL.

## 6. Test without Bubble
```bash
export N8N_WEBHOOK_URL="https://YOUR-HOST/webhook/bookleaf-royalty-summary"
export N8N_WEBHOOK_KEY="your webhook secret"
./test-webhook.sh AUTH009 AUTH008
```
Expect: no key → 403, empty body → 400, Ananya → Success with ₹2,546, a repeat → Skipped, then two printed emails.

## 7. Share with BookLeaf
- Export: Workflow → ⋯ → **Download**. n8n strips credential secrets from exports; check the file for `AIza` (Gemini key prefix) before sending anyway.
- n8n Cloud: **Settings → Users → Invite** the BookLeaf email, or share the workflow with them as a viewer.
