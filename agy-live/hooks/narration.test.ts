import { expect, test } from 'claude-code/testing'

import { narration } from './register'

test('narration shows the last prose line Gemini wrote between tools', async () => {
  expect(narration(['===== h', '[tool] read_file a.txt', '[tool-done] read_file', 'Now I will check the transcript.'])).toBe('Now I will check the transcript.')
})

test('narration keeps the generic label for markers and for the JSON answer', async () => {
  expect(narration(['===== h', '[tool] read_file a.txt'])).toBe(null)
  expect(narration(['===== h', '{', ' "items": [', '  {'])).toBe(null)
  expect(narration(['===== h', '   "claim": "x",'])).toBe(null)
})
