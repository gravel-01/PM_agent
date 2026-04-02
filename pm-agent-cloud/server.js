const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;
const DB_FILE_PATH = path.join(__dirname, 'mock_db_project_context.json');

app.use(cors());
app.use(express.json({ limit: '5mb' }));

function readMockDb() {
  if (!fs.existsSync(DB_FILE_PATH)) {
    return null;
  }

  const rawContent = fs.readFileSync(DB_FILE_PATH, 'utf8');
  return JSON.parse(rawContent);
}

app.post('/api/upload-context', (req, res) => {
  try {
    fs.writeFileSync(DB_FILE_PATH, JSON.stringify(req.body, null, 2), 'utf8');
    res.status(200).json({
      success: true,
      message: 'Context saved successfully.',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to save context.',
      error: error.message,
    });
  }
});

app.get('/api/get-context', (req, res) => {
  try {
    const data = readMockDb();

    if (data === null) {
      return res.status(404).json({
        success: false,
        message: 'No mock context found.',
      });
    }

    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to read context.',
      error: error.message,
    });
  }
});

app.use(express.static(__dirname));

app.listen(PORT, () => {
  console.log(`🚀 Mock cloud brain server is running at http://localhost:${PORT}`);
});
