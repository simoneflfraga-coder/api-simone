const express = require('express');
// const path = require('path');

const connection = require('../Database/connection');

const Router = express.Router();

Router.get('/getItems', async (req, res) => {

    const items = await connection.customersConnection.find({})

    res.json(items);
});

Router.post('/saveItems', async (req, res) => {
    
    const info1 = req.body.info1;
    const info2 = req.body.info2;
    
    await connection.produtosConnection.create({produto: info1, quantidade: info2});

    res.sendStatus(200);
});

Router.post('/deleteItems', async (req, res) => {
    
    const info1 = req.body.info1;
    const info2 = req.body.info2;
    
    await connection.produtosConnection.deleteOne({produto: info1, quantidade: info2})
    // connection.produtosConnection.deleteMany()  <---- Vários

    res.sendStatus(200);
})

Router.post('/updateItems', async (req, res) => {
    
    const info1 = req.body.info1;
    const info2 = req.body.info2;

    await connection.produtosConnection.updateOne({produto: info1}, {quantidade: info2})
    
    res.sendStatus(200);
})

module.exports = Router;
