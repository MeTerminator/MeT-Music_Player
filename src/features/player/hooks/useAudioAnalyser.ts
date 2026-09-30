import { useEffect, useRef } from 'react';

export function useAudioAnalyser(audioRef: React.RefObject<HTMLAudioElement | null>) {
  const audioDataArrayRef = useRef<Uint8Array<ArrayBuffer> | null>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    let context: AudioContext | undefined;
    let frame = 0;
    let disposed = false;

    const initialize = () => {
      if (context || disposed) {
        if (context?.state === 'suspended') void context.resume();
        return;
      }
      try {
        context = new AudioContext();
        const source = context.createMediaElementSource(audio);
        const analyser = context.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        analyser.connect(context.destination);
        const data = new Uint8Array(new ArrayBuffer(analyser.frequencyBinCount));
        audioDataArrayRef.current = data;
        const sample = () => {
          analyser.getByteFrequencyData(data);
          frame = requestAnimationFrame(sample);
        };
        sample();
      } catch (error) {
        console.warn('音频可视化初始化失败', error);
        if (context) void context.close();
        context = undefined;
      }
    };
    document.addEventListener('pointerdown', initialize, { passive: true });
    return () => {
      disposed = true;
      document.removeEventListener('pointerdown', initialize);
      cancelAnimationFrame(frame);
      if (context) void context.close();
      audioDataArrayRef.current = null;
    };
  }, [audioRef]);

  return audioDataArrayRef;
}
