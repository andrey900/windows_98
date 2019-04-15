'use strict';

class _System
{
	constructor(options) {
		let windowsOptions = {
			workspaceSelector: '.workspace',
			defaultWindowTemplateSelector: '#default-window-template'
		};
		
		if( typeof options == 'object' && options.windows != undefined ){
			windowsOptions = options.windows;
		}

		this.Windows = new Windows(windowsOptions);
	}
}

class Windows
{
	windowsStack = [];

	constructor(options) {
		var self = this;

		if( typeof options == 'object' ){
			this.workspace = document.querySelector(options.workspaceSelector),
			this.defaultWindowTemplate = document.querySelector(options.defaultWindowTemplateSelector)
		}

		this.heandleEvent();
	}

	heandleEvent(){
		var self = this;

		this.workspace.addEventListener('Window.Closed', function(e){
			let idx = self.windowsStack.indexOf(e.detail.window);
			self.windowsStack.splice(idx, 1);
			if( self.windowsStack.length > 0 ){
				self.windowsStack[self.windowsStack.length - 1].activated();
			}
		});

		this.workspace.addEventListener('Window.Activating', function(e){
			// new Promise(resolve => setTimeout(resolve, ms));
			if( self.windowsStack.length > 1 ){
				self.windowsStack[self.windowsStack.length-1].deactivated();
			}
			self.windowsStack.push(self.windowsStack.splice(self.windowsStack.indexOf(e.detail.window), 1)[0]);

			if( self.windowsStack.length > 1 ){
				var referenceNode = self.windowsStack[self.windowsStack.length-2].dom;
				var currentNode = self.windowsStack[self.windowsStack.length-1].dom;
				referenceNode.parentNode.insertBefore(currentNode, referenceNode.nextSibling);
			}
		});
	}

	Window(options){
		var self = this;

		options.workspace = self.workspace;
		if( !options.dom ){
			var tmpDiv = document.createElement('div');
				tmpDiv.innerHTML = self.defaultWindowTemplate.innerHTML;
			options.dom = tmpDiv.firstElementChild;
		}

		var event = new CustomEvent(
			"Window.Initialized", 
			{
				detail: {options: options},
				bubbles: true,
				cancelable: true
			}
		);
		self.workspace.dispatchEvent(event);

		let newWindow = new Window(options);

		var event = new CustomEvent(
			"Window.Loaded", 
			{
				detail: {options: options, window: newWindow},
				bubbles: true,
				cancelable: true
			}
		);
		self.workspace.dispatchEvent(event);
		
		self.workspace.appendChild(newWindow.dom);
		var event = new CustomEvent(
			"Window.ContentRendered", 
			{
				detail: {window: newWindow},
				bubbles: true,
				cancelable: true
			}
		);
		self.workspace.dispatchEvent(event);
		
		this.windowsStack.unshift(newWindow);

		newWindow.activated();

		// console.log('Event: Window.Closing');
		// console.log('Event: Window.Unloaded');
		// console.log('Event: Window.Closed');

		return newWindow;
	}
}

class Window
{
	active = false;
	maximized = false;
	maximizedDisable = false;

	minWidth = 280;
	minHeight = 180;
	// maxWidth = 768;
	// maxHeight = 480;

	constructor(options) {
		if( typeof options == 'object' ){
			this.dom = options.dom;
			this.workspace = options.workspace;
			this.dom.window = this;
			this.setTitle(options.title);
		}

		this.initHeandlers();
	}

	setTitle(title) {
		this.title = title;
		this.dom.querySelector('[data-title]').innerText = title;
	}

	isActive() {
		return this.active;
	}

	activated() {
		if( this.isActive() ){
			return;
		}

		var event = new CustomEvent(
			"Window.Activating", 
			{
				detail: {window: this},
				bubbles: true,
				cancelable: true
			}
		);
		this.dom.dispatchEvent(event);

		this.dom.classList.add('active');
		this.active = true;

		var event = new CustomEvent(
			"Window.Activated", 
			{
				detail: {window: this},
				bubbles: true,
				cancelable: true
			}
		);
		this.dom.dispatchEvent(event);
	}

	deactivated() {
		this.dom.classList.remove('active');
		this.active = false;

		var event = new CustomEvent(
			"Window.Deactivated", 
			{
				detail: {window: this},
				bubbles: true,
				cancelable: true
			}
		);
		this.dom.dispatchEvent(event);
	}

	close() {
		var event = new CustomEvent(
			"Window.Closing", 
			{
				detail: {window: this, Cancel: false},
				bubbles: true,
				cancelable: true
			}
		);
		this.dom.dispatchEvent(event);

		if(!event.detail.Cancel){
			this.dom.remove();

			var event = new CustomEvent(
				"Window.Closed", 
				{
					detail: {window: this},
					bubbles: true,
					cancelable: true
				}
			);
			this.workspace.dispatchEvent(event);
		}
	}

	getPosition = function(){
		return [parseInt(this.dom.style.left), parseInt(this.dom.style.top)];
	}

	position = function(x, y){
		this.dom.style.top = y+"px";
		this.dom.style.left = x+"px";
		return this;
	}

	isMaximized() {
		return (new Boolean(this.maximized)).valueOf();
	}

