#!/usr/bin/env bash
# Usage: stage.sh <recipe> <dir>
# Wraps scripts/<recipe>.js with the JSON in <dir>/recipe-args.json into <dir>/recipe-run.js,
# a file that browser_run_code_unsafe can load by `filename` (run_code has no require/fs/args).
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
src="$here/$1.js"
dir="$2"
[ -f "$src" ] || { echo "no recipe: $1" >&2; exit 1; }
[ -f "$dir/recipe-args.json" ] || { echo "missing $dir/recipe-args.json" >&2; exit 1; }
{ printf 'async (page) => (\n'; cat "$src"; printf '\n)(page, '; cat "$dir/recipe-args.json"; printf ')\n'; } > "$dir/recipe-run.js"
echo "$dir/recipe-run.js"
