'use strict';

// https://codelabs.developers.google.com/codelabs/webrtc-web/#6
var api = "";

$("#start").click(function(){
    var napi = document.getElementById("api").value;
    if (napi != "/") {
        api = "http://" + napi;
    }

    // Use a peer connection to connect to initiator.
    var pcRemote = new window.webkitRTCPeerConnection(null);

    // Render the remote initiator stream.
    pcRemote.onaddstream = function(e) {
        var rv = document.getElementById("remote");
        rv.src = window.URL.createObjectURL(e.stream);
        console.log("[pcRemote.onaddstream] rv.src=remoteStream " + rv.src);
    };

    callInitiator(pcRemote, api);
});

function callInitiator(pcRemote, api) {
    Promise.all([new Promise(function(resolve, reject){
        // Request the candidates of initiator.
        $.ajax({
            type:"GET", async:true, url:api+"/api/webrtc/icandidates", contentType:"application/json",
            success:function(data){
                data = JSON.parse(data) || [];
                resolve(data);
            }, error:function(xhr,err){
                reject(err);
            }
        });
    }), new Promise(function(resolve, reject){
        // Query the offer of initiator from signaling server.
        $.ajax({
            type:"GET", async:true, url:api+"/api/webrtc/offer", contentType:"application/json",
            success:function(data){
                var offer = unescapeOffer(JSON.parse(JSON.parse(data)[0]));
                resolve(offer);
            },
            error: function(xhr, err) {
                reject(err);
            }
        });
    })]).then(function([candidates,offer]){
        // once got the peer offer(SDP), we can generate our answer(SDP).
        pcRemote.setRemoteDescription(offer); // trigger pcRemote.onaddstream
        console.log("[onRemoteGotOffer] Got offer " + offer.sdp.length + "B sdp as bellow:");
        console.log(offer);

        // before addIceCandidate, we must setRemoteDescription
        for (var i = 0; i < candidates.length; i++) {
            var candidate = unescapeCandicate(JSON.parse(candidates[i]));
            pcRemote.addIceCandidate(new window.RTCIceCandidate(candidate));
            console.log("[requestCandidates] Got initiator candidate " + JSON.stringify(candidate));
        }

        Promise.all([new Promise(function(resolve, reject){
            // Since the 'remote' side has no media stream we need
            // to pass in the right constraints in order for it to
            // accept the incoming offer of audio and video.
            pcRemote.createAnswer(function(answer){
                pcRemote.setLocalDescription(answer); // trigger pcRemote.onicecandidate().
                console.log("[pcRemote.createAnswer] answer " + answer.sdp.length + "B sdp as bellow:");
                console.log(answer);

                resolve(answer);
            }, function(error){
                reject(error);
            });
        }), new Promise(function(resolve, reject){
            // Transmit the responder candidates to signaling server.
            pcRemote.onicecandidate = function(e) {
                if (!e.candidate) {
                    return;
                }
                resolve(e.candidate);
            };
        })]).then(function([answer,candidate]){
            var data = JSON.stringify(escapeOffer(answer));
            $.ajax({type:"POST", async:true, url:api+"/api/webrtc/answer", contentType:"application/json", data:data});

            data = JSON.stringify(escapeCandicate(candidate));
            $.ajax({type:"POST", async:true, url:api+"/api/webrtc/rcandidates", contentType:"application/json", data:data});
        });
    });
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