var canvas;
var engine;
var scene;

var isWPressed = false;
var isSPressed = false;
var isAPressed = false;
var isDPressed = false;
var isEPressed = false;

document.addEventListener("DOMContentLoaded", connectToServer);

var socket;
var Game = {};
var players = {};

const antialias = true;

function connectToServer() {
    socket = io.connect("http://localhost:3000");
    socket.on("connect", function () {
        console.log("connction estaplished successfully");
        
        socket.on("GetYourID", function (data) {
            Game.id = data.id;
            startGame();
            socket.emit("ThankYou", {});
        });

        socket.on("AnotherPlayerCreated", function (data) {
            createPlayer(scene, data);
        });

        socket.on("AnotherPlayerMoved", function (data) {
            var player = players[data.id];
            player.setState(data);
        });

        window.onbeforeunload = function () {  
            socket.disconnect();
        }

        socket.on("AnotherWentAway", function (data) {   
            var player = players[data.id];
            player.dispose();
            delete players[Game.id];
        });

    });
}

function startGame() {
    canvas = document.getElementById("renderCanvas");

    var engine = new BABYLON.Engine(canvas, true);

    scene = createScene();

    var player = scene.getMeshByName("HeroPlayer");

    var toRender = function () {
        player.move();
        scene.render();
    }

    engine.runRenderLoop(toRender);
}

var createScene = function () {
    
    var scene = new BABYLON.Scene(engine);

    scene.actionManager = new BABYLON.ActionManager(scene);

    scene.collisionsEnabled = true;

    var ground = CreateGround(scene);

    var skybox = CreateSkybox(scene);
    
    var player = createPlayer(scene);

    var followCamera = createFollowCamera(scene, player);
    scene.activeCamera = followCamera;

    createLights(scene);
    return scene;
};

function CreateSkybox(scene){
    var skybox = BABYLON.MeshBuilder.CreateBox("skyBox", { size: 1000.0 }, scene);
    var skyboxMaterial = new BABYLON.StandardMaterial("skyBox", scene);
    skyboxMaterial.backFaceCulling = false;
    skyboxMaterial.reflectionTexture = new BABYLON.CubeTexture("textures/environment.env", scene);
    skyboxMaterial.reflectionTexture.coordinatesMode = BABYLON.Texture.SKYBOX_MODE;
    skyboxMaterial.diffuseColor = BABYLON.Color3.Black()
    skyboxMaterial.specularColor = BABYLON.Color3.Black();
    skybox.material = skyboxMaterial;
}

function CreateGround(scene) {
    var ground = BABYLON.MeshBuilder.CreateGround("ground", { height: 50, width: 50, subdivisions: 4 }, scene);
    var groundMaterial = new BABYLON.StandardMaterial("groundMaterial", scene);
    groundMaterial.diffuseTexture = new BABYLON.Texture("textures/wood.jpg", scene);
    groundMaterial.diffuseTexture.uScale = 30;
    groundMaterial.diffuseTexture.vScale = 30;
    groundMaterial.specularColor = new BABYLON.Color3(.1, .1, .1);
    ground.material = groundMaterial;
    return ground;
}

function createLights(scene) {
    var light = new BABYLON.HemisphericLight("light1", new BABYLON.Vector3(0, 1, 0), scene);
    light.intensity = 0.7;
}

function createFollowCamera(scene, target) {
    var camera = new BABYLON.FollowCamera("camera", target.position, scene, target);
    camera.inputs.removeByType('FollowCameraPointersInput');
    camera.pos
	camera.radius = 10;
	camera.heightOffset = 4;
	camera.rotationOffset = -180;
    camera.cameraAcceleration = 0.005
	camera.attachControl(canvas, true);

    return camera;
}

