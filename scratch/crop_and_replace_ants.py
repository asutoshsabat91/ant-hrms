import os
from PIL import Image, ImageEnhance, ImageOps

pdf_img_dir = "/Users/asutoshsabat/ANTBOX/antbox-hrms/scratch/extracted_pdf_imgs"
out_dir = "/Users/asutoshsabat/ANTBOX/antbox-hrms/public/ants"
os.makedirs(out_dir, exist_ok=True)

def make_crisp_transparent(img, tolerance=235):
    img = img.convert("RGBA")
    datas = img.getdata()
    newData = []
    for item in datas:
        # White background removal with smooth alpha edge for lineart
        avg = (item[0] + item[1] + item[2]) / 3.0
        if avg > tolerance:
            alpha = int(max(0, (255 - avg) * (255.0 / (255 - tolerance))))
            newData.append((item[0], item[1], item[2], alpha))
        else:
            newData.append((item[0], item[1], item[2], 255))
    img.putdata(newData)
    return img

# 1. Peeking Ant / Mascot Ant (highres_ant_6.png)
with Image.open(os.path.join(pdf_img_dir, "p23_img6.png")) as img:
    res = make_crisp_transparent(img)
    bbox = res.getbbox()
    if bbox:
        res = res.crop(bbox)
    res.save(os.path.join(out_dir, "peeking-ants.png"), "PNG", quality=100)
    print("Saved peeking-ants.png:", res.size)

# 2. Running Race / Colony Trail Ants (highres_ant_2.png)
with Image.open(os.path.join(pdf_img_dir, "p23_img2.png")) as img:
    res = make_crisp_transparent(img)
    bbox = res.getbbox()
    if bbox:
        res = res.crop(bbox)
    res.save(os.path.join(out_dir, "running-race-ants.png"), "PNG", quality=100)
    print("Saved running-race-ants.png:", res.size)

# 3. Deep Work Ant (highres_ant_1.png - Team / Desk Scene)
with Image.open(os.path.join(pdf_img_dir, "p23_img1.png")) as img:
    res = make_crisp_transparent(img)
    # Left ant at desk
    ant_desk = res.crop((100, 240, 440, 620))
    ant_desk.save(os.path.join(out_dir, "office-chair-sleep-ant.png"), "PNG", quality=100)
    print("Saved office-chair-sleep-ant.png:", ant_desk.size)

# 4. Daily Brew Ant (highres_ant_1.png - Right side Coffee Ant)
with Image.open(os.path.join(pdf_img_dir, "p23_img1.png")) as img:
    res = make_crisp_transparent(img)
    ant_coffee = res.crop((120, 520, 310, 780))
    ant_coffee.save(os.path.join(out_dir, "coffee-cup-ant.png"), "PNG", quality=100)
    print("Saved coffee-cup-ant.png:", ant_coffee.size)

# 5. Precision Analytics Ant (highres_ant_2.png - Robot / Tech Ant)
with Image.open(os.path.join(pdf_img_dir, "p23_img2.png")) as img:
    res = make_crisp_transparent(img)
    ant_tech = res.crop((80, 400, 340, 640))
    ant_tech.save(os.path.join(out_dir, "microscope-science-ant.png"), "PNG", quality=100)
    print("Saved microscope-science-ant.png:", ant_tech.size)

# 6. Goal Execution Ant (highres_ant_2.png - GTM / Idea Bulb Ant)
with Image.open(os.path.join(pdf_img_dir, "p23_img2.png")) as img:
    res = make_crisp_transparent(img)
    ant_idea = res.crop((660, 390, 950, 640))
    ant_idea.save(os.path.join(out_dir, "blueprints-walking-ant.png"), "PNG", quality=100)
    print("Saved blueprints-walking-ant.png:", ant_idea.size)

print("All crisp, high-res transparent ant assets generated successfully!")
