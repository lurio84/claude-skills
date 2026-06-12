# Skill `sync` -- commit + push manual de los 3 repos del setup (claude-config,
# claude-skills, SecondBrain). Sustituye al hook SessionEnd (que solo commiteaba y
# disparaba "Hook cancelled"). Se invoca a mano via /sync o como paso final de /cerrar-chat.
# Commit: logica de sync-push.ps1. Push: bloque con token de sync-pull.ps1 (el GCM tiene
# cacheado HGK2646 y un push plano da 404 en los repos privados de lurio84).

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
$ErrorActionPreference = 'Continue'
$env:GIT_TERMINAL_PROMPT = '0'

$logFile = Join-Path $env:USERPROFILE '.claude\hooks\sync-push.log'
function Log($msg) {
    "$((Get-Date).ToString('o'))  $msg" | Out-File -FilePath $logFile -Append -Encoding utf8
}

$repos = @(
    @{ Name = 'claude-config'; Path = Join-Path $env:USERPROFILE '.claude' }
    @{ Name = 'claude-skills'; Path = Join-Path $env:USERPROFILE '.claude\skills' }
    @{ Name = 'SecondBrain';   Path = Join-Path $env:USERPROFILE 'SecondBrain' }
)

$timestamp = (Get-Date).ToString('yyyy-MM-dd HH:mm')
$host_ = $env:COMPUTERNAME

# Token de lurio84 via gh CLI (necesario para push a repos privados de lurio84).
$lurioToken = & gh auth token --user lurio84 2>$null

Log "=== sync (manual) start ==="
$results = @()

foreach ($r in $repos) {
    if (-not (Test-Path (Join-Path $r.Path '.git'))) {
        $results += "$($r.Name): no .git, skip"
        continue
    }

    # --- COMMIT (si hay cambios) ---
    $status = & git -C $r.Path status --porcelain 2>$null
    if ($status) {
        & git -C $r.Path add -A 2>&1 | Out-Null
        $changed = @(& git -C $r.Path diff --cached --name-only 2>$null)
        $count = $changed.Count
        if ($count -gt 0) {
            $preview = $changed | Select-Object -First 5
            $msg = "chore(sync): $timestamp from $host_ -- $count file(s): $($preview -join ', ')"
            if ($count -gt 5) { $msg += " ...and $($count - 5) more" }
            $commitOut = & git -C $r.Path commit -m $msg 2>&1
            Log "$($r.Name): commit -> $commitOut (exit=$LASTEXITCODE)"
        }
    }

    # --- PUSH (si hay commits por delante de upstream) ---
    $ahead = & git -C $r.Path rev-list --count '@{u}..HEAD' 2>$null
    if ($LASTEXITCODE -eq 0 -and $ahead -and [int]$ahead -gt 0) {
        $pBranch = & git -C $r.Path rev-parse --abbrev-ref HEAD 2>$null
        if ($lurioToken -and $pBranch) {
            $pOrigin = & git -C $r.Path remote get-url origin 2>$null
            $pAuth = $pOrigin -replace '^https://(?:[^@/]+@)?', "https://lurio84:$lurioToken@"
            & git -C $r.Path -c credential.helper= push $pAuth $pBranch 2>&1 | Out-Null
            if ($LASTEXITCODE -eq 0) {
                & git -C $r.Path update-ref "refs/remotes/origin/$pBranch" HEAD 2>&1 | Out-Null
                $sha = & git -C $r.Path rev-parse --short HEAD 2>$null
                $results += "$($r.Name): pushed $ahead commit(s) (HEAD $sha)"
                Log "$($r.Name): pushed $ahead -> $sha"
            } else {
                $results += "$($r.Name): PUSH FAILED ($ahead commit(s) sin pushear)"
                Log "$($r.Name): push FAILED"
            }
        } else {
            $results += "$($r.Name): $ahead commit(s) sin pushear (sin token gh lurio84)"
            Log "$($r.Name): no token / no branch"
        }
    } else {
        $results += "$($r.Name): up to date"
    }
}
Log "=== sync (manual) end ==="

Write-Output ""
Write-Output "Sync (commit+push manual):"
foreach ($line in $results) { Write-Output "  $line" }
