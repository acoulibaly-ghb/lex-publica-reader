
import { GoogleGenAI, Modality } from "@google/genai";

// Fonctions utilitaires pour le décodage audio
export function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

export const generateSpeech = async (text: string, voiceName: string = 'Kore', speakingRate: number = 1.0): Promise<string> => {
  if (!navigator.onLine) throw new Error("NETWORK_DISCONNECTED");
  if (!process.env.API_KEY) throw new Error("API_KEY_MISSING");

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ 
      parts: [{ 
        text: `Lis le texte suivant avec une voix naturelle, claire et posée, en respectant l'accentuation du français de France : ${text}` 
      }] 
    }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName },
        },
      },
    },
  });

  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!base64Audio) throw new Error("EMPTY_RESPONSE");
  return base64Audio;
};

export const speakText = async (text: string, voiceName: string = 'Kore', speed: number = 1.0): Promise<void> => {
  if (!navigator.onLine) throw new Error("NETWORK_DISCONNECTED");
  if (!process.env.API_KEY) throw new Error("API_KEY_MISSING");

  try {
    const base64Audio = await generateSpeech(text, voiceName, speed);
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    const audioBytes = decode(base64Audio);
    const audioBuffer = await decodeAudioData(audioBytes, audioContext, 24000, 1);
    
    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.playbackRate.value = speed;
    source.connect(audioContext.destination);
    source.start();
  } catch (error: any) {
    console.error("Erreur Gemini TTS :", error);
    const errorMessage = error.message || "";
    if (errorMessage.includes("401") || errorMessage.includes("API_KEY_INVALID")) throw new Error("API_KEY_INVALID");
    if (errorMessage.includes("429") || errorMessage.includes("quota")) throw new Error("QUOTA_EXCEEDED");
    if (errorMessage.includes("fetch") || errorMessage.includes("network")) throw new Error("NETWORK_ERROR");
    throw new Error("UNKNOWN_TTS_ERROR");
  }
};
