const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const Message = require('../models/Message');
const mongoose = require('mongoose');

const router = express.Router();

router.post('/chat', async (req, res) => {
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
		await Message.create({ sessionId, role: 'user', content: message });


		let recentMessages = [];
		if (mongoose.connection && mongoose.connection.readyState === 1) {
			// Retrieve last 20 messages from Mongo if connected
			recentMessages = await Message.find({ sessionId })
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
			await Message.create({ sessionId, role: 'assistant', content: assistantMessage });
		}

		return res.json({ reply: assistantMessage });
	} catch (error) {
		console.error('Chat error:', error);
		return res.status(500).json({ error: 'Internal server error' });
	}
});

module.exports = router;


