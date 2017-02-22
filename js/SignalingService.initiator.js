'use strict';

// https://codelabs.developers.google.com/codelabs/webrtc-web/#4
var lv = document.getElementById("local");
var api = "http://localhost:8888";

$("#start").click(function(){
    api = "http://" + document.getElementById("api").value;

    navigator.webkitGetUserMedia({
        video:true,audio:false
    },function(stream){
        lv.src = window.URL.createObjectURL(stream);
        console.log("[navigator.webkitGetUserMedia] lv.src=localStream " + lv.src);

        shareLocalStream(stream);
    }, function(error){
        console.error(error);
    });
});

function shareLocalStream(localStream) {
    // Use a peer connection to share stream to responder.
    var pcLocal = new window.webkitRTCPeerConnection(null);

    // Transmit initiator candidates info to signaling server.
    pcLocal.onicecandidate = function(e) {
        if (!e.candidate) {
            return;
        }
        console.log("[pcLocal.onicecandidate] " + e.candidate.candidate);
        transmitInitiatorCandidate(e.candidate);
    };
    var transmitInitiatorCandidate = function(candidate) {
        candidate = JSON.stringify(escapeCandicate(candidate));
        $.ajax({type:"POST", async:false, url:api+"/api/icandidates", contentType:"application/json", data:candidate});
    };

    // Add the stream to shared peer connection.
    pcLocal.addStream(localStream);
    console.log("[pcLocal.addStream] add localStream to peer connection");

    // Create a offer so that the responder can answer.
    pcLocal.createOffer(function(offer){
        pcLocal.setLocalDescription(offer); // trigger pcLocal.onicecandidate().
        console.log("[pcLocal.createOffer] Request with offer " + offer.sdp.length + "B sdp as bellow:");
        console.log(offer);

        transmitOffer(offer);
    }, function(error){
        console.error(error);
    });

    // Transmit initiator offer to signaling server.
    var transmitOffer = function(offer) {
        offer = JSON.stringify(escapeOffer(offer));
        $.ajax({type:"POST", async:false, url:api+"/api/offer", contentType:"application/json", data:offer});
    };

    // Wait for responder to reply the answer.
    var onLocalGotAnswer = function(answer) {
        pcLocal.setRemoteDescription(answer);
        console.log("[onLocalGotAnswer] Got answer " + answer.sdp.length + "B sdp as bellow:");
        console.log(answer);

        requestCandidates();
    };
    var waitAnswer = function(){
        $.ajax({type:"GET", async:false, url:api+"/api/answer", contentType:"application/json", success:function(data){
            var answer = unescapeOffer(JSON.parse(JSON.parse(data)[0]));
            onLocalGotAnswer(answer);
        }, error:function(){
            console.log("[waitAnswer] No answer, wait for a while.");
            setTimeout(waitAnswer, 1000);
        }});
    };
    setTimeout(waitAnswer, 0);

    // When got answer from responder, request its candidates.
    var requestCandidates = function() {
        $.ajax({type:"GET", async:false, url:api+"/api/rcandidates", contentType:"application/json", success:function(data){
            data = JSON.parse(data) || [];
            for (var i = 0; i < data.length; i++) {
                var candidate = unescapeCandicate(JSON.parse(data[i]));
                pcLocal.addIceCandidate(new window.RTCIceCandidate(candidate));
                console.log("[requestCandidates] Got responder candidate " + JSON.stringify(candidate));
            }
        }, error:function(){
            console.log("[requestCandidates] No responder candidates, wait for a while.");
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

