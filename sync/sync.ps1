# Skill `sync` -- commit + push manual de los 3 repos del setup (claude-config,
# claude-skills, SecondBrain). Sustituye al hook SessionEnd (que solo commiteaba y
# disparaba "Hook cancelled"). Se invoca a mano via /sync o como paso final de /cerrar-chat.
# Commit: logica de sync-push.ps1. Push: plain git; the global ~/.gitconfig routes github.com
# to `gh auth git-credential` (active account lurio84), verified on the tower 2026-10-28.

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
$ErrorActionPreference = 'Continue'
$env:GIT_TERMINAL_PROMPT = '0'
$env:GCM_INTERACTIVE = 'never'

$logFile = Join-Path $env:USERPROFILE '.claude\hooks\sync-push.log'
function Log($msg) {
    "$((Get-Date).ToString('o'))  $msg" | Out-File -FilePath $logFile -Append -Encoding utf8
}

$repos = @(
    @{ Name = 'claude-config'; Path = Join-Path $env:USERPROFILE '.claude' }
    @{ Name = 'claude-skills'; Path = Join-Path $env:USERPROFILE '.claude\skills' }
    @{ Name = 'SecondBrain';   Path = Join-Path $env:USERPROFILE 'SecondBrain' }
)

# Patron de posibles secretos: solo se mira lo AÑADIDO (diff -U0), no el archivo entero,
# para no disparar con cosas como "sk-close-state" o "sk-management" (vocabulario del vault).
$secretPattern = 'sk-(cp-)?[A-Za-z0-9]{20,}|ghp_[A-Za-z0-9]{20,}|gho_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|AKIA[0-9A-Z]{16}|xox[bp]-[0-9A-Za-z-]{10,}|-----BEGIN [A-Z ]*PRIVATE KEY'

$timestamp = (Get-Date).ToString('yyyy-MM-dd HH:mm')
# Both machines are named LURIO84; tag by chassis type instead (2 = mobile).
$kind = if ((Get-CimInstance Win32_ComputerSystem).PCSystemType -eq 2) { 'portatil' } else { 'torre' }
$host_ = "$env:COMPUTERNAME-$kind"

Log "=== sync (manual) start ==="
# Repair the gh git helper before pushing (covers a machine whose SessionStart hook predates setup-check).
$results = @(& (Join-Path $env:USERPROFILE '.claude\hooks\setup-check.ps1') | ForEach-Object { "setup-check: $_" })

foreach ($r in $repos) {
    if (-not (Test-Path (Join-Path $r.Path '.git'))) {
        $results += "$($r.Name): no .git, skip"
        continue
    }

    # --- COMMIT (si hay cambios) ---
    $status = & git -C $r.Path status --porcelain 2>$null
    if ($status) {
        & git -C $r.Path add -A 2>&1 | Out-Null

        # Guardia: buscar posibles secretos en las lineas añadidas antes de commitear.
        # Se recorre linea a linea para saber en que archivo esta el hit (cabecera "+++ b/...")
        # sin imprimir nunca la linea que contiene el secreto.
        $diffLines = & git -C $r.Path diff --cached -U0 2>$null
        $currentFile = $null
        $secretFile = $null
        foreach ($line in $diffLines) {
            if ($line -match '^\+\+\+ b/(.+)$') {
                $currentFile = $matches[1]
                continue
            }
            if ($line -match '^\+[^+]' -and $line -match $secretPattern) {
                $secretFile = $currentFile
                break
            }
        }
        if ($secretFile) {
            & git -C $r.Path reset 2>&1 | Out-Null
            $results += "$($r.Name): BLOCKED (posible secreto en $secretFile, sin commit)"
            Log "$($r.Name): BLOCKED - posible secreto en $secretFile, git reset ejecutado"
            continue
        }

        $changed = @(& git -C $r.Path diff --cached --name-only 2>$null)
        $count = $changed.Count
        if ($count -gt 0) {
            # git quotes non-ASCII paths ("Automatizaci\303\263n financiera.md"); an embedded quote
            # breaks PS 5.1 argument passing and git reads the message as a pathspec (2026-10-24).
            $preview = $changed | Select-Object -First 5 | ForEach-Object { $_ -replace '"', '' }
            $msg = "chore(sync): $timestamp from $host_ -- $count file(s): $($preview -join ', ')"
            if ($count -gt 5) { $msg += " ...and $($count - 5) more" }
            $commitOut = & git -C $r.Path commit -m $msg 2>&1
            Log "$($r.Name): commit -> $commitOut (exit=$LASTEXITCODE)"
        }
    }

    # --- PUSH (si hay commits por delante de upstream) ---
    $ahead = & git -C $r.Path rev-list --count '@{u}..HEAD' 2>$null
    if ($LASTEXITCODE -eq 0 -and $ahead -and [int]$ahead -gt 0) {
        & git -C $r.Path -c credential.https://github.com.username=lurio84 push --quiet origin HEAD 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) {
            $sha = & git -C $r.Path rev-parse --short HEAD 2>$null
            $results += "$($r.Name): pushed $ahead commit(s) (HEAD $sha)"
            Log "$($r.Name): pushed $ahead -> $sha"
        } else {
            $results += "$($r.Name): PUSH FAILED ($ahead commit(s) sin pushear)"
            Log "$($r.Name): push FAILED"
        }
    } else {
        $results += "$($r.Name): up to date"
    }
}
Log "=== sync (manual) end ==="

Write-Output ""
Write-Output "Sync (commit+push manual):"
foreach ($line in $results) { Write-Output "  $line" }
