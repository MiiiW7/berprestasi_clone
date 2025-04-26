import express from "express";
import mongoose from "mongoose";
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';  
import path from 'path';  
import { PORT, mongoDBURL } from "./config.js";
import adminRoutes from "./routes/adminRoute.js";
import postRoutes from "./routes/postRoutes.js";
import userRoutes from "./routes/userRoutes.js"
import notificationRoutes from './routes/notificationRoutes.js';
import searchRoute from './routes/searchRoute.js';
//import vercelCompatMiddleware from './middleware/vercelCompat.js';
// Disable postSchedulerJob import for Vercel
import './src/postSchedulerJob.js';
import fs from 'fs';

// // Conditional import based on environment
// let checkAndUpdatePosts;
// if (process.env.VERCEL === '1') {
//   console.log('Running on Vercel, using compatible scheduler');
//   import('./src/vercelCompatScheduler.js')
//     .then(module => {
//       checkAndUpdatePosts = module.default;
//       console.log('Vercel compatible scheduler loaded');
//     })
//     .catch(err => {
//       console.error('Error loading compatible scheduler:', err);
//     });
// } else {
//   console.log('Running locally, using node-cron scheduler');
//   try {
//     import('./src/postSchedulerJob.js')
//       .catch(err => console.error('Error loading scheduler:', err));
//   } catch (error) {
//     console.error('Error importing scheduler:', error);
//   }
// }

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

// Middleware untuk parsing req body
app.use(express.json());

// Middleware untuk Vercel compatibility
//app.use(vercelCompatMiddleware);

// CORS middleware - lebih permisif dan diletakkan sebelum middleware lain
// app.use((req, res, next) => {
//   // Izinkan semua origins (lebih permisif)
//   res.setHeader('Access-Control-Allow-Origin', '*');
//   res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
//   res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type, Authorization, Origin, Accept');
//   res.setHeader('Access-Control-Max-Age', '86400'); // 24 jam cache untuk preflight requests
  
//   // Handle OPTIONS (preflight) requests
//   if (req.method === 'OPTIONS') {
//     console.log('OPTIONS request dari origin:', req.headers.origin);
//     return res.status(200).end();
//   }
  
//   // Log detail permintaan untuk debug
//   console.log(`${req.method} request ke ${req.path}`);
//   console.log('Headers:', JSON.stringify(req.headers));
  
//   next();
// });
app.use(cors());

// Middleware untuk menjalankan scheduler pada setiap request jika di Vercel
// app.use(async (req, res, next) => {
//   if (process.env.VERCEL === '1' && checkAndUpdatePosts) {
//     try {
//       await checkAndUpdatePosts();
//     } catch (error) {
//       console.error('Error running scheduler on request:', error);
//     }
//   }
//   next();
// });

// Create uploads directories if they don't exist
const profilesDir = path.resolve(__dirname, 'uploads', 'profiles');
const postsDir = path.resolve(__dirname, 'uploads', 'posts');

console.log("Profiles directory path:", profilesDir);
console.log("Posts directory path:", postsDir);

// Disable directory creation on Vercel environment (serverless)
// if (process.env.VERCEL !== '1') {
//   try {
//     console.log("Creating upload directories...");
//     fs.mkdirSync(profilesDir, { recursive: true });
//     fs.mkdirSync(postsDir, { recursive: true });
//     console.log('Upload directories created successfully');
//     console.log("Profiles directory exists:", fs.existsSync(profilesDir));
//     console.log("Posts directory exists:", fs.existsSync(postsDir));
    
//     // Set permissions
//     try {
//       fs.chmodSync(profilesDir, 0o777);
//       fs.chmodSync(postsDir, 0o777);
//       console.log("Directory permissions set to 777");
//     } catch (permErr) {
//       console.error("Error setting directory permissions:", permErr);
//     }
//   } catch (err) {
//     console.error('Error creating upload directories:', err);
//     console.error('Error details:', JSON.stringify({
//       code: err.code,
//       path: err.path,
//       errno: err.errno,
//       syscall: err.syscall
//     }));
//   }
// }

// Middleware untuk serving static files
const uploadsPath = path.resolve(__dirname, 'uploads');
console.log("Uploads static path:", uploadsPath);
console.log("Uploads directory exists:", fs.existsSync(uploadsPath));

// Ensure uploads directory is created if it doesn't exist yet
if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath, { recursive: true });
  console.log("Created main uploads directory");
}

app.use('/uploads', express.static(uploadsPath));
app.use(express.static(path.join(__dirname, 'public')));

// Specific routes for uploads subdirectories
const postsStaticPath = path.resolve(__dirname, 'uploads', 'posts');
const profilesStaticPath = path.resolve(__dirname, 'uploads', 'profiles');

console.log("Posts static path:", postsStaticPath);
console.log("Posts static directory exists:", fs.existsSync(postsStaticPath));
console.log("Profiles static path:", profilesStaticPath);
console.log("Profiles static directory exists:", fs.existsSync(profilesStaticPath));

app.use('/uploads/posts', express.static(postsStaticPath));
app.use('/uploads/profiles', express.static(profilesStaticPath));

app.get("/", (req, res) => {
  console.log("Root endpoint called");
  return res.status(200).json({ 
    message: "Hello World", 
    env: {
      nodeEnv: process.env.NODE_ENV,
      // vercel: process.env.VERCEL,
      port: process.env.PORT
    }
  });
});

// Route admin
app.use('/admin', adminRoutes);

// Route post
app.use('/post', postRoutes);

// Route user
app.use('/user', userRoutes);

// Route Notif
app.use('/notifications', notificationRoutes);

app.use('/search', searchRoute);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('ERROR DETAILS:');
  console.error(err.stack);
  console.error('Error name:', err.name);
  console.error('Error message:', err.message);
  console.error('Error code:', err.code);
  console.log(`Received ${req.method} request to ${req.path}`);
  console.log('Request body:', req.body);
  console.log('Headers:', req.headers);
  
  return res.status(500).json({
    success: false,
    message: 'Server error',
    error: err.message || 'Internal server error',
    path: req.path
  });
});

mongoose
  .connect(mongoDBURL, {})
  .then(() => {
    console.log("Database connected successfully");
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.log("MongoDB connection error:");
    console.log(err);
    console.log("MongoDB URL (masked):", mongoDBURL.replace(/:([^:@]+)@/, ':***@'));
  });

// Export app untuk Vercel serverless
export default app;
