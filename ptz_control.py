import time

from flask import Flask, request, jsonify, render_template
import requests

app = Flask(__name__,
            static_url_path='',
            static_folder='')
ptz_service = 'http://localhost:8080'
REQUEST_URL = ptz_service + '/requestptz?camera_id={}&camera_ip={}&camera_port={}&username={}&password={}'
MOVE_URL = ptz_service + '/move?camera_id={}&x={}&y={}&z={}&movetype=relative'
RELEASE_URL = ptz_service + '/releaseptz?camera_id={}'
STATUS_URL = ptz_service + '/status?camera_id={}'
LEFT = 'left'
RIGHT = 'right'
UP = 'up'
DOWN = 'down'
ZOOM_IN = 'zoom_in'
ZOOM_OUT = 'zoom_out'


@app.route('/requestptz', methods=['POST'])
def request_ptz():
    data = request.json
    camera_id = data['camera_id']
    camera_ip = data['camera_ip']
    camera_port = data['camera_port']
    username = data['ONVIF_username']
    password = data['ONVIF_password']
    # Request ptz control
    requests_url = REQUEST_URL.format(camera_id, camera_ip, camera_port, username, password)
    print('REQUEST URL: {}'.format(requests_url))
    res = requests.get(requests_url)
    print('RESPONSE: {}'.format(res.status_code))
    response = {'status': 'OKAY', 'mess': 'You can use the PTZ now'}
    if res.status_code != 200:
        response = {'status': 'FAIL', 'mess': 'Cannot request PTZ control, please wait !!!'}
    return jsonify(response)


@app.route('/ptzcontrol', methods=['POST'])
def ptz_control():
    data = request.json
    camera_id = data['camera_id']
    # camera_ip = data['camera_ip']
    # camera_port = data['camera_port']
    # username = data['ONVIF_username']
    # password = data['ONVIF_password']
    direction = data['direction']
    num_change = data['num_change']
    print('RECEIVE: {}, {}'.format(direction, num_change))
    try:

        if direction == LEFT:
            x, y, z = -num_change, 0, 0
        if direction == RIGHT:
            x, y, z = num_change, 0, 0
        if direction == UP:
            x, y, z = 0, num_change, 0
        if direction == DOWN:
            x, y, z = 0, -num_change, 0
        if direction == ZOOM_IN:
            x, y, z = 0, 0, num_change
        if direction == ZOOM_OUT:
            x, y, z = 0, 0, -num_change
        # Move the PTZ camera
        move_url = MOVE_URL.format(camera_id, x, y, z)
        print('MOVE URL: {}'.format(move_url))
        requests.get(move_url)
        for _ in range(5):
            status_url = STATUS_URL.format(camera_id)
            res_status = requests.get(status_url)
            data_status = res_status.json()
            print('DATA STATUS: {}'.format(data_status))
            if data_status['moveStatus']['panTilt'] == 'IDLE' and data_status['moveStatus']['zoom'] == 'IDLE':
                break
                time.sleep(0.2)
            time.sleep(0.5)
        response = {'status': 'OKAY', 'mess': 'Done'}
    except Exception as e:
        print(e)
        response = {'status': 'FAIL', 'mess': 'Cannot control you PTZ'}
    # finally:
    #     release_url = RELEASE_URL.format(camera_id)
    #     print('RELEASE URL: {}'.format(release_url))
    #     res_release = requests.get(release_url)
    #     print("RELEASE STATUS: {}".format(res_release))
    print(response)
    return jsonify(response)


@app.route('/ptzrelease', methods=['POST'])
def release_ptz():
    data = request.json
    camera_id = data['camera_id']
    release_url = RELEASE_URL.format(camera_id)
    print('RELEASE URL: {}'.format(release_url))
    res_release = requests.get(release_url)
    print("RELEASE STATUS: {}".format(res_release))
    print('RESPONSE: {}'.format(res_release.status_code))
    response = {'status': 'OKAY', 'mess': 'Released the PTZ'}
    if res_release.status_code != 200:
        response = {'status': 'FAIL', 'mess': 'PTZ is not busy'}
    return jsonify(response)


if __name__ == "__main__":
    app.run(debug=True, host='0.0.0.0', port=5000)
