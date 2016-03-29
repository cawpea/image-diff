var COMPARE_IMAGE = window.COMPARE_IMAGE || {};

COMPARE_IMAGE.Compare = function ( imagePathList ) {
	this.imagePathList = imagePathList;
	this.init();
};
COMPARE_IMAGE.Compare.prototype = {
	LOG_TYPE: {
		INFO: 'logInfo',
		ERROR: 'logError'
	},
	init: function () {
		this.setParameters();
		this.compareImage();
	},
	setParameters: function () {
		var _this = this;
		this.$base = $('.jsc-compareimage');
		this.$images = $('.jsc-compareimage-images');
	},
	compareImage: function () {
		var _this = this;
		var imageList = [];
		$.when(
			this.loadImages( imageList )
		).done(function () {
			_this.loadedImages( imageList );
		}).fail(function () {
			_this.log( _this.LOG_TYPE.ERROR, 'couldn\'t get image data.' );
		});
	},
	loadImages: function ( imageList ) {
		var d = new $.Deferred;
		var _this = this;
		var loadCount = this.imagePathList.length;

		$.each( this.imagePathList, function () {
			var url = this;
			var $image = $('<img>');
			$image.attr( 'src', url );
			//$image.get(0).crossOrigin = "Anonymous";
			$image.on('load', function () {
				var image = this;
				imageList.push( _this.getImageData( $( image ) ) );
				if( imageList.length === loadCount ) {
					d.resolve();
				}
			});
			_this.$images.append( $image );
		});
		return d.promise();
	},
	loadedImages: function ( imageList ) {
		var imageData = this.compareImageData( imageList );

		if( imageData && imageData.mergeData ) {
			this.setImageData( imageData.mergeData );
		}

		this.$images.empty();
	},
	getImageData: function ( $image ) {
		var width = $image.width();
		var height = $image.height();
		var imageData;
		var $canvas = $('<canvas>').attr( 'width', width ).attr( 'height', height );
		var context = $canvas.get(0).getContext('2d');

		context.drawImage( $image.get(0), 0, 0 );
		imageData = context.getImageData(0, 0, width, height);
		return imageData;
	},
	setImageData: function ( imageData ) {
		var $canvas = $('<canvas>').attr('width', imageData.width).attr('height', imageData.height);
		var context = $canvas.get(0).getContext('2d');

		context.createImageData( imageData.width, imageData.height );
		context.putImageData( imageData, 0, 0 );
		this.$base.append( $canvas );
	},
	compareImageData: function ( imageList ) {
		if( imageList.length === 0 ) {
			return;
		}
		var isEqualImage = true;
		var _this = this;

		var firstData;
		var mergeData;

		$.each( imageList, function () {
			if( firstData === undefined ) {
				firstData = this;
				mergeData = firstData;
				return true;
			}else {
				var firstPixelData = firstData.data;
				var firstPixelDataLength = firstPixelData.length;
				var secondPixelData = this.data;
				var secondPixelDataLength = secondPixelData.length;
				var isSameDataCount = firstPixelDataLength === secondPixelDataLength;

				if( !isSameDataCount ) {
					isEqualImage = false;
					return false;
				}
				for( var i = 0; i < firstPixelDataLength; i++ ) {
					if( firstPixelData[i] !== secondPixelData[i] ) {
						isEqualImage = false;
						mergeData.data[i] = 0;
					}
				}
				firstData = this;
			}
		});
		return {
			isEqualImage: isEqualImage,
			mergeData: mergeData
		};
	},
	log: function ( logType, message ) {
		if( message === '' ) {
			return;
		}
		var LOG_TYPE = this.LOG_TYPE;
		var prefix = '';

		switch( logType ) {
			case LOG_TYPE.INFO:
				prefix = 'INFO: ';
				break;
			case LOG_TYPE.ERROR:
				prefix = 'ERROR: ';
				break;
		}
		console.log( prefix + message );
	}
};
$(function () {
	new COMPARE_IMAGE.Compare( [
		'./image/test1.png',
		'./image/test3.png'
	]);
});
