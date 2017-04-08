/**
 * Created by Victorien on 24-06-16.
 */

const exec = require('child_process').exec;
const spawn = require('child_process').spawn;
var processID = null;
const path = "/home/pi/TFE/python";
var killProcessDone = false;

connectServer();

//Events

socket.on('timer', function(data){
    console.log("timer event");

    var begin, end, timeRecord;

    if(data.frequency != '*'){
        begin = (parseInt(data.frequency)*24*60*60)+(parseInt(data.begin_hour)*60*60)+(parseInt(data.begin_minute)*60);
        end = (parseInt(data.frequencyEnd)*24*60*60)+(parseInt(data.end_hour)*60*60)+(parseInt(data.end_minute)*60);
        if(begin > end){
            end = end + 604800; //1 week = 604800 sec
        }
    }else{
        begin = (parseInt(data.begin_hour)*60*60)+(parseInt(data.begin_minute)*60);
        end = (parseInt(data.end_hour)*60*60)+(parseInt(data.end_minute)*60);
        if(begin > end){
            end = end + 86400; //1 day = 86400 sec
        }
    }

    timeRecord = end - begin;

    var cmdPython;
    var cron = data.begin_minute+' '+data.begin_hour+' * * '+data.frequency+' pi ';
    if(data.type == 'record'){
        cmdPython = path+'/record/record.py --conf '+path+'/record/conf.json --name '+data.cameraName+' --id '+data.cameraID+' --time '+timeRecord+' --once '+data.once+' --recordID '+data.recordID;
    }else{
        cmdPython = path+'/motion_detection/motion_detector.py --conf '+path+'/motion_detection/conf.json --name '+data.cameraName+' --id '+data.cameraID+' --time '+timeRecord+' --once '+data.once+' --recordID '+data.recordID;
    }
    var cmd = 'echo "'+cron+cmdPython+'" > /etc/cron.d/record'+data.recordID;
    exec(cmd, function(err){ if(err){ throw err;  } });

});


socket.on('killProcess', function(){
    killProcess();
});


socket.on('deleteRecord',function(recordID){
    console.log('delete record event');
    deleteRecords(recordID);
});


socket.on('startDetection', function(data){
    console.log('startDetection event');
    var args = [
        path+"/motion_detection/motion_detector.py",
        "-c",
        path+"/motion_detection/conf.json",
        "--id",
        data.cameraID,
        "--name",
        data.name,
        "-t",
        "0"
    ];
    execCmd(args);
});


socket.on('startStream', function(data){
    console.log('startStream event');

    var args = [
        path+"/liveStream/liveStream.py",
        "--name",
        data.name,
        "--record",
        "False",
        "--id",
        data.cameraID
    ];
    execCmd(args);
});


socket.on('startLiveRecording', function(data){
    console.log('startLiveRecording');
    console.log(data.name);
    var args = [
        path+"/liveStream/liveStream.py",
        "--name",
        data.name,
        "--id",
        data.cameraID,
        "--record",
        "True"
    ];
    execCmd(args);
});


socket.on('getLiveRecording', function(data){
    console.log('getLiveRecording');
    var args = [
        path+"/convertSend/convertSend.py",
        "--id",
        data.cameraID,
        "--name",
        data.name
    ];
    execCmd(args);
});


socket.on('getConfig', function(){
    
});

//Functions-----------------------------


function execCmd(args){
    console.log('execCmd');

    killProcess();
    setTimeout(function(){
        spawn('python',args);
    },1000);

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


function deleteRecords(recordID){
    const deleteRecord = 'rm /etc/cron.d/record'+recordID;
    exec(deleteRecord, function(err){
        if(err){
            throw err;
        }
    });
}



