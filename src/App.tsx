import React, { useState, useCallback, useMemo } from 'react';
import type { OptimizationSettings, AiSuggestion, ImageFile, CompletionData } from './types';

import { ImageUploader } from '../components/ImageUploader';
import { OptimizationForm } from '../components/OptimizationForm';
import { ImageGroupSummary } from '../components/ImageGroupSummary';
import { CompletionSummary } from '../components/CompletionSummary';

import { getOptimizationSuggestion } from './services/geminiService';
import { useImageOptimizer } from '../hooks/useImageOptimizer';

// Dichiarazione per informare TypeScript della presenza di JSZip dalla CDN
declare var JSZip: any;

type AppState = 'upload' | 'processing' | 'summary' | 'optimizing_ai' | 'optimizing' | 'completed';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>('upload');
  const [imageFiles, setImageFiles] = useState<ImageFile[]>([]);
  const [completionData, setCompletionData] = useState<CompletionData | null>(null);
  
  const [settings, setSettings] = useState<OptimizationSettings>({
    quality: 0.85,
    maxWidth: 1920,
    format: 'webp',
  });
  const [aiSuggestion, setAiSuggestion] = useState<AiSuggestion | null>(null);

  const { optimizeAndZip } = useImageOptimizer();

  const handleFileProcessing = useCallback(async (fileList: FileList) => {
    setAppState('processing');
    const acceptedImageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    const newImageFiles: File[] = [];

    for (const file of Array.from(fileList)) {
      if (file.type === 'application/zip') {
        try {
          const zip = await JSZip.loadAsync(file);
          for (const filename in zip.files) {
            const zipEntry = zip.files[filename];
            if (!zipEntry.dir) {
              const blob = await zipEntry.async('blob');
              if (acceptedImageTypes.includes(blob.type)) {
                newImageFiles.push(new File([blob], filename, { type: blob.type }));
              }
            }
          }
        } catch (e) {
            console.error("Error reading zip file", e);
            alert("Could not read the ZIP file. It might be corrupted or in an unsupported format.");
        }
      } else if (acceptedImageTypes.includes(file.type)) {
        newImageFiles.push(file);
      }
    }
    
    if (newImageFiles.length === 0) {
        setAppState('upload');
        alert("No compatible images found in the selection.");
        return;
    }

    const imagePromises = newImageFiles.map(file =>
        new Promise<ImageFile>((resolve, reject) => {
            const image = new Image();
            const objectUrl = URL.createObjectURL(file);
            image.src = objectUrl;
            image.onload = () => resolve({
                file,
                name: file.name,
                size: file.size,
                dimensions: `${image.width}x${image.height}`,
                objectUrl
            });
            image.onerror = () => reject(`Could not load image: ${file.name}`);
        })
    );
    
    try {
        const loadedImages = await Promise.all(imagePromises);
        setImageFiles(loadedImages);
        setAppState('summary');
    } catch(error) {
        console.error(error);
        alert(`An error occurred while loading images: ${error}`);
        setAppState('upload');
    }
  }, []);
  
  const groupedImages = useMemo(() => {
    return imageFiles.reduce((acc, image) => {
      const { dimensions } = image;
      if (!acc[dimensions]) {
        acc[dimensions] = [];
      }
      acc[dimensions].push(image);
      return acc;
    }, {} as Record<string, ImageFile[]>);
  }, [imageFiles]);

  const totalOriginalSize = useMemo(() => {
    return imageFiles.reduce((sum, file) => sum + file.size, 0);
  }, [imageFiles]);
  
  const handleGetAiSuggestion = useCallback(async () => {
    if (imageFiles.length === 0) return;
    
    const representativeImage = imageFiles[0].file;
    setAppState('optimizing_ai');
    setAiSuggestion(null);

    try {
      const suggestion = await getOptimizationSuggestion(representativeImage);
      if (suggestion) {
        setSettings(prev => ({
          ...prev,
          format: suggestion.format,
          quality: suggestion.quality,
          maxWidth: suggestion.maxWidth,
        }));
        setAiSuggestion(suggestion);
      }
    } catch (error) {
      console.error("Failed to get AI suggestion:", error);
      alert("Could not get AI suggestion. Please check the console for details.");
    } finally {
      setAppState('summary');
    }
  }, [imageFiles]);

  const handleOptimize = useCallback(async () => {
    setAppState('optimizing');
    try {
        const result = await optimizeAndZip(imageFiles, settings);
        if (result) {
            setCompletionData({
                blob: result.blob,
                initialSize: totalOriginalSize,
                finalSize: result.finalSize,
                fileCount: imageFiles.length,
            });
            setAppState('completed');
        } else {
            // Handle case where optimization returns nothing
            alert("Optimization failed to produce a result.");
            setAppState('summary');
        }
    } catch(error) {
        console.error("Optimization failed", error);
        alert(`An error occurred during optimization: ${error}`);
        setAppState('summary');
    }
  }, [imageFiles, settings, optimizeAndZip, totalOriginalSize]);


  const handleReset = () => {
      imageFiles.forEach(f => URL.revokeObjectURL(f.objectUrl));
      setImageFiles([]);
      setAiSuggestion(null);
      setCompletionData(null);
      setSettings({ quality: 0.85, maxWidth: 1920, format: 'webp' });
      setAppState('upload');
  }

  const isLoading = appState === 'processing' || appState === 'optimizing_ai' || appState === 'optimizing';

  return (
    <>
      <div className="container mx-auto px-4 py-8 md:py-12">
        <header className="text-center mb-8 md:mb-12">
            <h1 className="text-2xl md:text-3xl tracking-tight text-[hsl(var(--foreground))] mb-4">
                Bulk AI Image Optimizer
            </h1>
            <p className="text-base text-[hsl(var(--muted-foreground))] max-w-2xl mx-auto">
              Upload multiple images or a ZIP. Get AI suggestions. Download an optimized ZIP.
            </p>
        </header>

        <main className="max-w-5xl mx-auto">
          {appState === 'upload' && <ImageUploader onUpload={handleFileProcessing} disabled={isLoading} />}
          
          { (appState === 'summary' || appState === 'optimizing_ai' || appState === 'optimizing') && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-1">
                <OptimizationForm 
                    settings={settings}
                    onSettingsChange={setSettings}
                    onOptimize={handleOptimize}
                    onGetAiSuggestion={handleGetAiSuggestion}
                    onReset={handleReset}
                    isAiLoading={appState === 'optimizing_ai'}
                    isOptimizing={appState === 'optimizing'}
                    aiSuggestion={aiSuggestion}
                />
              </div>
              <div className="lg:col-span-2">
                <ImageGroupSummary
                    groupedImages={groupedImages}
                    totalFiles={imageFiles.length}
                    totalOriginalSize={totalOriginalSize}
                />
              </div>
            </div>
          )}

          {appState === 'completed' && completionData && (
              <CompletionSummary data={completionData} onReset={handleReset} />
          )}
        </main>
      </div>
    </>
  );
};

export default App;