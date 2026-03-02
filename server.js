const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { Groq } = require('groq-sdk');

const app = express();
app.use(cors());
app.use(express.json());

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
});

app.post('/api/chat', async (req, res) => {
    try {
        const { messages, model, temperature } = req.body;

        const completion = await groq.chat.completions.create({
            messages,
            model: model || "llama-3.1-8b-instant",
            temperature: temperature || 0.3,
        });

        res.json(completion.choices[0].message);
    } catch (error) {
        console.error('Groq API Error:', error);
        res.status(500).json({ error: 'Failed to communicate with AI' });
    }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
