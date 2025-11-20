<script>
  import { onMount } from 'svelte';
  import { activities, logs, runningActivity } from '$lib/stores';
  
  let newActivityName = '';
  let showEditModal = false;
  let editingLog = null;
  let editLogForm = { activityName: '', startTime: '', endTime: '' };
  let showDeleteConfirm = false;
  let deleteActivityId = null;
  let exportStartDate = '';
  let exportEndDate = '';
  
  // Drag and drop state
  let draggedIndex = null;
  
  onMount(async () => {
    // Load data from server
    await loadData();
  });
  
  async function loadData() {
    try {
      const response = await fetch('/api/logs');
      const data = await response.json();
      activities.set(data.activities || []);
      logs.set(data.logs || []);
      
      // Check if there's a running activity
      const running = data.logs?.find(log => !log.endTime);
      runningActivity.set(running || null);
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  }
  
  async function saveData() {
    try {
      await fetch('/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          activities: $activities, 
          logs: $logs 
        })
      });
      // Reload data to ensure consistency
      await loadData();
    } catch (error) {
      console.error('Failed to save data:', error);
    }
  }
  
  function addNewActivity() {
    if (!newActivityName.trim()) return;
    
    const newActivity = {
      id: Date.now().toString(),
      name: newActivityName.trim(),
      state: 'stopped', // stopped (dark red with START), running (green)
      order: $activities.length
    };
    
    activities.update(acts => [...acts, newActivity]);
    newActivityName = '';
    saveData();
  }
  
  function startActivity(activity) {
    if ($runningActivity) return; // Don't allow starting if something is running
    
    const newLog = {
      id: Date.now().toString(),
      activityName: activity.name,
      activityId: activity.id,
      startTime: new Date().toISOString(),
      endTime: null,
      date: new Date().toLocaleDateString('en-US')
    };
    
    logs.update(l => [...l, newLog]);
    runningActivity.set(newLog);
    
    // Update activity state
    activities.update(acts => 
      acts.map(a => a.id === activity.id ? { ...a, state: 'running' } : a)
    );
    
    saveData();
  }
  
  function stopActivity(activity) {
    if (!$runningActivity || $runningActivity.activityId !== activity.id) return;
    
    const endTime = new Date().toISOString();
    
    logs.update(l => 
      l.map(log => 
        log.id === $runningActivity.id 
          ? { ...log, endTime } 
          : log
      )
    );
    
    runningActivity.set(null);
    
    // Update activity state to stopped
    activities.update(acts => 
      acts.map(a => a.id === activity.id ? { ...a, state: 'stopped' } : a)
    );
    
    saveData();
  }
  
  function formatLogDuration(start, end) {
    const startTime = new Date(start);
    const endTime = new Date(end);
    const diff = endTime - startTime;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    return `${minutes}m`;
  }
  
  function formatLogTime(timestamp) {
    return new Date(timestamp).toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }
  
  $: todayLogs = (() => {
    const today = new Date().toLocaleDateString('en-US');
    return $logs
      .filter(log => log.date === today && log.endTime)
      .sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
  })();
  
  function editActivityName(activity) {
    const newName = prompt('Enter new activity name:', activity.name);
    if (newName && newName.trim()) {
      activities.update(acts => 
        acts.map(a => a.id === activity.id ? { ...a, name: newName.trim() } : a)
      );
      
      // Also update any logs with this activity
      logs.update(l => 
        l.map(log => 
          log.activityId === activity.id 
            ? { ...log, activityName: newName.trim() } 
            : log
        )
      );
      
      saveData();
    }
  }
  
  function confirmDeleteActivity(activityId) {
    deleteActivityId = activityId;
    showDeleteConfirm = true;
  }
  
  function deleteActivity() {
    activities.update(acts => acts.filter(a => a.id !== deleteActivityId));
    saveData();
    showDeleteConfirm = false;
    deleteActivityId = null;
  }
  
  function openEditLogModal(log) {
    editingLog = log;
    const startDate = new Date(log.startTime);
    const endDate = new Date(log.endTime);
    
    editLogForm = {
      activityName: log.activityName,
      startTime: startDate.toTimeString().slice(0, 5),
      endTime: endDate.toTimeString().slice(0, 5)
    };
    showEditModal = true;
  }
  
  function saveEditedLog() {
    if (!editingLog) return;
    
    // Parse the times
    const logDate = new Date(editingLog.startTime);
    const [startHour, startMin] = editLogForm.startTime.split(':').map(Number);
    const [endHour, endMin] = editLogForm.endTime.split(':').map(Number);
    
    const newStartTime = new Date(logDate);
    newStartTime.setHours(startHour, startMin, 0, 0);
    
    const newEndTime = new Date(logDate);
    newEndTime.setHours(endHour, endMin, 0, 0);
    
    // Validate
    if (newEndTime <= newStartTime) {
      alert('End time must be after start time');
      return;
    }
    
    // Update log
    logs.update(l => 
      l.map(log => 
        log.id === editingLog.id 
          ? { 
              ...log, 
              activityName: editLogForm.activityName.trim(),
              startTime: newStartTime.toISOString(),
              endTime: newEndTime.toISOString()
            } 
          : log
      )
    );
    
    saveData();
    showEditModal = false;
    editingLog = null;
  }
  
  function deleteLogEntry() {
    if (!editingLog) return;
    
    if (confirm('Are you sure you want to delete this log entry?')) {
      logs.update(l => l.filter(log => log.id !== editingLog.id));
      saveData();
      showEditModal = false;
      editingLog = null;
    }
  }
  
  async function exportCurrentDay() {
    const today = new Date().toLocaleDateString('en-US');
    const todayISO = new Date().toISOString().split('T')[0];
    
    try {
      const response = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          logs: $logs,
          startDate: todayISO,
          endDate: todayISO
        })
      });
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `time-log-${todayISO}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export data');
    }
  }
  
  async function exportDateRange() {
    if (!exportStartDate || !exportEndDate) {
      alert('Please select both start and end dates');
      return;
    }
    
    if (new Date(exportEndDate) < new Date(exportStartDate)) {
      alert('End date must be after start date');
      return;
    }
    
    try {
      const response = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          logs: $logs,
          startDate: exportStartDate,
          endDate: exportEndDate
        })
      });
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `time-log-${exportStartDate}-to-${exportEndDate}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export data');
    }
  }
  
  // Drag and drop functions
  function handleDragStart(event, index) {
    draggedIndex = index;
    event.dataTransfer.effectAllowed = 'move';
  }
  
  function handleDragOver(event, index) {
    event.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    
    activities.update(acts => {
      const items = [...acts];
      const draggedItem = items[draggedIndex];
      items.splice(draggedIndex, 1);
      items.splice(index, 0, draggedItem);
      draggedIndex = index;
      return items.map((item, idx) => ({ ...item, order: idx }));
    });
  }
  
  function handleDragEnd() {
    draggedIndex = null;
    saveData();
  }
