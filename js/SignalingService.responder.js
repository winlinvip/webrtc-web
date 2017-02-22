'use strict';

// https://codelabs.developers.google.com/codelabs/webrtc-web/#4
var rv = document.getElementById("remote");

// remote peer connection setup.
var pcRemote = new window.webkitRTCPeerConnection(null);
pcRemote.onicecandidate = function(e) {
    if (!e.candidate) {
        return;
    }
    console.log("[pcRemote.onicecandidate] " + e.candidate.candidate);
    transmitResponderCandidate(e.candidate);
};

var transmitResponderCandidate = function(candidate) {
    candidate = JSON.stringify(escapeCandicate(candidate));
    $.ajax({type:"POST", async:false, url:"/api/rcandidates", contentType:"application/json", data:candidate});
};

pcRemote.onaddstream = function(e) {
    rv.src = window.URL.createObjectURL(e.stream);
    console.log("[pcRemote.onaddstream] rv.src=remoteStream " + rv.src);
};

$.ajax({type:"GET", async:false, url:"/api/offer", contentType:"application/json", success:function(data){
    var offer = unescapeOffer(JSON.parse(JSON.parse(data)[0]));

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
}});

// Remote transmit answer to local.
var transmitAnswer = function(answer) {
    answer = JSON.stringify(escapeOffer(answer));
    $.ajax({type:"POST", async:false, url:"/api/answer", contentType:"application/json", data:answer});

    requestCandidates();
};

var requestCandidates = function() {
    $.ajax({type:"GET", async:false, url:"/api/icandidates", contentType:"application/json", success:function(data){
        data = JSON.parse(data);
        for (var i = 0; i < data.length; i++) {
            var candidate = unescapeCandicate(JSON.parse(data[i]));
            pcRemote.addIceCandidate(new window.RTCIceCandidate(candidate));
            console.log("[requestCandidates] Got initiator candidate " + candidate);
        }
    }, error:function(){
        console.log("[requestCandidates] No initiator candidates, wait for a while.");
        setTimeout(requestCandidates, 1000);
    }});
};

function escapeOffer(offer) {
    return {type:offer.type, sdp:escape(offer.sdp)};
}

function escapeCandicate(candidate) {
    return {sdpMid:candidate.sdpMid, sdpMLineIndex:candidate.sdpMLineIndex, candidate:escape(candidate.candidate)};
}

function unescapeOffer(offer) {
    return {type:offer.type, sdp:unescape(offer.sdp)};
}

function unescapeCandicate(candidate) {
    return {sdpMid:candidate.sdpMid, sdpMLineIndex:candidate.sdpMLineIndex, candidate:unescape(candidate.candidate)};
}