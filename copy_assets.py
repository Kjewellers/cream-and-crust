import shutil
import os

src_sheet = r"C:\Users\poona\.gemini\antigravity\brain\73a563c0-308b-49e2-84f1-90945888cf19\media__1779374358873.jpg"
src_dash = r"C:\Users\poona\.gemini\antigravity\brain\73a563c0-308b-49e2-84f1-90945888cf19\media__1779373837815.jpg"

dest_dir = r"c:\Users\poona\.gemini\antigravity\scratch\cream-and-crust\public\assets\lumi"

try:
    if not os.path.exists(dest_dir):
        os.makedirs(dest_dir)
        print("Created assets folder!")

    shutil.copy2(src_sheet, os.path.join(dest_dir, "sheet.jpg"))
    print("Copied character sheet successfully!")

    shutil.copy2(src_dash, os.path.join(dest_dir, "dashboard.jpg"))
    print("Copied dashboard mockup successfully!")

except Exception as e:
    print(f"Error transferring assets: {e}")
