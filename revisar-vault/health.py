# Health snapshot for revisar-vault Phase 0b. Read-only.
import glob, json, os, subprocess
H = os.path.expanduser("~/.claude")
MEM = f"{H}/projects/C--Users-lucas-SecondBrain/memory"
TR = f"{H}/projects/C--Users-lucas-SecondBrain"
hook = subprocess.run(["powershell", "-ExecutionPolicy", "Bypass", "-File", f"{H}/hooks/session-start.ps1"],
                      capture_output=True, input=json.dumps({"cwd": "C:\\Users\\lucas\\SecondBrain"}), text=True, encoding="utf-8").stdout
sizes = {p: os.path.getsize(p) for p in [f"{MEM}/MEMORY.md", "C:/Users/lucas/SecondBrain/CLAUDE.md", f"{H}/CLAUDE.md"]}
total = sum(sizes.values()) + len(hook.encode())
mems = sorted(os.path.basename(p) for p in glob.glob(f"{MEM}/*.md") if not os.path.basename(p).startswith("MEMORY"))
hot = sum(1 for l in open(f"{MEM}/MEMORY.md", encoding="utf-8") if l.startswith("- ["))
read, sessions, dates = set(), 0, []
for f in glob.glob(f"{TR}/*.jsonl"):
    sessions += 1
    for line in open(f, encoding="utf-8", errors="ignore"):
        try: e = json.loads(line)
        except ValueError: continue
        if e.get("timestamp"): dates.append(e["timestamp"][:10])
        c = (e.get("message") or {}).get("content")
        if e.get("type") == "assistant" and isinstance(c, list):
            for b in c:
                if b.get("type") == "tool_use" and b.get("name") == "Read":
                    read.add(os.path.basename(b.get("input", {}).get("file_path", "").replace("\\", "/")))
unused = [m for m in mems if m not in read]
print(f"window: {min(dates)} -> {max(dates)}, sessions {sessions}")
print(f"always-loaded: {total/1024:.1f} KB (hook {len(hook.encode())/1024:.1f} KB; " + ", ".join(f"{os.path.basename(os.path.dirname(p))}/{os.path.basename(p)} {s/1024:.1f}" for p, s in sizes.items()) + ")")
print(f"memories: {len(mems)}, hot-index lines: {hot}, never Read in window: {len(unused)}")
print("never Read:", " ".join(m[:-3] for m in unused))
