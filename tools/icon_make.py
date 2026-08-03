# 生成小程序图标（1024 主图 + 144 上传尺寸）
# 用法：python tools/icon_make.py
from PIL import Image, ImageDraw, ImageFont

SIZE = 1024

def font(size, bold=True):
    path = r'C:\Windows\Fonts\msyhbd.ttc' if bold else r'C:\Windows\Fonts\msyh.ttc'
    return ImageFont.truetype(path, size)

def interpolate(c1, c2, t):
    return tuple(int(a + (b - a) * t) for a, b in zip(c1, c2))

# 圆角遮罩
mask = Image.new('L', (SIZE, SIZE), 0)
ImageDraw.Draw(mask).rounded_rectangle((0, 0, SIZE - 1, SIZE - 1), radius=200, fill=255)

# 橙色渐变背景（上浅下深，与 App 主题一致）
bg = Image.new('RGB', (SIZE, SIZE), '#FF7A1A')
bd = ImageDraw.Draw(bg)
top = (255, 177, 77)   # #FFB14D
bot = (255, 122, 26)   # #FF7A1A
for y in range(SIZE):
    bd.line([(0, y), (SIZE, y)], fill=interpolate(top, bot, y / (SIZE - 1)))

img = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
img.paste(bg, (0, 0), mask)
d = ImageDraw.Draw(img)

INK    = '#1F2329'
GRAY   = '#9AA0A6'
WHITE  = '#FFFFFF'
ORANGE = '#FF7A1A'
KEY_BG = '#F4F5F7'

# 计算器机身
d.rounded_rectangle((256, 202, 768, 822), radius=60, fill=WHITE)

# 显示屏
d.rounded_rectangle((296, 252, 728, 392), radius=28, fill=INK)
d.text((706, 322), '0.00', font=font(84), fill=WHITE, anchor='rm')

# 按键：2 列 × 3 行
keys = [
    [('+', GRAY, KEY_BG), ('-', GRAY, KEY_BG)],
    [('×', GRAY, KEY_BG), ('÷', GRAY, KEY_BG)],
    [('0', GRAY, KEY_BG), ('=', WHITE, ORANGE)],
]
col_x = [296, 510]
row_y = [432, 546, 660]
for ri, row in enumerate(keys):
    for ci, (label, fg, bg_color) in enumerate(row):
        x, y = col_x[ci], row_y[ri]
        d.rounded_rectangle((x, y, x + 190, y + 90), radius=24, fill=bg_color)
        d.text((x + 95, y + 46), label, font=font(66), fill=fg, anchor='mm')

img.save('assets/icon.png')
icon144 = img.resize((144, 144), Image.LANCZOS)
icon144.save('assets/icon-144.png')
print('saved: assets/icon.png (1024x1024), assets/icon-144.png (144x144)')
