import { expect, test } from 'claude-code/testing'

import { candidateOf, chooseBandRun, footerOk } from './register'

const run = (tag: string | null, start: number, running = true) => ({ tag, start, running })

test('with only tagged runs in progress the band follows the oldest by start time', async () => {
  expect(chooseBandRun([run('c', 300), run('a', 100), run('b', 200)])).toBe('a')
})

test('a finished tagged run is skipped: the band passes to the next-oldest', async () => {
  expect(chooseBandRun([run('a', 100, false), run('b', 200), run('c', 300)])).toBe('b')
  expect(chooseBandRun([run('a', 100, false), run('b', 200, false), run('c', 300)])).toBe('c')
})

test('an untagged run in progress takes the band, even when tagged runs are older', async () => {
  expect(chooseBandRun([run('a', 100), run(null, 500)])).toBe(null)
})

test('an untagged run that has ended does not count', async () => {
  expect(chooseBandRun([run(null, 100, false), run('a', 200)])).toBe('a')
})

test('nothing in progress leaves no band run', async () => {
  expect(chooseBandRun([])).toBe(undefined)
  expect(chooseBandRun([run('a', 100, false), run(null, 50, false)])).toBe(undefined)
})

const SID = '11111111-aaaa'
const NOW = new Date(2026, 10, 25, 12, 0, 0).getTime()
const HEAD = '===== 2026-11-25 11:58:00 | m/high | C:'
const open = `${HEAD}\n[tool] read_file a.txt\n`
const done = `${HEAD}\n----- SUCCESS | git changed False\n`

test('the log name decides untagged or tagged; other sessions are ignored', async () => {
  expect(candidateOf(`${SID}.log`, SID, open, NOW - 1000, NOW)?.tag).toBe(null)
  expect(candidateOf(`${SID}-x.log`, SID, open, NOW - 1000, NOW)?.tag).toBe('x')
  expect(candidateOf(`${SID}-a-b.log`, SID, open, NOW - 1000, NOW)?.tag).toBe('a-b')
  // another session whose id starts with ours
  expect(candidateOf(`${SID}zzz.log`, SID, open, NOW - 1000, NOW)).toBe(undefined)
  expect(candidateOf(`${SID}zzz-x.log`, SID, open, NOW - 1000, NOW)).toBe(undefined)
  expect(candidateOf(`${SID}-x.out`, SID, open, NOW - 1000, NOW)).toBe(undefined)
})

test('running means a header and no footer', async () => {
  expect(candidateOf(`${SID}-x.log`, SID, open, NOW - 1000, NOW)?.running).toBe(true)
  expect(candidateOf(`${SID}-x.log`, SID, done, NOW - 1000, NOW)?.running).toBe(false)
  expect(candidateOf(`${SID}-x.log`, SID, '', NOW - 1000, NOW)?.running).toBe(false)
})

test('the start is the header time, else the file mtime', async () => {
  expect(candidateOf(`${SID}-x.log`, SID, open, NOW - 1000, NOW)?.start).toBe(new Date(2026, 10, 25, 11, 58, 0).getTime())
  expect(candidateOf(`${SID}-x.log`, SID, 'garbage\n', NOW - 1000, NOW)?.start).toBe(NOW - 1000)
})

test('ten quiet minutes mean the run is dead', async () => {
  expect(candidateOf(`${SID}-x.log`, SID, open, NOW - 10 * 60_000, NOW)?.running).toBe(true)
  expect(candidateOf(`${SID}-x.log`, SID, open, NOW - 10 * 60_000 - 1, NOW)?.running).toBe(false)
})

test('a SUCCESS footer is OK regardless of git changed', async () => {
  expect(footerOk('----- SUCCESS | git changed True')).toBe(true)
  expect(footerOk('----- SUCCESS | git changed False')).toBe(true)
  expect(footerOk('----- FAILED | git changed False')).toBe(false)
  expect(footerOk('')).toBe(false)
})
