const express = require("express");
const https = require("https");
const fs = require("fs");
const { Server } = require("socket.io");
const mysql = require("mysql");
const path = require("path");
const multer = require('multer');
const { exec } = require('child_process');
const { Socket } = require("dgram");

// Load SSL certificate and key v
// const key = fs.readFileSync('cert.key');
// const cert = fs.readFileSync('cert.crt');

const key = fs.readFileSync('/etc/letsencrypt/live/demo.nsmkr.world/privkey.pem', 'utf8');
const cert = fs.readFileSync('/etc/letsencrypt/live/demo.nsmkr.world/fullchain.pem', 'utf8');
// Set up the storage engine for multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
      cb(null, 'upload');  // Save chunks to the 'upload' directory
  },
  filename: (req, file, cb) => {
      const fileName = `${req.query.token}-${Date.now()}.webm`; // Create unique filenames using token and timestamp
      cb(null, fileName);
  }
});

// Set up multer for handling uploads
const upload = multer({ storage });


// // Load SSL certificate and key


const options = { key, cert };

const app = express();
const server = https.createServer(options, app);
const io = new Server(server);

// Connect to MySQL database
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "password",
  database: "streaming_db",
});

db.connect((err) => {
  if (err) {
    console.error("Error connecting to MySQL:", err);
  } else {
    console.log("Connected to MySQL");
  }
});

// Store peer IDs associated with tokens
const peers = {};

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, "/")));

// Socket.IO connection handling
io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  // Handle peer connection
  socket.on("join", (token, UserType) => {
    console.log(`User with id joined with token ${token} as ${UserType}`);

    // Store the token, peerId, and UserType on the socket instance for later use
    socket.token = token;
    
    socket.UserType = UserType;

    // Store the peer ID and UserType with the corresponding token
    if (!peers[token]) {
      peers[token] = [];
    }
    peers[token].push({ UserType, socketId: socket.id });
console.log("All Users" + peers);
    // Check if there's a client user and a streamer user with the same token
    const clientPeer = peers[token].find(p => p.UserType === "Client");
    const streamerPeer = peers[token].find(p => p.UserType === "Streamer");

    if (clientPeer && streamerPeer) {

     // Emit 'watcher' event to the streamer about the client
    if (UserType === "Client" && streamerPeer.socketId !== socket.id) {
      socket.to(streamerPeer.socketId).emit('watcher', clientPeer.socketId);
      console.log(`Sent watcher event to streamer ${streamerPeer.socketId} about client ${clientPeer.socketId}`);
    } 
    // If streamer joins last, emit the 'watcher' event to them as well
    else if (UserType === "Streamer" && clientPeer.socketId !== socket.id) {
      socket.emit('watcher', clientPeer.socketId);
      console.log(`Streamer joined last, watcher event sent back to streamer ${socket.id} about client ${clientPeer.socketId}`);
    }
      
    } else {
      console.log("Waiting for the other user to join...");
      console.log(peers);
    }
  });


  // Exiting Signaling


  socket.on('offer', (id, offer) => {
    socket.to(id).emit('offer', socket.id, offer);
  });

  socket.on('answer', (id, answer) => {
    socket.to(id).emit('answer', socket.id, answer);
  });

  socket.on('candidate', (id, candidate) => {
    socket.to(id).emit('candidate', socket.id, candidate);
  });
  // handle stream end
  socket.on('streamEnded', (watcherID) => {
    socket.to(watcherID).emit('streamEnded');
  });

