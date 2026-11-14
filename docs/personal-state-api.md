# Personal state API

`src/personal-state.ts` owns a separate `musclemap-personal-v1` payload. It never changes the v2 store schema or treats local profile selection as authentication.

- `readPersonalState(storage, legacy)` reads and validates the personal payload. Missing data produces a personal default plus the fictional demonstration profile/task; legacy observations and follow-ups are projected into additional profiles/tasks without writing either key. Corrupt or unknown payloads return a safe default and an error while leaving the raw payload untouched.
- `savePersonalState(state, storage)` validates a complete `PersonalState` before writing. It refuses malformed existing personal payloads and surfaces read/write errors.
- `commitStores(legacy, state, storage)` validates both stores, snapshots both raw keys, writes both, and restores the exact snapshots if either write fails. It refuses to replace an existing malformed/unknown payload.
- Personal profiles are scoped by exact `mode`, `participant`, and `namespace`. `profileRows` applies that scope without mutating research observations. `researchProfile` is a read-only CFT70 context.
- Legacy follow-ups become pending tasks with no due date; legacy incidents remain exclusively in the v2 store.
- `completeAssessment` only completes an owned assessment when the observation has an exact profile/region/measurement/method/protocol match, a valid numeric value, and a valid acquisition date. Missing, incompatible, future personal, pre-profile, or otherwise invalid observations are rejected. Simulated dates are allowed explicitly.
- `parsePlan` accepts atomic JSON plans with user-supplied due dates for assessment tasks. It rejects invalid/duplicate tasks and unsafe source URLs and does not add medical intervals or dose instructions.

The module exports `validatePersonalState` for backup/restore callers. Validation is structural, strict about supported fields, and uses the existing canonical observation validator.
