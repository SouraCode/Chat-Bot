const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const mongoose = require('mongoose');

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
	const authHeader = req.headers['authorization'];
	const token = authHeader && authHeader.split(' ')[1];

	if (!token) {
		return res.status(401).json({ error: 'Access token required' });
	}

	jwt.verify(token, JWT_SECRET, (err, user) => {
		if (err) {
			return res.status(403).json({ error: 'Invalid or expired token' });
		}
		req.user = user;
		next();
	});
};

// Signup
router.post('/signup', async (req, res) => {
	try {
		const { email, password, name } = req.body;

		if (!email || !password || !name) {
			return res.status(400).json({ error: 'Email, password, and name are required' });
		}

		if (password.length < 6) {
			return res.status(400).json({ error: 'Password must be at least 6 characters' });
		}

		// Check if user already exists
		if (mongoose.connection && mongoose.connection.readyState === 1) {
			const existingUser = await User.findOne({ email });
			if (existingUser) {
				return res.status(400).json({ error: 'User already exists with this email' });
			}
		}

		// Create new user
		const user = new User({ email, password, name });
		if (mongoose.connection && mongoose.connection.readyState === 1) {
			await user.save();
		}

		// Generate JWT token
		const token = jwt.sign(
			{ userId: user._id, email: user.email },
			JWT_SECRET,
			{ expiresIn: '24h' }
		);

		res.status(201).json({
			message: 'User created successfully',
			token,
			user: { id: user._id, email: user.email, name: user.name }
		});

	} catch (error) {
		console.error('Signup error:', error);
		res.status(500).json({ error: 'Internal server error' });
	}
});

// Signin
router.post('/signin', async (req, res) => {
	try {
		const { email, password } = req.body;

		if (!email || !password) {
			return res.status(400).json({ error: 'Email and password are required' });
		}

		if (!mongoose.connection || mongoose.connection.readyState !== 1) {
			return res.status(500).json({ error: 'Database not connected' });
		}

		// Find user
		const user = await User.findOne({ email });
		if (!user) {
			return res.status(401).json({ error: 'Invalid email or password' });
		}

		// Check password
		const isPasswordValid = await user.comparePassword(password);
		if (!isPasswordValid) {
			return res.status(401).json({ error: 'Invalid email or password' });
		}

		// Generate JWT token
		const token = jwt.sign(
			{ userId: user._id, email: user.email },
			JWT_SECRET,
			{ expiresIn: '24h' }
		);

		res.json({
			message: 'Signin successful',
			token,
			user: { id: user._id, email: user.email, name: user.name }
		});

	} catch (error) {
		console.error('Signin error:', error);
		res.status(500).json({ error: 'Internal server error' });
	}
});

// Get current user
router.get('/me', authenticateToken, async (req, res) => {
	try {
		if (!mongoose.connection || mongoose.connection.readyState !== 1) {
			return res.status(500).json({ error: 'Database not connected' });
		}

		const user = await User.findById(req.user.userId).select('-password');
		if (!user) {
			return res.status(404).json({ error: 'User not found' });
		}

		res.json({ user });
	} catch (error) {
		console.error('Get user error:', error);
		res.status(500).json({ error: 'Internal server error' });
	}
});

module.exports = { router, authenticateToken };