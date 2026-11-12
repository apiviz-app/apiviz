#!/bin/sh
# Résultat de « Vérifier » sur une version, pour « Mise en ligne ». Un raté de GitHub (tâche annulée faute de machine,
# vérification encore en cours) ne bloque plus la mise en ligne : la vérification est relancée ou attendue.
# Seul un test réellement en échec refuse la mise en ligne.
# Usage : sh scripts/attendre-verifier.sh <sha>   (GH_TOKEN, GITHUB_REPOSITORY ; droit actions: write pour relancer)
# Sortie : 0 et « vert » ou « aucune » (version sans vérification : documentation seule) ; 1 et un message sinon.
# Attente maximale : ATTENTE_MAX secondes (30 min par défaut ; une vérification dure environ 5 min).
set -eu
sha=$1
depot=$GITHUB_REPOSITORY
max=${ATTENTE_MAX:-1800}
pas=${ATTENTE_PAS:-30}
court=$(printf %.7s "$sha")
debut=$(date +%s)
relancee=0

dernier() {
  gh api "repos/$depot/actions/workflows/verifier.yml/runs?head_sha=$sha&per_page=20" \
    --jq '.workflow_runs | sort_by(.created_at) | last | if . == null then "" else "\(.id) \(.status) \(.conclusion)" end'
}

while :; do
  ligne=$(dernier)
  if [ -z "$ligne" ]; then echo "aucune"; exit 0; fi
  # shellcheck disable=SC2086 # découpage voulu : « id statut conclusion »
  set -- $ligne
  id=$1 statut=$2 conclusion=${3:-}
  lien="https://github.com/$depot/actions/runs/$id"
  if [ "$statut" = completed ]; then
    case "$conclusion" in
      success) echo "vert"; exit 0 ;;
      skipped|neutral) echo "aucune"; exit 0 ;;
    esac
    # Rouge ou annulée : un vrai test en échec, ou un raté de GitHub (tâche jamais lancée, annulée, hors délai) ?
    rates=$(gh api "repos/$depot/actions/runs/$id/jobs" --jq '[.jobs[] | select(.conclusion == "failure") | .name] | join(", ")')
    if [ -n "$rates" ]; then
      echo "Vérifier est rouge sur $court ($rates) : rien n'est parti. Détail : $lien"; exit 1
    fi
    if [ "$relancee" = 1 ]; then
      echo "Vérifier n'a pas pu tourner sur $court, même relancé (GitHub n'a pas fourni de machine). Réessaie un peu plus tard : $lien"; exit 1
    fi
    echo "::notice::Vérifier n'a pas abouti sur $court ($conclusion, sans test en échec) : relance automatique." >&2
    gh api -X POST "repos/$depot/actions/runs/$id/rerun" > /dev/null
    relancee=1
  fi
  if [ $(( $(date +%s) - debut )) -ge "$max" ]; then
    echo "Vérifier n'a pas fini sur $court après $((max / 60)) min : relance la mise en ligne quand il aura fini. $lien"; exit 1
  fi
  sleep "$pas"
done
