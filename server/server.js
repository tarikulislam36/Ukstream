const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const mysql = require("mysql");
const path = require("path");

const app = express();
const server = http.createServer(app);
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
app.use(express.static(path.join(__dirname, "../public")));


// Socket.IO connection handling
io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  // Handle peer connection
  socket.on("join", (token, peerId) => {
    console.log(`User with id ${peerId} joined with token ${token}`);

    // Store the token and peerId on the socket instance for later use
    socket.token = token;
    socket.peerId = peerId;

    // Store the peer ID with the corresponding token
    if (!peers[token]) {
      peers[token] = [];
    }
    peers[token].push(peerId);

    // If there are two peers with the same token, connect them
    if (peers[token].length > 1) {
      const [peer1, peer2] = peers[token];
      // Send the peer IDs to each other
      io.to(socket.id).emit("peer-found", peer1);
      // io.to(peers[token][1]).emit("peer-found", peer1);
      console.log("User Found");
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
      // Find the index of the peer ID to be removed
      const index = peers[token].indexOf(peerId);

      if (index !== -1) {
        // Remove the peer ID using splice
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

// Start the server
server.listen(3000, () => {
  console.log("Server is running on http://localhost:3000");
});
