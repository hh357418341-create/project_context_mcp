#!/bin/sh

SCRIPT_DIR=$(CDPATH= cd "$(dirname "$0")" && pwd)
if [ -z "$SCRIPT_DIR" ]; then
  printf '%s\n' "Could not resolve the Project Context directory."
  printf '%s' "Press Return to close..."
  read -r _
  exit 1
fi

cd "$SCRIPT_DIR" || exit 1
PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
export PATH

fail() {
  printf '\n%s\n' "$1"
  printf '%s' "Press Return to close..."
  read -r _
  exit 1
}

command -v node >/dev/null 2>&1 || \
  fail "Node.js was not found. Install Node.js 22 or later and try again."

if [ ! -f "dist/cli.js" ]; then
  command -v npm >/dev/null 2>&1 || \
    fail "npm was not found. Install Node.js 22 or later and try again."

  [ -d "node_modules" ] || \
    fail "Project dependencies are missing. Run 'npm install' in this folder first."

  printf '%s\n' "Building Project Context..."
  npm run build || fail "Build failed. Review the error above and try again."
fi

printf '%s\n' "Starting Project Context Web..."
printf '%s\n' "Keep this Terminal window open while using the Web interface."
printf '%s\n\n' "Press Control+C or close this window to stop the service."

node "dist/cli.js" ui "$@"
EXIT_CODE=$?

if [ "$EXIT_CODE" -ne 0 ] && [ "$EXIT_CODE" -ne 130 ]; then
  fail "Project Context Web exited with code $EXIT_CODE."
fi

exit "$EXIT_CODE"
