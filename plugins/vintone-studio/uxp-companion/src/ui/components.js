var VintoneComponents = (() => {
  function text(value) {
    return document.createTextNode(value);
  }

  function clear(node) {
    while (node.firstChild) node.removeChild(node.firstChild);
  }

  function anchorItem(anchor) {
    const item = document.createElement("li");
    item.className = "anchor-item";

    const label = document.createElement("span");
    label.appendChild(text(anchor.label));

    const state = document.createElement("span");
    state.className = "anchor-state";
    state.appendChild(text(anchor.found ? "found" : anchor.required ? "missing" : "optional"));

    item.appendChild(label);
    item.appendChild(state);
    return item;
  }

  return {
    text,
    clear,
    anchorItem
  };
})();
