const { Server } = require('ssh2');
const httpProxy = require('http-proxy');
const net = require('net');

// SSH Server Configuration
const sshServer = new Server({
  hostKeys: [require('fs').readFileSync('ssh.key')]
}, (client) => {
  console.log('Client connected!');

  client.on('authentication', (ctx) => {
    if (ctx.username === 'user' && ctx.password === 'password') {
      ctx.accept();
    } else {
      ctx.reject();
    }
  }).on('ready', () => {
    console.log('Client authenticated!');

    client.on('session', (accept) => {
      const session = accept();
      session.once('exec', (accept, reject, info) => {
        console.log(`Client wants to execute: ${info.command}`);
        const stream = accept();
        stream.exit(0);
        stream.end();
      });
    });
  }).on('end', () => {
    console.log('Client disconnected');
  });
});

// Start SSH Server
sshServer.listen(2222, '0.0.0.0', () => {
  console.log('SSH Server running on port 2222');
});

// HTTP Proxy Configuration
const proxy = httpProxy.createProxyServer({});

const server = net.createServer((socket) => {
  socket.on('data', (chunk) => {
    const data = chunk.toString();

    if (data.includes('CONNECT')) {
      const parts = data.split(' ');
      const targetHostPort = parts[1].split(':');
      const targetHost = targetHostPort[0];
      const targetPort = targetHostPort[1] || 80;

      const proxySocket = net.createConnection(targetPort, targetHost, () => {
        socket.write('HTTP/1.1 200 Connection Established\r\n\r\n');
        proxySocket.pipe(socket);
        socket.pipe(proxySocket);
      });

      proxySocket.on('error', (err) => {
        console.error('Proxy Socket Error:', err);
        socket.end();
      });
    }
  });
});

// Start HTTP Proxy
server.listen(8080, () => {
  console.log('HTTP Proxy running on port 8080');
});
