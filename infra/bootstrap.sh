#!/usr/bin/env bash
# One-time Google Cloud setup for TravelFlow (Phase 0).
# Run in Cloud Shell as a project Owner. Safe to re-run: every step checks
# whether the resource already exists.
#
#   PROJECT_ID=travelflow-dev GITHUB_REPO=Sp1deyGen/smarttraveldesk ./infra/bootstrap.sh
#
# Creates: required APIs, an Artifact Registry repo, three service accounts
# (runtime, deployer, invoker) with least-privilege roles, and Workload
# Identity Federation so GitHub Actions can deploy without a JSON key.
set -euo pipefail

: "${PROJECT_ID:?Set PROJECT_ID, e.g. travelflow-dev}"
: "${GITHUB_REPO:?Set GITHUB_REPO as owner/name, e.g. Sp1deyGen/smarttraveldesk}"
REGION="${REGION:-asia-south1}"
AR_REPO="${AR_REPO:-travelflow}"
SERVICE="${SERVICE:-travelflow}"
POOL="${POOL:-github}"
PROVIDER="${PROVIDER:-github-actions}"

gcloud config set project "$PROJECT_ID" >/dev/null
PROJECT_NUMBER="$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')"

echo "==> Enabling APIs"
gcloud services enable \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  cloudbuild.googleapis.com \
  iam.googleapis.com \
  iamcredentials.googleapis.com \
  sts.googleapis.com \
  secretmanager.googleapis.com \
  aiplatform.googleapis.com \
  logging.googleapis.com \
  monitoring.googleapis.com

echo "==> Artifact Registry repo $AR_REPO in $REGION"
gcloud artifacts repositories describe "$AR_REPO" --location="$REGION" >/dev/null 2>&1 ||
  gcloud artifacts repositories create "$AR_REPO" --location="$REGION" \
    --repository-format=docker --description="TravelFlow images"

sa() { echo "$1@$PROJECT_ID.iam.gserviceaccount.com"; }
create_sa() {
  gcloud iam service-accounts describe "$(sa "$1")" >/dev/null 2>&1 ||
    gcloud iam service-accounts create "$1" --display-name="$2"
}
bind_project() {
  gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member="serviceAccount:$1" --role="$2" --condition=None >/dev/null
}

echo "==> Service accounts"
create_sa travelflow-runtime "TravelFlow Cloud Run runtime"
create_sa travelflow-deployer "TravelFlow GitHub deployer"
create_sa travelflow-invoker "TravelFlow Tasks/Scheduler invoker"

RUNTIME="$(sa travelflow-runtime)"
DEPLOYER="$(sa travelflow-deployer)"
INVOKER="$(sa travelflow-invoker)"

# Runtime: call Gemini on Vertex AI and write logs. More roles (Cloud SQL,
# Tasks, Secret Manager, Storage) are added in later phases.
bind_project "$RUNTIME" roles/aiplatform.user
bind_project "$RUNTIME" roles/logging.logWriter

# Deployer: push images and deploy Cloud Run, acting as the runtime SA.
bind_project "$DEPLOYER" roles/run.admin
bind_project "$DEPLOYER" roles/artifactregistry.writer
gcloud iam service-accounts add-iam-policy-binding "$RUNTIME" \
  --member="serviceAccount:$DEPLOYER" --role=roles/iam.serviceAccountUser >/dev/null

echo "==> Workload Identity Federation for $GITHUB_REPO"
gcloud iam workload-identity-pools describe "$POOL" --location=global >/dev/null 2>&1 ||
  gcloud iam workload-identity-pools create "$POOL" --location=global --display-name="GitHub"
gcloud iam workload-identity-pools providers describe "$PROVIDER" \
  --workload-identity-pool="$POOL" --location=global >/dev/null 2>&1 ||
  gcloud iam workload-identity-pools providers create-oidc "$PROVIDER" \
    --workload-identity-pool="$POOL" --location=global \
    --issuer-uri="https://token.actions.githubusercontent.com" \
    --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository,attribute.ref=assertion.ref" \
    --attribute-condition="assertion.repository=='$GITHUB_REPO'"
gcloud iam service-accounts add-iam-policy-binding "$DEPLOYER" \
  --role=roles/iam.workloadIdentityUser \
  --member="principalSet://iam.googleapis.com/projects/$PROJECT_NUMBER/locations/global/workloadIdentityPools/$POOL/attribute.repository/$GITHUB_REPO" >/dev/null

WIF_PROVIDER="projects/$PROJECT_NUMBER/locations/global/workloadIdentityPools/$POOL/providers/$PROVIDER"

cat <<EOF

Done. Add these as GitHub repository variables (Settings > Secrets and variables > Actions > Variables):

  GCP_PROJECT_ID        $PROJECT_ID
  GCP_REGION            $REGION
  GCP_WIF_PROVIDER      $WIF_PROVIDER
  GCP_DEPLOYER_SA       $DEPLOYER
  GCP_RUNTIME_SA        $RUNTIME
  GCP_AR_REPO           $AR_REPO
  GCP_SERVICE           $SERVICE

Then check which Gemini models this project can use in $REGION:

  PROJECT_ID=$PROJECT_ID ./infra/probe-vertex.sh
EOF
