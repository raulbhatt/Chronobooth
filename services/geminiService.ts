import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult, VideoResolution, VideoAspectRatio } from '../types';

// Initialize the Gemini API client
// We initialize this inside functions where possible to pick up fresh keys, 
// but for the global instance used for simple tasks we keep it here.
const getAiClient = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

// Helper to clean base64 string
const cleanBase64 = (data: string) => {
  return data.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, '');
};

/**
 * Analyzes an image using gemini-3-pro-preview
 */
export const analyzeImage = async (base64Image: string): Promise<AnalysisResult> => {
  const ai = getAiClient();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: cleanBase64(base64Image)
            }
          },
          {
            text: "Analyze this image. Describe the person's expression, notable features, and the lighting. Keep it concise. Also provide 3-5 keywords describing the mood."
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            description: { type: Type.STRING },
            tags: { type: Type.ARRAY, items: { type: Type.STRING } }
          }
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No analysis returned");
    return JSON.parse(text) as AnalysisResult;
  } catch (error) {
    console.error("Analysis Error:", error);
    throw error;
  }
};

/**
 * Generates a creative caption for an image using gemini-3-pro-preview
 */
export const generateImageCaption = async (base64Image: string): Promise<string> => {
  const ai = getAiClient();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: cleanBase64(base64Image)
            }
          },
          {
            text: "Write a short, creative, and engaging caption for this image. Describe the scene, atmosphere, and key details in 1-2 sentences. Make it sound like a story snippet or a memory."
          }
        ]
      }
    });

    return response.text || "No caption generated.";
  } catch (error) {
    console.error("Caption Error:", error);
    throw error;
  }
};

/**
 * Generates a new image based on the source image and an era prompt.
 * Uses gemini-2.5-flash-image (Nano banana)
 */
export const generateTimeTravelImage = async (base64Image: string, prompt: string): Promise<string> => {
  const ai = getAiClient();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image', // Nano banana for editing/generation
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: cleanBase64(base64Image)
            }
          },
          {
            text: prompt + " Ensure the output is a high-quality image."
          }
        ]
      },
      config: {
        // Nano banana doesn't support responseMimeType for images in the same way as text,
        // but we expect an image part in response.
      }
    });

    // Extract image from response
    // The response candidates content parts will contain the image
    const parts = response.candidates?.[0]?.content?.parts;
    if (parts) {
      for (const part of parts) {
        if (part.inlineData && part.inlineData.data) {
          return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
        }
      }
    }
    
    throw new Error("No image generated.");
  } catch (error) {
    console.error("Generation Error:", error);
    throw error;
  }
};

/**
 * Edits an existing image based on a text prompt.
 * Uses gemini-2.5-flash-image
 */
export const editImageWithPrompt = async (base64Image: string, editInstruction: string): Promise<string> => {
  const ai = getAiClient();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: cleanBase64(base64Image)
            }
          },
          {
            text: `Edit this image: ${editInstruction}. Maintain the overall composition and style of the original image, only applying the requested changes.`
          }
        ]
      }
    });

    const parts = response.candidates?.[0]?.content?.parts;
    if (parts) {
      for (const part of parts) {
        if (part.inlineData && part.inlineData.data) {
          return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
        }
      }
    }
    throw new Error("No edited image generated.");
  } catch (error) {
    console.error("Edit Error:", error);
    throw error;
  }
};

export interface VideoGenerationOptions {
  resolution?: VideoResolution;
  aspectRatio?: VideoAspectRatio;
}

/**
 * Generates a video from an image using Veo.
 * Uses veo-3.1-fast-generate-preview
 */
export const generateVideoFromImage = async (
  base64Image: string, 
  prompt: string, 
  options: VideoGenerationOptions = {}
): Promise<string> => {
  // Always create a new instance to pick up potentially new API key from environment
  // This is critical for Veo which requires user-selected keys
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const { resolution = '720p', aspectRatio = '9:16' } = options;
  
  // Optimize prompt for higher quality
  const optimizedPrompt = `${prompt} Cinematic lighting, high fidelity, 4k detailed texture, smooth natural motion, photorealistic masterpiece.`;

  try {
    // 1. Start generation operation
    let operation = await ai.models.generateVideos({
      model: 'veo-3.1-fast-generate-preview',
      image: {
        imageBytes: cleanBase64(base64Image),
        mimeType: 'image/jpeg',
      },
      prompt: optimizedPrompt,
      config: {
        numberOfVideos: 1,
        resolution: resolution,
        aspectRatio: aspectRatio 
      }
    });

    // 2. Poll for completion
    // Video generation takes time, so we loop until done
    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 5000)); // Poll every 5s
      operation = await ai.operations.getVideosOperation({ operation: operation });
    }

    // 3. Get the video URI
    const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!videoUri) throw new Error("Video generation failed: No URI returned.");

    // 4. Download the video content
    // We must append the API key to the URI to fetch the content
    const response = await fetch(`${videoUri}&key=${process.env.API_KEY}`);
    if (!response.ok) throw new Error(`Failed to fetch video: ${response.statusText}`);
    
    // 5. Convert to Blob URL for playback in <video> tag
    const blob = await response.blob();
    return URL.createObjectURL(blob);
    
  } catch (error) {
    console.error("Video Generation Error:", error);
    throw error;
  }
};