#!/usr/bin/env bash
# Teste le webhook déployé. Usage : ./tests/test-webhook.sh "<URL Web App>" "<SECRET>"
# NB : pas de "-X POST" avec -L : curl doit repasser en GET après la redirection 302 de Google.
URL="$1"; SECRET="$2"
echo "== 1. Payload valide (doit créer une ligne SQL)"
curl -sL "$URL?secret=$SECRET" -H 'Content-Type: application/json' -d @docs/payload-example.json; echo
echo "== 2. Doublon (doit répondre duplicate:true)"
curl -sL "$URL?secret=$SECRET" -H 'Content-Type: application/json' -d @docs/payload-example.json; echo
echo "== 3. Mauvais secret (doit répondre unauthorized)"
curl -sL "$URL?secret=wrong" -H 'Content-Type: application/json' -d @docs/payload-example.json; echo
echo "== 4. JSON cassé (doit répondre bad_json)"
curl -sL "$URL?secret=$SECRET" -d '{oops'; echo
echo "== 5. Payload incomplet (call_id seul)"
curl -sL "$URL?secret=$SECRET" -H 'Content-Type: application/json' -d '{"call_id":"call_partial_1"}'; echo
