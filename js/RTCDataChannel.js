'use strict';

var txtInput = document.getElementById("txtInput");
var btnSend = document.getElementById("btnSend");
var txtReceive = document.getElementById("txtReceive");

// setup local peer connection and data channel.
var pcLocal = new window.webkitRTCPeerConnection(null);
pcLocal.onicecandidate = function(e) {
    e.candidate && console.log("pcLocal candidate: " + e.candidate.candidate);
    e.candidate && pcRemote.addIceCandidate(new window.RTCIceCandidate(e.candidate));
};

var sendChannel = pcLocal.createDataChannel('send', null); // must create channel before createOffer.
sendChannel.onopen = function(){
    console.log("Send channel open");
    btnSend.disabled = false;
};
sendChannel.onclose = function(){
    console.log("Send channel closed");
};

// setup remote peer connection.
var pcRemote = new window.webkitRTCPeerConnection(null);
pcRemote.onicecandidate = function(e) {
    e.candidate && console.log("pcRemote candidate: " + e.candidate.candidate);
    e.candidate && pcLocal.addIceCandidate(new window.RTCIceCandidate(e.candidate));
};

pcRemote.ondatachannel = function(e){
    var recvChannel = e.channel;
    recvChannel.onopen = function() {
        console.log("Receive channel open");
    };
    recvChannel.onclose = function() {
        console.log("Receive channel closed");
    };
    recvChannel.onmessage = function(e){
        console.log("Receive: " + e.data);
        txtReceive.value = e.data;
    };
};

// trigger connection between local and remote peer.
pcLocal.createOffer(function(desc){
    pcLocal.setLocalDescription(desc); // trigger pcLocal.onicecandidate().
    pcRemote.setRemoteDescription(desc);
    console.log("Offer from pcLocal: " + desc.sdp.length + " size sdp");

    fireRemote(desc);
}, function(error){
    console.error(error);
});

// fire remote when got local peer event.
var fireRemote = function(desc){
    // Since the 'remote' side has no media stream we need
    // to pass in the right constraints in order for it to
    // accept the incoming offer of audio and video.
    pcRemote.createAnswer(function(desc){
        pcRemote.setLocalDescription(desc); // trigger pcRemote.onicecandiate().
        pcLocal.setRemoteDescription(desc);
        console.log("Answer from pcRemote: " + desc.sdp.length + " size sdp");
    }, function(error){
        console.error(error);
    });
};

btnSend.disabled = true;
btnSend.onclick = function(){
    var msg = txtInput.value;
    sendChannel.send(msg);
    console.log("Send: " + msg);
};
