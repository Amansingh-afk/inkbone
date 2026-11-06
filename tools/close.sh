#!/usr/bin/env bash
# tools/close.sh out.png 'move t facing' ... : full-size stills side by side, for checking hands and feet.
out=$1; shift; tmp=$(mktemp -d); i=0; args=(); chain=""
O=${CLOSE_OPTS:-'{"bodyType":"average","skin":"#d8976a","hair":{"style":"crop","color":"#2a2233"},"top":{"type":"tee","color":"#3a86d8","accent":"#f4c542"},"bottom":{"type":"shorts","color":"#39394a"},"shoes":{"type":"sandal","color":"#8a6242"},"acc":[],"face":{"facial":"none","jaw":"round","nose":"button","eyes":"round","browW":1}}'}
for spec in "$@"; do read -r m t f <<<"$spec"; node tools/render.mjs "move:$m" --still "$t" --facing "$f" --opts "$O" --size 800x1000 >/dev/null 2>&1; cp "records/move/$m/still.png" "$tmp/$i.png"; args+=(-i "$tmp/$i.png"); i=$((i+1)); done
ffmpeg -y -loglevel error "${args[@]}" -filter_complex "hstack=inputs=$i,scale=1920:-1" -frames:v 1 "$out"; rm -rf "$tmp"
