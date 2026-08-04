import test from "node:test";
import assert from "node:assert/strict";
import {
  createEditPacket,
  EDIT_PACKET_VERSION,
  TYPED_ACTION_SCHEMAS,
  validateEditPacket
} from "../src/edit-packet.mjs";
import { validateSafetyMetadata } from "../src/safety-policy.mjs";

test("creates versioned, safety-flagged mutating edit packets", () => {
  const packet = createEditPacket({
    intent: "Change the dither pattern and recolor the red swatch",
    targetFilePath: "/licensed/VINTONE SAMPLE FILE.psb",
    workingCopyPath: "/work/VINTONE SAMPLE FILE - copy.psb",
    mode: "computer-use"
  });
  const validation = validateEditPacket(packet);

  assert.equal(packet.version, EDIT_PACKET_VERSION);
  assert.equal(packet.mutating, true);
  assert.equal(packet.safety.copyFirst, true);
  assert.equal(packet.safety.targetFilePath, "/licensed/VINTONE SAMPLE FILE.psb");
  assert.equal(packet.safety.workingCopyPath, "/work/VINTONE SAMPLE FILE - copy.psb");
  assert.ok(packet.actions.some((action) => action.type === "change_dither_pattern"));
  assert.ok(packet.actions.some((action) => action.type === "recolor_slot"));
  assert.ok(packet.actions.every((action) => action.category));
  assert.ok(packet.actions.some((action) => action.targetAnchor === "dither_smart_object"));
  assert.equal(validation.ok, true, validation.errors.join("\n"));
});

test("typed edit actions cover dither, color, texture, and output workflows", () => {
  for (const type of [
    "change_dither_pattern",
    "recolor_slot",
    "toggle_texture",
    "export_preview",
    "export_separations",
    "create_mockup"
  ]) {
    assert.ok(TYPED_ACTION_SCHEMAS[type], `missing schema for ${type}`);
    assert.ok(TYPED_ACTION_SCHEMAS[type].category);
    assert.ok(TYPED_ACTION_SCHEMAS[type].runbookHint);
  }

  const packet = createEditPacket({
    intent: "place art, change dither, recolor, toggle texture, export separations, create mockup",
    targetFilePath: "/licensed/VINTONE SAMPLE FILE.psb",
    workingCopyPath: "/work/VINTONE SAMPLE FILE - copy.psb"
  });

  assert.ok(packet.actions.some((action) => action.type === "place_artwork"));
  assert.ok(packet.actions.some((action) => action.type === "change_dither_pattern"));
  assert.ok(packet.actions.some((action) => action.type === "recolor_slot"));
  assert.ok(packet.actions.some((action) => action.type === "toggle_texture"));
  assert.ok(packet.actions.some((action) => action.type === "export_separations"));
  assert.ok(packet.actions.some((action) => action.type === "create_mockup"));
});

test("validation fails when a mutating packet lacks required safety metadata", () => {
  const unsafePacket = {
    version: EDIT_PACKET_VERSION,
    mutating: true,
    actions: [{ type: "recolor_slot", mutates: true }]
  };
  const validation = validateEditPacket(unsafePacket);

  assert.equal(validation.ok, false);
  assert.match(validation.errors.join("\n"), /safety metadata/i);
});

test("safety policy includes stop, proof, rollback, and risky-action notes", () => {
  const packet = createEditPacket({
    intent: "Export separations",
    actions: [
      { type: "export_separations", label: "Export separations", mutates: true },
      { type: "save_over_original", label: "Save over original", risky: true, mutates: true }
    ]
  });
  const safety = validateSafetyMetadata(packet);

  assert.equal(safety.ok, true, safety.errors.join("\n"));
  assert.ok(packet.safety.stopConditions.length > 0);
  assert.ok(packet.safety.proofExpectations.length > 0);
  assert.ok(packet.safety.rollback.length > 0);
  assert.ok(
    packet.safety.riskyActionConfirmationNotes.some((note) =>
      note.includes("Explicit confirmation required")
    )
  );
});
