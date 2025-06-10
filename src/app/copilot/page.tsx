// src/app/copilot/page.tsx
import React from 'react';
import CopilotDisplay from '@/components/copilot/CopilotDisplay';

const CopilotPage = () => {
  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <h1>Tool C: Medical Co-pilot</h1>
      <CopilotDisplay />
    </div>
  );
};

export default CopilotPage;
