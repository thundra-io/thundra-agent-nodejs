const net = require('net');
const WebSocket = require('ws');

const log = (...params) => {
    const LOGS_ENABLED = 'true';
    if (LOGS_ENABLED === 'true') {
        console.log(...params);
    }
};

// Setup IDE socket
const ideSocket = net.createServer((ideConnection) => {
    const connPort = ideConnection.remotePort;
    const brokerSocket = new WebSocket(
        `ws://localhost:5555`,
        {
            headers: {
                'x-thundra-auth-token': 'thundra',
                'x-thundra-session-name': 'test',
                'x-thundra-protocol-version': '1.0',
            },
        },
    );
    brokerSocket.on('open', () => {
        log('brokerSocket: connection established with the Thundra broker');
        ideConnection.on('data', (data) => {
            brokerSocket.send(data);
        });
    });
    brokerSocket.on('message', (data) => {
        ideConnection.write(data);
    });
    brokerSocket.on('close', (code, reason) => {
        log(`brokerSocket: disconnected from the the Thundra broker, code: ${code}, reason: ${reason}`);
        ideConnection.end();
    });
    brokerSocket.on('error', (err) => {
        log('brokerSocket:' + err);
    });
    ideConnection.on('end', () => {
        log(`ideConnection(${connPort}): disconnected from the IDE Debugger`);
        brokerSocket.close();
    });
    ideConnection.on('error', (err) => {
        log(`ideConnection(${connPort}):` + err);
    });
}).listen(7777);