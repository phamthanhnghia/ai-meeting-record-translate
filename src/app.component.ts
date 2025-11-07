// FIX: Replaced placeholder content with a fully functional standalone Angular component.
import { Component, ChangeDetectionStrategy, signal, inject, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GeminiService } from './services/gemini.service';
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
  template: `
    <div class="bg-gray-900 min-h-screen text-white flex flex-col items-center p-4 sm:p-8 font-sans">
      <app-header (settingsClicked)="isSettingsOpen.set(true)"></app-header>

      <main class="w-full max-w-5xl bg-gray-800 rounded-2xl shadow-2xl shadow-cyan-500/10 p-6 sm:p-8 flex flex-col">
        <app-language-selector
          [languages]="languages"
          [optionalLanguages]="optionalLanguages"
          [sourceLang]="sourceLang()"
          [targetLang]="targetLang()"
          [secondaryTargetLang]="secondaryTargetLang()"
          (sourceLangChange)="setSourceLang($event)"
          (targetLangChange)="setTargetLang($event)"
          (secondaryTargetLangChange)="setSecondaryTargetLang($event)"
          (swapLanguagesEvent)="swapLanguages()"
        ></app-language-selector>

        <app-recording-control
          [isRecording]="isRecording()"
          [isRecordingUnsupported]="isRecordingUnsupported()"
          (toggleRecordingEvent)="toggleRecording()"
        ></app-recording-control>

        <app-action-buttons
          [isTranscriptListEmpty]="isTranscriptListEmpty()"
          (downloadTranscriptsEvent)="downloadTranscripts()"
          (clearTranscriptsEvent)="clearTranscripts()"
        ></app-action-buttons>

        <app-transcript-list
          [transcripts]="transcripts()"
          [sourceLang]="sourceLang()"
          [targetLang]="targetLang()"
          [isRecording]="isRecording()"
        ></app-transcript-list>

        <!-- Error Display -->
        @if(error()) {
          <div class="mt-4 p-4 bg-red-900 border border-red-700 text-red-300 rounded-lg text-center">
            <p>{{ error() }}</p>
          </div>
        }
      </main>

      <app-settings-modal
        [isOpen]="isSettingsOpen()"
        (close)="isSettingsOpen.set(false)"
      ></app-settings-modal>
    </div>
  `,
  styles: [
    `
      /* Custom focus styles to match the theme */
      select:focus, textarea:focus, input:focus {
        outline: none;
        box-shadow: 0 0 0 3px rgba(34, 211, 238, 0.4); /* cyan-400 with opacity */
      }
      /* Animation for new transcript entries */
      @keyframes fade-in {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .animate-fade-in {
        animation: fade-in 0.5s ease-out forwards;
      }
      /* Animation for modal fade in and slide up */
      @keyframes fade-in-fast {
          from { opacity: 0; }
          to { opacity: 1; }
      }
      .animate-fade-in-fast {
          animation: fade-in-fast 0.2s ease-out forwards;
      }
      @keyframes slide-in-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
      }
      .animate-slide-in-up {
          animation: slide-in-up 0.3s ease-out forwards;
      }
    `
  ],
})
export class AppComponent {
  private geminiService = inject(GeminiService);
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
      this.geminiService.translateText(text, this.sourceLang().name, primaryTarget.name).catch(e => {
          console.error(`Primary translation failed for "${text}"`, e);
          this.error.set(e instanceof Error ? e.message : 'An unknown translation error occurred.');
          return 'Error'; // Return error string on failure
      })
    ];

    if (secondaryTarget) {
      translationPromises.push(
        this.geminiService.translateText(text, this.sourceLang().name, secondaryTarget.name).catch(e => {
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
