import subprocess
subprocess.run(['pip', 'install', 'Pillow'], capture_output=True)

from PIL import Image, ImageDraw
import os

sizes = {
    'mipmap-mdpi': 48,
    'mipmap-hdpi': 72,
    'mipmap-xhdpi': 96,
    'mipmap-xxhdpi': 144,
    'mipmap-xxxhdpi': 192,
}

def create_icon(size):
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    r = size // 5
    draw.rounded_rectangle([0, 0, size-1, size-1], radius=r, fill='#14A800')

    cx, cy = size // 2, size // 2
    top   = (cx, cy - size//4)
    left  = (cx - size//4, cy)
    right = (cx + size//4, cy)

    lw = max(2, size // 24)
    draw.line([top, (cx, cy)],   fill='white', width=lw)
    draw.line([left, (cx, cy)],  fill='white', width=lw)
    draw.line([right, (cx, cy)], fill='white', width=lw)

    draw.polygon([top, left, (cx, cy), right], fill='#0d8a00', outline='white')
    draw.polygon([top, left, (cx - size//8, cy + size//5), (cx, cy - size//20)], fill='#14A800')

    r2 = max(3, size // 16)
    for point in [top, left, right]:
        draw.ellipse([point[0]-r2, point[1]-r2, point[0]+r2, point[1]+r2], fill='white')

    r3 = max(2, size // 20)
    draw.ellipse([cx-r3, cy-r3, cx+r3, cy+r3], fill='white')

    return img

base = 'android/app/src/main/res'
for folder, size in sizes.items():
    path = f'{base}/{folder}'
    os.makedirs(path, exist_ok=True)
    icon = create_icon(size)
    icon.save(f'{path}/ic_launcher.png')
    icon.save(f'{path}/ic_launcher_round.png')
    print(f'Created {size}x{size} icon in {folder}')

print('All icons created!')
