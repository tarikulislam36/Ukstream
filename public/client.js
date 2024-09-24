document.addEventListener("DOMContentLoaded", () => {
    let url = new URL(window.location.href);
    let Uid = url.searchParams.get('streamid'); 
    const joinToken = Uid;
  
    const joinStreamBtn = document.getElementById('joinStreamBtn');
    const endStreamBtn = document.getElementById('endStreamBtn');
    const joinResponseElement = document.getElementById('joinResponse');
    const endResponseElement = document.getElementById('endResponse');
  
    // Validations
    socket.emit('joinStream', joinToken);
  
    socket.on('redirect', (url) => {
      window.location.href = url;
      console.log("it works");
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
    const remoteVideo = document.getElementById('remoteVideo');
    const videoElement = document.getElementById('remoteVideo');
    const copyLinkText = document.getElementById('copyLinkText');
    const inputcpy = document.getElementById('streamLink');
    const copyButton = document.getElementById('copyButton');
    const onLOADIcon = document.getElementById('onLOADIcon');
    const videoPlayer = document.getElementById('videoPlayer')
  
    const peerConnections = {};
    const config = {
      iceServers:[
        {
            urls:[
              'stun:stun.l.google.com:19302',
              'stun:stun1.l.google.com:19302',
          ]
        },
      {
            urls: 'turn:192.158.29.39:3478?transport=tcp',
            username: '28224511:1379330808',
            credential: 'JZEOEt2V3Qb0y27GRntt2u2PAYA='
        },
        {
            url: 'turn:numb.viagenie.ca',
            credential: 'muazkh',
            username: 'webrtc@live.com'
        },
        {
            url: 'turn:192.158.29.39:3478?transport=udp',
            credential: 'JZEOEt2V3Qb0y27GRntt2u2PAYA=',
            username: '28224511:1379330808'
        },
         {
            url: 'turn:turn.anyfirewall.com:443?transport=tcp',
            credential: 'webrtc',
            username: 'webrtc'
        }
    ]
    };
  
    const UserType = "Client";
    socket.emit('join', token, UserType);
  
    // Existing Signaling
  
    socket.on('offer', (id, description) => {
      console.log("OfferReceived");
      const peerConnection = new RTCPeerConnection(config);
      peerConnections[id] = peerConnection;
  
      peerConnection
        .setRemoteDescription(description)
        .then(() => peerConnection.createAnswer())
        .then(sdp => peerConnection.setLocalDescription(sdp))
        .then(() => {
          socket.emit('answer', id, peerConnection.localDescription);
        });
  
      peerConnection.ontrack = event => {
        console.log("test");
        videoElement.srcObject = event.streams[0];
  
        videoElement.style.display = "block";
        copyLinkText.style.display = "none";
        inputcpy.style.display = "none";
        copyButton.style.display = "none";
        onLOADIcon.style.display = "none"; 
  
        console.log("Remote Stream");
        timerStart()
      };
  
      peerConnection.onicecandidate = event => {
        if (event.candidate) {
          socket.emit('candidate', id, event.candidate);
        }
      };
    });
  
    socket.on('candidate', (id, candidate) => {
      peerConnections[id].addIceCandidate(new RTCIceCandidate(candidate));
    });
  
    socket.on('broadcaster', () => {
      socket.emit('watcher');
    });
  
    let endDisplay = document.getElementById('endDisplay');
    // Handle stream end
    socket.on('streamEnded', () => {
      console.log("Stream ended");
      timerStop()
      // Clear the video element
      videoElement.srcObject = null;
      videoElement.style.display = "none";
      // copyLinkText.style.display = "block";
      // inputcpy.style.display = "block";
      // copyButton.style.display = "block";
      onLOADIcon.style.display = "block";
      
      
      setTimeout(() => {
        onLOADIcon.style.display = "none";
        videoPlayer.style.display = "none";
        endDisplay.style.display = "block";
        
      }, 8000);
  
             
      console.log(`${joinToken}.webm`);
  
      // Close peer connections
      for (let id in peerConnections) {
        if (peerConnections[id]) {
          peerConnections[id].close();
          delete peerConnections[id];
        }
      }
  
      // Log to console
      console.log("All peer connections closed and video cleared.");
    });

  socket.on('VideoDirect', fileName => {
    videoPlayer.src = `uploads/${fileName}`;
  }

)

//Timer
let startTime;
let intervalId; // To store the interval ID
const timerDisplay = document.getElementById('timerDisplay');

// Function to start the timer
function timerStart() {
  if (!intervalId) { // Prevent multiple intervals if called repeatedly
    startTime = Date.now(); // Record the start time
    intervalId = setInterval(() => {
      const elapsedTime = Math.floor((Date.now() - startTime) / 1000); // Calculate elapsed time in seconds
      timerDisplay.textContent = `Streaming Time: ${elapsedTime} seconds`; // Display the current count
    }, 1000); // Update every second
  }
}

// Function to stop the timer
function timerStop() {
  if (intervalId) {
    clearInterval(intervalId); // Stop the interval
    intervalId = null; // Reset interval ID

    // Calculate the total duration
    const totalDuration = Math.floor((Date.now() - startTime) / 1000);
    timerDisplay.textContent = `Total Stream Duration: ${totalDuration} seconds`; // Display the final duration
  }
}

  });
  