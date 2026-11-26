import { expect, test } from 'claude-code/testing'

import { isLaunch, tagOf } from './register'

// A launch of the script, not a command that merely names the file (grep, diff).
test('isLaunch', () => {
  expect(isLaunch('python "$HOME/.claude/tools/agy_run.py" --dir x --prompt-file f.txt')).toBe(true)
  expect(isLaunch('python tools/agy_run.py --dir x --prompt-file f.txt --tag t1')).toBe(true)
  expect(isLaunch('& "$HOME\\.claude\\tools\\cierre-delegar.ps1" -Dir x')).toBe(true)
  expect(isLaunch('& "$HOME\\.claude\\tools\\delegar.ps1" -Dir x -Prompt y')).toBe(false)
  expect(isLaunch('git diff tools/agy_run.py')).toBe(false)
  expect(isLaunch('grep -n mode agy_run.py | head')).toBe(false)
  expect(isLaunch('git diff tools/cierre-delegar.ps1')).toBe(false)
})

test('tagOf', () => {
  expect(tagOf('python tools/agy_run.py --dir x --prompt-file f.txt --tag my-run')).toBe('my-run')
  expect(tagOf('python tools/agy_run.py --dir x --tag="t.2" --prompt-file f.txt')).toBe('t.2')
  expect(tagOf('python tools/agy_run.py --dir x --prompt-file f.txt')).toBe(null)
  expect(tagOf('& "$HOME\\.claude\\tools\\cierre-delegar.ps1" -Dir x -Tag cierre1')).toBe('cierre1')
  expect(tagOf('& "$HOME\\.claude\\tools\\delegar.ps1" -Dir x -Tag old')).toBe(null)
})
