import { json } from '@sveltejs/kit';

function formatDuration(start, end) {
  const ms = new Date(end) - new Date(start);
  const minutes = Math.floor(ms / 60000);
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (hours > 0) {
    return `${hours}h ${remainingMinutes}m`;
  }
  return `${minutes}m`;
}

function formatTime(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleDateString('en-US');
}

/** @type {import('./$types').RequestHandler} */
export async function POST({ request }) {
  try {
    const { logs, startDate, endDate } = await request.json();
    
    console.log('Export request:', { logsCount: logs?.length, startDate, endDate });
    
    // Filter logs based on date range
    let filteredLogs = logs.filter(log => log.endTime);
    
    console.log('Logs with endTime:', filteredLogs.length);
    
    if (startDate && endDate) {
      const start = new Date(startDate + 'T00:00:00');
      const end = new Date(endDate + 'T23:59:59');
      
      console.log('Date range:', { start, end });
      
      filteredLogs = filteredLogs.filter(log => {
        const logDate = new Date(log.startTime);
        console.log('Comparing log:', { logDate, start, end, inRange: logDate >= start && logDate <= end });
        return logDate >= start && logDate <= end;
      });
      
      console.log('Filtered logs:', filteredLogs.length);
    }
    
    // Sort by start time
    filteredLogs.sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
    
    // Build CSV content
    let csv = 'Date,Activity Name,Start Time,End Time,Duration\n';
    
    // Track totals per activity and overall total
    const activityTotals = {};
    let totalMs = 0;
    
    filteredLogs.forEach(log => {
      const date = formatDate(log.startTime);
      const startTime = formatTime(log.startTime);
      const endTime = formatTime(log.endTime);
      const duration = formatDuration(log.startTime, log.endTime);
      
      csv += `${date},"${log.activityName}",${startTime},${endTime},${duration}\n`;
      
      // Calculate totals
      const ms = new Date(log.endTime) - new Date(log.startTime);
      activityTotals[log.activityName] = (activityTotals[log.activityName] || 0) + ms;
      totalMs += ms;
    });
    
    // Add totals section
    csv += '\nActivity Totals\n';
    csv += 'Activity Name,Total Duration\n';
    
    Object.entries(activityTotals).forEach(([activity, ms]) => {
      const minutes = Math.floor(ms / 60000);
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      const duration = hours > 0 ? `${hours}h ${remainingMinutes}m` : `${minutes}m`;
      csv += `"${activity}",${duration}\n`;
    });
    
    // Add total hours worked
    csv += '\nTotal Hours Worked\n';
    const totalMinutes = Math.floor(totalMs / 60000);
    const totalHours = Math.floor(totalMinutes / 60);
    const remainingMinutes = totalMinutes % 60;
    const totalDuration = totalHours > 0 ? `${totalHours}h ${remainingMinutes}m` : `${totalMinutes}m`;
    csv += `Total,${totalDuration}\n`;
    
    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="time-log-${startDate || 'export'}.csv"`
      }
    });
  } catch (error) {
    return json({ error: 'Failed to export data' }, { status: 500 });
  }
}

