'use strict';

// https://codelabs.developers.google.com/codelabs/webrtc-web/#6
var api = "";

$("#start").click(function(){
    var napi = document.getElementById("api").value;
    if (napi != "/") {
        api = "http://" + napi;
    }

    new Promise(function(resolve, reject){
        navigator.webkitGetUserMedia({
            video:true,audio:true
        },function(stream){
            resolve(stream);
        }, function(error){
            reject(error);
        });
    }).then(function(stream){
        var lv = document.getElementById("local");
        lv.src = window.URL.createObjectURL(stream);
        console.log("[navigator.webkitGetUserMedia] lv.src= " + lv.src);

        // Use a peer connection to share stream to responder.
        var conn = new window.webkitRTCPeerConnection({iceServers:[{urls:["turn:stun.ossrs.net"], username:"guest", credential:"12345678"}]});
        conn.addStream(stream);
        console.log("[conn.addStream] add stream to peer connection");

        return conn;
    }).then(function(conn){
        // Render the remote initiator stream.
        conn.onaddstream = function(e) {
            var rv = document.getElementById("remote");
            rv.src = window.URL.createObjectURL(e.stream);
            console.log("[conn.onaddstream] rv.src=remoteStream " + rv.src);
        };

        callInitiator(conn, api);
    });
});

function callInitiator(conn, api) {
    Promise.all([new Promise(function(resolve, reject){
        // Request the candidates of initiator.
        var requestCandidates = function() {
            $.ajax({
                type:"GET", async:true, url:api+"/api/webrtc/icandidates", contentType:"application/json",
                success:function(data){
                    data = JSON.parse(data) || [];

                    // Wait util the rcandidates are completed, we should got 2 candidates.
                    if (data.length != 2) {
                        setTimeout(requestCandidates, 1000);
                        return;
                    }

                    resolve(data);
                }, error:function(xhr,err){
                    reject(err);
                }
            });
        };
        requestCandidates();
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
        // Transmit the responder candidates to signaling server.
        conn.onicecandidate = function(e) {
            if (!e.candidate) {
                return;
            }
            if (e.candidate.candidate.indexOf("relay") == -1) {
                console.log("[conn.onicecandidate] ignore " + e.candidate.candidate);
                return;
            }
            console.log("[conn.onicecandidate] " + e.candidate.candidate);
            console.log(e.candidate);

            data = JSON.stringify(escapeCandicate(e.candidate));
            $.ajax({type:"POST", async:true, url:api+"/api/webrtc/rcandidates", contentType:"application/json", data:data});
        };

        // once got the peer offer(SDP), we can generate our answer(SDP).
        conn.setRemoteDescription(offer); // trigger conn.onaddstream
        console.log("[onRemoteGotOffer] Got offer " + offer.sdp.length + "B sdp as bellow:");
        console.log(offer); console.log(offer.sdp);

        // Since the 'remote' side has no media stream we need
        // to pass in the right constraints in order for it to
        // accept the incoming offer of audio and video.
        conn.createAnswer(function(answer){
            // For chrome new API, we can delay set the TURN.
            //conn.setConfiguration({iceServers:[{urls:["turn:stun.ossrs.net"], username:"guest", credential:"12345678"}]});

            conn.setLocalDescription(answer); // trigger conn.onicecandidate().
            console.log("[conn.createAnswer] answer " + answer.sdp.length + "B sdp as bellow:");
            console.log(answer); console.log(answer.sdp);

            var data = JSON.stringify(escapeOffer(answer));
            $.ajax({type:"POST", async:true, url:api+"/api/webrtc/answer", contentType:"application/json", data:data});

            // before addIceCandidate, we must setRemoteDescription
            for (var i = 0; i < candidates.length; i++) {
                var candidate = unescapeCandicate(JSON.parse(candidates[i]));
                conn.addIceCandidate(new window.RTCIceCandidate(candidate));
                console.log("[requestCandidates] Got initiator candidate " + JSON.stringify(candidate));
            }
        }, function(error){
            console.log(error);
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