import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const eventsFilePath = path.join(
  process.cwd(),
  'src',
  'data',
  'timelines.json',
);

export async function GET() {
  try {
    const fileContents = fs.readFileSync(eventsFilePath, 'utf-8');
    const events = JSON.parse(fileContents);
    return NextResponse.json(events);
  } catch (error) {
    console.error('Error reading events file:', error);
    return NextResponse.json(
      { error: 'Failed to load events data' },
      { status: 500 },
    );
  }
}
