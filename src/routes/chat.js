
const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const Message = require('../models/Message');
const mongoose = require('mongoose');
const { authenticateToken } = require('./auth');

const router = express.Router();

// Get recent chats for the authenticated user
router.get('/recent', authenticateToken, async (req, res) => {
	try {
		if (!mongoose.connection || mongoose.connection.readyState !== 1) {
			return res.json({ sessions: [] });
		}

		// Find distinct sessionIds for this user
		const sessions = await Message.find({ userId: req.user.userId })
			.where('sessionId').exists(true)
			.where('role').equals('user')
			.sort({ createdAt: -1 })
			.limit(10)
			.distinct('sessionId');
		
		res.json({ sessions });
	} catch (err) {
		console.error('Recent chats error:', err);
		res.status(500).json({ error: 'Server error' });
	}
});

// Get chat history for a specific session
router.get('/history/:sessionId', authenticateToken, async (req, res) => {
	try {
		const { sessionId } = req.params;
		
		if (!mongoose.connection || mongoose.connection.readyState !== 1) {
			return res.json({ messages: [] });
		}

		const messages = await Message.find({ 
			sessionId, 
			userId: req.user.userId 
		})
		.sort({ createdAt: 1 })
		.select('role content createdAt')
		.lean();
		
		res.json({ messages });
	} catch (err) {
		console.error('Chat history error:', err);
		res.status(500).json({ error: 'Server error' });
	}
});

router.post('/chat', authenticateToken, async (req, res) => {
	try {
		const { sessionId, message } = req.body;
		if (!sessionId || !message) {
			return res.status(400).json({ error: 'sessionId and message are required' });
		}

		const apiKey = process.env.GEMINI_API_KEY;
		if (!apiKey) {
			return res.status(500).json({ error: 'Server missing GEMINI_API_KEY. Set it in .env.' });
		}
		const genAI = new GoogleGenerativeAI(apiKey);
	const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });

		// Save user message
		await Message.create({ sessionId, userId: req.user.userId, role: 'user', content: message });


		let recentMessages = [];
		if (mongoose.connection && mongoose.connection.readyState === 1) {
			// Retrieve last 20 messages from Mongo if connected
			recentMessages = await Message.find({ sessionId, userId: req.user.userId })
				.sort({ createdAt: 1 })
				.limit(20)
				.lean();
		}

		const chatHistory = recentMessages.map((m) => ({
			role: m.role === 'assistant' ? 'model' : 'user',
			parts: [{ text: m.content }],
		}));

		const result = await model.generateContent({
			contents: [
				{ role: 'user', parts: [{ text: 'You are a helpful, concise assistant.' }] },
				...chatHistory,
			],
			generationConfig: { temperature: 0.7, maxOutputTokens: 512 },
		});

		const assistantMessage = result.response?.text?.() || '';
		if (!assistantMessage) {
			return res.status(500).json({ error: 'No response from model' });
		}

		if (mongoose.connection && mongoose.connection.readyState === 1) {
			await Message.create({ sessionId, userId: req.user.userId, role: 'assistant', content: assistantMessage });
		}

		return res.json({ reply: assistantMessage });
	} catch (error) {
		console.error('Chat error:', error);
		return res.status(500).json({ error: 'Internal server error' });
	}
});

module.exports = router;


