## **Issue Summary: Stage 1 Lock Reversion Problem**

### **The Core Issue**

Stage 1 successfully locks (network response shows version 21 with status: "locked"), but immediately reverts to draft status in the next request (version 22 with status: "draft"). This creates a race condition where:

1. User clicks "Continue to Treatment"  
1. Stage 1 locks properly ✅  
1. Something saves Stage 1 again with status: 'draft' ❌  
1. Stage 2 cannot lock because Stage 1 appears draft

### **Failed Attempts**

Attempt 1: Fixed Stage 1 Completion Flow

* ✅ Changed Stage1InputMode to save with status: 'draft' instead of manually locking  
* ✅ Fixed callback signature mismatch (onComplete: () \=\> void)  
* ❌ Result: Stage 1 still reverts to draft after locking

Attempt 2: Disabled Auto-Save

* ✅ Set autoSave: false in Stage1InputMode's useStageState hook  
* ✅ Verified useStageState respects the parameter  
* ❌ Result: Stage 1 still reverts to draft after locking

### **What's Happening (From Network Logs)**

### Version 20: draft (handleComplete manual save)

### Version 21: locked (lockStage API call) ✅

### Version 22: draft (??? automatic save) ❌

### **What We've Ruled Out**

* ✅ Stage locking API (works \- creates version 21 locked)  
* ✅ Manual saves in handleComplete (only happens once)  
* ✅ Navigation timing (happens after lock)  
* ✅ Backend validation (allows Stage 1 locking)

### **Suspected Cause**

Despite autoSave: false, something is still calling the stage state PUT endpoint after the lock operation without providing a status parameter, causing the backend to default to 'draft' (line 208 in stageStates.ts: status: status || 'draft').

### **Recommended Next Steps**

1. Add Backend Debug Logging  
2.    *// In backend/src/routes/stageStates.ts PUT endpoint*  
3.    console.log('🔍 STAGE STATE SAVE TRIGGERED:', {  
4.      stage,  
5.      providedStatus: status,  
6.      finalStatus: status || 'draft',  
7.      callStack: new Error().stack  
8.    });  
9.    \`\`\`  
10. 2\. \*\*Check for Multiple useStageState Hooks\*\*  
11.    \- Search codebase for all \`useStageState\` calls  
12.    \- Ensure no other components are managing Stage 1 state  
13. 3\. \*\*Force Lock Persistence\*\*  
14.    \- Modify backend to prevent status regression:  
15.    \`\`\`sql  
16.    \-- Once locked, status cannot change back to draft  
17.    IF existing\_status \= 'locked' AND new\_status \= 'draft' THEN  
18.      RAISE EXCEPTION 'Cannot revert locked stage to draft';  
19.    \`\`\`  
20. 4\. \*\*Component Lifecycle Investigation\*\*  
21.    \- Add React DevTools Profiler to trace component mounts/unmounts  
22.    \- Check if \`Stage1InputMode\` re-mounts after locking  
23. 5\. \*\*Global Auto-Save Disable\*\*  
24.    \- Temporarily hardcode \`autoSave \= false\` in \`useStageState\` hook  
25.    \- Confirm if auto-save is the source  
26. The issue is likely a persistent auto-save mechanism or duplicate state management that's not respecting our \`autoSave: false\` setting. The backend logging will reveal exactly what's triggering the version 22 draft save.  
1. Check for Multiple useStageState Hooks  
* Search codebase for all useStageState calls  
* Ensure no other components are managing Stage 1 state  
1. Force Lock Persistence  
* Modify backend to prevent status regression:  
*    *\-- Once locked, status cannot change back to draft*  
*    IF existing\_status \= 'locked' AND new\_status \= 'draft' THEN  
*      RAISE EXCEPTION 'Cannot revert locked stage to draft';  
1. Component Lifecycle Investigation  
* Add React DevTools Profiler to trace component mounts/unmounts  
* Check if Stage1InputMode re-mounts after locking  
1. Global Auto-Save Disable  
* Temporarily hardcode autoSave \= false in useStageState hook  
* Confirm if auto-save is the source

The issue is likely a persistent auto-save mechanism or duplicate state management that's not respecting our autoSave: false setting. The backend logging will reveal exactly what's triggering the version 22 draft save

# If issue continues; sideline locking functionality until all stages implemented, probably around (or in unision with) the  Branching & Versioning implementation