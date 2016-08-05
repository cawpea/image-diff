var COMPARE_IMAGE = window.COMPARE_IMAGE || {};

COMPARE_IMAGE.Controller = function() {
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
	init: function() {
		this.getElements();
		this.resetParameters();
		this.bindEvents();
		this.updateControlButton();
		this.checkNotification();
	},
	getElements: function() {
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
		this.$resultMatch = $('.jsc-compareimage-result-match');
		this.$resultUnMatch = $('.jsc-compareimage-result-unmatch');
	},
	bindEvents: function() {
		var _this = this;
		this.$controlStart.on('click', function() {
			_this.startCompare();
		});
		this.$controlStop.on('click', function() {
			_this.stopCompare();
		});
		this.$controlReset.on('click', function() {
			_this.resetCompare();
		});
		this.$output.on('click', '.jsc-compareimage-viewtrigger', function(e) {
			_this.onClickViewTrigger($(this), e);
		});
		this.$output.on('change', '.jsc-compareimage-viewtrigger', function() {
			_this.onChangeViewTrigger($(this));
		});
		this.$viewClose.on('click', function() {
			_this.onClickViewClose();
		});
	},
	resetParameters: function() {
		this.compareQueue = undefined;
		this.compareStatus = this.COMPARE_STATUS.STOP;
		this.$output.empty();
		this.$base.removeClass(this.CLASSNAME.SHOW_VIEW);
		this.resetLoader();
		this.resetResult();
		this.clearCanvas();
	},
	resetLoader: function() {
		this.compareIndex = 0;
		this.$loadBar.css('width', 0);
		this.$current.text('0');
	},
	resetResult: function() {
		this.$resultMatch.text('0');
		this.$resultUnMatch.text('0');
	},
	checkNotification: function() {
		if (!('Notification' in window)) {
			console.log('This browser is unsupported notifcation.');
			return;
		}
		var _this = this;
		if (window.Notification.permission !== 'denied') {
			window.Notification.requestPermission(function(permission) {
				if (permission === 'granted') {
					_this.arrowNotification = true;
				}
			});
		}
	},
	onClickViewTrigger: function($target, event) {
		var comparePath = $target.data('compare-path');
		if (comparePath === undefined) {
			return;
		}
		this.showMergeImage(comparePath);

		if (!$(event.target).is('input[type="checkbox"]')) {
			this.changeCheck($target);
		}
	},
	onChangeViewTrigger: function($target) {
		var isNotMatch = $target.hasClass(this.CLASSNAME.NOT_MATCH);
		if (isNotMatch) {
			console.log('change the not match');
		} else {
			console.log('change the match');
		}
	},
	onClickViewClose: function() {
		this.$base.removeClass(this.CLASSNAME.SHOW_VIEW);
	},
	getPath: function() {
		var _this = this;

		this.compareQueue = [];

		$.ajax({
			type: 'GET',
			dataType: 'json',
			url: '/api/v1/get-image/',
			success: function(json) {
				if (!json) {
					return;
				};
				_this.compareImageList(json.before, json.after);
			},
			error: function() {
				_this.error('Faild commnunicate with server.');
				_this.stopCompare();
			}
		});
	},
	showMergeImage: function(comparePath) {
		var _this = this;
		var compare = new COMPARE_IMAGE.Compare(comparePath);
		compare.async().then(
			function() {
				var compareData = compare.compareData;
				if (!compareData || !compareData.mergeData) {
					return;
				}
				_this.setImageToCanvas(compareData.mergeData);
				_this.$base.addClass(_this.CLASSNAME.SHOW_VIEW);
				_this.$viewBeforeName.text(comparePath[0]);
				_this.$viewAfterName.text(comparePath[1]);
			},
			function() {
				_this.error('Can not show the merge image.');
			}
		);
	},
	changeCheck: function($template) {
		var $check = $template.find('.jsc-compareimage-check');
		var isCheck = $check.prop('checked');
		$check.prop('checked', !isCheck).trigger('change');
	},
	setImageToCanvas: function(imageData) {
		var context = this.$viewCanvas.get(0).getContext('2d');

		this.clearCanvas();
		this.$viewCanvas.attr('width', imageData.width).attr('height', imageData.height);
		context.createImageData(imageData.width, imageData.height);
		context.putImageData(imageData, 0, 0);

		this.currentImageData = imageData;
	},
	clearCanvas: function() {
		if (!this.currentImageData) {
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
	compareImageList: function(beforeList, afterList) {
		if (beforeList.length === 0 || afterList.length === 0) {
			this.error('"' + this.PATH.BEFORE + '" is empty.');
			this.stopCompare();
			return;
		}

		var matchPaths = [];
		var onlyBeforePaths = [];
		var onlyAfterPaths = [];

		for (var i = 0, len = beforeList.length; i < len; i++) {
			var beforePath = beforeList[i];
			var beforeName = beforePath.replace(this.PATH.BEFORE, '');
			var afterIndex = afterList.indexOf(this.PATH.AFTER + beforeName);

			if (afterIndex === -1) {
				onlyBeforePaths.push(beforePath);
				continue;
			}
			var afterPath = afterList[afterIndex];
			matchPaths.push({
				before: beforePath,
				after: afterPath
			});
			delete afterList[afterIndex];
		}

		for (var i = 0, len = afterList.length; i < len; i++) {
			var afterName = afterList[i];
			if (afterName) {
				onlyAfterPaths.push(afterList[i]);
			}
		}

		this.compareTotalCount = matchPaths.length;
		this.compareQueue = matchPaths;

		this.showNotComparePaths(onlyBeforePaths, onlyAfterPaths);
		this.startCompare();

		this.log('before', onlyBeforePaths);
		this.log('after', onlyAfterPaths);
	},
	showNotComparePaths: function(onlyBeforePaths, onlyAfterPaths) {
		var index = 0;

		for( var pathStr of onlyAfterPaths ) {
			this.appendNotCompareRow( pathStr, index++ );
		}
		for( var pathStr of onlyAfterPaths ) {
			this.appendNotCompareRow( pathStr, index++ );
		}
	},
	startCompare: function() {
		this.compareStatus = this.COMPARE_STATUS.RUNNING;
		this.compareMatchCount = 0;
		this.compareUnMatchCount = 0;

		this.$body.addClass(this.CLASSNAME.IS_LOADING);
		this.updateControlButton();

		this.$loader.fadeIn(500, function() {
			if (this.compareQueue && this.compareQueue.length > 0) {
				this.executeCompare();
			} else {
				this.getPath();
			}
		}.bind(this));
	},
	stopCompare: function() {
		this.compareStatus = this.COMPARE_STATUS.STOP;
		this.$body.removeClass(this.CLASSNAME.IS_LOADING);
		this.$loader.fadeOut(500, function() {
			this.updateControlButton();

			var isCompleted = this.compareQueue.length === 0;
			if (isCompleted) {
				this.completeCompare();
			}
		}.bind(this));
	},
	afterCompare: function(compare) {
		this.appendCompareRow(compare);

		if (compare.compareData.isEqualImage) {
			++this.compareMatchCount;
		} else {
			++this.compareUnMatchCount;
		}
	},
	completeCompare: function() {
		this.resetLoader();

		this.$resultMatch.text(this.compareMatchCount);
		this.$resultUnMatch.text(this.compareUnMatchCount);

		var notification = new window.Notification('Compate Image has been completed.');
		setTimeout(function() {
			notification.close();
		}, 3000);
	},
	resetCompare: function() {
		this.resetParameters();
		this.updateControlButton();
	},
	executeCompare: function() {
		if (endCompare = this.compareQueue.length === 0 ||
			this.compareStatus === this.COMPARE_STATUS.STOP) {
			this.stopCompare();
			return;
		}

		var _this = this;
		var comparePaths = this.compareQueue[0];
		var compare = this.compareFunction(comparePaths.before, comparePaths.after);

		compare.async().then(
			function() {
				_this.compareQueue.shift();
				_this.afterCompare(compare);
				//メモリリーク対策のためにGC後に遅延実行
				compare = null;
				setTimeout(function() {
					_this.executeCompare();
				}, 200);
			},
			function() {
				_this.error('Can not compare the images.');
			}
		);
	},
	compareFunction: function(beforePath, afterPath) {
		console.log('compare index is ' + this.compareIndex + '.');

		var currentCount = this.compareIndex + 1;
		var progress = currentCount / this.compareTotalCount * 100;
		this.$current.text(currentCount);
		this.$total.text(this.compareTotalCount);
		this.$loadBar.css('width', progress + '%');

		var compare = new COMPARE_IMAGE.Compare([
			beforePath,
			afterPath
		]);

		++this.compareIndex;
		return compare;
	},
	appendCompareRow: function(compare) {
		var parameter = {};
		var resultText;
		var diffPercent;

		if( compare.compareData ) {
			var isEqualImage = compare.compareData.isEqualImage;
			var mergeData = compare.compareData.mergeData;
			var indexes = mergeData.indexes;
			resultText = isEqualImage ? '○' : '×';

			if (indexes && indexes.length > 0) {
				diffPercent = indexes.length / mergeData.data.length * 100;
			}
		}
		parameter.index = this.compareIndex;
		parameter.resultText = resultText;
		parameter.diffPercent = diffPercent;
		parameter.imageList = compare.imageList;

		var $template = this.editTemplate(
			this.$template.children().clone(true),
			parameter
		);

		$template.data('compare-path', compare.imagePathList);

		var $fileHead = $('.jsc-compareimage-filehead');
		$fileHead.attr('colspan', compare.imageList.length);

		this.$output.append($template);
	},
	appendNotCompareRow: function( pathStr, index ) {
		console.log( `pathStr=${pathStr}, index=${index}` );
	},
	editTemplate: function($template, parameter) {
		var index = parameter.index || '-';
		var resultText = parameter.resultText || '-';
		var diffPercent = parameter.diffPercent || 0;
		var imageList = parameter.imageList || [];

		var $number = $template.find('.jsc-compareimage-number');
		var $result = $template.find('.jsc-compareimage-result');
		var $meter = $template.find('.jsc-compareimage-diffmeter');

		if ($number.length > 0) {
			$number.text( index );
		}

		if( resultText ) {
			$result.text( resultText );
		}

		if( diffPercent > 0 ) {
			$template.addClass(this.CLASSNAME.NOT_MATCH);

			if (diffPercent < 1) {
				diffPercent = 1;
			}

			$meter.attr('max', 100);
			$meter.attr('value', diffPercent );
		}else {
			$template.removeClass(this.CLASSNAME.NOT_MATCH);
		}

		if( imageList.length > 0 ) {
			var $cellList = this.createImageCell($template, imageList);
			$template.append($cellList);
		}

		return $template;
	},
	createImageCell: function($template, imageList) {
		var _this = this;
		var $cellList;
		var $templateCell = $template.find('.jsc-compareimage-filecell').detach();

		$.each(imageList, function() {
			var src = this.src;
			var $cell = $templateCell.clone(true);
			var $fileName = $cell.find('.jsc-compareimage-filename');
			$fileName.text(src);
			$cell.append($fileName);

			if ($cellList) {
				$cellList = $cellList.add($cell);
			} else {
				$cellList = $cell;
			}
		});
		return $cellList;
	},
	getImageFileName: function(imageList) {
		if (imageList.length === 0) {
			return '';
		}
		var _this = this;
		var fileNameList = [];
		$.each(imageList, function() {
			fileNameList.push(this.src);
		});
		return fileNameList.join(', ');
	},
	updateControlButton: function() {
		var isInit = this.compareQueue === undefined;
		var isEnd = this.compareQueue !== undefined && this.compareQueue.length === 0;
		var isStop = this.compareStatus === this.COMPARE_STATUS.STOP;

		var isEnabledStart = true;
		var isEnabledStop = true;
		var isEnabledReset = true;

		if (isInit) {
			isEnabledStop = false;
			isEnabledReset = false;
		} else if (isEnd) {
			isEnabledStart = false;
			isEnabledStop = false;
		} else if (isStop) {
			isEnabledStop = false;
		} else {
			isEnabledStart = false;
		}

		this.setEnabledButton(this.$controlStart, isEnabledStart);
		this.setEnabledButton(this.$controlStop, isEnabledStop);
		this.setEnabledButton(this.$controlReset, isEnabledReset);
	},
	setEnabledButton: function($target, enabled) {
		if (enabled) {
			$target.removeClass(this.CLASSNAME.DISABLED);
			$target.removeAttr('disabled');
		} else {
			$target.addClass(this.CLASSNAME.DISABLED);
			$target.attr('disabled', 'disabled');
		}
	},
	log: function(message, data) {
		if (data instanceof Array) {} else {}
	},
	error: function(message) {
		alert('ERROR: ' + message);
	}
};

COMPARE_IMAGE.Compare = function(imagePathList) {
	this.imagePathList = imagePathList;
	return this;
};
COMPARE_IMAGE.Compare.prototype = {
	async: function() {
		var _this = this;
		this.compareResult = new $.Deferred;
		this.init();
		return this.compareResult.promise();
	},
	init: function() {
		this.setParameters();
		this.compareImage();
	},
	setParameters: function() {
		var _this = this;
		this.$base = $('.jsc-compareimage');
		this.$tmp = $('<div>').css('visibility', 'hidden');
		this.$base.append(this.$tmp);
	},
	compareImage: function() {
		var _this = this;
		this.imageList = [];
		$.when(
			this.loadImages()
		).done(function() {
			_this.loadedImages();
			if (_this.compareResult) {
				_this.compareResult.resolve();
			}
		}).fail(function() {
			if (_this.compareResult) {
				_this.compareResult.reject();
			}
		});
	},
	loadImages: function() {
		var d = new $.Deferred;
		var _this = this;
		var loadCount = this.imagePathList.length;

		$.each(this.imagePathList, function() {
			var url = this;
			var $image = $('<img>');
			$image.attr('src', url);
			//$image.get(0).crossOrigin = "Anonymous";
			$image.on('load', function() {
				var image = this;
				_this.imageList.push(_this.getImageData($(image)));
				if (_this.imageList.length === loadCount) {
					d.resolve();
				}
			});
			_this.$tmp.append($image);
		});
		return d.promise();
	},
	loadedImages: function() {
		this.$tmp.remove();
		this.$tmp = null;
		this.compareData = this.compareImageData();
	},
	getImageData: function($image) {
		var width = $image.width();
		var height = $image.height();
		var imageData;
		var $canvas = $('<canvas>').attr('width', width).attr('height', height);
		var context = $canvas.get(0).getContext('2d');

		context.drawImage($image.get(0), 0, 0);
		imageData = context.getImageData(0, 0, width, height);
		imageData.src = $image.attr('src');
		return imageData;
	},
	compareImageData: function() {
		if (this.imageList.length === 0) {
			return;
		}
		var _this = this;

		var firstData;
		var mergeData;
		var isEqualImage;
		var maxLength;

		$.each(this.imageList, function() {
			isEqualImage = true;

			if (firstData === undefined) {
				firstData = this;
				return true;
			} else {
				var firstPixelData = firstData.data;
				var firstPixelDataLength = firstPixelData.length;
				var secondData = this;
				var secondPixelData = secondData.data;
				var secondPixelDataLength = secondPixelData.length;

				if (mergeData === undefined) {
					if (firstPixelDataLength > secondPixelDataLength) {
						maxLength = firstPixelDataLength;
						mergeData = firstData;
					} else {
						maxLength = secondPixelDataLength;
						mergeData = secondData;
					}
					mergeData.indexes = [];
				}

				for (var i = 0; i < maxLength; i++) {
					var isDiff =
						i > firstPixelDataLength - 1 ||
						i > secondPixelDataLength - 1 ||
						firstPixelData[i] !== secondPixelData[i];

					if (isDiff) {
						isEqualImage = false;
						mergeData.data[i] = i % 3 === 0 ? 50 : 0;
						mergeData.indexes.push(i);
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
$(function() {
	new COMPARE_IMAGE.Controller();
});
