#!/usr/bin/env bash
# End-to-end checks against the live n8n webhook (no Bubble needed).
#
#   export N8N_WEBHOOK_URL="https://YOUR-N8N-HOST/webhook/bookleaf-royalty-summary"
#   export N8N_WEBHOOK_KEY="the value of your X-BookLeaf-Key credential"
#   ./test-webhook.sh            # auth, validation, success, duplicate
#   ./test-webhook.sh AUTH009    # also generate for specific authors
set -uo pipefail
cd "$(dirname "$0")"
: "${N8N_WEBHOOK_URL:?set N8N_WEBHOOK_URL}"
: "${N8N_WEBHOOK_KEY:?set N8N_WEBHOOK_KEY}"

pass=0; fail=0
post() { # post <key> <body> → prints "<http_code> <body>"
  curl -sS -m 70 -o /tmp/bl_body.$$ -w '%{http_code}' -X POST "$N8N_WEBHOOK_URL" \
    -H 'Content-Type: application/json' ${1:+-H "X-BookLeaf-Key: $1"} --data "$2"
  echo " $(cat /tmp/bl_body.$$)"; rm -f /tmp/bl_body.$$
}
expect() { # expect <name> <regex> <output>
  if [[ "$3" =~ $2 ]]; then echo "  ✓ $1"; pass=$((pass+1)); else echo "  ✗ $1"; echo "    got: ${3:0:300}"; fail=$((fail+1)); fi
}

echo "Security"
expect "no key → 401/403" '^40[13]' "$(post '' '{}')"
expect "wrong key → 401/403" '^40[13]' "$(post 'wrong-key' '{}')"

echo "Validation"
expect "empty payload → 400 INVALID_PAYLOAD" '^400 .*INVALID_PAYLOAD' "$(post "$N8N_WEBHOOK_KEY" '{}')"

echo "Generate (Gemini, may take 5-40 s)"
rid="curl-$(date +%s)"
out="$(post "$N8N_WEBHOOK_KEY" "$(node tools/payload.mjs AUTH003 "$rid")")"
expect "Ananya → 200 Success with ₹2,546" '^200 .*"status":"Success".*2,546' "$out"
echo "    ${out:0:400}…"

echo "Idempotency"
expect "same author again within 5 min → Skipped" '^200 .*"status":"Skipped".*DUPLICATE_REQUEST' \
  "$(post "$N8N_WEBHOOK_KEY" "$(node tools/payload.mjs AUTH003 "$rid-again")")"

for code in "$@"; do
  echo "Generate $code"
  out="$(post "$N8N_WEBHOOK_KEY" "$(node tools/payload.mjs "$code")")"
  expect "$code → Success" '^200 .*"status":"Success"' "$out"
  node -e 'const r=JSON.parse(process.argv[1].replace(/^\d+ /,""));console.log("\n"+(r.subject||r.error_message)+"\n\n"+r.body+"\n")' "$out"
done

echo; echo "$pass passed, $fail failed"; [[ $fail -eq 0 ]]
