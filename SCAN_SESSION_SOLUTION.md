# Risk Analysis Scan Session Management - Solution

## Problem Statement
When users navigate to the risk analysis page → scan starts → navigate to other page → navigate back to risk analysis page, a new scan would start while the previous one was still running in the background. This resulted in:

1. Duplicate scans running simultaneously
2. Resource waste
3. Confusing user experience
4. Potential API throttling issues

## Solution Implemented: Option 2 - Persistent Scan Sessions

We chose **Option 2** (keep scan running, reuse when returning) as it provides the best user experience.

### Key Components

#### 1. ScanSessionManager (`/src/lib/scan-session-manager.ts`)
A singleton class that manages scan sessions globally across the application:

**Features:**
- **Persistent Storage**: Uses `sessionStorage` to persist scan state across page navigation
- **Session Validation**: Automatically expires sessions older than 1 hour
- **Duplicate Prevention**: Prevents starting new scans with identical parameters
- **State Synchronization**: Subscribers get notified of all state changes
- **Recovery**: Automatically restores ongoing scans when users return

**Key Methods:**
- `canStartNewScan()`: Checks if a new scan can be started or if one is already running
- `startNewScan()`: Initializes a new scan session with unique ID
- `updateProgress()`, `addResult()`, `setSummary()`: Update scan state
- `subscribe()`: Allow components to listen for state changes

#### 2. Enhanced useStreamingRiskAnalysis Hook
Updated the hook to use the session manager:

**New Features:**
- **Session Awareness**: Checks existing sessions before starting new scans
- **State Persistence**: Automatically restores state from session manager
- **Duplicate Prevention**: Won't start new scan if one is already running with same parameters
- **Reconnection**: Seamlessly reconnects to ongoing scans

#### 3. Updated Risk Analysis Page
Enhanced the page component to:

**User Experience Improvements:**
- **Smart Scanning**: Only starts new scan if needed
- **Reconnection Notification**: Shows blue banner when reconnecting to existing scan
- **Seamless Recovery**: Users see progress from where they left off

### How It Works

1. **First Visit**: User visits risk analysis page
   - No existing session → starts new scan
   - Session manager creates new session with unique ID
   - Scan progress stored in sessionStorage

2. **Navigation Away**: User goes to different page
   - Component unmounts but scan continues in background
   - Session state persists in sessionStorage
   - API continues processing

3. **Return to Risk Analysis**: User navigates back
   - Session manager restores previous session
   - Hook checks `canStartNewScan()` → returns false
   - Shows "reconnected to ongoing scan" notification
   - User sees progress from where they left off

4. **Scan Completion**: When scan finishes
   - Session marked as inactive
   - Results remain available for 1 hour
   - Next visit will start fresh scan if needed

### User Interface Changes

#### Reconnection Notification
When users return to an ongoing scan, they see:

```tsx
<div className="p-4 bg-blue-50 border-l-4 border-blue-400">
  <div className="flex">
    <div className="flex-shrink-0">
      <Loader2 className="h-5 w-5 text-blue-400 animate-spin" />
    </div>
    <div className="ml-3">
      <p className="text-sm text-blue-700">
        <strong>Reconnected to ongoing scan:</strong> You navigated back to a risk analysis 
        that was already in progress. The scan will continue from where it left off.
      </p>
    </div>
  </div>
</div>
```

### Benefits

1. **No Duplicate Scans**: Only one scan runs per unique parameter set
2. **Resource Efficiency**: No wasted API calls or processing
3. **Better UX**: Users can navigate freely without losing progress
4. **Automatic Recovery**: Seamless reconnection to ongoing scans
5. **Session Persistence**: Results available even after brief disconnections

### Technical Details

- **Session Storage**: Used instead of localStorage for automatic cleanup on browser close
- **Session Expiry**: 1-hour automatic expiry prevents stale sessions
- **Parameter Matching**: Compares permission sets, region, and SSO region to identify duplicate scans
- **Error Handling**: Graceful fallback if session restoration fails
- **Memory Management**: Proper cleanup of event listeners and subscribers

### Testing Scenarios

To test the fix:

1. **Start scan and navigate away**:
   - Go to `/risk-analysis`
   - Wait for scan to start
   - Navigate to `/organization`
   - Return to `/risk-analysis`
   - ✅ Should see reconnection notification and continue from previous progress

2. **Complete scan and return**:
   - Let scan complete fully
   - Navigate away and return
   - ✅ Should show completed results without starting new scan

3. **Different parameters**:
   - Change region in settings
   - Return to risk analysis
   - ✅ Should start new scan (different parameters)

4. **Session expiry**:
   - Start scan, wait 1+ hour, return
   - ✅ Should start fresh scan (expired session)

## Implementation Files

- `src/lib/scan-session-manager.ts` - Core session management
- `src/hooks/useStreamingRiskAnalysis.ts` - Enhanced hook with session support  
- `src/app/risk-analysis/page.tsx` - Updated page with reconnection UI

The solution provides a robust, user-friendly experience while preventing resource waste and duplicate operations.
