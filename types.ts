export interface AudioItem {
  id: string;
  type: 'audio';
  file: File;
  duration: number; // in seconds
}

export interface PauseItem {
  id: string;
  type: 'pause';
  duration: number; // in seconds
}

export type TimelineItem = AudioItem | PauseItem;
