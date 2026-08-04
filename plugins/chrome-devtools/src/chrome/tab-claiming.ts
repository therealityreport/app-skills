import { previewTarget } from "../core/target-registry.js";
import type { TargetRef } from "../core/types.js";

export function previewClaim(target: TargetRef) {
  return previewTarget(target);
}
