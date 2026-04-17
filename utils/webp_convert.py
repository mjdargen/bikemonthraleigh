import os
from PIL import Image

BASE_DIR = os.path.dirname(os.path.realpath(__file__))
INPUT_DIR = os.path.join(BASE_DIR, "../assets/sponsors")  # change if needed
OUTPUT_DIR = INPUT_DIR  # or use a separate folder

QUALITY = 85  # 80–90 is a good balance
MAX_SIZE = None  # e.g. (512, 512) if you want resizing, else None


def convert_to_webp(input_path, output_path):
    with Image.open(input_path) as img:
        # If image has transparency info, convert to RGBA
        if img.mode in ("RGBA", "LA") or "transparency" in img.info:
            img = img.convert("RGBA")
        else:
            img = img.convert("RGB")

        if MAX_SIZE:
            img.thumbnail(MAX_SIZE, Image.LANCZOS)

        img.save(output_path, "WEBP", quality=QUALITY, method=6, optimize=True)


def main():
    for filename in os.listdir(INPUT_DIR):
        if not filename.lower().endswith((".png", ".jpg", ".jpeg")):
            continue

        input_path = os.path.join(INPUT_DIR, filename)

        name, _ = os.path.splitext(filename)
        output_path = os.path.join(OUTPUT_DIR, f"{name}.webp")

        print(f"Converting: {filename} → {name}.webp")
        convert_to_webp(input_path, output_path)

    print("Done.")


if __name__ == "__main__":
    main()
