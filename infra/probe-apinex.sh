#!/usr/bin/env bash
# Find out what apinex.bond speaks before you set the APINEX_* variables. Run it
# on your own machine. It sends only invented text, reads the key from the
# environment and never prints it:
#
#   export APINEX_API_KEY=...           # never paste the key in chat or commit it
#   ./infra/probe-apinex.sh
#   MODEL=<an id from the list> ./infra/probe-apinex.sh
#
# The output holds no key, so it is safe to paste back. Needs curl and node (the
# app already needs node); openssl, dig and whois are optional and add facts
# about who runs the service.
set -uo pipefail

: "${APINEX_API_KEY:?Set APINEX_API_KEY in your shell first}"
export APINEX_API_KEY
HOST="${APINEX_HOST:-apinex.bond}"
MODEL="${MODEL:-}"

# The key goes to this host, so refuse anything that is not apinex.bond.
case "$HOST" in
  *[!A-Za-z0-9.-]*) echo "APINEX_HOST has characters a hostname cannot" >&2; exit 1 ;;
  apinex.bond | *.apinex.bond) ;;
  *) echo "Refusing to send the key to $HOST: only apinex.bond hosts are allowed" >&2; exit 1 ;;
esac
case "$MODEL" in
  *[!A-Za-z0-9._:/-]*) echo "MODEL has characters a model id does not" >&2; exit 1 ;;
esac
ROOT="https://$HOST"

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
OUT="$WORK/reply.json"

# call <openai|google> <GET|POST> <url> [json]: print the HTTP status and save
# the reply in $OUT. The key travels in a curl config on stdin, not in argv.
call() {
  local style="$1" method="$2" url="$3" json="${4:-}" header code
  if [ "$style" = google ]; then
    header="x-goog-api-key: $APINEX_API_KEY"
  else
    header="Authorization: Bearer $APINEX_API_KEY"
  fi
  : >"$OUT"
  if [ -n "$json" ]; then
    printf '%s' "$json" >"$WORK/request.json"
    code="$(printf 'header = "%s"\n' "$header" | curl -sS --max-time 40 -o "$OUT" -w '%{http_code}' \
      --config - -X "$method" -H 'Content-Type: application/json' \
      --data-binary "@$WORK/request.json" "$url" 2>"$WORK/curl.err")"
  else
    code="$(printf 'header = "%s"\n' "$header" | curl -sS --max-time 40 -o "$OUT" -w '%{http_code}' \
      --config - -X "$method" "$url" 2>"$WORK/curl.err")"
  fi
  printf '%s' "${code:-000}"
}

# summarize <models|openai|google> <file>: one key-free line about a reply.
summarize() {
  command -v node >/dev/null 2>&1 || { echo "(install node to read replies)"; return; }
  node -e '
    const fs = require("fs");
    const [kind, file] = process.argv.slice(1);
    const key = process.env.APINEX_API_KEY;
    const clean = (s, n = 110) => String(s).split(key).join("[KEY]").replace(/\s+/g, " ").slice(0, n);
    const raw = fs.readFileSync(file, "utf8");
    let body;
    try { body = JSON.parse(raw); } catch { console.log("not JSON: " + clean(raw, 80)); process.exit(0); }
    if (body.error) { console.log("error: " + clean(body.error.message ?? JSON.stringify(body.error))); process.exit(0); }
    if (kind === "models") {
      const ids = (body.data ?? body.models ?? []).map((m) => m.id ?? m.name).filter(Boolean);
      console.log(ids.length + " models: " + clean(ids.slice(0, 40).join(", "), 600));
    } else {
      const text = kind === "openai" ? body.choices?.[0]?.message?.content : body.candidates?.[0]?.content?.parts?.[0]?.text;
      let parsed;
      try { parsed = JSON.parse(text); } catch {}
      console.log(parsed && typeof parsed === "object"
        ? "reply is JSON with keys: " + Object.keys(parsed).join(", ")
        : "reply is not a JSON object: " + clean(text ?? "(empty)"));
    }
  ' "$1" "$2"
}

first_model() {
  node -e '
    const body = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"));
    const first = (body.data ?? body.models ?? []).map((m) => m.id ?? m.name).find(Boolean);
    if (first) console.log(String(first).replace(/^models\//, ""));
  ' "$1" 2>/dev/null
}

row() { printf '%-40s %-5s %s\n' "$1" "$2" "$3"; }
is_json() { case "$1" in "reply is JSON"*) return 0 ;; *) return 1 ;; esac; }

