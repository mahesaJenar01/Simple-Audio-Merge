import React, { useState, useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { AudioItem } from '../types';
import { formatTime } from '../utils/audioUtils';
import { CopyIcon, TrashIcon, PlayIcon, StopIcon } from './Icons';
import { Progress } from './Progress';

interface AudioTrackProps {
  item: AudioItem;
  onDelete: () => void;
  onDuplicate: () => void;
  onInsertPause: (position: 'above' | 'below') => void;
  onPlay: () => void;
}

export const AudioTrack = forwardRef<{ stop: () => void }, AudioTrackProps>(
  ({ item, onDelete, onDuplicate, onInsertPause, onPlay }, ref) => {
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);

    const audioContextRef = useRef<AudioContext | null>(null);
    const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
    const audioBufferRef = useRef<AudioBuffer | null>(null);
    const animationFrameIdRef = useRef<number | null>(null);
    const playbackStartTimeRef = useRef(0);
    const startOffsetRef = useRef(0);

    const stopPlayback = useCallback(() => {
      if (animationFrameIdRef.current) {
          cancelAnimationFrame(animationFrameIdRef.current);
          animationFrameIdRef.current = null;
      }
      if (sourceNodeRef.current) {
          sourceNodeRef.current.onended = null;
          sourceNodeRef.current.stop();
          sourceNodeRef.current.disconnect();
          sourceNodeRef.current = null;
      }
      if (audioContextRef.current) {
          audioContextRef.current.close().then(() => {
              audioContextRef.current = null;
          });
      }
      setIsPlaying(false);
    }, []);
    
    useImperativeHandle(ref, () => ({
      stop: stopPlayback,
    }), [stopPlayback]);

    const playAudio = useCallback((offset: number = 0) => {
      if (!audioBufferRef.current) return;

      stopPlayback();
      startOffsetRef.current = offset;
      
      const context = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = context;

      const source = context.createBufferSource();
      source.buffer = audioBufferRef.current;
      source.connect(context.destination);
      
      source.onended = () => {
          if (sourceNodeRef.current === source) {
              stopPlayback();
              setCurrentTime(0);
          }
      };
      
      source.start(0, offset);
      sourceNodeRef.current = source;
      playbackStartTimeRef.current = context.currentTime;
      setIsPlaying(true);

      const tick = () => {
          if (context.state === 'running') {
              const elapsed = context.currentTime - playbackStartTimeRef.current;
              const newTime = startOffsetRef.current + elapsed;
              if (newTime <= item.duration) {
                  setCurrentTime(newTime);
                  animationFrameIdRef.current = requestAnimationFrame(tick);
              } else {
                  setCurrentTime(item.duration);
                  // onended will handle the stop
              }
          }
      };
      tick();
    }, [item.duration, stopPlayback]);

    useEffect(() => {
      const decodeAudio = async () => {
          if (isPlaying) {
            stopPlayback();
          }
          setCurrentTime(0);
          const tempAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
          const arrayBuffer = await item.file.arrayBuffer();
          try {
            const decodedBuffer = await tempAudioContext.decodeAudioData(arrayBuffer);
            audioBufferRef.current = decodedBuffer;
          } catch (err) {
            console.error("Error decoding individual audio:", err);
            audioBufferRef.current = null;
          } finally {
            await tempAudioContext.close();
          }
      };
      decodeAudio();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [item.file]);

    useEffect(() => {
      return stopPlayback;
    }, [stopPlayback]);


    const handleTogglePlay = () => {
      if (isPlaying) {
          stopPlayback();
      } else {
          onPlay();
          playAudio(currentTime >= item.duration ? 0 : currentTime);
      }
    };

    const handleSeek = (time: number) => {
      if (audioBufferRef.current) {
          setCurrentTime(time);
          if (isPlaying) {
              playAudio(time);
          }
      }
    };

    const handleContextMenu = (e: React.MouseEvent) => {
      e.preventDefault();
      setContextMenu({ x: e.clientX, y: e.clientY });
    };
    
    const handleInsertPause = (position: 'above' | 'below') => {
      onInsertPause(position);
      setContextMenu(null);
    };

    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
          setContextMenu(null);
        }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }, []);

    return (
      <div 
        className="bg-gray-700/50 p-3 rounded-lg shadow transition-shadow hover:shadow-lg hover:bg-gray-700"
        onContextMenu={handleContextMenu}
      >
        <div className="flex items-center">
          <div className="flex items-center gap-3 flex-grow min-w-0">
              <button
                  onClick={handleTogglePlay}
                  title={isPlaying ? "Stop preview" : "Play preview"}
                  className="p-2 rounded-full text-indigo-400 hover:bg-gray-600 transition-colors flex-shrink-0"
                  aria-label={isPlaying ? "Stop preview" : "Play preview"}
              >
                  {isPlaying ? <StopIcon /> : <PlayIcon />}
              </button>
              <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-100 truncate" title={item.file.name}>{item.file.name}</p>
              <p className="text-sm text-gray-400">Duration: {formatTime(item.duration)}</p>
              </div>
          </div>
          <div className="flex items-center gap-2 ml-4">
              <button onClick={onDuplicate} className="p-2 text-gray-400 hover:text-white hover:bg-gray-600 rounded-full transition-colors" title="Duplicate">
              <CopyIcon />
              </button>
              <button onClick={onDelete} className="p-2 text-gray-400 hover:text-red-500 hover:bg-gray-600 rounded-full transition-colors" title="Delete">
              <TrashIcon />
              </button>
          </div>
        </div>
        <div 
          className="mt-3 pt-3 border-t border-gray-600/50"
          onMouseDown={(e) => e.stopPropagation()}
        >
            <Progress 
              currentTime={currentTime}
              duration={item.duration}
              onSeek={handleSeek}
            />
        </div>
        {contextMenu && (
          <div
            ref={menuRef}
            style={{ top: contextMenu.y, left: contextMenu.x }}
            className="fixed z-50 bg-gray-800 border border-gray-700 rounded-md shadow-lg py-1"
          >
            <button
              onClick={() => handleInsertPause('above')}
              className="block w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-indigo-600 hover:text-white"
            >
              Insert pause above
            </button>
            <button
              onClick={() => handleInsertPause('below')}
              className="block w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-indigo-600 hover:text-white"
            >
              Insert pause below
            </button>
          </div>
        )}
      </div>
    );
  }
);