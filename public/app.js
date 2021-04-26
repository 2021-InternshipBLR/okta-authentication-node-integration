
let width = 320; // We will scale the photo width to this
let height = 0; // This will be computed based on the input stream
let streaming = false;
let video = null;
let canvas = null;
let photo = null;
let startbutton = null;
const faceDetectAPIUrl = 'http://127.0.0.1:5000/face'
/* 
 * Generates a Blob wrapping byte array of the image and the image type
 * @param {String} dataURI - The image is converted into a dataURI
 * @return {Blob} - Blob containing Byte Array of image and the type of image
 */
function dataURItoBlob(dataURI) {
    // convert base64/URLEncoded data component to raw binary data held in a string
    let byteString;
    if (dataURI.split(',')[0].indexOf('base64') >= 0)
        byteString = atob(dataURI.split(',')[1]);
    else
        byteString = unescape(dataURI.split(',')[1]);
    // separate out the mime component
    let mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];
    // write the bytes of the string to a typed array 'ByteArray'
    let ia = new Uint8Array(byteString.length);
    for (let i = 0; i < byteString.length; i++)
        ia[i] = byteString.charCodeAt(i);
    return new Blob([ia], { type: mimeString });
}

/* 
 * Initializing the elements and adding eventlisteners
 * @return {void} - Nothing
 */
function startup() {
    video = document.getElementById('video');
    canvas = document.getElementById('canvas');
    photo = document.getElementById('photo');
    startbutton = document.getElementById('startbutton');

    /*
    getUserMedia is not supported in IE
    Use polyfill which will have the fallback in flash 
    Flash is depecracted as well, better to throw err in case of IE
    */
    navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false
    })
        .then(function (stream) {
            video.srcObject = stream;
            video.play();
        })
        .catch(function (err) {
            if(err.name === 'NotAllowedError'){
                alert("Permission to access the webcam is required to run this program");
            }
            console.log("An error occurred: " + err);
        });
    /*
     * Attaching the event listeners
     */
    video.addEventListener('canplay', function (ev) {
        if (!streaming) {
            height = video.videoHeight / (video.videoWidth / width);
            if (isNaN(height)) {
                height = width / (4 / 3);
            }
            video.setAttribute('width', width);
            video.setAttribute('height', height);
            canvas.setAttribute('width', width);
            canvas.setAttribute('height', height);
            streaming = true;
        }
    }, false);
    startbutton.addEventListener('click', function (ev) {
        takepicture();
        ev.preventDefault();
    }, false);
    //Initializing the mirror canvas with grey
    clearphoto();
}

/* 
 * Clears the canvas and sets it to grey colour
 * @return {void} - Nothing
 */
function clearphoto() {
    let context = canvas.getContext('2d');
    context.fillStyle = "#AAA";
    context.fillRect(0, 0, canvas.width, canvas.height);
    let data = canvas.toDataURL('image/jpeg');
    photo.setAttribute('src', data);
}

/* 
 * Captures the image from webcam and sets it to the canvas and passes the image data and the url to sendData
 * @return {void} - Nothing
 */
function takepicture() {
    let context = canvas.getContext('2d');
    if (width && height) {
        canvas.width = width;
        canvas.height = height;
        context.drawImage(video, 0, 0, width, height);
        let data = canvas.toDataURL('image/png', 1.0);
        //console.log(data)
        let datauri = dataURItoBlob(data)
        photo.setAttribute('src', data);
        sendData(datauri, faceDetectAPIUrl)
    } 
}

/* 
 * Sends the data to the url passed to the func
 * @param {Byte Array} img - Contains the image data in byte array form
 * @param {String} url - The url to the API for making the requests
 * @return {void} - Nothing
 */
function sendData(img, url) {
    let xhr = new XMLHttpRequest();
    //console.log('in xhr', img)
    let fd = new FormData();
    fd.append("imgarr", img);
    xhr.open('POST', url, true);
    xhr.onload = function () {
        if (this.status == 200) {
            let resp = JSON.parse(this.response);
            console.log('Server response:', resp);
            let txt = document.getElementById('numoffaces');
            txt.innerText = "Number of faces : " + resp;
        };
    };
    xhr.send(fd);
}
window.addEventListener('load', startup, false);










// face = sendData(image, faceUrl);
// name = sendData(image, nameURL);
// registration = sendData(formdata, regURL);

// function sendData(data, url) {

// }

// function faceAuth() {

//     if ('1' == 1)
//         authenticate;
// }
