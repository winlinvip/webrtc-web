'use strict';

// https://codelabs.developers.google.com/codelabs/webrtc-web/#4
var pcLocal = null;
var transmitLocalCandidate = null;
var transmitLocalOffer = null;
var pcRemote = null;
var transmitRemoteCandidate = null;
var transmitRemoteAnswer = null;

new Promise(function(resolve, reject){
    navigator.webkitGetUserMedia({
        video:true,audio:false
    },function(stream){
        resolve(stream);
    }, function(error){
        reject(error);
    });
}).then(function(stream){
    var lv = document.getElementById("local");
    lv.src = window.URL.createObjectURL(stream);
    console.log("[navigator.webkitGetUserMedia] lv.src=localStream " + lv.src);

    return stream;
}).then(function(localStream){
    // local peer connection setup.
    pcLocal = new window.webkitRTCPeerConnection(null);
    pcLocal.onicecandidate = function(e) {
        console.log("[pcLocal.onicecandidate] e=" + (e.candidate? e.candidate.candidate:"null"));
        if (e.candidate) {
            // transmit candidate to remote.
            transmitLocalCandidate(e.candidate);
        }
    };
    pcLocal.addStream(localStream);
    console.log("[pcLocal.addStream] add localStream to peer connection");

    // remote peer connection setup.
    pcRemote = new window.webkitRTCPeerConnection(null);
    pcRemote.onicecandidate = function(e) {
        console.log("[pcRemote.onicecandidate] e=" + (e.candidate? e.candidate.candidate:"null"));
        if (e.candidate) {
            // transmit candidate to local.
            transmitRemoteCandidate(e.candidate);
        }
    };
    pcRemote.onaddstream = function(e) {
        var rv = document.getElementById("remote");
        rv.src = window.URL.createObjectURL(e.stream);
        console.log("[pcRemote.onaddstream] rv.src=" + rv.src);
    };
}).then(function(){
    // Fire local video.
    Promise.all([new Promise(function(resolve, reject){
        transmitRemoteCandidate = function(candidate) {
            resolve(candidate);
        };
    }), new Promise(function(resolve, reject){
        transmitRemoteAnswer = function(answer) {
            resolve(answer);
        };
    })]).then(function([candidate, answer]){
        pcLocal.setRemoteDescription(answer);
        console.log("[onLocalGotAnswer] Got answer " + answer.sdp.length + "B sdp as bellow:");
        console.log(answer);

        console.log("[pcLocal.addIceCandidate] " + candidate.candidate);
        pcLocal.addIceCandidate(new window.RTCIceCandidate(copyObject(candidate)));
    });

    // Fire remote video.
    Promise.all([new Promise(function(resolve, reject){
        transmitLocalCandidate = function(candidate) {
            resolve(candidate);
        };
    }), new Promise(function(resolve, reject){
        transmitLocalOffer = function(offer) {
            resolve(offer);
        };
    })]).then(function([candidate,offer]){
        // once got the peer offer(SDP), we can generate our answer(SDP).
        pcRemote.setRemoteDescription(offer); // trigger pcRemote.onaddstream

        console.log("[pcRemote.addIceCandidate] " + candidate.candidate);
        pcRemote.addIceCandidate(new window.RTCIceCandidate(copyObject(candidate)));

        // Since the 'remote' side has no media stream we need
        // to pass in the right constraints in order for it to
        // accept the incoming offer of audio and video.
        pcRemote.createAnswer(function(answer){
            pcRemote.setLocalDescription(answer); // trigger pcRemote.onicecandiate().
            console.log("[pcRemote.createAnswer] answer " + answer.sdp.length + "B sdp as bellow:");
            console.log(answer);

            setTimeout(transmitRemoteAnswer, 200, copyObject(answer));
        }, function(error){
            throw(error);
        });
    });
}).then(function(){
    // trigger connection between local and remote peer.
    new Promise(function(resolve, reject){
        pcLocal.createOffer(function(offer){
            resolve(offer);
        }, function(error){
            reject(error);
        });
    }).then(function(offer){
        pcLocal.setLocalDescription(offer); // trigger pcLocal.onicecandidate().
        console.log("[pcLocal.createOffer] offer " + offer.sdp.length + "B sdp as bellow:");
        console.log(offer);

        // transmit offer to remote.
        setTimeout(transmitLocalOffer, 200, copyObject(offer));
    });
});

function copyObject(obj) {
    var cp = {};
    for (var key in obj) {
        cp[key] = obj[key];
    }
    return cp;
}
