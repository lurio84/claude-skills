import { expect, test } from 'claude-code/testing';
import { effortSuffix, headerTime, narration } from './register';
test('narration shows the last prose line Gemini wrote between tools', async () => {
    expect(narration(['===== h', '[tool] read_file a.txt', '[tool-done] read_file', 'Now I will check the transcript.'])).toBe('Now I will check the transcript.');
});
test('narration keeps the generic label for markers and for the JSON answer', async () => {
    expect(narration(['===== h', '[tool] read_file a.txt'])).toBe(null);
    expect(narration(['===== h', '{', ' "items": [', '  {'])).toBe(null);
    expect(narration(['===== h', '   "claim": "x",'])).toBe(null);
});
test("a run's start is its header's time, read as local time", async () => {
    expect(headerTime('===== 2026-11-12 10:05:09 | gemini-3.8-flash-high/ | C:\\x')).toBe(new Date(2026, 10, 12, 10, 5, 9).getTime());
    expect(headerTime('﻿===== 2026-11-12 10:05:09 | m/low')).toBe(new Date(2026, 10, 12, 10, 5, 9).getTime());
    expect(headerTime('[tool] read_file a.txt')).toBe(null);
    expect(headerTime(undefined)).toBe(null);
});
test('the thinking label takes its effort from the header, as Claude words it', async () => {
    expect(effortSuffix('===== 2026-11-12 10:05:09 | gemini-3.8-flash-high/ | write | C:\\x')).toBe(' with high effort');
    expect(effortSuffix('===== 2026-11-12 10:05:09 | argon/low | C:\\x')).toBe(' with low effort');
    expect(effortSuffix('===== 2026-11-12 10:05:09 | claude-opus/ | C:\\x')).toBe('');
    expect(effortSuffix(undefined)).toBe('');
});
