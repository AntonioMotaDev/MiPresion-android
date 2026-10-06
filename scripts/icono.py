# Genera assets/ (ícono adaptativo, heredado y logo) a partir de la imagen que dio Antonio.
# Uso: python3 scripts/icono.py <imagen>  y luego npx capacitor-assets generate (ver CLAUDE.md)
import math
from PIL import Image, ImageDraw
import sys
SRC = sys.argv[1]  # imagen original del ícono (fondo de tablero de ajedrez, 1254x1254)
im = Image.open(SRC).convert('RGB')
X0,Y0,X1,Y1 = 114,129,1140,1135
R = 228
NAVY = (13,27,49)
S = 4

def rrect(inset, radius):
    m = Image.new('L', (1024*S,1024*S), 0)
    ImageDraw.Draw(m).rounded_rectangle((inset*S, inset*S, (1024-inset)*S-1, (1024-inset)*S-1), radius=radius*S, fill=255)
    return m.resize((1024,1024), Image.LANCZOS)

sq = im.crop((X0,Y0,X1,Y1)).resize((1024,1024), Image.LANCZOS)
clean = Image.composite(sq, Image.new('RGB',(1024,1024),NAVY), rrect(6, R-6))
rounded = clean.convert('RGBA'); rounded.putalpha(rrect(8, R-8))
rounded.save('assets/icon-rounded.png')
rounded.resize((192,192), Image.LANCZOS).save('src/assets/logo.png', optimize=True)
clean.save('assets/icon-only.png')

px = clean.load()
inside = rrect(48, R-48).load()
fg = Image.new('RGBA',(1024,1024))
fp = fg.load()
for y in range(1024):
    t = y/1023
    bg = tuple(round(a+(b-a)*t) for a,b in zip((15,30,52),(10,22,43)))
    for x in range(1024):
        if inside[x,y] < 255:
            fp[x,y] = (0,0,0,0)
            continue
        p = px[x,y]
        a = 0.0
        for c in range(3):
            if p[c] > bg[c]: a = max(a, max(0, p[c]-bg[c]-7)/(255-bg[c]))
            elif p[c] < bg[c]: a = max(a, max(0, bg[c]-p[c]-7)/bg[c])
        a = min(1.0, a*1.15)
        if a < 0.08:
            fp[x,y] = (0,0,0,0)
            continue
        col = tuple(max(0, min(255, round((p[c]-bg[c]*(1-a))/a))) for c in range(3))
        fp[x,y] = col + (round(a*255),)
bbox = fg.getchannel('A').point(lambda v: 255 if v > 40 else 0).getbbox(); print('bbox arte', bbox)
art = fg.crop(bbox)
w,h = art.size
scale = (0.97*1024) / math.hypot(w,h)
art = art.resize((round(w*scale), round(h*scale)), Image.LANCZOS)
out = Image.new('RGBA',(1024,1024),(0,0,0,0))
out.paste(art, ((1024-art.size[0])//2, (1024-art.size[1])//2), art)
out.save('assets/icon-foreground.png')
Image.new('RGB',(1024,1024),NAVY).save('assets/icon-background.png')
print('ok', art.size)
