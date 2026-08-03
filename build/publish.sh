#!/usr/bin/env bash
# ════════════════════════════════════════════════════════════════
# build/publish.sh — publication du brief, QA-gatée, idempotente.
#
#   bash build/publish.sh 2026-08-03
#
# Pourquoi ce script : GitHub Pages sert la branche `main`. Une session
# confinée à une branche de travail (Claude Code on the web) pousse par
# défaut ailleurs — le brief est alors commité mais JAMAIS en ligne.
# Ce script fait le trajet complet jusqu'à main, ou échoue bruyamment.
#
# Ne contient aucun secret : l'authentification vient du remote déjà
# configuré (proxy harness ou credential helper). Ne jamais y écrire de PAT.
# ════════════════════════════════════════════════════════════════
set -euo pipefail

DATE="${1:-}"
[ -n "$DATE" ] || { echo "usage: bash build/publish.sh <YYYY-MM-DD>"; exit 2; }

cd "$(dirname "$0")/.."

# 1. QA bloquante — rien ne part si c'est rouge.
echo "── QA ──"
node build/qa.js

# 2. Commit (no-op si rien à commiter).
if [ -n "$(git status --porcelain)" ]; then
  N=$(node -e "const d=require('./briefs/data.json');const b=d.briefs.find(x=>x.date==='$DATE');if(!b){process.exit(3)};console.log(\`\${b.items_count} items, \${b.by_tag.lynxter} 🎯, \${b.by_tag.useful} 🛠, \${b.by_tag.info} ·\`)")
  git add -A
  git commit -q -m "brief: semaine du $DATE ($N)"
  echo "── commit: $(git log --oneline -1)"
else
  echo "── rien à commiter"
fi

# 3. Pousser la branche courante si ce n'est pas main (traçabilité).
BR="$(git rev-parse --abbrev-ref HEAD)"
push_retry() {  # $1 = refspec
  for i in 1 2 3 4 5; do
    git push -u origin "$1" && return 0
    echo "   push $1 échoué, retry $i"; sleep $((2 ** i))
  done
  return 1
}
if [ "$BR" != "main" ]; then
  push_retry "$BR" || { echo "❌ push de $BR impossible"; exit 1; }
fi

# 4. Publier sur main — c'est CE pas qui met le brief en ligne.
git fetch origin main
git checkout main
git merge --ff-only "$BR" 2>/dev/null || git merge --no-edit "$BR"
push_retry main || { echo "❌ PUBLICATION ÉCHOUÉE — le brief n'est PAS en ligne"; exit 1; }
git checkout "$BR" 2>/dev/null || true

echo "── ✅ publié sur main : $(git log --oneline origin/main -1)"

# 5. Vérification post-déploiement (best-effort : l'egress peut bloquer).
echo "── vérification déploiement (90 s d'attente Pages)"
sleep 90
# curl écrit déjà le code via -w (000 s'il n'a pas pu se connecter) : pas de
# `|| echo 000` ici, il concaténerait un second code au premier.
set +e
CODE=$(curl -s -o /tmp/veille-home.html -w "%{http_code}" --max-time 20 \
  https://leomarty1.github.io/veille-IA/ 2>/dev/null)
set -e
CODE=${CODE:-000}
if [ "$CODE" = "200" ]; then
  if grep -q "$DATE" /tmp/veille-home.html; then
    echo "── ✅ déploiement OK : 200 + date $DATE servie"
  else
    echo "── ⚠ 200 mais la home ne montre pas encore $DATE (build Pages en cours ?)"
  fi
else
  echo "── ⚠ vérification impossible (HTTP $CODE — egress bloqué ?). Le push main a réussi."
fi
