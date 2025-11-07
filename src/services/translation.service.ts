import { Injectable, inject } from '@angular/core';
import { SettingsService } from './settings.service';
import { environment } from '@/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class TranslationService {
  readonly settingsService = inject(SettingsService);

  async translateText(text: string, sourceLang: string, targetLang: string): Promise<string> {
    const provider = this.settingsService.activeProvider();
    const modelName = this.settingsService.activeModel();

    console.info('provider:', provider, 'modelName:', modelName )
    
    if (!modelName || modelName.trim() === '') {
      throw new Error('No AI model selected. Please select a model in settings.');
    }

    const apiKey = this.settingsService.getApiKey(provider);
    if (!apiKey) {
      throw new Error(`No API key configured for ${provider}. Please add your API key in settings.`);
    }

    try {
      switch (provider) {
        case 'gemini':
          return await this.translateWithGemini(text, sourceLang, targetLang, modelName, apiKey);
        case 'openai':
          return await this.translateWithOpenAI(text, sourceLang, targetLang, modelName, apiKey);
        case 'anthropic':
          return await this.translateWithAnthropic(text, sourceLang, targetLang, modelName, apiKey);
        case 'custom':
          throw new Error('Custom provider not yet implemented');
        default:
          throw new Error(`Unknown provider: ${provider}`);
      }
    } catch (error) {
      console.error(`Error translating text using ${provider}/${modelName}:`, error);
      if (error instanceof Error) {
        throw new Error(`Translation failed: ${error.message}`);
      }
      throw new Error('Failed to translate text due to an unknown error.');
    }
  }

  private async translateWithGemini(
    text: string,
    sourceLang: string,
    targetLang: string,
    modelName: string,
    apiKey: string
  ): Promise<string> {
    const { GoogleGenAI } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.generateContent({
      model: modelName,
      contents: `Translate the following text to ${targetLang}: "${text}"`,
      config: {
        systemInstruction: `You are an expert translator. Your task is to translate text from ${sourceLang} to ${targetLang}. You must provide only the direct translation of the input text, without any additional context, comments, or explanations. Do not say "Here is the translation:" or anything similar. Just return the translated text.`,
      }
    });

    return response.text.trim();
  }

  private async translateWithOpenAI(
    text: string,
    sourceLang: string,
    targetLang: string,
    modelName: string,
    apiKey: string
  ): Promise<string> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: modelName,
        messages: [
          {
            role: 'system',
            content: `You are an expert translator. Your task is to translate text from ${sourceLang} to ${targetLang}. You must provide only the direct translation of the input text, without any additional context, comments, or explanations. Do not say "Here is the translation:" or anything similar. Just return the translated text.`,
          },
          {
            role: 'user',
            content: `Translate the following text to ${targetLang}: "${text}"`,
          }
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`OpenAI API error: ${error.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    return data.choices[0].message.content.trim();
  }

  private async translateWithAnthropic(
    text: string,
    sourceLang: string,
    targetLang: string,
    modelName: string,
    apiKey: string
  ): Promise<string> {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: modelName,
        max_tokens: 1024,
        system: `You are an expert translator. Your task is to translate text from ${sourceLang} to ${targetLang}. You must provide only the direct translation of the input text, without any additional context, comments, or explanations. Do not say "Here is the translation:" or anything similar. Just return the translated text.`,
        messages: [
          {
            role: 'user',
            content: `Translate the following text to ${targetLang}: "${text}"`,
          }
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Anthropic API error: ${error.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    return data.content[0].text.trim();
  }
}