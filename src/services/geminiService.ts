import { GoogleGenerativeAI } from "@google/generative-ai";
import type { AiSuggestion, ImageFormat } from '../types';

// For demo purposes, we'll disable AI suggestions since we don't have API key
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

const fileToGenerativePart = async (file: File) => {
  const base64EncodedDataPromise = new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.readAsDataURL(file);
  });
  return {
    inlineData: { data: await base64EncodedDataPromise, mimeType: file.type },
  };
};

// Function to resize image before sending to AI
const createThumbnail = (file: File, maxSize: number): Promise<File> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('Canvas context not available'));

      let { width, height } = img;
      if (width > height) {
        if (width > maxSize) {
          height *= maxSize / width;
          width = maxSize;
        }
      } else {
        if (height > maxSize) {
          width *= maxSize / height;
          height = maxSize;
        }
      }
      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob((blob) => {
        if (blob) {
            resolve(new File([blob], file.name, { type: 'image/jpeg', lastModified: Date.now() }));
        } else {
            reject(new Error('Canvas to Blob conversion failed'));
        }
      }, 'image/jpeg', 0.9);
    };
    img.onerror = reject;
  });
};

export const getOptimizationSuggestion = async (file: File): Promise<AiSuggestion | null> => {
  if (!API_KEY) {
    // Return a default suggestion when no API key is available
    return {
      reasoning: "Default optimization settings for web use: WebP format for better compression, 85% quality for good balance between size and quality, and 1920px max width for modern displays.",
      format: 'webp',
      quality: 0.85,
      maxWidth: 1920
    };
  }

  try {
    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const thumbnail = await createThumbnail(file, 512);
    const imagePart = await fileToGenerativePart(thumbnail);

    const prompt = `You are an expert in web image optimization. Analyze the provided image and suggest the best optimization settings to balance file size and visual quality for a fast-loading website. 

Please respond with a JSON object containing:
- reasoning: A brief explanation of your choices
- format: One of "jpeg", "png", or "webp"
- quality: A number between 0.7 and 0.95
- maxWidth: A suggested maximum width in pixels (like 1920, 1280, or 1024)

Example response:
{
  "reasoning": "This image has many details and would benefit from WebP compression with high quality",
  "format": "webp",
  "quality": 0.9,
  "maxWidth": 1920
}`;

    const result = await model.generateContent([prompt, imagePart]);
    const response = await result.response;
    const text = response.text();
    
    // Try to extract JSON from the response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsedJson = JSON.parse(jsonMatch[0]);
      
      // Basic validation
      if(parsedJson && parsedJson.format && parsedJson.quality && parsedJson.maxWidth && parsedJson.reasoning) {
        return {
          ...parsedJson,
          format: parsedJson.format.toLowerCase() as ImageFormat
        };
      }
    }
    
    return null;

  } catch (error) {
    console.error("Error calling Gemini API:", error);
    throw new Error("Failed to get suggestions from the AI.");
  }
};