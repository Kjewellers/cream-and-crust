from PIL import Image

im = Image.open(r"public/assets/lumi/sheet.jpg")
w, h = im.size
print(f"Sheet size: Width={w}, Height={h}")
