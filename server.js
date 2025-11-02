const express = require('express');
const app = express();
const bodyParser = require("body-parser");
const connectDB = require('./config/db.js');
const router = require('./src/routes/index.js');

app.get('/', async (req, res) => {
    try {
        res.send({ message: 'Welcome to Practical Exam!!' });
    } catch (error) {
        res.send({ error: error.message });
    }
});

const cors = require('cors')
connectDB();
app.use(
    cors({
        origin: "http://localhost:3000",
        credential: true
    })
)

app.use(bodyParser.json({ limit: "10mb" }));
app.use(bodyParser.urlencoded({ limit: "10mb", extended: true }));

app.use(express.json());
app.use("/", router);
const PORT = process.env.PORT || 9999;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));