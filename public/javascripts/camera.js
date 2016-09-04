/**
 * Created by Victorien on 24-06-16.
 */
//var socket = io.connect('http://localhost:3000') ;
const exec = require('child_process').exec;

connectServer();

//Events

socket.on('timer', function(data){
    console.log("on timer");
    setTimer(data.begin_hour, data.begin_minute, data.end_hour, data.end_minute, data.frequency, data.cameraName);
});

socket.on('test', function(cameraID){
   console.log(cameraID);
});


socket.on('deleteRecord',function(){
    const cmd = "echo '' > /etc/cron.d/record";
    exec(cmd, function(error, stdout, stderr) {
        if(error){
            console.log(error);
        }
        console.log('remove record in .etc/cron.d/record file');
    });
});

//Functions-----------------------------


function connectServer(){
    const getSerial = "cat /proc/cpuinfo | grep Serial | cut -d ':' -f 2";
    exec(getSerial, function(error, stdout, stderr){
        if(error){
            console.log('error : '+ error);
        }
        console.log(stdout);
        socket.emit('camera', stdout);
    });
}

function setTimer(beginHour, beginMinute, endHour, endMinute, frequency, cameraName){
    console.log('in function setTimer :');
    //get time to record
    var timeRecord = (((endHour*3600)+(endMinute*60))-((beginHour*3600)+(beginMinute*60)));
    //get frequency for cron
    var freq = "";
    switch(frequency) {
        case 'mon':
            freq = "1";
            break;
        case 'tue':
            freq = "2";
            break;
        case 'wed':
            freq = "3";
            break;
        case 'thu':
            freq = "4";
            break;
        case 'fri':
            freq = "5";
            break;
        case 'sat':
            freq = "6";
            break;
        case 'sun':
            freq = "7";
            break;
        default:
            freq = "*";
    }

    var cron = beginMinute+" "+beginHour+" * * "+freq+" pi ";
    var cmdPython = "python /home/pi/TFE/python/record/record.py -c /home/pi/TFE/python/record/conf.json -t "+timeRecord+" -n "+cameraName;
    var cmd = "echo '"+cron+cmdPython+"' > /etc/cron.d/record";
    console.log(cmd);
    console.log("before exec");
    exec(cmd, function(error, stdout, stderr) {
        if(error){
            console.log(error);
        }
        console.log(stdout);
    });

    console.log("after exec");
}


