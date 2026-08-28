import os
import pypdf

pdf_path = "/Users/asutoshsabat/.gemini/antigravity-ide/brain/ab75ad79-b9b0-45c8-898b-025e8067148a/media__1787944201153.pdf"
out_dir = "/Users/asutoshsabat/ANTBOX/antbox-hrms/scratch/extracted_pdf_imgs"
os.makedirs(out_dir, exist_ok=True)

reader = pypdf.PdfReader(pdf_path)
print("Total pages:", len(reader.pages))

count = 0
for idx, page in enumerate(reader.pages):
    for img_idx, img_obj in enumerate(page.images):
        ext = os.path.splitext(img_obj.name)[1] or ".png"
        out_path = os.path.join(out_dir, f"p{idx+1}_img{img_idx+1}{ext}")
        with open(out_path, "wb") as f:
            f.write(img_obj.data)
        print(f"Saved: {out_path} ({len(img_obj.data)} bytes)")
        count += 1

print("Extraction complete. Total images extracted:", count)