	maximize() {
		if( this.maximizedDisable )
			return;

		if( this.isMaximized() ){
			this.dom.classList.add('animation');
			this.position(this.prevPosX, this.prevPosY);
			this.dom.style.width = this.width;
			this.dom.style.height = this.height;
			this.dom.classList.remove('fullscreen');

			this.timeoutActionId = setTimeout(function(){this.dom.classList.remove('animation');}.bind(this), 200);

			var event = new CustomEvent(
				"Window.Demaximized", 
				{
					detail: {window: this},
					bubbles: true,
					cancelable: true
				}
			);
		} else {
			[this.prevPosX, this.prevPosY] = this.getPosition();
			this.width = this.dom.style.width;
			this.height = this.dom.style.height;

			this.dom.classList.add('animation');
			this.timeoutActionId = setTimeout(function(){
				this.dom.style.width = null;
				this.dom.style.height = null;
				this.dom.style.maxWidth = (this.maxWidth > 0) ? this.maxWidth+'px' : null;
				this.dom.style.maxHeight = (this.maxHeight > 0) ? this.maxHeight+'px' : null; 
				this.dom.classList.add('fullscreen');
				this.position(0, 0);
			}.bind(this), 5);
			this.timeoutActionId = setTimeout(function(){this.dom.classList.remove('animation');}.bind(this), 200);

			var event = new CustomEvent(
				"Window.Maximized", 
				{
					detail: {window: this},
					bubbles: true,
					cancelable: true
				}
			);
		}

		this.dom.dispatchEvent(event);

		this.maximized = !this.isMaximized();
	}

	initMove(e){
		this.activated();

    	this.pos_x = e.x;
    	this.pos_y = e.y;
	    this.windowMove = this.dom;
	    document.addEventListener("mousemove", this.eventMoveHeandler, false);
	}

	eventMove(e){
		if(this.isMaximized()){
			return;
		}
		this.dom.classList.remove('animation');
		const dx = this.pos_x - e.x;
		const dy = this.pos_y - e.y;
		this.pos_x = e.x;
		this.pos_y = e.y;
		this.dom.style.left = (parseInt(getComputedStyle(this.dom, '').left) - dx) + "px";
		this.dom.style.top = (parseInt(getComputedStyle(this.dom, '').top) - dy) + "px";
	}

	eventMoveHeandler = this.eventMove.bind(this);

	initResize(e){
		if (e.offsetX > e.target.offsetWidth-12 && e.offsetY > e.target.offsetHeight-12) {
			this.pos_x = e.x;
			this.pos_y = e.y;
			document.addEventListener("mousemove", this.eventResizeHeandler, false);
		}
	}

	eventResize(e) {
		const dx = this.pos_x - e.x;
		const dy = this.pos_y - e.y;
		this.pos_x = e.x;
		this.pos_y = e.y;
		let width = (parseInt(getComputedStyle(this.dom, '').width) - dx);
		if( width < this.minWidth){
			width = this.minWidth;
		}
		if( width > this.maxWidth ){
			width = this.maxWidth;
		}
		this.dom.style.width = width + "px";
		let height = (parseInt(getComputedStyle(this.dom, '').height) - dy);
		if( height < this.minHeight){
			height = this.minHeight;
		}
		if( height > this.maxHeight){
			height = this.maxHeight;
		}
		this.dom.style.height = height + "px";
	}

	eventResizeHeandler = this.eventResize.bind(this);

	initHeandlers() {
		this.dom.addEventListener('click', this.activated.bind(this));
		this.dom.querySelector('[action=close]').addEventListener('click', this.close.bind(this));
		this.dom.querySelector('[action=maximized]').addEventListener('click', this.maximize.bind(this));
		this.dom.querySelector('[data-head]').addEventListener('dblclick', this.maximize.bind(this));

		this.dom.querySelector('.window-head--title').addEventListener("mousedown", this.initMove.bind(this), false);
		this.workspace.addEventListener("mouseup", function(){
			if( this.windowMove ){
		    	document.removeEventListener("mousemove", this.eventMoveHeandler, false);
		    	this.windowMove = null;
			}
		}.bind(this), false);

		this.dom.addEventListener("mousedown", this.initResize.bind(this), false);
		this.workspace.addEventListener("mouseup", function(e){
		    document.removeEventListener("mousemove", this.eventResizeHeandler, false);
		}.bind(this), false);
	}
}

var System = {};
document.addEventListener('DOMContentLoaded', function(){
	System = new _System();
	/*
	document.querySelector('.workspace').addEventListener('Window.Initialized', function(e){
		console.log('Event: Window.Initialized');
		console.log(e.detail);
	});
	document.querySelector('.workspace').addEventListener('Window.Loaded', function(e){
		console.log('Event: Window.Loaded');
		console.log(e.detail);
	});
	document.querySelector('.workspace').addEventListener('Window.ContentRendered', function(e){
		console.log('Event: Window.ContentRendered');
		console.log(e.detail);
	});
	document.querySelector('.workspace').addEventListener('Window.Activated', function(e){
		console.log('Event: Window.Activated');
		console.log(e.detail);
	});
	document.querySelector('.workspace').addEventListener('Window.Deactivated', function(e){
		console.log('Event: Window.Deactivated');
		console.log(e.detail);
	});
*/
	System.Windows.Window({title:'Window title test 1'});
	var w2 = System.Windows.Window({title:'Window title test 2'});
	w2.dom.style.top = '50px';
	w2.dom.style.left = '50px';

	var w2 = System.Windows.Window({title:'Window title test 3'});
	w2.dom.style.top = '100px';
	w2.dom.style.left = '100px';
	var w2 = System.Windows.Window({title:'Window title test 4'});
	w2.dom.style.top = '150px';
	w2.dom.style.left = '150px';

	document.querySelector('.workspace').addEventListener('Window.Closing', function(e){
		console.log('Event: Window.Closing');
		// e.detail.Cancel = true;
	});
	// System.Windows.windowsStack[1].activated();
	// System.Windows.windowsStack[0].activated();
	// System.Windows.windowsStack[2].close();
	// System.Windows.windowsStack[1].close();
});