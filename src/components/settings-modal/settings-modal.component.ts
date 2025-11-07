import { Component, ChangeDetectionStrategy, Input, Output, EventEmitter, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SettingsService } from '@/services/settings.service';

@Component({
  selector: 'app-settings-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  providers: [SettingsService],
  templateUrl: './settings-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsModalComponent implements OnInit {
  @Input({ required: true }) isOpen!: boolean;
  @Output() close = new EventEmitter<void>();

  settingsService = inject(SettingsService);

  readonly customModelInputValue = signal('');
  readonly apiKeyInputs = signal<Record<string, string>>({
    gemini: '',
    openai: '',
    anthropic: '',
  });

  showApiKeyInput = signal(false);

  isCustomModelActive = computed(() => {
    const active = this.settingsService.activeModel();
    const models = this.settingsService.availableModels;
    return !models.some(m => m.id === active);
  });

  ngOnInit() {
    if (this.isCustomModelActive()) {
      this.customModelInputValue.set(this.settingsService.activeModel());
    }
    
    // Load existing API keys
    const currentKeys = this.settingsService.apiKeys();
    this.apiKeyInputs.set({ ...currentKeys });
  }

  onProviderChange(provider: 'gemini' | 'openai' | 'anthropic' | 'custom') {
    this.settingsService.setProvider(provider);
    this.customModelInputValue.set('');
  }

  onModelSelectionChange(event: Event) {
    const selectedValue = (event.target as HTMLSelectElement).value;
    if (selectedValue === 'custom') {
      this.customModelInputValue.set('');
    } else {
      this.settingsService.activeModel.set(selectedValue);
      this.customModelInputValue.set('');
    }
  }

  onCustomModelChange(event: Event) {
    const customModelName = (event.target as HTMLInputElement).value;
    this.customModelInputValue.set(customModelName);
    this.settingsService.activeModel.set(customModelName);
  }

  onApiKeyChange(provider: string, event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.settingsService.setApiKey(provider, value);
  }

  toggleApiKeyInput() {
    this.showApiKeyInput.update(v => !v);
  }

  getApiKeyDisplay(provider: string): string {
    const key = this.settingsService.getApiKey(provider);
    return key ? `••••${key.slice(-4)}` : 'Not set';
  }

  onClose() {
    this.close.emit();
  }
}