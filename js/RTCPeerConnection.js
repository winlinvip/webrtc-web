'use strict';

// https://codelabs.developers.google.com/codelabs/webrtc-web/#4
var lv = document.getElementById("local");

navigator.webkitGetUserMedia({
    video:true,audio:false
},function(stream){
    lv.src = window.URL.createObjectURL(stream);
    console.log("local stream " + lv.src);

    rtcCall(stream);
}, function(error){
    console.error(error);
});

function rtcCall(localStream) {
    // local peer connection setup.
    var pcLocal = new window.webkitRTCPeerConnection(null);
    pcLocal.onicecandidate = function(e) {
        e.candidate && console.log("pcLocal candidate: " + e.candidate.candidate);
        e.candidate && pcRemote.addIceCandidate(new window.RTCIceCandidate(e.candidate));
    };

    // remote peer connection setup.
    var pcRemote = new window.webkitRTCPeerConnection(null);
    pcRemote.onicecandidate = function(e) {
        e.candidate && console.log("pcRemote candidate: " + e.candidate.candidate);
        e.candidate && pcLocal.addIceCandidate(new window.RTCIceCandidate(e.candidate));
    };

    pcRemote.onaddstream = function(e) {
        var rv = document.getElementById("remote");
        rv.src = window.URL.createObjectURL(e.stream);
        console.log("remote stream " + rv.src);
    };

    // trigger connection between local and remote peer.
    pcLocal.addStream(localStream);
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
}
