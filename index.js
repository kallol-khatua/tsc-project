require('dotenv').config();
const express = require("express");
const app = express();
const mongoose = require("mongoose");
const cors = require('cors');
const path = require('path');
const bodyParser = require('body-parser');

const { WebSocketServer } = require('ws');

app.use(cors());

const PORT = process.env.PORT || 8080;
// HTTP Server
const server = app.listen(PORT, () => {
    console.log(`Server is listening on port ${PORT}`)
})

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

// Multer config
// const upload = require("./multerconfig")
// app.use('/upload-image', express.raw({ type: 'application/octet-stream', limit: '10mb' }));
// Middleware to handle raw binary data
app.use(bodyParser.raw({ type: 'image/jpeg', limit: '10mb' })); // Adjust 'type' and 'limit' as needed


// Function to handle image upload
app.post("/upload-image", async (req, res) => {
    try {
        // const uploadDir = path.join(__dirname, 'uploads');

        // // Ensure upload directory exists
        // if (!fs.existsSync(uploadDir)) {
        //     fs.mkdirSync(uploadDir);
        // }

        // Generate a unique filename
        // const filename = `${Date.now()}.jpg`; // Assuming JPEG image
        // const filePath = path.join(uploadDir, filename);
        // console.log(filePath)
        // console.log(filename)

        // // Save binary data to a file
        // fs.writeFile(filePath, req.body, (err) => {
        //     if (err) {
        //         console.error('Error saving file:', err);
        //         return res.status(500).send('Failed to save file');
        //     }
        //     console.log('File saved:', filePath);
        //     broadcast(JSON.stringify({ message: "New image", url: filePath }))
        //     res.status(200).send({ message: 'File uploaded successfully', file: filename });
        // });

        const imageBuffer = req.body; // The raw binary data is available in req.body
        const uploadDir = path.join(__dirname, 'uploads');

        // Ensure upload directory exists
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir);
        }

        // Save the image to a file
        const filename = `${Date.now()}.jpg`; // Assuming JPEG image
        const filePath = path.join(uploadDir, filename);
        console.log(filePath)
        console.log(filename)
        fs.writeFile(filePath, imageBuffer, (err) => {
            if (err) {
                console.error('Error saving image:', err);
                return res.status(500).send('Failed to save image');
            }
            console.log('Image saved:', filePath);
            res.status(200).send('Image uploaded successfully');
        });


        return res.status(200).send({ success: true, message: "Image saved successfully" });
    } catch (error) {
        console.log("Error while uploading image", error);
        return res.status(500).send({ success: false, message: "Error while uploading image", error: error });
    }
})








// app.post("/upload-image", upload.single('image'), async (req, res) => {
//     try {
//         // console.log(req.file)
//         if (!req.file) {
//             return res.status(400).send({ success: false, message: "File does not exist" });
//         }

//         // console.log(`Image url - ${process.env.BACKEND_BASE_URL}/uploads/${req.file.filename}`)
//         const url = `${process.env.BACKEND_BASE_URL}/uploads/${req.file.filename}`

//         // Broad cast to the client
//         broadcast(JSON.stringify({ message: "New image", url: url }))

//         return res.status(200).send({ success: true, message: "Image saved successfully", url: url });
//     } catch (error) {
//         console.log("Error while uploading image", error);
//         return res.status(500).send({ success: false, message: "Error while uploading image", error: error });
//     }
// })