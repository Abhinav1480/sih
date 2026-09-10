"""Copy the backend harbour list into the app bundle. Run from frontend/."""
import io
import re

src = io.open("../backend/app/geospatial/boundaries.py", encoding="utf-8").read()
rows = re.findall(r'"name":\s*"([^"]+)",\s*"latitude":\s*([\d.]+),\s*"longitude":\s*([\d.]+)', src)
out = [
    "/**",
    " * Coastal harbours, copied from backend/app/geospatial/boundaries.py by",
    " * tools/gen_harbours.py so the phone can find the nearest one with no network.",
    " * Reference data, not placeholder data: these are real harbour positions.",
    " */",
    "",
    "export interface Harbour { name: string; lat: number; lon: number }",
    "",
    "export const HARBOURS: Harbour[] = [",
]
out += [f'  {{ name: "{n}", lat: {la}, lon: {lo} }},' for n, la, lo in rows]
out.append("];")
out.append("")
io.open("src/lib/data/harbours.ts", "w", encoding="utf-8", newline="\n").write("\n".join(out))
print(len(rows), "harbours")
