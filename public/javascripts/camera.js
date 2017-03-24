/**
 * Created by Victorien on 24-06-16.
 */
//var socket = io.connect('http://localhost:3000') ;
const exec = require('child_process').exec;
const spawn = require('child_process').spawn;
var processID = null;

connectServer();

//Events

socket.on('timer', function(data){
    console.log("timer event");
    if(data.type == 'record') {
        console.log('record');
        deleteDetection();
        deleteRecords();
        setTimer(data.begin_hour, data.begin_minute, data.end_hour, data.end_minute, data.frequency, data.cameraName);
    }else{
        console.log('detection');
        deleteRecords();
        deleteDetection();
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
    deleteDetection();
    //Settimout pour éviter de kill notre nouveau process
    setTimeout(function(){ spawn("python", ["/home/pi/TFE/python/motion_detection/motion_detector.py", "-c", "/home/pi/TFE/python/motion_detection/conf.json", "-i", data.cameraID, "-t", "0", "-n", data.cameraName]); },1000)
});


socket.on('stopDetection', function(data){
    console.log('stopDetection event');
    killProcess();
});


socket.on('startStream', function(data){
    console.log('startStream event');
    stopProcess();
    deleteRecords();
    deleteDetection();
    console.log('start stream');
    var args = [
        "/home/pi/TFE/python/liveStream/liveStream.py",
        "--name",
        data.name,
        "--record",
        "False",
        "--id",
        data.cameraID
    ];
    setTimeout(function(){
        processID = spawn("python",args);
        console.log('processID : '+processID.pid);
    },500);
});


socket.on('stopProcess', function(data){
    console.log('stopStream event');
    stopProcess();
});


socket.on('killProcess', function(){
    killProcess();
});


socket.on('startLiveRecording', function(data){
    console.log('startLiveRecording');
    killProcess();
    exec.pi
    args = [
        "home/pi/TFE/python/liveStream/liveStream.py",
        "--name",
        data.name,
        "--id",
        data.cameraID,
        "--record",
        "True"
    ];
    setTimeout(function(){
        spawn("python", args);
    },500);
    /*
    const cmd = 'python /home/pi/TFE/python/liveStream/liveStream.py --record True --name '+data.name+' --id '+data.cameraID;
    setTimeout(function(){
        exec(cmd, function(error, stdout, stderr){
            if(error){
                throw error;
            }
        });
    },500);
    */
});


socket.on('getLiveRecording', function(data){
    console.log('getLiveRecording');
    killProcess();

    //Do the stuff to get the live record
    const cmd = 'python /home/pi/TFE/python/convertSend/convertSend.py --id '+data.cameraID+' --name '+data.name;
    setTimeout(function(){
        exec(cmd, function(error, stdout, stderr){
            if(error){
                throw error;
            }
        });
    },500);
});

//Functions-----------------------------

function stopProcess{
    if(processID != null){
        process.kill(processID.pid);
        processID = null;
        console.log('process killed');
    }else{
        console.log('no process running');
    }
}


function killProcess(){
    console.log('killProcess function');
    spawn('/home/pi/TFE/killProcess.sh');
}


function connectServer(){
    const getSerial = "cat /proc/cpuinfo | grep Serial | cut -d ':' -f 2";
    exec(getSerial, function(error, stdout, stderr){
        if(error){
            throw error;
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
    console.log('setDetection function');
    //get time to record
    var timeRecord = (((endHour*3600)+(endMinute*60))-((beginHour*3600)+(beginMinute*60)));
    var cronStart = beginMinute+' '+beginHour+' * * '+frequency+' pi ';
    var cmdPython = 'python /home/pi/TFE/python/motion_detection/motion_detector.py -c /home/pi/TFE/python/motion_detection/conf.json -i '+cameraID+' -t '+timeRecord+' -n '+cameraName;
    var cmdStart = 'echo "'+cronStart+cmdPython+'" > /etc/cron.d/detection';
    exec(cmdStart, function(error, stdout, stderr){ if(error){ throw error; } });
}


function setTimer(beginHour, beginMinute, endHour, endMinute, frequency, cameraName){
    console.log('setTimer function');
    //get time to record
    var timeRecord = (((endHour*3600)+(endMinute*60))-((beginHour*3600)+(beginMinute*60)));
    //cron cmd
    var cron = beginMinute+" "+beginHour+" * * "+frequency+" pi ";
    var cmdPython = "python /home/pi/TFE/python/record/record.py -c /home/pi/TFE/python/record/conf.json -t "+timeRecord+" -n "+cameraName;
    var cmd = "echo '"+cron+cmdPython+"' > /etc/cron.d/record";
    exec(cmd, function(error, stdout, stderr) { if(error){ throw error; } });
}


