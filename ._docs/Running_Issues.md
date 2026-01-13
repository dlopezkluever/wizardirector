### Add debouncing to Auto-Save for stages 1-3

## Locking is bugging, unprecise (and idk, kinda stupid)
#### -- If locking issue continues; sideline locking functionality until all stages implemented, probably around (or in unision with) the  Branching & Versioning implementation

(example HTTP response of error: see "locking_error_console_log_2.md"
{
    "error": "Cannot lock stage 2. Stage 1 must be locked first.",
    "details": {
        "requiredStage": 1,
        "requiredStatus": "locked",
        "currentStatus": "draft"
    }
}
)

## Update Sidebar to reflect Style Capsules

### Stage 4 needs to auto generate IF never have been generated before.
### Obviously plenty of UI Issues with Phase A, particularily regarding the regeneration box for Stage 4, and the stage pipeline graphic (sometimes they're green, other times yellow, despite being complete; not clear whats going on there)

### Add ability to delete projects

### have ability to put projects into folder in dashboard

### have ability export individual writing assets (Treatment; Beat Sheet: Script)

### Have ability to customize system prompts?

### Consider having, apon opening old project, it opening to it's latest stage reached (so where you left off) not the one exactly after that

### On dashboard view of projects: Include the stage the project is at on the card & for phase B show what Scene number along with stage (i.e. Scene 3, Stage 8)

### 4.3 Stage 5 Assets Persistence
Update src/components/pipeline/Stage5Assets.tsx:
Replace mock data with real state management using the useStageState hook.
Implement the "Lock Assets" button to call lockStage(projectId, 5) and then navigate to Stage 6.

