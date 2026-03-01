import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Stage, Layer, Rect, Line, Text, Group } from 'react-konva';
import { NoteData, GameState } from '../../types';
import { 
  LANE_COUNT, LANE_WIDTH, STAGE_HEIGHT, STAGE_WIDTH, 
  HIT_LINE_Y, NOTE_SPEED, THEME_COLORS, LANE_KEYS, HIT_WINDOW 
} from '../../constants';
import confetti from 'canvas-confetti';

interface GameEngineProps {
  notes: NoteData[];
  audioUrl: string;
  onFinish: (state: GameState, failed?: boolean) => void;
  onQuit: () => void;
}

const GameEngine: React.FC<GameEngineProps> = ({ notes, audioUrl, onFinish, onQuit }) => {
  const [gameState, setGameState] = useState<GameState>({
    score: 0, combo: 0, maxCombo: 0, accuracy: 0,
    perfect: 0, great: 0, good: 0, miss: 0
  });
  
  const [currentTime, setCurrentTime] = useState(0);
  const [activeLanes, setActiveLanes] = useState<boolean[]>([false, false, false, false]);
  const [lastJudgment, setLastJudgment] = useState<{ text: string, color: string } | null>(null);
  const [isGameOver, setIsGameOver] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hitSoundRef = useRef<HTMLAudioElement | null>(null);
  const requestRef = useRef<number>(null);
  const processedNotes = useRef<Set<string>>(new Set());

  // 初始化音频
  useEffect(() => {
    const audio = new Audio(audioUrl);
    const hitSound = new Audio('https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3'); // 打击音效
    hitSound.volume = 0.4;
    audioRef.current = audio;
    hitSoundRef.current = hitSound;
    
    let isPlaying = false;
    const playPromise = audio.play();
    
    if (playPromise !== undefined) {
      playPromise.then(() => { isPlaying = true; }).catch(console.error);
    }
    
    const update = () => {
      if (isGameOver) return;
      setCurrentTime(audio.currentTime * 1000);
      requestRef.current = requestAnimationFrame(update);
      
      const now = audio.currentTime * 1000;
      notes.forEach(note => {
        if (!processedNotes.current.has(note.id) && now > note.time + HIT_WINDOW.GOOD) {
          handleMiss(note.id);
        }
      });

      if (audio.ended) {
        onFinish(gameState);
      }
    };
    
    requestRef.current = requestAnimationFrame(update);
    
    return () => {
      audio.pause();
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [audioUrl, notes, isGameOver]);

  const triggerGameOver = useCallback(() => {
    if (isGameOver) return;
    setIsGameOver(true);
    audioRef.current?.pause();
    setLastJudgment({ text: 'GAME OVER', color: THEME_COLORS.MISS });
    
    // 延迟一秒结算，让玩家看清错误
    setTimeout(() => {
      onFinish(gameState, true);
    }, 1500);
  }, [isGameOver, gameState, onFinish]);

  const handleHit = useCallback((lane: number) => {
    if (isGameOver) return;
    const now = audioRef.current?.currentTime ? audioRef.current.currentTime * 1000 : 0;
    
    const targetNote = notes.find(n => 
      n.lane === lane && 
      !processedNotes.current.has(n.id) &&
      Math.abs(n.time - now) <= HIT_WINDOW.GOOD
    );

    if (targetNote) {
      // 播放打击音效
      if (hitSoundRef.current) {
        hitSoundRef.current.currentTime = 0;
        hitSoundRef.current.play().catch(() => {});
      }

      const diff = Math.abs(targetNote.time - now);
      let judgment = 'MISS';
      let color = THEME_COLORS.MISS;

      if (diff <= HIT_WINDOW.PERFECT) {
        judgment = 'PERFECT';
        color = THEME_COLORS.PERFECT;
        setGameState(prev => {
          const newCombo = prev.combo + 1;
          return { ...prev, score: prev.score + 300, combo: newCombo, perfect: prev.perfect + 1, maxCombo: Math.max(prev.maxCombo, newCombo) };
        });
      } else if (diff <= HIT_WINDOW.GREAT) {
        judgment = 'GREAT';
        color = THEME_COLORS.GREAT;
        setGameState(prev => {
          const newCombo = prev.combo + 1;
          return { ...prev, score: prev.score + 200, combo: newCombo, great: prev.great + 1, maxCombo: Math.max(prev.maxCombo, newCombo) };
        });
      } else if (diff <= HIT_WINDOW.GOOD) {
        judgment = 'GOOD';
        color = THEME_COLORS.GOOD;
        setGameState(prev => {
          const newCombo = prev.combo + 1;
          return { ...prev, score: prev.score + 100, combo: newCombo, good: prev.good + 1, maxCombo: Math.max(prev.maxCombo, newCombo) };
        });
      }

      processedNotes.current.add(targetNote.id);
      setLastJudgment({ text: judgment, color });
      
      if (judgment === 'PERFECT') {
        confetti({
          particleCount: 15,
          spread: 40,
          origin: { y: 0.8, x: 0.5 + (lane - 1.5) * 0.15 },
          colors: [THEME_COLORS.GOLD, '#ffffff', THEME_COLORS.ACCENT]
        });
      }
    } else {
      // 空打 (Ghost Tap) - 触发 Game Over
      triggerGameOver();
    }
  }, [notes, isGameOver, triggerGameOver]);

  const handleMiss = (id: string) => {
    if (isGameOver) return;
    processedNotes.current.add(id);
    setGameState(prev => ({ ...prev, combo: 0, miss: prev.miss + 1 }));
    triggerGameOver();
  };

  // 键盘监听
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const laneIndex = LANE_KEYS.indexOf(key);
      if (laneIndex !== -1) {
        const newActive = [...activeLanes];
        newActive[laneIndex] = true;
        setActiveLanes(newActive);
        handleHit(laneIndex);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const laneIndex = LANE_KEYS.indexOf(key);
      if (laneIndex !== -1) {
        const newActive = [...activeLanes];
        newActive[laneIndex] = false;
        setActiveLanes(newActive);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [activeLanes, handleHit]);

  return (
    <div className="flex flex-col items-center justify-center h-screen relative overflow-hidden">
      {/* 顶部状态栏 */}
      <div className="absolute top-0 left-0 w-full p-8 flex justify-between items-start z-10">
        <div>
          <h2 className="text-4xl font-serif text-gold italic">Score: {gameState.score.toLocaleString()}</h2>
          <p className="text-xl font-mono opacity-60">Combo: {gameState.combo}</p>
        </div>
        
        <button 
          onClick={onQuit}
          className="glass-panel px-6 py-2 rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-all font-mono uppercase text-xs tracking-widest flex items-center gap-2"
        >
          <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          Exit Stage
        </button>
      </div>

      {lastJudgment && (
        <div 
          key={Date.now()}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 animate-ping pointer-events-none"
          style={{ color: lastJudgment.color }}
        >
          <span className="text-6xl font-serif font-black italic">{lastJudgment.text}</span>
        </div>
      )}

      <Stage width={STAGE_WIDTH} height={STAGE_HEIGHT} className="bg-black/40 shadow-2xl border-x border-white/10">
        <Layer>
          {/* 轨道背景 */}
          {Array.from({ length: LANE_COUNT }).map((_, i) => (
            <Group key={i}>
              <Rect
                x={i * LANE_WIDTH}
                y={0}
                width={LANE_WIDTH}
                height={STAGE_HEIGHT}
                fill={activeLanes[i] ? 'rgba(255, 78, 0, 0.15)' : THEME_COLORS.LANE_BG}
              />
              <Line
                points={[i * LANE_WIDTH, 0, i * LANE_WIDTH, STAGE_HEIGHT]}
                stroke="rgba(255, 255, 255, 0.1)"
                strokeWidth={1}
              />
              <Text
                x={i * LANE_WIDTH + LANE_WIDTH / 2 - 10}
                y={HIT_LINE_Y + 20}
                text={LANE_KEYS[i].toUpperCase()}
                fill="white"
                opacity={0.3}
                fontSize={20}
                fontFamily="JetBrains Mono"
              />
            </Group>
          ))}

          {/* 判定线 */}
          <Line
            points={[0, HIT_LINE_Y, STAGE_WIDTH, HIT_LINE_Y]}
            stroke={THEME_COLORS.GOLD}
            strokeWidth={4}
            opacity={0.8}
          />

          {/* 音符 */}
          {notes.map(note => {
            const y = HIT_LINE_Y - (note.time - currentTime) * NOTE_SPEED;
            if (y < -50 || y > STAGE_HEIGHT + 50 || processedNotes.current.has(note.id)) return null;
            
            return (
              <Rect
                key={note.id}
                x={note.lane * LANE_WIDTH + 5}
                y={y - 10}
                width={LANE_WIDTH - 10}
                height={20}
                fill={THEME_COLORS.NOTE}
                cornerRadius={4}
                shadowBlur={10}
                shadowColor={THEME_COLORS.ACCENT}
              />
            );
          })}
        </Layer>
      </Stage>
    </div>
  );
};

export default GameEngine;
