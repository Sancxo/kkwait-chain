import WebSocket from 'ws';
import { Server } from "ws";
import { addBlockToChain, Block, getBlockChain, getLatestBlock, isStructureValid, resolveChain } from "./chain";

const sockets: WebSocket[] = [];
const getSockets = () => sockets;

enum MessageType {
    QUERY_LATEST = 0,
    QUERY_ALL = 1,
    RESPONSE_BLOCKCHAIN = 2
}

class Message {
    public type: MessageType;
    public data: any;
}

const JSONToObject = <T>(data: string): T => {
    try {
        return JSON.parse(data);
    } catch (e) {
        console.error(e);
        return null;
    }
}

const write = (ws: WebSocket, message: Message): void => ws.send(JSON.stringify(message));
const broadcast = (message: Message): void => sockets.forEach(socket => write(socket, message));

const queryChainLengthMsg = (): Message => ({ type: MessageType.QUERY_LATEST, data: null });
const queryAllMsg = (): Message => ({ type: MessageType.QUERY_ALL, data: null });

const responseChainMsg = (): Message => ({ type: MessageType.RESPONSE_BLOCKCHAIN, data: JSON.stringify(getBlockChain()) });
const responseLatestMsg = (): Message => ({ type: MessageType.RESPONSE_BLOCKCHAIN, data: JSON.stringify(getLatestBlock()) });

const handleBlockchainResp = (receivedBlocks: Block[]): void => {
    if (receivedBlocks.length === 0) {
        console.error('Received blockchain of size 0.');
        return;
    }

    const latestBlockReceived: Block = receivedBlocks[--receivedBlocks.length];
    if (!isStructureValid(latestBlockReceived)) {
        console.error('Structure of the latest block is not valid.');
        return;
    }

    const latestBlockHeld: Block = getLatestBlock();
    if (latestBlockReceived.index > latestBlockHeld.index) {
        console.warn(`Blockchain is possibly behind. We got ${latestBlockHeld.index} and Peer got ${latestBlockReceived.index}.`);
        if (latestBlockHeld.hash === latestBlockReceived.previousHash) {
            if (addBlockToChain(latestBlockReceived)) broadcast(responseLatestMsg());
        } else if (receivedBlocks.length === 1) {
            console.info('We have to query the chain from our peer.');
            broadcast(queryAllMsg());
        } else {
            console.warn('Received blockchain is longer than current blockchain. Replacing chain ...');
            resolveChain(receivedBlocks);
        }
    } else console.info('Received blockchain is not longer than current blockchain. Do  nothing.');
}

const initMessageHandler = (ws: WebSocket): void => {
    ws.on('message', (data: string) => {
        const message: Message = JSONToObject<Message>(data);
        if (message === null) {
            console.warn(`Could'nt parse received JSON message ${data}.`);
            return;
        }
        console.info(`Received message : ${JSON.stringify(message)}`);
        switch (message.type) {
            case MessageType.QUERY_LATEST:
                write(ws, responseLatestMsg());
                break;
            case MessageType.QUERY_ALL:
                write(ws, responseChainMsg());
                break;
            case MessageType.RESPONSE_BLOCKCHAIN:
                const receivedBlocks: Block[] = JSONToObject<Block[]>(message.data);
                if (receivedBlocks === null) {
                    console.warn(`Invalid Blocks received: ${message.data}.`);
                    break;
                }
                handleBlockchainResp(receivedBlocks);
                break;
        }
    })
}

const initErrorHandler = (ws: WebSocket): void => {
    const closeConnection = (myWs: WebSocket) => {
        console.warn(`Connection failed to peer: ${myWs.url}.`);
        sockets.splice(sockets.indexOf(myWs, 1));
    }
    ws.on('close', () => closeConnection(ws));
    ws.on('error', () => closeConnection(ws));
}

const initConnection = (ws: WebSocket): void => {
    sockets.push(ws);
    initMessageHandler(ws);
    initErrorHandler(ws);
    write(ws, queryChainLengthMsg());
}

const initP2PServer = (p2pPort: number): void => {
    const server: Server = new WebSocket.Server({ port: p2pPort });
    server.on('connection', (ws: WebSocket) => {
        initConnection(ws);
    });
    console.info(`Listening websocket p2p port on ${p2pPort}.`)
}

const broadcastLatest = (): void => broadcast(responseLatestMsg());

const connectToPeers = (newPeer: string): void => {
    const ws: WebSocket = new WebSocket(newPeer);
    ws.on('open', () => initConnection(ws));
    ws.on('error', () => console.error('Connection failed !'));
}

export {getSockets, initP2PServer, broadcastLatest, connectToPeers}