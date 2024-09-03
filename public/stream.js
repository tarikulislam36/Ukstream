document.addEventListener("DOMContentLoaded", () => {
    let url = new URL(window.location.href);
Uid = url.searchParams.get('streamid'); 
const joinToken = Uid;

socket.emit('joinStream', joinToken);
    // const createStreamBtn = document.getElementById('createStreamBtn');
    const joinStreamBtn = document.getElementById('joinStreamBtn');
    const endStreamBtn = document.getElementById('endStreamBtn');

    // const streamLinkElement = document.getElementById('streamLink');
    const joinResponseElement = document.getElementById('joinResponse');
    const endResponseElement = document.getElementById('endResponse');

    // Validations
socket.on('redirect', (url) => {
    window.location.href = url;
    console.log("it works");
});


//  Join Stream
// joinStreamBtn.addEventListener('click', () => {
//     const joinToken = document.getElementById('joinToken').value;
//     socket.emit('joinStream', joinToken);
// });

socket.on('joinResult', (data) => {
    if (data.error) {
        joinResponseElement.textContent = data.error;
    } else {
        joinResponseElement.textContent = data.message;
    }
});

// End a stream using a token
endStreamBtn.addEventListener('click', () => {
    const endToken = Uid;
    socket.emit('endStream', endToken);
    window.location.href = '/end.html';
});

socket.on('endResult', (data) => {
    if (data.error) {
        endResponseElement.textContent = data.error;
    } else {
        endResponseElement.textContent = data.message;
    }
});


// Calling

const token = url.searchParams.get('streamid'); 
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
const remotePeerIdInput = document.getElementById('remotePeerId');

const inputlocalpeerId = document.getElementById("localpeerId");

const peer = new Peer();

peer.on('open', (id) => {
    console.log('My peer ID is: ' + id);
    inputlocalpeerId.value = id;
    let peerId = id;
    socket.emit('join', token, peerId);
});

peer.on('error', (error) => {
    console.log('Error: ' + error);
});

const getUserMedia = navigator.mediaDevices.getUserMedia;

getUserMedia({ video: true, audio: true }).then((stream) => {
    // Show local video
    localVideo.srcObject = stream;

    peer.on('call', (call) => {
        call.answer(stream); // Answer the call with an A/V stream.
        call.on('stream', (remoteStream) => {
            // Show remote video
            
            remoteVideo.srcObject = remoteStream;
        });
    });
}).catch((err) => {
    console.log('Failed to get local stream', err);
});

socket.on('peer-found', (remotePeerId) => {
console.log('Peer found:', remotePeerId);

getUserMedia({ video: true, audio: true }).then((stream) => {
const call = peer.call(remotePeerId, stream);
call.on('stream', (remoteStream) => {
remoteVideo.srcObject = remoteStream;
});
}).catch((err) => {
console.log('Failed to get local stream', err);
});
});


const callPeer = () => {
    const remotePeerId = remotePeerIdInput.value;
    getUserMedia({ video: true, audio: true }).then((stream) => {
        const call = peer.call(remotePeerId, stream);
        call.on('stream', (remoteStream) => {
            // Show remote video
            remoteVideo.srcObject = remoteStream;
        });
    }).catch((err) => {
        console.log('Failed to get local stream', err);
    });
};



});