import express from 'express';
import cors from 'cors';
import apiRoutes from './routes/api.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Register API routes
app.use('/api', apiRoutes);

app.get('/', (req, res) => {
  res.send('AI Study Companion Backend is running!');
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log('Ensure Ollama is running (default: http://localhost:11434)');
});
