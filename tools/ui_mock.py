# 生成小程序界面示意图（仅用于预览布局，非小程序运行代码）
# 用法：python tools/ui_mock.py <输出PNG路径>
import sys
from PIL import Image, ImageDraw, ImageFont

S = 2  # 2x 缩放，保证文字清晰

def font(size, bold=False):
    path = r'C:\Windows\Fonts\msyhbd.ttc' if bold else r'C:\Windows\Fonts\msyh.ttc'
    return ImageFont.truetype(path, int(size * S))

def rr(d, box, r, fill=None, outline=None, width=1):
    d.rounded_rectangle([c * S for c in box], radius=r * S, fill=fill,
                        outline=outline, width=max(1, int(width * S)))

def text(d, xy, s, fnt, fill, anchor='la'):
    d.text((xy[0] * S, xy[1] * S), s, font=fnt, fill=fill, anchor=anchor)

def tw(d, s, fnt):
    return d.textlength(s, font=fnt) / S

# 颜色
PAGE    = '#F4F5F7'
WHITE   = '#FFFFFF'
TEXT    = '#1F2329'
GRAY    = '#9AA0A6'
MID     = '#6B7280'
ORANGE  = '#FF7A1A'
ORANGE_BG = '#FFF1E6'
GREEN   = '#17A952'
SEG_BG  = '#E8EAEE'
FUNC_BG = '#E8EAEE'
NUM_BG  = '#F4F5F7'
NOTE_BG = '#F7F8FA'

def draw_phone(d, x0):
    rr(d, (x0, 0, x0 + 375, 812), 36, fill=WHITE, outline='#E4E7EB', width=2)

def status_bar(d, x0):
    text(d, (x0 + 18, 9), '9:41', font(13), TEXT)
    rr(d, (x0 + 340, 12, x0 + 362, 22), 4, fill='#B3B8BF')
    rr(d, (x0 + 344, 15, x0 + 357, 19), 1, fill=TEXT)

def nav_bar(d, x0, title='随随随记'):
    rr(d, (x0, 20, x0 + 375, 64), 0, fill=WHITE)
    text(d, (x0 + 187, 44), title, font(17, True), TEXT, anchor='mm')
    d.line([(x0 + 12) * S, 64 * S, (x0 + 363) * S, 64 * S], fill='#EEF0F2', width=S)

def seg_control(d, x0, active):
    rr(d, (x0 + 16, 72, x0 + 359, 106), 10, fill=SEG_BG)
    for i, name in enumerate(['记一笔', '明细', '统计']):
        x = x0 + 20 + i * 112
        on = name == active
        rr(d, (x, 76, x + 111, 102), 8, fill=WHITE if on else None)
        text(d, (x + 55, 89), name, font(13, on), ORANGE if on else MID, anchor='mm')

def chip(d, x0, x, y, label, on=False, h=30, pad=12):
    f = font(12, on)
    w = tw(d, label, f) + pad * 2
    rr(d, (x0 + x, y, x0 + x + w, y + h), h / 2,
       fill=ORANGE_BG if on else WHITE,
       outline='#FFB37A' if on else '#E8EAEE',
       width=1)
    text(d, (x0 + x + w / 2, y + h / 2), label, f,
         ORANGE if on else MID, anchor='mm')
    return w

def record_row(d, x0, y, name, note, amount, income=False):
    rr(d, (x0 + 28, y + 18, x0 + 64, y + 54), 18, fill=NUM_BG)
    text(d, (x0 + 46, y + 36), name[0], font(15), MID, anchor='mm')
    text(d, (x0 + 78, y + 24), name, font(13, True), TEXT)
    text(d, (x0 + 78, y + 43), note, font(11), GRAY)
    text(d, (x0 + 347, y + 36), amount, font(14, True),
         GREEN if income else TEXT, anchor='rm')

