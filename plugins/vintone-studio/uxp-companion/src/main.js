function refreshVintoneBinding() {
  const binding = VintoneDocumentModel.bindActiveDocument();
  VintoneBinderState.setBinding(binding);
  VintoneBindStatus.render(binding);
}

function startVintoneBinder() {
  const refresh = document.getElementById("refresh");
  if (refresh) {
    refresh.addEventListener("click", refreshVintoneBinding);
  }
  refreshVintoneBinding();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", startVintoneBinder);
} else {
  startVintoneBinder();
}
