import { GoogleGenAI, Type } from "@google/genai";
import { NoteData } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function generateBeatmap(title: string, artist: string, durationSeconds: number): Promise<NoteData[]> {
  const prompt = `Generate a high-energy rhythm game beatmap for the song "${title}" by "${artist}". 
  The song is approximately ${durationSeconds} seconds long. 
  Return a JSON array of notes. Each note has:
  - time: number (milliseconds from start)
  - lane: number (0 to 3)
  - type: string ("tap")
  
  CRITICAL REQUIREMENTS:
  1. VARIETY: Avoid simple sequential patterns (like 0,1,2,3). Use jumps (e.g., 0 to 2, 3 to 1).
  2. RANDOMNESS: Distribute notes across all 4 lanes unpredictably.
  3. RHYTHM: Use syncopation and varied intervals. Some parts should be fast, some slow.
  4. PLAYABILITY: No more than 2 notes at the exact same time.
  5. STYLE: Musical Theatre style - dramatic, expressive, and matching the energy of the track.
  
  Total notes should be around ${Math.floor(durationSeconds * 3)}.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              time: { type: Type.NUMBER },
              lane: { type: Type.NUMBER },
              type: { type: Type.STRING },
            },
            required: ["time", "lane", "type"],
          },
        },
      },
    });

    const notes = JSON.parse(response.text);
    return notes.map((n: any, index: number) => ({
      ...n,
      id: `note-${index}-${Date.now()}`,
    }));
  } catch (error) {
    console.error("AI Generation failed, falling back to procedural:", error);
    return generateProceduralNotes(durationSeconds);
  }
}

function generateProceduralNotes(durationSeconds: number): NoteData[] {
  const notes: NoteData[] = [];
  const bpm = 120;
  const baseInterval = (60 / bpm) * 1000;
  let lastLane = -1;
  
  for (let t = 1000; t < durationSeconds * 1000 - 2000; ) {
    // 随机选择节奏间隔（1/4拍, 1/2拍, 1拍）
    const multipliers = [0.25, 0.5, 1, 2];
    const interval = baseInterval * multipliers[Math.floor(Math.random() * multipliers.length)];
    
    // 随机选择轨道，避免与上一个相同
    let lane = Math.floor(Math.random() * 4);
    if (lane === lastLane) lane = (lane + 1) % 4;
    
    notes.push({
      id: `p-note-${t}`,
      time: t,
      lane: lane,
      type: 'tap',
    });
    
    lastLane = lane;
    t += interval;
  }
  return notes;
}
