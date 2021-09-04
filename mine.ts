import axios from "axios";
import { httpPort } from './src/index';

axios
    .post(`http://localhost:${process.env.HTTP_PORT || 3000}/mine-block`, {
        "data": process.argv.slice(2).toString()
    })
    .then(res => {
        console.info(`status: ${res.status}`);
        // console.log(res);
    })
    .catch(e => {
        console.error(e);
    })