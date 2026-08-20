#!/bin/bash
# Convert any iPhone screenshots to every size App Store Connect accepts.
#
#   ./scripts/resize-screenshots.sh ~/Desktop
#
# Reads every .png in the given folder (default ~/Desktop) and writes converted
# copies into appstore/screenshots-<W>x<H>/. Cover-scales then centre-crops, so
# nothing is stretched — aspect ratios differ slightly between iPhone sizes.
SRC="${1:-$HOME/Desktop}"
cd "$(dirname "$0")/.." || exit 1
python3 - "$SRC" <<'PY'
import subprocess, sys, pathlib, math
src = pathlib.Path(sys.argv[1]).expanduser()
shots = sorted(p for p in src.glob("*.png") if p.stat().st_size > 50_000)
if not shots:
    print(f"No screenshots found in {src}"); raise SystemExit(1)

def dims(p):
    out = subprocess.run(["sips","-g","pixelWidth","-g","pixelHeight",str(p)],
                         capture_output=True, text=True).stdout
    g = lambda k: int([l for l in out.splitlines() if k in l][0].split()[-1])
    return g("pixelWidth"), g("pixelHeight")

for tw, th in [(1242,2688), (1284,2778), (1320,2868)]:
    out = pathlib.Path(f"appstore/screenshots-{tw}x{th}")
    out.mkdir(parents=True, exist_ok=True)
    for s in shots:
        sw, sh = dims(s)
        if (sw, sh) == (tw, th):
            subprocess.run(["cp", str(s), str(out / s.name)]); continue
        scale = max(tw/sw, th/sh)
        subprocess.run(["sips","--resampleHeightWidth", str(math.ceil(sh*scale)),
                        str(math.ceil(sw*scale)), str(s), "--out", "/tmp/_r.png"],
                       capture_output=True)
        subprocess.run(["sips","-c", str(th), str(tw), "/tmp/_r.png",
                        "--out", str(out / s.name)], capture_output=True)
    print(f"{out}: {len(shots)} files at {tw}x{th}")
PY
