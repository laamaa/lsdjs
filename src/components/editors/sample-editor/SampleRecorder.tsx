import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useAppDispatch, useAppSelector, addRecordedSample } from '../../../store';

interface SampleRecorderProps {
  isLoading: boolean;
}

/**
 * Component for recording audio samples
 */
export function SampleRecorder({ isLoading }: SampleRecorderProps) {
  const dispatch = useAppDispatch();
  const { kitInfo } = useAppSelector(state => state.kit);

  const [isRecording, setIsRecording] = useState(false);
  const [isRecordingAvailable, setIsRecordingAvailable] = useState(false);
  const [recordingError, setRecordingError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);
  const maxRecordingTimeRef = useRef<number>(0);

  // Check if recording is available
  useEffect(() => {
    const checkRecordingAvailability = async () => {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          setRecordingError('Recording is not supported in this browser');
          setIsRecordingAvailable(false);
          return;
        }

        // Try to get permission to use the microphone
        await navigator.mediaDevices.getUserMedia({ audio: true });
        setIsRecordingAvailable(true);
      } catch (error) {
        console.error('Error checking recording availability:', error);
        setRecordingError('Could not access microphone');
        setIsRecordingAvailable(false);
      }
    };

    checkRecordingAvailability();
  }, []);

  // We no longer limit recording time based on available space
  // The sample will be edited to fit before being added to the kit
  useEffect(() => {
    // Set maxRecordingTimeRef to 0 to indicate no time limit
    maxRecordingTimeRef.current = 0;
  }, []);

  const startRecording = useCallback(async () => {
    try {
      if (!isRecordingAvailable || isLoading) {
        return;
      }

      // Reset audio chunks
      audioChunksRef.current = [];

      // Get audio stream from microphone
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Create a new MediaRecorder instance
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      // Set up event handlers
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        setIsRecording(false);

        if (audioChunksRef.current.length === 0) {
          return;
        }

        try {
          // Create a blob from the audio chunks
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });

          // Convert the blob to an ArrayBuffer
          const arrayBuffer = await audioBlob.arrayBuffer();

          // Create an AudioContext to decode the audio
          const audioContext = new AudioContext();

          // Decode the audio data
          const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

          // Dispatch the action to add the recorded sample
          dispatch(addRecordedSample({ audioBuffer }));
        } catch (error) {
          console.error('Error processing recorded audio:', error);
          setRecordingError('Error processing recorded audio');
        }
      };

      // Start recording
      mediaRecorder.start();
      startTimeRef.current = Date.now();
      setIsRecording(true);

      // We no longer automatically stop recording based on time limit
      // The user will manually stop recording and then edit the sample to fit
    } catch (error) {
      console.error('Error starting recording:', error);
      setRecordingError('Error starting recording');
    }
  }, [dispatch, isRecordingAvailable, isLoading]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  }, []);

  // Handle mouse down/up events for the record button
  const handleMouseDown = () => {
    startRecording();
  };

  const handleMouseUp = () => {
    stopRecording();
  };

  // Handle touch events for mobile devices
  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault(); // Prevent default touch behavior
    startRecording();
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    e.preventDefault(); // Prevent default touch behavior
    stopRecording();
  };

  return (
    <div className="sample-recorder">
      {recordingError && <div className="recording-error">{recordingError}</div>}

      <button
        className={`record-button ${isRecording ? 'recording' : ''}`}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        disabled={!isRecordingAvailable || isLoading}
        aria-label="Record sample"
        title={isRecordingAvailable ? 'Hold to record. Release to stop. You can edit the sample before saving to kit.' : 'Recording not available'}
      >
        {isRecording ? 'Recording...' : 'Record'}
      </button>
    </div>
  );
}
