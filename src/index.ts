const express = require('express');
const fs = require('fs/promises');
const path = require('path');
const app = express();


app.use(express.json());

const FILE_PATH = path.resolve('data', 'progress');
//@ts-ignore no easy way to define/declare types for req, res arguments
app.get('/progress', async (req, res) => {
    res.status(200).send(await fs.readFile(FILE_PATH, 'utf8')).end();
})
//@ts-ignore no easy way to define/declare types for req, res arguments
app.post('/progress', async (req, res) => {
    if(req.body) {
        await fs.writeFile(FILE_PATH, req.body.progress, 'utf8');
        res.status(200).end();
    }
    else {
        console.error('ignoring empty POST request to \'/progress\'');
        res.status(400).end();
    }
});

// a function to end processing and send a response
// @ts-ignore
app.use('/lib', express.static('lib'));
app.use('/src', express.static('src', {extensions: 'ts'}));
app.use(express.static('public', {extensions: 'html'}));

app.listen(3000, function() {
    console.log('Example app listening on port 3000');
});

// export function sayHelloWorld(world: string) {
//   return `Hello ${world}`;
// }
