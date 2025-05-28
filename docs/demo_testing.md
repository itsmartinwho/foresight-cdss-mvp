# Demo System Testing Guide

## Quick Test Instructions

The demo system should automatically show up when you first visit the application. If it doesn't appear, follow these steps to test and debug:

### 1. Check Browser Console

Open the browser developer tools (F12) and look for these console messages:
- `Demo orchestrator initializing - hasDemoRun: false`
- `Demo orchestrator initializing - shouldShowDemoModal: true`
- `Demo orchestrator initializing - initialDemoStage: introModal`
- `DashboardView demo state: { hasDemoRun: false, isDemoModalOpen: true, demoStage: 'introModal', isDemoActive: false }`

### 2. Reset Demo State

If the demo has already run, you can reset it by running this in the browser console:
```javascript
resetDemo()
```

Or manually:
```javascript
localStorage.removeItem('hasDemoRun');
window.location.reload();
```

### 3. Expected Demo Flow

1. **Initial Load**: Demo modal should appear with "See Foresight in Action" title
2. **Start Demo**: Click "Start Demo" button
3. **Navigation**: Should navigate to Dorothy Robinson patient workspace
4. **Demo Panel**: Consultation panel should open automatically
5. **Animation**: Transcript should animate line by line
6. **Clinical Plan**: After transcript, diagnosis and treatment should appear

### 4. Demo Patient Data

The demo uses a mock patient "Dorothy Robinson" with ID: `0681FA35-A794-4684-97BD-00B88370DB41`

Patient details:
- Name: Dorothy Robinson
- Gender: Female
- DOB: 1978-04-15
- Condition: Reactive arthritis (Reiter's syndrome)

### 5. Troubleshooting

**Demo modal not showing:**
- Check console for initialization logs
- Verify localStorage doesn't have `hasDemoRun: true`
- Ensure you're on the dashboard page

**Demo fails to start:**
- Check for JavaScript errors in console
- Verify DemoProvider is wrapping the app
- Check that all demo services are properly imported

**Demo gets stuck:**
- Check demo stage in console logs
- Verify animation services are working
- Look for any race conditions in patient data loading

### 6. Manual Demo Testing

You can manually trigger demo stages for testing:

```javascript
// Get demo context (only works if you're on a page with demo context)
const demoState = window.demoState; // If exposed

// Or reset and restart
resetDemo();
// Then refresh page and click "Start Demo"
```

### 7. Demo Architecture

The demo system consists of:
- **DemoStateService**: Manages localStorage and demo state
- **DemoDataService**: Provides mock patient and encounter data
- **DemoAnimationService**: Handles transcript and plan animations
- **useDemoOrchestrator**: Main hook that coordinates demo flow
- **DemoProvider**: React context that makes demo state available

All demo logic is separated from production code and uses mock data instead of database queries. 