echo "== $HOST check (the key is never printed)"
echo
echo "-- Who runs it (no key is sent)"
ips=""
if command -v dig >/dev/null 2>&1; then
  ips="$(dig +short "$HOST" | tr '\n' ' ')"
elif command -v getent >/dev/null 2>&1; then
  ips="$(getent hosts "$HOST" | awk '{print $1}' | tr '\n' ' ')"
fi
echo "resolves to: ${ips:-unknown}"
if command -v openssl >/dev/null 2>&1; then
  openssl s_client -servername "$HOST" -connect "$HOST:443" </dev/null 2>/dev/null \
    | openssl x509 -noout -issuer -subject -dates 2>/dev/null | sed 's/^/tls: /'
fi
if command -v whois >/dev/null 2>&1; then
  whois "$HOST" 2>/dev/null | grep -iE '^(registrar:|creat|registered|registry expiry|expir|updated)' | head -6 | sed 's/^/whois: /'
fi

echo
echo "-- What it speaks (invented text only)"
code="$(call openai GET "$ROOT/v1/models")"
row "GET  /v1/models" "$code" "$(summarize models "$OUT")"
[ "$code" = 200 ] && [ -z "$MODEL" ] && MODEL="$(first_model "$OUT")"
code="$(call google GET "$ROOT/v1beta/models")"
row "GET  /v1beta/models (Gemini style)" "$code" "$(summarize models "$OUT")"
[ "$code" = 200 ] && [ -z "$MODEL" ] && MODEL="$(first_model "$OUT")"

openai_json="no"
schema_json="no"
google_json="no"
if [ -n "$MODEL" ]; then
  echo "(using model: $MODEL)"
  ASK='Client review in Mysuru from 12 to 14 November 2026. Reply with one JSON object with the keys destinationCity (string), startDate (yyyy-mm-dd) and endDate (yyyy-mm-dd).'
  MESSAGES="\"messages\":[{\"role\":\"user\",\"content\":\"$ASK\"}]"

  code="$(call openai POST "$ROOT/v1/chat/completions" \
    "{\"model\":\"$MODEL\",$MESSAGES,\"response_format\":{\"type\":\"json_object\"}}")"
  summary="$(summarize openai "$OUT")"
  row "POST /v1/chat/completions, JSON mode" "$code" "$summary"
  [ "$code" = 200 ] && is_json "$summary" && openai_json="yes"

  SCHEMA='{"type":"object","properties":{"destinationCity":{"type":"string"},"startDate":{"type":"string"},"endDate":{"type":"string"}},"required":["destinationCity","startDate","endDate"],"additionalProperties":false}'
  code="$(call openai POST "$ROOT/v1/chat/completions" \
    "{\"model\":\"$MODEL\",$MESSAGES,\"response_format\":{\"type\":\"json_schema\",\"json_schema\":{\"name\":\"trip\",\"strict\":true,\"schema\":$SCHEMA}}}")"
  summary="$(summarize openai "$OUT")"
  row "POST /v1/chat/completions, JSON schema" "$code" "$summary"
  [ "$code" = 200 ] && is_json "$summary" && schema_json="yes"

  code="$(call google POST "$ROOT/v1beta/models/$MODEL:generateContent" \
    "{\"contents\":[{\"role\":\"user\",\"parts\":[{\"text\":\"$ASK\"}]}],\"generationConfig\":{\"responseMimeType\":\"application/json\"}}")"
  summary="$(summarize google "$OUT")"
  row "POST /v1beta/models/<id>:generateContent" "$code" "$summary"
  [ "$code" = 200 ] && is_json "$summary" && google_json="yes"
else
  echo "No model id found. Re-run with MODEL=<an id from the list above>."
fi

echo
echo "== Suggested settings"
if [ "$openai_json" = yes ]; then
  echo "APINEX_API_FORMAT=openai"
  echo "APINEX_MODEL=$MODEL"
  echo "APINEX_JSON_SCHEMA=$([ "$schema_json" = yes ] && echo true || echo false)"
elif [ "$google_json" = yes ]; then
  echo "APINEX_API_FORMAT=google"
  echo "APINEX_MODEL=$MODEL"
  echo "APINEX_JSON_SCHEMA=false"
else
  echo "No format returned a JSON reply. Paste this output so the adapter fits what it speaks."
fi
echo
echo "Done. The key was not printed or stored."
