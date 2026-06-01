"""
Generates all Android icon and splash PNG assets from resources/icon.png
and resources/splash.png, placing them in the correct mipmap/drawable folders.
Replicates what @capacitor/assets generate --android does.
"""
from PIL import Image
import os

BASE = "android/app/src/main/res"

# --- Icons (ic_launcher + ic_launcher_round + ic_launcher_foreground) ---
ICON_SIZES = {
    "mipmap-mdpi":     48,
    "mipmap-hdpi":     72,
    "mipmap-xhdpi":    96,
    "mipmap-xxhdpi":   144,
    "mipmap-xxxhdpi":  192,
}

# --- Splash screens ---
# portrait (w x h) and landscape (w x h) per density
SPLASH_PORT = {
    "drawable-port-mdpi":    (320,  480),
    "drawable-port-hdpi":    (480,  800),
    "drawable-port-xhdpi":   (720,  1280),
    "drawable-port-xxhdpi":  (960,  1600),
    "drawable-port-xxxhdpi": (1280, 1920),
}
SPLASH_LAND = {
    "drawable-land-mdpi":    (480,  320),
    "drawable-land-hdpi":    (800,  480),
    "drawable-land-xhdpi":   (1280, 720),
    "drawable-land-xxhdpi":  (1600, 960),
    "drawable-land-xxxhdpi": (1920, 1280),
}

icon_src = Image.open("resources/icon.png").convert("RGBA")
splash_src = Image.open("resources/splash.png").convert("RGBA")


def place(img, folder, filename, size):
    path = os.path.join(BASE, folder)
    os.makedirs(path, exist_ok=True)
    out = img.resize(size, Image.LANCZOS)
    out.save(os.path.join(path, filename))
    print(f"  {folder}/{filename}  {size[0]}x{size[1]}")


print("=== Icons ===")
for folder, px in ICON_SIZES.items():
    place(icon_src, folder, "ic_launcher.png",            (px, px))
    place(icon_src, folder, "ic_launcher_round.png",      (px, px))
    place(icon_src, folder, "ic_launcher_foreground.png", (px, px))

print("\n=== Splash (portrait) ===")
for folder, (w, h) in SPLASH_PORT.items():
    place(splash_src, folder, "splash.png", (w, h))

print("\n=== Splash (landscape) ===")
for folder, (w, h) in SPLASH_LAND.items():
    place(splash_src, folder, "splash.png", (w, h))

# Default drawable splash (used as fallback)
print("\n=== Splash (default drawable) ===")
place(splash_src, "drawable", "splash.png", (2732, 2732))

print("\nAll Android assets generated!")
