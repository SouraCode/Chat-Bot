const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema(
	{
		sessionId: { type: String, required: true, index: true },
		userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
		role: { type: String, enum: ['user', 'assistant', 'system'], required: true },
		content: { type: String, required: true },
	},
	{ timestamps: true }
);

module.exports = mongoose.model('Message', MessageSchema);



