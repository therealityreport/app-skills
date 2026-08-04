import assert from "node:assert/strict";
import test from "node:test";

import { createComputerRunbook } from "../src/computer-runbook.mjs";
import { executeComputerUse } from "../src/executors/computer-use.mjs";
import { executeManual } from "../src/executors/manual.mjs";
import { createUxpHandoff } from "../src/executors/uxp-handoff.mjs";

const completePacket = {
  id: "packet-smoke-001",
  title: "VINTONE reversible smoke edit",
  summary: "Toggle one texture and prepare one color mask on a copy.",
  target: {
    sourceFilePath: "/licensed/VINTONE.psb",
    workingCopyPath: "/tmp/VINTONE-working-copy.psb",
    confirmedWorkingCopy: true,
  },
  setupFacts: {
    computerUseAvailable: true,
    photoshopVersion: "Photoshop 2026",
    os: "macOS",
    firstReversibleSmokeEdit: "toggle one disposable texture layer",
  },
  actions: [
    { title: "toggle texture", description: "Toggle the disposable texture layer visibility." },
    { title: "select mask", description: "Select the red ink color mask and arm the brush." },
    { title: "export preview", description: "Export a proof preview if no prompts appear." },
  ],
};

test("creates an ordered Computer Use runbook with proof and rollback", () => {
  const runbook = createComputerRunbook(completePacket);

  assert.equal(runbook.kind, "vintone-computer-use-runbook");
  assert.equal(runbook.status, "ready");
  assert.equal(runbook.applied, false);
  assert.equal(runbook.startState.application, "Adobe Photoshop");
  assert.equal(runbook.startState.originalMustRemainUntouched, true);
  assert.equal(runbook.steps.length, 6);
  assert.deepEqual(
    runbook.steps.map((step) => step.order),
    [1, 2, 3, 4, 5, 6]
  );
  assert.ok(runbook.steps.some((step) => step.title === "Save working copy"));
  assert.ok(runbook.steps.some((step) => step.title === "Toggle one texture"));
  assert.ok(runbook.steps.every((step) => step.uiActions.every((action) => /^\d+\. /.test(action))));
  assert.ok(runbook.stopAndAsk.some((condition) => condition.includes("overwrite")));
  assert.ok(runbook.expectedVisibleProof.some((proof) => proof.includes("confirmed working copy")));
  assert.ok(runbook.rollback.neverDo.some((item) => item.includes("licensed source file")));
  assert.equal(runbook.finalProofPacket.originalUntouchedRequired, true);
  assert.ok(runbook.finalProofPacket.requiredEvidence.includes("before screenshot"));
  assert.ok(runbook.finalProofPacket.requiredEvidence.includes("after screenshot"));
});

test("blocks live runbooks when setup facts are missing", () => {
  const runbook = createComputerRunbook(
    {
      id: "packet-missing-facts",
      target: {
        sourceFilePath: "/licensed/VINTONE.psb",
        workingCopyPath: "/tmp/VINTONE-working-copy.psb",
        confirmedWorkingCopy: true,
      },
    },
    { live: true }
  );

  assert.equal(runbook.status, "blocked");
  assert.equal(runbook.liveRequested, true);
  assert.equal(runbook.liveAllowed, false);
  assert.ok(runbook.missingSetupFacts.includes("computerUseAvailable"));
  assert.ok(runbook.missingSetupFacts.includes("photoshopVersion"));
  assert.ok(runbook.blockedReasons.some((reason) => reason.includes("Missing setup fact")));
});

test("blocks live runbooks unless the active target is a confirmed copy", () => {
  const runbook = createComputerRunbook(
    {
      ...completePacket,
      target: {
        sourceFilePath: "/licensed/VINTONE.psb",
        workingCopyPath: "/licensed/VINTONE.psb",
        confirmedWorkingCopy: false,
      },
    },
    { live: true }
  );

  assert.equal(runbook.status, "blocked");
  assert.equal(runbook.liveAllowed, false);
  assert.ok(runbook.blockedReasons.includes("Working copy has not been confirmed."));
  assert.ok(runbook.blockedReasons.includes("Working copy path matches the licensed source file path."));
});

test("allows live runbook only after setup and working-copy gates pass", () => {
  const runbook = createComputerRunbook(completePacket, { live: true });

  assert.equal(runbook.status, "ready");
  assert.equal(runbook.liveAllowed, true);
  assert.equal(runbook.startState.sourceFilePath, "/licensed/VINTONE.psb");
  assert.equal(runbook.startState.workingCopyPath, "/tmp/VINTONE-working-copy.psb");
  assert.ok(runbook.steps.some((step) => step.liveStepStatus === "requires-live-gates"));
});

test("computer-use executor returns a handoff contract and does not automate Photoshop", () => {
  const result = executeComputerUse(completePacket, { live: true });

  assert.equal(result.executor, "computer-use");
  assert.equal(result.status, "ready");
  assert.equal(result.applied, false);
  assert.equal(result.automatedPhotoshop, false);
  assert.ok(result.runtimeCapabilityRequirements.some((item) => item.includes("Computer Use")));
  assert.ok(result.proofRequirements.includes("working-copy path"));
  assert.equal(result.runbook.liveAllowed, true);
});

test("manual executor returns instructions only", () => {
  const result = executeManual(completePacket);

  assert.equal(result.executor, "manual");
  assert.equal(result.status, "instructions-only");
  assert.equal(result.applied, false);
  assert.equal(result.mutates, false);
  assert.ok(result.instructions.some((instruction) => instruction.includes("Save or duplicate")));
});

test("uxp handoff produces a non-mutating packet for an optional later companion", () => {
  const result = createUxpHandoff(completePacket);

  assert.equal(result.executor, "uxp-handoff");
  assert.equal(result.status, "handoff-only");
  assert.equal(result.applied, false);
  assert.equal(result.mutationAllowed, false);
  assert.equal(result.handoff.packetType, "vintone-uxp-readonly-companion-handoff");
  assert.ok(result.handoff.prohibitedBehavior.includes("saving files"));
  assert.equal(result.handoff.packet.summary, completePacket.summary);
});
