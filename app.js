const express = require('express');
const app = express();
const path = require('path');
const server = require('http').createServer(app);
const io = require('socket.io').listen(server);
const ss = require('socket.io-stream');
const bodyParser = require('body-parser');
const PORT = process.env.PORT || 3000;

server.listen(PORT, function() {
	console.log(`Server rodando na porta ${PORT}!`);
});

app.set('view engine', 'ejs');
app.set('views', './views');
// app.set('view options', { layout: false });
app.use('/js', express.static(__dirname + '/node_modules/bootstrap/dist/js'));
app.use('/js', express.static(__dirname + '/node_modules/jquery/dist'));
app.use('/css', express.static(__dirname + '/node_modules/bootstrap/dist/css'));
app.use('/js', express.static(__dirname + '/public/js'));
app.use('/css', express.static(__dirname + '/public/css'));
app.use('/font', express.static(__dirname + '/public/font'));
app.use('/img', express.static(__dirname + '/public/img'));
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());

const routesIndex = require('./routes/index');

app.use('/', routesIndex.router);
// app.get('*', function (req, res) {
// 	res.render('notFound');
// });

// Middleware para o socket ter o request
io.use(function (socket, next) {
	routesIndex.sessionMiddleware(socket.request, socket.request.res, next);
});

require('./socket')(io, ss);