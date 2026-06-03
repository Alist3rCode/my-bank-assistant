#!/usr/bin/env bash
# =============================================================================
#  deploy.sh — Bank Assistant · Script de déploiement
#  Usage : ./deploy.sh [--tag <image-tag>]
# =============================================================================

set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"

# ── Configuration ─────────────────────────────────────────────────────────────
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.yml}"
REGISTRY="ghcr.io/alist3rcode"
HEALTH_TIMEOUT=90   # secondes max pour attendre qu'un container soit "running"
DISK_MIN_GB=1       # espace disque minimum requis (Go)
LOG_FILE="./deploy-$(date +%Y%m%d-%H%M%S).log"

# ── Couleurs ──────────────────────────────────────────────────────────────────
RED='\033[0;31m';  GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; CYAN='\033[0;36m';  BOLD='\033[1m'
DIM='\033[2m';     NC='\033[0m'

# ── Argument --tag ────────────────────────────────────────────────────────────
FORCE_TAG=""
while [[ $# -gt 0 ]]; do
    case "$1" in
        --tag) FORCE_TAG="$2"; shift 2 ;;
        *)     echo "Usage: $0 [--tag IMAGE_TAG]"; exit 1 ;;
    esac
done

# ── État global ───────────────────────────────────────────────────────────────
ROLLBACK_NEEDED=false
ERRORS=()
VERSION_BEFORE=""
VERSION_AFTER=""
DIGEST_BEFORE=""
DIGEST_AFTER=""
START_TS=$(date +%s)

# ── Logging ───────────────────────────────────────────────────────────────────
log()  { echo -e "$*" | tee -a "$LOG_FILE"; }
step() { log "\n${BLUE}${BOLD}┌── $*${NC}"; }
ok()   { log "│  ${GREEN}✓${NC}  $*"; }
warn() { log "│  ${YELLOW}⚠${NC}  $*"; }
err()  { log "│  ${RED}✗${NC}  $*"; ERRORS+=("$*"); }
info() { log "│  ${DIM}·${NC}  $*"; }

die() {
    err "$*"
    ROLLBACK_NEEDED=true
    exit 1
}

# ── Rollback ──────────────────────────────────────────────────────────────────
do_rollback() {
    step "Rollback automatique"
    local any=false

    for svc in backend frontend; do
        local rollback_img="${REGISTRY}/bank-assistant-${svc}:rollback"
        if docker image inspect "$rollback_img" &>/dev/null; then
            docker tag "$rollback_img" "${REGISTRY}/bank-assistant-${svc}:latest"
            ok "Image $svc restaurée depuis :rollback"
            any=true
        else
            warn "Aucune image :rollback pour $svc (premier déploiement ?)"
        fi
    done

    if [[ "$any" == "true" ]]; then
        docker compose -f "$COMPOSE_FILE" up -d --remove-orphans \
            >> "$LOG_FILE" 2>&1 || true
        sleep 8
        if docker compose -f "$COMPOSE_FILE" ps 2>/dev/null \
                | grep -qiE "running|up"; then
            ok "Service restauré"
        else
            err "Restauration échouée — intervention manuelle requise"
        fi
    fi
}

on_exit() {
    if [[ "$ROLLBACK_NEEDED" == "true" ]]; then
        do_rollback
        print_summary ROLLBACK
    fi
}
trap on_exit EXIT

# ── Helpers ───────────────────────────────────────────────────────────────────

# Attend qu'un container soit en état "running" (max $HEALTH_TIMEOUT s)
wait_running() {
    local svc="$1"
    local elapsed=0
    info "Attente démarrage : $svc (max ${HEALTH_TIMEOUT}s)..."
    while [[ $elapsed -lt $HEALTH_TIMEOUT ]]; do
        local cid state
        cid=$(docker compose -f "$COMPOSE_FILE" ps -q "$svc" 2>/dev/null | head -1)
        if [[ -n "$cid" ]]; then
            state=$(docker inspect "$cid" --format='{{.State.Status}}' 2>/dev/null || echo "")
            [[ "$state" == "running" ]] && { ok "$svc en cours d'exécution"; return 0; }
            [[ "$state" == "exited"  ]] && { return 1; }
        fi
        sleep 3; elapsed=$((elapsed + 3))
    done
    return 1
}

