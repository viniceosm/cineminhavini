let io;
let ss;

let usuarios = [];
let connections = [];
let broadcaster;

module.exports = function (_io, _ss) {
	io = _io;
	ss = _ss;

	io.on('connection', function(socket){
		console.log('Um usuario conectado. broadcaster =', broadcaster);


		socket.on('disconnect', function(){
			usuarios.splice(usuarios.map((e) => { return e.nome; }).indexOf(socket.nome), 1);

			connections.splice(connections.map((e) => { return e.id; }).indexOf(socket.id), 1);
			// connections.splice(connections.indexOf(socket), 1);

			console.log('Um usuario desconectado');

			io.sockets.emit('atualiza lista usuarios', usuarios);

			if (getSocket(broadcaster)) {
				getSocket(broadcaster).emit("disconnectPeer", socket.id);
			}
		});

		socket.on('novo usuario', function(nomeUsuario){
			socket.id = usuarios.length;
			socket.nome = nomeUsuario;

			usuarios.push({
				id: socket.id,
				nome: socket.nome
			});

			connections.push(socket);

			let controlando = usuarios.length == 1;

			socket.emit('novo usuario', controlando);

			if (controlando == false) {
				// é watcher
				if (getSocket(broadcaster)) {
					getSocket(broadcaster).emit("watcher", socket.id);
				} else {
					console.log('1- n acho id', broadcaster);
				}
			}

			io.emit('atualiza lista usuarios', usuarios);
		});


		socket.on("broadcaster", () => {
			broadcaster = socket.id;
			console.log('setou broadcaster', broadcaster);
			socket.broadcast.emit("broadcaster");
		});
		socket.on("watcher", () => {
			console.log(broadcaster);
			if (getSocket(broadcaster)) {
				getSocket(broadcaster).emit("watcher", socket.id);
			} else {
				console.log('1- n acho id', broadcaster);
			}
		});
		socket.on("offer", (id, message) => {
			if (getSocket(id)) {
				getSocket(id).emit("offer", socket.id, message);
			} else {
				console.log('2- n acho id', id);
			}
		});
		socket.on("answer", (id, message) => {
			if (getSocket(id)) {
				getSocket(id).emit("answer", socket.id, message);
			} else {
				console.log('3- n acho id', id);
			}
		});
		socket.on("candidate", (id, message) => {
			if (getSocket(id)) {
				getSocket(id).emit("candidate", socket.id, message);
			} else {
				console.log('4- n acho id', id);
			}
		});

		function getSocket(id) {
			return connections.find(e => e.id == id);
		}
	});
};