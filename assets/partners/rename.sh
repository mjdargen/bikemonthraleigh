#!/bin/bash

for f in *.webp; do
  [ -e "$f" ] || continue
  mv "$f" "temp-$f"
done

git add -A

for f in temp-*.webp; do
  [ -e "$f" ] || continue
  mv "$f" "${f#temp-}"
done

git add -A