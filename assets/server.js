const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { GoogleGenerativeAI } = require('@google/generative-ai');

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public')); // Serve the frontend from 'public' folder

// Initialize Gemini API
// Make sure to add GEMINI_API_KEY to your .env file
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'MISSING_API_KEY');

app.post('/api/chat', async (req, res) => {
  try {
    const { history, message } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: 'Server configuration error: Missing Gemini API Key. Please add it to your .env file.' });
    }

    // Choose the generative model
    // Gemini 1.5 Flash is recommended for text tasks due to speed and cost
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    // Ensure the history is formatted correctly for the API
    // The Google Generative AI SDK expects history in { role: 'user' | 'model', parts: [{text: '...'}] } format
    const chatSession = model.startChat({
      history: history || [],
      generationConfig: {
        maxOutputTokens: 1000,
        temperature: 0.7,
      },
    });

    const result = await chatSession.sendMessage(message);
    const response = await result.response;
    const text = response.text();

    res.json({ reply: text });
  } catch (error) {
    console.error('Error communicating with Gemini API:', error);
    res.status(500).json({ error: 'Failed to get response from AI. ' + error.message });
  }
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
  if (!process.env.GEMINI_API_KEY) {
    console.warn('\x1b[33m%s\x1b[0m', 'WARNING: GEMINI_API_KEY is not set in the .env file. The chatbot will not work until it is added.');
  }
});
