import { expect, test } from 'claude-code/testing'

import { parse } from './register'

test('an explicit PROGRESS line wins over the last line', async () => {
  const p = parse('loading\nPROGRESS 5/18 mago_ref_side\nsome other line 3/4\n')
  expect(p.cur).toBe(5)
  expect(p.total).toBe(18)
  expect(p.note).toBe('mago_ref_side')
  expect(p.exitCode).toBe(null)
})

test('a tqdm bar redrawn with carriage returns gives the newest count', async () => {
  const p = parse(' 10%|#         | 1/10 [00:01<00:09]\r 40%|####      | 4/10 [00:04<00:06]')
  expect(p.cur).toBe(4)
  expect(p.total).toBe(10)
})

test('a task stopped with TaskStop ends on [killed]', async () => {
  const p = parse('PROGRESS 2/9 x\n\n[killed]\n')
  expect(p.exitCode).toBe(143)
  expect(p.cur).toBe(2)
})

test('a bare percentage and the exit marker', async () => {
  const p = parse('downloading 37.5% done\n\n[exited with code 1]\n')
  expect(p.frac).toBe(0.375)
  expect(p.exitCode).toBe(1)
  expect(p.note).toBe('downloading 37.5% done')
})
