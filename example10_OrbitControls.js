/**
 * @author qiao / https://github.com/qiao
 * @author mrdoob / http://mrdoob.com
 * @author alteredq / http://alteredqualia.com/
 * @author WestLangley / http://github.com/WestLangley
 * @author erich666 / http://erichaines.com
 */

// This set of controls performs orbiting, dollying (zooming), and panning.
// Unlike TrackballControls, it maintains the "up" direction object.up (+Y by default).
//
//    Orbit - left mouse / touch: one-finger move
//    Zoom - middle mouse, or mousewheel / touch: two-finger spread or squish
//    Pan - right mouse, or left mouse + ctrl/metaKey, or arrow keys / touch: two-finger move

THREE.OrbitControls3Dpane = function ( object, domElement ) {

    console.log('domElement', domElement);

    this.domElement = ( domElement !== undefined ) ? domElement : document;
    console.log('this.domElement', this.domElement);
    
    this.object = object;

    // Set to false to disable this control
    this.enabled = true;

    // "target" sets the location of focus, where the object orbits around
    this.target = new THREE.Vector3();

    // How far you can dolly in and out ( PerspectiveCamera only )
    this.minDistance = 0;
    this.maxDistance = Infinity;

    // How far you can zoom in and out ( OrthographicCamera only )
    this.minZoom = 0;
    this.maxZoom = Infinity;

    // How far you can orbit vertically, upper and lower limits.
    // Range is 0 to Math.PI radians.
    this.minPolarAngle = 0; // radians
    this.maxPolarAngle = Math.PI; // radians

    // How far you can orbit horizontally, upper and lower limits.
    // If set, must be a sub-interval of the interval [ -Math.PI, Math.PI ].
    this.minAzimuthAngle = - Infinity; // radians
    this.maxAzimuthAngle = Infinity; // radians
    
    // Set to true to enable damping (inertia)
    // If damping is enabled, you must call controls.update() in your animation loop
    this.enableDamping = false;
    this.dampingFactor = 0.25;

    // This option actually enables dollying in and out; left as "zoom" for backwards compatibility.
    // Set to false to disable zooming
    this.enableZoom = true;
    this.zoomSpeed = 1.0;

    // Set to false to disable rotating
    this.enableRotate = true;
    this.rotateSpeed = 1.0;

    // Enable panning
    this.enablePan = true;
    this.panSpeed = 1.0;

    // if true, pan in screen-space
    this.screenSpacePanning = false;

    // pixels moved per arrow key push
    this.keyPanSpeed = 7.0;
    
    // Set to true to automatically rotate around the target
    // If auto-rotate is enabled, you must call controls.update() in your animation loop
    this.autoRotate = false;
    this.autoRotateSpeed = 2.0; // 30 seconds per round when fps is 60

    // Set to false to disable use of the keys
    this.enableKeys = true;

    // The four arrow keys
    this.keys = { LEFT: 37, UP: 38, RIGHT: 39, BOTTOM: 40 };

    // Mouse buttons
    this.mouseButtons = { LEFT: THREE.MOUSE.LEFT, MIDDLE: THREE.MOUSE.MIDDLE, RIGHT: THREE.MOUSE.RIGHT };

    // for reset
    this.target0 = this.target.clone();
    this.position0 = this.object.position.clone();
    this.zoom0 = this.object.zoom;

    this.isKeyDown = false;
    this.isMouseDown = false;
    this.isTouchDown = false;

    //
    // public methods
    //

    this.getPolarAngle = function () {

        return spherical.phi;

    };

    this.getAzimuthalAngle = function () {

        return spherical.theta;

    };

    this.saveState = function () {

        scope.target0.copy( scope.target );
        scope.position0.copy( scope.object.position );
        scope.zoom0 = scope.object.zoom;

    };

    this.reset = function () {

        scope.target.copy( scope.target0 );
        scope.object.position.copy( scope.position0 );
        scope.object.zoom = scope.zoom0;

        scope.object.updateProjectionMatrix();
        scope.dispatchEvent( changeEvent );

        scope.update();

        state = STATE.NONE;

    };

    this.setZoom = function (zoomFactor) {
        console.log('BEG setZoom');
        console.log('zoomFactor1', zoomFactor); 
        
        if ( scope.object.isPerspectiveCamera ) {

            scope.object.zoom = zoomFactor;
            scope.object.zoom = Math.max( scope.minZoom, Math.min( scope.maxZoom, scope.object.zoom ) );
            scope.object.updateProjectionMatrix();
            zoomChanged = true;

        } else if ( scope.object.isOrthographicCamera ) {

            // scope.object.zoom = Math.max( scope.minZoom, Math.min( scope.maxZoom, scope.object.zoom * dollyScale ) );
            scope.object.zoom = zoomFactor;
            scope.object.zoom = Math.max( scope.minZoom, Math.min( scope.maxZoom, scope.object.zoom ) );
            scope.object.updateProjectionMatrix();
            zoomChanged = true;

        } else {

            console.warn( 'WARNING: OrbitControls3Dpane.js encountered an unknown camera type - setZoom disabled.' );
            scope.enableZoom = false;

        }
        
    };

    // this method is exposed, but perhaps it would be better if we can make it private...
    this.update = function () {

        // console.log('BEG this.update11');
        
        var offset = new THREE.Vector3();

        // so camera.up is the orbit axis
        var quat = new THREE.Quaternion().setFromUnitVectors( object.up, new THREE.Vector3( 0, 1, 0 ) );
        var quatInverse = quat.clone().inverse();

        var lastPosition = new THREE.Vector3();
        var lastQuaternion = new THREE.Quaternion();

        return function update() {
            // console.log('BEG this.update12');
            
            var position = scope.object.position;

            offset.copy( position ).sub( scope.target );

            // rotate offset to "y-axis-is-up" space
            offset.applyQuaternion( quat );

            // angle from z-axis around y-axis
            spherical.setFromVector3( offset );

            if ( scope.autoRotate && state === STATE.NONE ) {

                rotateLeft( getAutoRotationAngle() );

            }

            spherical.theta += sphericalDelta.theta;
            spherical.phi += sphericalDelta.phi;

            // restrict theta to be between desired limits
            spherical.theta = Math.max( scope.minAzimuthAngle, Math.min( scope.maxAzimuthAngle, spherical.theta ) );

            // restrict phi to be between desired limits
            spherical.phi = Math.max( scope.minPolarAngle, Math.min( scope.maxPolarAngle, spherical.phi ) );

            spherical.makeSafe();


            spherical.radius *= scale;

            // restrict radius to be between desired limits
            spherical.radius = Math.max( scope.minDistance, Math.min( scope.maxDistance, spherical.radius ) );

            // console.log('scope.target0', scope.target);
            // console.log('panOffset', panOffset); 
            
            // move target to panned location
            scope.target.add( panOffset );
            // console.log('scope.target1', scope.target);

            offset.setFromSpherical( spherical );

            // rotate offset back to "camera-up-vector-is-up" space
            offset.applyQuaternion( quatInverse );

            // console.log('offset', offset);
            
            position.copy( scope.target ).add( offset );

            scope.object.lookAt( scope.target );
            
            if ( scope.enableDamping === true ) {

                sphericalDelta.theta *= ( 1 - scope.dampingFactor );
                sphericalDelta.phi *= ( 1 - scope.dampingFactor );

                panOffset.multiplyScalar( 1 - scope.dampingFactor );

            } else {

                sphericalDelta.set( 0, 0, 0 );

                panOffset.set( 0, 0, 0 );

            }

            scale = 1;
           
            // update condition is:
            // min(camera displacement, camera rotation in radians)^2 > EPS
            // using small-angle approximation cos(x/2) = 1 - x^2 / 8

            if ( zoomChanged ||
                 lastPosition.distanceToSquared( scope.object.position ) > EPS ||
                 8 * ( 1 - lastQuaternion.dot( scope.object.quaternion ) ) > EPS ) {

                scope.dispatchEvent( changeEvent );

                lastPosition.copy( scope.object.position );
                lastQuaternion.copy( scope.object.quaternion );
                zoomChanged = false;

                // console.log('scope.target2', scope.target);

                return true;

            }

            return false;

        };

    }();

    this.dispose = function () {
        scope.domElement.removeEventListener( 'contextmenu', onContextMenu, false );
        scope.domElement.removeEventListener( 'mousedown', onMouseDown, false );
        scope.domElement.removeEventListener( 'wheel', onMouseWheel, false );

	scope.domElement.removeEventListener( 'touchstart', onTouchStart, false );
	scope.domElement.removeEventListener( 'touchend', onTouchEnd, false );
	scope.domElement.removeEventListener( 'touchmove', onTouchMove, false );

        document.removeEventListener( 'mousemove', onMouseMove, false );
        document.removeEventListener( 'mouseup', onMouseUp, false );

        window.removeEventListener( 'keydown', onKeyDown, false );
        window.removeEventListener( 'keyup', onKeyUp, false );

        //scope.dispatchEvent( { type: 'dispose' } ); // should this be added here?

    };

    //
    // internals
    //

    var scope = this;

    var changeEvent = { type: 'change' };
    var startEvent = { type: 'start' };
    var endEvent = { type: 'end' };

    var STATE = { NONE: - 1, ROTATE: 0, DOLLY: 1, PAN: 2, TOUCH_ROTATE: 3, TOUCH_DOLLY_PAN: 4 };

    var state = STATE.NONE;

    var EPS = 0.000001;

    // current position in spherical coordinates
    var spherical = new THREE.Spherical();
    var sphericalDelta = new THREE.Spherical();

    var scale = 1;
    var panOffset = new THREE.Vector3();
    var zoomChanged = false;

    var rotateStart = new THREE.Vector2();
    var rotateEnd = new THREE.Vector2();
    var rotateDelta = new THREE.Vector2();

    var panStart = new THREE.Vector2();
    var panEnd = new THREE.Vector2();
    var panDelta = new THREE.Vector2();

    var dollyStart = new THREE.Vector2();
    var dollyEnd = new THREE.Vector2();
    var dollyDelta = new THREE.Vector2();

    function getAutoRotationAngle() {

        return 2 * Math.PI / 60 / 60 * scope.autoRotateSpeed;

    }

    function getZoomScale() {

        return Math.pow( 0.95, scope.zoomSpeed );

    }

    function rotateLeft( angle ) {

        sphericalDelta.theta -= angle;

    }

    function rotateUp( angle ) {

        sphericalDelta.phi -= angle;

    }

    var panLeft = function () {
        // console.log('BEG panLeft');

        var v = new THREE.Vector3();

        return function panLeft( distance, objectMatrix ) {

            v.setFromMatrixColumn( objectMatrix, 0 ); // get X column of objectMatrix
            v.multiplyScalar( - distance );

            panOffset.add( v );

        };

    }();

    var panUp = function () {
        // console.log('BEG panUp');
        
        var v = new THREE.Vector3();

        return function panUp( distance, objectMatrix ) {
            // console.log('BEG panUp1');

            if ( scope.screenSpacePanning === true ) {

                v.setFromMatrixColumn( objectMatrix, 1 );

            } else {

                v.setFromMatrixColumn( objectMatrix, 0 );
                v.crossVectors( scope.object.up, v );

            }

            v.multiplyScalar( distance );

            panOffset.add( v );

        };

    }();

    // deltaX and deltaY are in pixels; right and down are positive
    var pan = function () {
        // console.log('BEG pan');

        var offset = new THREE.Vector3();

        return function pan( deltaX, deltaY ) {
            // console.log('BEG pan1');

            var element = scope.domElement === document ? scope.domElement.body : scope.domElement;

            if ( scope.object.isPerspectiveCamera ) {

                // perspective
                var position = scope.object.position;
                offset.copy( position ).sub( scope.target );
                var targetDistance = offset.length();

                // half of the fov is center to top of screen
                targetDistance *= Math.tan( ( scope.object.fov / 2 ) * Math.PI / 180.0 );

                // we use only clientHeight here so aspect ratio does not distort speed
                panLeft( 2 * deltaX * targetDistance / element.clientHeight, scope.object.matrix );
                
                panUp( 2 * deltaY * targetDistance / element.clientHeight, scope.object.matrix );
                // console.log('scope.object.position1', scope.object.position);
                // console.log('scope.object.rotation', scope.object.rotation);

            } else if ( scope.object.isOrthographicCamera ) {

                // orthographic
                panLeft( deltaX * ( scope.object.right - scope.object.left ) / scope.object.zoom / element.clientWidth, scope.object.matrix );
                panUp( deltaY * ( scope.object.top - scope.object.bottom ) / scope.object.zoom / element.clientHeight, scope.object.matrix );

            } else {

                // camera neither orthographic nor perspective
                console.warn( 'WARNING: OrbitControls3Dpane.js encountered an unknown camera type - pan disabled.' );
                scope.enablePan = false;

            }

        };

    }();

    function dollyIn( dollyScale ) {
        // console.log('BEG dollyIn');

        if ( scope.object.isPerspectiveCamera ) {

            // // orig
            // scale /= dollyScale;

            // new
            scope.object.zoom = Math.max( scope.minZoom, Math.min( scope.maxZoom, scope.object.zoom * dollyScale ) );
            scope.object.updateProjectionMatrix();
            zoomChanged = true;

            // // console.log('scope.object.position2', scope.object.position);
            // console.log('scaleIn', scale); 
            // console.log('scope.object.position', scope.object.position); 
            // console.log('scope.target', scope.target); 
            // console.log('scope.object.rotation', scope.object.rotation);
            // console.log('scope.object.zoom', scope.object.zoom); 
            // console.log('scope.object.fov', scope.object.fov); 
            // console.log('scope.object.near', scope.object.near); 
            
        } else if ( scope.object.isOrthographicCamera ) {

            scope.object.zoom = Math.max( scope.minZoom, Math.min( scope.maxZoom, scope.object.zoom * dollyScale ) );
            scope.object.updateProjectionMatrix();
            zoomChanged = true;

        } else {

            console.warn( 'WARNING: OrbitControls3Dpane.js encountered an unknown camera type - dolly/zoom disabled.' );
            scope.enableZoom = false;

        }

    }

    function dollyOut( dollyScale ) {
        // console.log('BEG dollyOut');

        if ( scope.object.isPerspectiveCamera ) {

            // // orig
            // scale *= dollyScale;

            // new
            scope.object.zoom = Math.max( scope.minZoom, Math.min( scope.maxZoom, scope.object.zoom / dollyScale ) );
            scope.object.updateProjectionMatrix();
            zoomChanged = true;

            // console.log('scaleOut', scale); 
            // console.log('scope.object.position', scope.object.position); 
            // console.log('scope.target', scope.target); 
            // console.log('scope.object.rotation', scope.object.rotation);
            // console.log('scope.object.zoom', scope.object.zoom);
            // console.log('scope.object.fov', scope.object.fov); 
            // console.log('scope.object.near', scope.object.near); 
            
        } else if ( scope.object.isOrthographicCamera ) {

            scope.object.zoom = Math.max( scope.minZoom, Math.min( scope.maxZoom, scope.object.zoom / dollyScale ) );
            scope.object.updateProjectionMatrix();
            zoomChanged = true;

        } else {

            console.warn( 'WARNING: OrbitControls3Dpane.js encountered an unknown camera type - dolly/zoom disabled.' );
            scope.enableZoom = false;

        }

    }

    //
    // event callbacks - update the object state
    //

    function handleMouseDownRotate( event ) {

        //console.log( 'handleMouseDownRotate' );

        rotateStart.set( event.clientX, event.clientY );

    }

    function handleMouseDownDolly( event ) {

        //console.log( 'handleMouseDownDolly' );

        dollyStart.set( event.clientX, event.clientY );

    }

    function handleMouseDownPan( event ) {

        // console.log( 'BEG handleMouseDownPan' );
        // console.log('scope.domElement.id', scope.domElement.id); 

        panStart.set( event.clientX, event.clientY );

    }

    function handleMouseMoveRotate( event ) {

        //console.log( 'handleMouseMoveRotate' );

        rotateEnd.set( event.clientX, event.clientY );

        rotateDelta.subVectors( rotateEnd, rotateStart ).multiplyScalar( scope.rotateSpeed );

        var element = scope.domElement === document ? scope.domElement.body : scope.domElement;

        rotateLeft( 2 * Math.PI * rotateDelta.x / element.clientHeight ); // yes, height

        rotateUp( 2 * Math.PI * rotateDelta.y / element.clientHeight );

        rotateStart.copy( rotateEnd );

        scope.update();

        // console.log('scope.target', scope.target); 
        // console.log('scope.object.position', scope.object.position);
        // console.log('scope.object.rotation', scope.object.rotation);

        // phi
        // console.log('scope.getPolarAngle()', scope.getPolarAngle());

        // theta
        // console.log('scope.getAzimuthalAngle()', scope.getAzimuthalAngle());

    }

    function handleMouseMoveDolly( event ) {

        //console.log( 'handleMouseMoveDolly' );

        dollyEnd.set( event.clientX, event.clientY );

        dollyDelta.subVectors( dollyEnd, dollyStart );

        if ( dollyDelta.y > 0 ) {

            dollyIn( getZoomScale() );

        } else if ( dollyDelta.y < 0 ) {

            dollyOut( getZoomScale() );

        }

        dollyStart.copy( dollyEnd );

        scope.update();

    }

    function handleMouseMovePan( event ) {

        // console.log( 'BEG handleMouseMovePan' );

        panEnd.set( event.clientX, event.clientY );

        panDelta.subVectors( panEnd, panStart ).multiplyScalar( scope.panSpeed );

        pan( panDelta.x, panDelta.y );

        panStart.copy( panEnd );

        scope.update();

    }

    function handleMouseUp( event ) {

        // console.log( 'handleMouseUp' );

    }

    function handleMouseWheel( event ) {

        // console.log( 'handleMouseWheel' );

        if ( event.deltaY < 0 ) {

            dollyOut( getZoomScale() );

        } else if ( event.deltaY > 0 ) {

            dollyIn( getZoomScale() );

        }

        scope.update();

    }

    function handleKeyDown( event ) {

        // console.log( 'handleKeyDown' );
        scope.isKeyDown = true;

        switch ( event.keyCode ) {

            case scope.keys.UP:
                pan( 0, scope.keyPanSpeed );
                scope.update();
                break;

            case scope.keys.BOTTOM:
                pan( 0, - scope.keyPanSpeed );
                scope.update();
                break;

            case scope.keys.LEFT:
                pan( scope.keyPanSpeed, 0 );
                scope.update();
                break;

            case scope.keys.RIGHT:
                pan( - scope.keyPanSpeed, 0 );
                scope.update();
                break;

        }

    }

    function handleKeyUp( event ) {

        //console.log( 'handleKeyUp' );
        scope.isKeyDown = false;
    }
    
    function handleTouchStartRotate( event ) {

	console.log( 'BEG handleTouchStartRotate' );

	rotateStart.set( event.touches[ 0 ].pageX, event.touches[ 0 ].pageY );

    }

    function handleTouchStartDollyPan( event ) {

	console.log( 'BEG handleTouchStartDollyPan' );

	if ( scope.enableZoom ) {

	    var dx = event.touches[ 0 ].pageX - event.touches[ 1 ].pageX;
	    var dy = event.touches[ 0 ].pageY - event.touches[ 1 ].pageY;

	    var distance = Math.sqrt( dx * dx + dy * dy );

	    dollyStart.set( 0, distance );

	}

	if ( scope.enablePan ) {

	    var x = 0.5 * ( event.touches[ 0 ].pageX + event.touches[ 1 ].pageX );
	    var y = 0.5 * ( event.touches[ 0 ].pageY + event.touches[ 1 ].pageY );

	    panStart.set( x, y );

	}

    }

    function handleTouchMoveRotate( event ) {

	console.log( 'BEG handleTouchMoveRotate' );

	rotateEnd.set( event.touches[ 0 ].pageX, event.touches[ 0 ].pageY );

	rotateDelta.subVectors( rotateEnd, rotateStart ).multiplyScalar( scope.rotateSpeed );

	var element = scope.domElement === document ? scope.domElement.body : scope.domElement;

	rotateLeft( 2 * Math.PI * rotateDelta.x / element.clientHeight ); // yes, height

	rotateUp( 2 * Math.PI * rotateDelta.y / element.clientHeight );

	rotateStart.copy( rotateEnd );

	scope.update();

    }

    function handleTouchMoveDollyPan( event ) {

	console.log( 'BEG handleTouchMoveDollyPan' );
        
	if ( scope.enableZoom ) {

	    var dx = event.touches[ 0 ].pageX - event.touches[ 1 ].pageX;
	    var dy = event.touches[ 0 ].pageY - event.touches[ 1 ].pageY;

	    var distance = Math.sqrt( dx * dx + dy * dy );

	    dollyEnd.set( 0, distance );

	    dollyDelta.set( 0, Math.pow( dollyEnd.y / dollyStart.y, scope.zoomSpeed ) );

	    dollyIn( dollyDelta.y );

	    dollyStart.copy( dollyEnd );

	}

	if ( scope.enablePan ) {

	    var x = 0.5 * ( event.touches[ 0 ].pageX + event.touches[ 1 ].pageX );
	    var y = 0.5 * ( event.touches[ 0 ].pageY + event.touches[ 1 ].pageY );

	    panEnd.set( x, y );

	    panDelta.subVectors( panEnd, panStart ).multiplyScalar( scope.panSpeed );

	    pan( panDelta.x, panDelta.y );

	    panStart.copy( panEnd );

	}

	scope.update();

    }

    function handleTouchEnd( event ) {

	console.log( 'BEG handleTouchEnd' );

    }

    //
    // event handlers - FSM: listen for events and reset state
    //

    function onMouseDown( event ) {

        // console.log('BEG onMouseDown'); 
        scope.isMouseDown = true;

        if ( scope.enabled === false )
        {
            // Need to manage event listener for mouseup so that _controls3D.isMouseDown can be updated on mouseup, even when the scope is disabled
            document.addEventListener( 'mouseup', onMouseUp, false );
            return;
        }

        event.preventDefault();

        switch ( event.button ) {

            case scope.mouseButtons.LEFT:

                if ( event.ctrlKey || event.metaKey ) {

                    // if ( scope.enablePan === false ) return;
                    if ( scope.enablePan === true )
                    {
                        handleMouseDownPan( event );
                        state = STATE.PAN;
                    }


                }
                else {

                    // if ( scope.enableRotate === false ) return;
                    if ( scope.enableRotate === true )
                    {
                        handleMouseDownRotate( event );
                        state = STATE.ROTATE;
                    }
                }
                
                break;

            case scope.mouseButtons.MIDDLE:

                // if ( scope.enableZoom === false ) return;
                if ( scope.enableZoom === true )
                {
                    handleMouseDownDolly( event );
                    state = STATE.DOLLY;
                }

                break;

            case scope.mouseButtons.RIGHT:

                // if ( scope.enablePan === false ) return;
                if ( scope.enablePan === true )
                {
                    handleMouseDownPan( event );
                    state = STATE.PAN;
                }

                break;

        }

        document.addEventListener( 'mousemove', onMouseMove, false );
        document.addEventListener( 'mouseup', onMouseUp, false );
        
        if ( state !== STATE.NONE ) {

//             document.addEventListener( 'mousemove', onMouseMove, false );
//             document.addEventListener( 'mouseup', onMouseUp, false );

            scope.dispatchEvent( startEvent );

        }

    }

    function onMouseMove( event ) {
        // console.log('BEG onMouseMove'); 
        
        if ( scope.enabled === false )
        {
            return;
        }

        event.preventDefault();

        switch ( state ) {

            case STATE.ROTATE:

                if ( scope.enableRotate === false )
                {
                    return;
                }

                handleMouseMoveRotate( event );

                break;

            case STATE.DOLLY:

                if ( scope.enableZoom === false )
                {
                    return;
                }

                handleMouseMoveDolly( event );

                break;

            case STATE.PAN:

                if ( scope.enablePan === false )
                {
                    return;
                }
                // console.log('scope.enablePan', scope.enablePan); 
                handleMouseMovePan( event );

                break;

        }

    }

    function onMouseUp( event ) {

        // console.log('BEG onMouseUp'); 
        scope.isMouseDown = false;
        
        if ( scope.enabled === false )
        {
            // Need to manage event listener for mouseup so that _controls3D.isMouseDown can be updated on mouseup, even when the scope is disabled
            document.removeEventListener( 'mouseup', onMouseUp, false );
            return;
        }

        handleMouseUp( event );

        document.removeEventListener( 'mousemove', onMouseMove, false );
        document.removeEventListener( 'mouseup', onMouseUp, false );

        scope.dispatchEvent( endEvent );

        state = STATE.NONE;

    }

    function onMouseWheel( event ) {
        // console.log('BEG onMouseWheel'); 

        if ( scope.enabled === false || scope.enableZoom === false || ( state !== STATE.NONE && state !== STATE.ROTATE ) )
        {
            return;
        }

        event.preventDefault();
        event.stopPropagation();

        scope.dispatchEvent( startEvent );

        handleMouseWheel( event );

        scope.dispatchEvent( endEvent );

    }

    function onKeyDown( event ) {
            // console.log('BEG onKeyDown'); 

        if ( scope.enabled === false || scope.enableKeys === false || scope.enablePan === false )
        {
            return;
        }

        handleKeyDown( event );

    }

    function onKeyUp( event ) {

        if ( scope.enabled === false || scope.enableKeys === false || scope.enablePan === false )
        {
            return;
        }

        handleKeyUp( event );

    }

    function onTouchStart( event ) {

        // console.log('BEG onTouchStart');
        scope.isTouchDown = true;

	if ( scope.enabled === false )
        {
            return;
        }

	// event.preventDefault();
        console.log('event.touches.length1', event.touches.length);

	switch ( event.touches.length ) {

	    case 1:	// one-fingered touch: rotate
                console.log('foo1'); 
		if ( scope.enableRotate === false )
                {
                    return;
                }

		handleTouchStartRotate( event );

		state = STATE.TOUCH_ROTATE;

		break;

	    case 2:	// two-fingered touch: dolly-pan
                console.log('foo2'); 

		if ( scope.enableZoom === false && scope.enablePan === false )
                {
                    return;
                }

		handleTouchStartDollyPan( event );

		state = STATE.TOUCH_DOLLY_PAN;

		break;

	    default:
                console.log('foo3'); 

		state = STATE.NONE;

	}

	if ( state !== STATE.NONE ) {
            console.log('foo2'); 

	    scope.dispatchEvent( startEvent );

	}

    }

    function onTouchMove( event ) {
        console.log('BEG onTouchMove');
        
	if ( scope.enabled === false )
        {
            return;
        }

	// event.preventDefault();
	event.stopPropagation();

	switch ( event.touches.length ) {

	    case 1: // one-fingered touch: rotate

		if ( scope.enableRotate === false )
                {
                    return;
                }
		if ( state !== STATE.TOUCH_ROTATE )
                {
                    // is this needed?
                    return; 
                }

		handleTouchMoveRotate( event );

		break;

	    case 2: // two-fingered touch: dolly-pan

		if ( scope.enableZoom === false && scope.enablePan === false )
                {
                    return;
                }
                
		if ( state !== STATE.TOUCH_DOLLY_PAN )
                {
                    // is this needed?
                    return;
                }

		handleTouchMoveDollyPan( event );

		break;

	    default:

		state = STATE.NONE;

	}

    }

    function onTouchEnd( event ) {

        console.log('BEG onTouchEnd');
        scope.isTouchDown = false;
        
	if ( scope.enabled === false )
        {
            return;
        }

	handleTouchEnd( event );

	scope.dispatchEvent( endEvent );

	state = STATE.NONE;

    }

    function onContextMenu( event ) {

        if ( scope.enabled === false )
        {
            return;
        }

        event.preventDefault();

    }

    //

    scope.domElement.addEventListener( 'contextmenu', onContextMenu, false );

    scope.domElement.addEventListener( 'mousedown', onMouseDown, false );
    scope.domElement.addEventListener( 'wheel', onMouseWheel, false );

    scope.domElement.addEventListener( 'touchstart', onTouchStart, false );
    scope.domElement.addEventListener( 'touchend', onTouchEnd, false );
    scope.domElement.addEventListener( 'touchmove', onTouchMove, false );

    window.addEventListener( 'keydown', onKeyDown, false );
    window.addEventListener( 'keyup', onKeyUp, false );

    // force an update at start

    this.update();

};

