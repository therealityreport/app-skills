var VintoneBinderState = (() => {
  const state = {
    status: "unknown",
    documentName: null,
    anchors: [],
    missingAnchors: [],
    lastCheckedAt: null
  };

  function setBinding(next) {
    state.status = next.status;
    state.documentName = next.documentName || null;
    state.anchors = next.anchors || [];
    state.missingAnchors = next.missingAnchors || [];
    state.lastCheckedAt = new Date().toISOString();
    return { ...state };
  }

  function getBinding() {
    return { ...state };
  }

  return {
    setBinding,
    getBinding
  };
})();
