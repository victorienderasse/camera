const express = require('express');
const path = require('path');
const favicon = require('serve-favicon');
const logger = require('morgan');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const http = require('http');
const exec = require('child_process').exec;
const spawn = require('child_process').spawn;
const fs = require('fs');

const app = express();
const port = 8081;
const pathPython = "/home/pi/TFE/python";

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.set('port', port);

const server = http.createServer(app);

server.listen(port, function(){
  console.log('camera running');
});


// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/public/javascripts', express.static(path.join(__dirname, 'public/javascripts')));
app.use('/public/stylesheets', express.static(path.join(__dirname, 'public/stylesheets')));
app.use('/public/images', express.static(path.join(__dirname, 'public/images')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));


socket = require('socket.io-client')('http://192.168.1.50:3000');


socket.on('connect', function () {


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
      cmdPython = pathPython+'/record/record.py --conf '+pathPython+'/record/conf.json --name '+data.cameraName+' --id '+data.cameraID+' --time '+timeRecord+' --once '+data.once+' --recordID '+data.recordID;
    }else{
      cmdPython = pathPython+'/motion_detection/motion_detector.py --conf '+pathPython+'/motion_detection/conf.json --name '+data.cameraName+' --id '+data.cameraID+' --time '+timeRecord+' --once '+data.once+' --recordID '+data.recordID;
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
      pathPython+"/motion_detection/motion_detector.py",
      "-c",
      pathPython+"/motion_detection/conf.json",
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
      pathPython+"/liveStream/liveStream.py",
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
      pathPython+"/liveStream/liveStream.py",
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
      pathPython+"/convertSend/convertSend.py",
      "--id",
      data.cameraID,
      "--name",
      data.name
    ];
    execCmd(args);
  });


  socket.on('getConfig', function(cameraID){
    fs.readFile('../../python/conf.json', function(err,data){
      if(err) throw err;
      var conf = JSON.parse(data);
      socket.emit('setConfig',{cameraID:cameraID, conf:conf});
    })
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



});

module.exports = app;
