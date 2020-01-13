const express = require('express');
const app = express();

// a function to end processing and send a response
// @ts-ignore
// app.use(express.static('lib'));
app.use('/lib', express.static('lib'));
app.use(express.static('public', {extensions: 'html'}));

app.listen(3000, function() {
    console.log('Example app listening on port 3000');
});

// export function sayHelloWorld(world: string) {
//   return `Hello ${world}`;
// }
