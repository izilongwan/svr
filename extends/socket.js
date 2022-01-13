const Ws = require('ws')

/**
 * open
 * error
 * close
 * connection -> (ws) => {ws.on('message', (msg) => ws.send(msg)))}
 */
 const socket =  new Ws.Server({ port: 3003 })

socket
  .on('open', e => {
    console.log('open');
  })
  .on('connection', ws => {
    ws.on('message', msg => {
      setTimeout(() => {
        // socket.clients 保存所有连接到该PORT端口的客户端
        msg = JSON.parse(msg); // 解析JSON字符串
        ws.send(JSON.stringify(msg)); // 发送JSON字符串

      }, 1000)
    })

    console.log('connection');
  })
  .on('error', e => {
    console.log('error');
  })
  .on('close', e => {
    console.log('close');
  })
