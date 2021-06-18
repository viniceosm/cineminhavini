let socket;
let isBroadcaster = false;

// broadcast
let peerConnections = {};

// watch
let peerConnection;

const config = {
	iceServers: [
		{
			urls: ["stun:stun.l.google.com:19302"]
		}
	]
};

window.onload = function() {
	socket = io.connect();

	document.getElementById('formUsuario').onsubmit = function(e) {
		e.preventDefault();

		let nomeUsuario = document.getElementById('txtNomeUsuario').value;
		socket.emit('novo usuario', nomeUsuario);

		document.getElementById('txtNomeUsuario').value = '';

		document.getElementById('formUsuario').style.display = 'none';

		// document.getElementById('area-video').style.display = 'block';
		// document.getElementById('area-direita').style.display = 'flex';
		// document.getElementById('area-botao').style.display = 'block';
		// document.getElementById('area-chat').style.display = 'block';
		document.getElementById('home').style.display = 'flex';
	};

	socket.on('novo usuario', function(controlando) {
		if (controlando === true) {
			document.getElementById('videoSelectBtn').style.display = 'block';

			isBroadcaster = true;
		}

		eventsRTC();
	});

	socket.on('atualiza lista usuarios', function(usuarios) {
		html = '';

		for (const usuario of usuarios) {
			html += `<li>${usuario.nome}</li>`;
		}

		document.getElementById('listaUsuarios').innerHTML = html;
	});

	document.getElementById('videoSelectBtn').onclick = selectSource;

	// inclui mic
	var mic = false;

	const mergeAudioStreams = (desktopStream, voiceStream) => {
		const context = new AudioContext();
		const destination = context.createMediaStreamDestination();
		let hasDesktop = false;
		let hasVoice = false;

		if (desktopStream && desktopStream.getAudioTracks().length > 0) {
			// If you don't want to share Audio from the desktop it should still work with just the voice.
			const source1 = context.createMediaStreamSource(desktopStream);
			const desktopGain = context.createGain();
			desktopGain.gain.value = 0.7;
			source1.connect(desktopGain).connect(destination);
			hasDesktop = true;
		}

		if (voiceStream && voiceStream.getAudioTracks().length > 0) {
			const source2 = context.createMediaStreamSource(voiceStream);
			const voiceGain = context.createGain();
			voiceGain.gain.value = 0.5;
			source2.connect(voiceGain).connect(destination);
			hasVoice = true;
		}

		return (hasDesktop || hasVoice) ? destination.stream.getAudioTracks() : [];
	};

	async function selectSource(source) {
		let constraints = {
			audio: true,
			video: {
				mediaSource: "screen",
				maxWidth: screen.width,
				maxHeight: screen.height,
				minFrameRate: 1,
				maxFrameRate: 30
			}
		};

		// Create a desktopStream
		desktopStream = await navigator.mediaDevices.getDisplayMedia(constraints);

		let tracks;

		if (mic === true) {
			voiceStream = await navigator.mediaDevices.getUserMedia({ video: false, audio: mic });

			tracks = [
				...desktopStream.getVideoTracks(),
				...mergeAudioStreams(desktopStream, voiceStream)
			];
		} else {
			tracks = desktopStream;
		}

		stream = new MediaStream(tracks);

		// Preview the source in a video element
		let videoElement = document.getElementById('videoElement');
		videoElement.srcObject = stream;
		videoElement.play();
		videoElement.controls = true;
		videoElement.muted = true;

		socket.emit("broadcaster");
	}

	function eventsRTC() {
		if (isBroadcaster === true) {
			// BROADCASTER

			socket.on("answer", (id, description) => {
				console.log('on answer');

				peerConnections[id].setRemoteDescription(description);
			});

			socket.on("watcher", id => {
				console.log('on watcher');

				const peerConnection = new RTCPeerConnection(config);
				peerConnections[id] = peerConnection;

				let videoElement = document.getElementById('videoElement');
				let stream = videoElement.srcObject;
				stream.getTracks().forEach(track => peerConnection.addTrack(track, stream));

				peerConnection.onicecandidate = event => {
					if (event.candidate) {
						socket.emit("candidate", id, event.candidate);
					}
				};

				peerConnection
					.createOffer()
					.then(sdp => peerConnection.setLocalDescription(sdp))
					.then(() => {
						socket.emit("offer", id, peerConnection.localDescription);
					});
			});

			socket.on("candidate", (id, candidate) => {
				console.log('on candidate');

				peerConnections[id].addIceCandidate(new RTCIceCandidate(candidate));
			});

			socket.on("disconnectPeer", id => {
				console.log('on disconnectPeer');

				peerConnections[id].close();
				delete peerConnections[id];
			});

			window.onunload = window.onbeforeunload = () => {
				socket.close();
			};
		} else {
			// WATCHER
			console.log('WATCHER');

			let videoElement = document.getElementById("videoElement");

			socket.on("offer", (id, description) => {
				console.log('on offer');

				peerConnection = new RTCPeerConnection(config);
				peerConnection
					.setRemoteDescription(description)
					.then(() => peerConnection.createAnswer())
					.then(sdp => peerConnection.setLocalDescription(sdp))
					.then(() => {
						socket.emit("answer", id, peerConnection.localDescription);
					});
				peerConnection.ontrack = event => {
					videoElement.srcObject = event.streams[0];
					videoElement.play();
					videoElement.controls = true;
				};
				peerConnection.onicecandidate = event => {
					if (event.candidate) {
						socket.emit("candidate", id, event.candidate);
					}
				};
			});

			socket.on("candidate", (id, candidate) => {
				console.log(' on candidate');

				peerConnection
					.addIceCandidate(new RTCIceCandidate(candidate))
					.catch(e => console.error(e));
			});

			socket.on("connect", () => {
				console.log(' on connect');

				socket.emit("watcher");
			});

			socket.on("broadcaster", () => {
				console.log(' on broadcaster');

				socket.emit("watcher");
			});

			socket.on("disconnectPeer", () => {
				console.log(' on disconnectPeer');

				peerConnection.close();
			});

			window.onunload = window.onbeforeunload = () => {
				socket.close();
			};
		}
	}
}