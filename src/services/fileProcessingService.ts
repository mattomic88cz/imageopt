import type { ImageFile } from '../types';
import { 
  fileToImageFile, 
  extractImagesFromZip, 
  isValidImageType,
  createProcessingError,
  SUPPORTED_IMAGE_TYPES 
} from '../utils/imageUtils';

/**
 * Processes uploaded files and converts them to ImageFile objects
 */
export const processUploadedFiles = async (fileList: FileList): Promise<ImageFile[]> => {
  const processedFiles: File[] = [];
  
  // Process each uploaded file
  for (const file of Array.from(fileList)) {
    try {
      if (file.type === 'application/zip') {
        // Extract images from ZIP file
        const extractedImages = await extractImagesFromZip(file);
        processedFiles.push(...extractedImages);
      } else if (isValidImageType(file)) {
        // Add individual image file
        processedFiles.push(file);
      }
    } catch (error) {
      console.warn(`Failed to process file ${file.name}:`, error);
      // Continue processing other files instead of failing completely
    }
  }
  
  if (processedFiles.length === 0) {
    throw createProcessingError(
      `No compatible images found. Supported formats: ${SUPPORTED_IMAGE_TYPES.join(', ')}`
    );
  }
  
  // Convert Files to ImageFiles with metadata
  const imageFilePromises = processedFiles.map(async (file, index) => {
    try {
      return await fileToImageFile(file);
    } catch (error) {
      throw createProcessingError(
        `Failed to process image ${index + 1}/${processedFiles.length}: ${file.name}`,
        file.name,
        'loading'
      );
    }
  });
  
  try {
    return await Promise.all(imageFilePromises);
  } catch (error) {
    // Clean up any created object URLs on failure
    processedFiles.forEach(file => {
      const objectUrl = URL.createObjectURL(file);
      URL.revokeObjectURL(objectUrl);
    });
    throw error;
  }
};

/**
 * Groups images by their dimensions
 */
export const groupImagesByDimensions = (images: ImageFile[]): Record<string, ImageFile[]> => {
  return images.reduce((acc, image) => {
    const { dimensions } = image;
    if (!acc[dimensions]) {
      acc[dimensions] = [];
    }
    acc[dimensions].push(image);
    return acc;
  }, {} as Record<string, ImageFile[]>);
};

/**
 * Calculates total size of image files
 */
export const calculateTotalSize = (images: ImageFile[]): number => {
  return images.reduce((sum, file) => sum + file.size, 0);
};

/**
 * Cleans up object URLs to prevent memory leaks
 */
export const cleanupImageFiles = (images: ImageFile[]): void => {
  images.forEach(image => {
    if (image.objectUrl) {
      URL.revokeObjectURL(image.objectUrl);
    }
  });
};