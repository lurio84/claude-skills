# Read an MS Project .mpp: status date + % complete per task -> JSON. Worked 2026-11-22 on the PGPI seguimiento .mpp.
# Needs: pip install mpxj JPype1 (mpxj 16.10.0, installed 2026-11-22 with Lucas's OK) + Java (21 on the tower).
# usage: python -I read-mpp.py <file.mpp> <out.json>   (copy the .mpp to scratch first; EV/BCWP fields come back empty, compare %s instead)
import sys, json, mpxj, jpype
sys.stdout.reconfigure(encoding='utf-8')
jpype.startJVM()
from org.mpxj.reader import UniversalProjectReader
p = UniversalProjectReader().read(sys.argv[1])
pp = p.getProjectProperties()
print('status', pp.getStatusDate(), 'saved', pp.getLastSaved(), 'author', pp.getLastAuthor())
rows=[]
for t in p.getTasks():
    if t.getID() is None or int(t.getID())==0: continue
    pc=t.getPercentageComplete(); 
    rows.append({'wbs':str(t.getWBS()),'name':str(t.getName()),'pc':float(pc) if pc is not None else None,'summary':bool(t.getSummary()),
                 'bcost': float(t.getBaselineCost()) if t.getBaselineCost() is not None else None,
                 'bcws': float(t.getBCWS()) if t.getBCWS() is not None else None,'bcwp': float(t.getBCWP()) if t.getBCWP() is not None else None})
json.dump(rows, open(sys.argv[2],'w',encoding='utf-8'), ensure_ascii=False)
nz=[r for r in rows if not r['summary'] and r['pc']]
print('tasks',len(rows),'leaf with %>0',len(nz))
for r in nz[:60]: print(f"{r['wbs']:<14} {r['pc']:6.1f}  {r['name'][:60]}")
