from PIL import Image, ImageDraw, ImageFilter, ImageFont
import os, glob

SRC = '/Volumes/external/Bangla/bangla-ecommerce/docs/brand/products/'
OUT = '/private/tmp/claude-501/-Volumes-external-Bangla/fda731e5-217c-40c1-9b16-6d5220b74ef0/scratchpad/banners'
os.makedirs(OUT, exist_ok=True)

W, H = 2000, 1000
SAFE_X0, SAFE_X1, SAFE_Y0, SAFE_Y1 = 210, 1790, 150, 850
GREEN_D, GREEN, GREEN_L = (14,110,54), (18,138,68), (22,168,84)
RED, CREAM, WHITE = (236,31,40), (250,247,240), (255,255,255)
AV = "/System/Library/Fonts/Avenir Next.ttc"
def f(sz, idx=8): return ImageFont.truetype(AV, sz, index=idx)   # 8=Heavy 2=Demi 5=Medium 7=Regular

def bg():
    """Diagonal brand-green wash with a soft radial lift, so the cards have something to sit on."""
    g = Image.new('RGB', (W, H), GREEN)
    d = ImageDraw.Draw(g)
    for y in range(H):
        t = y / H
        d.line([(0, y), (W, y)], fill=(
            int(GREEN_D[0]+(GREEN[0]-GREEN_D[0])*t),
            int(GREEN_D[1]+(GREEN[1]-GREEN_D[1])*t),
            int(GREEN_D[2]+(GREEN[2]-GREEN_D[2])*t)))
    glow = Image.new('L', (W, H), 0)
    ImageDraw.Draw(glow).ellipse([W*0.42, -H*0.5, W*1.25, H*1.35], fill=120)
    g = Image.composite(Image.new('RGB', (W, H), GREEN_L), g, glow.filter(ImageFilter.GaussianBlur(220)))
    return g

