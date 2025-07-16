import type { ImageDimensions, ImageFile, ProcessingError } from '../types';

// Declare JSZip for TypeScript
declare var JSZip: any;

/**
 * Supported image MIME types for processing
 */
export const SUPPORTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png', 
  'image/webp',
  'image/gif'
] as const;

/**
 * Maximum file size for processing (50MB)
 */
export const MAX_FILE_SIZE = 50 * 1024 * 1024;

/**
 * Creates a processing error with additional context
 */
export const createProcessingError = (
  message: string, 
  fileName?: string, 
  stage?: ProcessingError['stage']
): ProcessingError => {
  const error = new Error(message) as ProcessingError;
  error.fileName = fileName;
  error.stage = stage;
  return error;
};

/**
 * Validates if a file is a supported image type
 */
export const isValidImageType = (file: File): boolean => {
  return SUPPORTED_IMAGE_TYPES.includes(file.type as any);
};

/**
 * Validates file size
 */
export const isValidFileSize = (file: File): boolean => {
  return file.size <= MAX_FILE_SIZE;
};

/**
 * Calculates new dimensions while maintaining aspect ratio
 */
export const calculateOptimalDimensions = (
  originalWidth: number,
  originalHeight: number,
  maxWidth: number
): ImageDimensions => {
  if (originalWidth <= maxWidth) {
    return { width: originalWidth, height: originalHeight };
  }
  
  const ratio = maxWidth / originalWidth;
  return {
    width: maxWidth,
    height: Math.round(originalHeight * ratio)
  };
};

/**
 * Creates an optimized canvas from an image
 */
export const createOptimizedCanvas = (
  image: HTMLImageElement,
  dimensions: ImageDimensions
): HTMLCanvasElement => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    throw createProcessingError('Canvas context not available', undefined, 'optimization');
  }

  canvas.width = dimensions.width;
  canvas.height = dimensions.height;
  
  // Enable image smoothing for better quality
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  
  ctx.drawImage(image, 0, 0, dimensions.width, dimensions.height);
  return canvas;
};

/**
 * Loads an image from a File object with proper error handling
 */
export const loadImageFromFile = (file: File): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    if (!isValidImageType(file)) {
      reject(createProcessingError(`Unsupported file type: ${file.type}`, file.name, 'loading'));
      return;
    }

    if (!isValidFileSize(file)) {
      reject(createProcessingError(`File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB`, file.name, 'loading'));
      return;
    }

    const image = new Image();
    const objectUrl = URL.createObjectURL(file);
    
    const cleanup = () => URL.revokeObjectURL(objectUrl);
    
    image.onload = () => {
      cleanup();
      resolve(image);
    };
    
    image.onerror = () => {
      cleanup();
      reject(createProcessingError(`Failed to load image`, file.name, 'loading'));
    };
    
    image.src = objectUrl;
  });
};

/**
 * Converts a File to an ImageFile with metadata
 */
export const fileToImageFile = async (file: File): Promise<ImageFile> => {
  const image = await loadImageFromFile(file);
  const objectUrl = URL.createObjectURL(file);
  
  return {
    file,
    name: file.name,
    size: file.size,
    dimensions: `${image.width}x${image.height}`,
    objectUrl
  };
};

/**
 * Extracts images from a ZIP file
 */
export const extractImagesFromZip = async (zipFile: File): Promise<File[]> => {
  try {
    const zip = await JSZip.loadAsync(zipFile);
    const imageFiles: File[] = [];
    
    for (const filename in zip.files) {
      const zipEntry = zip.files[filename];
      if (!zipEntry.dir) {
        const blob = await zipEntry.async('blob');
        if (SUPPORTED_IMAGE_TYPES.includes(blob.type as any)) {
          imageFiles.push(new File([blob], filename, { type: blob.type }));
        }
      }
    }
    
    return imageFiles;
  } catch (error) {
    throw createProcessingError('Failed to extract ZIP file', zipFile.name, 'loading');
  }
};

/**
 * Formats bytes to human readable string
 */
export const formatBytes = (bytes: number, decimals = 2): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

/**
 * Generates a unique filename for optimized images
 */
export const generateOptimizedFileName = (originalName: string, format: string): string => {
  const nameWithoutExt = originalName.substring(0, originalName.lastIndexOf('.'));
  return `${nameWithoutExt}-optimized.${format}`;
};