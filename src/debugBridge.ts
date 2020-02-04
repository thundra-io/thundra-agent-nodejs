const net = require('net');
const WebSocket = require('ws');

const { DEBUGGER_PORT, BROKER_HOST, BROKER_PORT, LOGS_ENABLED, AUTH_TOKEN, SESSION_NAME } = process.env;
const debuggerSocket = new net.Socket();
const brokerSocket = new WebSocket(
    `ws://${BROKER_HOST}:${BROKER_PORT}`,
    {
        headers: {
            'x-thundra-auth-token': AUTH_TOKEN,
            'x-thundra-session-name': SESSION_NAME,
            'x-thundra-protocol-version': '1.0',
        },
    },
);

const shutdownSockets = () => {
    log('debugBridge: shutting down the sockets');
    debuggerSocket.end();
    brokerSocket.close();
};

const log = (...params: any[]) => {
    if (LOGS_ENABLED === 'true') {
        console.log(...params);
    }
};

// Setup debugger socket
debuggerSocket.connect({ port: DEBUGGER_PORT });
debuggerSocket.on('data', (data: any) => {
    brokerSocket.send(data);
});
debuggerSocket.on('connect', () => {
    log('debuggerSocket: connection established with main lambda process');
});
debuggerSocket.on('end', () => {
    log('debuggerSocket: disconnected from the main lambda process');
    brokerSocket.close();
});
debuggerSocket.on('error', (err: any) => {
    log('debuggerSocket:' + err);
});

// Setup broker socket
brokerSocket.on('open', () => {
    log('brokerSocket: connection established with the Thundra broker');
});
brokerSocket.on('message', (data: any) => {
    debuggerSocket.write(data);
});
brokerSocket.on('close', (code: Number, reason: string) => {
    log(`brokerSocket: disconnected from the the Thundra broker, code: ${code}, reason: ${reason}`);
    debuggerSocket.end();
});
brokerSocket.on('error', (err: any) => {
    log('brokerSocket:' + err);
});

process.on('SIGTERM', () => {
    shutdownSockets();
    process.exit(0);
});
