var COMPARE_IMAGE = window.COMPARE_IMAGE || {};

COMPARE_IMAGE.Controller = function () {
	this.init();
};
COMPARE_IMAGE.Controller.prototype = {
	CLASSNAME: {
		IS_LOADING: 'is-loading',
		SHOW_VIEW: 'is-show-view',
		NOT_MATCH: 'is-not-match',
		DISABLED: 'disabled'
	},
	PATH: {
		BEFORE: '/input/before/',
		AFTER: '/input/after/'
	},
	COMPARE_STATUS: {
		RUNNING: 'running',
		STOP: 'stop'
	},
	init: function () {
		this.getElements();
		this.resetParameters();
		this.bindEvents();
		this.updateControlButton();
		this.checkNotification();
	},
	getElements: function () {
		this.$body = $('body');
		this.$base = $('.jsc-compareimage');
		this.$template = $('.jsc-compareimage-template');
		this.$output = $('.jsc-compareimage-output');
		this.$controlStart = $('.jsc-compareimage-control-start');
		this.$controlStop = $('.jsc-compareimage-control-stop');
		this.$controlReset = $('.jsc-compareimage-control-reset');
		this.$viewBeforeName = $('.jsc-compareimage-view-beforename');
		this.$viewAfterName = $('.jsc-compareimage-view-aftername');
		this.$viewCanvas = $('.jsc-compareimage-view-canvas');
		this.$viewClose = $('.jsc-compareimage-view-close');
		this.$output = $('.jsc-compareimage-output');
		this.$loader = $('.jsc-compareimage-loader');
		this.$current = $('.jsc-compareimage-current');
		this.$total = $('.jsc-compareimage-total');
		this.$loadBar = $('.jsc-compareimage-loadbar');
	},
	bindEvents: function () {
		var _this = this;
		this.$controlStart.on( 'click', function () {
			_this.startCompare();
		});
		this.$controlStop.on( 'click', function () {
			_this.stopCompare();
		});
		this.$controlReset.on( 'click', function () {
			_this.resetCompare();
		});
		this.$output.on( 'click', '.jsc-compareimage-viewtrigger', function () {
			_this.onClickViewTrigger( $(this) );
		});
		this.$viewClose.on( 'click', function () {
			_this.onClickViewClose();
		});
	},
	resetParameters: function () {
		this.compareQueue = undefined;
		this.compareStatus = this.COMPARE_STATUS.STOP;
		this.$output.empty();
		this.$base.removeClass( this.CLASSNAME.SHOW_VIEW );
		this.resetLoader();
		this.clearCanvas();
	},
	resetLoader: function () {
		this.compareIndex = 0;
		this.$loadBar.css('width', 0);
		this.$current.text('0');
	},
	checkNotification: function () {
		if( !('Notification' in window) ) {
			console.log('This browser is unsupported notifcation.');
			return;
		}
		var _this = this;
		if( window.Notification.permission !== 'denied' ) {
			window.Notification.requestPermission(function ( permission ) {
				if( permission === 'granted' ) {
					_this.arrowNotification = true;
				}
			});
		}
	},
	onClickViewTrigger: function ( $target ) {
		var comparePath = $target.data('compare-path');
		if( comparePath === undefined ) {
			return;
		}
		this.showMergeImage( comparePath );
		this.changeCheck( $target );
	},
	onClickViewClose: function () {
		this.$base.removeClass( this.CLASSNAME.SHOW_VIEW );
	},
	getPath: function () {
		var _this = this;

		this.compareQueue = [];

		$.getJSON( '/api/v1/get-image/', function ( json ) {
			if( !json ) return;
			_this.compareImageList( json.before, json.after );
		});
	},
	showMergeImage: function ( comparePath ) {
		var compare = new COMPARE_IMAGE.Compare( comparePath );
		compare.async().then(
			function () {
				var compareData = compare.compareData;
				if( !compareData || !compareData.mergeData ) {
					return;
				}
				this.setImageToCanvas( compareData.mergeData );
				this.$base.addClass( this.CLASSNAME.SHOW_VIEW );
				this.$viewBeforeName.text( comparePath[0] );
				this.$viewAfterName.text( comparePath[1] );
			}.bind(this)
		);
	},
	changeCheck: function ( $template ) {
		var $check = $template.find('.jsc-compareimage-check');
		var isCheck = $check.prop('checked');
		$check.prop('checked', !isCheck);
	},
	setImageToCanvas: function ( imageData ) {
		var context = this.$viewCanvas.get(0).getContext('2d');

		this.clearCanvas();
		this.$viewCanvas.attr('width', imageData.width).attr('height', imageData.height);
		context.createImageData( imageData.width, imageData.height );
		context.putImageData( imageData, 0, 0 );

		this.currentImageData = imageData;
	},
	clearCanvas: function () {
		if( !this.currentImageData ) {
			return;
		}

		var context = this.$viewCanvas.get(0).getContext('2d');
		context.clearRect(
			0,
			0,
			this.currentImageData.width,
			this.currentImageData.height
		);
	},
	compareImageList: function ( beforeList, afterList ) {
		var matchPaths = [];
		var onlyBeforePaths = [];
		var onlyAfterPaths = [];

		for( var i = 0,len = beforeList.length; i < len; i++ ) {
			var beforePath = beforeList[i];
			var beforeName = beforePath.replace( this.PATH.BEFORE, '' );
			var afterIndex = afterList.indexOf( this.PATH.AFTER + beforeName );

			if( afterIndex === -1 ) {
				delete afterList[i];
				onlyBeforePaths.push( beforePath );
				continue;
			}
			var afterPath = afterList[i];
			matchPaths.push({
				before: beforePath,
				after: afterPath
			});
		}

		for( var i = 0,len = afterList.length; i < len; i++ ) {
			var afterName = afterList[i];
			if( afterName ) {
				onlyAfterPaths.push( afterList[i] );
			}
		}

		this.compareTotalCount = matchPaths.length;
		this.compareQueue = matchPaths;

		this.listImagePaths( matchPaths, onlyBeforePaths, onlyAfterPaths );
		this.startCompare();

		this.log( 'before', onlyBeforePaths );
		this.log( 'after', onlyAfterPaths );
	},
	listImagePaths: function ( matchPaths, onlyBeforePaths, onlyAfterPaths ) {

	},
	startCompare: function () {
		this.compareStatus = this.COMPARE_STATUS.RUNNING;
		this.$body.addClass( this.CLASSNAME.IS_LOADING );
		this.updateControlButton();

		this.$loader.fadeIn( 500, function () {
			if( this.compareQueue && this.compareQueue.length > 0 ) {
				this.executeCompare();
			}else {
				this.getPath();
			}
		}.bind(this));
	},
	stopCompare: function () {
		this.compareStatus = this.COMPARE_STATUS.STOP;
		this.$body.removeClass( this.CLASSNAME.IS_LOADING );
		this.$loader.fadeOut( 500, function () {
			this.updateControlButton();

			var isCompleted = this.compareQueue.length === 0;
			if( isCompleted ) {
				this.completeCompare();
			}
		}.bind(this));
	},
	completeCompare: function () {
		this.resetLoader();

		var notification = new window.Notification(
			'Compare Images',
			{
				body: 'Compate Image has been completed.'
			}
		);
		setTimeout(function () {
			notification.close();
		}, 3000);
	},
	resetCompare: function () {
		this.resetParameters();
		this.updateControlButton();
	},
	executeCompare: function () {
		if( endCompare = this.compareQueue.length === 0 ||
			this.compareStatus === this.COMPARE_STATUS.STOP ) {
			this.stopCompare();
			return;
		}

		var _this = this;
		var comparePaths = this.compareQueue[0];
		var compare = this.compareFunction( comparePaths.before, comparePaths.after );

		compare.async().then( function () {
			_this.compareQueue.shift();
			_this.afterCompare( compare );
			//メモリリーク対策のためにGC後に遅延実行
			compare = null;
			setTimeout(function () {
				_this.executeCompare();
			}, 200);
		});
	},
	afterCompare: function ( compare ) {
		this.appendRow( compare );
	},
	compareFunction: function ( beforePath, afterPath ) {
		console.log( 'compare index is ' + this.compareIndex + '.' );

		var currentCount = this.compareIndex + 1;
		var progress = currentCount / this.compareTotalCount * 100;
		this.$current.text( currentCount );
		this.$total.text( this.compareTotalCount );
		this.$loadBar.css( 'width', progress + '%' );

		var compare = new COMPARE_IMAGE.Compare([
			beforePath,
			afterPath
		]);

		++this.compareIndex;
		return compare;
	},
	appendRow: function ( compare ) {
		var $template = this.editTemplate(
			this.$template.children().clone(true),
			compare
		);
		$template.data('compare-path', compare.imagePathList);

		var $fileHead = $('.jsc-compareimage-filehead');
		$fileHead.attr('colspan', compare.imageList.length);

		this.$output.append( $template );
	},
	editTemplate: function ( $template, compare ) {
		var isEqualImage;

		var $number = $template.find('.jsc-compareimage-number');
		if( $number.length > 0 ) {
			$number.text( this.compareIndex );
		}

		if( compare.compareData ) {
			var isEqualImage = compare.compareData.isEqualImage;
			var mergeData = compare.compareData.mergeData;
			var indexes = mergeData.indexes;
			var resultText = isEqualImage ? '○' : '×';
			var $result = $template.find( '.jsc-compareimage-result' );
			$result.text( resultText );

			if( indexes && indexes.length > 0 ) {
				$template.addClass( this.CLASSNAME.NOT_MATCH );
				var $meter = $template.find('.jsc-compareimage-diffmeter');
				var diffPercent = indexes.length / mergeData.data.length * 100;

				if( diffPercent < 1 ) {
					diffPercent = 1;
				}

				$meter.attr('max', 100);
				$meter.attr('value', diffPercent );
			}else {
				$template.removeClass( this.CLASSNAME.NOT_MATCH );
			}
		}
		if( compare.imageList.length > 0 ) {
			var $cellList = this.createImageCell( $template, compare );
			$template.append( $cellList );
		}
		return $template;
	},
	createImageCell: function ( $template, compare ) {
		var _this = this;
		var $cellList;
		var $templateCell = $template.find('.jsc-compareimage-filecell').detach();

		$.each( compare.imageList, function () {
			var src = this.src;
			var $cell = $templateCell.clone(true);
			var $fileName = $cell.find( '.jsc-compareimage-filename' );
			$fileName.text( src );
			$cell.append( $fileName );

			if( $cellList ) {
				$cellList = $cellList.add( $cell );
			}else {
				$cellList = $cell;
			}
		});
		return $cellList;
	},
	getImageFileName: function ( imageList ) {
		if( imageList.length === 0 ) {
			return '';
		}
		var _this = this;
		var fileNameList = [];
		$.each( imageList, function () {
			fileNameList.push( this.src );
		});
		return fileNameList.join(', ');
	},
	updateControlButton: function () {
		var isInit = this.compareQueue === undefined;
		var isEnd = this.compareQueue !== undefined && this.compareQueue.length === 0;
		var isStop = this.compareStatus === this.COMPARE_STATUS.STOP;

		var isEnabledStart = true;
		var isEnabledStop = true;
		var isEnabledReset = true;

		if( isInit ) {
			isEnabledStop = false;
			isEnabledReset = false;
		}
		else if( isEnd ) {
			isEnabledStart = false;
			isEnabledStop = false;
		}
		else if( isStop ) {
			isEnabledStop = false;
		}else {
			isEnabledStart = false;
		}

		this.setEnabledButton( this.$controlStart, isEnabledStart );
		this.setEnabledButton( this.$controlStop, isEnabledStop );
		this.setEnabledButton( this.$controlReset, isEnabledReset );
	},
	setEnabledButton: function ( $target, enabled ) {
		if( enabled ) {
			$target.removeClass( this.CLASSNAME.DISABLED );
			$target.removeAttr( 'disabled' );
		}else {
			$target.addClass( this.CLASSNAME.DISABLED );
			$target.attr( 'disabled', 'disabled' );
		}
	},
	log: function ( message, data ) {
		if( data instanceof Array ) {
		}else {
		}
	}
};

