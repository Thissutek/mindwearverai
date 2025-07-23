import React, { useState, useEffect, useRef } from 'react';
import { createSpeechService, SpeechService, TranscriptionResult } from '../services/speechService';

interface SpeechToTextProps {
  onTranscript: (text: string) => void;
  className?: string;
  disabled?: boolean;
}

export const SpeechToText: React.FC<SpeechToTextProps> = ({
  onTranscript,
  className = '',
  disabled = false
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [status, setStatus] = useState<'idle' | 'listening' | 'processing' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [interimTranscript, setInterimTranscript] = useState('');
  const speechServiceRef = useRef<SpeechService | null>(null);

  useEffect(() => {
    // Initialize speech service
    speechServiceRef.current = createSpeechService({
      onTranscript: (result: TranscriptionResult) => {
        if (result.is_final) {
          // Final transcript - add to notepad
          if (result.transcript.trim()) {
            onTranscript(result.transcript);
          }
          setInterimTranscript('');
        } else {
          // Interim transcript - show as preview
          setInterimTranscript(result.transcript);
        }
      },
      onError: (error: Error) => {
        console.error('Speech service error:', error);
        setError(error.message);
        setIsRecording(false);
      },
      onStatusChange: (newStatus) => {
        setStatus(newStatus);
        if (newStatus === 'idle') {
          setIsRecording(false);
          setInterimTranscript('');
        }
      }
    });

    return () => {
      if (speechServiceRef.current) {
        speechServiceRef.current.destroy();
      }
    };
  }, [onTranscript]);

  const handleToggleRecording = async () => {
    if (!speechServiceRef.current || disabled) return;

    if (isRecording) {
      await speechServiceRef.current.stopRecording();
    } else {
      setError(null);
      setIsRecording(true);
      await speechServiceRef.current.startRecording({
        language: 'en-US',
        punctuate: true,
        interim_results: true,
      });
    }
  };

  const getButtonIcon = () => {
    switch (status) {
      case 'listening':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
            <path d="M12 19v4"/>
            <path d="M8 23h8"/>
            <circle cx="12" cy="12" r="2" fill="white"/>
          </svg>
        );
      case 'processing':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9c1.66 0 3.22.45 4.56 1.23"/>
            <animateTransform
              attributeName="transform"
              attributeType="XML"
              type="rotate"
              from="0 12 12"
              to="360 12 12"
              dur="1s"
              repeatCount="indefinite"
            />
          </svg>
        );
      case 'error':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="15" y1="9" x2="9" y2="15"/>
            <line x1="9" y1="9" x2="15" y2="15"/>
          </svg>
        );
      default:
        return (
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
            <path d="M12 19v4"/>
            <path d="M8 23h8"/>
          </svg>
        );
    }
  };

  const getButtonClass = () => {
    let baseClass = `speech-button ${className}`;
    
    if (disabled) {
      baseClass += ' speech-button-disabled';
    } else if (status === 'listening') {
      baseClass += ' speech-button-recording';
    } else if (status === 'error') {
      baseClass += ' speech-button-error';
    }
    
    return baseClass;
  };

  const getTooltipText = () => {
    if (disabled) return 'Speech-to-text disabled';
    if (error) return `Error: ${error}`;
    if (status === 'listening') return 'Click to stop recording';
    if (status === 'processing') return 'Processing...';
    return 'Click to start voice recording';
  };

  return (
    <div className="speech-to-text-container">
      <button
        className={getButtonClass()}
        onClick={handleToggleRecording}
        disabled={disabled || status === 'processing'}
        title={getTooltipText()}
        type="button"
      >
        {getButtonIcon()}
      </button>
      
      {interimTranscript && (
        <div className="interim-transcript">
          <span className="interim-text">{interimTranscript}</span>
        </div>
      )}
      
      {error && (
        <div className="speech-error">
          <span className="error-text">{error}</span>
        </div>
      )}
      
      <style>{`
        .speech-to-text-container {
          position: relative;
          display: inline-block;
        }
        
        .speech-button {
          background: none;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 24px;
          height: 24px;
          border-radius: 4px;
          color: #64748b;
          padding: 0;
          transition: all 0.2s ease;
        }
        
        .speech-button:hover {
          background-color: #e2e8f0;
          color: #334155;
        }
        
        .speech-button-recording {
          background-color: #ef4444;
          color: white;
          animation: pulse 1.5s infinite;
        }
        
        .speech-button-recording:hover {
          background-color: #dc2626;
        }
        
        .speech-button-error {
          background-color: #fef2f2;
          color: #ef4444;
        }
        
        .speech-button-disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        .speech-button-disabled:hover {
          background: none;
          color: #64748b;
        }
        
        .interim-transcript {
          position: absolute;
          top: 100%;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(0, 0, 0, 0.8);
          color: white;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          white-space: nowrap;
          max-width: 200px;
          overflow: hidden;
          text-overflow: ellipsis;
          z-index: 1000;
          margin-top: 4px;
        }
        
        .interim-text {
          opacity: 0.8;
        }
        
        .speech-error {
          position: absolute;
          top: 100%;
          left: 50%;
          transform: translateX(-50%);
          background: #fef2f2;
          color: #ef4444;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          white-space: nowrap;
          max-width: 200px;
          overflow: hidden;
          text-overflow: ellipsis;
          z-index: 1000;
          margin-top: 4px;
          border: 1px solid #fecaca;
        }
        
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.7;
          }
        }
      `}</style>
    </div>
  );
};

export default SpeechToText;
