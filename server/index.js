require('dotenv').config();

const express = require('express');
const fs = require('fs');
const http = require('http');
const https = require('https');
const RTCMultiConnectionServer = require('rtcmulticonnection-server');

const app = express();

app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
  });
  

const randomCode = () => [...Array(4)].map(() => String.fromCharCode(65 + Math.floor(Math.random() * 26))).join('');
const rooms = {};

app.use('/', express.static(`${__dirname}/../dist`));

app.get('/createRoom', (req, res) => {
  console.log('creating room', randomCode());
  let roomID = randomCode();
  while (rooms[roomID]) {
    roomID = randomCode();
  }
  rooms[roomID] = [];
  res.send({ roomID });
});

const server = process.env.SSL === 'true'
  ? http.createServer(app)
  : https.createServer({ key: fs.readFileSync('private/privatekey.pem'), cert: fs.readFileSync('private/certificate.pem') }, app);

RTCMultiConnectionServer.beforeHttpListen(server, {});
server.listen(process.env.PORT, '0.0.0.0', () => {
  RTCMultiConnectionServer.afterHttpListen(server, {});
});

const io = require('socket.io').listen(server); // eslint-disable-line

io.on('connection', (socket) => {
  if (rooms[socket.handshake.query.sessionid]) {
    rooms[socket.handshake.query.sessionid].push(socket.id);
  }
  socket.on('disconnect', (e) => {
    Object.keys(rooms).forEach((roomID) => {
      if (rooms[roomID].indexOf(socket.id)) {
        rooms[roomID].splice(rooms[roomID].indexOf(socket.id), 1);
        if (rooms[roomID].length === 0) delete rooms[roomID];
      }
    });
    console.log(`there are ${Object.keys(rooms).length} rooms`);
  });
  console.log(`there are ${Object.keys(rooms).length} rooms`);

  RTCMultiConnectionServer.addSocket(socket, {});
});
