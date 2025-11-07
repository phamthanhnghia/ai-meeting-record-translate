import { Injectable, signal } from '@angular/core';

export interface AiModel {
  id: string;
  name: string;
}

@Injectable({
  providedIn: 'root'
})
export class SettingsService {
  availableModels: AiModel[] = [
    { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash (Recommended)' },
  ];
  
  activeModel = signal<string>(this.availableModels[0].id);
}
