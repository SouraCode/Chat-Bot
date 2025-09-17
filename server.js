require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// MongoDB connection
async function connectToDatabase() {
	const mongoUri = process.env.MONGODB_URL;
	if (!mongoUri) {
		console.warn('MONGODB_URI not set. Running without database (messages will not persist).');
		return;
	}
	try {
		await mongoose.connect(mongoUri, {
			serverSelectionTimeoutMS: 5000,
		});
		console.log('Connected to MongoDB');
	} catch (error) {
		console.error('Failed to connect to MongoDB:', error.message);
		console.warn('Continuing without database.');
	}
}

// Health check
app.get('/health', (_req, res) => {
	res.json({ status: 'ok' });
});

// API routes
const chatRouter = require('./src/routes/chat');
app.use('/api', chatRouter);

// Static frontend
app.use(express.static('public'));

connectToDatabase().then(() => {
	app.listen(PORT, () => {
		console.log(`Server listening on http://localhost:${PORT}`);
	});
});


