import { Component, ChangeDetectionStrategy, signal, inject, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslationService } from './services/translation.service';
import { AudioRecordingService } from './services/audio-recording.service';
import { HeaderComponent } from './components/header/header.component';
import { LanguageSelectorComponent } from './components/language-selector/language-selector.component';
import { RecordingControlComponent } from './components/recording-control/recording-control.component';
import { ActionButtonsComponent } from './components/action-buttons/action-buttons.component';
import { TranscriptListComponent } from './components/transcript-list/transcript-list.component';
import { SettingsModalComponent } from './components/settings-modal/settings-modal.component';

interface Language {
  name: string;
  code: string; // BCP 47 language tag
}

interface Transcript {
  id: number;
  timestamp: Date;
  source: string;
  primaryTranslation: string;
  isTranslatingPrimary: boolean;
  // Optional secondary translation fields
  secondaryTargetLang?: Language;
  secondaryTranslation?: string;
  isTranslatingSecondary?: boolean;
}

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [CommonModule, HeaderComponent, LanguageSelectorComponent, RecordingControlComponent, ActionButtonsComponent, TranscriptListComponent, SettingsModalComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent {
  private translationService = inject(TranslationService);
  private audioRecordingService = inject(AudioRecordingService);
  
  languages: Language[] = [
    { name: 'Japanese', code: 'ja-JP' },
    { name: 'English', code: 'en-US' },
    { name: 'Vietnamese', code: 'vi-VN' },
    { name: 'Spanish', code: 'es-ES' },
    { name: 'French', code: 'fr-FR' },
    { name: 'German', code: 'de-DE' },
    { name: 'Italian', code: 'it-IT' },
    { name: 'Korean', code: 'ko-KR' },
    { name: 'Portuguese', code: 'pt-BR' },
    { name: 'Russian', code: 'ru-RU' },
    { name: 'Chinese (Mandarin)', code: 'cmn-Hans-CN' },
  ];
  
  optionalLanguages: Language[] = [
    { name: 'None', code: 'none' },
    ...this.languages
  ];

  sourceLang = signal<Language>(this.languages[0]); // Default to Japanese
  targetLang = signal<Language>(this.languages[1]); // Default to English
  secondaryTargetLang = signal<Language | null>(null);

  transcripts = signal<Transcript[]>([]);
  error = signal<string | null>(null);
  private transcriptIdCounter = 0;

  isRecording = this.audioRecordingService.isRecording;
  isRecordingUnsupported = computed(() => this.audioRecordingService.error()?.includes('not supported'));
  isTranscriptListEmpty = computed(() => this.transcripts().length === 0);

  isSettingsOpen = signal(false);
  
  constructor() {

    // Effect to handle new transcribed sentences from audio service
    effect(() => {
      const newTranscriptText = this.audioRecordingService.transcribedText().trim();
      if (newTranscriptText) {
        this.processNewTranscript(newTranscriptText);
      }
    });

    // Effect to handle errors from audio service
    effect(() => {
        const audioError = this.audioRecordingService.error();
        if (audioError && !audioError.includes('not supported')) {
            this.error.set(audioError);
        }
    });
  }

  async processNewTranscript(text: string) {
    this.error.set(null); // Clear previous errors
    const newId = this.transcriptIdCounter++;
    const primaryTarget = this.targetLang();
    const secondaryTarget = this.secondaryTargetLang(); // Capture at creation time

    const newEntry: Transcript = {
      id: newId,
      timestamp: new Date(),
      source: text,
      primaryTranslation: '',
      isTranslatingPrimary: true,
      ...(secondaryTarget && {
        secondaryTargetLang: secondaryTarget,
        secondaryTranslation: '',
        isTranslatingSecondary: true,
      }),
    };

    this.transcripts.update(current => [newEntry, ...current]);
    
    console.log(`Processing new transcript: "${text}"`);
    
    const translationPromises = [
      this.translationService.translateText(text, this.sourceLang().name, primaryTarget.name).catch(e => {
          console.error(`Primary translation failed for "${text}"`, e);
          this.error.set(e instanceof Error ? e.message : 'An unknown translation error occurred.');
          return 'Error'; // Return error string on failure
      })
    ];

    if (secondaryTarget) {
      translationPromises.push(
        this.translationService.translateText(text, this.sourceLang().name, secondaryTarget.name).catch(e => {
            console.error(`Secondary translation failed for "${text}"`, e);
            // Don't set the main error for the secondary translation to avoid being too noisy
            return 'Error'; // Return error string on failure
        })
      );
    }
    
    const [primaryResult, secondaryResult] = await Promise.all(translationPromises);

    this.transcripts.update(current =>
      current.map(t => {
        if (t.id === newId) {
          return {
            ...t,
            primaryTranslation: primaryResult,
            isTranslatingPrimary: false,
            ...(secondaryTarget && {
              secondaryTranslation: secondaryResult,
              isTranslatingSecondary: false,
            }),
          };
        }
        return t;
      })
    );
  }

  setSourceLang(lang: Language) {
    this.sourceLang.set(lang);
    this.audioRecordingService.setLanguage(lang.code);
  }
  
  setTargetLang(lang: Language) {
    this.targetLang.set(lang);
  }

  setSecondaryTargetLang(lang: Language | null) {
    this.secondaryTargetLang.set(lang);
  }

  swapLanguages() {
    const currentSource = this.sourceLang();
    this.sourceLang.set(this.targetLang());
    this.targetLang.set(currentSource);
    this.audioRecordingService.setLanguage(this.sourceLang().code);
  }
  
  toggleRecording() {
    this.error.set(null);
    if (this.isRecording()) {
      this.audioRecordingService.stopRecording();
    } else {
      this.audioRecordingService.setLanguage(this.sourceLang().code);
      this.audioRecordingService.startRecording();
    }
  }

  clearTranscripts() {
    this.transcripts.set([]);
    this.transcriptIdCounter = 0;
  }

  downloadTranscripts() {
    const transcripts = this.transcripts();
    if (transcripts.length === 0) {
      return;
    }

    const hasSecondaryTranslations = transcripts.some(t => t.secondaryTargetLang);
    
    const header = [
      'Timestamp',
      'Source Language',
      'Source Text',
      'Target Language',
      'Translated Text'
    ];
     if (hasSecondaryTranslations) {
        header.push('Secondary Target Language', 'Secondary Translated Text');
    }

    const escapeCsvCell = (cell: string) => {
      // Wrap in quotes and escape internal quotes by doubling them
      return `"${cell.replace(/"/g, '""')}"`;
    };
    
    const rows = transcripts
      .slice() 
      .reverse()
      .map(t => {
          const row = [
              escapeCsvCell(t.timestamp.toLocaleString()),
              escapeCsvCell(this.sourceLang().name),
              escapeCsvCell(t.source),
              escapeCsvCell(this.targetLang().name),
              escapeCsvCell(t.primaryTranslation)
          ];
          if (hasSecondaryTranslations) {
              row.push(
                  escapeCsvCell(t.secondaryTargetLang?.name ?? ''),
                  escapeCsvCell(t.secondaryTranslation ?? '')
              );
          }
          return row.join(',');
    });
    
    const csvContent = [header.join(','), ...rows].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    
    const link = document.createElement("a");
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      const date = new Date().toISOString().split('T')[0];
      link.setAttribute("href", url);
      link.setAttribute("download", `meeting-notes-${date}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  }
}