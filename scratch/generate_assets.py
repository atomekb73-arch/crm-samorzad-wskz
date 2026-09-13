import os
from PIL import Image, ImageDraw, ImageFont

src_path = r'C:/Users/User/.gemini/antigravity/brain/2b6ba937-95da-4c5e-bb2d-eb02723ef0f9/.user_uploaded/media_1789328654707.png'
public_dir = r'public'
os.makedirs(public_dir, exist_ok=True)

logo_raw = Image.open(src_path).convert('RGBA')

# Function to create an app icon with dark navy bg
def make_square_icon(size, bg_color=(11, 25, 44, 255), padding_ratio=0.12):
    img = Image.new('RGBA', (size, size), bg_color)
    
    # Calculate logo target size keeping aspect ratio
    inner_size = int(size * (1 - 2 * padding_ratio))
    w, h = logo_raw.size
    scale = min(inner_size / w, inner_size / h)
    new_w, new_h = int(w * scale), int(h * scale)
    
    resized_logo = logo_raw.resize((new_w, new_h), Image.Resampling.LANCZOS)
    
    # Center the logo
    x = (size - new_w) // 2
    y = (size - new_h) // 2
    img.paste(resized_logo, (x, y), resized_logo)
    return img

# 1. apple-touch-icon.png (180x180)
icon_180 = make_square_icon(180, bg_color=(11, 25, 44, 255), padding_ratio=0.12)
icon_180.save(os.path.join(public_dir, 'apple-touch-icon.png'), 'PNG')
print("Generated apple-touch-icon.png")

# 2. icon-192.png (192x192)
icon_192 = make_square_icon(192, bg_color=(11, 25, 44, 255), padding_ratio=0.12)
icon_192.save(os.path.join(public_dir, 'icon-192.png'), 'PNG')
print("Generated icon-192.png")

# 3. icon-512.png (512x512)
icon_512 = make_square_icon(512, bg_color=(11, 25, 44, 255), padding_ratio=0.12)
icon_512.save(os.path.join(public_dir, 'icon-512.png'), 'PNG')
print("Generated icon-512.png")

# 4. favicon.ico (multi-size)
favicon_sizes = [(16, 16), (32, 32), (48, 48), (64, 64)]
fav_icons = [make_square_icon(s[0], bg_color=(11, 25, 44, 255), padding_ratio=0.08).convert('RGBA') for s in favicon_sizes]
fav_icons[0].save(os.path.join(public_dir, 'favicon.ico'), format='ICO', sizes=favicon_sizes)
print("Generated favicon.ico")

# 5. og-image.png (1200x630)
og_width, og_height = 1200, 630
og = Image.new('RGBA', (og_width, og_height), (11, 25, 44, 255)) # #0b192c

draw = ImageDraw.Draw(og)

# Subtle background grid accents
for i in range(0, og_width, 60):
    draw.line([(i, 0), (i, og_height)], fill=(18, 38, 66, 255), width=1)
for j in range(0, og_height, 60):
    draw.line([(0, j), (og_width, j)], fill=(18, 38, 66, 255), width=1)

# Subtle accent top border (blue) and bottom border (emerald)
draw.rectangle([0, 0, og_width, 8], fill=(30, 58, 138, 255))
draw.rectangle([0, og_height - 8, og_width, og_height], fill=(16, 185, 129, 255))

# Logo Container on the left
logo_box_size = 420
logo_box_x = 90
logo_box_y = (og_height - logo_box_size) // 2

# Card background for logo
card_pad = 20
draw.rounded_rectangle(
    [logo_box_x - card_pad, logo_box_y - card_pad, logo_box_x + logo_box_size + card_pad, logo_box_y + logo_box_size + card_pad],
    radius=32,
    fill=(15, 33, 58, 255),
    outline=(40, 75, 125, 255),
    width=2
)

# Resize logo into logo box
w, h = logo_raw.size
scale = min((logo_box_size - 40) / w, (logo_box_size - 40) / h)
new_w, new_h = int(w * scale), int(h * scale)
resized_logo = logo_raw.resize((new_w, new_h), Image.Resampling.LANCZOS)
lx = logo_box_x + (logo_box_size - new_w) // 2
ly = logo_box_y + (logo_box_size - new_h) // 2
og.paste(resized_logo, (lx, ly), resized_logo)

# Load fonts
font_bold_path = r'C:/Windows/Fonts/segoeuib.ttf'
font_reg_path = r'C:/Windows/Fonts/segoeui.ttf'

font_tag = ImageFont.truetype(font_bold_path, 20)
font_title = ImageFont.truetype(font_bold_path, 48)
font_subtitle = ImageFont.truetype(font_reg_path, 26)
font_univ = ImageFont.truetype(font_bold_path, 24)

# Text placement on the right
tx = 570
ty = 130

# Tag badge: "SYSTEM KANCELARYJNY & AUDYT DANYCH"
tag_text = "SYSTEM KANCELARYJNY • AUDYT DANYCH"
draw.rounded_rectangle([tx, ty, tx + 460, ty + 38], radius=10, fill=(30, 58, 138, 220), outline=(59, 130, 246, 255), width=1)
draw.text((tx + 18, ty + 7), tag_text, fill=(219, 234, 254, 255), font=font_tag)

# Title: "Kancelaria Samorządu\nStudenckiego WSKZ"
draw.text((tx, ty + 65), "Kancelaria Samorządu\nStudenckiego WSKZ", fill=(255, 255, 255, 255), font=font_title, spacing=12)

# Divider line
draw.line([(tx, ty + 230), (tx + 540, ty + 230)], fill=(51, 65, 85, 255), width=2)

# Subtitle / Description
draw.text((tx, ty + 255), "Oficjalny Rejestr Pism, Zgłoszeń i Ustaleń", fill=(203, 213, 225, 255), font=font_subtitle)
draw.text((tx, ty + 300), "Wyższa Szkoła Kształcenia Zawodowego", fill=(52, 211, 153, 255), font=font_univ)

# Save OG image
og.convert('RGB').save(os.path.join(public_dir, 'og-image.png'), 'PNG', quality=95)
print("Generated og-image.png")

