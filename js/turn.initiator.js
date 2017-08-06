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
            video:true,audio:false
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
        var conn = new window.webkitRTCPeerConnection({iceServers:[{
            urls:"stun:stun.ossrs.net", username:"winlin@ossrs.net", credential:"12345678"
        }]});
        conn.addStream(stream);
        console.log("[conn.addStream] add stream to peer connection");

        // Render the remote initiator stream.
        conn.onaddstream = function(e) {
            var rv = document.getElementById("remote");
            rv.src = window.URL.createObjectURL(e.stream);
            console.log("[conn.onaddstream] rv.src=remoteStream " + rv.src);
        };

        conn.onicecandidate = function(e) {
            console.log("[conn.onicecandidate] e is:");
            console.log(e);
        };
        conn.iceconnectionstatechange = function(e) {
            console.log("[conn.iceconnectionstatechange] e is:");
            console.log(e);
        };
        conn.onicegatheringstatechange = function(e) {
            console.log("[conn.onicegatheringstatechange] e is:");
            console.log(e);
        };
        conn.onnegotiationneeded = function(e) {
            console.log("[conn.onnegotiationneeded] e is:");
            console.log(e);
        };
        conn.onsignalingstatechange = function(e) {
            console.log("[conn.onsignalingstatechange] e is:");
            console.log(e);
        };

        return conn;
    }).then(function(conn){
return;
        Promise.all([new Promise(function(resolve, reject){
            conn.onicecandidate = function(e) {
                if (!e.candidate) {
                    return;
                }

                console.log("[conn.onicecandidate] " + e.candidate.candidate);

                // Transmit initiator candidates info to signaling server.
                var data = JSON.stringify(escapeCandicate(e.candidate));
                $.ajax({
                    type:"POST", async:true, url:api+"/api/webrtc/icandidates", contentType:"application/json", data:data,
                    success: function(){ resolve(data); }, error: function(xhr,err) { reject(err); }
                });
            };
        }), new Promise(function(resolve, reject){
            conn.createOffer(function(offer){
                conn.setLocalDescription(offer); // trigger conn.onicecandidate().
                console.log("[conn.createOffer] Request with offer " + offer.sdp.length + "B sdp as bellow:");
                console.log(offer);

                // Create a offer so that the responder can answer.
                var data = JSON.stringify(escapeOffer(offer));
                $.ajax({
                    type:"POST", async:true, url:api+"/api/webrtc/offer", contentType:"application/json", data:data,
                    success: function(){ resolve(offer); }, error: function(xhr,err) { reject(err); }
                });
            }, function(error){
                reject(error);
            });
        })]).then(function([candidate, offer]){
            setTimeout(waitResponder, 5000, conn);
        });
    });
});

function waitResponder(pcLocal) {
    new Promise(function(resolve, reject){
        var waitAnswer = function(){
            $.ajax({
                type:"GET", async:true, url:api+"/api/webrtc/answer", contentType:"application/json",
                success:function(data){
                    var answer = unescapeOffer(JSON.parse(JSON.parse(data)[0]));
                    resolve(answer);
                }, error:function(){
                    console.log("[waitAnswer] No answer, wait for a while.");
                    setTimeout(waitAnswer, 1000);
                }
            });
        };
        setTimeout(waitAnswer, 0);
    }).then(function(answer){
        // Wait for responder to reply the answer.
        pcLocal.setRemoteDescription(answer);
        console.log("[onLocalGotAnswer] Got answer " + answer.sdp.length + "B sdp as bellow:");
        console.log(answer);

        new Promise(function(resolve, reject){
            // When got answer from responder, request its candidates.
            var requestCandidates = function() {
                $.ajax({
                    type:"GET", async:true, url:api+"/api/webrtc/rcandidates", contentType:"application/json",
                    success:function(data){
                        data = JSON.parse(data) || [];
                        resolve(data);
                    }, error:function(){
                        console.log("[requestCandidates] No responder candidates, wait for a while.");
                        setTimeout(requestCandidates, 1000);
                    }
                });
            };
            requestCandidates();
        }).then(function(data){
            for (var i = 0; i < data.length; i++) {
                var candidate = unescapeCandicate(JSON.parse(data[i]));
                pcLocal.addIceCandidate(new window.RTCIceCandidate(candidate));
                console.log("[requestCandidates] Got responder candidate " + JSON.stringify(candidate));
            }
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

