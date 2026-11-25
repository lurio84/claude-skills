import { expect, test } from 'claude-code/testing'

import { isLaunch } from './register'

// A launch of the script, not a command that merely names the file (grep, diff).
test('isLaunch', () => {
  expect(isLaunch('& "$HOME\\.claude\\tools\\delegar.ps1" -Dir x -Prompt y')).toBe(true)
  expect(isLaunch('git diff tools/delegar.ps1')).toBe(false)
  expect(isLaunch('grep -n Mode delegar.ps1 | head')).toBe(false)
})
