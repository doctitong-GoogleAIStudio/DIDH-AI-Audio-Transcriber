import { GoogleGenAI } from "@google/genai";
import { Language } from "../types";

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      const base64String = result.split(',')[1];
      if (base64String) {
        resolve(base64String);
      } else {
        reject(new Error("Could not convert file to base64."));
      }
    };
    reader.onerror = (error) => reject(error);
  });
};

export const detectLanguage = async (file: File): Promise<Language> => {
    if (!process.env.API_KEY) {
        throw new Error("API_KEY environment variable not set.");
    }
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    try {
        const base64Audio = await fileToBase64(file);
        const audioPart = {
            inlineData: {
                mimeType: file.type,
                data: base64Audio,
            },
        };

        const supportedLanguages = Object.values(Language).filter(lang => lang !== Language.AUTO_DETECT).join(', ');

        const textPart = {
            text: `You are an expert language detection service. Analyze the following audio file and identify the primary spoken language. Respond with only the name of the language from this list: ${supportedLanguages}. If you cannot determine the language with high confidence, respond with "Unknown".`,
        };

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [audioPart, textPart] },
        });

        const detectedLangText = response.text.trim();
        const detectedLangEnum = Object.values(Language).find(
            lang => lang.toLowerCase() === detectedLangText.toLowerCase()
        );

        if (detectedLangEnum && detectedLangEnum !== Language.AUTO_DETECT) {
            return detectedLangEnum;
        } else {
            throw new Error("Could not detect a supported language. Please select one manually.");
        }
    } catch (error) {
        console.error("Error detecting language:", error);
        if (error instanceof Error) {
            throw new Error(`Language detection failed: ${error.message}`);
        }
        throw new Error("An unknown error occurred during language detection.");
    }
};

export const transcribeAudio = async (
  file: File,
  language: Language
): Promise<string> => {
    if (!process.env.API_KEY) {
        throw new Error("API_KEY environment variable not set.");
    }
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    try {
        const base64Audio = await fileToBase64(file);

        const audioPart = {
            inlineData: {
                mimeType: file.type,
                data: base64Audio,
            },
        };

        const prompt = `Transcribe the following audio file. The spoken language is ${language}. Provide only the transcribed text.`;

        const textPart = {
            text: prompt,
        };

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [audioPart, textPart] },
        });
        
        return response.text;
    } catch (error) {
        console.error("Error transcribing audio:", error);
        if (error instanceof Error) {
            throw new Error(`Transcription failed: ${error.message}`);
        }
        throw new Error("An unknown error occurred during transcription.");
    }
};

export const translateText = async (
    text: string,
    sourceLanguage: Language
): Promise<string> => {
    if (!process.env.API_KEY) {
        throw new Error("API_KEY environment variable not set.");
    }
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    try {
        const prompt = `Translate the following text from ${sourceLanguage} to English. Provide only the final English translation.\n\nText:\n"""\n${text}\n"""`;
        
        const textPart = { text: prompt };

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [textPart] },
        });
        
        return response.text;
    } catch (error) {
        console.error("Error translating text:", error);
        if (error instanceof Error) {
            throw new Error(`Translation failed: ${error.message}`);
        }
        throw new Error("An unknown error occurred during translation.");
    }
};