THREE.OrbitControls3Dpane.prototype = Object.create( THREE.EventDispatcher.prototype );
THREE.OrbitControls3Dpane.prototype.constructor = THREE.OrbitControls3Dpane;

Object.defineProperties( THREE.OrbitControls3Dpane.prototype, {

    center: {

        get: function () {

            console.warn( 'THREE.OrbitControls3Dpane: .center has been renamed to .target' );
            return this.target;

        }

    },

    // backward compatibility

    noZoom: {

        get: function () {

            console.warn( 'THREE.OrbitControls3Dpane: .noZoom has been deprecated. Use .enableZoom instead.' );
            return ! this.enableZoom;

        },

        set: function ( value ) {

            console.warn( 'THREE.OrbitControls3Dpane: .noZoom has been deprecated. Use .enableZoom instead.' );
            this.enableZoom = ! value;

        }

    },

    noRotate: {

        get: function () {

            console.warn( 'THREE.OrbitControls3Dpane: .noRotate has been deprecated. Use .enableRotate instead.' );
            return ! this.enableRotate;

        },

        set: function ( value ) {

            console.warn( 'THREE.OrbitControls3Dpane: .noRotate has been deprecated. Use .enableRotate instead.' );
            this.enableRotate = ! value;

        }

    },

    noPan: {

        get: function () {

            console.warn( 'THREE.OrbitControls3Dpane: .noPan has been deprecated. Use .enablePan instead.' );
            return ! this.enablePan;

        },

        set: function ( value ) {

            console.warn( 'THREE.OrbitControls3Dpane: .noPan has been deprecated. Use .enablePan instead.' );
            this.enablePan = ! value;

        }

    },

    noKeys: {

        get: function () {

            console.warn( 'THREE.OrbitControls3Dpane: .noKeys has been deprecated. Use .enableKeys instead.' );
            return ! this.enableKeys;

        },

        set: function ( value ) {

            console.warn( 'THREE.OrbitControls3Dpane: .noKeys has been deprecated. Use .enableKeys instead.' );
            this.enableKeys = ! value;

        }

    },

    staticMoving: {

        get: function () {

            console.warn( 'THREE.OrbitControls3Dpane: .staticMoving has been deprecated. Use .enableDamping instead.' );
            return ! this.enableDamping;

        },

        set: function ( value ) {

            console.warn( 'THREE.OrbitControls3Dpane: .staticMoving has been deprecated. Use .enableDamping instead.' );
            this.enableDamping = ! value;

        }

    },

    dynamicDampingFactor: {

        get: function () {

            console.warn( 'THREE.OrbitControls3Dpane: .dynamicDampingFactor has been renamed. Use .dampingFactor instead.' );
            return this.dampingFactor;

        },

        set: function ( value ) {

            console.warn( 'THREE.OrbitControls3Dpane: .dynamicDampingFactor has been renamed. Use .dampingFactor instead.' );
            this.dampingFactor = value;

        }

    }

} );
