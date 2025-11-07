import { Injectable, signal, effect } from '@angular/core';

export interface AiModel {
  id: string;
  name: string;
  provider: 'gemini' | 'openai' | 'anthropic' | 'custom';
}

export interface AIProvider {
  id: 'gemini' | 'openai' | 'anthropic' | 'custom';
  name: string;
  models: AiModel[];
}

@Injectable({
  providedIn: 'root'
})
export class SettingsService {
  // Active model and API configuration
  activeModel = signal<string>('gemini-2.5-flash');
  activeProvider = signal<'gemini' | 'openai' | 'anthropic' | 'custom'>('gemini');
  
  apiKeys = signal<Record<string, string>>({
    gemini: '',
    openai: '',
    anthropic: '',
  });

  // Available models by provider
  private geminiModels: AiModel[] = [
    { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash (Recommended)', provider: 'gemini' },
    { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', provider: 'gemini' },
    { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', provider: 'gemini' },
    { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', provider: 'gemini' },
  ];

  private openaiModels: AiModel[] = [
    { id: 'gpt-4o', name: 'GPT-4o', provider: 'openai' },
    { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', provider: 'openai' },
    { id: 'gpt-4', name: 'GPT-4', provider: 'openai' },
    { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', provider: 'openai' },
  ];

  private anthropicModels: AiModel[] = [
    { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', provider: 'anthropic' },
    { id: 'claude-3-opus-20250219', name: 'Claude 3 Opus', provider: 'anthropic' },
    { id: 'claude-3-haiku-20250307', name: 'Claude 3 Haiku', provider: 'anthropic' },
  ];

  availableProviders: AIProvider[] = [
    { id: 'gemini', name: 'Google Gemini', models: this.geminiModels },
    { id: 'openai', name: 'OpenAI', models: this.openaiModels },
    { id: 'anthropic', name: 'Anthropic', models: this.anthropicModels },
  ];

  constructor() {
    this.loadSettings();
  }

  // For backward compatibility - returns models for active provider
  get availableModels(): AiModel[] {
    return this.getModelsForProvider(this.activeProvider());
  }

  getModelsForProvider(provider: string): AiModel[] {
    const providerConfig = this.availableProviders.find(p => p.id === provider);
    return providerConfig ? providerConfig.models : [];
  }

  getApiKey(provider: string): string {
    return this.apiKeys()[provider] ?? '';
  }

  setApiKey(provider: string, key: string) {
    const updatedKeys = { ...this.apiKeys() };
    updatedKeys[provider] = key;
    this.apiKeys.set(updatedKeys);
    this.saveSettings();
  }

  setProvider(provider: 'gemini' | 'openai' | 'anthropic' | 'custom') {
    this.activeProvider.set(provider);
    // Reset model to first available model of the new provider
    const models = this.getModelsForProvider(provider);
    if (models.length > 0) {
      this.activeModel.set(models[0].id);
    }
    this.saveSettings();
  }

  setActiveModel(modelId: string) {
    this.activeModel.set(modelId);
    this.saveSettings();
  }

  // Persist settings to localStorage
  private saveSettings() {
    const settings = {
      activeModel: this.activeModel(),
      activeProvider: this.activeProvider(),
      apiKeys: this.apiKeys(),
    };
    localStorage.setItem('translationSettings', JSON.stringify(settings));
  }

  // Load settings from localStorage
  private loadSettings() {
    try {
      const saved = localStorage.getItem('translationSettings');
      if (saved) {
        const settings = JSON.parse(saved);
        if (settings.activeProvider) {
          this.activeProvider.set(settings.activeProvider);
        }
        if (settings.activeModel) {
          this.activeModel.set(settings.activeModel);
        }
        if (settings.apiKeys) {
          this.apiKeys.set(settings.apiKeys);
        }
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  }

  // Clear all settings
  clearSettings() {
    this.activeModel.set(this.geminiModels[0].id);
    this.activeProvider.set('gemini');
    this.apiKeys.set({ gemini: '', openai: '', anthropic: '' });
    localStorage.removeItem('translationSettings');
  }
}