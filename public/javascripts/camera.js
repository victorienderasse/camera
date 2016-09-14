/**
 * Created by Victorien on 24-06-16.
 */
//var socket = io.connect('http://localhost:3000') ;
const exec = require('child_process').exec;
const spawn = require('child_process').spawn;

connectServer();

//Events

socket.on('timer', function(data){
    console.log("timer event");
    if(data.type == 'record') {
        deleteDetection();
        setTimer(data.begin_hour, data.begin_minute, data.end_hour, data.end_minute, data.frequency, data.cameraName);
    }else{
        deleteRecords();
        setDetection(data.begin_hour, data.begin_minute, data.end_hour, data.end_minute, data.frequency, data.cameraName);
    }
});

socket.on('test', function(cameraID){
   console.log(cameraID);
});


socket.on('deleteRecord',function(){
    console.log('delete record event');
    deleteRecords();
});


socket.on('deleteDetection', function(){
    console.log('deleteDetection event');
    deleteDetection();
});


socket.on('startDetection', function(data){
    console.log('startDetection event');
    killProcess();
    deleteRecords();
    setTimeout(function(){ spawn("python", ["/home/pi/TFE/python/motion_detection/motion_detector.py", "-c", "/home/pi/TFE/python/motion_detection/conf.json", "-n", data.cameraName]); },1000)
});


socket.on('stopDetection', function(data){
    console.log('stopDetection event');
    process.kill(data.processPID);
});


socket.on('startStream', function(cameraID){
    console.log('startStream event');
    killProcess();
    deleteRecords();
    console.log('start stream');
    const startStream = "python /home/pi/TFE/python/liveStream/liveStream.py --id "+cameraID;
    setTimeout(function(){ spawn("python", ["/home/pi/TFE/python/liveStream/liveStream.py", "--id", cameraID]); },1000)
});


socket.on('stopStream', function(data){
    console.log('stopStream event');
    //process.kill(data.processPID);
    killProcess();
});


socket.on('killProcess', function(){
    killProcess();
});



//Functions-----------------------------


function killProcess(){
    console.log('killProcess function');
    spawn('/home/pi/TFE/killProcess.sh');
}


function connectServer(){
    const getSerial = "cat /proc/cpuinfo | grep Serial | cut -d ':' -f 2";
    exec(getSerial, function(error, stdout, stderr){
        if(error){
            console.log('error : '+ error);
        }
        socket.emit('camera', stdout);
    });
}

function deleteRecords(){
    const cmdRecord = "echo '' > /etc/cron.d/record";
    exec(cmdRecord, function(error, stdout, stderr) { if(error){ throw error; } });
}

function deleteDetection(){
    const cmdDetection = 'echo "" > /etc/cron.d/detection';
    exec(cmdDetection, function(error, stdout, stderr){ if(error){ throw error; } });
}


function setDetection(beginHour, beginMinute, endHour, endMinute, frequency, cameraName, cameraID){
    var cronStart = beginMinute+' '+beginHour+' * * '+frequency+' pi ';
    var cmdPython = 'python /home/pi/TFE/python/motion_detection/motion_detector.py -c /home/pi/TFE/python/motion_detection/conf.json -n '+cameraName;
    var cmdStart = 'echo "'+cronStart+cmdPython+'" > /etc/cron.d/detection';
    var cronEnd = endMinute+' '+endHour+' * * '+frequency+' pi ';
    var cmdKill = '/home/pi/TFE/killProcess.sh';
    var cmdEnd = 'echo "'+cronEnd+cmdKill+'" >> /etc/cron.d/detection';
    exec(cmdStart, function(error, stdout, stderr){ if(error){ throw error; } });
    exec(cmdEnd, function(error, stdout, stderr){ if(error){ throw error; } });
}


function setTimer(beginHour, beginMinute, endHour, endMinute, frequency, cameraName){
    console.log('setTimer function');
    //get time to record
    var timeRecord = (((endHour*3600)+(endMinute*60))-((beginHour*3600)+(beginMinute*60)));
    //cron cmd
    var cron = beginMinute+" "+beginHour+" * * "+frequency+" pi ";
    var cmdPython = "python /home/pi/TFE/python/record/record.py -c /home/pi/TFE/python/record/conf.json -t "+timeRecord+" -n "+cameraName;
    var cmd = "echo '"+cron+cmdPython+"' > /etc/cron.d/record";
    console.log(cmd);
    exec(cmd, function(error, stdout, stderr) { if(error){ throw error; } });
}


