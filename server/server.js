// server/server.js
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

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, "../public")));

// Socket.IO connection handling
io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

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
          socket.emit('redirect', '/invalid.html');
        } else {
          const streamStatus = results[0].status;
          if (streamStatus === "live") {
            socket.emit("joinResult", { message: "Successfully joined the stream!" });
          } else {
            socket.emit("joinResult", { error: "Stream has ended." });
            socket.emit('redirect', '/over.html');
          }
        }
      }
    );
  });
// invalid token
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

  socket.on("disconnect", () => {
    console.log("A user disconnected:", socket.id);
  });
});

// Start the server
server.listen(3000, () => {
  console.log("Server is running on http://localhost:3000");
});
