# Spark AI 🚀

A sleek, app-like AI chatbot powered by the Google Gemini API.

## 🌟 Live Demo / App Installation
Try it out live or install it on your phone: **[Link to Spark AI on Render here]**
*(Replace the text above with your actual `https://spark-ai.onrender.com` link!)*

## Features
- **Modern UI**: Polished dark and light mode themes with smooth animations.
- **Progressive Web App (PWA)**: Installable on iOS and Android devices, giving you a native app experience right from your home screen.
- **Persistent History**: Chat sessions are remembered and saved securely inside your browser's local storage.
- **Smart Formatting**: Natively understands and renders markdown, lists, and code blocks.

## Running It Locally

1. Make sure you have [Node.js](https://nodejs.org/) installed.
2. Clone this repository to your computer.
3. Open a terminal in the folder and install the dependencies:
   ```bash
   npm install
   ```
4. Get a free API key from [Google AI Studio](https://aistudio.google.com/app/apikey).
5. Create a file named `.env` in the root folder and add your key:
   ```env
   GEMINI_API_KEY=your_actual_api_key_here
   PORT=3000
   ```
6. Start the server:
   ```bash
   npm start
   ```
7. Open your browser to `http://localhost:3000`.

## Deploying Online

You can host this project completely for free on platforms like [Render.com](https://render.com/). 
Just create a new **Web Service**, connect your GitHub repo, set the Build Command to `npm install` and Start Command to `npm start`. Remember to add your `GEMINI_API_KEY` in the Environment Variables tab on Render!
