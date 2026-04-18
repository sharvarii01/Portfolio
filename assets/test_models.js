require('dotenv').config();

async function listModels() {
    try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`);
        const data = await res.json();
        if (data.models) {
             console.log(data.models.map(m => m.name).join(', '));
        } else {
             console.log("Error:", data);
        }
    } catch(e) {
        console.error(e);
    }
}
listModels();
