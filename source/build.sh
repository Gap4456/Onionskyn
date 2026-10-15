#!/bin/bash
# Assembles src/ into a single standalone file: dist/onionskyn.html
set -e
cd "$(dirname "$0")"
mkdir -p dist
{
  sed -e '/<!--JSZIP-->/,$d' src/head.html
  echo '<script>'
  cat src/vendor/jszip.min.js
  echo '</script>'
  echo '<script>'
  echo '/* polygon-clipping v0.15.7, (c) 2018 Mike Fogel, portions (c) 2016 Alexander Milevski. MIT licence: https://github.com/mfogel/polygon-clipping/blob/master/LICENSE.md */'
  cat src/vendor/polygon-clipping.min.js
  echo '</script>'
  sed -e '1,/<!--JSZIP-->/d' src/head.html
  echo '<script id="fcCore">'
  cat src/core.js
  echo '</script>'
  echo '<script id="fcRuntime">'
  cat src/runtime.js
  echo '</script>'
  echo '<script>'
  echo "(function(){'use strict';"
  cat src/app1.js src/app2.js src/app3.js
  echo '})();'
  echo '</script>'
} > dist/flashcraft.html
# syntax check of every inline script
node -e "
const fs=require('fs');const h=fs.readFileSync('dist/flashcraft.html','utf8');
const re=/<script[^>]*>([\s\S]*?)<\/script>/g;let m,i=0;
while((m=re.exec(h))){ i++; try{ new Function(m[1]); console.log('script',i,'syntax ok',m[1].length);}catch(e){console.log('script',i,'SYNTAX ERROR',e.message);process.exit(1);} }
"
# the shipped file: full document with doctype and charset so it renders the same when opened from disk
{ printf '<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">\n'; cat dist/flashcraft.html; } > dist/onionskyn.html
ls -la dist/onionskyn.html
