/**
 * Created by Victorien on 24-06-16.
 */
//var socket = io.connect('http://localhost:3000') ;
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
    console.log(cmd);
    exec(cmd, function(err){ if(err){ throw err;  } });

});


socket.on('killProcess', function(){
    killProcess();
});


socket.on('deleteRecord',function(recordID){
    console.log('delete record event');
    deleteRecords(recordID);
});


socket.on('deleteDetection', function(){
    console.log('deleteDetection event');
    deleteDetection();
});


socket.on('startDetection', function(data){
    console.log('startDetection event');
    deleteDetection();
    deleteRecords();
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
    deleteDetection();
    deleteRecords();
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

//Functions-----------------------------


function execCmd(args){
    console.log('execCmd');

    killProcess();
    setTimeout(function(){
        spawn('python',args);
    },1000);

    /*
    var kill = spawn('/home/pi/TFE/killProcess.sh');
    kill.on('close',function(){
        console.log('kill');
        var Process = spawn("python",args);
        console.log('process started');
        Process.on('exit',function(){
            console.log('process closed');
        });
    });
    */

    /*
    var interval = setInterval(function(){
        if(killProcessDone){
            console.log('exec');
            processID = spawn("python",args);
            clearInterval(interval);
            killProcessDone = false;
        }else{
            console.log('wait');
        }
    },1);
    */
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
    /*
    Create file (touch)
    write in file (echo)
    Several file allowed
    To delete just delete the file

    > var writeData = spawn('echo',[cronStart,cmdPython,'>','/etc/cron.d/detection/record'+recordID]);


     */
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


