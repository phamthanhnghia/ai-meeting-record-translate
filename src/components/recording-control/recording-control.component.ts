import { Component, ChangeDetectionStrategy, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-recording-control',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './recording-control.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecordingControlComponent {
  @Input({ required: true }) isRecording!: boolean;
  @Input({ required: true }) isRecordingUnsupported!: boolean;

  @Output() toggleRecordingEvent = new EventEmitter<void>();

  onToggleRecording() {
    this.toggleRecordingEvent.emit();
  }
}
