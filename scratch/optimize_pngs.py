import os
from PIL import Image

ants_dir = "/Users/asutoshsabat/ANTBOX/antbox-hrms/public/ants"

for fname in os.listdir(ants_dir):
    if fname.endswith(".png"):
        path = os.path.join(ants_dir, fname)
        with Image.open(path) as img:
            # Resize if huge
            if img.size[0] > 600 or img.size[1] > 600:
                img.thumbnail((600, 600), Image.Resampling.LANCZOS)
            # Save compressed PNG
            img.save(path, "PNG", optimize=True)
            size_kb = os.path.getsize(path) / 1024.0
            print(f"Optimized {fname}: {img.size}, {size_kb:.1f} KB")

# Also delete temporary highres_ant_*.png files
for fname in os.listdir(ants_dir):
    if fname.startswith("highres_ant_"):
        os.remove(os.path.join(ants_dir, fname))
        print("Removed temp raw asset:", fname)
