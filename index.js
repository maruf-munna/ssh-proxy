const { Server } = require('ssh2');
const { generateKeyPairSync } = require('crypto');
const fs = require('fs');
const path = require('path');

// Generate SSH key pair
const keyDir = path.join(__dirname, 'keys');
const privateKeyPath = path.join(keyDir, 'ssh_host_rsa_key');
const publicKeyPath = path.join(keyDir, 'ssh_host_rsa_key.pub');

if (!fs.existsSync(keyDir)) {
    fs.mkdirSync(keyDir);
}

if (!fs.existsSync(privateKeyPath) || !fs.existsSync(publicKeyPath)) {
    console.log('Generating SSH key pair...');
    const { privateKey, publicKey } = generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs1', format: 'pem' }
    });

    fs.writeFileSync(privateKeyPath, privateKey);
    fs.writeFileSync(publicKeyPath, publicKey);
    console.log('SSH keys generated successfully.');
}

// Read private key for SSH server
const privateKey = fs.readFileSync(privateKeyPath);

// Start SSH server
const server = new Server({
    hostKeys: [privateKey]
}, (client) => {
    console.log('Client connected!');

    client.on('authentication', (ctx) => {
        if (ctx.method === 'password' && ctx.username === 'admin' && ctx.password === 'password') {
            ctx.accept();
        } else {
            ctx.reject();
        }
    });

    client.on('ready', () => {
        console.log('Client authenticated!');
        
        client.on('session', (accept, reject) => {
            const session = accept();
            
            session.on('pty', (accept, reject, info) => {
                accept && accept();
            });

            session.on('shell', (accept, reject) => {
                const stream = accept();
                stream.write('Welcome to the Node.js SSH server!\n');
                stream.on('data', (data) => {
                    console.log('Client input:', data.toString());
                    stream.write('You said: ' + data);
                });
                stream.on('close', () => {
                    console.log('Client disconnected');
                });
            });
        });
    });

    client.on('end', () => {
        console.log('Client disconnected.');
    });
});

server.listen(2222, '0.0.0.0', () => {
    console.log('SSH Server running on port 2222');
});
