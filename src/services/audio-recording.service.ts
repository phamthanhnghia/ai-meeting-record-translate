// FIX: Implemented the audio recording service which was previously an empty file.
import { Injectable, signal, WritableSignal } from '@angular/core';

// This is a browser-only service. We need to declare the SpeechRecognition API for TypeScript.
declare var webkitSpeechRecognition: any;

@Injectable({
  providedIn: 'root',
})
export class AudioRecordingService {
  isRecording: WritableSignal<boolean> = signal(false);
  transcribedText: WritableSignal<string> = signal('');
  error: WritableSignal<string | null> = signal(null);

  private recognition: any | null = null;
  private intentionallyStopped = true;

  constructor() {
    if ('webkitSpeechRecognition' in window) {
      this.recognition = new webkitSpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;

      this.recognition.onstart = () => {
        this.isRecording.set(true);
        this.error.set(null);
      };

      this.recognition.onresult = (event: any) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        if(finalTranscript){
            this.transcribedText.set(finalTranscript);
        }
      };

      this.recognition.onerror = (event: any) => {
        // Ignore common, recoverable errors and let the onend handler manage restarts.
        if (event.error === 'no-speech' || event.error === 'audio-capture') {
            return; 
        }
        this.error.set(`Speech recognition error: ${event.error}`);
        this.isRecording.set(false);
        this.intentionallyStopped = true; // A real error should stop the loop
      };

      this.recognition.onend = () => {
        if (!this.intentionallyStopped) {
          // If it wasn't a deliberate stop, restart it immediately to continue listening.
          try {
            this.recognition.start();
          } catch (e) {
            // Handle cases where start() might fail immediately after an error.
            this.isRecording.set(false);
          }
        } else {
          // It was a deliberate stop by the user.
          this.isRecording.set(false);
        }
      };
    } else {
        this.error.set('Speech recognition not supported in this browser.');
    }
  }

  setLanguage(lang: string) {
    if (this.recognition) {
        this.recognition.lang = lang;
    }
  }

  startRecording() {
    if (this.recognition && !this.isRecording()) {
      try {
        this.intentionallyStopped = false;
        this.transcribedText.set(''); 
        this.recognition.start();
      } catch(e) {
        console.error('An error occurred while starting the recording:', e);
        this.error.set('Recording could not be started.');
        this.isRecording.set(false);
        this.intentionallyStopped = true;
      }
    } else if (!this.recognition) {
        this.error.set('Speech recognition not supported.');
    }
  }

  stopRecording() {
    if (this.recognition && this.isRecording()) {
      this.intentionallyStopped = true;
      this.recognition.stop();
    }
  }
}