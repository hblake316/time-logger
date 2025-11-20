# Time Tracker - SvelteKit Application

A beautiful, single-page time tracking application built with SvelteKit and Tailwind CSS.

## Features

- **Activity Management**: Create, edit, and delete activities with visual state indicators
- **Real-time Tracking**: Track time with live elapsed time display
- **Activity States**: 
  - Blue: Initial/Ready to start
  - Green: Currently running with live timer
  - Dark Red: Stopped (restart available)
- **Live Log Display**: View all activities for the current day in chronological order
- **Edit Log Entries**: Click on any completed activity to edit times and activity name
- **CSV Export**: 
  - Export current day's log
  - Export custom date ranges
  - Includes activity totals
- **Drag & Drop**: Reorder activities by dragging them
- **Data Persistence**: All data stored in JSON file

## Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Open your browser to `http://localhost:5173`

## Usage

### Adding a New Activity
1. Type the activity name in the input field at the top of the left panel
2. Press Enter or click "Add"
3. A new blue button appears for your activity

### Starting/Stopping Activities
- Click a blue button to start tracking time (turns green)
- Click the green button to stop tracking (turns dark red)
- Click a dark red "RESTART" button to start a new session
- Only one activity can run at a time

### Editing Activities
- Hover over any activity button to see edit and delete icons
- Click the pencil icon to rename an activity
- Click the trash icon to delete an activity (with confirmation)

### Editing Log Entries
- Click any completed log entry in the right panel
- Edit the activity name, start time, or end time
- Changes are validated and saved automatically

### Exporting Data
- **Current Day**: Click "Export Today's Log" for a CSV of today's activities
- **Date Range**: Select start and end dates, then click "Export Date Range"
- CSV files include individual entries and activity totals

### Reordering Activities
- Drag and drop activity buttons to reorder them
- Order is automatically saved

## Data Storage

All data is stored in `time-logs.json` in the project root with the following structure:

```json
{
  "activities": [
    {
      "id": "unique-id",
      "name": "Activity Name",
      "state": "stopped",
      "order": 0
    }
  ],
  "logs": [
    {
      "id": "unique-id",
      "activityName": "Activity Name",
      "activityId": "activity-id",
      "startTime": "2024-01-01T10:00:00.000Z",
      "endTime": "2024-01-01T11:00:00.000Z",
      "date": "1/1/2024"
    }
  ]
}
```

## Technologies Used

- **SvelteKit**: Web framework
- **Tailwind CSS**: Styling
- **Google Fonts**: Montserrat (headings), Open Sans (body), Patrick Hand (handwritten)
- **Node.js File System**: JSON data persistence

## Project Structure

```
time-logger/
├── src/
│   ├── routes/
│   │   ├── +page.svelte          # Main application page
│   │   ├── +layout.svelte         # Layout wrapper
│   │   └── api/
│   │       ├── logs/+server.js    # API endpoint for data operations
│   │       └── export/+server.js  # CSV export endpoint
│   ├── lib/
│   │   └── stores.js              # Svelte stores for state management
│   ├── app.html                   # HTML template
│   └── app.css                    # Global styles
├── time-logs.json                 # Data storage (auto-created)
└── package.json
```

## Building for Production

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

## License

MIT

