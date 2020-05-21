var texCamera, texScene, texRenderer;
var texControls
var texRenderer;
var sprite1;
var axesHelper
var bbox;

var doLimitPan = false;
doLimitPan = true;

// option2 - running from localhost/jsfiddle (localhost)
$(window).load(function () {
    canvasInit();
    animate();
});

// option1 - running from jsfiddle/localhost (jsfiddle)
// canvasInit();
// animate();

function canvasInit() {
    console.log('BEG canvasInit'); 
    let left = -500;
    let right = 500;
    let top = 500;
    let bottom = -500;
    let near = -5;
    let far = 100000;
    
    texCamera = new THREE.OrthographicCamera(left, right, top, bottom, near, far);


    texScene = new THREE.Scene();

    texRenderer = new THREE.WebGLRenderer({
        preserveDrawingBuffer: true,
        alpha: true});
    
    texRenderer.domElement.id = 'canvasTex';
    console.log('window.devicePixelRatio', window.devicePixelRatio); 
    texRenderer.setPixelRatio(window.devicePixelRatio);
    texRenderer.setClearColor(0XDBDBDB, 1); //Webgl canvas background color

    let vec1 = new THREE.Vector2(0,0);
    texRenderer.getSize ( vec1 );
    console.log('vec1', vec1); 

    let width1 = 2016/2;
    let height1 = 1512/2;
    texRenderer.setSize ( width1, height1 );

    texRenderer.getSize ( vec1 );
    console.log('vec1a', vec1); 
    
    setTexControls();

    $("#texCanvasWrapper").append(texRenderer.domElement);

    // var spriteMap = new THREE.TextureLoader().load( 'https://cdn.jsdelivr.net/gh/avnermosh/meshlabjs_avnerV1@master/js/examples/textures/landscapeOrientation.jpg' );

    var loader = new THREE.TextureLoader();

    // var textureFileName = 'https://cdn.jsdelivr.net/gh/avnermosh/meshlabjs_avnerV1@master/js/examples/textures/landscapeOrientation.jpg';
    var textureFileName = 'landscapeOrientation.jpg';
    
    loader.load(
	// resource URL
	textureFileName,

	// onLoad callback
	function ( texture ) {
            let rotationVal = 0;
            // let rotationVal = (-Math.PI / 2);

            var spriteMaterial = new THREE.SpriteMaterial( { map: texture,
                                                       color: 0xffffff,
                                                       rotation: rotationVal,
                                                       fog: true } );
            sprite1 = new THREE.Sprite( spriteMaterial );
            sprite1.position.x = sprite1.position.y = sprite1.position.z = 0;
            // sprite1.scale.x = 100;
            sprite1.scale.x = -1000;
            sprite1.scale.y = 1000;
            // sprite1.scale.x = 200
            // sprite1.scale.y = 200;
            sprite1.name = "sprite1";

            console.log('sprite1.material.map.needsUpdate before', sprite1.material.map.needsUpdate);
            sprite1.material.map.needsUpdate = true;
            console.log('sprite1.material.map.needsUpdate after', sprite1.material.map.needsUpdate);
            
            
            //Add the mesh to the scene
            texControls.reset();

            // bbox is fixed because the object does not change its coordinates
            bbox = new THREE.Box3().setFromObject(sprite1);

            texScene.add(sprite1);
            texCamera.position.set( 0, 0, 80 );
            texCamera.updateProjectionMatrix();

            axesHelper = new THREE.AxesHelper(500);
            axesHelper.position.set(0, 0, 1);
            axesHelper.material.linewidth = 20;
            texScene.add(axesHelper);
            
            render();
	},

	// onProgress callback currently not supported
	undefined,

	// onError callback
	function ( err ) {
	    console.error( 'An error happened.' );
	}
    );

}

function render() {
    
    let x1 = texCamera.position.x + (texCamera.left / texCamera.zoom);
    let x1a = Math.max(x1, bbox.min.x);
    let pos_x = x1a - (texCamera.left / texCamera.zoom);
    
    let x2 = pos_x + (texCamera.right / texCamera.zoom);
    let x2a = Math.min(x2, bbox.max.x);
    pos_x = x2a - (texCamera.right / texCamera.zoom);

    let y1 = texCamera.position.y + (texCamera.bottom / texCamera.zoom);
    let y1a = Math.max(y1, bbox.min.y);
    let pos_y = y1a - (texCamera.bottom / texCamera.zoom);
    
    let y2 = pos_y + (texCamera.top / texCamera.zoom);
    let y2a = Math.min(y2, bbox.max.y);
    pos_y = y2a - (texCamera.top / texCamera.zoom);

    if(doLimitPan)
    {
        texCamera.position.set(pos_x, pos_y, texCamera.position.z);
        texCamera.lookAt(pos_x, pos_y, texControls.target.z);
        texControls.target.set(pos_x, pos_y, 0);
        texControls.update();            
    }
    
    texRenderer.render(texScene, texCamera);
}


function setTexControls() {

    // Need to be similar to what is in OrbitControls3Dpane.js constructor
    let texCanvasWrapperElement = document.getElementById('texCanvasWrapper');
    texControls = new THREE.OrbitControls3Dpane(texCamera, texCanvasWrapperElement);
    
    //////////////////////////////////////
    // Set rotate related parameters
    //////////////////////////////////////

    // No rotation.
    texControls.enableRotate = false;
    texControls.minPolarAngle = Math.PI/2;
    texControls.maxPolarAngle = Math.PI/2;
    // No orbit horizontally.
    texControls.minAzimuthAngle = 0; // radians
    texControls.maxAzimuthAngle = 0; // radians

    
    //////////////////////////////////////
    // Set zoom related parameters
    //////////////////////////////////////

    texControls.enableZoom = true;
    texControls.zoomSpeed = 0.8;
    texControls.minDistance = texCamera.near;
    texControls.maxDistance = texCamera.far;
    texControls.minZoom = 1;
    texControls.maxZoom = Infinity;

    
    //////////////////////////////////////
    // Set pan related parameters
    //////////////////////////////////////

    texControls.enablePan = true;
    texControls.panSpeed = 0.6;
    texControls.screenSpacePanning = true;
    texControls.enableDamping = true;
    
    texCanvasWrapperElement.addEventListener( 'mousemove', onDocumentMouseMove2D, false );
    
    // texControls.addEventListener('change', render);
}

function onDocumentMouseMove2D( event ) {
    event.preventDefault();

    render();
}

function animate() {
    requestAnimationFrame(animate);
    texControls.update();
}
