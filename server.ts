import express from 'express';
import { createServer as createViteServer } from 'vite';
import multer from 'multer';
import { google } from 'googleapis';
import { GoogleGenAI } from '@google/genai';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json());

const upload = multer({ dest: 'uploads/' });

// In-memory fallback database
let fallbackDb: any[] = [];
let nextId = 1;

// Google Sheets setup
let sheets: any = null;
const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

async function initGoogleSheets() {
  if (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY && SPREADSHEET_ID) {
    try {
      const auth = new google.auth.GoogleAuth({
        credentials: {
          client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
          private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        },
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });
      sheets = google.sheets({ version: 'v4', auth });
      console.log('Google Sheets initialized successfully.');
    } catch (error) {
      console.error('Failed to initialize Google Sheets:', error);
    }
  } else {
    console.log('Google Sheets credentials not found. Using in-memory fallback database.');
  }
}

initGoogleSheets();

// Gemini setup
let ai: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY) {
  ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
}

// API Routes

// 1. Get all customers
app.get('/api/customers', async (req, res) => {
  if (sheets && SPREADSHEET_ID) {
    try {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: 'Customers!A:J',
      });
      const rows = response.data.values;
      if (!rows || rows.length === 0) {
        return res.json([]);
      }
      
      const headers = rows[0];
      const customers = rows.slice(1).map((row: any[], index: number) => {
        return {
          id: index + 1, // Use row index as ID for simplicity
          name: row[0] || '',
          phone: row[1] || '',
          address: row[2] || '',
          vehicleType: row[3] || '',
          licensePlate: row[4] || '',
          insuranceCompany: row[5] || '',
          startDate: row[6] || '',
          expirationDate: row[7] || '',
          fee: row[8] || '',
          imageUrl: row[9] || '',
        };
      });
      res.json(customers);
    } catch (error) {
      console.error('Error fetching from Google Sheets:', error);
      res.status(500).json({ error: 'Failed to fetch customers' });
    }
  } else {
    res.json(fallbackDb);
  }
});

// 2. Add a customer
app.post('/api/customers', async (req, res) => {
  const customer = req.body;
  
  if (sheets && SPREADSHEET_ID) {
    try {
      const values = [
        [
          customer.name,
          customer.phone,
          customer.address,
          customer.vehicleType,
          customer.licensePlate,
          customer.insuranceCompany,
          customer.startDate,
          customer.expirationDate,
          customer.fee,
          customer.imageUrl || ''
        ]
      ];
      
      await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: 'Customers!A:J',
        valueInputOption: 'USER_ENTERED',
        requestBody: { values },
      });
      
      res.json({ success: true, message: 'Customer added to Google Sheets' });
    } catch (error) {
      console.error('Error adding to Google Sheets:', error);
      res.status(500).json({ error: 'Failed to add customer' });
    }
  } else {
    const newCustomer = { ...customer, id: nextId++ };
    fallbackDb.push(newCustomer);
    res.json({ success: true, customer: newCustomer });
  }
});

// 3. Update a customer
app.put('/api/customers/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  const customer = req.body;
  
  if (sheets && SPREADSHEET_ID) {
    try {
      // In a real app, you'd need a more robust way to find the row.
      // Assuming ID is row index (1-based after header)
      const rowNumber = id + 1; 
      const range = `Customers!A${rowNumber}:J${rowNumber}`;
      
      const values = [
        [
          customer.name,
          customer.phone,
          customer.address,
          customer.vehicleType,
          customer.licensePlate,
          customer.insuranceCompany,
          customer.startDate,
          customer.expirationDate,
          customer.fee,
          customer.imageUrl || ''
        ]
      ];
      
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values },
      });
      
      res.json({ success: true, message: 'Customer updated in Google Sheets' });
    } catch (error) {
      console.error('Error updating Google Sheets:', error);
      res.status(500).json({ error: 'Failed to update customer' });
    }
  } else {
    const index = fallbackDb.findIndex(c => c.id === id);
    if (index !== -1) {
      fallbackDb[index] = { ...customer, id };
      res.json({ success: true, customer: fallbackDb[index] });
    } else {
      res.status(404).json({ error: 'Customer not found' });
    }
  }
});

// 4. Delete a customer
app.delete('/api/customers/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  
  if (sheets && SPREADSHEET_ID) {
    try {
      // Deleting a row in Google Sheets via API is complex (requires batchUpdate with sheetId).
      // For simplicity in this prototype, we'll just clear the row.
      const rowNumber = id + 1;
      const range = `Customers!A${rowNumber}:J${rowNumber}`;
      
      await sheets.spreadsheets.values.clear({
        spreadsheetId: SPREADSHEET_ID,
        range,
      });
      
      res.json({ success: true, message: 'Customer deleted from Google Sheets' });
    } catch (error) {
      console.error('Error deleting from Google Sheets:', error);
      res.status(500).json({ error: 'Failed to delete customer' });
    }
  } else {
    fallbackDb = fallbackDb.filter(c => c.id !== id);
    res.json({ success: true });
  }
});

// 5. AI Document Scanner (OCR)
app.post('/api/scan', upload.single('image'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No image provided' });
  }
  
  if (!ai) {
    return res.status(500).json({ error: 'Gemini API not configured' });
  }
  
  try {
    const filePath = req.file.path;
    const fileData = fs.readFileSync(filePath);
    const base64Data = fileData.toString('base64');
    
    const prompt = `
      You are an AI OCR assistant for Vietnamese vehicle insurance certificates.
      Extract the following information from this image and return ONLY a JSON object.
      If a field is not found, return an empty string for that field.
      
      Required JSON format:
      {
        "licensePlate": "string (e.g., 29A-123.45)",
        "insuranceCompany": "string (e.g., PJICO, Bảo Việt, PTI)",
        "startDate": "string (format YYYY-MM-DD)",
        "expirationDate": "string (format YYYY-MM-DD)"
      }
    `;
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: [
        {
          parts: [
            { text: prompt },
            {
              inlineData: {
                data: base64Data,
                mimeType: req.file.mimetype,
              }
            }
          ]
        }
      ]
    });
    
    // Clean up uploaded file
    fs.unlinkSync(filePath);
    
    const text = response.text;
    if (text) {
      try {
        const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const data = JSON.parse(jsonStr);
        res.json(data);
      } catch (e) {
        console.error("Failed to parse JSON from Gemini:", text);
        res.status(500).json({ error: 'Failed to parse AI response' });
      }
    } else {
      res.status(500).json({ error: 'Empty response from AI' });
    }
    
  } catch (error) {
    console.error('Error scanning document:', error);
    res.status(500).json({ error: 'Failed to scan document' });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
