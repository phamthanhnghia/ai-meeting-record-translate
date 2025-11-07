// FIX: Replaced placeholder content with a fully functional standalone Angular component.
import { Component, ChangeDetectionStrategy, signal, inject, computed, effect } from '@angular/core';
import { GeminiService } from './services/gemini.service';
import { AudioRecordingService } from './services/audio-recording.service';

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
  template: `
    <div class="bg-gray-900 min-h-screen text-white flex flex-col items-center p-4 sm:p-8 font-sans">
      <header class="w-full max-w-5xl text-center mb-8">
        <h1 class="text-4xl sm:text-5xl font-bold text-cyan-400">AI Meeting Notetaker</h1>
        <p class="text-gray-400 mt-2">Record and translate conversations in real-time.</p>
      </header>

      <main class="w-full max-w-5xl bg-gray-800 rounded-2xl shadow-2xl shadow-cyan-500/10 p-6 sm:p-8 flex flex-col">
        <!-- Language Selection -->
        <div class="flex flex-col items-center justify-between mb-6 gap-4">
          <div class="w-full flex flex-col sm:flex-row items-center justify-between gap-4">
              <div class="w-full sm:w-5/12">
                <label for="source-lang" class="block text-sm font-medium text-gray-300 mb-1">From (Spoken)</label>
                <select id="source-lang" [value]="sourceLang().name" (change)="setSourceLang($event)" class="w-full bg-gray-700 border-gray-600 text-white rounded-lg p-2.5 focus:ring-cyan-500 focus:border-cyan-500">
                  @for (lang of languages; track lang.code) {
                    <option [value]="lang.name">{{ lang.name }}</option>
                  }
                </select>
              </div>
              
              <button (click)="swapLanguages()" class="p-2 rounded-full bg-gray-700 hover:bg-cyan-600 transition-transform duration-300 transform sm:mt-6 rotate-90 sm:rotate-0">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
              </button>
              
              <div class="w-full sm:w-5/12">
                <label for="target-lang" class="block text-sm font-medium text-gray-300 mb-1">To (Translated)</label>
                <select id="target-lang" [value]="targetLang().name" (change)="setTargetLang($event)" class="w-full bg-gray-700 border-gray-600 text-white rounded-lg p-2.5 focus:ring-cyan-500 focus:border-cyan-500">
                  @for (lang of languages; track lang.code) {
                    <option [value]="lang.name">{{ lang.name }}</option>
                  }
                </select>
              </div>
          </div>
          <!-- Optional Secondary Language -->
            <div class="mt-4 w-full sm:w-1/2">
                <label for="secondary-target-lang" class="block text-sm font-medium text-gray-300 mb-1">
                    Also Translate To (Optional)
                </label>
                <select id="secondary-target-lang" (change)="setSecondaryTargetLang($event)" class="w-full bg-gray-700 border-gray-600 text-white rounded-lg p-2.5 focus:ring-cyan-500 focus:border-cyan-500">
                    @for (lang of optionalLanguages; track lang.code) {
                        <option [value]="lang.name" [selected]="secondaryTargetLang()?.name === lang.name">{{ lang.name }}</option>
                    }
                </select>
            </div>
        </div>

        <!-- Recording Control -->
        <div class="my-8 flex flex-col items-center justify-center">
            <button 
                (click)="toggleRecording()" 
                [class]="'w-24 h-24 rounded-full flex items-center justify-center text-white transition-all duration-300 ' + (isRecording() ? 'bg-red-600 hover:bg-red-700 recording' : 'bg-cyan-600 hover:bg-cyan-700')" 
                [disabled]="isRecordingUnsupported()">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    @if(isRecording()) {
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 10h6" />
                    } @else {
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-14 0m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    }
                </svg>
            </button>
            <p class="mt-4 text-gray-400 h-5">
                @if(isRecording()) {
                    <span>Recording... Click icon to stop.</span>
                } @else if (isRecordingUnsupported()) {
                    <span class="text-red-400">Recording not supported on this browser.</span>
                } @else {
                    <span>Click the microphone to start recording.</span>
                }
            </p>
        </div>

        <!-- Action Buttons -->
        <div class="mt-4 flex justify-end items-center gap-3 border-t border-gray-700 pt-4 mb-4">
            <button
                (click)="downloadTranscripts()"
                [disabled]="isTranscriptListEmpty()"
                [class]="'flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ' + (isTranscriptListEmpty() ? 'bg-gray-600 text-gray-400 cursor-not-allowed' : 'bg-sky-600 hover:bg-sky-700 text-white')">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd" />
                </svg>
                <span>Download</span>
            </button>
            <button
                (click)="clearTranscripts()"
                [disabled]="isTranscriptListEmpty()"
                [class]="'flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ' + (isTranscriptListEmpty() ? 'bg-gray-600 text-gray-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700 text-white')">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clip-rule="evenodd" />
                </svg>
                <span>Clear</span>
            </button>
        </div>

        <!-- Transcript History -->
        <div class="w-full space-y-4 h-96 overflow-y-auto pr-2">
          @for (transcript of transcripts(); track transcript.id) {
            <div class="bg-gray-700/50 p-4 rounded-lg animate-fade-in space-y-3">
               <p class="text-xs text-gray-400 font-mono">{{ transcript.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }}</p>
               <div [class]="'grid grid-cols-1 gap-4 ' + (transcript.secondaryTargetLang ? 'md:grid-cols-3' : 'md:grid-cols-2')">
                  <!-- Source Text -->
                  <div class="flex items-start gap-3">
                    <span class="text-cyan-400 font-bold text-sm mt-1 flex-shrink-0">{{ sourceLang().code.split('-')[0].toUpperCase() }}:</span>
                    <p class="text-gray-200">{{ transcript.source }}</p>
                  </div>
                  <!-- Primary Translated Text -->
                  <div class="flex items-start gap-3 border-t border-gray-600 pt-4 md:border-t-0 md:border-l md:pl-4 md:pt-0">
                    <span class="text-lime-400 font-bold text-sm mt-1 flex-shrink-0">{{ targetLang().code.split('-')[0].toUpperCase() }}:</span>
                    @if (transcript.isTranslatingPrimary) {
                      <div class="flex items-center gap-2 text-gray-400 pt-1">
                        <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-300"></div>
                        <span>Translating...</span>
                      </div>
                    } @else {
                      <p class="text-gray-200">{{ transcript.primaryTranslation }}</p>
                    }
                  </div>
                   <!-- Secondary Translated Text -->
                    @if (transcript.secondaryTargetLang) {
                        <div class="flex items-start gap-3 border-t border-gray-600 pt-4 md:border-t-0 md:border-l md:pl-4 md:pt-0">
                            <span class="text-yellow-400 font-bold text-sm mt-1 flex-shrink-0">{{ transcript.secondaryTargetLang.code.split('-')[0].toUpperCase() }}:</span>
                            @if (transcript.isTranslatingSecondary) {
                            <div class="flex items-center gap-2 text-gray-400 pt-1">
                                <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-300"></div>
                                <span>Translating...</span>
                            </div>
                            } @else {
                            <p class="text-gray-200">{{ transcript.secondaryTranslation }}</p>
                            }
                        </div>
                    }
               </div>
            </div>
          } @empty {
            @if (!isRecording()) {
              <div class="text-center py-12 text-gray-500">
                <svg xmlns="http://www.w3.org/2000/svg" class="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                </svg>
                <p class="mt-4 text-lg">Your translated notes will appear here.</p>
                <p>Click the microphone above to begin.</p>
              </div>
            }
          }
        </div>

        <!-- Error Display -->
        @if(error()) {
          <div class="mt-4 p-4 bg-red-900 border border-red-700 text-red-300 rounded-lg text-center">
            <p>{{ error() }}</p>
          </div>
        }
      </main>
    </div>
  `,
  styles: [
    `
      /* Custom focus styles to match the theme */
      select:focus, textarea:focus {
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
    
    const translationPromises = [
      this.geminiService.translateText(text, this.sourceLang().name, primaryTarget.name).catch(e => {
          console.error(`Primary translation failed for "${text}"`, e);
          return 'Error'; // Return error string on failure
      })
    ];

    if (secondaryTarget) {
      translationPromises.push(
        this.geminiService.translateText(text, this.sourceLang().name, secondaryTarget.name).catch(e => {
            console.error(`Secondary translation failed for "${text}"`, e);
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


  setSourceLang(event: Event) {
    const langName = (event.target as HTMLSelectElement).value;
    const lang = this.languages.find(l => l.name === langName);
    if (lang) {
      this.sourceLang.set(lang);
      this.audioRecordingService.setLanguage(lang.code);
    }
  }
  
  setTargetLang(event: Event) {
    const langName = (event.target as HTMLSelectElement).value;
    const lang = this.languages.find(l => l.name === langName);
    if (lang) {
      this.targetLang.set(lang);
    }
  }

  setSecondaryTargetLang(event: Event) {
    const langName = (event.target as HTMLSelectElement).value;
    if (langName === 'None') {
        this.secondaryTargetLang.set(null);
    } else {
        const lang = this.languages.find(l => l.name === langName);
        if (lang) {
            this.secondaryTargetLang.set(lang);
        }
    }
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