def draw_calc_screen(d, x0):
    draw_phone(d, x0)
    status_bar(d, x0)
    nav_bar(d, x0)
    seg_control(d, x0, '记一笔')

    # 显示屏（含日期选择行）
    rr(d, (x0 + 16, 116, x0 + 359, 222), 14, fill=WHITE)
    text(d, (x0 + 347, 134), '12.5 × 2 + 30', font(12), GRAY, anchor='rm')
    text(d, (x0 + 347, 174), '55.00', font(34, True), TEXT, anchor='rm')
    d.line([(x0 + 28) * S, 190 * S, (x0 + 347) * S, 190 * S], fill='#F0F1F3', width=S)
    text(d, (x0 + 30, 206), '日期：今天', font(12, True), TEXT, anchor='lm')
    text(d, (x0 + 345, 206), '›', font(16), GRAY, anchor='rm')

    # 类型 + 分类 + 备注
    rr(d, (x0 + 16, 232, x0 + 359, 398), 14, fill=WHITE)
    rr(d, (x0 + 28, 244, x0 + 347, 274), 8, fill='#F2F3F5')
    rr(d, (x0 + 32, 248, x0 + 180, 270), 6, fill=ORANGE_BG)
    text(d, (x0 + 106, 259), '支出', font(13, True), ORANGE, anchor='mm')
    text(d, (x0 + 264, 259), '收入', font(13), MID, anchor='mm')

    row1 = ['餐饮', '交通', '购物', '娱乐']
    row2 = ['居住', '医疗', '教育', '其他']
    cx = 28
    for i, name in enumerate(row1):
        w = chip(d, x0, cx, 286, name, on=(i == 0))
        cx += w + 8
    cx = 28
    for name in row2:
        w = chip(d, x0, cx, 328, name)
        cx += w + 8
    rr(d, (x0 + 28, 364, x0 + 347, 396), 9, fill=NOTE_BG)
    text(d, (x0 + 40, 380), '备注（可选）', font(12), GRAY, anchor='lm')

    # 键盘
    rr(d, (x0 + 16, 408, x0 + 359, 800), 14, fill=WHITE)
    keys = [
        [('C', 'fn'), ('⌫', 'fn'), ('÷', 'op'), ('×', 'op')],
        [('7', 'num'), ('8', 'num'), ('9', 'num'), ('-', 'op')],
        [('4', 'num'), ('5', 'num'), ('6', 'num'), ('+', 'op')],
        [('1', 'num'), ('2', 'num'), ('3', 'num'), ('=', 'op')],
        [('0', 'num'), ('.', 'num'), ('记一笔', 'save')],
    ]
    row_h = 65
    for ri, row in enumerate(keys):
        y = 420 + ri * (row_h + 10)
        x = 28
        for label, kind in row:
            w = 2 if label == '记一笔' else 1
            bw = ((343 - 24) - 3 * 10) / 4 * w + (10 if w == 2 else 0)
            if kind == 'fn':
                rr(d, (x0 + x, y, x0 + x + bw, y + row_h), 13, fill=FUNC_BG)
                text(d, (x0 + x + bw / 2, y + row_h / 2), label,
                     font(16), MID, anchor='mm')
            elif kind == 'op':
                rr(d, (x0 + x, y, x0 + x + bw, y + row_h), 13, fill=ORANGE_BG)
                text(d, (x0 + x + bw / 2, y + row_h / 2), label,
                     font(18, True), ORANGE, anchor='mm')
            elif kind == 'save':
                rr(d, (x0 + x, y, x0 + x + bw, y + row_h), 13, fill=ORANGE)
                text(d, (x0 + x + bw / 2, y + row_h / 2), label,
                     font(15, True), WHITE, anchor='mm')
            else:
                rr(d, (x0 + x, y, x0 + x + bw, y + row_h), 13, fill=NUM_BG)
                text(d, (x0 + x + bw / 2, y + row_h / 2), label,
                     font(20), TEXT, anchor='mm')
            x += bw + 10

