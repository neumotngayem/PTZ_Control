// https://deploybot.com/blog/guest-post-how-to-set-up-and-deploy-nodejs-express-application-for-production
const yaml = require('js-yaml');
const express = require('express')
const httpClient = require('urllib');
const fs = require('fs')
var path = require('path')
var morgan = require('morgan');
var rfs = require('rotating-file-stream')

const { createLogger, format, transports } = require('winston');
var control_instances = new Map()
var Cam = require('./lib/onvif').Cam;

const lockfile = require('proper-lockfile');

const app = express()
const port = 8080

var accessLogStream = rfs.createStream('access.log', {
    interval: '1d', // rotate daily
    path: path.join(__dirname, 'log')
})

const { combine, timestamp, label, printf } = format;

const myFormat = printf(({ level, message, label, timestamp }) => {
    return `${timestamp} [${label}] ${level}: ${message}`;
});

const logger = createLogger({
    level: 'info',
    format: combine(
        label({ label: 'PTZ Control' }),
        timestamp(),
        myFormat
    ),
    transports: [
        new transports.File({ filename: 'log/error.log', level: 'error' }),
        new transports.File({ filename: 'log/combined.log' }),
    ],
});

app.use(morgan('common', { stream: accessLogStream }))

app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, PUT, POST");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

//const config = yaml.safeLoad(fs.readFileSync('./config/config.yaml'), 'utf-8');

//console.log(config.camera)

// //================ get PTZ info from database  ==================
// const sqlite3 = require('sqlite3').verbose();
// const db_path = '../../gui_app/shinnyu_kanshi/db.sqlite';

// function select(database) {
//     return new Promise((resolve, reject) => {
//         const db = new sqlite3.Database(database);
//         var queries = [];
//         let sql = `SELECT value value FROM system_settings where camera_id=3 and setting_item_id in (1,4,5,12,13,14)`;
//         db.all(sql, [], function(err, rows) {
//             if (err) {
//                 reject(err);
//             } else {
//                 rows.forEach((row) => {
//                     queries.push(row.value); // get ptz info
//                 });
//                 resolve(queries);
//                 db.close();
//             }
//         });
//     });
// }

// var data = select(db_path);
// var ptz_info = [];
// data.then(
//     result => { ptz_info = result; },
//     error => { console.log(error); }
// );
// // =================end of reading db ==========================
// var ptz_ip, ptz_username, ptz_password, ptz_port;

// if (ptz_info.length > 0) {
//     ptz_ip = ptz_info[0];
//     ptz_username = ptz_info[1];
//     ptz_password = ptz_info[2];
//     ptz_port = ptz_info[3];
// } else {
//     ptz_ip = config.camera.IP;
//     ptz_username = config.camera.USERNAME;
//     ptz_password = config.camera.PASSWORD;
//     ptz_port = config.camera.PORT;
// }


app.get('/', (req, res) => res.send('Hello World!'))

app.get('/requestptz', requestptz);
app.get('/move', move);
app.get('/releaseptz', releaseptz);
app.get('/status', getstatus);
//app.get('/move_center', move_center);

function getstatus(req, res) {
    var camera_id = req.query.camera_id
    camera_id = camera_id.toString()
    var controlCam = control_instances.get(camera_id)
    logger.info('GET STATUS')
    logger.info(controlCam)
    if(typeof controlCam === 'undefined'){
        res.status(503).send('PTZ is not connected!');
        return;
    }
    controlCam.getStatus((a, status) => {
        logger.info(status)
        res.status(200).send(status);
    });

//    var controlCam = new Cam({
//        hostname: camera_ip,
//        username: username,
//        password: password,
//        port: camera_port,
//    }, function(err) {
//        if (err) {
//            logger.info(err)
//            logger.info('Connection Failed ' + camera_ip + ' Port: ' + camera_port + ' Username: ' + username + ' Password: ' + password);
//            res.status(503).send('Cannot connect to your camera');
//        }
//        logger.info('Connected ' + camera_ip + ' Port: ' + camera_port + ' Username: ' + username + ' password: ' + password);
//        controlCam.getStatus((a, status) => {
//            logger.info(status)
//            res.status(200).send(status);
//        });
//    });
}

