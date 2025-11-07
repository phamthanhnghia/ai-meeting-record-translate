import { Component, ChangeDetectionStrategy, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

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
  selector: 'app-transcript-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './transcript-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TranscriptListComponent {
  @Input({ required: true }) transcripts!: Transcript[];
  @Input({ required: true }) sourceLang!: Language;
  @Input({ required: true }) targetLang!: Language;
  @Input({ required: true }) isRecording!: boolean;
}
