'use strict';

// https://codelabs.developers.google.com/codelabs/webrtc-web/#4
var lv = document.getElementById("local");

navigator.webkitGetUserMedia({
    video:true,audio:false
},function(stream){
    lv.src = window.URL.createObjectURL(stream);
    console.log("[navigator.webkitGetUserMedia] lv.src=localStream " + lv.src);

    rtcCall(stream);
}, function(error){
    console.error(error);
});

function rtcCall(localStream) {
    // local peer connection setup.
    var pcLocal = new window.webkitRTCPeerConnection(null);
    pcLocal.onicecandidate = function(e) {
        if (!e.candidate) {
            return;
        }
        console.log("[pcLocal.onicecandidate] " + e.candidate.candidate);
        transmitCandidateTo(e.candidate, pcRemote);
    };

    // remote peer connection setup.
    var pcRemote = new window.webkitRTCPeerConnection(null);
    pcRemote.onicecandidate = function(e) {
        if (!e.candidate) {
            return;
        }
        console.log("[pcRemote.onicecandidate] " + e.candidate.candidate);
        transmitCandidateTo(e.candidate, pcLocal);
    };

    var transmitCandidateTo = function(candidate, target) {
        candidate = copyObject(candidate); // To demonstrate candidate transmit over network in JSON.
        target.addIceCandidate(new window.RTCIceCandidate(candidate));
    };

    pcRemote.onaddstream = function(e) {
        var rv = document.getElementById("remote");
        rv.src = window.URL.createObjectURL(e.stream);
        console.log("[pcRemote.onaddstream] rv.src=remoteStream " + rv.src);
    };

    // trigger connection between local and remote peer.
    pcLocal.addStream(localStream);
    console.log("[pcLocal.addStream] add localStream to peer connection");

    pcLocal.createOffer(function(offer){
        pcLocal.setLocalDescription(offer); // trigger pcLocal.onicecandidate().
        console.log("[pcLocal.createOffer] Request with offer " + offer.sdp.length + "B sdp as bellow:");
        console.log(offer);

        transmitOffer(offer);
    }, function(error){
        console.error(error);
    });

    // Local transmit offer to remote.
    var transmitOffer = function(offer) {
        offer = copyObject(offer); // To demonstrate offer transmit over network in JSON.
        setTimeout(onRemoteGotOffer, 200, offer);
    };
    var onRemoteGotOffer = function(offer) {
        pcRemote.setRemoteDescription(offer);
        console.log("[onRemoteGotOffer] Got offer " + offer.sdp.length + "B sdp as bellow:");
        console.log(offer);

        // Since the 'remote' side has no media stream we need
        // to pass in the right constraints in order for it to
        // accept the incoming offer of audio and video.
        pcRemote.createAnswer(function(answer){
            pcRemote.setLocalDescription(answer); // trigger pcRemote.onicecandiate().
            console.log("[pcRemote.createAnswer] Response offer=" + offer.sdp.length + "B answer " + answer.sdp.length + "B sdp as bellow:");
            console.log(answer);

            transmitAnswer(answer);
        }, function(error){
            console.error(error);
        });
    };

    // Remote transmit answer to local.
    var transmitAnswer = function(answer) {
        answer = copyObject(answer); // To demonstrate answer transmit over network in JSON.
        setTimeout(onLocalGotAnswer, 200, answer);
    };
    var onLocalGotAnswer = function(answer) {
        pcLocal.setRemoteDescription(answer);
        console.log("[onLocalGotAnswer] Got answer " + answer.sdp.length + "B sdp as bellow:");
        console.log(answer);
    };
}

function copyObject(obj) {
    var cp = {};
    for (var key in obj) {
        cp[key] = obj[key];
    }
    return cp;
}
