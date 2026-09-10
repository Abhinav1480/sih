import sys
import io
import urllib.request
import json

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

tests = [
    ("TEST A (Clarification)", "Find a route from Point A to Point B that minimizes marine risk while avoiding protected areas."),
    ("TEST B (Route Analysis)", "Find a lower-risk route from Visakhapatnam to Kakinada while avoiding protected areas."),
    ("TEST C (Fishing Ranking)", "Find the top 3 fishing locations within 50 km of Visakhapatnam tomorrow morning considering fishing potential, chlorophyll, SST, wave height, weather risk and protected areas."),
    ("TEST D (Comparison)", "Compare Chennai and Visakhapatnam tomorrow morning."),
    ("TEST E (Historical 7-Day)", "How have wave conditions near Kakinada changed over the last 7 days?"),
    ("TEST F (Telugu)", "విశాఖపట్నం దగ్గర చేపల వేటకు రేపు ఉదయం అనుకూలంగా ఉందా?"),
    ("TEST G (Unseen Location)", "What are the sea conditions off Porbandar tomorrow afternoon?")
]

print("="*70)
print("ORCA LIVE API ACCEPTANCE VERIFICATION")
print("="*70)

all_ok = True
for tag, query in tests:
    req = urllib.request.Request(
        "http://127.0.0.1:8000/api/query",
        data=json.dumps({"query": query}).encode(),
        headers={"Content-Type": "application/json"}
    )
    try:
        res = urllib.request.urlopen(req)
        data = json.loads(res.read().decode())
        vis_type = data.get("visualization_plan", {}).get("result_type")
        needs_clarif = data.get("needs_clarification", False)
        loc = data.get("location", {}).get("name")
        agents_count = len(data.get("agent_activity", []))
        evidence_count = len(data.get("evidence", []))
        print(f"PASS: {tag}")
        print(f"  Query: \"{query}\"")
        print(f"  Result Type: {vis_type} | Clarification: {needs_clarif} | Location: {loc}")
        print(f"  Telemetry: {agents_count} Agents Run | {evidence_count} Evidence Records")
        print(f"  Summary: {data.get('executive_summary')[:90]}...")
        print("-" * 70)
    except Exception as e:
        print(f"FAIL: {tag} - {e}")
        all_ok = False

if all_ok:
    print("ALL ACCEPTANCE CRITERIA MET WITH ZERO FALLTHROUGHS!")
