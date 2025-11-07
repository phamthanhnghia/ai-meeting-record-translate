import { Component, ChangeDetectionStrategy, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-action-buttons',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './action-buttons.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActionButtonsComponent {
  @Input({ required: true }) isTranscriptListEmpty!: boolean;

  @Output() downloadTranscriptsEvent = new EventEmitter<void>();
  @Output() clearTranscriptsEvent = new EventEmitter<void>();

  onDownloadTranscripts() {
    this.downloadTranscriptsEvent.emit();
  }

  onClearTranscripts() {
    this.clearTranscriptsEvent.emit();
  }
}