</script>

<div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
  <div class="max-w-7xl mx-auto">
    <!-- Header -->
    <div class="text-center mb-8">
      <h1 class="text-4xl font-heading font-bold text-gray-800 mb-2">Time Tracker</h1>
      <p class="text-xl text-gray-600">
        {new Date().toLocaleDateString('en-US', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        })}
      </p>
    </div>
    
    <!-- Main Content -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <!-- Left Side: Activity Buttons -->
      <div class="bg-white rounded-lg shadow-lg p-6">
        <h2 class="text-2xl font-heading font-semibold text-gray-800 mb-4">Activities</h2>
        
        <!-- New Activity Input -->
        <div class="mb-6">
          <div class="flex gap-2">
            <input
              type="text"
              bind:value={newActivityName}
              placeholder="Enter new activity name..."
              on:keypress={(e) => e.key === 'Enter' && addNewActivity()}
              class="flex-1 px-4 py-3 border-2 border-blue-300 rounded-lg focus:outline-none focus:border-blue-500 transition-colors"
            />
            <button
              on:click={addNewActivity}
              class="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-semibold"
            >
              Add
            </button>
          </div>
        </div>
        
        <!-- Activity Buttons -->
        <div class="space-y-3">
          {#each $activities as activity, index (activity.id)}
            <div
              draggable={true}
              on:dragstart={(e) => handleDragStart(e, index)}
              on:dragover={(e) => handleDragOver(e, index)}
              on:dragend={handleDragEnd}
              class="group relative"
            >
              {#if activity.state === 'running'}
                <!-- Running State: Green Button -->
                <button
                  on:click={() => stopActivity(activity)}
                  class="w-full px-6 py-4 bg-green-500 text-white rounded-lg shadow-md hover:bg-green-600 transition-all font-semibold text-lg text-left"
                >
                  STOP: {activity.name}
                </button>
              {:else if activity.state === 'stopped'}
                <!-- Stopped State: Dark Red Button -->
                <button
                  on:click={() => startActivity(activity)}
                  disabled={$runningActivity !== null}
                  class="w-full px-6 py-4 bg-red-700 text-white rounded-lg shadow-md hover:bg-red-800 transition-all font-semibold text-lg text-left disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  START: {activity.name}
                </button>
              {:else}
                <!-- Initial State: Blue Button -->
                <button
                  on:click={() => startActivity(activity)}
                  disabled={$runningActivity !== null}
                  class="w-full px-6 py-4 bg-blue-500 text-white rounded-lg shadow-md hover:bg-blue-600 transition-all font-semibold text-lg text-left disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {activity.name}
                </button>
              {/if}
              
              <!-- Edit & Delete Icons -->
              {#if activity.state !== 'running'}
                <div class="absolute right-2 top-1/2 -translate-y-1/2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    on:click|stopPropagation={() => editActivityName(activity)}
                    class="p-2 bg-white rounded-full shadow-md hover:bg-gray-100 transition-colors"
                    title="Edit activity name"
                  >
                    <svg class="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                  <button
                    on:click|stopPropagation={() => confirmDeleteActivity(activity.id)}
                    class="p-2 bg-white rounded-full shadow-md hover:bg-red-100 transition-colors"
                    title="Delete activity"
                  >
                    <svg class="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              {/if}
            </div>
          {/each}
        </div>
        
        <!-- Export Section -->
        <div class="mt-8 pt-6 border-t border-gray-200">
          <h3 class="text-lg font-heading font-semibold text-gray-800 mb-4">Export</h3>
          
          <!-- Current Day Export -->
          <button
            on:click={exportCurrentDay}
            class="w-full px-4 py-3 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors font-semibold mb-4"
          >
            Export Today's Log (CSV)
          </button>
          
          <!-- Date Range Export -->
          <div class="space-y-2">
            <div class="flex gap-2">
              <input
                type="date"
                bind:value={exportStartDate}
                class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-indigo-500"
              />
              <span class="self-center text-gray-600">to</span>
              <input
                type="date"
                bind:value={exportEndDate}
                class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-indigo-500"
              />
            </div>
            <button
              on:click={exportDateRange}
              class="w-full px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-semibold"
            >
              Export Date Range (CSV)
            </button>
          </div>
        </div>
      </div>
      
      <!-- Right Side: Live Log Display -->
      <div class="bg-white rounded-lg shadow-lg p-6">
        <h2 class="text-2xl font-heading font-semibold text-gray-800 mb-4">Today's Log</h2>
        
        {#if $runningActivity}
          <div class="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div class="text-green-800 font-semibold mb-2">Currently Running:</div>
            <div class="text-green-900 font-semibold">{$runningActivity.activityName}</div>
            <div class="text-sm text-green-700 mt-1">
              Started: {formatLogTime($runningActivity.startTime)}
            </div>
          </div>
        {/if}
        
        <div class="space-y-2">
          {#each todayLogs as log (log.id)}
            <button
              on:click={() => openEditLogModal(log)}
              class="w-full text-left p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200"
            >
              <div class="flex justify-between items-start">
                <div class="flex-1">
                  <div class="font-semibold text-gray-800 mb-1">{log.activityName}</div>
                  <div class="text-sm text-gray-600">
                    Start: {formatLogTime(log.startTime)} • Stop: {formatLogTime(log.endTime)}
                  </div>
                </div>
                <div class="text-sm font-semibold text-indigo-600">
                  {formatLogDuration(log.startTime, log.endTime)}
                </div>
              </div>
            </button>
          {:else}
            <p class="text-gray-500 text-center py-8">No completed activities yet today</p>
          {/each}
        </div>
      </div>
    </div>
  </div>
</div>

<!-- Edit Log Modal -->
{#if showEditModal}
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
    <div class="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
      <h3 class="text-xl font-heading font-semibold text-gray-800 mb-4">Edit Log Entry</h3>
      
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-1">Activity Name</label>
          <input
            type="text"
            bind:value={editLogForm.activityName}
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-indigo-500"
          />
        </div>
        
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-1">Start Time</label>
          <input
            type="time"
            bind:value={editLogForm.startTime}
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-indigo-500"
          />
        </div>
        
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-1">End Time</label>
          <input
            type="time"
            bind:value={editLogForm.endTime}
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>
      
      <div class="flex flex-col gap-3 mt-6">
        <div class="flex gap-3">
          <button
            on:click={saveEditedLog}
            class="flex-1 px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors font-semibold"
          >
            Save
          </button>
          <button
            on:click={() => { showEditModal = false; editingLog = null; }}
            class="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors font-semibold"
          >
            Cancel
          </button>
        </div>
        <button
          on:click={deleteLogEntry}
          class="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold"
        >
          Delete Log Entry
        </button>
      </div>
    </div>
  </div>
{/if}

<!-- Delete Confirmation Modal -->
{#if showDeleteConfirm}
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
    <div class="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full">
      <h3 class="text-xl font-heading font-semibold text-gray-800 mb-4">Confirm Delete</h3>
      <p class="text-gray-600 mb-6">Are you sure you want to delete this activity? This action cannot be undone.</p>
      
      <div class="flex gap-3">
        <button
          on:click={deleteActivity}
          class="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold"
        >
          Delete
        </button>
        <button
          on:click={() => { showDeleteConfirm = false; deleteActivityId = null; }}
          class="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors font-semibold"
        >
          Cancel
        </button>
      </div>
    </div>
  </div>
{/if}

