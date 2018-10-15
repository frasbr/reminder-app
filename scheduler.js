const fs = require('fs');
const moment = require('moment');
const notifier = require('node-notifier');

let loadPrescheduled = async function() {
    // Returns a promise containing an array of schedule objects (reminder.id & associated setTimeout object)
    return getData()
        .then(async (data) => {
            let reminders = JSON.parse(data).reminders;
            let schedule = [];
            for (const reminder of reminders) {
                let obj = await pushReminder(reminder);
                schedule.push(obj);
            }
            return schedule;
        });
}

let createNewNotification = async function(reminder) {
    // Returns a promise containing a schedule object
    let obj = await pushReminder(reminder);
    return obj;
}

async function pushReminder(reminder) {

    let obj = {
        'reminder': reminder,
        'timeout': null,
        'scheduled': false
    }

    if (shouldBeScheduled(reminder)) {
        let timeObj = await schedule(reminder);
        obj.timeout = timeObj;
        obj.scheduled = true;
    } else if (overdue(reminder)) {
        reminder.overdue = true;
    }

    return obj;

}



function getData() {

    return new Promise((resolve, reject) => {
        fs.readFile('test.json', (err, buffer) => {
            err ? reject(err) : resolve(buffer);
        });
    });

}

function shouldBeScheduled(reminder) {

    const currentTime = moment();
    const thresholdTime = currentTime.clone().add(24,'hours');
    const reminderTime = moment(reminder.remindFrom);

    if (reminderTime.isAfter(currentTime) && reminderTime.isBefore(thresholdTime)) {
        return true;
    }

    return false;

}

function overdue(reminder) {

    const currentTime = moment();
    const reminderTime = moment(reminder.remindFrom);
    if (reminderTime.isBefore(currentTime)) return true;
    return false;

}

async function schedule(reminder) {

    const time = moment(reminder.remindFrom).diff(moment());
    let timeObj = await setTimeout(() => {
        remind(reminder);
    }, time);
    console.log('Notification scheduled for: ' + moment(reminder.remindFrom).format('HH:mm:ss'));
    return timeObj;

}

function remind(reminder) {

    notifier.notify({
        id: reminder.id,
        title: reminder.title,
        message: reminder.message,
        wait: true
    }, (err, res) => {
        // Do nothing...
    })

}

module.exports.loadPrescheduled = loadPrescheduled;
module.exports.createNew = createNewNotification;