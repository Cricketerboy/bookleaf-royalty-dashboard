// Builds n8n/bookleaf-royalty-summary.workflow.json from the Code node sources
// in n8n/src, so the JavaScript lives in real files (diffable, testable) and
// the export is regenerated instead of hand-edited.
//
// Usage: node tools/build_workflow.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = (f) => readFileSync(join(root, 'n8n/src', f), 'utf8');

// Credentials are referenced by name only. n8n never exports secrets, and these
// placeholder ids make n8n ask you to pick/create the credential after import.
const CRED = {
  webhook: { httpHeaderAuth: { id: 'REPLACE_ME_webhook', name: 'BookLeaf Webhook Key (X-BookLeaf-Key)' } },
  gemini: { httpHeaderAuth: { id: 'REPLACE_ME_gemini', name: 'Gemini API Key (x-goog-api-key)' } },
  groq: { httpHeaderAuth: { id: 'REPLACE_ME_groq', name: 'Groq API Key (Authorization: Bearer)' } },
  smtp: { smtp: { id: 'REPLACE_ME_smtp', name: 'SMTP (Gmail app password)' } },
};

const FACTS = "$('Validate & Compute Facts').first().json";

const ifNode = (id, name, position, leftValue, operator) => ({
  id, name, position,
  type: 'n8n-nodes-base.if',
  typeVersion: 2.2,
  parameters: {
    conditions: {
      options: { caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 2 },
      conditions: [{ id: `${id}-c1`, leftValue, rightValue: operator.rightValue ?? '', operator: operator.op }],
      combinator: 'and',
    },
    options: {},
  },
});

const gemini = (id, name, position, modelKey, timeout) => ({
  id, name, position,
  type: 'n8n-nodes-base.httpRequest',
  typeVersion: 4.2,
  parameters: {
    method: 'POST',
    url: `=https://generativelanguage.googleapis.com/v1beta/models/{{ ${FACTS}.ai.${modelKey} }}:generateContent`,
    authentication: 'genericCredentialType',
    genericAuthType: 'httpHeaderAuth',
    sendBody: true,
    specifyBody: 'json',
    jsonBody: `={{ JSON.stringify(${FACTS}.ai.request) }}`,
    options: { timeout },
  },
  credentials: CRED.gemini,
  onError: 'continueErrorOutput',
});

const groq = (id, name, position) => ({
  id, name, position,
  type: 'n8n-nodes-base.httpRequest',
  typeVersion: 4.2,
  parameters: {
    method: 'POST',
    url: 'https://api.groq.com/openai/v1/chat/completions',
    authentication: 'genericCredentialType',
    genericAuthType: 'httpHeaderAuth',
    sendBody: true,
    specifyBody: 'json',
    jsonBody: `={{ JSON.stringify(${FACTS}.ai.groq_request) }}`,
    options: { timeout: 10000 },
  },
  credentials: CRED.groq,
  // Free tier is 8,000 tokens/minute (~4 emails); a 429 clears within seconds, so wait and retry
  retryOnFail: true,
  maxTries: 3,
  waitBetweenTries: 5000,
  onError: 'continueErrorOutput',
});

const code = (id, name, position, file) => ({
  id, name, position,
  type: 'n8n-nodes-base.code',
  typeVersion: 2,
  parameters: { jsCode: src(file) },
});

const sticky = (id, position, width, height, content, color = 7) => ({
  id, name: `Note ${id}`, position,
  type: 'n8n-nodes-base.stickyNote',
  typeVersion: 1,
  parameters: { content, width, height, color },
});

