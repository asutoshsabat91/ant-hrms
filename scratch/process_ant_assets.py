import os
from PIL import Image

dir_path = "/Users/asutoshsabat/ANTBOX/antbox-hrms/scratch/extracted_pdf_imgs"
out_dir = "/Users/asutoshsabat/ANTBOX/antbox-hrms/public/ants"
os.makedirs(out_dir, exist_ok=True)

def make_transparent(img_path, output_path, tolerance=240):
    with Image.open(img_path) as img:
        img = img.convert("RGBA")
        datas = img.getdata()

        newData = []
        for item in datas:
            # If pixel is white background
            if item[0] > tolerance and item[1] > tolerance and item[2] > tolerance:
                newData.append((255, 255, 255, 0))
            else:
                newData.append(item)

        img.putdata(newData)
        img.save(output_path, "PNG")
        print(f"Processed transparent PNG: {output_path} ({img.size})")

for i in range(1, 7):
    src = os.path.join(dir_path, f"p23_img{i}.png")
    if os.path.exists(src):
        dst = os.path.join(out_dir, f"highres_ant_{i}.png")
        make_transparent(src, dst)
