// n8n Code node: "Parse & Check Email"
// Turns the Gemini response into {subject, body} and checks it before anything
// is logged or sent. A plausible-looking email with a wrong amount is worse
// than a Failed log entry the admin can retry, so this fails closed.

const facts = $('Validate & Compute Facts').first().json;
const res = $input.first().json;

const fail = (code, message) => [{ json: { ok: false, error_code: code, error_message: message } }];

// Two response shapes reach this node: Gemini (candidates) and Groq (OpenAI-style choices).
let text;
let model;
if (res.choices) {
  const choice = res.choices[0];
  if (!choice) return fail('AI_EMPTY', 'AI returned no choices');
  if (choice.finish_reason && choice.finish_reason !== 'stop') return fail('AI_INCOMPLETE', `AI stopped early (${choice.finish_reason})`);
  text = String(choice.message?.content ?? '').trim();
  model = `groq/${res.model ?? ''}`;
} else {
  if (res.promptFeedback?.blockReason) return fail('AI_BLOCKED', `Prompt blocked: ${res.promptFeedback.blockReason}`);
  const candidate = res.candidates?.[0];
  if (!candidate) return fail('AI_EMPTY', 'AI returned no candidates');
  if (candidate.finishReason && candidate.finishReason !== 'STOP') return fail('AI_INCOMPLETE', `AI stopped early (${candidate.finishReason})`);
  text = (candidate.content?.parts ?? []).filter((p) => !p.thought && p.text).map((p) => p.text).join('').trim();
  model = res.modelVersion ?? '';
}
let email;
try {
  email = JSON.parse(text);
} catch {
  return fail('AI_BAD_JSON', 'AI returned malformed JSON');
}
if (typeof email?.subject !== 'string' || typeof email?.body !== 'string') return fail('AI_BAD_SHAPE', 'AI output is missing subject or body');

// Normalise: the prompt forbids markdown, strip it anyway if it slips through.
const stripMd = (s) => s.replace(/\*\*|__|`/g, '').replace(/^#{1,6}\s*/gm, '').replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
const subject = stripMd(email.subject).replace(/\s+/g, ' ').slice(0, 120);
const body = stripMd(email.body);

// Grounding checks: the email must contain the facts that matter.
const m = facts.must_mention;
const problems = [];
const words = body.split(/\s+/).filter(Boolean).length;
if (words < 60 || words > 400) problems.push(`length ${words} words`);
if (!body.includes(m.first_name)) problems.push('missing author first name');
if (m.pending && !body.includes(m.pending)) problems.push(`missing pending total ${m.pending}`);
if (/\[[A-Z _]+\]|\{\{|lorem ipsum/i.test(body)) problems.push('contains a placeholder');
if (problems.length) return fail('AI_FAILED_CHECKS', `AI email rejected: ${problems.join(', ')}`);

const missingTitles = m.titles.filter((t) => !body.includes(t));
const warnings = [...facts.warnings, ...missingTitles.map((t) => `title not mentioned: ${t}`)];

return [{ json: { ok: true, subject, body, words, model, warnings } }];
