import React from 'react';
import { PlayIcon, StopIcon, UploadIcon, SpinnerIcon, DownloadIcon } from './Icons';
import { bufferToWav } from '../utils/audioExport';
import { Progress } from './Progress';

interface ControlsProps {
  onFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onMerge: () => void;
  onStop: () => void;
  isLoading: boolean;
  isPlaying: boolean;
  canMerge: boolean;
  mergedAudioBuffer: AudioBuffer | null;
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
}

export const Controls: React.FC<ControlsProps> = ({
  onFileChange,
  onMerge,
  onStop,
  isLoading,
  isPlaying,
  canMerge,
  mergedAudioBuffer,
  currentTime,
  duration,
  onSeek
}) => {
  const handleDownload = () => {
    if (!mergedAudioBuffer) return;
    const wavBlob = bufferToWav(mergedAudioBuffer);
    const url = URL.createObjectURL(wavBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `merged-audio-${new Date().toISOString().slice(0, 19).replace('T', '_').replace(/:/g, '-')}.wav`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full space-y-6">
      <h2 className="text-xl font-semibold text-white">Controls</h2>
      
      <div>
        <label
          htmlFor="audio-upload"
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 text-white font-semibold rounded-lg cursor-pointer hover:bg-indigo-500 transition-colors shadow-md"
        >
          <UploadIcon />
          Upload Audio
        </label>
        <input
          id="audio-upload"
          type="file"
          accept="audio/*"
          multiple
          onChange={onFileChange}
          className="hidden"
        />
      </div>

      <div className="flex-grow"></div>

      <div className="pt-4 border-t border-gray-700 space-y-4">
        {(isPlaying || (mergedAudioBuffer && !isLoading)) && (
          <div className="p-2 bg-gray-900/50 rounded-lg">
            <Progress 
              currentTime={currentTime}
              duration={duration}
              onSeek={onSeek}
            />
          </div>
        )}

        {mergedAudioBuffer && !isLoading && !isPlaying && (
            <button
                onClick={handleDownload}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-500 transition-colors"
            >
                <DownloadIcon />
                Download .WAV
            </button>
        )}
        {isPlaying ? (
          <button
            onClick={onStop}
            className="w-full flex items-center justify-center gap-2 px-4 py-4 bg-red-600 text-white font-bold rounded-lg hover:bg-red-500 transition-colors text-lg shadow-lg"
          >
            <StopIcon />
            Stop
          </button>
        ) : (
          <button
            onClick={onMerge}
            disabled={isLoading || !canMerge}
            className="w-full flex items-center justify-center gap-2 px-4 py-4 bg-green-600 text-white font-bold rounded-lg hover:bg-green-500 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors text-lg shadow-lg"
          >
            {isLoading ? (
              <>
                <SpinnerIcon />
                Processing...
              </>
            ) : (
              <>
                <PlayIcon />
                {mergedAudioBuffer ? 'Play Again' : 'Merge & Play'}
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
};