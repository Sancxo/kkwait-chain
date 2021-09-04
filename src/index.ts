import express, { Express, Request, Response } from 'express';
import { Block, getBlockChain, createBlocks } from './chain';
import { getSockets, connectToPeers, initP2PServer } from "./p2p";

const httpPort: number = +process.env.HTTP_PORT || 3000;
const p2pPort: number = +process.env.P2P_PORT || 6000;

const initHTTPServer = (port: number): void => {
    const app: Express = express();
    app.use(express.json());

    app.get('/blocks', (req: Request, res: Response) => {
        res.send(getBlockChain());
    });

    app.post('/mine-block', (req: Request, res: Response) => {
        const newBlock: Block = createBlocks(req.body.data);
        res.send(newBlock);
    })

    app.get('/peers', (req: Request, res: Response) => {
        res.send(getSockets().map((s: any) => s._socket.remoteAddress + ': ' + s._socket.remotePort));
    })

    app.post('/add-peer', (req: Request, res: Response) => {
        connectToPeers(req.body.peer);
        res.send();
    })

    app.listen(port, () => console.info(`Listening on port ${port}.`))
}

initHTTPServer(httpPort);
initP2PServer(p2pPort);

export { httpPort };