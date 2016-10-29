// app code goes here
// matrix.init()....
//
// have fun

var fs = require('fs'),
async = require('async'),
player = require('play-sound')(opts = {}),
EventEmitter = require('events').EventEmitter;

//////////////////////// MOUSE EVENTS ////////////////////////

/**
 * Parse PS/2 mouse protocol
 * According to http://www.computer-engineering.org/ps2mouse/
 */
function parse(mouse, buffer) {
  var event = {
    leftBtn:    (buffer[0] & 1  ) > 0, // Bit 0
    rightBtn:   (buffer[0] & 2  ) > 0, // Bit 1
    middleBtn:  (buffer[0] & 4  ) > 0, // Bit 2
    xSign:      (buffer[0] & 16 ) > 0, // Bit 4
    ySign:      (buffer[0] & 32 ) > 0, // Bit 5
    xOverflow:  (buffer[0] & 64 ) > 0, // Bit 6
    yOverflow:  (buffer[0] & 128) > 0, // Bit 7
    xDelta:      buffer.readInt8(1),   // Byte 2 as signed int
    yDelta:      buffer.readInt8(2)    // Byte 3 as signed int
  };
  if (event.leftBtn || event.rightBtn || event.middleBtn) {
    event.type = 'button';
  } else {
    event.type = 'moved';
  }
  return event;
}

function Mouse(mouseid) {
  this.wrap('onOpen');
  this.wrap('onRead');
  this.dev = typeof(mouseid) === 'number' ? 'mouse' + mouseid : 'mice';
  this.buf = new Buffer(3);
  fs.open('/dev/input/' + this.dev, 'r', this.onOpen);
}

Mouse.prototype = Object.create(EventEmitter.prototype, {
  constructor: {value: Mouse}
});

Mouse.prototype.wrap = function(name) {
  var self = this;
  var fn = this[name];
  this[name] = function (err) {
    if (err) return self.emit('error', err);
    return fn.apply(self, Array.prototype.slice.call(arguments, 1));
  };
};

Mouse.prototype.onOpen = function(fd) {
  this.fd = fd;
  this.startRead();
};

Mouse.prototype.startRead = function() {
  fs.read(this.fd, this.buf, 0, 3, null, this.onRead);
};

Mouse.prototype.onRead = function(bytesRead) {
  var event = parse(this, this.buf);
  event.dev = this.dev;
  this.emit(event.type, event);
  if (this.fd) this.startRead();
};

Mouse.prototype.close = function (callback) {
  fs.close(this.fd, (function () { /*console.log(this);*/ }));
  this.fd = undefined;
};
//////////////////////// MOUSE EVENTS END ////////////////////////

var perfectHit = false;
var okHit = false;
var okValueHigh = 44;
var perfectValueHigh = 30;
var perfectValueLow = 24;
var okValueLow = 14;
var currentLed;

//MXSS ACTIONS
matrix.on('leftClick', function() { 
  onLeftClick();
});

matrix.on('rightClick', function() { 
  onRightClick();
});

// MOUSE ACTIONS
var mouse = new Mouse();
mouse.on('button', function (actions) {
  if (actions.leftBtn) onLeftClick();
  else if (actions.rightBtn) onRightClick();
});

var leftClickCooldown = 100,
leftClickLock = false, leftClickTimer;
var rightClickCooldown = 100,
rightClickLock = false, rightClickTimer;

function onLeftClick() {
  if (currentLed <= perfectValueHigh && currentLed >= perfectValueLow) {
    console.log("*********************************** PERFECT HIT *********************************** (" + perfectValueLow + " < " + currentLed + " < " + perfectValueHigh + ")");
    perfectHit = true;
  } else if (currentLed <= okValueHigh && currentLed >= okValueLow) {
    console.log("*********************************** OK HIT *********************************** (" + okValueLow + " < " + currentLed + " < " + okValueHigh + ")");
    okHit = true;
  } else {
    console.log("*********************************** RANDOM HIT *********************************** (" + currentLed + ")");
  }
  if (!leftClickLock) {
    leftClickLock = true;
    flashArc(0, 360, 'blue', 500, true, function () {});
    console.log("Left click!");

    leftClickTimer = setTimeout(function() {
      clearTimeout(leftClickTimer);
      leftClickLock = false;
    }, leftClickCooldown);
  }
}

function onRightClick() {
  if (!rightClickLock) {
    rightClickLock = true;
    flashArc(0, 360, 'red', 500, true, function () {});
    console.log("Right click!");

    rightClickTimer = setTimeout(function() {
      clearTimeout(rightClickTimer);
      rightClickLock = false;
    }, rightClickCooldown);
  }
}



start(); //Intro arc


