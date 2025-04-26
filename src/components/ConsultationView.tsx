'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Transcript, TranscriptSegment, ClinicalNote, CopilotSuggestion, ComplexCaseAlert } from '@/lib/types';
import { patientDataService } from '@/lib/patientDataService';
import { transcriptionService } from '@/lib/transcriptionService';
import { alertService } from '@/lib/alertService';

interface ConsultationViewProps {
  patientId: string;
}

export default function ConsultationView({ patientId }: ConsultationViewProps) {
  const [patient, setPatient] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [transcript, setTranscript] = useState<Transcript | null>(null);
  const [clinicalNote, setClinicalNote] = useState<ClinicalNote | null>(null);
  const [suggestions, setSuggestions] = useState<CopilotSuggestion[]>([]);
  const [complexCaseAlert, setComplexCaseAlert] = useState<ComplexCaseAlert | null>(null);
  const [activeTab, setActiveTab] = useState<string>('transcript');
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function loadPatientData() {
      try {
        await patientDataService.loadPatientData();
        const patientData = patientDataService.getPatientData(patientId);
        
        if (!patientData) {
          setError('Patient not found');
          setLoading(false);
          return;
        }
        
        setPatient(patientData);
        setLoading(false);
        
        // For demo purposes, load a sample transcript
        const demoTranscript = transcriptionService.generateDemoTranscript(patientId);
        setTranscript(demoTranscript);
        
        // Generate clinical note from the demo transcript
        const note = await transcriptionService.generateClinicalNote(demoTranscript);
        setClinicalNote(note);
        
        // Generate co-pilot suggestions based on the transcript text
        const transcriptText = demoTranscript.segments.map(s => s.text).join(' ');
        const copilotSuggestions = await alertService.generateCopilotSuggestions(transcriptText);
        setSuggestions(copilotSuggestions);
        
        // Check for complex case patterns
        const alert = await alertService.checkForComplexCase(patientId, transcriptText);
        setComplexCaseAlert(alert);
      } catch (err) {
        setError('Failed to load patient data');
        setLoading(false);
        console.error('Error loading patient data:', err);
      }
    }

    loadPatientData();
  }, [patientId]);

  useEffect(() => {
    // Scroll to the bottom of the transcript when new segments are added
    if (transcriptEndRef.current) {
      transcriptEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [transcript?.segments]);

  const handleStartRecording = async () => {
    try {
      const newTranscript = await transcriptionService.startRecording(patientId);
      setTranscript(newTranscript);
      setIsRecording(true);
      
      // Simulate receiving transcript segments
      simulateTranscription();
    } catch (err) {
      console.error('Error starting recording:', err);
    }
  };

  const handleStopRecording = async () => {
    try {
      if (transcript) {
        const finalTranscript = await transcriptionService.stopRecording();
        setTranscript(finalTranscript);
        setIsRecording(false);
        
        // Generate clinical note from the transcript
        const note = await transcriptionService.generateClinicalNote(finalTranscript);
        setClinicalNote(note);
        
        // Generate co-pilot suggestions based on the transcript text
        const transcriptText = finalTranscript.segments.map(s => s.text).join(' ');
        const copilotSuggestions = await alertService.generateCopilotSuggestions(transcriptText);
        setSuggestions(copilotSuggestions);
        
        // Check for complex case patterns
        const alert = await alertService.checkForComplexCase(patientId, transcriptText);
        setComplexCaseAlert(alert);
      }
    } catch (err) {
      console.error('Error stopping recording:', err);
    }
  };

  const simulateTranscription = () => {
    // This is a simulation for the MVP
    // In production, this would be replaced with actual transcription from the microphone
    
    const doctorPhrases = [
      "How are you feeling today?",
      "Can you describe your symptoms?",
      "When did this start?",
      "Have you tried any medications?",
      "Let me examine that for you."
    ];
    
    const patientPhrases = [
      "I've been having joint pain in my hands.",
      "It started about three months ago and has been getting worse.",
      "The pain is worse in the mornings, and my joints feel stiff for hours.",
      "I've tried over-the-counter pain relievers, but they don't help much.",
      "I'm also feeling very tired all the time, even when I get enough sleep."
    ];
    
    let index = 0;
    
    const interval = setInterval(() => {
      if (!isRecording || index >= doctorPhrases.length) {
        clearInterval(interval);
        return;
      }
      
      // Add doctor segment
      const doctorSegment: TranscriptSegment = {
        speaker: 'doctor',
        text: doctorPhrases[index],
        timestamp: new Date().toISOString()
      };
      
      transcriptionService.addTranscriptSegment(doctorSegment);
      setTranscript(prev => {
        if (!prev) return null;
        return {
          ...prev,
          segments: [...prev.segments, doctorSegment]
        };
      });
      
      // Add patient segment after a short delay
      setTimeout(() => {
        if (!isRecording) return;
        
        const patientSegment: TranscriptSegment = {
          speaker: 'patient',
          text: patientPhrases[index],
          timestamp: new Date().toISOString()
        };
        
        transcriptionService.addTranscriptSegment(patientSegment);
        setTranscript(prev => {
          if (!prev) return null;
          return {
            ...prev,
            segments: [...prev.segments, patientSegment]
          };
        });
        
        // Generate co-pilot suggestions based on the updated transcript
        if (transcript) {
          const updatedTranscriptText = [...(transcript.segments || []), doctorSegment, patientSegment]
            .map(s => s.text)
            .join(' ');
          
          alertService.generateCopilotSuggestions(updatedTranscriptText)
            .then(newSuggestions => {
              setSuggestions(newSuggestions);
            });
        }
      }, 2000);
      
      index++;
    }, 5000);
  };

  const handleDismissSuggestion = (suggestionId: string) => {
    setSuggestions(prev => 
      prev.map(suggestion => 
        suggestion.id === suggestionId 
          ? { ...suggestion, dismissed: true } 
          : suggestion
      )
    );
  };

  const handleActionSuggestion = (suggestionId: string) => {
    setSuggestions(prev => 
      prev.map(suggestion => 
        suggestion.id === suggestionId 
          ? { ...suggestion, actioned: true } 
          : suggestion
      )
    );
  };

  const handleAcknowledgeAlert = () => {
    if (complexCaseAlert) {
      setComplexCaseAlert({
        ...complexCaseAlert,
        acknowledged: true,
        acknowledgedAt: new Date().toISOString()
      });
    }
  };

  const handleUpdateNote = (section: string, content: string) => {
    if (clinicalNote) {
      setClinicalNote({
        ...clinicalNote,
        [section]: content,
        updatedAt: new Date().toISOString()
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg font-medium text-gray-500">Loading consultation...</div>
      </div>
    );
  }

  if (error || !patient) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg font-medium text-red-500">{error || 'Patient not found'}</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Patient header */}
      <div className="bg-white shadow p-4 mb-4 rounded-lg">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center">
          <div>
            <h1 className="text-xl font-bold text-gray-800">
              Patient {patient.patient.id.substring(0, 8)}
            </h1>
            <p className="text-gray-600">
              {patient.patient.gender}, {new Date().getFullYear() - new Date(patient.patient.dateOfBirth).getFullYear()} years old
            </p>
          </div>
          <div className="mt-4 md:mt-0 flex space-x-3">
            {!isRecording ? (
              <button
                onClick={handleStartRecording}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                Start Recording
              </button>
            ) : (
              <button
                onClick={handleStopRecording}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Stop Recording
              </button>
            )}
            <a
              href={`/patients/${patientId}`}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              View Patient Record
            </a>
          </div>
        </div>
      </div>

      {/* Complex case alert */}
      {complexCaseAlert && !complexCaseAlert.acknowledged && (
        <div className={`mb-4 p-4 rounded-lg shadow ${
          complexCaseAlert.severity === 'high' 
            ? 'bg-red-50 border-l-4 border-red-500' 
            : complexCaseAlert.severity === 'medium'
              ? 'bg-yellow-50 border-l-4 border-yellow-500'
              : 'bg-blue-50 border-l-4 border-blue-500'
        }`}>
          <div className="flex">
            <div className="flex-shrink-0">
              {complexCaseAlert.severity === 'high' ? (
                <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-gray-800">
                Potential {complexCaseAlert.type} case detected ({complexCaseAlert.severity} severity)
              </h3>
              <div className="mt-2 text-sm text-gray-700">
                <p>Triggering factors:</p>
                <ul className="list-disc pl-5 mt-1">
                  {complexCaseAlert.triggeringFactors.map((factor, index) => (
                    <li key={index}>{factor}</li>
                  ))}
                </ul>
                <p className="mt-2">Suggested actions:</p>
                <ul className="list-disc pl-5 mt-1">
                  {complexCaseAlert.suggestedActions.map((action, index) => (
                    <li key={index}>{action}</li>
                  ))}
                </ul>
              </div>
              <div className="mt-4">
                <button
                  type="button"
                  onClick={handleAcknowledgeAlert}
                  className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Acknowledge
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-grow grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Left panel - Transcript */}
        <div className="md:col-span-2 bg-white shadow rounded-lg overflow-hidden">
          {/* Tabs */}
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${
                  activeTab === 'transcript'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
                onClick={() => setActiveTab('transcript')}
              >
                Transcript
              </button>
              <button
                className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${
                  activeTab === 'note'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
                onClick={() => setActiveTab('note')}
              >
                Clinical Note
              </button>
            </nav>
          </div>

          {/* Tab content */}
          <div className="p-4">
            {activeTab === 'transcript' && (
              <div className="h-[calc(100vh-300px)] overflow-y-auto">
                {transcript && transcript.segments.length > 0 ? (
                  <div className="space-y-4">
                    {transcript.segments.map((segment, index) => (
                      <div 
                        key={index} 
                        className={`flex ${segment.speaker === 'doctor' ? 'justify-start' : 'justify-end'}`}
                      >
                        <div 
                          className={`max-w-[80%] rounded-lg px-4 py-2 ${
                            segment.speaker === 'doctor' 
                              ? 'bg-blue-100 text-blue-800' 
                              : 'bg-green-100 text-green-800'
                          }`}
                        >
                          <div className="text-xs font-medium mb-1">
                            {segment.speaker === 'doctor' ? 'Doctor' : 'Patient'}
                          </div>
                          <div>{segment.text}</div>
                        </div>
                      </div>
                    ))}
                    <div ref={transcriptEndRef} />
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-gray-500">
                      {isRecording 
                        ? 'Listening...' 
                        : 'Start recording to see the transcript'}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'note' && (
              <div className="h-[calc(100vh-300px)] overflow-y-auto">
                {clinicalNote ? (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">Subjective</h3>
                      <textarea
                        className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        rows={5}
                        value={clinicalNote.subjective}
                        onChange={(e) => handleUpdateNote('subjective', e.target.value)}
                      />
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">Objective</h3>
                      <textarea
                        className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        rows={5}
                        value={clinicalNote.objective}
                        onChange={(e) => handleUpdateNote('objective', e.target.value)}
                      />
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">Assessment</h3>
                      <textarea
                        className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        rows={5}
                        value={clinicalNote.assessment}
                        onChange={(e) => handleUpdateNote('assessment', e.target.value)}
                      />
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">Plan</h3>
                      <textarea
                        className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        rows={5}
                        value={clinicalNote.plan}
                        onChange={(e) => handleUpdateNote('plan', e.target.value)}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-gray-500">
                      Complete the recording to generate a clinical note
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right panel - Co-pilot suggestions */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Co-pilot Suggestions</h2>
          </div>
          <div className="p-4 h-[calc(100vh-300px)] overflow-y-auto">
            {suggestions.length > 0 ? (
              <div className="space-y-4">
                {suggestions
                  .filter(suggestion => !suggestion.dismissed)
                  .map(suggestion => (
                    <div 
                      key={suggestion.id} 
                      className={`border-l-4 rounded-r-lg p-4 ${
                        suggestion.type === 'question' 
                          ? 'border-blue-500 bg-blue-50' 
                          : suggestion.type === 'test'
                            ? 'border-purple-500 bg-purple-50'
                            : suggestion.type === 'medication'
                              ? 'border-green-500 bg-green-50'
                              : suggestion.type === 'guideline'
                                ? 'border-yellow-500 bg-yellow-50'
                                : 'border-red-500 bg-red-50'
                      }`}
                    >
                      <div className="flex justify-between">
                        <div className="text-xs font-medium text-gray-500 uppercase">
                          {suggestion.type}
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleActionSuggestion(suggestion.id)}
                            className="text-xs text-blue-600 hover:text-blue-800"
                          >
                            Use
                          </button>
                          <button
                            onClick={() => handleDismissSuggestion(suggestion.id)}
                            className="text-xs text-gray-600 hover:text-gray-800"
                          >
                            Dismiss
                          </button>
                        </div>
                      </div>
                      <div className="mt-1 text-sm text-gray-800">
                        {suggestion.content}
                      </div>
                      {suggestion.context && (
                        <div className="mt-1 text-xs text-gray-500">
                          {suggestion.context}
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-gray-500">
                  No suggestions available
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