def card(path, cw, ch, radius=34, angle=0):
    """Cover-crop a product photo into a rounded card with a drop shadow."""
    im = Image.open(path).convert('RGB')
    s = max(cw/im.width, ch/im.height)
    im = im.resize((int(im.width*s)+1, int(im.height*s)+1), Image.LANCZOS)
    im = im.crop(((im.width-cw)//2, (im.height-ch)//2,
                  (im.width-cw)//2+cw, (im.height-ch)//2+ch))
    mask = Image.new('L', (cw, ch), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, cw-1, ch-1], radius, fill=255)
    out = Image.new('RGBA', (cw, ch), (0,0,0,0)); out.paste(im, (0,0), mask)
    # thin light edge so the card separates from the green
    ImageDraw.Draw(out).rounded_rectangle([0,0,cw-1,ch-1], radius, outline=(255,255,255,70), width=3)
    if angle: out = out.rotate(angle, resample=Image.BICUBIC, expand=True)
    pad = 60
    sh = Image.new('RGBA', (out.width+pad*2, out.height+pad*2), (0,0,0,0))
    shm = out.split()[3].point(lambda a: int(a*0.55))
    blk = Image.new('RGBA', out.size, (0,0,0,255)); blk.putalpha(shm)
    sh.paste(blk, (pad, pad+18)); sh = sh.filter(ImageFilter.GaussianBlur(26))
    sh.paste(out, (pad, pad), out)
    return sh

def text_block(img, x, y, eyebrow, head_lines, sub):
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([x, y, x+118, y+9], 5, fill=RED)
    yy = y + 40
    d.text((x, yy), eyebrow, font=f(34, 2), fill=(196,240,214), spacing=0)
    yy += 66
    for ln in head_lines:
        d.text((x, yy), ln, font=f(104, 8), fill=WHITE)
        yy += 116
    yy += 34
    for ln in sub:
        d.text((x, yy), ln, font=f(38, 5), fill=(205,238,219))
        yy += 54
    return yy

# ---------------------------------------------------------------- banner 1
b = bg()
shirts = [f'{SRC}Mens Short Sleeve Shirts{i}.jpeg' for i in (2,1,3)]
for i, (p, ang, cx, cy, sc) in enumerate(zip(
        shirts, (7,-3,5), (1120,1395,1645), (585,535,595), (0.70,0.82,0.66))):
    c = card(p, int(390*sc), int(560*sc), 30, ang)
    b.paste(c, (cx-c.width//2, cy-c.height//2), c)
text_block(b, 258, 372, "NEW IN  ·  SUMMER 2026",
           ["Men's Short", "Sleeve Shirts"],
           ["Block prints in summer shirting.", "Sizes M to XXL."])
b.save(f'{OUT}/header-1-mens-shirts.jpg', quality=92, optimize=True)

# ---------------------------------------------------------------- banner 2
b = bg()
polos = [f'{SRC}Boys Polo Shirts{i}.jpeg' for i in (1,2)]
for p, ang, cx, cy, sc in zip(polos, (-5,6), (1285,1580), (565,580), (0.84,0.78)):
    c = card(p, int(430*sc), int(600*sc), 30, ang)
    b.paste(c, (cx-c.width//2, cy-c.height//2), c)
text_block(b, 258, 372, "KIDS  ·  100% COTTON",
           ["Boys Polo", "Shirts"],
           ["Striped pique polos, 100% cotton.", "Ages 4 to 11."])
b.save(f'{OUT}/header-2-boys-polo.jpg', quality=92, optimize=True)

# ---------------------------------------------------------------- banner 3 (brand)
b = bg()
logo = Image.open('/Volumes/external/Bangla/bangla-ecommerce/frontend/public/logo-transparent.png').convert('RGBA')
logo.thumbnail((450, 450), Image.LANCZOS)
# The logo is brand-green on a brand-green field, so it needs a light plate to read at all.
plate = Image.new('RGBA', (W, H), (0,0,0,0))
pd = ImageDraw.Draw(plate)
cx, cy, r = 1545, 545, 272
pd.ellipse([cx-r-16, cy-r-10, cx+r+16, cy+r+22], fill=(0,0,0,70))
plate = plate.filter(ImageFilter.GaussianBlur(30))
pd = ImageDraw.Draw(plate)
pd.ellipse([cx-r, cy-r, cx+r, cy+r], fill=CREAM+(255,))
b.paste(plate, (0,0), plate)
b.paste(logo, (cx-logo.width//2, cy-logo.height//2), logo)
d = ImageDraw.Draw(b)
d.rounded_rectangle([258, 360, 376, 369], 5, fill=RED)
d.text((258, 400), "SYLHET  ·  SINCE 1 SEPTEMBER 2007", font=f(34,2), fill=(196,240,214))
d.text((258, 466), "A Fashion House", font=f(104,8), fill=WHITE)
d.text((258, 582), "of Deshi Brand", font=f(104,8), fill=WHITE)
d.text((258, 736), "Traditional and everyday wear, top to bottom.", font=f(38,5), fill=(205,238,219))
d.text((258, 790), "Retail and wholesale  ·  Three branches in Sylhet", font=f(38,5), fill=(205,238,219))
b.save(f'{OUT}/header-3-brand.jpg', quality=92, optimize=True)

for p in sorted(glob.glob(f'{OUT}/*.jpg')):
    im = Image.open(p); print(f"  {os.path.basename(p):30} {im.size}  {os.path.getsize(p)//1024} KB")


# ---- verify: render what each viewport actually shows -------------------
def crop_to(im, ratio):
    w, h = im.size
    if w/h > ratio:  # too wide -> crop sides
        nw = int(h*ratio); return im.crop(((w-nw)//2, 0, (w-nw)//2+nw, h))
    nh = int(w/ratio); return im.crop((0, (h-nh)//2, w, (h-nh)//2+nh))

import glob as _g
for src in sorted(_g.glob(f'{OUT}/header-*.jpg')):
    base = os.path.basename(src).replace('.jpg','')
    im = Image.open(src)
    strip = Image.new('RGB', (1200, 1180), (24,24,24))
    y = 10
    for label, ratio in [("mobile 16:10", 16/10), ("tablet 2:1", 2.0), ("desktop ~2.8:1", 2.8)]:
        c = crop_to(im, ratio); c.thumbnail((1180, 600), Image.LANCZOS)
        strip.paste(c, (10, y)); 
        ImageDraw.Draw(strip).text((16, y+c.height+4), label, fill=(230,230,230))
        y += c.height + 26
    strip.crop((0,0,1200,y)).save(f'{OUT}/{base}-crops.png')
print("crop simulations written")
