import { useCallback } from 'react';
import type { OptimizationSettings, ImageFile } from '../types';

// Dichiarazione per informare TypeScript della presenza di JSZip dalla CDN
declare var JSZip: any;

export const useImageOptimizer = () => {

  const optimizeAndZip = useCallback(async (
    files: ImageFile[],
    settings: OptimizationSettings
  ): Promise<{ blob: Blob; finalSize: number } | null> => {
    if (!files.length) return null;

    const zip = new JSZip();

    const optimizationPromises = files.map(imageFile => {
      return new Promise<void>((resolve, reject) => {
        const image = new Image();
        image.src = imageFile.objectUrl;

        image.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) return reject(new Error('Canvas context not available'));

          let { width, height } = image;
          const { maxWidth, quality, format } = settings;

          if (width > maxWidth) {
            const ratio = maxWidth / width;
            width = maxWidth;
            height = height * ratio;
          }

          canvas.width = width;
          canvas.height = height;
          ctx.drawImage(image, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (blob) {
                const originalName = imageFile.name.substring(0, imageFile.name.lastIndexOf('.'));
                const newFileName = `${originalName}-optimized.${format}`;
                zip.file(newFileName, blob);
                resolve();
              } else {
                reject(new Error(`Failed to create blob for ${imageFile.name}`));
              }
            },
            `image/${format}`,
            quality
          );
        };
        image.onerror = () => reject(new Error(`Failed to load image ${imageFile.name}`));
      });
    });

    try {
      await Promise.all(optimizationPromises);

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      
      return { blob: zipBlob, finalSize: zipBlob.size };

    } catch (error) {
      console.error("Error during image optimization and zipping:", error);
      // Re-throw the error to be caught by the calling function
      throw error;
    }
  }, []);

  return { optimizeAndZip };
};