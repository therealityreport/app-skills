var VintoneLayerShape = (() => {
  const REQUIRED_ANCHORS = [
    { id: "vintone_root", label: "VINTONE root", terms: ["vintone"], required: true },
    { id: "colors_group", label: "COLORS group", terms: ["colors"], required: true },
    { id: "dither_smart_object", label: "CHOOSE DITHER PATTERN", terms: ["choose dither pattern", "dither"], required: true },
    { id: "artwork_composite", label: "ARTWORK COMPOSITE", terms: ["artwork composite"], required: true },
    { id: "composite_drop_target", label: "COMPOSITE drop target", terms: ["composite"], required: true },
    { id: "textures_group", label: "TEXTURES group", terms: ["textures"], required: false },
    { id: "processing_group", label: "PROCESSING read-only group", terms: ["processing"], required: true, readOnly: true }
  ];

  function flattenLayers(layers, out = []) {
    for (const layer of layers || []) {
      const name = String(layer.name || "");
      out.push({
        id: layer.id || null,
        name,
        lowerName: name.toLowerCase(),
        kind: layer.kind || layer.type || null,
        locked: Boolean(layer.locked || layer.allLocked)
      });
      if (layer.layers && layer.layers.length) {
        flattenLayers(layer.layers, out);
      }
    }
    return out;
  }

  function findAnchor(flatLayers, anchor) {
    return flatLayers.find((layer) =>
      anchor.terms.some((term) => layer.lowerName.includes(term))
    );
  }

  function matchAnchors(layers) {
    const flatLayers = flattenLayers(layers);
    const anchors = REQUIRED_ANCHORS.map((anchor) => {
      const match = findAnchor(flatLayers, anchor);
      return {
        id: anchor.id,
        label: anchor.label,
        required: anchor.required,
        readOnly: Boolean(anchor.readOnly),
        found: Boolean(match),
        layerId: match ? match.id : null,
        layerName: match ? match.name : null
      };
    });

    return {
      anchors,
      missingRequired: anchors.filter((anchor) => anchor.required && !anchor.found)
    };
  }

  return {
    REQUIRED_ANCHORS,
    flattenLayers,
    matchAnchors
  };
})();
