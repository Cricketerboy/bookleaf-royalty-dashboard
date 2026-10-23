// n8n Code node: "Build Success Response"
// Records the send for idempotency and shapes the reply Bubble writes into the
// Notification Log. Runs after the (optional) email node, which passes the
// item through when disabled and adds messageId when it actually sent.

const facts = $('Validate & Compute Facts').first().json;
const email = $('Parse & Check Email').first().json;
const delivery = $input.first().json;

const store = $getWorkflowStaticData('global');
store.sent = store.sent ?? {};
store.sent[facts.author.code] = { at: Date.now(), request_id: facts.request_id };

const delivered = Boolean(delivery.messageId || delivery.accepted?.length);
const warnings = [...email.warnings];
if (delivery.error) warnings.push(`email not delivered: ${String(delivery.error.message ?? delivery.error).slice(0, 150)}`);

return [{
  json: {
    http_status: 200,
    response: {
      status: 'Success',
      request_id: facts.request_id,
      author_code: facts.author.code,
      subject: email.subject,
      body: email.body,
      model: email.model,
      email_delivered: delivered,
      error_code: '',
      error_message: '',
      warnings: warnings.join('; '),
      completed_at: new Date().toISOString(),
    },
  },
}];
