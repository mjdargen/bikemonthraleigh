import os
import re
import unicodedata
from PIL import Image

BASE_DIR = os.path.dirname(os.path.realpath(__file__))
INPUT_DIR = os.path.join(BASE_DIR, "../assets/partners")  # change if needed
OUTPUT_DIR = INPUT_DIR  # or use a separate folder

QUALITY = 85
MAX_SIZE = None  # e.g. (512, 512) if you want resizing, else None


def normalize_filename(name):
    # Normalize accented characters to ASCII
    name = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode("ascii")
    # Lowercase
    name = name.lower()
    # Replace ampersand with "and"
    name = name.replace("&", " and ")
    # Replace underscores and whitespace with hyphens
    name = re.sub(r"[_\s]+", "-", name)
    # Remove anything that is not a letter, number, or hyphen
    name = re.sub(r"[^a-z0-9-]", "", name)
    # Collapse repeated hyphens
    name = re.sub(r"-{2,}", "-", name)
    # Trim leading/trailing hyphens
    name = name.strip("-")
    return name


def convert_to_webp(input_path, output_path):
    with Image.open(input_path) as img:
        if img.mode in ("RGBA", "LA") or "transparency" in img.info:
            img = img.convert("RGBA")
        else:
            img = img.convert("RGB")

        if MAX_SIZE:
            img.thumbnail(MAX_SIZE, Image.LANCZOS)

        img.save(output_path, "WEBP", quality=QUALITY, method=6, optimize=True)


def convert_images(input_dir=INPUT_DIR, output_dir=OUTPUT_DIR):
    seen_outputs = set()

    for filename in os.listdir(input_dir):
        if not filename.lower().endswith((".png", ".jpg", ".jpeg")):
            continue

        input_path = os.path.join(input_dir, filename)
        original_name, _ = os.path.splitext(filename)
        normalized_name = normalize_filename(original_name)
        output_filename = f"{normalized_name}.webp"
        output_path = os.path.join(output_dir, output_filename)

        if output_filename in seen_outputs:
            print(f"Skipping {filename}: duplicate normalized name -> {output_filename}")
            continue

        seen_outputs.add(output_filename)

        print(f"Converting: {filename} → {output_filename}")
        convert_to_webp(input_path, output_path)

    print("Done.")


if __name__ == "__main__":
    input_dir = os.path.join(BASE_DIR, "../assets/partners")
    output_dir = input_dir
    convert_images(input_dir, output_dir)
    input_dir = os.path.join(BASE_DIR, "../assets/sponsors")
    output_dir = input_dir
    convert_images(input_dir, output_dir)
    # input_dir = os.path.join(BASE_DIR, "../assets/events")
    # output_dir = input_dir
    # convert_images(input_dir, output_dir)
