const socket = io(); // Connect to the server

document.addEventListener("DOMContentLoaded", () => {
    const createStreamBtn = document.getElementById('createStreamBtn');
    const joinStreamBtn = document.getElementById('joinStreamBtn');
    const endStreamBtn = document.getElementById('endStreamBtn');

    const streamLinkElement = document.getElementById('streamLink');
    const joinResponseElement = document.getElementById('joinResponse');
    const endResponseElement = document.getElementById('endResponse');

    // Create a stream and generate a link
    createStreamBtn.addEventListener('click', () => {
        socket.emit('createStream');
    });

    socket.on('streamCreated', (data) => {
        if (data.error) {
            streamLinkElement.textContent = data.error;
        } else {
            streamLinkElement.textContent = `Stream Link: ${data.streamToken}`;
        }
    });

    // Join a stream using a token
    joinStreamBtn.addEventListener('click', () => {
        const joinToken = document.getElementById('joinToken').value;
        socket.emit('joinStream', joinToken);
    });

    socket.on('joinResult', (data) => {
        if (data.error) {
            joinResponseElement.textContent = data.error;
        } else {
            joinResponseElement.textContent = data.message;
        }
    });

    // End a stream using a token
    endStreamBtn.addEventListener('click', () => {
        const endToken = document.getElementById('endToken').value;
        socket.emit('endStream', endToken);
    });

    socket.on('endResult', (data) => {
        if (data.error) {
            endResponseElement.textContent = data.error;
        } else {
            endResponseElement.textContent = data.message;
        }
    });
});
