Hosts.skydrive = function uploadSkyDrive(req, callback){
	console.log('SkyDrive Uploading is BETA');
	function checkLogin(){
		var xhr = new XMLHttpRequest();
		xhr.open('GET', 'https://skydrive.live.com/', true);
		xhr.send(null);
		xhr.onload = function(){
			var cid = xhr.responseText.match(/cid-([a-z0-9]+)\//);
			if(cid && (cid = cid[1])){

				var url = 'https://skydrive.live.com/upload.aspx/.Documents?sc=documents&nonrich=1&cid='+cid;

				/* firefox and chrome share the same logic, but they are different in API */
				if (isFirefox) {
					var pwned = 0;
					var tab = gBrowser.addTab(url), tbrowser = gBrowser.getBrowserForTab(tab);
					tbrowser.addEventListener('load', function() {
						var getParams = function() {
							var doc = tbrowser.contentDocument.getElementById('appFrame').contentDocument;
							var vs = doc.getElementsByName('__VIEWSTATE')[0];
							var cy = doc.getElementsByName('canary')[0];
							if (pwned > 5000) {
								callback("error: Upload failed, cannot get upload parameters");
							} else if (!vs || !cy) {
								setTimeout(getParams, 100);
								pwned += 100;
							} else {
								upload(cy.getAttribute('value'), vs.getAttribute('value'));
								gBrowser.removeTab(tab);
							}
						}
						getParams();
					}, true);
				} else {
					chrome.tabs.create({ url: url, active: false }, function(tab) {
						var scriptInjected = false;
						var listener = function(tabId, info) {
							var obj;
							if (tab.id != tabId ||	/* only listen to the tab just created */
								(('complete' != info.status || scriptInjected) &&	/* inject script only once */
								!(obj = /dsbcallback=(.*)$/.exec(info.url))))	/* params obtained */
								return;

							if (!obj) {
								scriptInjected = true;
								/* TODO: inline code */
								chrome.tabs.executeScript(tab.id, {
									code: "\
(function() {\
	var pwned = 0;\
	var getParams = function() {\
		var frm = document.getElementById('appFrame');\
		var doc = !frm ? null : frm.contentDocument;\
		var vs = !doc ? null : doc.getElementsByName('__VIEWSTATE')[0];\
		var cy = !doc ? null : doc.getElementsByName('canary')[0];\
		if (!vs || !cy) {\
			pwned += 100;\
			if (pwned > 5000) {\
				location.href += '#dsbcallback=' + encodeURI(JSON.stringify({\
					error: true,\
					msg: 'error: Upload failed, cannot get upload parameters'\
				}));\
			} else {\
				setTimeout(getParams, 100);\
			}\
		} else {\
			location.href += '#dsbcallback=' + encodeURI(JSON.stringify({\
				'canary': cy.getAttribute('value'),\
				'viewstate': vs.getAttribute('value')\
			}));\
		}\
	};\
	getParams();\
})()"
								});
							} else {
								chrome.tabs.onUpdated.removeListener(listener);
								obj = JSON.parse(decodeURI(obj[1]));
								if (obj.error)
									callback(obj.msg);
								else
									upload(obj.canary, obj.viewstate);
								chrome.tabs.remove(tab.id);
							}
						};
						chrome.tabs.onUpdated.addListener(listener);
					});
				}

				var upload = function(canary, viewstate) {
				  var uploader = new XMLHttpRequest();
				  uploader.open('POST', url, true);
				  uploader.onload = function(){
						var url = uploader.responseText.match(/http-equiv[\s]*=[\s]*"refresh".*url=([^"]+)"/i);
						if (url && (url = url[1])) {
							var div = 'undefined' == typeof gBrowser ?
								document.createElement('div') :
								/* .textContent of firefox xul elements are always empty */
								gBrowser.contentWindow.wrappedJSObject.document.createElement('div');
							div.innerHTML = url;
							callback({ url: div.textContent });
						} else
							callback({ url: "https://skydrive.live.com/" });
				  }
				  var o = {
					  __VIEWSTATE: viewstate,
					  canary: canary,
					  fileUpload1: req,
					  hiddenInput: '',
					  photoSize: '1600'
				  };
				  o['fileUpload2"; filename="'] = '';
				  o['fileUpload3"; filename="'] = '';
				  o['fileUpload4"; filename="'] = '';
				  o['fileUpload5"; filename="'] = '';
				  uploader.sendMultipart(o);
				};
				//down.send(null);
			}else{
				var redirect = xhr.responseText.match(/url=(.+)"/)[1];
				var div = 'undefined' == typeof gBrowser ?
					document.createElement('div') :
					/* .textContent of firefox xul elements are always empty */
					gBrowser.contentWindow.wrappedJSObject.document.createElement('div');
				div.innerHTML = redirect;
				console.log('Calculated URL', div.textContent);
				loginTab(div.textContent, 'https://skydrive', checkLogin);
			}
		}
	}
	checkLogin();
}


