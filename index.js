require('dotenv').config();
const express = require("express");
const app = express();
const mongoose = require("mongoose");
const cors = require('cors');
const path = require('path');
const bodyParser = require('body-parser');
const fs = require('fs');
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");

const { WebSocketServer } = require('ws');

app.use(cors());

const PORT = process.env.PORT || 8080;
// HTTP Server
const server = app.listen(PORT, () => {
    console.log(`Server is listening on port ${PORT}`)
})


// AWS S3 Configuration
const s3 = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});


// Middleware to handle raw binary data
app.use(express.raw({ type: "image/*", limit: "10mb" }));


// WebSocket Server
const wss = new WebSocketServer({ server });
// console.log(wss)
wss.on('connection', (ws) => {
    console.log('New client connected');
    // console.log(ws)

    // Handle messages from the client
    // ws.on('message', (message) => {
    //     console.log(`Received: ${message}`);
    //     // Send a response to the client
    //     ws.send(`Server received: ${message}`);
    // });

    // Handle client disconnect
    ws.on('close', () => {
        console.log('Client disconnected');
    });
});

// Broadcast function to send data to all connected clients
const broadcast = (data) => {
    wss.clients.forEach((client) => {
        if (client.readyState === client.OPEN) {
            client.send(data);
        }
    });
};

// Serve images as static file
app.use("/uploads", express.static(path.join(__dirname, './uploads')));
app.use("/images", express.static(path.join(__dirname, './images')));

// Middleware to handle raw binary data
app.use(bodyParser.raw({ type: 'image/jpeg', limit: '10mb' })); // Adjust 'type' and 'limit' as needed


app.post("/upload-image", async (req, res) => {
    try {
        const imageBuffer = req.body;

        // Create a unique filename
        const filename = `${Date.now()}.jpg`;
        const bucketName = process.env.AWS_BUCKET_NAME;

        // Upload the image to S3
        const command = new PutObjectCommand({
            Bucket: bucketName,
            Key: `uploads/${filename}`,
            Body: imageBuffer,
            ContentType: "image/jpeg",
        });

        await s3.send(command);

        // Construct the image URL
        const imageUrl = `https://${bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/uploads/${filename}`;

        console.log("Image uploaded to S3:", imageUrl);

        // Optional: broadcast event
        broadcast(JSON.stringify({ message: "New image", url: imageUrl }));

        return res.status(200).json({ success: true, url: imageUrl });
    } catch (error) {
        console.error("Error uploading to S3:", error);
        return res.status(500).json({ success: false, message: "Error uploading image", error });
    }
});


// // Function to handle image upload from esp
// app.post("/upload-image", async (req, res) => {
//     try {
//         // The raw binary data is available in req.body
//         const imageBuffer = req.body;

//         // Setting upload directory
//         const uploadDir = path.join(__dirname, 'uploads');

//         // Ensure upload directory exists
//         if (!fs.existsSync(uploadDir)) {
//             fs.mkdirSync(uploadDir);
//         }

//         // Save the image to a file
//         const filename = `${Date.now()}.jpg`; // Assuming JPEG image
//         const filePath = path.join(uploadDir, filename);
//         // console.log(filePath)  // e.g. /opt/render/project/src/uploads/1731838647694.jpg
//         // console.log(filename)  // e.g. 1731838647694.jpg
//         fs.writeFile(filePath, imageBuffer, (err) => {
//             if (err) {
//                 console.error('Error saving image:', err);
//                 return res.status(500).send('Failed to save image');
//             }
//             const imageUrl = `${process.env.BACKEND_BASE_URL}/uploads/${filename}`
//             console.log('Image saved:', imageUrl);
//             broadcast(JSON.stringify({ message: "New image", url: imageUrl }))
//             return res.status(200).send('Image uploaded successfully');
//         });
//     } catch (error) {
//         console.log("Error while uploading image", error);
//         return res.status(500).send({ success: false, message: "Error while uploading image", error: error });
//     }
// })

app.get("/hello-world", async (req, res) => {
    return res.status(200).send({ success: true, message: "Hello World!" });
})


// Multer config
const upload = require("./multerconfig")

// upload image from html
app.post("/upload-image-from-html", upload.single('image'), async (req, res) => {
    try {
        // console.log(req.file)
        if (!req.file) {
            return res.status(400).send({ success: false, message: "File does not exist" });
        }

        // console.log(`Image url - ${process.env.BACKEND_BASE_URL}/uploads/${req.file.filename}`)
        const url = `${process.env.BACKEND_BASE_URL}/images/${req.file.filename}`

        // Broad cast to the client
        broadcast(JSON.stringify({ message: "New image", url: url }))

        return res.status(200).send({ success: true, message: "Image saved successfully", url: url });
    } catch (error) {
        console.log("Error while uploading image", error);
        return res.status(500).send({ success: false, message: "Error while uploading image", error: error });
    }
})