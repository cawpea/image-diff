var MY_SERVER = {};
var http = require('http');
var url = require('url');
var fs = require('fs');
var path = require('path');

MY_SERVER.Server = function () {
	this.init();
};
MY_SERVER.Server.prototype = {
	CONF: {
		PORT: 9000,
		HOST: 'localhost',
		INDEX: '/template/index.html'
	},
	HTTP_STATUS: {
		OK: 200,
		NOT_FOUND: 404,
		INTERNAL_SERVER_ERROR: 500
	},
	MIMETYPE: {
		'.html': 'text/html',
		'.css':  'text/css',
		'.js':   'application/javascript',
		'.json': 'application/json',
		'.png':  'image/png',
		'.jpg':  'image/jpeg',
		'.gif':  'image/gif',
		'.txt':  'text/plain'
	},
	init: function () {
		this.setParameters();
		this.bindEvents();
		this.listen();
	},
	setParameters: function () {
		this.server = http.createServer();
	},
	bindEvents: function () {
		var _this = this;
		this.server.on('request', function ( req, res ) {
			_this.handleRequestEvent( req, res );
		});
	},
	handleRequestEvent: function ( req, res ) {
		var _this = this;
		var pathname = this.getPath( req );
		var isImageFile = pathname['ext'].indexOf( 'image' ) > -1;
		var isApi = pathname['path'].indexOf('/api') > -1;

		if( isApi ) {
			var result = MY_SERVER.API.request( pathname['path'], function ( data ) {
				res.writeHead( _this.HTTP_STATUS.OK, 'application/json' );
				res.end( data.toString() );
			});

		} else if ( req.url === '/favicon.ico' ) {
			res.writeHead(200, {'Content-Type': 'image/x-icon'} );
			res.end();

		} else {
			pathname['path'] = __dirname + pathname['path'];

			this.readFile( pathname['path'], pathname['ext'], function ( err, data ) {
				if( data ) {
					res.writeHead( _this.HTTP_STATUS.OK, {'Content-Type': pathname['ext']} );
					if( isImageFile ) {
						res.end( data, 'binary' );
					}else {
						res.end( data );
					}
				}
				res.end( err );
			});
		}
	},
	getPath: function ( req ) {
		var pathname = url.parse( req.url ).pathname;
		if( pathname === '/' || pathname === '/index.html' ) {
			pathname = this.CONF.INDEX;
		}
		var extname = this.MIMETYPE[ path.extname( pathname ) ] || 'text/plain';

		return {
			path: pathname,
			ext: extname
		};
	},
	readFile: function ( pathname, extname, callback ) {
		var _this = this;
		if( extname.indexOf( 'image' ) === -1 ) {
			fs.readFile( pathname, 'UTF-8', function ( err, data ) {
				callback( err, data );
			});
		}else {
			var img = fs.readFileSync( pathname );
			callback( null, img );
		}
	},
	listen: function () {
		this.server.listen( this.CONF.PORT, this.CONF.HOST );
		console.log( 'listen the http://' + this.CONF.HOST + ':' + this.CONF.PORT + '...' );
	}
};

MY_SERVER.API = {
	CONF: {
		HOST: 'localhost'
	},
	request: function ( pathname, callback ) {
		var _this = this;
		var prefix = 'http://' + this.CONF.HOST;

		http.get( prefix + '/api/v1/get-image/', function () {
			_this.getImage( function ( data ) {
				var json = _this.parseJSON( data );
				callback( json );
			});
		});
	},
	getImage: function ( callback ) {
		var _this = this;
		var imageList = {};

		var readBefore = function () {
			return new Promise( function ( resolve, reject ) {
				_this.readFiles( '/input/before/', function ( fileList ) {
					imageList.before = fileList;
					resolve();
				});
			});
		};

		var readAfter = function () {
			return new Promise( function ( resolve, reject ) {
				_this.readFiles( '/input/after/', function ( fileList ) {
					imageList.after = fileList;
					resolve();
				});
			});
		};
		readBefore()
			.then( readAfter )
			.then( function () {
				callback( imageList );
			});
	},
	readFiles: function ( dirPath, callback ) {
		var fileList = [];
		this.readDir( __dirname + dirPath, function ( files ) {
			files.forEach(function ( file ) {
				var isHiddenFile = file.indexOf('.') === 0;
				if( isHiddenFile ) {
					return;
				}
				fileList.push( dirPath + file );
			});
			callback( fileList );
		});
	},
	readDir: function ( dirPath, callback ) {
		fs.readdir( dirPath, function ( err, files ) {
			if( err ) throw err;
			callback( files );
		});
	},
	parseJSON: function ( data ) {
		return JSON.stringify( data );
	}
};

new MY_SERVER.Server();