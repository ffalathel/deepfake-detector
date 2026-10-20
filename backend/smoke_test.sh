#!/usr/bin/env bash
# Smoke-test a running backend: ./smoke_test.sh [base_url]
# Used by CI before deploying, and works against localhost or the live Space.
set -euo pipefail

URL="${1:-http://localhost:7860}"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

# 64x64 JPEG, embedded so the test needs nothing but bash and curl
echo '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDABALDA4MChAODQ4SERATGCgaGBYWGDEjJR0oOjM9PDkzODdASFxOQERXRTc4UG1RV19iZ2hnPk1xeXBkeFxlZ2P/2wBDARESEhgVGC8aGi9jQjhCY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2P/wAARCABAAEADASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwDPooormOgKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooA//9k=' | base64 -d > "$TMP/ok.jpg"
echo 'not an image' > "$TMP/bad.jpg"

fail() { echo "FAIL: $*"; exit 1; }

# Wait up to 120s for the server (model load takes a few seconds)
for _ in $(seq 1 120); do
  curl -sf "$URL/health" > "$TMP/health" && break
  sleep 1
done
grep -q '"image_model":"loaded"' "$TMP/health" || fail "/health: model not loaded: $(cat "$TMP/health" 2>/dev/null)"
echo "ok   /health reports model loaded"

code=$(curl -s -o "$TMP/out" -w '%{http_code}' -F "file=@$TMP/ok.jpg;type=image/jpeg" "$URL/analyze-image")
[ "$code" = 200 ] && grep -q '"prediction":"\(real\|ai_generated\)"' "$TMP/out" || fail "valid image -> $code $(cat "$TMP/out")"
echo "ok   valid image -> 200 with a prediction"

code=$(curl -s -o "$TMP/out" -w '%{http_code}' -F "file=@$TMP/bad.jpg;type=image/jpeg" "$URL/analyze-image")
[ "$code" = 400 ] || fail "corrupted image -> $code $(cat "$TMP/out")"
echo "ok   corrupted image -> 400"

code=$(curl -s -o "$TMP/out" -w '%{http_code}' -F "file=@$TMP/bad.jpg;type=text/plain" "$URL/analyze-image")
[ "$code" = 400 ] || fail "wrong content type -> $code $(cat "$TMP/out")"
echo "ok   wrong content type -> 400"

echo "all smoke tests passed against $URL"
