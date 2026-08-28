import os
from PIL import Image

dir_path = "/Users/asutoshsabat/ANTBOX/antbox-hrms/scratch/extracted_pdf_imgs"
for filename in sorted(os.listdir(dir_path)):
    if filename.startswith("p23_img"):
        filepath = os.path.join(dir_path, filename)
        with Image.open(filepath) as img:
            print(f"{filename}: Mode={img.mode}, Size={img.size}, Format={img.format}")
