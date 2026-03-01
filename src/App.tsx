import React, { useState, useEffect } from 'react';
import { Music, Upload, Play, Star, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Beatmap, GameState } from './types';
import GameEngine from './components/Game/GameEngine';
import { generateBeatmap } from './services/aiService';

const DEFAULT_SONGS: Beatmap[] = [
  {
    id: 'phantom',
    title: 'The Phantom of the Opera',
    artist: 'Andrew Lloyd Webber',
    // 使用一个更具戏剧性的管风琴风格音频
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3', 
    coverUrl: 'https://picsum.photos/seed/phantom/400/400',
    bpm: 120,
    notes: []
  },
  {
    id: 'hamilton',
    title: 'Alexander Hamilton',
    artist: 'Lin-Manuel Miranda',
    // 使用一个更具节奏感的嘻哈风格音频
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-15.mp3',
    coverUrl: 'https://picsum.photos/seed/hamilton/400/400',
    bpm: 132,
    notes: []
  }
];

export default function App() {
  const [screen, setScreen] = useState<'menu' | 'game' | 'result' | 'loading' | 'naming'>('menu');
  const [selectedSong, setSelectedSong] = useState<Beatmap | null>(null);
  const [gameResult, setGameResult] = useState<GameState | null>(null);
  const [isGameOver, setIsGameOver] = useState(false);
  const [customSongs, setCustomSongs] = useState<Beatmap[]>([]);
  const [apiStatus, setApiStatus] = useState<'checking' | 'ok' | 'error'>('checking');
  
  const [pendingFile, setPendingFile] = useState<{ audio: string, defaultTitle: string } | null>(null);
  const [customTitle, setCustomTitle] = useState('');
  const [customArtist, setCustomArtist] = useState('');

  // 加载保存的歌曲
  useEffect(() => {
    fetch('/api/health')
      .then(res => res.json())
      .then(data => setApiStatus(data.status === 'ok' ? 'ok' : 'error'))
      .catch(() => setApiStatus('error'));

    fetch('/api/songs')
      .then(async res => {
        const contentType = res.headers.get("content-type");
        if (!res.ok || !contentType || !contentType.includes("application/json")) {
          const text = await res.text();
          console.error("Non-JSON response received:", text.substring(0, 200));
          throw new Error(`Expected JSON response but got ${contentType || 'unknown'}`);
        }
        return res.json();
      })
      .then(data => {
        console.log("Loaded songs:", data.length);
        setCustomSongs(data);
      })
      .catch(err => {
        console.error("Failed to load songs:", err);
        setCustomSongs([]);
      });
  }, []);

  const startGame = async (song: Beatmap) => {
    setScreen('loading');
    
    if (song.notes.length === 0) {
      const notes = await generateBeatmap(song.title, song.artist, 180);
      song.notes = notes;
    }
    
    setSelectedSong(song);
    setScreen('game');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64Audio = event.target?.result as string;
      const title = file.name.replace(/\.[^/.]+$/, "");
      setPendingFile({ audio: base64Audio, defaultTitle: title });
      setCustomTitle(title);
      setCustomArtist('Unknown Artist');
      setScreen('naming');
    };
    reader.readAsDataURL(file);
  };

  const [isSaving, setIsSaving] = useState(false);

  const confirmUpload = async () => {
    if (!pendingFile || isSaving) return;
    
    setIsSaving(true);
    setScreen('loading');
    
    try {
      const title = customTitle || pendingFile.defaultTitle;
      const artist = customArtist || 'Unknown Artist';
      const notes = await generateBeatmap(title, artist, 180);
      
      const newSong: Beatmap = {
        id: `custom-${Date.now()}`,
        title: title,
        artist: artist,
        audioUrl: pendingFile.audio,
        coverUrl: `https://picsum.photos/seed/${encodeURIComponent(title)}/400/400`,
        bpm: 120,
        notes: notes
      };

      // 保存到后端
      await fetch('/api/songs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSong)
      });

      setCustomSongs(prev => [...prev, newSong]);
      setSelectedSong(newSong);
      setPendingFile(null);
      setScreen('game');
    } catch (error) {
      console.error("Upload failed:", error);
      setScreen('naming');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen theatre-gradient flex flex-col">
      <AnimatePresence mode="wait">
        {screen === 'menu' && (
          <motion.div 
            key="menu"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex-1 flex flex-col items-center p-8 overflow-y-auto"
          >
            <header className="text-center mb-12 mt-10">
              <h1 className="text-8xl font-serif font-black tracking-tighter text-white uppercase italic">
                Encore <span className="text-gold">Rhythm</span>
              </h1>
              <div className="flex items-center justify-center gap-4 mt-4">
                <p className="text-gold/60 font-mono tracking-widest uppercase text-sm">The Stage is Yours</p>
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10">
                  <div className={`w-2 h-2 rounded-full ${apiStatus === 'ok' ? 'bg-green-500' : apiStatus === 'error' ? 'bg-red-500' : 'bg-yellow-500 animate-pulse'}`} />
                  <span className="text-[10px] font-mono uppercase opacity-40">API: {apiStatus}</span>
                </div>
              </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
              {[...DEFAULT_SONGS, ...customSongs].map(song => (
                <motion.div 
                  key={song.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => startGame(song)}
                  className="glass-panel p-6 rounded-3xl cursor-pointer group flex items-center gap-6"
                >
                  <img src={song.coverUrl} className="w-24 h-24 rounded-2xl object-cover shadow-xl" referrerPolicy="no-referrer" />
                  <div className="flex-1">
                    <h3 className="text-2xl font-serif font-bold group-hover:text-gold transition-colors">{song.title}</h3>
                    <p className="text-white/40 font-mono text-xs uppercase tracking-wider">{song.artist}</p>
                  </div>
                  <Play className="text-gold opacity-0 group-hover:opacity-100 transition-opacity" />
                </motion.div>
              ))}

              <label className="glass-panel p-6 rounded-3xl cursor-pointer border-dashed border-2 border-white/10 hover:border-gold/40 transition-all flex flex-col items-center justify-center gap-4 group">
                <input type="file" accept="audio/*" className="hidden" onChange={handleFileUpload} />
                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-gold/10 transition-colors">
                  <Upload className="text-gold" />
                </div>
                <div className="text-center">
                  <p className="font-serif text-xl">Upload Your Own</p>
                  <p className="text-white/40 text-xs font-mono uppercase">AI will generate the stage</p>
                </div>
              </label>
            </div>
          </motion.div>
        )}

        {screen === 'naming' && pendingFile && (
          <motion.div 
            key="naming"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex-1 flex flex-col items-center justify-center p-8 overflow-y-auto"
          >
            <div className="glass-panel p-12 rounded-[3rem] w-full max-w-md">
              <h2 className="text-4xl font-serif font-bold mb-8 text-center italic">Name Your Stage</h2>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-mono uppercase text-white/40 mb-2">Song Title</label>
                  <input 
                    type="text" 
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && confirmUpload()}
                    autoFocus
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-gold/50 transition-colors font-serif text-xl text-white"
                    placeholder="Enter song name..."
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-mono uppercase text-white/40 mb-2">Artist Name</label>
                  <input 
                    type="text" 
                    value={customArtist}
                    onChange={(e) => setCustomArtist(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && confirmUpload()}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-gold/50 transition-colors font-serif text-xl text-white"
                    placeholder="Enter artist name..."
                  />
                  <p className="text-[10px] font-mono text-white/20 mt-2 text-right uppercase tracking-widest">Tip: Press Enter to confirm</p>
                </div>

                <div className="pt-4 flex flex-col gap-4">
                  <button 
                    onClick={confirmUpload}
                    className="w-full bg-gold text-black font-serif font-bold px-6 py-4 rounded-full hover:bg-white transition-colors text-xl shadow-lg shadow-gold/20"
                  >
                    Confirm & Start Stage
                  </button>
                  <button 
                    onClick={() => setScreen('menu')}
                    className="w-full px-6 py-3 rounded-full border border-white/10 hover:bg-white/5 transition-all font-serif text-white/60"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {screen === 'loading' && (
          <motion.div 
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex-1 flex flex-col items-center justify-center gap-8"
          >
            <div className="relative">
              <div className="w-32 h-32 border-4 border-gold/20 border-t-gold rounded-full animate-spin" />
              <Music className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-gold animate-pulse" size={40} />
            </div>
            <div className="text-center">
              <h2 className="text-3xl font-serif italic mb-2">Preparing the Stage...</h2>
              <p className="text-white/40 font-mono animate-pulse">Gemini AI is choreographing the notes</p>
            </div>
          </motion.div>
        )}

        {screen === 'game' && selectedSong && (
          <motion.div 
            key="game"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1"
          >
            <GameEngine 
              notes={selectedSong.notes} 
              audioUrl={selectedSong.audioUrl} 
              onFinish={(res, failed) => {
                setGameResult(res);
                setIsGameOver(!!failed);
                setScreen('result');
              }}
              onQuit={() => setScreen('menu')}
            />
          </motion.div>
        )}

        {screen === 'result' && (
          <motion.div 
            key="result"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex-1 flex flex-col items-center justify-center p-4 md:p-8 overflow-y-auto"
          >
            <div className="glass-panel p-8 md:p-12 rounded-[2rem] md:rounded-[3rem] w-full max-w-2xl text-center relative overflow-hidden my-auto shadow-2xl border border-white/10">
              <div className={`absolute top-0 left-0 w-full h-2 ${isGameOver ? 'bg-red-500' : 'bg-gold'}`} />
              
              <h2 className="text-4xl md:text-6xl font-serif font-black italic mb-2 text-white">
                {isGameOver ? 'Performance Interrupted' : 'Performance Over'}
              </h2>
              <p className={`${isGameOver ? 'text-red-500' : 'text-gold'} font-mono tracking-[0.3em] md:tracking-[0.5em] uppercase mb-8 md:mb-12 text-sm md:text-base`}>
                {isGameOver ? 'Stage Fright' : 'Standing Ovation'}
              </p>

              {gameResult ? (
                <>
                  <div className="grid grid-cols-2 gap-4 md:gap-8 mb-8 md:mb-12">
                    <div className="text-left bg-white/5 p-4 rounded-2xl border border-white/5">
                      <p className="text-white/40 font-mono uppercase text-[10px] md:text-xs">Final Score</p>
                      <p className="text-3xl md:text-5xl font-serif font-bold text-gold">{gameResult.score.toLocaleString()}</p>
                    </div>
                    <div className="text-left bg-white/5 p-4 rounded-2xl border border-white/5">
                      <p className="text-white/40 font-mono uppercase text-[10px] md:text-xs">Max Combo</p>
                      <p className="text-3xl md:text-5xl font-serif font-bold text-white">{gameResult.maxCombo || gameResult.perfect + gameResult.great}</p>
                    </div>
                  </div>

                  <div className="space-y-3 md:space-y-4 mb-8 md:mb-12">
                    {[
                      { label: 'Perfect', count: gameResult.perfect, color: 'text-green-400' },
                      { label: 'Great', count: gameResult.great, color: 'text-yellow-400' },
                      { label: 'Good', count: gameResult.good, color: 'text-orange-400' },
                      { label: 'Miss', count: gameResult.miss, color: 'text-red-500' },
                    ].map(stat => (
                      <div key={stat.label} className="flex justify-between items-center border-b border-white/5 pb-2">
                        <span className={`font-mono uppercase text-xs md:text-sm ${stat.color}`}>{stat.label}</span>
                        <span className="font-serif text-xl md:text-2xl text-white">{stat.count}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="mb-12 p-8 bg-white/5 rounded-2xl border border-white/5">
                  <p className="text-white/60 font-serif italic">No performance data available</p>
                </div>
              )}

              <div className="flex flex-col gap-4">
                <button 
                  onClick={() => setScreen('menu')}
                  className="w-full bg-gold text-black font-serif font-bold px-8 py-4 rounded-full hover:bg-white transition-all flex items-center justify-center gap-3 mx-auto text-lg md:text-xl shadow-xl shadow-gold/20 active:scale-95"
                >
                  <ArrowLeft size={24} /> Back to Lobby
                </button>
                
                {!isGameOver && (
                  <p className="text-white/20 font-mono text-[10px] uppercase tracking-widest">Bravo! Encore!</p>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
