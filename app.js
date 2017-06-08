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


socket = require('socket.io-client')('http://victorienderasse.be:3000');


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

    var cron = data.begin_minute+' '+data.begin_hour+' * * '+data.frequency+' root ';

    var type;
    if(data.type == 'record'){
      type = pathPython+'/record.py';
    }else{
      type = pathPython+'/motion_detector.py';
    }

    var cmdPython = 'python '+type+' --conf '+pathPython+'/conf.json --name '+data.cameraName+' --id '+data.cameraID+' --time '+timeRecord+' --once '+data.once+' --planningID '+data.planningID;

    var cmd = 'echo "'+cron+cmdPython+'" > /etc/cron.d/planning'+data.planningID;
    console.log('cmd = '+cmd);
    exec(cmd, function(err){ if(err){ throw err;  } });

  });


  socket.on('killProcess', function(){
    killProcess();
  });


  socket.on('deletePlanning',function(planningID){
    console.log('delete planning event');
    console.log('planningID : '+planningID);
    deletePlanning(planningID);
  });


  socket.on('startDetection', function(data){
    console.log('startDetection event');
    console.log('cameraName: '+data.cameraName);
    var args = [
      pathPython+"/motion_detector.py",
      "-c",
      pathPython+"/conf.json",
      "--id",
      data.cameraID,
      "--name",
      data.cameraName,
      "-t",
      "0"
    ];
    execCmd(args,true);
  });


  socket.on('startStream', function(data){
    console.log('startStream event');

    var args = [
      pathPython+"/liveStream.py",
        "-c",
        pathPython+'/conf.json',
        "--name",
        data.name,
        "--record",
        "False",
        "--id",
        data.cameraID
    ];
    execCmd(args,true);
  });


  socket.on('startLiveRecording', function(data){
    console.log('startLiveRecording');
    console.log(data.name);
    var args = [
      pathPython+"/liveStream.py",
      "-c",
      pathPython+'/conf.json',
      "--name",
      data.name,
      "--id",
      data.cameraID,
      "--record",
      "True"
    ];
    execCmd(args,true);
  });


  socket.on('getLiveRecording', function(data){
    console.log('getLiveRecording');
    var args = [
      pathPython+"/convertSend.py",
      "--id",
      data.cameraID,
      "--name",
      data.name,
      '--conf',
      pathPython+'/conf.json'
    ];
    execCmd(args, true);
  });


  socket.on('getPreview', function(data){
    console.log('getPreview event');

    var args = [
        pathPython+'/preview.py',
        "--id",
        data.cameraID,
        "--resolution",
        data.resolution,
        "--brightness",
        data.brightness,
        "--contrast",
        data.contrast,
        "--conf",
        pathPython+'/conf.json'
    ];
    spawn('python',args);
  });


  socket.on('getConfig', function(data){
    console.log('getConfig event');

    getConfig(function(config){
      socket.emit('getConfigRes', {
        cameraID: data.cameraID,
        cameraName: data.cameraName,
        width:config.width,
        height: config.height,
        fps: config.fps,
        brightness: config.brightness,
        contrast: config.contrast
      });
    });
  });


  socket.on('updateConfigFile', function(data){
    console.log('updateConfigFile');
    getConfig(function(config){
      switch(parseInt(data.resolution)){
        case 1:
          config.width = 640;
          config.height = 480;
          break;
        case 2:
          config.width = 1200;
          config.height = 800;
          break;
        case 3:
          config.width = 1600;
          config.height = 1200;
      }
      config.fps = parseInt(data.fps);
      config.brightness = parseInt(data.brightness);
      config.contrast = parseInt(data.contrast);
      fs.writeFile('../../python/conf.json',JSON.stringify(config));
    });
  });


  socket.on('addWifi', function(cameraID){
    console.log('addWifi event');
    args = [
        pathPython+'/addWifi.py',
        '--id',
        cameraID,
        '--conf',
        pathPython+'/conf.json'
    ];
    execCmd(args,false);
  });


  socket.on('reboot', function(){
    console.log('reboot');
    reboot();
  });


  //Functions-----------------------------


  function execCmd(args,kill){
    console.log('execCmd');

    if(kill){
      killProcess();
    }
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


  function deletePlanning(planningID){
    const deletePlanning = 'rm /etc/cron.d/planning'+planningID;
    exec(deletePlanning, function(err){
      if(err)throw err;
    });
  }


  function getConfig(callback){
    fs.readFile('../../python/conf.json', 'utf8', function(err, data){
      if(err) throw err;
      var obj = JSON.parse(data);
      callback(obj);
    });
  }


  function reboot(){
    exec('sudo reboot');
  }


});

module.exports = app;
