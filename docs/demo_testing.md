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

**🎯 Easiest Method - Use the UI:**
1. Click on the user profile picture in the top-right corner of the header
2. Click "Reset Demo" from the dropdown menu
3. The page will automatically reload and the demo modal should appear

**Alternative Methods:**

If the demo has already run (you'll see `hasDemoRun: true` in console), you can also reset it using any of these methods:

**Method 1 - Use the exposed function:**
```javascript
resetDemo()
```

**Method 2 - Use the alternative function:**
```javascript
forceShowDemo()
```

**Method 3 - Manual reset:**
```javascript
localStorage.removeItem('hasDemoRun');
window.location.reload();
```

**Method 4 - Complete manual reset:**
```javascript
localStorage.clear();
window.location.reload();
```

> **Note:** After running any reset command, the page will automatically reload and the demo modal should appear.

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
- **Try the UI reset**: Click user profile → "Reset Demo"

**Demo functions not available in console:**
- **Recommended**: Use the UI reset option instead (user profile → "Reset Demo")
- Wait for the page to fully load (check for "Demo functions available" message in console)
- Try refreshing the page and waiting a few seconds
- If still not available, use the manual reset method

**"ReferenceError: javascript is not defined" error:**
- **Recommended**: Use the UI reset option instead (user profile → "Reset Demo")
- This happens when trying to run code that's not properly defined
- Use one of the alternative reset methods listed above
- Make sure you're typing the function name correctly (no extra characters)

**Demo fails to start:**
- Check for JavaScript errors in console
- Verify DemoProvider is wrapping the app
- Check network tab for failed requests
- **Try the UI reset**: Click user profile → "Reset Demo"

**Demo gets stuck:**
- Check demo stage in console logs
- Verify animation services are working
- Look for any race conditions in patient data loading

**If all else fails:**
Try this complete reset sequence:
```javascript
// Clear all localStorage
localStorage.clear();
// Force reload
window.location.href = window.location.href;
```

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