"use strict";
document.addEventListener("DOMContentLoaded", function () {
    var asset = {};
    var em = new EventManager();
    (function () {
        var ring = new Ring(progress, 80, 84, "#d195bd", "#fa2b7e");
        ring.start();
        var transit = new Transit(ring);
        transit.start();
        var manager = new THREE.LoadingManager();
        manager.onProgress = function (item, loaded, total) {
            transit.to({ percent: loaded / total }, 2000, callback.bind(transit, loaded, total));
        };
        loadTexture("asset/particle.png", "particle");
        loadModel("foe");
        loadBackground();
        loadModel("player");
        function loadModel(key) {
            var prefix = "asset/" + key + "/" + key + ".";
            var loader = new THREE.OBJMTLLoader(manager);
            loader.load(prefix + "obj", prefix + "mtl", function (model) {
                asset[key] = model;
            });
        }
        function loadBackground() {
            var imagePrefix = "asset/background/space_";
            var directions = ["right1", "left2", "top3", "bottom4", "front5", "back6"];
            var imageSuffix = ".png";
            var urls = [];
            for (var i = 0; i < 6; i++) {
                urls.push(imagePrefix + directions[i] + imageSuffix);
            }
            manager.itemStart("background");
            THREE.ImageUtils.loadTextureCube(urls, undefined, function (texture) {
                asset.textureCube = texture;
                manager.itemEnd("background");
            });
        }
        function loadTexture(url, key) {
            manager.itemStart(key);
            THREE.ImageUtils.loadTexture(url, undefined, function (texture) {
                asset[key] = texture;
                manager.itemEnd(key);
            });
        }
        function callback(loaded, total) {
            if (loaded === total) {
                transit.done();
                requestAnimationFrame(function () {
                    ring.done();
                    var parent = loadingText.parentNode;
                    parent.removeChild(loadingText);
                    loading.style.opacity = 0;
                    setTimeout(function () {
                        var parent = loading.parentNode;
                        parent.removeChild(loading);
                        em.emit("loadend");
                    }, 2000);
                });
            }
        }
    })();
    em.on("loadend", function () {
        function Lotus(asset) {
            Ani.call(this);
            this.asset = asset;
            this.world = new CANNON.World();
            this.scene = new THREE.Scene();
            this.renderer = new THREE.WebGLRenderer({ antialias: true });
            this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100001);
            this.objs = {};
            this.particles = {};
            this.foes = [];
            this.foesTails = [];
            this.cameraTarget = null;
            this.bullets = [];
            this.firework = null;
        }
        Lotus.prototype = Object.create(Ani.prototype);
        Lotus.prototype.constructor = Lotus;
        Lotus.prototype.t = 1 / 60;
        Lotus.prototype.init = function () {
            this.renderer.setSize(window.innerWidth, window.innerHeight);
            document.body.appendChild(this.renderer.domElement);
            this.scene.add(new THREE.AmbientLight(0xffffff));
        };
        Lotus.prototype.onUpdate = function () {
            for (var p in this.particles) {
                this.particles[p].tick(this.t);
            }
            this.world.step(this.t);
            for (var p in this.objs) {
                var i = this.objs[p];
                i.m.position.copy(i.b.position);
                i.m.quaternion.copy(i.b.quaternion);
            }
            this.updateFoesTails();
            this.renderer.render(this.scene, this.camera);
        };
        Lotus.prototype.addBackground = function () {
            var shader = THREE.ShaderLib["cube"];
            shader.uniforms["tCube"].value = this.asset.textureCube;
            var material = new THREE.ShaderMaterial({
                fragmentShader: shader.fragmentShader,
                vertexShader: shader.vertexShader,
                uniforms: shader.uniforms,
                depthWrite: false,
                side: THREE.BackSide
            });
            var mesh = new THREE.Mesh(new THREE.BoxGeometry(100000, 100000, 100000), material);
            this.scene.add(mesh);
        };
        Lotus.prototype.addObject = function (name, key, zoomFactor) {
            var object = {};
            this.objs[name] = object;
            object.m = new THREE.Group();
            this.scene.add(object.m);
            var model = this.asset[key].clone();
            object.m.add(model);
            model.scale.multiplyScalar(zoomFactor);
            model.rotateY(Math.PI);
            var box3 = new THREE.Box3();
            box3.setFromObject(model);
            var point = box3.center();
            model.translateX(-point.x);
            model.translateY(-point.y);
            model.translateZ(-point.z);
            var size = box3.size();
            var halfExtents = new CANNON.Vec3().copy(size.multiplyScalar(0.5));
            object.b = new CANNON.Body({
                mass: 1
            });
            object.b.addShape(new CANNON.Box(halfExtents));
            this.world.addBody(object.b);
            object.b.linearDamping = 0;
            object.b.angularDamping = 0;
            return object;
        };
        Lotus.prototype.addPlayer = function () {
            this.addObject("player", "player", 0.001);
        };
        Lotus.prototype.addPlayerTail = function () {
            var flame = new SPE.Group({
                texture: this.asset.particle,
                maxAge: 0.4
            });
            var positionArray = [
                new THREE.Vector3(0.5, -0.4, 10),
                new THREE.Vector3(-0.5, -0.4, 10)
            ];
            positionArray.forEach(function (position) {
                var emitter = new SPE.Emitter({
                    position: position,
                    positionSpread: new THREE.Vector3(0.3, 0.8, 0),
                    velocity: new THREE.Vector3(0, 0, 10),
                    velocitySpread: new THREE.Vector3(0, 0, 1),
                    sizeStart: 0.5,
                    sizeEnd: 0.3,
                    opacityStart: 1,
                    opacityEnd: 0,
                    colorStart: new THREE.Color("blue"),
                    colorEnd: new THREE.Color("red"),
                    particleCount: 500
                });
                flame.addEmitter(emitter);
            });
            this.objs.player.m.add(flame.mesh);
            this.particles.playerParticle = flame;
        };
        Lotus.prototype.addFirework = function () {
            var emitterSettings = {
                type: "sphere",
                positionSpread: new THREE.Vector3(10, 10, 10),
                radius: 1,
                speed: 100,
                sizeStart: 30,
                sizeStartSpread: 30,
                sizeEnd: 0,
                opacityStart: 1,
                opacityEnd: 0,
                colorStart: new THREE.Color("yellow"),
                colorStartSpread: new THREE.Vector3(0, 10, 0),
                colorEnd: new THREE.Color("red"),
                particleCount: 1000,
                alive: 0,
                duration: 0.05
            };
            var particleGroup = new SPE.Group({
                texture: this.asset.particle,
                maxAge: 0.5
            });
            particleGroup.addPool(10, emitterSettings, true);
            particleGroup.mesh.frustumCulled = false;
            this.scene.add(particleGroup.mesh);
            this.particles.firework = particleGroup;
            this.firework = particleGroup;
        };
        Lotus.prototype.addPlayerControls = function () {
            var move = {
                up: function () { },
                left: function () { },
                down: function () { },
                right: function () { }
            };
            var body = this.objs.player.b;
            var v = 0.5;
            window.addEventListener("keydown", function (e) {
                switch (e.keyCode) {
                    case 38:
                    case 87:
                        move.up = function () {
                            add(v, 0, 0);
                        };
                        break;
                    case 37:
                    case 65:
                        move.left = function () {
                            add(0, v, 0);
                        };
                        break;
                    case 40:
                    case 83:
                        move.down = function () {
                            add(-v, 0, 0);
                        };
                        break;
                    case 39:
                    case 68:
                        move.right = function () {
                            add(0, -v, 0);
                        };
                        break;
                    default:
                        break;
                }
            });
            function add(x, y, z) {
                var vec = new CANNON.Vec3(x, y, z);
                body.vectorToWorldFrame(vec, vec);
                body.angularVelocity.vadd(vec, body.angularVelocity);
            }
            window.addEventListener("keyup", function (e) {
                switch (e.keyCode) {
                    case 38:
                    case 87:
                        move.up = function () { };
                        break;
                    case 37:
                    case 65:
                        move.left = function () { };
                        break;
                    case 40:
                    case 83:
                        move.down = function () { };
                        break;
                    case 39:
                    case 68:
                        move.right = function () { };
                        break;
                    default:
                        break;
                }
            });
            body.preStep = function () {
                var vec = new CANNON.Vec3(0, 0, -100);
                this.vectorToWorldFrame(vec, this.velocity);
                this.angularVelocity.setZero();
                for (var p in move) {
                    move[p]();
                }
            };
        };
        Lotus.prototype.addCamera = function () {
            var group = this.objs.player.m;
            var geometry = new THREE.SphereGeometry(1.5);
            var material = new THREE.MeshLambertMaterial({ color: 0x88aa33 });
            var target = new THREE.Mesh(geometry, material);
            group.add(target);
            target.visible = false;
            target.position.set(0, 0, -18);
            group.add(this.camera);
            this.camera.position.set(0, 8, 23);
            this.camera.lookAt(target.position);
            this.cameraTarget = target;
        };
        Lotus.prototype.addBullet = function () {
            var self = this;
            window.addEventListener("keyup", function (e) {
                if (e.keyCode === 32) {
                    var p1 = new THREE.Vector3();
                    p1.setFromMatrixPosition(self.cameraTarget.matrixWorld);
                    var p2 = new THREE.Vector3();
                    p2.setFromMatrixPosition(self.camera.matrixWorld);
                    var d = new THREE.Vector3();
                    d.subVectors(p1, p2);
                    d.normalize();
                    var bullet = {};
                    bullet.m = new THREE.Mesh(self.cameraTarget.geometry, self.cameraTarget.material);
                    self.scene.add(bullet.m);
                    bullet.m.position.copy(p1);
                    bullet.b = new CANNON.Body({
                        mass: 1
                    });
                    bullet.b.addShape(new CANNON.Box(new CANNON.Vec3(1.5, 1.5, 1.5)));
                    self.world.addBody(bullet.b);
                    bullet.b.linearDamping = 0;
                    bullet.b.angularDamping = 0;
                    bullet.b.position.copy(bullet.m.position);
                    bullet.b.velocity.copy(d.multiplyScalar(500));
                    self.bullets.push(bullet);
                    self.objs["bullet" + bullet.m.id] = bullet;
                    setTimeout(function () {
                        self.bullets.splice(self.bullets.indexOf(bullet), 1);
                        delete self.objs["bullet" + bullet.m.id];
                        self.scene.remove(bullet.m);
                        self.world.removeBody(bullet.b);
                    }, 10000);
                }
            });
        };
        Lotus.prototype.addFoes = function () {
            var positions = [
                new CANNON.Vec3(-1000, 0, 0),
                new CANNON.Vec3(0, 1000, -1000),
                new CANNON.Vec3(1000, -1000, -1000),
                new CANNON.Vec3(1000, 1000, 1000)
            ];
            var self = this;
            positions.forEach(function (position, i) {
                var foe = self.addObject("foe" + i, "foe", 4);
                foe.b.position.copy(position);
                self.foes.push(foe);
            });
        };
        Lotus.prototype.addFoesAI = function () {
            var player = this.objs.player.b;
            var self = this;
            this.foes.forEach(function (foe) {
                foe.b.angularDamping = 0.5;
                foe.b.preStep = function () {
                    var vec = new CANNON.Vec3();
                    player.position.vsub(this.position, vec);
                    var a1 = vec.scale(0.1 + Math.random() / 5);
                    this.applyForce(a1, this.pointToWorldFrame(new CANNON.Vec3(0, 0, -1)));
                    var a2 = vec.negate();
                    a2.x = 100 / (a2.x || 1);
                    a2.y = 100 / (a2.y || 1);
                    a2.z = 100 / (a2.z || 1);
                    this.applyForce(a2, this.pointToWorldFrame(new CANNON.Vec3(0, 0, -1)));
                    self.foes.forEach(function (_foe) {
                        if (_foe !== foe) {
                            var vec = _foe.b.position.vsub(foe.b.position);
                            vec.x = 100 / (vec.x || 1);
                            vec.y = 100 / (vec.y || 1);
                            vec.z = 100 / (vec.z || 1);
                            _foe.b.applyForce(vec, _foe.b.pointToWorldFrame(new CANNON.Vec3(0, 0, -1)));
                        }
                    });
                };
                foe.b.addEventListener("collide", listener);
                function listener() {
                    foe.b.removeEventListener("collide", listener);
                    self.firework.triggerPoolEmitter(1, foe.b.position);
                    var keys = Object.keys(self.objs);
                    for (var i = 0; i < keys.length; i++) {
                        var key = keys[i];
                        if (self.objs[key] === foe) {
                            requestAnimationFrame(function () {
                                delete self.objs[key];
                                var i = self.foes.indexOf(foe);
                                self.foes.splice(i, 1);
                                self.scene.remove(self.foesTails.splice(i, 1)[0]);
                                self.scene.remove(foe.m);
                                self.world.removeBody(foe.b);
                                foeNum.innerHTML = "" + self.foes.length;
                                if (!self.foes.length) {
                                    victory.style.opacity = 1;
                                }
                            });
                            break;
                        }
                    }
                }
            });
        };
        Lotus.prototype.addFoesTails = function () {
            var self = this;
            this.foes.forEach(function (foe) {
                var geometry = new THREE.Geometry();
                var position = foe.b.position.clone();
                for (var i = 0; i < 300; i++) {
                    geometry.vertices.push(new THREE.Vector3().copy(position));
                }
                var material = new THREE.PointCloudMaterial({
                    color: 0xff00ff
                });
                var tail = new THREE.PointCloud(geometry, material);
                tail.frustumCulled = false;
                self.scene.add(tail);
                self.foesTails.push(tail);
            });
        };
        Lotus.prototype.updateFoesTails = function () {
            var self = this;
            this.foesTails.forEach(function (tail, i) {
                var vertices = tail.geometry.vertices;
                vertices.shift();
                vertices.push(new THREE.Vector3().copy(self.foes[i].b.position));
                tail.geometry.verticesNeedUpdate = true;
            });
        };
        Lotus.prototype.resize = function () {
            var self = this;
            window.onresize = function () {
                self.camera.aspect = window.innerWidth / window.innerHeight;
                self.camera.updateProjectionMatrix();
                self.renderer.setSize(window.innerWidth, window.innerHeight);
            };
        };
        var lotus = new Lotus(asset);
        lotus.init();
        lotus.addBackground();
        lotus.addPlayer();
        lotus.addCamera();
        lotus.addFoes();
        lotus.start();
        lotus.resize();
        start.onclick = function () {
            instructions.parentNode.removeChild(instructions);
            lotus.addPlayerTail();
            lotus.addPlayerControls();
            lotus.addBullet();
            lotus.addFirework();
            lotus.addFoesTails();
            lotus.addFoesAI();
        };
    });
});