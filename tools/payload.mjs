// The webhook payload exactly as Bubble's API Connector sends it, built from
// the sample dataset. Shared by the tests and by `node tools/payload.mjs AUTH003`
// (prints one payload, used by test-webhook.sh).
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dataset = JSON.parse(readFileSync(join(root, 'data/bookleaf_sample_data.json'), 'utf8'));

export const authorCodes = dataset.authors.map((a) => a.author_id);

export function payloadFor(authorCode, requestId = `test-${authorCode}-${Date.now()}`) {
  const a = dataset.authors.find((x) => x.author_id === authorCode);
  if (!a) throw new Error(`Unknown author ${authorCode}`);
  return {
    request_id: requestId,
    mode: 'single',
    triggered_by: 'admin@bookleaf.com',
    author: { author_code: a.author_id, name: a.name, email: a.email, city: a.city },
    books: a.books.map((b) => ({
      book_code: b.book_id,
      title: b.title,
      status: b.status,
      publication_date: b.publication_date ?? '',
      last_payout_date: b.last_royalty_payout_date ?? '',
      // Bubble sends numbers as quoted text so empty values stay valid JSON
      copies_sold: String(b.total_copies_sold),
      royalty_earned: String(b.total_royalty_earned),
      royalty_paid: String(b.royalty_paid),
      royalty_pending: String(b.royalty_pending),
      available_on: b.available_on.join(', '),
    })),
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.stdout.write(JSON.stringify(payloadFor(process.argv[2] ?? 'AUTH003', process.argv[3])));
}
