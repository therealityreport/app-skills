var VintoneBindStatus = (() => {
  function statusText(binding) {
    if (binding.status === "bound") {
      return `Bound to ${binding.documentName}. Read-only anchors are recognized.`;
    }
    if (binding.status === "missing-anchors") {
      return `VINTONE-like document, but missing: ${binding.missingAnchors.join(", ")}.`;
    }
    if (binding.status === "not-vintone") {
      return binding.documentName
        ? `${binding.documentName} does not look like a VINTONE document.`
        : "No active VINTONE document detected.";
    }
    return "Waiting for Photoshop document...";
  }

  function render(binding) {
    const status = document.getElementById("bind-status");
    const list = document.getElementById("anchor-list");
    if (!status || !list) return;

    status.className = `status status-${binding.status || "unknown"}`;
    VintoneComponents.clear(status);
    status.appendChild(VintoneComponents.text(statusText(binding)));

    VintoneComponents.clear(list);
    for (const anchor of binding.anchors || []) {
      list.appendChild(VintoneComponents.anchorItem(anchor));
    }
  }

  return {
    render
  };
})();
