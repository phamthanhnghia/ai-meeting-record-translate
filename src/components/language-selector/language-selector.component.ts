import { Component, ChangeDetectionStrategy, Input, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

interface Language {
  name: string;
  code: string; // BCP 47 language tag
}

@Component({
  selector: 'app-language-selector',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './language-selector.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LanguageSelectorComponent {
  @Input({ required: true }) languages!: Language[];
  @Input({ required: true }) optionalLanguages!: Language[];
  @Input({ required: true }) sourceLang!: Language;
  @Input({ required: true }) targetLang!: Language;
  @Input() secondaryTargetLang: Language | null = null;

  @Output() sourceLangChange = new EventEmitter<Language>();
  @Output() targetLangChange = new EventEmitter<Language>();
  @Output() secondaryTargetLangChange = new EventEmitter<Language | null>();
  @Output() swapLanguagesEvent = new EventEmitter<void>();

  onSourceLangChange(event: Event) {
    const langName = (event.target as HTMLSelectElement).value;
    const lang = this.languages.find(l => l.name === langName);
    if (lang) {
      this.sourceLangChange.emit(lang);
    }
  }

  onTargetLangChange(event: Event) {
    const langName = (event.target as HTMLSelectElement).value;
    const lang = this.languages.find(l => l.name === langName);
    if (lang) {
      this.targetLangChange.emit(lang);
    }
  }

  onSecondaryTargetLangChange(event: Event) {
    const langName = (event.target as HTMLSelectElement).value;
    if (langName === 'None') {
        this.secondaryTargetLangChange.emit(null);
    } else {
        const lang = this.languages.find(l => l.name === langName);
        if (lang) {
            this.secondaryTargetLangChange.emit(lang);
        }
    }
  }

  onSwapLanguages() {
    this.swapLanguagesEvent.emit();
  }
}
