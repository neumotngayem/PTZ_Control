
var Cam = require('./lib/onvif').Cam;
const util = require('util');
const yaml = require('js-yaml');
const fs = require('fs');
const { linerase } = require('./lib/utils');
const config =  yaml.safeLoad(fs.readFileSync('./config/config.yaml'), 'utf-8');
// console.log(config)

new Cam({
	hostname: config.camera.IP,
	username: config.camera.USERNAME,
	password: config.camera.PASSWORD,
	port: config.camera.PORT
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

	var options = util.inspect(newProfile, {showHidden: false, depth: null})

	this.setVideoEncoderConfiguration(newProfile, function(err, data, xml) {
		if (err) {
			console.log("SetVideoEncoder faileddddd");
			console.log(err);
			return;
		}
		console.log(data, xml)
	})
	this.absoluteMove({
		x: 0,
		y: 1,
		zoom: 0
	})
});
