'use strict';

// https://codelabs.developers.google.com/codelabs/webrtc-web/#4
var lv = document.getElementById("local");

navigator.webkitGetUserMedia({
    video:true,audio:false
},function(stream){
    lv.src = window.URL.createObjectURL(stream);
    console.log("[navigator.webkitGetUserMedia] lv.src=localStream " + lv.src);

    shareLocalStream(stream);
}, function(error){
    console.error(error);
});

function shareLocalStream(localStream) {
    // local peer connection setup.
    var pcLocal = new window.webkitRTCPeerConnection(null);
    pcLocal.onicecandidate = function(e) {
        if (!e.candidate) {
            return;
        }
        console.log("[pcLocal.onicecandidate] " + e.candidate.candidate);
        transmitInitiatorCandidate(e.candidate);
    };

    var transmitInitiatorCandidate = function(candidate) {
        candidate = JSON.stringify(escapeCandicate(candidate));
        $.ajax({type:"POST", async:false, url:"/api/icandidates", contentType:"application/json", data:candidate});
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
        offer = JSON.stringify(escapeOffer(offer));
        $.ajax({type:"POST", async:false, url:"/api/offer", contentType:"application/json", data:offer});
    };

    var onLocalGotAnswer = function(answer) {
        pcLocal.setRemoteDescription(answer);
        console.log("[onLocalGotAnswer] Got answer " + answer.sdp.length + "B sdp as bellow:");
        console.log(answer);

        requestCandidates();
    };
    var waitAnswer = function(){
        $.ajax({type:"GET", async:false, url:"/api/answer", contentType:"application/json", success:function(data){
            var answer = unescapeOffer(JSON.parse(JSON.parse(data)[0]));
            onLocalGotAnswer(answer);
        }, error:function(){
            console.log("[waitAnswer] No answer, wait for a while.");
            setTimeout(waitAnswer, 1000);
        }});
    };
    setTimeout(waitAnswer, 0);

    var requestCandidates = function() {
        $.ajax({type:"GET", async:false, url:"/api/rcandidates", contentType:"application/json", success:function(data){
            data = JSON.parse(data);
            for (var i = 0; i < data.length; i++) {
                var candidate = unescapeCandicate(JSON.parse(data[i]));
                pcLocal.addIceCandidate(new window.RTCIceCandidate(candidate));
                console.log("[requestCandidates] Got responder candidate " + candidate);
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

