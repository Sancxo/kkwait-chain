import { broadcastLatest } from "./p2p";
import CryptoJS from 'crypto-js';

class Block {
    public index: number;
    public hash: string;
    public previousHash: string;
    public timestamp: number;
    public data: string;

    constructor(index: number, hash: string, previousHash: string, timestamp: number, data: string) {
      this.index = index;
      this.hash = hash;
      this.previousHash = previousHash;
      this.timestamp = timestamp;
      this.data = data;  
    }
}

const firstBlock: Block = new Block(1, '0', null, 0, 'First Block');

let blockchain: Block[] = [firstBlock];

const getBlockChain = (): Block[] => blockchain;

const getLatestBlock = (): Block => blockchain[blockchain.length - 1];

const createHash = (index: number, previousHash: string, timestamp: number, data: string): string => {
    return CryptoJS.SHA256(index + previousHash + timestamp + data).toString();
}

const checkHash = (block: Block): string => {
    return createHash(block.index, block.previousHash, block.timestamp, block.data);
}

const isStructureValid = (block: Block): boolean => {
    return typeof block.index === 'number'
        && typeof block.hash === 'string'
        && typeof block.previousHash === 'string'
        && typeof block.timestamp === 'number'
        && typeof block.data === 'string';
}

const addBlock = (newBlock: Block): void => {
    if (isBlockValid(newBlock, getLatestBlock())) blockchain.push(newBlock);
}

const createBlocks = (data: string): Block => {
    const lastBlock: Block = getLatestBlock();
    const newIndex: number = lastBlock.index + 1;
    const newTimestamp: number = new Date().getTime() / 1000;
    const newHash: string = createHash(newIndex, lastBlock.hash, newTimestamp, data);
    const newBlock: Block = new Block(newIndex, newHash, lastBlock.hash, newTimestamp, data);
    
    addBlock(newBlock);
    broadcastLatest();

    return newBlock;
}

const isBlockValid = (newBlock: Block, lastBlock: Block): boolean => {
    if (!isStructureValid(newBlock)) {
        console.error('Invalid Block Structure !')
        return false;
    };

    if (lastBlock.index + 1 !== newBlock.index) {
        console.error('Invalid Index !');
        return false;
    } else if (lastBlock.hash !== newBlock.previousHash) {
        console.error('Previous hash is not valid !');
        return false;
    } else if (checkHash(newBlock) !== newBlock.hash) {
        console.error(`Invalid Hash: ${checkHash(newBlock)} / ${newBlock.hash}`);
        return false;
    };

    return true;
}

const isChainValid = (candidateChain: Block[]): boolean => {
    const isFirstBlockValid = (block: Block): boolean =>  {
        return JSON.stringify(block) === JSON.stringify(firstBlock);
    }

    if (!isFirstBlockValid(candidateChain[0])) {
        return false;
    }

    for (let i = 1; i < candidateChain.length; i++) {
        if (!isBlockValid(candidateChain[i], candidateChain[i - 1])) {
            return false;
        }
    }

    return true;
}

const addBlockToChain = (newBlock: Block): boolean => {
    if (isBlockValid(newBlock, getLatestBlock())) {
        blockchain.push(newBlock);
        return true;
    }
    return false;
}

const resolveChain = (newBlocks: Block[]): void => {
    if (isChainValid(newBlocks) && newBlocks.length > getBlockChain().length) {
        console.info('Received valid blockchain. Replacing current blockchain /w received blockchain.');
        blockchain = newBlocks;
        broadcastLatest();
    } else {
        console.error('Received invalid blockchain.')
    }
}

export { Block, getBlockChain, createBlocks, getLatestBlock, isStructureValid, resolveChain, addBlockToChain };