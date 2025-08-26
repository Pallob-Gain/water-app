$(document).ready(function(){
    
});

function watchDomChanges(id, callback) {
  const targetNode = document.querySelector(id);
  if (!targetNode) return;

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === "childList" && mutation.removedNodes.length > 0) {
        callback(); // DOM replaced or updated
        break;
      }
    }
  });

  observer.observe(targetNode, {
    childList: true,
    subtree: true,
  });

  return observer;
}