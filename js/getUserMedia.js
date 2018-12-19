'use strict';

// https://codelabs.developers.google.com/codelabs/webrtc-web/#3
var video = document.getElementById("main");

// https://webrtc.org/web-apis/interop/
navigator.webkitGetUserMedia({
    video:true,audio:false
}, function(stream){
    try {
        video.src = window.URL.createObjectURL(stream);
    } catch (error) {
        video.srcObject = stream;
    }
}, function(error){
    console.error(error);
});