// END signaling
/* Save the recorded video */
// Define storage configuration for multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // Specify the upload directory
  },
  filename: (req, file, cb) => {
    const userToken = req.query.token || 'defaultToken'; // Get the token from the URL
   
    const ext = path.extname(file.originalname); // Get the file extension
    cb(null, `${userToken}${ext}`); // Save file with token and timestamp
  }
});


  socket.on("createStream", () => {
    const streamToken = Math.random().toString(36).substr(2, 9); // Generate a random token
    db.query(
      "INSERT INTO streams (token, status) VALUES (?, ?)",
      [streamToken, "live"],
      (err, result) => {
        if (err) {
          console.error("Error inserting stream:", err);
          socket.emit("streamCreated", { error: "Error creating stream." });
        } else {
          console.log("Stream created with token:", streamToken);
          socket.emit("streamCreated", { streamToken });
        }
      }
    );
  });

  // Event to join a stream & for Validation
  socket.on("joinStream", (streamToken) => {
    db.query(
      "SELECT status FROM streams WHERE token = ?",
      [streamToken],
      (err, results) => {
        if (err || results.length === 0) {
          console.error("Error fetching stream status:", err);
          socket.emit("joinResult", { error: "Invalid stream token." });
          socket.emit("redirect", "/invalid.html");
        } else {
          const streamStatus = results[0].status;
          if (streamStatus === "live") {
            socket.emit("joinResult", { message: "Successfully joined the stream!" });
          } else {
            socket.emit("joinResult", { error: "Stream has ended." });
            socket.emit("redirect", "/over.html");
          }
        }
      }
    );
  });

  // Event to end a stream
  socket.on("endStream", (streamToken) => {
    db.query(
      "UPDATE streams SET status = ? WHERE token = ?",
      ["ended", streamToken],
      (err, result) => {
        if (err) {
          console.error("Error ending stream:", err);
          socket.emit("endResult", { error: "Error ending stream." });
        } else {
          console.log("Stream ended with token:", streamToken);
          socket.emit("endResult", { message: "Stream ended successfully." });
        }
      }
    );
  });

  // Handle user disconnect
  socket.on("disconnect", () => {
    console.log("A user disconnected: " + socket.id);

    const token = socket.token;
  
    if (token && peers[token]) {
      // Find the index of the user object based on the socketId
      const index = peers[token].findIndex(user => user.socketId === socket.id);
  
      if (index !== -1) {
        // Remove the disconnected user using splice        sudo kill -9 <PID>
        peers[token].splice(index, 1);
  
        // If there are no more users for this token, delete the token entry
        if (peers[token].length === 0) {
          delete peers[token];
        }
  
        console.log(`Removed user with socketId ${socket.id} from token ${token}`);
      }
      }
  });

// Hndle the recording
// Route to handle video upload chunks
app.post('/upload-video', upload.single('video'), (req, res) => {
  const token = req.query.token;
  const fileName = req.file.filename;
  const watcherID2 = req.query.watcherID;

  console.log(`Uploaded chunk for token: ${token}, file: ${fileName}`);
  socket.to(watcherID2).emit('VideoDirect', fileName);
 


  // Here we save the file chunk. You could keep track of chunk counts for each upload.
  // You might need to store the chunks in a database or some session-based solution.

  res.json({ message: 'Chunk uploaded successfully!' });
});




});




// Route to combine chunks into a final video file
app.post('/combine-chunks', (req, res) => {
  const token = req.query.token;
  const videoPath = `upload/${token}-combined.webm`;

  // Get all the chunk filenames for the token (assuming all files were uploaded in `upload`)
  fs.readdir('upload', (err, files) => {
      if (err) {
          return res.status(500).send('Error reading directory');
      }

      // Filter only the files for the current token
      const tokenChunks = files.filter(file => file.startsWith(token));

      if (tokenChunks.length === 0) {
          return res.status(404).send('No chunks found');
      }

      // Command to combine the video chunks using ffmpeg
      const inputListFile = `upload/${token}-filelist.txt`;
      const fileListContent = tokenChunks.map(chunk => `file '${path.join(__dirname, 'upload', chunk)}'`).join('\n');
      fs.writeFileSync(inputListFile, fileListContent);

      const command = `ffmpeg -f concat -safe 0 -i ${inputListFile} -c copy ${videoPath}`;

      // Execute the command to combine the chunks
      exec(command, (err) => {
          if (err) {
              console.error('Error combining chunks:', err);
              return res.status(500).send('Error combining chunks');
          }

          // Clean up chunk files
          tokenChunks.forEach(chunk => fs.unlinkSync(path.join(__dirname, 'upload', chunk)));
          fs.unlinkSync(inputListFile); // Delete the filelist

          res.json({ message: 'Video combined successfully', videoPath });
      });
  });
});

// Display the video list
app.use('/upload', express.static(path.join(__dirname, 'upload')));
// Route to list all available videos in the 'upload' directory
app.get('/videos', (req, res) => {
  const videoDir = path.join(__dirname, 'upload');

  // Read files in the 'upload' directory
  fs.readdir(videoDir, (err, files) => {
    if (err) {
      return res.status(500).json({ message: 'Error reading directory' });
    }

    // Filter out only video files
    const videoFiles = files.filter(file => file.endsWith('.webm') || file.endsWith('.mp4'));

    res.json({ videos: videoFiles });
  });
});





// Start the server on port 9000 with HTTPS
server.listen(9000, () => {
  console.log("HTTPS Server is running on port 9000");
});