COMPARE_IMAGE.Compare = function ( imagePathList ) {
	this.imagePathList = imagePathList;
	return this;
};
COMPARE_IMAGE.Compare.prototype = {
	async: function () {
		var _this = this;
		this.compareResult = new $.Deferred;
		this.init();
		return this.compareResult.promise();
	},
	init: function () {
		this.setParameters();
		this.compareImage();
	},
	setParameters: function () {
		var _this = this;
		this.$base = $('.jsc-compareimage');
		this.$tmp = $('<div>').css('visibility', 'hidden');
		this.$base.append( this.$tmp );
	},
	compareImage: function () {
		var _this = this;
		this.imageList = [];
		$.when(
			this.loadImages()
		).done(function () {
			_this.loadedImages();
			if( _this.compareResult ) {
				_this.compareResult.resolve();
			}
		}).fail(function () {
			if( _this.compareResult ) {
				_this.compareResult.reject();
			}
		});
	},
	loadImages: function () {
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
				_this.imageList.push( _this.getImageData( $( image ) ) );
				if( _this.imageList.length === loadCount ) {
					d.resolve();
				}
			});
			_this.$tmp.append( $image );
		});
		return d.promise();
	},
	loadedImages: function () {
		this.$tmp.remove();
		this.$tmp = null;
		this.compareData = this.compareImageData();
	},
	getImageData: function ( $image ) {
		var width = $image.width();
		var height = $image.height();
		var imageData;
		var $canvas = $('<canvas>').attr( 'width', width ).attr( 'height', height );
		var context = $canvas.get(0).getContext('2d');

		context.drawImage( $image.get(0), 0, 0 );
		imageData = context.getImageData(0, 0, width, height);
		imageData.src = $image.attr('src');
		return imageData;
	},
	compareImageData: function () {
		if( this.imageList.length === 0 ) {
			return;
		}
		var _this = this;

		var firstData;
		var mergeData;
		var isEqualImage;
		var maxLength;

		$.each( this.imageList, function () {
			isEqualImage = true;

			if( firstData === undefined ) {
				firstData = this;
				return true;
			}else {
				var firstPixelData = firstData.data;
				var firstPixelDataLength = firstPixelData.length;
				var secondData = this;
				var secondPixelData = secondData.data;
				var secondPixelDataLength = secondPixelData.length;

				if( mergeData === undefined ) {
					if( firstPixelDataLength > secondPixelDataLength ) {
						maxLength = firstPixelDataLength;
						mergeData = firstData;
					}else {
						maxLength = secondPixelDataLength;
						mergeData = secondData;
					}
					mergeData.indexes = [];
				}

				for( var i = 0; i < maxLength; i++ ) {
					var isDiff =
						i > firstPixelDataLength - 1 ||
						i > secondPixelDataLength - 1 ||
						firstPixelData[i] !== secondPixelData[i];

					if( isDiff ) {
						isEqualImage = false;
						mergeData.data[i] = i % 3 === 0 ? 50 : 0;
						mergeData.indexes.push( i );
					}
				}
			}
		});
		return {
			isEqualImage: isEqualImage,
			mergeData: mergeData
		};
	}
};
$(function () {
	new COMPARE_IMAGE.Controller();
});
