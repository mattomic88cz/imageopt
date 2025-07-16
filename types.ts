export type ImageFormat = 'jpeg' | 'png' | 'webp';

export interface OptimizationSettings {
  quality: number;
  maxWidth: number;
  format: ImageFormat;
}

export interface AiSuggestion {
  reasoning: string;
  format: ImageFormat;
  quality: number;
  maxWidth: number;
}

export interface ImageFile {
  file: File;
  name: string;
  size: number;
  dimensions: string; // e.g., "1920x1080"
  objectUrl: string;
}

export interface CompletionData {
    blob: Blob;
    initialSize: number;
    finalSize: number;
    fileCount: number;
}