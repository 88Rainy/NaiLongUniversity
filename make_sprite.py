from PIL import Image, ImageSequence, ImageFilter
import numpy as np, os

proj = r"C:\Users\81153\Desktop\nailong-countdown-four-edges"
src = os.path.join(proj, "assets", "mascot-laugh-transparent.webp")
src_im = Image.open(src)
frames = [f.convert("RGBA").copy() for f in ImageSequence.Iterator(src_im)]
N = len(frames)
CELL = 240
COLS = 8
ROWS = (N + COLS - 1) // COLS
COLORS = 128
TRANS = 255
ALPHA_CUT = 120

# --- build a shared palette from all frames ---
samples = []
for f in frames:
    small = f.convert("RGB").resize((80, 80), Image.LANCZOS)
    samples.append(small)
montage = Image.new("RGB", (80 * N, 80))
for i, s in enumerate(samples):
    montage.paste(s, (i * 80, 0))
pal_img = montage.quantize(colors=COLORS, method=Image.MEDIANCUT)
pal = pal_img.getpalette()[: COLORS * 3]
pal = pal + [0, 0, 0] * (256 - COLORS)

# --- compose sprite ---
sprite = Image.new("P", (CELL * COLS, CELL * ROWS), TRANS)
sprite.putpalette(pal)
for i, f in enumerate(frames):
    p = f.convert("RGB").convert("P", palette=pal_img, dither=Image.NONE)
    arr = np.array(p, dtype=np.uint8)
    arr[np.array(f.getchannel("A")) < ALPHA_CUT] = TRANS
    cell = Image.fromarray(arr, mode="P")
    cell.putpalette(pal)
    sprite.paste(cell, ((i % COLS) * CELL, (i // COLS) * CELL))
sprite.info["transparency"] = TRANS

out = os.path.join(proj, "assets", "mascot-sprite.png")
sprite.save(out, optimize=True)
print("sprite", sprite.size, "bytes", os.path.getsize(out))

# --- verify: decode sprite back, compare alpha + color ---
chk = Image.open(out).convert("RGBA")
arr = np.array(chk)
maxerr = 0
for i, f in enumerate(frames):
    x, y = (i % COLS) * CELL, (i // COLS) * CELL
    cell = arr[y:y+CELL, x:x+CELL]
    src_rgba = np.array(f)
    expect_a = src_rgba[..., 3] >= ALPHA_CUT
    got_a = cell[..., 3] > 0
    bad_a = int((expect_a != got_a).sum())
    err = np.abs(cell[..., :3].astype(int) - src_rgba[..., :3].astype(int)).max()
    maxerr = max(maxerr, int(err))
    if bad_a or i < 2:
        print("frame", i, "alpha mismatch", bad_a, "max color err", int(err))
print("max color err overall", maxerr, "frames", N, "grid", COLS, "x", ROWS)
