
import { GoogleGenAI, Type } from "@google/genai";
import type { AiSuggestion, ImageFormat } from '../types';

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

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

const responseSchema = {
    type: Type.OBJECT,
    properties: {
        reasoning: {
            type: Type.STRING,
            description: "A brief explanation of your choices for format, quality and dimensions, explaining why they are optimal for web use."
        },
        format: {
            type: Type.STRING,
            enum: ["jpeg", "png", "webp"],
            description: "The suggested image format."
        },
        quality: {
            type: Type.NUMBER,
            description: "A quality value between 0.7 and 0.95."
        },
        maxWidth: {
            type: Type.INTEGER,
            description: "A suggested maximum width in pixels, like 1920, 1280, or 1024. Choose a sensible value based on typical web usage."
        }
    },
    required: ["reasoning", "format", "quality", "maxWidth"]
};

export const getOptimizationSuggestion = async (file: File): Promise<AiSuggestion | null> => {
  try {
    const thumbnail = await createThumbnail(file, 512);
    const imagePart = await fileToGenerativePart(thumbnail);

    const textPart = {
      text: `You are an expert in web image optimization. Analyze the provided image. Your goal is to suggest the best optimization settings to balance file size and visual quality for a fast-loading website. Provide your response in the requested JSON format.`
    };

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [textPart, imagePart] },
        config: {
            responseMimeType: "application/json",
            responseSchema: responseSchema
        }
    });
    
    const jsonText = response.text.trim();
    const parsedJson = JSON.parse(jsonText);

    // Basic validation
    if(parsedJson && parsedJson.format && parsedJson.quality && parsedJson.maxWidth && parsedJson.reasoning) {
        return {
            ...parsedJson,
            format: parsedJson.format.toLowerCase() as ImageFormat
        };
    }
    return null;

  } catch (error) {
    console.error("Error calling Gemini API:", error);
    throw new Error("Failed to get suggestions from the AI.");
  }
};
