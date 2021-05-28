var http = require('http');
var url = require('url');
var Cam = require('./lib/onvif').Cam;
const util = require('util');
const yaml = require('js-yaml');
const fs = require('fs');
const { linerase } = require('./lib/utils');
const config =  yaml.safeLoad(fs.readFileSync('./config/config.yaml'), 'utf-8');
const writeIniFile = require('write-ini-file')
var controlCam = new Cam({
	hostname: config.camera.IP,
	username: config.camera.USERNAME,
	password: config.camera.PASSWORD,
    port: config.camera.PORT,
}, function(err) {
	if (err) {
		console.log('Connection Failed for ' + config.camera.IP + ' Port: ' + config.camera.PORT + ' Username: ' + config.camera.USERNAME + ' Password: ' + config.camera.PASSWORD);
		return;
	} else {
	console.log('CONNECTED');
	};
	console.log(this)
	let jsondata = JSON.stringify(this)
	fs.writeFileSync('camera_data.json', jsondata)
	var newProfile = this.profiles[0].videoEncoderConfiguration
	newProfile.resolution = {
		width: config.profiles[config.currentProfile].width,
		height: config.profiles[config.currentProfile].height
	}
	newProfile.rateControl.bitrateLimit = config.profiles[config.currentProfile].bitrateLimit

	options = util.inspect(newProfile, {showHidden: false, depth: null})

	this.setVideoEncoderConfiguration(newProfile, function(err, data, xml) {
		if (err) {
			console.log("SetVideoEncoder faileddddd");
			console.log(err);
			return;
		}
		console.log(data, xml)
    })
});

http.createServer(function (req, res) {
    res.writeHead(200, {'Content-Type': 'text/html'});
    var q = url.parse(req.url, true).query;
    var checkStatus = q.check
    if(checkStatus == '0'){
        var x = q.x
        var y = q.y
        var z = q.z
        controlCam.getStatus((a, status) => {
            //console.log(a);
            console.log(checkStatus);
            console.log(status);
            if (status !== null){
                var current_x = status.position.x
                var current_y = status.position.y
                var current_z = status.position.zoom
                var panTilt = status.moveStatus.panTilt
                var zoom = status.moveStatus.zoom
                if (panTilt == 'IDLE' || zoom == 'IDLE'){
                    controlCam.absoluteMove({
                        x: x,
                        y: y,
                        zoom: z
                    })
                }
            }
        });
    } else if (checkStatus == '1') {
        controlCam.getStatus((a, status) => {
            console.log(checkStatus);
            console.log(status);
            if (status !== null){
                var panTilt = status.moveStatus.panTilt
                var zoom = status.moveStatus.zoom
                if (panTilt == 'IDLE' || zoom == 'IDLE'){   
                    item = {Status: { PTZ: 'IDLE'}}   
                    writeIniFile('status.ini', item).then(() => {
                        console.log('CHECK STATUS PTZ: IDLE')
                    })
                } else {
                    item = {Status: { PTZ: 'MOVING'}}  
                    writeIniFile('status.ini', item).then(() => {
                        console.log('CHECK STATUS PTZ: MOVING')
                    })
                }
            }
        });
    } else {
        var x = q.x
        var y = q.y
        var z = q.z
        controlCam.getStatus((a, status) => {
            //console.log(a);
            console.log(checkStatus);
            console.log(status);
            if (status !== null){
                var current_x = status.position.x
                var current_y = status.position.y
                var current_z = status.position.zoom
                var panTilt = status.moveStatus.panTilt
                var zoom = status.moveStatus.zoom
                if (panTilt == 'IDLE' || zoom == 'IDLE'){
                    controlCam.relativeMove({
                        x: x,
                        y: y,
                        zoom: z
                    })
                }
            }
        });
    }
    res.end("oke");
}).listen(8080);
