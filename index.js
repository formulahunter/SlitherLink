"use strict";
import express from "express";

const app = express();
app.use(express.json());

app.use('/lib', express.static('lib'));
app.use('/src', express.static('src', { extensions: ['ts'] }));
app.use(express.static('public', { extensions: ['html'] }));
app.listen(3000, function () {
    console.log('Example app listening on port 3000');
});
