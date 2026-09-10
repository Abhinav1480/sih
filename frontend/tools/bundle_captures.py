"""Copy the frozen contract captures into the app bundle.

The app is built against docs/examples/ -- the real responses ORCA returned,
captured at contract 1.4.0 -- and never against a running backend. Rather than
reaching outside the frontend tree at build time, this copies the ones the
screens need into src/lib/data/captures/ as JSON modules, and writes an index
so a screen can pick a capture by the query it answered.

Generated. Re-run after `python backend/scripts/capture_contract_examples.py`
regenerates the captures; the freeze test on the backend side will already
have failed if the shape moved.
"""
import json
import pathlib
import sys

REPO = pathlib.Path(__file__).resolve().parents[2]
SRC = REPO / "docs" / "examples"
DST = REPO / "frontend" / "src" / "lib" / "data" / "captures"

def main() -> int:
    DST.mkdir(parents=True, exist_ok=True)
    index = []
    for path in sorted(SRC.glob("canonical-*.json")) + [SRC / "alerts.json", SRC / "conversation.json"]:
        if not path.is_file():
            continue
        doc = json.loads(path.read_text(encoding="utf-8"))
        (DST / path.name).write_text(json.dumps(doc, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
        entry = {"file": path.name, "contract": doc.get("_contract_version")}
        if "_request" in doc:
            entry["query"] = doc["_request"].get("query")
        index.append(entry)
    (DST / "index.json").write_text(json.dumps(index, indent=2, ensure_ascii=False), encoding="utf-8")
    total = sum(p.stat().st_size for p in DST.glob("*.json"))
    print(f"bundled {len(index)} captures, {total // 1024} KB, into {DST.relative_to(REPO)}")
    return 0

if __name__ == "__main__":
    sys.exit(main())
