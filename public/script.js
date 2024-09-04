const socket = io(); // Connect to the server

document.addEventListener("DOMContentLoaded", () => {
    const createStreamBtn = document.getElementById('createStreamBtn');
    // const joinStreamBtn = document.getElementById('joinStreamBtn');
    // const endStreamBtn = document.getElementById('endStreamBtn');

    const streamLinkElement = document.getElementById('streamLink');
    // const joinResponseElement = document.getElementById('joinResponse');
    // const endResponseElement = document.getElementById('endResponse');

   const createText = document.getElementById('createText');
   const  copyLinkText = document.getElementById('copyLinkText');
   const inputcpy = document.getElementById('streamLink');
   const copyButton = document.getElementById('copyButton');
    // Create a stream and generate a link
    createStreamBtn.addEventListener('click', () => {
        socket.emit('createStream');
    });

    socket.on('streamCreated', (data) => {
        if (data.error) {
            streamLinkElement.textContent = data.error;
        } else {
            // Redirect to client page with the stream token
            window.location.href = `/client.html?streamid=${data.streamToken}`;
           
           
        }
    });

    // Join a stream using a token
   
});