# Digest court de l'image locale (12 chars du sha256)
image_digest() {
    docker inspect --format='{{index .RepoDigests 0}}' \
        "${REGISTRY}/bank-assistant-${1}:latest" 2>/dev/null \
        | grep -oE 'sha256:[a-f0-9]{12}' || echo "aucune"
}

# Appel HTTP interne depuis le container backend
backend_curl() {
    docker compose -f "$COMPOSE_FILE" exec -T backend \
        curl -sf --max-time 10 "http://localhost:8000$1" 2>/dev/null
}

# Extrait un champ JSON simple (sans dépendance jq/python)
json_field() {
    echo "$1" | grep -o "\"${2}\":\"[^\"]*\"" | cut -d'"' -f4 || true
}

# ── Résumé final ──────────────────────────────────────────────────────────────
print_summary() {
    local status="$1"
    local duration=$(( $(date +%s) - START_TS ))

    log ""
    log "${BOLD}══════════════════════════════════════════════════════════${NC}"
    case "$status" in
        OK)       log "  ${GREEN}${BOLD}  DEPLOIEMENT REUSSI${NC}" ;;
        ROLLBACK) log "  ${YELLOW}${BOLD}  ROLLBACK EFFECTUE${NC}" ;;
        *)        log "  ${RED}${BOLD}  ECHEC${NC}" ;;
    esac
    log "${BOLD}══════════════════════════════════════════════════════════${NC}"
    log ""
    [[ -n "$VERSION_BEFORE" ]] \
        && log "  ${DIM}Version precedente  :${NC}  $VERSION_BEFORE"
    [[ -n "$VERSION_AFTER"  ]] \
        && log "  ${BOLD}Version installee   :${NC}  ${CYAN}$VERSION_AFTER${NC}"
    [[ -n "$DIGEST_BEFORE"  ]] \
        && log "  ${DIM}Digest precedent    :${NC}  $DIGEST_BEFORE"
    [[ -n "$DIGEST_AFTER"   ]] \
        && log "  ${DIM}Digest actuel       :${NC}  $DIGEST_AFTER"
    log ""
    log "  ${DIM}Duree               :${NC}  ${duration}s"
    log "  ${DIM}Date                :${NC}  $(date '+%d/%m/%Y %H:%M:%S')"
    log "  ${DIM}Log complet         :${NC}  $LOG_FILE"
    log ""
    log "  ${BOLD}Containers :${NC}"
    docker compose -f "$COMPOSE_FILE" ps \
        --format "table {{.Service}}\t{{.Status}}" 2>/dev/null \
        | while IFS= read -r line; do log "    $line"; done

    if [[ ${#ERRORS[@]} -gt 0 ]]; then
        log ""
        log "  ${RED}${BOLD}Erreurs detectees :${NC}"
        for e in "${ERRORS[@]}"; do
            log "    ${RED}•${NC} $e"
        done
    fi

    log ""
    log "${BOLD}══════════════════════════════════════════════════════════${NC}"
    log ""
}

# =============================================================================
#  DEBUT DU DEPLOIEMENT
# =============================================================================

log "${CYAN}${BOLD}"
log "  +-------------------------------------------------+"
log "  |        BANK ASSISTANT  -  Deploy Script         |"
log "  |         $(date '+%d/%m/%Y  %H:%M:%S')                    |"
log "  +-------------------------------------------------+${NC}"
log ""

# ── 1. PRE-VERIFICATIONS ──────────────────────────────────────────────────────
step "Pre-verifications"

# Docker daemon
docker info &>/dev/null \
    || die "Docker daemon non disponible"
ok "Docker daemon actif"

# docker compose v2
docker compose version &>/dev/null \
    || die "docker compose (v2) introuvable"
ok "docker compose $(docker compose version --short)"

# Fichier compose
[[ -f "$COMPOSE_FILE" ]] \
    || die "Fichier $COMPOSE_FILE introuvable dans $(pwd)"
ok "Fichier $COMPOSE_FILE present"

# .env
[[ -f ".env" ]] \
    || die ".env absent — copier .env.example et remplir les secrets"
ok ".env present"

# Variables obligatoires non vides / non par defaut
# Lecture sécurisée du .env (sans exécuter les valeurs spéciales comme &, $, !)
_load_env() {
    local key raw val
    while IFS= read -r line || [[ -n "$line" ]]; do
        [[ "$line" =~ ^[[:space:]]*# || -z "${line//[[:space:]]/}" ]] && continue
        key="${line%%=*}"
        raw="${line#*=}"
        if [[ "$raw" == \'*\' ]]; then
            val="${raw:1:${#raw}-2}"
        elif [[ "$raw" == \"*\" ]]; then
            val="${raw:1:${#raw}-2}"
        else
            val="$raw"
        fi
        export "$key=$val"
    done < .env
}
_load_env
BAD_VARS=()
for var in POSTGRES_PASSWORD SECRET_KEY GROQ_API_KEY REDIS_PASSWORD; do
    val="${!var:-}"
    if [[ -z "$val" || "$val" == *"change-me"* || "$val" == *"CHANGE_MOI"* \
          || "$val" == *"your-"* || "$val" == *"gsk_..."* ]]; then
        BAD_VARS+=("$var")
    fi
done
[[ ${#BAD_VARS[@]} -eq 0 ]] \
    || die "Variables .env non renseignees : ${BAD_VARS[*]}"
ok "Variables d'environnement valides"

# Espace disque
DISK_FREE_GB=$(df -BG . | awk 'NR==2 {gsub("G",""); print $4}')
[[ "$DISK_FREE_GB" -ge "$DISK_MIN_GB" ]] \
    || die "Espace disque insuffisant : ${DISK_FREE_GB}Go (minimum ${DISK_MIN_GB}Go)"
ok "Espace disque : ${DISK_FREE_GB}Go libres"

# Reseau proxy (cloudflare tunnel)
docker network inspect proxy &>/dev/null \
    || die "Reseau Docker 'proxy' introuvable — creer avec : docker network create proxy"
ok "Reseau proxy present"

# Auth GHCR
if grep -q "ghcr.io" "${HOME}/.docker/config.json" 2>/dev/null; then
    ok "Authentification GHCR presente"
else
    warn "Pas d'auth GHCR dans ~/.docker/config.json — le pull peut echouer"
fi

# ── 2. CAPTURE DE L'ETAT ACTUEL ──────────────────────────────────────────────
step "Capture de l'etat actuel (pour rollback)"

DIGEST_BEFORE=$(image_digest backend)

for svc in backend frontend; do
    img="${REGISTRY}/bank-assistant-${svc}:latest"
    if docker image inspect "$img" &>/dev/null; then
        docker tag "$img" "${REGISTRY}/bank-assistant-${svc}:rollback"
        ok "Image $svc sauvegardee en :rollback"
    else
        warn "Aucune image locale pour $svc (premier deploiement)"
    fi
done

if docker compose -f "$COMPOSE_FILE" ps 2>/dev/null | grep -qiE "running|up"; then
    HEALTH_JSON=$(backend_curl /health 2>/dev/null || echo "{}")
    VERSION_BEFORE="v$(json_field "$HEALTH_JSON" version) — digest ${DIGEST_BEFORE}"
    info "Version en production : $VERSION_BEFORE"
else
    VERSION_BEFORE="(service arrete)"
    info "Aucun service actif — premier deploiement ou arret manuel"
fi

# Override IMAGE_TAG si --tag passe en argument
if [[ -n "$FORCE_TAG" ]]; then
    sed -i "s/^IMAGE_TAG=.*/IMAGE_TAG=${FORCE_TAG}/" .env
    info "IMAGE_TAG force a : $FORCE_TAG"
fi

# ── 3. PULL DES IMAGES ───────────────────────────────────────────────────────
step "Telechargement des nouvelles images"
ROLLBACK_NEEDED=true   # a partir d'ici, tout echec declenche un rollback

docker compose -f "$COMPOSE_FILE" pull >> "$LOG_FILE" 2>&1 \
    || die "Echec du pull — verifier l'auth GHCR et que le CD a bien tourne"

DIGEST_AFTER=$(image_digest backend)

if [[ "$DIGEST_AFTER" == "$DIGEST_BEFORE" ]]; then
    warn "Images identiques a la version precedente — poursuite quand meme"
else
    ok "Nouvelles images disponibles"
    info "Digest backend : ${DIGEST_BEFORE} -> ${DIGEST_AFTER}"
fi

# ── 4. DEMARRAGE ─────────────────────────────────────────────────────────────
step "Demarrage des containers"

docker compose -f "$COMPOSE_FILE" up -d --remove-orphans >> "$LOG_FILE" 2>&1 \
    || die "Echec du demarrage (docker compose up)"
ok "Containers lances"

# ── 5. VERIFICATIONS POST-DEPLOIEMENT ─────────────────────────────────────────
step "Verifications post-deploiement"

# Tous les containers en "running"
for svc in db redis backend frontend; do
    wait_running "$svc" \
        || die "Container '$svc' ne demarre pas dans les ${HEALTH_TIMEOUT}s — logs : docker compose logs $svc"
done

# Sante API backend — retry jusqu'a ce que le backend reponde (alembic + seeding peuvent prendre du temps)
info "Attente du backend sur /health..."
BACKEND_READY=false
for i in $(seq 1 15); do
    HEALTH_JSON=$(backend_curl /health 2>/dev/null || true)
    if [[ "$(json_field "$HEALTH_JSON" status)" == "ok" ]]; then
        BACKEND_READY=true
        break
    fi
    info "Backend pas encore pret (${i}/15) — retry dans 4s..."
    sleep 4
done
[[ "$BACKEND_READY" == "true" ]] \
    || die "Impossible de joindre le backend sur /health apres 60s"

API_STATUS=$(json_field "$HEALTH_JSON" status)
API_VERSION=$(json_field "$HEALTH_JSON" version)

[[ "$API_STATUS" == "ok" ]] \
    || die "Backend /health status != ok : $HEALTH_JSON"
ok "Backend /health -> ok (v${API_VERSION})"

# Sante nginx frontend
info "Test nginx frontend..."
docker compose -f "$COMPOSE_FILE" exec -T frontend \
    curl -sf --max-time 5 http://localhost:80/ -o /dev/null \
    || die "Nginx frontend ne repond pas"
ok "Frontend nginx -> ok"

# Migrations Alembic a jour
info "Verification migrations Alembic..."
MIGRATION_OUT=$(docker compose -f "$COMPOSE_FILE" exec -T backend \
    alembic current 2>/dev/null | tail -1 || echo "")
if echo "$MIGRATION_OUT" | grep -q "(head)"; then
    ok "Migrations Alembic a jour"
else
    warn "Statut Alembic : '${MIGRATION_OUT:-inconnu}' (peut etre normal si pas de migration)"
fi

# Erreurs recentes dans les logs
info "Analyse des logs (30 dernieres secondes)..."
RECENT_ERRORS=$(docker compose -f "$COMPOSE_FILE" logs \
    --since 30s backend 2>/dev/null \
    | grep -ciE "ERROR|CRITICAL|Traceback" || echo "0")
if [[ "$RECENT_ERRORS" -eq 0 ]]; then
    ok "Aucune erreur dans les logs recents"
else
    warn "${RECENT_ERRORS} ligne(s) d'erreur dans les logs — verifier : docker compose logs backend"
fi

# ── 6. NETTOYAGE ──────────────────────────────────────────────────────────────
step "Nettoyage"

# Supprimer les anciennes versions taguees des images bank-assistant (garder :latest et :rollback)
REMOVED=0
for svc in backend frontend; do
    while IFS= read -r line; do
        img_id=$(echo "$line" | awk '{print $1}')
        img_tag=$(echo "$line" | awk '{print $2}')
        [[ "$img_tag" == "latest" || "$img_tag" == "rollback" ]] && continue
        docker rmi "$img_id" >> "$LOG_FILE" 2>&1 && REMOVED=$((REMOVED + 1)) || true
    done < <(docker images "${REGISTRY}/bank-assistant-${svc}" --format "{{.ID}} {{.Tag}}" 2>/dev/null)
done

# Supprimer les images pendantes (sans tag)
docker image prune -f >> "$LOG_FILE" 2>&1 || true

if [[ $REMOVED -gt 0 ]]; then
    ok "${REMOVED} ancienne(s) image(s) bank-assistant supprimee(s)"
else
    ok "Aucune ancienne image a supprimer"
fi

# ── SUCCES ────────────────────────────────────────────────────────────────────
ROLLBACK_NEEDED=false
DIGEST_AFTER=$(image_digest backend)
VERSION_AFTER="v${API_VERSION} — digest ${DIGEST_AFTER}"

print_summary OK
