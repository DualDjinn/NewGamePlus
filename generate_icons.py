"""Generate placeholder icons for gameFlix (Pillow required)."""
import os
from PIL import Image, ImageDraw, ImageFont

SIZES = {
    "32x32.png": 32,
    "128x128.png": 128,
    "128x128@2x.png": 256,
}
ICO_SIZES = [16, 32, 48, 64, 128, 256]

def make_icon(size):
    img = Image.new("RGB", (size, size), "#0a0a0a")
    draw = ImageDraw.Draw(img)
    # red circle background
    margin = size // 6
    draw.ellipse([margin, margin, size - margin, size - margin], fill="#e50914")
    # GF text
    try:
        font = ImageFont.truetype("arial.ttf", size // 3)
    except OSError:
        font = ImageFont.load_default()
    text = "GF"
    bbox = draw.textbbox((0, 0), text, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    draw.text(((size - tw) / 2, (size - th) / 2 - bbox[1]), text, fill="white", font=font)
    return img

def main():
    icons_dir = os.path.join(os.path.dirname(__file__), "src-tauri", "icons")
    os.makedirs(icons_dir, exist_ok=True)

    for name, size in SIZES.items():
        img = make_icon(size)
        img.save(os.path.join(icons_dir, name))
        print(f"  {name} ({size}x{size})")

    # .ico with multiple sizes
    imgs = [make_icon(s) for s in ICO_SIZES]
    ico_path = os.path.join(icons_dir, "icon.ico")
    imgs[0].save(ico_path, format="ICO", sizes=[(s, s) for s in ICO_SIZES], append_images=imgs[1:])
    print(f"  icon.ico ({', '.join(str(s) for s in ICO_SIZES)}px)")

    # .icns — just copy 256px png as fallback (macOS)
    imgs[-1].save(os.path.join(icons_dir, "icon.icns"), format="ICNS")
    print(f"  icon.icns")

    print("Done. Icons in src-tauri/icons/")

if __name__ == "__main__":
    main()
