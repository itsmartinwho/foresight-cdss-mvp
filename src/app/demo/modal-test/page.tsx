'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DraggableDialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import GuidelineModal from '@/components/guidelines/GuidelineModal';
import { DraggableModalWrapper } from '@/components/ui/draggable-modal-wrapper';
import { GuidelineModalData } from '@/types/guidelines';
import { Medal } from '@phosphor-icons/react';
import { clearModalPositions } from '@/lib/modalPersistence';
import { useModalManager } from '@/components/ui/modal-manager';

// Mock guideline data for testing
const mockGuidelineData: GuidelineModalData = {
  id: 1,
  title: "Test Clinical Guideline for Draggable Modal",
  source: 'USPSTF',
  specialty: 'General Medicine',
  metadata: {
    grade: 'A',
    publication_date: '2023-01-01',
    last_reviewed: '2024-01-01',
    organization: 'U.S. Preventive Services Task Force',
    guideline_id: 'test-guideline-1'
  },
  sections: [
    {
      id: 'key_recommendations',
      title: 'Key Recommendations',
      content: '<p>This is a test guideline to demonstrate draggable modal functionality.</p>',
      type: 'key_recommendations',
      isExpanded: false
    },
    {
      id: 'implementation',
      title: 'Implementation',
      content: '<p>Implementation details for the guideline.</p>',
      type: 'implementation',
      isExpanded: false
    }
  ],
  breadcrumbs: ['Guidelines', 'General Medicine', 'USPSTF', 'Test Guideline'],
  fullContent: '<p>Full content of the test guideline.</p>'
};

export default function ModalTestPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDraggableDialogOpen, setIsDraggableDialogOpen] = useState(false);
  const [isGuidelineModalOpen, setIsGuidelineModalOpen] = useState(false);
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);

  // Get modal manager for debugging
  const modalManager = useModalManager();

  // Clear any persisted modal data for clean testing
  useEffect(() => {
    clearModalPositions();
  }, []);

  // Debug function to log current modal state
  const debugModalState = () => {
    console.log('🔧 Debug Modal State:');
    console.log('  Current modals:', modalManager.state.modals);
    console.log('  Minimized modals:', modalManager.state.minimizedModals);
    console.log('  Highest Z-Index:', modalManager.state.highestZIndex);
    
    // Also check if each modal is visible and minimized
    Object.values(modalManager.state.modals).forEach(modal => {
      console.log(`  Modal ${modal.id}: visible=${modal.isVisible}, minimized=${modal.isMinimized}`);
    });
  };

  // Force clear all modals
  const forceCleanupModals = () => {
    // Force unregister all current modals
    Object.keys(modalManager.state.modals).forEach(modalId => {
      modalManager.unregisterModal(modalId);
    });
    clearModalPositions();
    console.log('🧹 Force cleaned all modals');
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Modal Drag and Minimize Test Page</h1>
      
      {/* Debug Section */}
      <div className="mb-6 p-4 bg-yellow-100 border border-yellow-300 rounded">
        <h3 className="font-semibold mb-2 text-yellow-800">Debug Controls</h3>
        <div className="space-x-2">
          <Button onClick={debugModalState} variant="outline" size="sm">
            Log Modal State
          </Button>
          <Button onClick={forceCleanupModals} variant="outline" size="sm">
            Force Clear All Modals
          </Button>
        </div>
        <p className="text-sm text-yellow-700 mt-2">
          Use these buttons to debug modal state. Check browser console for logs.
        </p>
      </div>
      
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold mb-2">Regular Dialog (Non-Draggable)</h2>
          <Button onClick={() => setIsDialogOpen(true)}>
            Open Regular Dialog
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Regular Dialog</DialogTitle>
                <DialogDescription>
                  This is a regular dialog that cannot be dragged or minimized.
                </DialogDescription>
              </DialogHeader>
              <div className="p-4">
                <p>Regular dialog content goes here.</p>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">Draggable Dialog</h2>
          <Button onClick={() => setIsDraggableDialogOpen(true)}>
            Open Draggable Dialog
          </Button>
          <Dialog open={isDraggableDialogOpen} onOpenChange={setIsDraggableDialogOpen}>
            <DraggableDialogContent
              draggable={true}
              draggableConfig={{
                id: 'test-draggable-dialog',
                title: 'Draggable Dialog',
                defaultPosition: { x: 100, y: 100 },
                persistent: true,
              }}
            >
              <DialogHeader>
                <DialogTitle>Draggable Dialog</DialogTitle>
                <DialogDescription>
                  This dialog can be dragged by its title bar and minimized!
                </DialogDescription>
              </DialogHeader>
              <div className="p-4">
                <p>Try dragging this dialog by clicking and holding the title bar.</p>
                <p>You can also minimize it using the minimize button!</p>
              </div>
            </DraggableDialogContent>
          </Dialog>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">Draggable Guideline Modal</h2>
          <Button onClick={() => setIsGuidelineModalOpen(true)}>
            Open Draggable Guideline Modal
          </Button>
          <GuidelineModal
            modalData={mockGuidelineData}
            isOpen={isGuidelineModalOpen}
            onClose={() => setIsGuidelineModalOpen(false)}
            isBookmarked={isBookmarked}
            onBookmarkToggle={() => setIsBookmarked(!isBookmarked)}
            draggable={true}
            draggableConfig={{
              id: 'test-guideline-modal',
              title: mockGuidelineData.title,
              defaultPosition: { x: 200, y: 150 },
              persistent: true,
            }}
          />
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">Custom Draggable Modal</h2>
          <Button onClick={() => setIsCustomModalOpen(true)}>
            Open Custom Draggable Modal
          </Button>
          {isCustomModalOpen && (
            <DraggableModalWrapper
              config={{
                id: 'custom-modal',
                title: 'Custom Modal',
                icon: Medal,
                defaultPosition: { x: 300, y: 200 },
                persistent: true,
              }}
              onClose={() => setIsCustomModalOpen(false)}
              showMinimizeButton={true}
              showCloseButton={true}
            >
              <div className="p-6">
                <h3 className="text-lg font-semibold mb-4">Custom Modal Content</h3>
                <p className="mb-4">
                  This is a custom modal created using the DraggableModalWrapper component.
                </p>
                <p className="mb-4">
                  It has all the draggable and minimizable features built-in!
                </p>
                <div className="bg-gray-100 p-4 rounded">
                  <p className="text-sm text-gray-600">
                    Features:
                  </p>
                  <ul className="list-disc list-inside text-sm text-gray-600 mt-2">
                    <li>Drag by title bar</li>
                    <li>Minimize to bottom bar</li>
                    <li>Restore from minimized state</li>
                    <li>Position persistence</li>
                    <li>Keyboard shortcuts (Ctrl+M)</li>
                  </ul>
                </div>
              </div>
            </DraggableModalWrapper>
          )}
        </div>
      </div>

      <div className="mt-8 p-4 bg-gray-100 rounded">
        <h3 className="font-semibold mb-2">Instructions:</h3>
        <ul className="list-disc list-inside space-y-1 text-sm">
          <li>Open multiple modals to test dragging and layering</li>
          <li>Drag modals by clicking and holding their title bars</li>
          <li>Click the minimize button (-) to minimize a modal</li>
          <li>Minimized modals appear at the bottom of the screen</li>
          <li>Click on a minimized modal to restore it</li>
          <li>Use Ctrl+M to minimize the active modal</li>
          <li>Modal positions are saved and restored when reopened</li>
        </ul>
      </div>
    </div>
  );
} 