/**
 * Connects Node.js {@code Inspector} at application side here and
 * Debugger at user/developer side over Thundra Debug Broker.
 */

const net = require('net');
const WebSocket = require('ws');
const { DEBUGGER_PORT, BROKER_HOST, BROKER_PORT,
    LOGS_ENABLED, AUTH_TOKEN, SESSION_NAME, SESSION_TIMEOUT, BROKER_PROTOCOL } = process.env;

const CLOSING_CODES: {[key: string]: number} = {
    NORMAL: 1000,
    TIMEOUT: 4000,
};

const RUNTIME = 'node';
const PROTOCOL_VERSION = '1.0';

const log = (...params: any[]) => {
    if (LOGS_ENABLED === 'true') {
        console.log(...params);
    }
};

const debuggerSocket = new net.Socket();
const brokerSocket = new WebSocket(
    `${BROKER_PROTOCOL}${BROKER_HOST}:${BROKER_PORT}`,
    {
        headers: {
            'x-thundra-auth-token': AUTH_TOKEN,
            'x-thundra-session-name': SESSION_NAME,
            'x-thundra-protocol-version': PROTOCOL_VERSION,
            'x-thundra-session-timeout': SESSION_TIMEOUT,
            'x-thundra-runtime': RUNTIME,
        },
    },
);

// Setup debugger socket
debuggerSocket.on('data', (data: Buffer) => {
    brokerSocket.send(data);
});
debuggerSocket.on('end', () => {
    log('debuggerSocket: disconnected from the main process');
    if (brokerSocket.readyState === WebSocket.OPEN) {
        brokerSocket.close(CLOSING_CODES.NORMAL, 'Normal');
    }
});
debuggerSocket.on('error', (err: Error) => {
    log('debuggerSocket:', err.message);
});

// Setup broker socket
let firstMessage = true;
let brokerHSSuccess = false;
const sendToDebugger = (data: Buffer) => {
    if (debuggerSocket.writable) {
        debuggerSocket.write(data);
    } else {
        setTimeout(() => sendToDebugger(data), 0);
    }
};

brokerSocket.on('message', (data: Buffer) => {
    if (firstMessage) {
        firstMessage = false;
        process.send('brokerConnect');
        debuggerSocket.connect({ port: DEBUGGER_PORT }, () => {
            log('debuggerSocket: connection established with main process');
        });
    }

    sendToDebugger(data);
});
brokerSocket.on('open', () => {
    brokerHSSuccess = true;
    log('brokerSocket: connection established with the Thundra broker');
});
brokerSocket.on('close', (code: Number, reason: string) => {
    log(`brokerSocket: disconnected from the the Thundra broker, code: ${code}, reason: ${reason}`);
    if (!debuggerSocket.destroyed) {
        debuggerSocket.end();
    }
});
brokerSocket.on('error', (err: Error) => {
    if (!brokerHSSuccess) {
        // Error occured before handshake, main process should know it
        process.send(err.message);
    }
    log('brokerSocket:', err.message);
});

process.on('SIGTERM', () => {
    if (brokerSocket.readyState === WebSocket.OPEN) {
        brokerSocket.close(CLOSING_CODES.NORMAL, 'Normal');
    }
    if (!debuggerSocket.destroyed) {
        debuggerSocket.end();
    }
});

process.on('SIGHUP', () => {
    if (brokerSocket.readyState === WebSocket.OPEN) {
        brokerSocket.close(CLOSING_CODES.TIMEOUT, 'SessionTimeout');
    }
    if (!debuggerSocket.destroyed) {
        debuggerSocket.end();
    }
});
