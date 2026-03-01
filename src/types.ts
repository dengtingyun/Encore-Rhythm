/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type NoteType = 'tap' | 'hold';

export interface NoteData {
  id: string;
  time: number; // 击打时间（毫秒）
  lane: number; // 0, 1, 2, 3
  type: NoteType;
  duration?: number; // 仅用于 hold
}

export interface Beatmap {
  id: string;
  title: string;
  artist: string;
  audioUrl: string;
  coverUrl: string;
  bpm: number;
  notes: NoteData[];
}

export interface GameState {
  score: number;
  combo: number;
  maxCombo: number;
  accuracy: number;
  perfect: number;
  great: number;
  good: number;
  miss: number;
}
