import sys, json
sys.stdout.reconfigure(encoding='utf-8')

d = json.load(sys.stdin)
parts = []

W    = '\033[97m'   # bright white
RST  = '\033[0m'
WARN = '\033[33m'   # yellow >=75%
CRIT = '\033[31m'   # red    >=90%
SEP  = f' {RST}│{W} '

def bar(pct, width=8):
    filled = round(pct / 100 * width)
    return '▬' * filled + '─' * (width - filled)

def fmt_pct(pct):
    p = round(pct)
    if p >= 90: return f'{CRIT}{p}%{RST}{W}'
    if p >= 75: return f'{WARN}{p}%{RST}{W}'
    return f'{p}%'

# Model
model = d.get('model', {}).get('display_name', '')
if model:
    parts.append(model.replace('Claude ', '').replace(' Latest', ''))

# Context window
pct = d.get('context_window', {}).get('used_percentage')
if pct is not None:
    parts.append(f'ctx {bar(pct, 8)} {fmt_pct(pct)}')

# Cost
cost = d.get('cost', {}).get('total_cost_usd')
if cost is not None:
    parts.append(f'${cost:.3f}')

# Rate limit 5h
r5 = d.get('rate_limits', {}).get('five_hour', {}).get('used_percentage')
if r5 is not None:
    parts.append(f'5h {bar(r5, 8)} {fmt_pct(r5)}')

# Rate limit 7d
r7 = d.get('rate_limits', {}).get('seven_day', {}).get('used_percentage')
if r7 is not None:
    parts.append(f'7d {bar(r7, 8)} {fmt_pct(r7)}')

# Effort
effort = d.get('effort', {}).get('level', '')
if effort:
    parts.append(f'effort {effort}')

print(f'{W}' + SEP.join(parts) + RST)