def draw_records_screen(d, x0):
    draw_phone(d, x0)
    status_bar(d, x0)
    nav_bar(d, x0)
    seg_control(d, x0, '明细')

    # 月汇总
    rr(d, (x0 + 16, 116, x0 + 359, 204), 14, fill=WHITE)
    cols = [('本月收入', '+1,500.00', GREEN), ('本月支出', '-820.50', ORANGE),
            ('本月结余', '+679.50', TEXT)]
    for i, (label, val, color) in enumerate(cols):
        cx = 62 + i * 125
        text(d, (x0 + cx, 134), label, font(11), GRAY, anchor='mm')
        text(d, (x0 + cx, 164), val, font(15, True), color, anchor='mm')
        if i < 2:
            d.line([(x0 + cx + 62) * S, 132 * S, (x0 + cx + 62) * S, 188 * S],
                   fill='#F0F1F3', width=S)

    # 今天 / 昨天
    rr(d, (x0 + 16, 216, x0 + 359, 288), 14, fill=WHITE)
    days = [('今天', '-40.00', '+1,500.00'), ('昨天', '-20.00', '')]
    for i, (label, exp, inc) in enumerate(days):
        cx = 62 + i * 125
        text(d, (x0 + cx, 232), label, font(11), GRAY, anchor='mm')
        text(d, (x0 + cx, 258), exp, font(17, True), ORANGE, anchor='mm')
        if inc:
            text(d, (x0 + cx, 277), inc, font(10), GREEN, anchor='mm')
        if i == 0:
            d.line([(x0 + 124) * S, 228 * S, (x0 + 124) * S, 284 * S],
                   fill='#F0F1F3', width=S)

    # 筛选
    chip(d, x0, 16, 302, '全部', on=True)
    chip(d, x0, 96, 302, '支出')
    chip(d, x0, 164, 302, '收入')

    # 今天列表
    text(d, (x0 + 16, 348), '今天', font(12), GRAY)
    rr(d, (x0 + 16, 364, x0 + 359, 580), 14, fill=WHITE)
    record_row(d, x0, 370, '餐饮', '早餐 12.5×2+5', '-30.00')
    record_row(d, x0, 442, '交通', '地铁', '-3.00')
    record_row(d, x0, 514, '工资', '8 月工资', '+1,500.00', income=True)

    # 昨天及更早显示具体日期
    text(d, (x0 + 16, 600), '8月2日', font(12), GRAY)
    rr(d, (x0 + 16, 616, x0 + 359, 688), 14, fill=WHITE)
    record_row(d, x0, 622, '购物', '日用品', '-199.00')

    text(d, (x0 + 187, 740), '清空全部数据', font(11), '#B3B8BF', anchor='mm')

def draw_stats_screen(d, x0):
    draw_phone(d, x0)
    status_bar(d, x0)
    nav_bar(d, x0)
    seg_control(d, x0, '统计')

    # 周期切换
    rr(d, (x0 + 58, 84, x0 + 318, 118), 10, fill=SEG_BG)
    rr(d, (x0 + 63, 89, x0 + 187, 113), 7, fill=WHITE)
    text(d, (x0 + 125, 101), '今天', font(12, True), ORANGE, anchor='mm')
    text(d, (x0 + 251, 101), '本月', font(12), MID, anchor='mm')

    # 支出分类总计
    rr(d, (x0 + 16, 130, x0 + 359, 340), 14, fill=WHITE)
    text(d, (x0 + 30, 150), '支出分类总计', font(13, True), '#4B5563', anchor='lm')
    text(d, (x0 + 345, 150), '820.50', font(16, True), ORANGE, anchor='rm')
    exp_rows = [('餐饮', 56), ('购物', 22), ('交通', 15), ('其他', 7)]
    for i, (name, pct) in enumerate(exp_rows):
        y = 168 + i * 42
        rr(d, (x0 + 28, y + 8, x0 + 64, y + 44), 18, fill=NUM_BG)
        text(d, (x0 + 46, y + 26), name[0], font(14), MID, anchor='mm')
        text(d, (x0 + 78, y + 10), name, font(12, True), TEXT, anchor='lm')
        bar_w = 182 * pct / 100
        rr(d, (x0 + 78, y + 28, x0 + 78 + bar_w, y + 34), 3, fill=ORANGE)
        text(d, (x0 + 345, y + 26), str(pct) + '%', font(12), GRAY, anchor='rm')

    # 收入分类总计
    rr(d, (x0 + 16, 352, x0 + 359, 472), 14, fill=WHITE)
    text(d, (x0 + 30, 372), '收入分类总计', font(13, True), '#4B5563', anchor='lm')
    text(d, (x0 + 345, 372), '1,800.00', font(16, True), GREEN, anchor='rm')
    for i, (name, pct) in enumerate([('工资', 83), ('红包', 17)]):
        y = 390 + i * 42
        rr(d, (x0 + 28, y + 8, x0 + 64, y + 44), 18, fill=NUM_BG)
        text(d, (x0 + 46, y + 26), name[0], font(14), MID, anchor='mm')
        text(d, (x0 + 78, y + 10), name, font(12, True), TEXT, anchor='lm')
        bar_w = 182 * pct / 100
        rr(d, (x0 + 78, y + 28, x0 + 78 + bar_w, y + 34), 3, fill=GREEN)
        text(d, (x0 + 345, y + 26), str(pct) + '%', font(12), GRAY, anchor='rm')

def main():
    out = sys.argv[1] if len(sys.argv) > 1 else 'ui_mock.png'
    W, H = 1200, 812
    img = Image.new('RGB', (W * S, H * S), '#EDEFF2')
    d = ImageDraw.Draw(img)
    draw_calc_screen(d, 12)
    draw_records_screen(d, 412)
    draw_stats_screen(d, 812)
    img.save(out)
    print('saved:', out)

if __name__ == '__main__':
    main()
