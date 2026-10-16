#!/bin/bash
# full regression run; prints one line per suite
cd "$(dirname "$0")/.."
SP=/tmp/claude-0/-home-claude/b9deede6-df59-5a19-a906-fb0279000983/scratchpad
run(){ name=$1; shift; out=$(timeout 280 "$@" 2>&1); code=$?; bad=$(echo "$out" | grep -E "^FAIL |MISMATCH|SYNTAX|PAGEERR|STEP-THROW|ALL FAIL" | head -2); if [ $code -eq 0 ] && [ -z "$bad" ]; then echo "PASS $name"; else echo "FAIL $name (exit $code) $bad"; fi; }
run core node test/core.test.js
run flaimg node test/flaimg.js $SP/t.png
run flaedge node test/flaedge.js
for t in smoke2 beta brush fluid merge bucket gradient eraser as1 frames undotext ease mask img clip sym symdel xss explimit audit1 audit2 audit3; do run $t node test/$t.js; done
for t in rttest symedit edtest; do run $t node test/$t.js $SP/noun.fla; done
for sd in 1 2 3; do run diff$sd node test/diff.js $sd 10; done
run fuzz1 node test/fuzz.js 21 80