function requestptz(req, res) {
    var camera_id = req.query.camera_id;
    camera_id = camera_id.toString()
    var controlCam = control_instances.get(camera_id)
    //logger.info(control_instances)
    logger.info(controlCam)
    if(typeof controlCam !== 'undefined'){
        res.status(503).send('PTZ is busy now!');
        return;
    }
    var camera_ip = req.query.camera_ip
    var camera_port = req.query.camera_port
    var username = req.query.username
    var password = req.query.password
    controlCam = new Cam({
        hostname: camera_ip,
        username: username,
        password: password,
        port: camera_port,
    }, function(err) {
        if (err) {
            logger.info(err)
            logger.info('Connection Failed ' + camera_ip + ' Port: ' + camera_port + ' Username: ' + username + ' Password: ' + password);
            res.status(503).send('Cannot connect to your PTZ');
            return;
        }
        logger.info('Connected ' + camera_ip + ' Port: ' + camera_port + ' Username: ' + username + ' password: ' + password);
        control_instances.set(camera_id, controlCam)
        res.status(200).send('You can use PTZ!');
    });
//    if (fs.existsSync(camera_id)){
//        logger.info('FOUND')
//    }else{
//        logger.info('NOT FOUND')
//        fs.writeFile(camera_id.toString(), 'Lock', function (err) {
//            res.status(503).send('Error when lock the PTZ')
//        });
//    }

//    lockfile.lock(camera_id)
//        .then((release) => {
//            // console.log('Locked: ' + clientname);
//            logger.info('Locked: ' + camera_id)
//            res.status(200).send('You can use PTZ!');
//        })
//        .catch((e) => {
//            // either lock could not be acquired
//            // or releasing it failed
//            // console.error(e)
//            logger.error(e)
//            res.status(503).send('PTZ is busy now!');
//        });
}

function move(req, res) {
    var camera_id = req.query.camera_id
    camera_id = camera_id.toString()
    var controlCam = control_instances.get(camera_id)
    logger.info('MOVE')
    logger.info(controlCam)
    if(typeof controlCam === 'undefined'){
        res.status(503).send('PTZ is not connected!');
        return;
    }
    var x = req.query.x;
    var y = req.query.y;
    var z = req.query.z;
    var movetype = req.query.movetype

    if (movetype == 'absolute') {
        controlCam.absoluteMove({
            x: x,
            y: y,
            zoom: z,
            speed: { x: 1, y: 1, z: 1 }
        }, () => {
            res.status(200).send('Moving!');
        });
    } else if (movetype == 'relative') {
        controlCam.relativeMove({
            x: x,
            y: y,
            zoom: z,
            speed: { x: 1, y: 1, z: 1 }
        }, () => {
            res.status(200).send('Moving!');
        });
    } else {
        // console.log('do nothing')
        logger.info('nothing to do!')
    }
}

function releaseptz(req, res) {
    var camera_id = req.query.camera_id;
    camera_id = camera_id.toString()
    var controlCam = control_instances.get(camera_id)
    //logger.info(control_instances)
    logger.info(controlCam)
    if(typeof controlCam === 'undefined'){
        res.status(503).send('Your PTZ is not busy');
        return;
    }
   control_instances.delete(camera_id);
   res.status(200).send('Released PTZ!');
}

app.listen(port, () => console.log(`Example app listening on port ${port}!`))


// create table command
// CREATE TABLE ptz (
// 	camera VARCHAR(255) PRIMARY KEY NOT NULL,
// 	status INTEGER
// );

// INSERT INTO ptz
// VALUES ('ptz1', 0);
