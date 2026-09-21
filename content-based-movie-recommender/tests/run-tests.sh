#!/bin/sh
set -eu

project_dir=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)

osascript -l JavaScript "$project_dir/tests/app-tests.jxa" "$project_dir"
python3 -m unittest discover -s "$project_dir/tests" -p "test_*.py" -v

