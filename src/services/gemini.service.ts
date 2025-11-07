import { Injectable } from '@angular/core';
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

// FIX: Added providedIn: 'root' to make this a singleton service.
@Injectable({
  providedIn: 'root'
})
export class GeminiService {
  private ai: GoogleGenAI;

  constructor() {
    // IMPORTANT: This relies on the `process.env.API_KEY` being available in the execution environment.
    if (!process.env.API_KEY) {
        throw new Error("API_KEY environment variable not set.");
    }
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  async translateText(text: string, sourceLang: string, targetLang: string): Promise<string> {
    try {
        const response: GenerateContentResponse = await this.ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Translate the following text to ${targetLang}: "${text}"`,
            config: {
              systemInstruction: `You are an expert translator. Your task is to translate text from ${sourceLang} to ${targetLang}. You must provide only the direct translation of the input text, without any additional context, comments, or explanations. Do not say "Here is the translation:" or anything similar. Just return the translated text.`,
            }
        });

      return response.text.trim();

    } catch (error) {
      console.error(`Error translating text from ${sourceLang} to ${targetLang}:`, error);
      throw new Error('Failed to translate text.');
    }
  }
}