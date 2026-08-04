# Memlab

Do not read raw `.heapsnapshot` files into chat.

Use three snapshots when possible:

1. Baseline before the suspect action.
2. Target after repeated suspect actions.
3. Final after reverting the action.

Run:

```bash
npx memlab find-leaks --baseline <baseline.heapsnapshot> --target <target.heapsnapshot> --final <final.heapsnapshot>
```

For one snapshot:

```bash
npx memlab analyze snapshot --snapshot <snapshot.heapsnapshot>
```

Use memlab retainer traces to choose which code owner to inspect. Do not treat memlab output alone as the fix.
