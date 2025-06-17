'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import NewConsultationModal from '@/components/modals/NewConsultationModal';

export default function ModalTestPage() {
  const [showModal, setShowModal] = useState(false);
  const [showNonDraggableModal, setShowNonDraggableModal] = useState(false);
  const [renderCount, setRenderCount] = useState(0);

  React.useEffect(() => {
    setRenderCount(prev => prev + 1);
  }, []);

  console.log('[ModalTestPage] Render count:', renderCount);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Modal Test Page</h1>
      <p className="mb-4">Render count: {renderCount}</p>
      
      <div className="space-y-4">
        <Button 
          onClick={() => {
            console.log('[ModalTestPage] Opening draggable modal');
            setShowModal(true);
          }}
        >
          Open New Consultation Modal (Draggable)
        </Button>

        <Button 
          onClick={() => {
            console.log('[ModalTestPage] Opening non-draggable modal');
            setShowNonDraggableModal(true);
          }}
          variant="outline"
        >
          Open New Consultation Modal (Non-Draggable)
        </Button>
      </div>

      {/* Test 1: Always render modal with draggable */}
      <NewConsultationModal 
        open={showModal} 
        onOpenChange={(v) => {
          console.log('[ModalTestPage] Draggable modal onOpenChange called with:', v);
          setShowModal(v);
        }}
        draggable={true}
        draggableConfig={{
          id: 'test-modal-draggable',
          title: 'Test Modal Draggable',
          persistent: false
        }}
      />

      {/* Test 2: Always render modal without draggable */}
      <NewConsultationModal 
        open={showNonDraggableModal} 
        onOpenChange={(v) => {
          console.log('[ModalTestPage] Non-draggable modal onOpenChange called with:', v);
          setShowNonDraggableModal(v);
        }}
        draggable={false}
      />
    </div>
  );
} 