function createPlayer(scene, data) {
    var player = new BABYLON.MeshBuilder.CreateBox("HeroPlayer", { height: .5, depth: .5, width: .5 }, scene);
    //player.visibility=false;

    new BABYLON.SceneLoader.ImportMesh("", "models/", "Avatar_02.glb", scene, function (newMeshes, particleSystems, skeletons, animationGroups) {
        const root = newMeshes[0];
        const body = root;
        body.parent = player;
       
        root.scaling.scaleInPlace(1);
    });
      
    var playerSpeed = 0.03;
    var playerSpeedBackwards = 0.01;
    var playerRotationSpeed = 0.01;

    player.state = {
        id: Game.id,
        x: player.position.x,
        y: player.position.y,
        z: player.position.z,
        rX: player.rotation.x,
        rY: player.rotation.y,
        rZ: player.rotation.z,
    }
    player.setState = function(data)
    {
        player.position.x = data.x;
        player.position.y = data.y;
        player.position.z = data.z;
        player.rotation.x = data.rX;
        player.rotation.y = data.rY;
        player.rotation.z = data.rZ;
    }

    if (data) {
        players[data.id] = player;
        player.setState(data);
    }
    else {
        socket.emit("IWasCreated", player.state);
    }

    player.move = function () {
        var notifyServer = false;
        var keydown = false;

        const animating = true;

        const walkAnim = scene.getAnimationGroupByName("03_Walk_Idle");
        const walkBackAnim = scene.getAnimationGroupByName("04_Backward_Idle");
        const idleAnim = scene.getAnimationGroupByName("01_Idle_Idle");
        const raisingAnim = scene.getAnimationGroupByName("02_Raising_Idle");

            //Manage the movements of the character (e.g. position, direction)
            if (isWPressed) {
                player.moveWithCollisions(player.forward.scaleInPlace(playerSpeed));
                this.walkAnim.start(true, 1.0, walkBackAnim.from, walkBackAnim.to, false);
                raisingAnim.stop();
                walkBackAnim.stop();
                idleAnim.stop();
                notifyServer = true;
                keydown = true;
            }
            if (isSPressed) {
                player.moveWithCollisions(player.forward.scaleInPlace(-playerSpeedBackwards));
                walkBackAnim.start(true, 1.0, walkBackAnim.from, walkBackAnim.to, false);
                raisingAnim.stop();
                walkAnim.stop();
                idleAnim.stop();
                notifyServer = true;
                keydown = true;
            }
            if (isAPressed) {
                player.rotation.y -= 0.01;
                player.rotate(BABYLON.Vector3.Up(), -playerRotationSpeed);
                walkAnim.start(true, 1.0, walkAnim.from, walkAnim.to, false);
                raisingAnim.stop();
                walkBackAnim.stop();
                idleAnim.stop();
                notifyServer = true;
                keydown = true;
            }
            if (isDPressed) {
                player.rotation.y += 0.01;
                player.rotate(BABYLON.Vector3.Up(), playerRotationSpeed);
                walkAnim.start(true, 1.0, walkAnim.from, walkAnim.to, false);
                raisingAnim.stop();
                walkBackAnim.stop();
                idleAnim.stop();
                notifyServer = true;
                keydown = true;
            }
            if (isEPressed) {
                raisingAnim.start(true, 1.0, raisingAnim.from, raisingAnim.to, false);
                walkAnim.stop();
                idleAnim.stop();
                walkBackAnim.stop();
                notifyServer = true;
                keydown = true;
            }

        if (notifyServer) {
            player.state.x = player.position.x;
            player.state.y = player.position.y;
            player.state.z = player.position.z;
            player.state.rX = player.rotation.x;
            player.state.rY = player.rotation.y;
            player.state.rZ = player.rotation.z;
            socket.emit("IMoved", player.state);
        }
    }   
    return player;
}


/*window.addEventListener("resize", function () {
    engine.resize();
});*/


document.addEventListener("keydown", function (event) {
    if (event.key == 'w' || event.key == 'W') {
        isWPressed = true;
    }
    if (event.key == 's' || event.key == 'S') {
        isSPressed = true;
    }
    if (event.key == 'a' || event.key == 'A') {
        isAPressed = true;
    }
    if (event.key == 'd' || event.key == 'D') {
        isDPressed = true;
    }
    if (event.key == 'e' || event.key == 'E') {
        isEPressed = true;
    }

});

document.addEventListener("keyup", function (event) {
    if (event.key == 'w' || event.key == 'W') {
        isWPressed = false;
    }
    if (event.key == 's' || event.key == 'S') {
        isSPressed = false;
    }
    if (event.key == 'a' || event.key == 'A') {
        isAPressed = false;
    }
    if (event.key == 'd' || event.key == 'D') {
        isDPressed = false;
    }
    if (event.key == 'e' || event.key == 'E') {
        isEPressed = false;
    }

});