const nodes = [
  {
    id: 'webhook', name: 'Bubble Webhook', position: [0, 300],
    type: 'n8n-nodes-base.webhook', typeVersion: 2,
    webhookId: '6f1c2b7e-5a43-4e0b-9d1e-b00c1eaf0001',
    parameters: { httpMethod: 'POST', path: 'bookleaf-royalty-summary', authentication: 'headerAuth', responseMode: 'responseNode', options: {} },
    credentials: CRED.webhook,
  },
  code('validate', 'Validate & Compute Facts', [240, 300], 'validate.js'),
  ifNode('route', 'Should Generate?', [480, 300], '={{ $json.route }}', { op: { type: 'string', operation: 'equals' }, rightValue: 'generate' }),
  groq('groq', 'Groq (primary)', [720, 200]),
  gemini('gemini1', 'Gemini (fallback 1)', [960, 360], 'primary_model', 20000),
  gemini('gemini2', 'Gemini lite (fallback 2)', [1200, 480], 'fallback_model', 20000),
  code('parse', 'Parse & Check Email', [1440, 120], 'parse.js'),
  ifNode('emailOk', 'Email Passed Checks?', [1680, 120], '={{ $json.ok }}', { op: { type: 'boolean', operation: 'true', singleValue: true } }),
  {
    id: 'smtp', name: 'Send Email (optional)', position: [1920, 40],
    type: 'n8n-nodes-base.emailSend', typeVersion: 2.1,
    disabled: true,
    onError: 'continueRegularOutput',
    parameters: {
      fromEmail: 'YOUR_GMAIL_ADDRESS@gmail.com',
      toEmail: 'YOUR_TEST_INBOX@example.com',
      subject: '={{ $json.subject }}',
      emailFormat: 'text',
      text: '={{ $json.body }}',
      options: { appendAttribution: false },
    },
    credentials: CRED.smtp,
  },
  code('success', 'Build Success Response', [2160, 40], 'success.js'),
  code('failure', 'Build Failure Response', [2160, 480], 'failure.js'),
  {
    id: 'respond', name: 'Respond to Bubble', position: [2440, 300],
    type: 'n8n-nodes-base.respondToWebhook', typeVersion: 1.1,
    parameters: {
      respondWith: 'json',
      responseBody: '={{ JSON.stringify($json.response) }}',
      options: { responseCode: '={{ $json.http_status }}' },
    },
  },
  sticky('n1', [-60, -40], 520, 260,
    '## BookLeaf Royalty Summary\nBubble → **POST** this webhook with header `X-BookLeaf-Key` and the author + books payload.\n\nThe reply *is* the status callback: Bubble writes `status`, `subject`, `body`, `error_*` and `completed_at` into its Notification Log from this response.\n\nInvalid payload → 400 · duplicate → 200 `Skipped` · AI failure → 200 `Failed`.'),
  sticky('n2', [660, -60], 720, 220,
    '### AI with failover\nGroq gpt-oss-120b (~1 s typical; 10 s timeout, 2 retries 5 s apart for its 8k tokens/min limit) → Gemini 3.8 flash (20 s) → Gemini 3.5 flash-lite (20 s). Any error (503 overloaded, 429 quota, timeout) moves to the next provider; each has its own free-tier quota. All failing → `Failed` with the last reason. No Groq key configured? That step errors instantly and Gemini takes over.', 5),
  sticky('n3', [1860, -220], 420, 220,
    '### Email delivery (bonus)\nDisabled by default. Enable it, set an SMTP credential (Gmail app password) and point **To** at your own test inbox. Sample author addresses are not real inboxes.', 3),
];

const main = (...targets) => targets.map((t) => (t ? (Array.isArray(t) ? t : [t]).map((node) => ({ node, type: 'main', index: 0 })) : []));
const connections = {
  'Bubble Webhook': { main: main('Validate & Compute Facts') },
  'Validate & Compute Facts': { main: main('Should Generate?') },
  'Should Generate?': { main: main('Groq (primary)', 'Respond to Bubble') },
  'Groq (primary)': { main: main('Parse & Check Email', 'Gemini (fallback 1)') },
  'Gemini (fallback 1)': { main: main('Parse & Check Email', 'Gemini lite (fallback 2)') },
  'Gemini lite (fallback 2)': { main: main('Parse & Check Email', 'Build Failure Response') },
  'Parse & Check Email': { main: main('Email Passed Checks?') },
  'Email Passed Checks?': { main: main('Send Email (optional)', 'Build Failure Response') },
  'Send Email (optional)': { main: main('Build Success Response') },
  'Build Success Response': { main: main('Respond to Bubble') },
  'Build Failure Response': { main: main('Respond to Bubble') },
};

const workflow = {
  name: 'BookLeaf – Royalty Summary (Bubble webhook → Gemini → Bubble)',
  nodes,
  connections,
  active: false,
  settings: { executionOrder: 'v1', saveDataErrorExecution: 'all', saveDataSuccessExecution: 'all', saveManualExecutions: true, executionTimeout: 90 },
  pinData: {},
  meta: { templateCredsSetupCompleted: false },
  tags: [],
};

const out = join(root, 'n8n/bookleaf-royalty-summary.workflow.json');
writeFileSync(out, JSON.stringify(workflow, null, 2) + '\n');
console.log(`wrote ${out} (${nodes.length} nodes)`);
