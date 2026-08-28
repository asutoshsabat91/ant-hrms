import os
from PIL import Image

# Let's inspect bounding boxes of non-transparent content in highres_ant_1..6
out_dir = "/Users/asutoshsabat/ANTBOX/antbox-hrms/public/ants"

for i in range(1, 7):
    path = os.path.join(out_dir, f"highres_ant_{i}.png")
    with Image.open(path) as img:
        bbox = img.getbbox()
        print(f"highres_ant_{i}.png: Size={img.size}, BoundingBox={bbox}")
