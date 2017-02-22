'use strict';

// https://codelabs.developers.google.com/codelabs/webrtc-web/#6
var rv = document.getElementById("remote");
var api = "";

$("#start").click(function(){
    var napi = document.getElementById("api").value;
    if (napi != "/") {
        api = "http://" + napi;
    }

    callInitiator();
});

function callInitiator() {
    // Use a peer connection to connect to initiator.
    var pcRemote = new window.webkitRTCPeerConnection(null);

    // Transmit the responder candidates to signaling server.
    pcRemote.onicecandidate = function(e) {
        if (!e.candidate) {
            return;
        }
        console.log("[pcRemote.onicecandidate] " + e.candidate.candidate);
        transmitResponderCandidate(e.candidate);
    };
    var transmitResponderCandidate = function(candidate) {
        candidate = JSON.stringify(escapeCandicate(candidate));
        $.ajax({type:"POST", async:false, url:api+"/api/webrtc/rcandidates", contentType:"application/json", data:candidate});
    };

    // Render the remote initiator stream.
    pcRemote.onaddstream = function(e) {
        rv.src = window.URL.createObjectURL(e.stream);
        console.log("[pcRemote.onaddstream] rv.src=remoteStream " + rv.src);
    };

    // Query the offer of initiator from signaling server.
    $.ajax({type:"GET", async:false, url:api+"/api/webrtc/offer", contentType:"application/json", success:function(data){
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

    // Transmit the answer to initiator.
    var transmitAnswer = function(answer) {
        answer = JSON.stringify(escapeOffer(answer));
        $.ajax({type:"POST", async:false, url:api+"/api/webrtc/answer", contentType:"application/json", data:answer});

        requestCandidates();
    };

    // Request the candidates of initiator.
    var requestCandidates = function() {
        $.ajax({type:"GET", async:false, url:api+"/api/webrtc/icandidates", contentType:"application/json", success:function(data){
            data = JSON.parse(data) || [];
            for (var i = 0; i < data.length; i++) {
                var candidate = unescapeCandicate(JSON.parse(data[i]));
                pcRemote.addIceCandidate(new window.RTCIceCandidate(candidate));
                console.log("[requestCandidates] Got initiator candidate " + JSON.stringify(candidate));
            }
        }, error:function(){
            console.log("[requestCandidates] No initiator candidates, wait for a while.");
            setTimeout(requestCandidates, 1000);
        }});
    };
}

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