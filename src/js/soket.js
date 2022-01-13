;((WebSocket, win) => {
  const init = () => {
    const ws = new WebSocket('ws://localhost:3003');

    bindEvent(ws);
    win.ws = ws; // onopen/onmessage/onerror/send/onclose
  }

  function bindEvent(ws) {
    ws.onmessage = wsOnMessage;
    ws.onopen = wsOnOpen;
  }

  function wsOnOpen(e) {
    console.log('🚀 ~ file: index.js ~ line 8 ~ wsOnOpen ~ e', e)
    const data = {
      msg: 'hi'
    }
    this.send(JSON.stringify(data));
  }

  function wsOnMessage(e) {
    console.log('🚀 ~ file: index.js ~ line 13 ~ wsOnMessage ~ e', e.data);
  }

  init();
})(WebSocket, window);
