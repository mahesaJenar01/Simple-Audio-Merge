import { useState, useRef, useEffect, useCallback } from 'react';
import { TimelineItem, AudioItem } from '../types';

export const useAudioProcessor = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [mergedAudioBuffer, setMergedAudioBuffer] = useState<AudioBuffer | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const animationFrameIdRef = useRef<number | null>(null);
  const playbackStartTimeRef = useRef(0);
  const startOffsetRef = useRef(0);
  const durationRef = useRef(0);

  useEffect(() => {
    const initializeAudioContext = () => {
        if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        if (audioContextRef.current.state === 'suspended') {
            audioContextRef.current.resume();
        }
    };
    
    document.addEventListener('click', initializeAudioContext, { once: true });

    return () => {
      audioContextRef.current?.close();
    };
  }, []);

  const stop = useCallback(() => {
    if (animationFrameIdRef.current) {
      cancelAnimationFrame(animationFrameIdRef.current);
      animationFrameIdRef.current = null;
    }
    if (sourceNodeRef.current) {
      sourceNodeRef.current.onended = null;
      try {
        sourceNodeRef.current.stop();
      } catch (e) {
        console.warn("Could not stop audio source, it might have already finished.", e);
      }
      sourceNodeRef.current.disconnect();
      sourceNodeRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  const play = useCallback((buffer: AudioBuffer, offset: number) => {
    if (!audioContextRef.current) return;
    stop(); // Ensure everything is stopped before playing.

    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }

    const source = audioContextRef.current.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContextRef.current.destination);
    source.start(0, offset);
    sourceNodeRef.current = source;
    
    playbackStartTimeRef.current = audioContextRef.current.currentTime;
    startOffsetRef.current = offset;
    setIsPlaying(true);
    setDuration(buffer.duration);
    durationRef.current = buffer.duration;

    source.onended = () => {
      if (sourceNodeRef.current === source) {
        setIsPlaying(false);
        if (animationFrameIdRef.current) {
          cancelAnimationFrame(animationFrameIdRef.current);
          animationFrameIdRef.current = null;
        }
        // Playback finished naturally, so reset time to 0.
        setCurrentTime(0);
      }
    };

    const tick = () => {
        if (!audioContextRef.current || audioContextRef.current.state !== 'running') {
            return;
        }
        const elapsed = audioContextRef.current.currentTime - playbackStartTimeRef.current;
        const newTime = startOffsetRef.current + elapsed;
        const currentDuration = durationRef.current;
        setCurrentTime(newTime < currentDuration ? newTime : currentDuration);
        animationFrameIdRef.current = requestAnimationFrame(tick);
    };
    tick();
  }, [stop]);

  const reset = useCallback(() => {
    stop();
    setMergedAudioBuffer(null);
    setCurrentTime(0);
    setDuration(0);
    durationRef.current = 0;
  }, [stop]);

  const seek = useCallback((time: number) => {
    if (mergedAudioBuffer) {
      const clampedTime = Math.max(0, Math.min(time, duration));
      setCurrentTime(clampedTime);
      if (isPlaying) {
        stop();
        play(mergedAudioBuffer, clampedTime);
      }
    }
  }, [mergedAudioBuffer, duration, isPlaying, stop, play]);

  const mergeAndPlay = useCallback(async (timelineItems: TimelineItem[]) => {
    if (!audioContextRef.current) {
      alert("Audio context not available. Please click on the page to enable audio.");
      return;
    }
    if (audioContextRef.current.state === 'suspended') {
      await audioContextRef.current.resume();
    }
    
    stop();

    // If a merged buffer already exists, play from the current (or start) time.
    if (mergedAudioBuffer) {
      const startTime = currentTime >= duration - 0.01 ? 0 : currentTime;
      play(mergedAudioBuffer, startTime);
      return;
    }
    
    // Otherwise, this is a fresh merge.
    setCurrentTime(0);

    const audioItems = timelineItems.filter((item): item is AudioItem => item.type === 'audio');
    if (audioItems.length === 0) {
      console.warn("No audio to merge.");
      return;
    }

    setIsLoading(true);

    try {
      const audioBuffers = await Promise.all(
        audioItems.map(item =>
          item.file.arrayBuffer().then(buffer =>
            audioContextRef.current!.decodeAudioData(buffer)
          )
        )
      );
      const audioBufferMap = new Map(audioItems.map((item, index) => [item.id, audioBuffers[index]]));

      const totalDuration = timelineItems.reduce((acc, item) => {
        if (item.type === 'audio') {
          const buffer = audioBufferMap.get(item.id);
          return acc + (buffer ? buffer.duration : 0);
        }
        return acc + item.duration;
      }, 0);

      if (totalDuration === 0) {
        console.warn("Total duration is zero. Nothing to play.");
        setIsLoading(false);
        return;
      }

      const offlineContext = new OfflineAudioContext(
        1,
        Math.ceil(totalDuration * audioContextRef.current.sampleRate),
        audioContextRef.current.sampleRate
      );

      let currentTimeOffset = 0;
      timelineItems.forEach(item => {
        if (item.type === 'audio') {
          const buffer = audioBufferMap.get(item.id);
          if (buffer) {
            const source = offlineContext.createBufferSource();
            source.buffer = buffer;
            source.connect(offlineContext.destination);
            source.start(currentTimeOffset);
            currentTimeOffset += buffer.duration;
          }
        } else {
          currentTimeOffset += item.duration;
        }
      });

      const mergedBuffer = await offlineContext.startRendering();
      setMergedAudioBuffer(mergedBuffer);
      play(mergedBuffer, 0);

    } catch (error) {
      console.error("Failed to process audio:", error);
      alert("An error occurred while processing the audio. See console for details.");
    } finally {
      setIsLoading(false);
    }
  }, [stop, play, mergedAudioBuffer, currentTime, duration]);

  return { isLoading, isPlaying, mergeAndPlay, stop, mergedAudioBuffer, currentTime, duration, seek, reset };
};