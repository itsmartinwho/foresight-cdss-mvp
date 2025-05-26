'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Encounter } from '@/lib/types';

interface TranscriptDebugProps {
  selectedEncounter: Encounter | null;
  editableTranscript: string;
}

const TranscriptDebug: React.FC<TranscriptDebugProps> = ({ 
  selectedEncounter, 
  editableTranscript 
}) => {
  return (
    <Card className="mb-4 border-yellow-500 bg-yellow-50">
      <CardHeader>
        <CardTitle className="text-yellow-800">🐛 Transcript Debug Info</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div>
          <strong>Selected Encounter:</strong> {selectedEncounter ? 'Yes' : 'No'}
        </div>
        {selectedEncounter && (
          <>
            <div>
              <strong>Encounter ID:</strong> {selectedEncounter.id}
            </div>
            <div>
              <strong>Encounter Identifier:</strong> {selectedEncounter.encounterIdentifier}
            </div>
            <div>
              <strong>Patient ID:</strong> {selectedEncounter.patientId}
            </div>
            <div>
              <strong>Raw Transcript (from encounter):</strong> 
              <div className="bg-gray-100 p-2 rounded mt-1 max-h-20 overflow-y-auto">
                {selectedEncounter.transcript ? (
                  <pre className="whitespace-pre-wrap text-xs">
                    {JSON.stringify(selectedEncounter.transcript, null, 2)}
                  </pre>
                ) : (
                  <span className="text-red-600">NULL/EMPTY</span>
                )}
              </div>
            </div>
            <div>
              <strong>Transcript Length:</strong> {selectedEncounter.transcript?.length || 0}
            </div>
          </>
        )}
        <div>
          <strong>Editable Transcript State:</strong>
          <div className="bg-gray-100 p-2 rounded mt-1 max-h-20 overflow-y-auto">
            {editableTranscript ? (
              <pre className="whitespace-pre-wrap text-xs">
                {JSON.stringify(editableTranscript, null, 2)}
              </pre>
            ) : (
              <span className="text-red-600">EMPTY</span>
            )}
          </div>
        </div>
        <div>
          <strong>Editable Transcript Length:</strong> {editableTranscript?.length || 0}
        </div>
        <div>
          <strong>Rendered HTML Preview:</strong>
          <div className="bg-white border p-2 rounded mt-1 max-h-20 overflow-y-auto">
            <div dangerouslySetInnerHTML={{ __html: editableTranscript }} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TranscriptDebug; 