// const express = require("express");
// const mongoose = require("mongoose");
// const cors = require("cors");
// require("dotenv").config();

// const authRouter = require("./routes/authRoutes");
// const detailsRouter = require("./routes/userDetails");

// const app = express();
// app.use(express.json());
// app.use(cors());

// mongoose.connect(process.env.MONGO_URI, {
//   useNewUrlParser: true,
//   useUnifiedTopology: true,
// });

// app.use("/api", authRouter);
// app.use("/api", detailsRouter);

// app.listen(5000, () => console.log("Server running on http://localhost:5000"));


const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const authRouter = require("./routes/authRoutes"); // Changed from authRoutes to authRouter
const detailsRouter = require("./routes/userDetails"); // Changed from detailsRoutes to detailsRouter

const app = express();
const bodyParser = require('body-parser');

// Set limit for JSON and URL-encoded data
app.use(bodyParser.json({ limit: '20mb' })); // Adjust as necessary
app.use(bodyParser.urlencoded({ limit: '20mb', extended: true }));

// For handling multipart form-data (used for file uploads), use `multer` or a similar middleware.

app.use(express.json());
app.use(cors());

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log("Connected to MongoDB"))
.catch(err => console.error("MongoDB connection error:", err));

app.use("/api/auth", authRouter); // Changed to use authRouter
app.use("/api/details", detailsRouter); // Changed to use detailsRouter



// const PORT = 5000;
// app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
app.listen(5000, '0.0.0.0', () => {
  console.log("Server running on port 5000");
});
