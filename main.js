const scheduler = require('./scheduler');
const electron = require('electron');
const url = require('url');
const path = require('path');
const fs = require('fs');

const {app, BrowserWindow, Menu, Tray, ipcMain} = electron;

let mainWindow;
let tray = null;
let user_schedule = [];
let deleted_schedule = [];

app.on('ready', function() {

    // Load main window
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        resizable: false,
        show: false
    });

    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });

    mainWindow.loadURL(url.format({
        pathname: path.join(__dirname, 'mainWindow.html'),
        protocol: 'file',
        slashes: true
    }));

    mainWindow.on('close', function(e) {
        if (!app.isQuitting) {
            e.preventDefault();
            mainWindow.hide();
        } else {
            mainWindow = null;
            saveSchedule(); 
        }    
           
    });

    var contextMenu = Menu.buildFromTemplate([
        { label: 'Show App', click:  function(){
            mainWindow.show();
        } },
        { label: 'Quit', click:  function(){
            app.isQuitting = true;
            app.quit();
        } }
    ]);

    tray = new Tray(path.join(__dirname + '/icons/icon.jpg'));
    tray.setContextMenu(contextMenu);
    tray.setTitle('Reminders');
    tray.setToolTip('Reminders');
    tray.on('click', () => {
        mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show();
    });

});

ipcMain.on('request:reminder', function(e, id) {
    let index = user_schedule.findIndex((reminderObj) => {
        return id === reminderObj.reminder.id;
    });
    if (index > -1) {
        mainWindow.webContents.send('request:reminder', user_schedule[index].reminder);
    }
});

ipcMain.on('save:reminder', addToSchedule);

ipcMain.on('update:reminder', updateSchedule);

ipcMain.on('schedule:load', function() {
    scheduler.loadPrescheduled().then((schedule) => {
        user_schedule = schedule;
        mainWindow.webContents.send('schedule:loaded', schedule);
    });
});

ipcMain.on('schedule:remove', function(e, id) {
    // Find index of targeted reminder
    let index = user_schedule.findIndex((el) => {
        return el.reminder.id === id;
    });

    // If false alarm then back out
    if (index === -1) {
        console.log('deletion error: index not found');
        return;
    }

    // Unschedule if scheduled === true
    let reminderObject = user_schedule[index];
    if (reminderObject.scheduled) {
        clearTimeout(reminderObject.timeout);
    }

    // Remove from `user_schedule`
    user_schedule.splice(index, 1);
    // Keep in memory to allow 'undo' option
    deleted_schedule.push(reminderObject);

});

function saveSchedule() {

    let reminders = [];
    user_schedule.forEach((obj) => {
        reminders.push(obj.reminder);
    });

    let data = JSON.stringify({'reminders': reminders}, null, 4);
    
    fs.writeFile('test.json', data, 'utf8', (err) => {
        if (err) throw err;
        console.log('Data was saved to file');
    });

}

function addToSchedule(e, reminder) {
    scheduler.createNew(reminder)
        .then((reminderObj) => {
            user_schedule.push(reminderObj);
            mainWindow.webContents.send('save:reminder', reminderObj);
        });
}

function updateSchedule(e, reminder) {
    scheduler.createNew(reminder)
        .then((reminderObj) => {
            let index = user_schedule.findIndex((scheduleItem) => {
                return reminderObj.reminder.id === scheduleItem.reminder.id;
            });
            if (index === -1) {
                throw 'Failed to locate index';
            }
            user_schedule[index] = reminderObj;
            mainWindow.webContents.send('update:reminder', reminderObj);
        })
        .catch((err) => {
            console.error(err);
        });
}


