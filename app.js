const fastify = require('fastify')();
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('fastify-multer');
const upload = multer({ dest: 'temp/' });
const io = require('socket.io')(fastify.server);
const jimp = require('jimp');

fastify.decorate('mongodb', func => {
    const mongodb = require('mongodb');
    const MongoClient = mongodb.MongoClient;
    const client = new MongoClient('mongodb://localhost:27017', { useUnifiedTopology: true });
    client.connect(err => {
        assert.equal(err, null);
        const db = client.db('VK');
        func(db, client, mongodb);
    });
});

fastify.register(require('fastify-static'), {
    root: path.join(__dirname, 'static'),
    prefix: '/'
});

fastify.register(require('fastify-cookie'));

fastify.register(require('point-of-view'), {
    engine: {
        pug: require('pug')
    },
    templates: 'templates',
    includeViewExtension: true
});

fastify.register(require('fastify-formbody'));

fastify.register(multer.contentParser);

fastify.register(require('./server/route'), { assert: assert, upload: upload, jimp: jimp, path: path, io: io, fs: fs, crypto: crypto });

fastify.register(require('./server/sockets'), { assert: assert, io: io, fs: fs, path: path });

fastify.ready(err => {
    assert.equal(err, null);
    console.log('Available at http://localhost:80');
});


fastify.setNotFoundHandler((req, reply) => {
    reply.view('error');
});

fastify.listen(8080);