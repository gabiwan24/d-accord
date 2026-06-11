from PIL import Image
import os

path = r'C:\Users\Gabriel Weiss\.cursor\projects\c-Users-Gabriel-Weiss-Documents-Cursor-VibeCoding-ukuleleakkorde\assets\c__Users_Gabriel_Weiss_AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_image-e1b885d2-eae8-4ef0-a3e0-39d7e623cf83.png'
out = r'C:\Users\Gabriel Weiss\Documents\Cursor_VibeCoding\ukuleleakkorde\tmp_crops\cells'
os.makedirs(out, exist_ok=True)
img = Image.open(path).convert('RGB')

roots = ['C', 'D', 'E', 'F', 'G', 'A', 'B']
suffixes = ['', 'm', '7', 'm7', '6', 'm6', 'sus4', 'dim']

grid = {'left': 52, 'top': 228, 'right': 835, 'bottom': 1005}
cols = 8
rows = 7
cell_w = (grid['right'] - grid['left']) / cols
cell_h = (grid['bottom'] - grid['top']) / rows
diag = {'x0': 0.10, 'y0': 0.18, 'x1': 0.90, 'y1': 0.88}

for r in range(rows):
    for c in range(cols):
        cx0 = grid['left'] + c * cell_w
        cy0 = grid['top'] + r * cell_h
        dx0 = int(cx0 + cell_w * diag['x0'])
        dy0 = int(cy0 + cell_h * diag['y0'])
        dx1 = int(cx0 + cell_w * diag['x1'])
        dy1 = int(cy0 + cell_h * diag['y1'])
        crop = img.crop((dx0, dy0, dx1, dy1))
        crop = crop.resize((crop.width * 4, crop.height * 4), Image.Resampling.LANCZOS)
        name = f"{roots[r]}_{suffixes[c] if suffixes[c] else 'maj'}.png"
        crop.save(os.path.join(out, name))

print('saved', len(os.listdir(out)), 'cells')
