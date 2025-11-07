import { Injectable, inject } from '@angular/core';
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { SettingsService } from './settings.service';

@Injectable({
  providedIn: 'root'
})
export class GeminiService {
  private ai: GoogleGenAI;
  private settingsService = inject(SettingsService);

  constructor() {
    // IMPORTANT: This relies on the `process.env.API_KEY` being available in the execution environment.
    if (!process.env.API_KEY) {
        throw new Error("API_KEY environment variable not set.");
    }
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  async translateText(text: string, sourceLang: string, targetLang: string): Promise<string> {
    const modelName = this.settingsService.activeModel();
    if (!modelName || modelName.trim() === '') {
      throw new Error('No AI model selected. Please select a model in settings.');
    }
      
    try {
        const response: GenerateContentResponse = await this.ai.models.generateContent({
            model: modelName,
            contents: `Translate the following text to ${targetLang}: "${text}"`,
            config: {
              systemInstruction: `You are an expert translator. Your task is to translate text from ${sourceLang} to ${targetLang}. You must provide only the direct translation of the input text, without any additional context, comments, or explanations. Do not say "Here is the translation:" or anything similar. Just return the translated text.`,
            }
        });

      return response.text.trim();

    } catch (error) {
      console.error(`Error translating text from ${sourceLang} to ${targetLang} using model ${modelName}:`, error);
      if (error instanceof Error) {
        // Attempt to provide a more user-friendly error message
        if (error.message.includes('400') || error.message.includes('Invalid')) {
             throw new Error(`The selected model '${modelName}' may be invalid or you may not have access. Please check the model name in settings.`);
        }
        throw new Error(`API Error: ${error.message}`);
      }
      throw new Error('Failed to translate text due to an unknown API error.');
    }
  }
}
