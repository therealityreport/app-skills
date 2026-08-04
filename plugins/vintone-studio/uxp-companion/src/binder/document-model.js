var VintoneDocumentModel = (() => {
  function getPhotoshopApp() {
    if (typeof require !== "function") return null;
    try {
      return require("photoshop").app;
    } catch {
      return null;
    }
  }

  function snapshotLayer(layer) {
    const children = Array.from(layer.layers || []).map(snapshotLayer);
    return {
      id: layer.id || null,
      name: layer.name || "",
      kind: layer.kind || layer.type || "",
      locked: Boolean(layer.locked || layer.allLocked),
      layers: children
    };
  }

  function readActiveDocumentSnapshot() {
    const app = getPhotoshopApp();
    const document = app && app.activeDocument;
    if (!document) {
      return {
        status: "no-document",
        documentName: null,
        layers: []
      };
    }

    return {
      status: "document-open",
      documentName: document.title || document.name || "Untitled Photoshop document",
      layers: Array.from(document.layers || []).map(snapshotLayer)
    };
  }

  function bindActiveDocument() {
    const snapshot = readActiveDocumentSnapshot();
    if (snapshot.status !== "document-open") {
      return {
        status: "not-vintone",
        documentName: null,
        anchors: [],
        missingAnchors: ["No active Photoshop document."]
      };
    }

    const matched = VintoneLayerShape.matchAnchors(snapshot.layers);
    if (matched.missingRequired.length === 0) {
      return {
        status: "bound",
        documentName: snapshot.documentName,
        anchors: matched.anchors,
        missingAnchors: []
      };
    }

    const foundRoot = matched.anchors.some((anchor) => anchor.id === "vintone_root" && anchor.found);
    return {
      status: foundRoot ? "missing-anchors" : "not-vintone",
      documentName: snapshot.documentName,
      anchors: matched.anchors,
      missingAnchors: matched.missingRequired.map((anchor) => anchor.label)
    };
  }

  return {
    readActiveDocumentSnapshot,
    bindActiveDocument
  };
})();