function start() {
  player.play(__dirname + '/Sounds/Arcade/start.wav', function (err) {});
  async.series([
    async.apply(flashArc, 0, 90, 'red', 250, true),
    async.apply(flashArc, 90, 90, 'blue', 250, true),
    async.apply(flashArc, 180, 90, 'green', 250, true),
    async.apply(flashArc, 270, 90, 'yellow', 250, true)
  ],
  function(){
    var loopProcess;
    function loop(filepath) { 
      loopProcess = player.play(filepath, function (err) {});
      looped = loopProcess;
      loopProcess.on('close', function (code) {
        return loop(filepath);
      });
    }

    loop(__dirname + '/Sounds/Arcade/628217_Little-Retro-Arcade-Lobby-.mp3'); //Loop BGM
    
    var ledArray = [];
    ledArray.push(drawScoreBarObject('white')); //Set score bar 0
    ledArray.push({
      arc: okValueHigh - perfectValueHigh,
      color: 'yellow',
      start: perfectValueHigh
    });
    ledArray.push({
      arc: perfectValueHigh - perfectValueLow,
      color: 'green',
      start: perfectValueLow
    });
    ledArray.push({
      arc: perfectValueLow - okValueLow,
      color: 'yellow',
      start: okValueLow
    });
    
    startRunning(2);

    var failCount = 0;
    var failedCounter = 0;
    var perfectCounter = 0;
    var okCounter = 0;
    var perfectCounterNumber = 0;
    var okCounterNumber = 0;
    function startRunning(speed) {
      currentLed = 340;
      var previousLed;
      var endingLed = 10;
      
      var timeout = setInterval(function () {
        if (failedCounter > 0) {
          failedCounter--;
          ledArray = [];
          ledArray.push(drawScoreBarObject('red'));
        } else if (perfectCounter > 0) {
          perfectCounter--;
          ledArray = [];
          ledArray.push(drawScoreBarObject('green'));
        } else if (okCounter > 0) {
          okCounter--;
          ledArray = [];
          ledArray.push(drawScoreBarObject('yellow'));
        } else {
          ledArray = [];
          ledArray.push(drawScoreBarObject('white'));
          ledArray.push({
            arc: okValueHigh - perfectValueHigh,
            color: 'yellow',
            start: perfectValueHigh
          });
          ledArray.push({
            arc: perfectValueHigh - perfectValueLow,
            color: 'green',
            start: perfectValueLow
          });
          ledArray.push({
            arc: perfectValueLow - okValueLow,
            color: 'yellow',
            start: okValueLow
          });
          ////
          if (ledArray.length > 4) ledArray.splice(-1, 1);
        }
        previousLed = currentLed;
        if (currentLed > 0) currentLed -= 2;
        ledArray.push({ angle: currentLed, color: 'magenta' });
        matrix.led(ledArray).render();
        if (currentLed <= endingLed) {
          player.play(__dirname + '/Sounds/Arcade/miss.wav', function (err) {});
          failCount++;
          //ledArray.splice(-1, 1);
          ledArray = [];
          ledArray.push(drawScoreBarObject('red'));
          failedCounter = 20;
          //ledArray.push({ angle: currentLed, color: 'magenta' });
          matrix.led(ledArray).render();
          matrix.type('clickGames').send({
                'failCount': failCount
          });

          if (failCount == 3000) {
            clearTimeout(timeout);
            loopProcess.kill();
            player.play(__dirname + '/Sounds/Arcade/explosion.wav', function (err) {});
          } else {
            currentLed = 340;
          }
        } else if (perfectHit) {
          perfectCounterNumber += 1;
          matrix.type('clickGames').send({
                'perfect': perfectCounterNumber
          });
          perfectCounter = 20;
          player.play(__dirname + '/Sounds/Arcade/perfect.wav', function (err) {});
          currentLed = 340;
          perfectHit = false;
        } else if (okHit) {
          okCounterNumber += 1;
          matrix.type('clickGames').send({
                'ok': okCounterNumber
          });
          okCounter = 20;
          player.play(__dirname + '/Sounds/Arcade/progress.wav', function (err) {});
          currentLed = 340;
          okHit = false;
        }
      }, speed);
    }
        
  });
}

function drawScoreBarObject(color) { 
  return {
    arc: 30,
    color: color, // color
    start: 340 // index to start drawing arc
  };
}

var difficulty = 0;

function flashArc(start, length, color, time, reset, callback) {
  matrix.led({
    arc: length, // degrees of arc [ 90° = quadrant ]
    color: color, // color
    start: start // index to start drawing arc
  }).render();

  setTimeout(function () {
    if (reset) matrix.led('black').render();
    callback();
  }, time);
}

//mouse.on('moved', console.log);

// to read only a specific mouse by id (e.g. /dev/input/mouse0) use
// var mouse0 = newMouse(0);

// to close mouse
// mouse.close();
// mouse = undefined;

/*
leftBtn: true,
rightBtn: false,
middleBtn: false,
xSign: false,
ySign: true,
xOverflow: false,
yOverflow: false,
xDelta: 0,
yDelta: -1,
type: 'button',
dev: 'mice' }
*/