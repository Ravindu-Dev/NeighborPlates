import os
import glob
from PIL import Image, ImageDraw
import numpy as np

MOBILE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS_DIR = os.path.join(MOBILE_DIR, 'assets')
RES_DIR = os.path.join(MOBILE_DIR, 'android', 'app', 'src', 'main', 'res')

BG_COLOR = (226, 87, 2, 255) # #e25702
BG_HEX = "#e25702"

def main():
    print("Generating comprehensive NeighborPlates icons from assets/Logo.png...")
    logo_path = os.path.join(ASSETS_DIR, 'Logo.png')
    im = Image.open(logo_path).convert('RGBA')
    arr = np.array(im, dtype=np.float32)

    # Cleanly extract pure white emblem with antialiased alpha
    b = arr[:, :, 2]
    alpha = np.clip((b - 5.0) / (248.0 - 5.0), 0.0, 1.0) * 255.0
    emblem_arr = np.zeros_like(arr, dtype=np.uint8)
    emblem_arr[:, :, 0] = 255
    emblem_arr[:, :, 1] = 255
    emblem_arr[:, :, 2] = 255
    emblem_arr[:, :, 3] = alpha.astype(np.uint8)
    emblem_orig = Image.fromarray(emblem_arr, 'RGBA')

    orig_w, orig_h = emblem_orig.size
    cx, cy = orig_w / 2.0, orig_h / 2.0
    y_idx, x_idx = np.where(alpha > 30)
    dists = np.sqrt((x_idx - cx)**2 + (y_idx - cy)**2)
    max_dist = dists.max()
    print(f"Original emblem size: {orig_w}x{orig_h}, max radius: {max_dist:.1f}px")

    def make_adaptive_fg(canvas_size):
        # 4x supersampling for high fidelity
        ss = 4
        ss_canvas = canvas_size * ss
        target_radius = 0.58 * (ss_canvas / 2.0)
        scale = target_radius / max_dist
        scaled_dim = int(round(orig_w * scale))
        scaled = emblem_orig.resize((scaled_dim, scaled_dim), Image.Resampling.LANCZOS)
        
        canvas = Image.new('RGBA', (ss_canvas, ss_canvas), (0, 0, 0, 0))
        offset = (ss_canvas - scaled_dim) // 2
        canvas.paste(scaled, (offset, offset), scaled)
        return canvas.resize((canvas_size, canvas_size), Image.Resampling.LANCZOS)

    def make_launcher_icon(canvas_size, shape='round'):
        # 4x supersampling for crisp edges
        ss = 4
        ss_canvas = canvas_size * ss
        target_radius = 0.75 * (ss_canvas / 2.0)
        scale = target_radius / max_dist
        scaled_dim = int(round(orig_w * scale))
        scaled = emblem_orig.resize((scaled_dim, scaled_dim), Image.Resampling.LANCZOS)

        base = Image.new('RGBA', (ss_canvas, ss_canvas), BG_COLOR)
        offset = (ss_canvas - scaled_dim) // 2
        base.paste(scaled, (offset, offset), scaled)

        if shape == 'round':
            mask = Image.new('L', (ss_canvas, ss_canvas), 0)
            draw = ImageDraw.Draw(mask)
            draw.ellipse((ss, ss, ss_canvas - 1 - ss, ss_canvas - 1 - ss), fill=255)
            output = Image.new('RGBA', (ss_canvas, ss_canvas), (0, 0, 0, 0))
            output.paste(base, (0, 0), mask)
            return output.resize((canvas_size, canvas_size), Image.Resampling.LANCZOS)
        elif shape == 'rounded_square':
            mask = Image.new('L', (ss_canvas, ss_canvas), 0)
            draw = ImageDraw.Draw(mask)
            r = int(ss_canvas * 0.20)
            draw.rounded_rectangle((ss, ss, ss_canvas - 1 - ss, ss_canvas - 1 - ss), radius=r, fill=255)
            output = Image.new('RGBA', (ss_canvas, ss_canvas), (0, 0, 0, 0))
            output.paste(base, (0, 0), mask)
            return output.resize((canvas_size, canvas_size), Image.Resampling.LANCZOS)
        else:
            return base.resize((canvas_size, canvas_size), Image.Resampling.LANCZOS)

    # 1. Update assets folder
    print("Updating assets/ directory...")
    logo_target = os.path.join(ASSETS_DIR, 'logo.png')
    im.save(logo_target, format='PNG')

    # icon.png (1024x1024)
    icon_1024 = make_launcher_icon(1024, shape='none')
    icon_1024.save(os.path.join(ASSETS_DIR, 'icon.png'), format='PNG')

    # android-icon-foreground.png (512x512)
    fg_512 = make_adaptive_fg(512)
    fg_512.save(os.path.join(ASSETS_DIR, 'android-icon-foreground.png'), format='PNG')

    # android-icon-background.png (512x512)
    bg_512 = Image.new('RGBA', (512, 512), BG_COLOR)
    bg_512.save(os.path.join(ASSETS_DIR, 'android-icon-background.png'), format='PNG')

    # android-icon-monochrome.png (432x432)
    mono_432 = make_adaptive_fg(432)
    mono_432.save(os.path.join(ASSETS_DIR, 'android-icon-monochrome.png'), format='PNG')

    # favicon.png (192x192)
    fav_192 = make_launcher_icon(192, shape='round')
    fav_192.save(os.path.join(ASSETS_DIR, 'favicon.png'), format='PNG')

    # 2. Clean old .webp files and conflicting drawable files
    print("Cleaning stale webp and conflicting drawables...")
    for old_webp in glob.glob(os.path.join(RES_DIR, 'mipmap-*', '*.webp')):
        try:
            os.remove(old_webp)
            print(f"  Removed {os.path.relpath(old_webp, RES_DIR)}")
        except OSError:
            pass

    conflicting_bg = os.path.join(RES_DIR, 'drawable', 'ic_launcher_background.xml')
    if os.path.exists(conflicting_bg):
        os.remove(conflicting_bg)
        print("  Removed conflicting drawable/ic_launcher_background.xml")

    # 3. Generate native PNG mipmaps
    densities = {
        'mipmap-mdpi': {'launcher': 48, 'adaptive': 108},
        'mipmap-hdpi': {'launcher': 72, 'adaptive': 162},
        'mipmap-xhdpi': {'launcher': 96, 'adaptive': 216},
        'mipmap-xxhdpi': {'launcher': 144, 'adaptive': 324},
        'mipmap-xxxhdpi': {'launcher': 192, 'adaptive': 432},
    }

    print("Generating standard PNG mipmap resources...")
    for folder, sizes in densities.items():
        dir_path = os.path.join(RES_DIR, folder)
        os.makedirs(dir_path, exist_ok=True)

        l_size = sizes['launcher']
        a_size = sizes['adaptive']

        # ic_launcher.png (rounded square)
        l_icon = make_launcher_icon(l_size, shape='rounded_square')
        l_icon.save(os.path.join(dir_path, 'ic_launcher.png'), format='PNG')

        # ic_launcher_round.png (circular)
        r_icon = make_launcher_icon(l_size, shape='round')
        r_icon.save(os.path.join(dir_path, 'ic_launcher_round.png'), format='PNG')

        # ic_launcher_foreground.png
        fg_icon = make_adaptive_fg(a_size)
        fg_icon.save(os.path.join(dir_path, 'ic_launcher_foreground.png'), format='PNG')

        # Also supply ic_launcher_background.png for completeness
        bg_icon = Image.new('RGBA', (a_size, a_size), BG_COLOR)
        bg_icon.save(os.path.join(dir_path, 'ic_launcher_background.png'), format='PNG')

        print(f"  [OK] Generated {folder} (launcher: {l_size}x{l_size}.png, adaptive: {a_size}x{a_size}.png)")

    # 4. Also generate fallback icons in drawable/ for file managers and APK viewers
    drawable_dir = os.path.join(RES_DIR, 'drawable')
    os.makedirs(drawable_dir, exist_ok=True)
    icon_512 = make_launcher_icon(512, shape='round')
    icon_512.save(os.path.join(drawable_dir, 'ic_launcher.png'), format='PNG')
    icon_512.save(os.path.join(drawable_dir, 'icon.png'), format='PNG')
    print("  [OK] Generated drawable/ic_launcher.png and drawable/icon.png")

    for folder, sizes in densities.items():
        d_name = folder.replace('mipmap-', 'drawable-')
        d_path = os.path.join(RES_DIR, d_name)
        os.makedirs(d_path, exist_ok=True)
        l_size = sizes['launcher']
        d_icon = make_launcher_icon(l_size, shape='round')
        d_icon.save(os.path.join(d_path, 'ic_launcher.png'), format='PNG')
        d_icon.save(os.path.join(d_path, 'icon.png'), format='PNG')
        print(f"  [OK] Generated {d_name}/ic_launcher.png")

    # 5. Write clean adaptive icon XML
    adaptive_xml = '''<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/iconBackground"/>
    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
</adaptive-icon>
'''
    anydpi_dir = os.path.join(RES_DIR, 'mipmap-anydpi-v26')
    os.makedirs(anydpi_dir, exist_ok=True)
    with open(os.path.join(anydpi_dir, 'ic_launcher.xml'), 'w', encoding='utf-8') as f:
        f.write(adaptive_xml)
    with open(os.path.join(anydpi_dir, 'ic_launcher_round.xml'), 'w', encoding='utf-8') as f:
        f.write(adaptive_xml)
    print("  [OK] Wrote clean adaptive-icon XML in mipmap-anydpi-v26")

    # 6. Update colors.xml
    colors_path = os.path.join(RES_DIR, 'values', 'colors.xml')
    if os.path.exists(colors_path):
        with open(colors_path, 'r', encoding='utf-8') as f:
            colors_content = f.read()
        import re
        colors_content = re.sub(r'<color name="iconBackground">.*?</color>', f'<color name="iconBackground">{BG_HEX}</color>', colors_content)
        with open(colors_path, 'w', encoding='utf-8') as f:
            f.write(colors_content)
        print(f"  [OK] Updated colors.xml with iconBackground = {BG_HEX}")

    print("\nAll assets and native Android icons generated with 100% PNG compliance!")

if __name__ == '__main__':
    main()
