# Frontmatter parse check for revisar-vault Phase 4. Read-only.
# Obsidian drops the whole frontmatter on a YAML error (2026-10-28: unquoted `[[A]], [[B]]`).
import glob, yaml
ROOT = "C:/Users/lucas/SecondBrain"
bad = 0
for p in glob.glob(f"{ROOT}/**/*.md", recursive=True):
    if "/.obsidian/" in p.replace("\\", "/"): continue
    t = open(p, encoding="utf-8-sig", errors="ignore").read()
    if not t.startswith("---\n"): continue
    end = t.find("\n---", 4)
    try:
        if end < 0: raise yaml.YAMLError("no closing ---")
        yaml.safe_load(t[4:end])
    except yaml.YAMLError as e:
        bad += 1
        print(f"{p[len(ROOT)+1:]}: {str(e).splitlines()[0]}")
print(f"broken frontmatter: {bad}")
