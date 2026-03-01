/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const LANE_KEYS = ['d', 'f', 'j', 'k'];
export const LANE_COUNT = 4;
export const HIT_WINDOW = {
  PERFECT: 50,
  GREAT: 100,
  GOOD: 150,
};

export const NOTE_SPEED = 0.8; // 像素/毫秒
export const STAGE_HEIGHT = 800;
export const HIT_LINE_Y = 700; // 判定线位置
export const LANE_WIDTH = 100;
export const STAGE_WIDTH = LANE_WIDTH * LANE_COUNT;

export const THEME_COLORS = {
  BG: '#0a0502',
  ACCENT: '#ff4e00',
  GOLD: '#D4AF37',
  PURPLE: '#3a1510',
  LANE_BG: 'rgba(255, 255, 255, 0.05)',
  NOTE: '#fff',
  PERFECT: '#00FF00',
  GREAT: '#FFFF00',
  GOOD: '#FFA500',
  MISS: '#FF0000',
};
