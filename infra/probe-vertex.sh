#!/usr/bin/env bash
# Check which Gemini models answer in a region for this project, using your
# gcloud login. Run in Cloud Shell after infra/bootstrap.sh:
#
#   PROJECT_ID=travelflow-dev ./infra/probe-vertex.sh
#   PROJECT_ID=travelflow-dev MODELS="gemini-3.5-flash gemini-2.5-flash" ./infra/probe-vertex.sh
#
# Set GEMINI_FLASH_MODEL on the Cloud Run service to the first model that
# returns 200 in asia-south1.
set -euo pipefail

: "${PROJECT_ID:?Set PROJECT_ID}"
REGION="${REGION:-asia-south1}"
MODELS="${MODELS:-gemini-3.5-flash gemini-3.5-flash-lite gemini-3-flash gemini-2.5-flash gemini-2.5-flash-lite}"
TOKEN="$(gcloud auth print-access-token)"
BODY='{"contents":[{"role":"user","parts":[{"text":"Reply with the single word OK."}]}]}'

printf "%-28s %s\n" "MODEL ($REGION)" "RESULT"
for model in $MODELS; do
  url="https://$REGION-aiplatform.googleapis.com/v1/projects/$PROJECT_ID/locations/$REGION/publishers/google/models/$model:generateContent"
  code="$(curl -s -o /tmp/probe.json -w '%{http_code}' -X POST "$url" \
    -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d "$BODY")"
  if [ "$code" = "200" ]; then
    printf "%-28s %s\n" "$model" "200 OK"
  else
    printf "%-28s %s %s\n" "$model" "$code" "$(grep -o '"message": *"[^"]*' /tmp/probe.json | head -1 | cut -c13-90)"
  fi
done
