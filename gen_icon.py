from PIL import Image, ImageDraw

SIZE = 1024
NAVY = (16, 33, 59, 255)      # #10213B
WHITE = (255, 255, 255, 255)
SOFT = (255, 253, 252, 255)   # very subtle warm white for keyhole ring

img = Image.new("RGBA", (SIZE, SIZE), NAVY)
d = ImageDraw.Draw(img)

cx = SIZE // 2

# Shackle (thick top-half arc, open at bottom) sitting above the body
shackle_bbox = (cx - 150, 250, cx + 150, 550)
d.arc(shackle_bbox, start=0, end=180, fill=WHITE, width=78)

# Lock body (rounded rectangle)
body = (cx - 200, 470, cx + 200, 790)
d.rounded_rectangle(body, radius=66, fill=WHITE)

# Keyhole: navy circle + drop, on the white body
d.ellipse((cx - 46, 560, cx + 46, 652), fill=NAVY)
d.polygon([(cx - 26, 630), (cx + 26, 630), (cx + 16, 700), (cx - 16, 700)], fill=NAVY)

img.save("E:/XiangMu/ZHANGHAOBA/app-icon.png")
print("wrote app-icon.png")
