#!/usr/bin/env bash
# tools/zoom.sh out.png hands|feet 'move t facing' ... : zoomed crops of the hands or feet, for checking wrists and ankles.
out=$1; part=$2; shift 2; tmp=$(mktemp -d); i=0; args=()
O=${CLOSE_OPTS:-'{"bodyType":"average","skin":"#d8976a","hair":{"style":"crop","color":"#2a2233"},"top":{"type":"tee","color":"#3a86d8","accent":"#f4c542"},"bottom":{"type":"shorts","color":"#39394a"},"shoes":{"type":"sneaker","color":"#c9633f"},"acc":[],"face":{"facial":"none","jaw":"round","nose":"button","eyes":"round","browW":1}}'}
case $part in hands) c="1000:800:300:800";; feet) c="1000:500:300:1500";; esac
for spec in "$@"; do read -r m t f <<<"$spec"; node tools/render.mjs "move:$m" --still "$t" --facing "$f" --opts "$O" --size 1600x2000 >/dev/null 2>&1; ffmpeg -y -loglevel error -i "records/move/$m/still.png" -vf "crop=$c,scale=640:-1" "$tmp/$i.png"; args+=(-i "$tmp/$i.png"); i=$((i+1)); done
ffmpeg -y -loglevel error "${args[@]}" -filter_complex "hstack=inputs=$i,scale=1920:-1" -frames:v 1 "$out"; rm -rf "$tmp"
