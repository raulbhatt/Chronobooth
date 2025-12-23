
export interface Era {
  id: string;
  name: string;
  description: string;
  prompt: string;
  icon: string; // Emoji or specific icon identifier
  color: string;
}

export interface AnalysisResult {
  description: string;
  tags: string[];
}

export interface MusicTrack {
  id: string;
  name: string;
  url: string;
  style: string;
}

export interface HistoryItem {
  id: string;
  imageUrl: string;
  era: Era;
  timestamp: number;
}

export type VideoResolution = '720p' | '1080p';
export type VideoAspectRatio = '9:16' | '16:9';

export enum AppState {
  SPLASH = 'SPLASH',
  DASHBOARD = 'DASHBOARD',
  FEATURE_DETAILS = 'FEATURE_DETAILS',
  CAMERA = 'CAMERA',
  PREVIEW = 'PREVIEW',
  PROCESSING = 'PROCESSING',
  RESULT = 'RESULT',
  EDITING = 'EDITING'
}
