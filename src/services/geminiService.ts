import { GoogleGenerativeAI } from "@google/generative-ai";
import type { AiSuggestion, ImageFormat } from '../types';

// Configuration constants
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const THUMBNAIL_MAX_SIZE = 512;
const MODEL_NAME = "gemini-1.5-flash";

// Default suggestion for when API is not available
const DEFAULT_SUGGESTION: AiSuggestion = {
  reasoning: "Default optimization settings for web use: WebP format for better compression, 85% quality for good balance between size and quality, and 1920px max width for modern displays.",
  format: 'webp',
  quality: 0.85,
  maxWidth: 1920
};

/**
 * Converts a File to a format suitable for Gemini API
 */
const fileToGenerativePart = async (file: File) => {
  return new Promise<{ inlineData: { data: string; mimeType: string } }>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      const base64Data = result.split(',')[1];
      resolve({
        inlineData: { 
          data: base64Data, 
          mimeType: file.type 
        }
      });
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
};

/**
 * Creates a thumbnail of the image for API efficiency
 */
const createThumbnail = (file: File, maxSize: number): Promise<File> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    
    const cleanup = () => URL.revokeObjectURL(objectUrl);
    
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          cleanup();
          reject(new Error('Canvas context not available'));
          return;
        }

        // Calculate thumbnail dimensions
        let { width, height } = img;
        const aspectRatio = width / height;
        
        if (width > height) {
          if (width > maxSize) {
            width = maxSize;
            height = width / aspectRatio;
          }
        } else {
          if (height > maxSize) {
            height = maxSize;
            width = height * aspectRatio;
          }
        }
        
        canvas.width = Math.round(width);
        canvas.height = Math.round(height);
        
        // Enable high-quality scaling
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        canvas.toBlob((blob) => {
          cleanup();
          if (blob) {
            resolve(new File([blob], file.name, { 
              type: 'image/jpeg', 
              lastModified: Date.now() 
            }));
          } else {
            reject(new Error('Canvas to Blob conversion failed'));
          }
        }, 'image/jpeg', 0.9);
        
      } catch (error) {
        cleanup();
        reject(error);
      }
    };
    
    img.onerror = () => {
      cleanup();
      reject(new Error('Failed to load image for thumbnail creation'));
    };
    
    img.src = objectUrl;
  });
};

/**
 * Validates and normalizes AI response
 */
const validateAiResponse = (response: any): AiSuggestion | null => {
  if (!response || typeof response !== 'object') {
    return null;
  }
  
  const { reasoning, format, quality, maxWidth } = response;
  
  // Validate required fields
  if (!reasoning || typeof reasoning !== 'string') return null;
  if (!format || !['jpeg', 'png', 'webp'].includes(format.toLowerCase())) return null;
  if (typeof quality !== 'number' || quality < 0.1 || quality > 1) return null;
  if (typeof maxWidth !== 'number' || maxWidth < 100 || maxWidth > 4000) return null;
  
  return {
    reasoning: reasoning.trim(),
    format: format.toLowerCase() as ImageFormat,
    quality: Math.max(0.1, Math.min(1, quality)),
    maxWidth: Math.max(100, Math.min(4000, Math.round(maxWidth)))
  };
};

/**
 * Extracts JSON from AI response text
 */
const extractJsonFromResponse = (text: string): any => {
  try {
    // Try to parse the entire response as JSON first
    return JSON.parse(text);
  } catch {
    // If that fails, try to extract JSON from markdown code blocks or mixed content
    const jsonMatch = text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/) || 
                     text.match(/(\{[\s\S]*?\})/);
    
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[1]);
      } catch {
        return null;
      }
    }
    
    return null;
  }
};

/**
 * Gets optimization suggestion from Gemini AI
 */
export const getOptimizationSuggestion = async (file: File): Promise<AiSuggestion | null> => {
  // Return default suggestion if no API key
  if (!API_KEY) {
    // Simulate API delay for better UX
    await new Promise(resolve => setTimeout(resolve, 1000));
    return DEFAULT_SUGGESTION;
  }

  try {
    // Create thumbnail for efficient API usage
    const thumbnail = await createThumbnail(file, THUMBNAIL_MAX_SIZE);
    const imagePart = await fileToGenerativePart(thumbnail);

    // Initialize Gemini AI
    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });

    const prompt = `You are an expert in web image optimization. Analyze the provided image and suggest the best optimization settings to balance file size and visual quality for a fast-loading website.

Consider these factors:
- Image content type (photo, illustration, graphics, etc.)
- Color complexity and gradients
- Text or fine details present
- Typical web usage scenarios

Respond with a JSON object containing:
- reasoning: Brief explanation of your choices (max 150 characters)
- format: One of "jpeg", "png", or "webp" 
- quality: Number between 0.7 and 0.95
- maxWidth: Suggested maximum width in pixels (100-4000, common values: 1920, 1280, 1024, 800)

Example response:
{
  "reasoning": "Photo with many details benefits from WebP compression with high quality for web display",
  "format": "webp",
  "quality": 0.9,
  "maxWidth": 1920
}`;

    const result = await model.generateContent([prompt, imagePart]);
    const response = await result.response;
    const text = response.text();
    
    // Extract and validate JSON response
    const jsonData = extractJsonFromResponse(text);
    const validatedResponse = validateAiResponse(jsonData);
    
    return validatedResponse || DEFAULT_SUGGESTION;

  } catch (error) {
    console.error("Gemini API error:", error);
    
    // Return default suggestion on error instead of throwing
    return DEFAULT_SUGGESTION;
  }
};