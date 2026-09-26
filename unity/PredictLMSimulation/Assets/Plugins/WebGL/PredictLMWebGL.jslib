mergeInto(LibraryManager.library, {
  PredictLMInstallParentBridge: function () {
    if (window.__predictlmBridgeInstalled) return;
    window.__predictlmBridgeInstalled = true;

    window.addEventListener('message', function (event) {
      var message = event && event.data;
      if (!message || typeof message !== 'object' || typeof SendMessage !== 'function') return;

      try {
        if (message.type === 'predictlm:scene' && message.scene) {
          SendMessage('PredictLMBridge', 'ReceiveSceneJson', JSON.stringify(message.scene));
        } else if (message.type === 'predictlm:command') {
          SendMessage('PredictLMBridge', 'ReceiveCommandJson', JSON.stringify(message));
        } else if (message.type === 'predictlm:reset') {
          SendMessage('PredictLMBridge', 'ReceiveCommandJson', JSON.stringify({type:'reset'}));
        }
      } catch (err) {
        console.warn('[PredictLM Unity Bridge]', err);
      }
    });
  }
});
