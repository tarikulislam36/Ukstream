document.addEventListener("DOMContentLoaded", () => {
    let url = new URL(window.location.href);
    const Uid = url.searchParams.get('streamid');
    const userToken = Uid;
    let watcherID = null;
    let mediaRecorder;
    let recordedChunks = [];
    let joinToken = Uid;
  //Validation
  
  
  socket.emit('joinStream', joinToken);
      // const createStreamBtn = document.getElementById('createStreamBtn');
      const joinStreamBtn = document.getElementById('joinStreamBtn');
      const endStreamBtn = document.getElementById('endStreamBtn');
  
      // const streamLinkElement = document.getElementById('streamLink');
      const joinResponseElement = document.getElementById('joinResponse');
      const endResponseElement = document.getElementById('endResponse');
  
      const onLOADIcon = document.getElementById('onLOADIcon');
      const Thanks = document.getElementById('Thanks');
  
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
  
  
  socket.on('endResult', (data) => {
      if (data.error) {
          endResponseElement.textContent = data.error;
      } else {
          endResponseElement.textContent = data.message;
      }
  });
  
  
  
    //Stream
    const videoElement = document.getElementById('localVideo');
  //   const endStreamBtn = document.getElementById('endStreamBtn');
    
    const peerConnections = {};
    const config = {
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'turn:192.158.29.39:3478?transport=udp', username: '28224511:1379330808', credential: 'JZEOEt2V3Qb0y27GRntt2u2PAYA=' }
        ]
    };
  
    navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: true
    }).then(stream => {
        videoElement.srcObject = stream;
  
        // Record the stream
        mediaRecorder = new MediaRecorder(stream);
        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                recordedChunks.push(event.data);
            }
        };
  
        mediaRecorder.onstop = () => {
            const blob = new Blob(recordedChunks, { type: 'video/webm' });
            uploadRecording(blob);
        };
  
        function startRecording() {
            recordedChunks = []; // Reset chunks for new recording
            mediaRecorder.start(1000); // Record in 1-second intervals
            console.log("Recording started...");
        }
  
        startRecording();
        socket.emit("broadcaster");
  
        const UserType = "Streamer";
        socket.emit('join', Uid, UserType);
  
        socket.on("watcher", id => {
            watcherID = id;
            const peerConnection = new RTCPeerConnection(config);
            peerConnections[id] = peerConnection;
            stream.getTracks().forEach(track => peerConnection.addTrack(track, stream));
            peerConnection.onicecandidate = event => {
                if (event.candidate) {
                    socket.emit("candidate", id, event.candidate);
                }
            };
            peerConnection.createOffer()
                .then(sdp => peerConnection.setLocalDescription(sdp))
                .then(() => {
                    socket.emit("offer", id, peerConnection.localDescription);
                });
        });
  
        socket.on("answer", (id, description) => {
            peerConnections[id].setRemoteDescription(description);
        });
  
        socket.on("candidate", (id, candidate) => {
            peerConnections[id].addIceCandidate(new RTCIceCandidate(candidate));
        });
  
        socket.on("disconnectPeer", id => {
            peerConnections[id].close();
            delete peerConnections[id];
        });
  
        endStreamBtn.addEventListener('click', () => {
          const endToken = Uid;
            stopRecording();
            
          socket.emit('endStream', endToken);
          socket.emit('streamEnded', watcherID);
          // Stop local video stream
          const stream = videoElement.srcObject;
          const tracks = stream.getTracks();
          tracks.forEach(track => track.stop());
          videoElement.srcObject = null;
          videoElement.style.display = "none";
          // loading
          onLOADIcon.style.display = "block";
          setTimeout(() => {
              onLOADIcon.style.display = "none";
              Thanks.style.display = "block";
  
  
          }, 8000);
          
      });
  
        window.addEventListener('beforeunload', () => {
            stopRecording();
            socket.emit('streamEnded', watcherID);
        });
  
        function stopRecording() {
            if (mediaRecorder.state !== 'inactive') {
                mediaRecorder.stop();
                console.log("Recording stopped...");
            }
        }
  
        function uploadRecording(blob) {
            const formData = new FormData();
            formData.append('video', blob, 'recorded-video.webm');
            
            fetch(`/upload-video?token=${userToken}&watcherID=${watcherID}`, {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(result => {
                console.log('Video uploaded successfully:', result);
                combineChunks(); // Combine chunks after upload
            })
            .catch(error => {
                console.error('Error uploading video:', error);
            });
        }
  
        function combineChunks() {
            fetch(`/combine-chunks?token=${userToken}`, {
                method: 'POST',
            })
            .then(response => response.json())
            .then(result => {
                console.log('Video combined successfully:', result);
            })
            .catch(error => {
                console.error('Error combining chunks:', error);
            });
        }
    });
  });
  