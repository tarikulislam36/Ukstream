const express = require("express");
const https = require("https");
const fs = require("fs");
const { Server } = require("socket.io");
const mysql = require("mysql");
const path = require("path");

// Load SSL certificate and key
const key = fs.readFileSync('cert.key');
const cert = fs.readFileSync('cert.crt');
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
  socket.on("join", (token, peerId, UserType) => {
    console.log(`User with id ${peerId} joined with token ${token} as ${UserType}`);

    // Store the token, peerId, and UserType on the socket instance for later use
    socket.token = token;
    socket.peerId = peerId;
    socket.UserType = UserType;

    // Store the peer ID and UserType with the corresponding token
    if (!peers[token]) {
      peers[token] = [];
    }
    peers[token].push({ peerId, UserType, socketId: socket.id });

    // Check if there's a client user and a streamer user with the same token
    const clientPeer = peers[token].find(p => p.UserType === "Client");
    const streamerPeer = peers[token].find(p => p.UserType === "Streamer");

    if (clientPeer && streamerPeer) {
      // Send the client peer ID to the streamer using the streamer's socket ID
      io.to(streamerPeer.socketId).emit("peer-found", clientPeer.peerId);
      console.log("Client peer ID sent to the streamer");
      console.log(peers);
    }
  });

  // Event to create a new stream
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

  // Event to join a stream
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
    const peerId = socket.peerId;

    if (token && peerId && peers[token]) {
      // Find the index of the peer object to be removed
      const index = peers[token].findIndex(p => p.peerId === peerId);

      if (index !== -1) {
        // Remove the peer object using splice
        peers[token].splice(index, 1);

        // If there are no more peers for this token, delete the token entry
        if (peers[token].length === 0) {
          delete peers[token];
        }

        console.log(`Removed Peer ID ${peerId} from token ${token}`);
      }
    }
  });
});

// Start the server on port 9000 with HTTPS
server.listen(443, () => {
  console.log("HTTPS Server is running on port 443");
});
