import { createClient, LiveTranscriptionEvents } from '@deepgram/sdk';

export interface SpeechToTextOptions {
  language?: string;
  model?: string;
  punctuate?: boolean;
  diarize?: boolean;
  interim_results?: boolean;
}

export interface TranscriptionResult {
  transcript: string;
  confidence: number;
  is_final: boolean;
  words?: Array<{
    word: string;
    start: number;
    end: number;
    confidence: number;
  }>;
}

export interface SpeechServiceEvents {
  onTranscript: (result: TranscriptionResult) => void;
  onError: (error: Error) => void;
  onStatusChange: (status: 'idle' | 'listening' | 'processing' | 'error') => void;
}

export class SpeechService {
  private deepgram: any;
  private mediaRecorder: MediaRecorder | null = null;
  private audioStream: MediaStream | null = null;
  private connection: any = null;
  private isRecording = false;
  private events: SpeechServiceEvents;
  private status: 'idle' | 'listening' | 'processing' | 'error' = 'idle';

  constructor(events: SpeechServiceEvents) {
    this.events = events;
    this.initializeDeepgram();
  }

  private initializeDeepgram() {
    console.log('🔧 Initializing Deepgram client...');
    const apiKey = import.meta.env.VITE_DEEPGRAM_API_KEY;
    console.log('🔧 API key available:', !!apiKey, 'Length:', apiKey?.length || 0);
    
    if (!apiKey) {
      console.error('🔧 Deepgram API key not found in environment variables');
      this.setStatus('error');
      this.events.onError(new Error('Deepgram API key not configured'));
      return;
    }

    try {
      this.deepgram = createClient(apiKey);
      console.log('🔧 Deepgram client created successfully');
    } catch (error) {
      console.error('🔧 Failed to initialize Deepgram client:', error);
      this.setStatus('error');
      this.events.onError(error as Error);
    }
  }

  private setStatus(status: 'idle' | 'listening' | 'processing' | 'error') {
    this.status = status;
    this.events.onStatusChange(status);
  }

  async startRecording(options: SpeechToTextOptions = {}): Promise<void> {
    console.log('🎙️ Starting recording with options:', options);
    
    if (this.isRecording) {
      console.warn('🎙️ Already recording');
      return;
    }

    if (!this.deepgram) {
      console.error('🎙️ Deepgram client not initialized');
      this.events.onError(new Error('Deepgram client not initialized'));
      return;
    }

    try {
      // Request microphone access
      console.log('🎙️ Requesting microphone access...');
      this.audioStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });
      console.log('🎙️ Microphone access granted');

      this.setStatus('listening');

      // Create live transcription connection
      const connectionOptions = {
        model: options.model || 'nova-2',
        language: options.language || 'en-US',
        smart_format: true,
        punctuate: options.punctuate !== false,
        diarize: options.diarize || false,
        interim_results: options.interim_results !== false,
        endpointing: 300, // End utterance after 300ms of silence
      };
      console.log('🎙️ Creating Deepgram connection with options:', connectionOptions);
      
      this.connection = this.deepgram.listen.live(connectionOptions);
      console.log('🎙️ Deepgram connection created');
      

      // Set up event listeners
      this.connection.on(LiveTranscriptionEvents.Open, () => {
        console.log('🎙️ Deepgram connection opened - readyState:', this.connection?.getReadyState());
        // Start MediaRecorder only after connection is open
        this.startMediaRecorder();
      });

      this.connection.on(LiveTranscriptionEvents.Transcript, (data: any) => {
        console.log('🎙️ Raw transcript data received:', data);
        const transcript = data.channel?.alternatives?.[0];
        if (transcript && transcript.transcript) {
          const result: TranscriptionResult = {
            transcript: transcript.transcript,
            confidence: transcript.confidence || 0,
            is_final: data.is_final || false,
            words: transcript.words?.map((word: any) => ({
              word: word.word,
              start: word.start,
              end: word.end,
              confidence: word.confidence || 0,
            })),
          };
          console.log('🎙️ Processed transcript result:', result);
          this.events.onTranscript(result);
        } else {
          console.log('🎙️ No transcript found in data:', data);
        }
      });

      this.connection.on(LiveTranscriptionEvents.Error, (error: any) => {
        console.error('🎙️ Deepgram error:', error);
        this.setStatus('error');
        this.events.onError(new Error(error.message || 'Deepgram transcription error'));
      });

      this.connection.on(LiveTranscriptionEvents.Close, (event: any) => {
        console.log('🎙️ Deepgram connection closed:', event);
        console.log('🎙️ Connection close reason:', event?.reason || 'Unknown');
        console.log('🎙️ Connection close code:', event?.code || 'Unknown');
        this.setStatus('idle');
      });

      // Don't start MediaRecorder here - wait for connection to open
      console.log('🎙️ Waiting for Deepgram connection to open before starting MediaRecorder...');

    } catch (error) {
      console.error('🎙️ Failed to start recording:', error);
      this.setStatus('error');
      this.events.onError(error as Error);
      this.cleanup();
    }
  }

  private startMediaRecorder(): void {
    if (!this.audioStream || !this.connection) {
      console.error('🎙️ Cannot start MediaRecorder - missing audioStream or connection');
      return;
    }

    try {
      // Create MediaRecorder to send audio data to Deepgram
      console.log('🎙️ Creating MediaRecorder...');
      this.mediaRecorder = new MediaRecorder(this.audioStream, {
        mimeType: 'audio/webm;codecs=opus',
      });
      console.log('🎙️ MediaRecorder created');

      this.mediaRecorder.ondataavailable = (event) => {
        console.log('🎙️ Audio data available:', event.data.size, 'bytes');
        if (event.data.size > 0 && this.connection?.getReadyState() === 1) {
          console.log('🎙️ Sending audio data to Deepgram');
          this.connection.send(event.data);
        } else {
          console.log('🎙️ Not sending data - size:', event.data.size, 'readyState:', this.connection?.getReadyState());
        }
      };

      console.log('🎙️ Starting MediaRecorder...');
      this.mediaRecorder.start(100); // Send data every 100ms
      this.isRecording = true;
      console.log('🎙️ Recording started successfully');
    } catch (error) {
      console.error('🎙️ Failed to start MediaRecorder:', error);
      this.setStatus('error');
      this.events.onError(error as Error);
    }
  }

  async stopRecording(): Promise<void> {
    if (!this.isRecording) {
      return;
    }

    this.setStatus('processing');

    try {
      // Stop media recorder
      if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
        this.mediaRecorder.stop();
      }

      // Close Deepgram connection
      if (this.connection) {
        this.connection.finish();
      }

      this.cleanup();
      this.setStatus('idle');

    } catch (error) {
      console.error('Error stopping recording:', error);
      this.setStatus('error');
      this.events.onError(error as Error);
    }
  }

  private cleanup() {
    this.isRecording = false;

    // Stop audio stream
    if (this.audioStream) {
      this.audioStream.getTracks().forEach(track => track.stop());
      this.audioStream = null;
    }

    // Clean up media recorder
    if (this.mediaRecorder) {
      this.mediaRecorder = null;
    }

    // Clean up connection
    if (this.connection) {
      this.connection = null;
    }
  }

  getStatus(): 'idle' | 'listening' | 'processing' | 'error' {
    return this.status;
  }

  isCurrentlyRecording(): boolean {
    return this.isRecording;
  }

  destroy() {
    this.stopRecording();
    this.cleanup();
  }
}

// Utility function to create a speech service instance
export const createSpeechService = (events: SpeechServiceEvents): SpeechService => {
  return new SpeechService(events);
};
