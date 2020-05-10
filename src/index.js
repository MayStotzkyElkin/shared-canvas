/**
 * Server side
 */

const path = require('path');
const http = require('http');
const express = require('express');
const socketio = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketio(server);

const port = process.env.PORT || 3000;

// Define paths for express config 
const publicDirecttoryPath = path.join(__dirname, '../public');

// Setup static directory to serve
app.use(express.static(publicDirecttoryPath));

let draw_history = [];

// listenning for the connection event to occurs
io.on('connection', socket => {
    // sends the history to the new client
    for (var i in draw_history) {
    socket.emit('drawing', { 
        points: draw_history[i], 
        drawing: draw_history
        });
    }

    socket.on('drawing', data => {
        draw_history.push(data.points)
        // sending drawing event to all clients
        io.emit('drawing', {
            points: data.points,
            drawing: draw_history
        });
    });

    // update the drawing history
    socket.on('update', data => {
        draw_history = data.drawing;
        io.emit('clear');
        io.emit('drawing', { drawing: draw_history });
    })

    socket.on('disconnect', () => {
        socket.broadcast.emit('left', socket.id);
    })
})

server.listen(port, () => {
    console.log(`Server is listening on port ${port}`);
})