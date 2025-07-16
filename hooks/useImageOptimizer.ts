import { useCallback } from 'react';
import type { OptimizationSettings, ImageFile, OptimizationResult } from '../src/types';
import { 
  calculateOptimalDimensions, 
  createOptimizedCanvas, 
  loadImageFromFile,
  generateOptimizedFileName,
  createProcessingError
} from '../src/utils/imageUtils';

// Declare JSZip for TypeScript
declare var JSZip: any;

export const useImageOptimizer = () => {
  /**
   * Optimizes a single image file
   */
  const optimizeSingleImage = useCallback(async (
    imageFile: ImageFile,
    settings: OptimizationSettings
  ): Promise<{ name: string; blob: Blob }> => {
    try {
      const image = await loadImageFromFile(imageFile.file);
      const { quality, maxWidth, format } = settings;
      
      // Calculate optimal dimensions
      const dimensions = calculateOptimalDimensions(image.width, image.height, maxWidth);
      
      // Create optimized canvas
      const canvas = createOptimizedCanvas(image, dimensions);
      
      // Convert to blob with specified format and quality
      return new Promise((resolve, reject) => {
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const fileName = generateOptimizedFileName(imageFile.name, format);
              resolve({ name: fileName, blob });
            } else {
              reject(createProcessingError(
                'Failed to create optimized blob', 
                imageFile.name, 
                'compression'
              ));
            }
          },
          `image/${format}`,
          quality
        );
      });
    } catch (error) {
      throw createProcessingError(
        `Optimization failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        imageFile.name,
        'optimization'
      );
    }
  }, []);

  /**
   * Optimizes multiple images and creates a ZIP file
   */
  const optimizeAndZip = useCallback(async (
    files: ImageFile[],
    settings: OptimizationSettings
  ): Promise<OptimizationResult | null> => {
    if (!files.length) return null;

    try {
      const zip = new JSZip();
      
      // Process images in batches to avoid memory issues
      const BATCH_SIZE = 5;
      const batches = [];
      
      for (let i = 0; i < files.length; i += BATCH_SIZE) {
        batches.push(files.slice(i, i + BATCH_SIZE));
      }
      
      // Process each batch sequentially
      for (const batch of batches) {
        const batchPromises = batch.map(imageFile => 
          optimizeSingleImage(imageFile, settings)
        );
        
        const batchResults = await Promise.all(batchPromises);
        
        // Add results to ZIP
        batchResults.forEach(({ name, blob }) => {
          zip.file(name, blob);
        });
      }

      // Generate ZIP file
      const zipBlob = await zip.generateAsync({ 
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 }
      });
      
      return { 
        blob: zipBlob, 
        finalSize: zipBlob.size 
      };

    } catch (error) {
      console.error('Batch optimization failed:', error);
      throw error;
    }
  }, [optimizeSingleImage]);

  return { 
    optimizeAndZip,
    optimizeSingleImage 
  };
};