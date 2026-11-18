import { expect, test } from 'claude-code/testing'

import { exitCodeOf, isBackground, isLaunch, isWoken } from './register'

test('the exit line is read from the .out file, absent until the run ends', async () => {
  expect(exitCodeOf('4711\r\n---\r\n##agy-exit 0\r\n')).toBe(0)
  expect(exitCodeOf('BLOCKED: ...\r\n##agy-exit 2')).toBe(2)
  expect(exitCodeOf('4711\r\n##agy-exit 0\r\n##agy-woken\r\n')).toBe(0)
  expect(exitCodeOf('')).toBe(null)
  expect(exitCodeOf('still running')).toBe(null)
})

test("markers quoted inside agy's answer don't count, only the file's last lines", async () => {
  expect(exitCodeOf('the mod waits for "##agy-exit 0" lines\r\nmore answer')).toBe(null)
  expect(exitCodeOf('##agy-exit 5\r\nanswer goes on')).toBe(null)
  expect(isWoken('it marks files ##agy-woken\r\nmore')).toBe(false)
  expect(isWoken('x\r\n##agy-exit 0\r\n##agy-woken\r\n')).toBe(true)
})

test('only a real launch is refused in the background, and -Background:$false is no background', async () => {
  expect(isLaunch('& "$HOME\.claude\tools\delegar.ps1" -Dir x -Prompt y')).toBe(true)
  expect(isLaunch('git diff tools/delegar.ps1')).toBe(false)
  expect(isLaunch('grep -n Background delegar.ps1 | head')).toBe(false)
  expect(isBackground('& delegar.ps1 -Background -Dir x')).toBe(true)
  expect(isBackground('& delegar.ps1 -Background:$false -Dir x')).toBe(false)
})
