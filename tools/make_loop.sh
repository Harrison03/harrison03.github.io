#!/usr/bin/env bash
set -euo pipefail
if [ "$#" -ne 4 ]; then
  echo 'Usage: tools/make_loop.sh <input> <start-seconds> <duration 6–10> <outdir>' >&2
  exit 2
fi
script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
python_bin="${TOOLS_PYTHON:-$script_dir/../../.tools/venv/bin/python}"
if [ ! -x "$python_bin" ]; then echo 'Set TOOLS_PYTHON to the project venv Python (imageio-ffmpeg and Pillow required).' >&2; exit 1; fi
ffmpeg_bin="$("$python_bin" -c 'import imageio_ffmpeg; print(imageio_ffmpeg.get_ffmpeg_exe())')"
"$python_bin" -c 'import sys; assert float(sys.argv[1]) >= 0 and 6 <= float(sys.argv[2]) <= 10, "Start must be nonnegative; duration must be 6–10 seconds"' "$2" "$3"
"$python_bin" -c 'import sys; assert 26 <= int(sys.argv[1]) <= 30, "LOOP_CRF must be 26–30"' "${LOOP_CRF:-28}"
mkdir -p -- "$4"
# Optional CROP=width:height:x:y removes source UI/borders before filling 16:9.
filter="${CROP:+crop=$CROP,}scale=960:540:force_original_aspect_ratio=increase,crop=960:540,setsar=1,fps=24"
for crf in "${LOOP_CRF:-28}" 30; do
  "$ffmpeg_bin" -hide_banner -loglevel error -y -ss "$2" -i "$1" -t "$3" -vf "$filter" -c:v libx264 -preset slow -crf "$crf" -pix_fmt yuv420p -an -movflags +faststart "$4/loop.mp4"
  if [ "$(wc -c < "$4/loop.mp4")" -le 1500000 ]; then break; fi
done
if [ "$(wc -c < "$4/loop.mp4")" -gt 1500000 ]; then echo 'Loop exceeds 1.5 MB; select a simpler or shorter 6–10 second segment.' >&2; exit 1; fi
"$ffmpeg_bin" -hide_banner -loglevel error -y -ss "${POSTER_TIME:-0}" -i "$4/loop.mp4" -frames:v 1 -q:v 2 "$4/poster.jpg"
"$python_bin" - "$4/poster.jpg" <<'PY'
from PIL import Image
import sys,io
p=sys.argv[1];im=Image.open(p).convert('RGB')
for q in range(88,19,-4):
    b=io.BytesIO();im.save(b,'JPEG',quality=q,optimize=True)
    if len(b.getvalue())<=100000:break
else:raise RuntimeError('Poster exceeds 100 KB')
open(p,'wb').write(b.getvalue())
PY
printf 'Created %s/loop.mp4 and poster.jpg\n' "$4"
