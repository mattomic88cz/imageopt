import React, { useState, useCallback, useMemo } from 'react';
import type { OptimizationSettings, AiSuggestion, ImageFile, CompletionData } from './types';

import { ImageUploader } from '../components/ImageUploader';
import { OptimizationForm } from '../components/OptimizationForm';
import { ImageGroupSummary } from '../components/ImageGroupSummary';
import { CompletionSummary } from '../components/CompletionSummary';

import { getOptimizationSuggestion } from './services/geminiService';
import { 
  processUploadedFiles, 
  groupImagesByDimensions, 
  calculateTotalSize, 
  cleanupImageFiles 
} from './services/fileProcessingService';
import { useImageOptimizer } from "../hooks/useImageOptimizer";

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
    
    try {
      const processedImages = await processUploadedFiles(fileList);
      setImageFiles(processedImages);
      setAppState('summary');
    } catch (error) {
      console.error('File processing failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(`Failed to process files: ${errorMessage}`);
      setAppState('upload');
    }
  }, []);
  
  const groupedImages = useMemo(() => {
    return groupImagesByDimensions(imageFiles);
  }, [imageFiles]);

  const totalOriginalSize = useMemo(() => {
    return calculateTotalSize(imageFiles);
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
      alert("Could not get AI suggestion. Please try again.");
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
        throw new Error('Optimization failed to produce a result');
      }
    } catch (error) {
      console.error("Optimization failed:", error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(`Optimization failed: ${errorMessage}`);
      setAppState('summary');
    }
  }, [imageFiles, settings, optimizeAndZip, totalOriginalSize]);

  const handleReset = useCallback(() => {
    // Clean up object URLs to prevent memory leaks
    cleanupImageFiles(imageFiles);
    
    setImageFiles([]);
    setAiSuggestion(null);
    setCompletionData(null);
    setSettings({ quality: 0.85, maxWidth: 1920, format: 'webp' });
    setAppState('upload');
  }, [imageFiles]);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      cleanupImageFiles(imageFiles);
    };
  }, [imageFiles]);

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