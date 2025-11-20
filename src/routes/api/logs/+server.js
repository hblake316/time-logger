import { json } from '@sveltejs/kit';
import fs from 'fs';
import path from 'path';

const DATA_FILE = path.join(process.cwd(), 'time-logs.json');

// Initialize the file if it doesn't exist
function initDataFile() {
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({ logs: [], activities: [] }, null, 2));
  }
}

// Read data from file
function readData() {
  initDataFile();
  const data = fs.readFileSync(DATA_FILE, 'utf-8');
  return JSON.parse(data);
}

// Write data to file
function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

/** @type {import('./$types').RequestHandler} */
export async function GET() {
  try {
    const data = readData();
    return json(data);
  } catch (error) {
    return json({ error: 'Failed to read data', logs: [], activities: [] }, { status: 500 });
  }
}

/** @type {import('./$types').RequestHandler} */
export async function POST({ request }) {
  try {
    const data = await request.json();
    writeData(data);
    return json({ success: true });
  } catch (error) {
    return json({ error: 'Failed to write data' }, { status: 500 });
  }
}

