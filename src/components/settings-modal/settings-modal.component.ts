import { Component, ChangeDetectionStrategy, Input, Output, EventEmitter, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SettingsService } from '@/services/settings.service';

@Component({
  selector: 'app-settings-modal',
  standalone: true,
  imports: [CommonModule],
  providers: [SettingsService],
  templateUrl: './settings-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsModalComponent {
  @Input({ required: true }) isOpen!: boolean;
  @Output() close = new EventEmitter<void>();

  settingsService = inject(SettingsService);

  // A signal to hold the value of the custom model input temporarily when 'Custom...' is selected.
  private customModelInputValue = signal('');

  // Determines if the custom model option is the active one.
  isCustomModelActive = computed(() => {
    const active = this.settingsService.activeModel();
    return !this.settingsService.availableModels.some(m => m.id === active);
  });

  ngOnInit() {
    // When component initializes, if the active model is custom,
    // populate the temporary input value signal.
    if (this.isCustomModelActive()) {
      this.customModelInputValue.set(this.settingsService.activeModel());
    }
  }

  onModelSelectionChange(event: Event) {
    const selectedValue = (event.target as HTMLSelectElement).value;
    if (selectedValue === 'custom') {
      // When user selects 'Custom...', switch to it.
      // If there's already a custom value, use it, otherwise use an empty string to let them type.
      this.settingsService.activeModel.set(this.customModelInputValue());
    } else {
      // Switch to a pre-defined model
      this.settingsService.activeModel.set(selectedValue);
    }
  }

  onCustomModelChange(event: Event) {
    const customModelName = (event.target as HTMLInputElement).value;
    this.customModelInputValue.set(customModelName);
    this.settingsService.activeModel.set(customModelName);
  }

  onClose() {
    this.close.emit();
  }
}
