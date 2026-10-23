// n8n Code node: "Build Failure Response"
// Reached when every model failed (HTTP error item) or the email failed
// its checks ({ok:false}). Either way Bubble gets status "Failed" with a reason
// it can show in the Notification Log, never a silent drop.

const facts = $('Validate & Compute Facts').first().json;
const item = $input.first().json;

let code = item.error_code;
let message = item.error_message;
if (!code) {
  // HTTP Request node error output: { error: { message, description, httpCode } } or similar
  const err = item.error ?? item;
  const raw = String(err.message ?? err.description ?? err ?? 'unknown error');
  // n8n formats HTTP errors as `404 - "{ \"error\": { \"message\": ... } }"`
  const m = raw.match(/^(\d{3}) - (.*)$/s);
  const status = Number(err.httpCode ?? err.status ?? m?.[1]) || 0;
  let detail = m ? m[2] : raw;
  try {
    let parsed = JSON.parse(detail);
    if (typeof parsed === 'string') parsed = JSON.parse(parsed);
    detail = parsed.error?.message ?? detail;
  } catch { /* not JSON, keep the text */ }
  detail = `${status ? `HTTP ${status}: ` : ''}${detail}`.replace(/\s+/g, ' ').slice(0, 200);
  code = status === 429 ? 'AI_RATE_LIMITED'
    : status === 401 || status === 403 ? 'AI_AUTH'
    : /timeout|timed out|ETIMEDOUT|ECONNABORTED/i.test(detail) ? 'AI_TIMEOUT'
    : 'AI_UNAVAILABLE';
  message = `All AI models failed; last error: ${detail}`;
}

return [{
  json: {
    http_status: 200,
    response: {
      status: 'Failed',
      request_id: facts.request_id,
      author_code: facts.author.code,
      subject: '',
      body: '',
      model: '',
      email_delivered: false,
      error_code: code,
      error_message: message,
      warnings: '',
      completed_at: new Date().toISOString(),
    },
  },
}];
