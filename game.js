const canvas = document.getElementById('gameCanvas');
const context = canvas.getContext('2d');

// Charger l'image de fond
const backgroundImage = new Image();
backgroundImage.src = 'image/fond_1.png';

const bonusTileImage = new Image();
bonusTileImage.src = 'image/bonus_tile.png';

const bonusTileForbiddenZone = {
    x: 225, // Position x relative de la zone interdite dans la tuile "bonus"
    y: -140, // Position y relative de la zone interdite dans la tuile "bonus"
    width: 850, // LaSrgeur de la zone interdite
    height: 500 // Hauteur de la zone interdite
};

// Charger l'image du personnage
const playerImageStatic = new Image();
playerImageStatic.src = 'image/david_static.png';

const playerImageMove1 = new Image();
playerImageMove1.src = 'image/david_move1.png';

const playerImageMove2 = new Image();
playerImageMove2.src = 'image/david_move2.png';

const enemyImageStatic = new Image();
enemyImageStatic.src = 'image/ia1_static.png';

const enemyImageMove1 = new Image();
enemyImageMove1.src = 'image/ia1_move1.png';

const enemyImageMove2 = new Image();
enemyImageMove2.src = 'image/ia1_move2.png';

// Charger la musique de fond
const backgroundMusic = new Audio('music/game_music.mp3');
backgroundMusic.loop = true; // Faire en sorte que la musique joue en boucle
backgroundMusic.volume = 0.1; // Ajuster le volume si nécessaire

let musicStarted = false; // Variable pour suivre si la musique a démarré
let lastShotTime = 0; // Variable pour suivre le moment du dernier tir
let canShoot = true; // Drapeau pour vérifier si le joueur peut tirer

// Mettre à jour la taille du canvas pour qu'il prenne toute la fenêtre
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas(); // Appeler une fois au chargement de la page

// Dimensions du monde ouvert (seulement horizontal)
const worldWidth = Infinity;  // Largeur du monde étendue
const worldHeight = canvas.height;

// Position initiale du joueur
let player = {
    x: canvas.width / 6,
    y: canvas.height - 200,  // Positionné vers le bas de la scène
    width: 150,
    height: 150,  // Augmenter la hauteur pour un personnage plus réaliste
    hitboxWidth: 100,  // Largeur de la hitbox
    hitboxHeight: 130,  // Hauteur de la hitbox
    hitboxOffsetX: 0,  // Décalage en x de la hitbox par rapport à la position du joueur
    hitboxOffsetY: 0,  // Décalage en y de la hitbox par rapport à la position du joueur
    color: 'blue',
    speed: 20,
    power: 1,
    weapon: 'default',
    bullets: [],
    health: 100,  // Ajouter une propriété de santé
    moving: false,
    frame: 0,
    frameTime: 0,
    frameInterval: 200,  // Intervalle de changement de frame en millisecondes
};

let offsetX = 0;

let backgroundTiles = new Set();
const tileSize = 2000;

function updateBackgroundTiles() {
    const playerTileIndex = Math.floor(player.x / tileSize);

    // Ajouter des tuiles de fond si elles sont proches du joueur
    for (let i = playerTileIndex - 1; i <= playerTileIndex + 1; i++) {
        if (!backgroundTiles.has(i)) {
            backgroundTiles.add(i);
        }
    }

    // Supprimer les tuiles de fond qui sont trop loin du joueur
    backgroundTiles.forEach(tileIndex => {
        if (Math.abs(tileIndex - playerTileIndex) > 1) {
            backgroundTiles.delete(tileIndex);
        }
    });
}


// Tableau pour stocker les ennemis
let enemies = [];
const enemySize = 30;
const enemyColor = 'red';
const enemySpeed = 2;
const enemyBulletSpeed = 7;
const damage = 10;  // Dégâts infligés par les tirs ennemis
const spawnDistance = 1500;  // Distance entre chaque apparition d'ennemis

// **Tableau pour stocker les projectiles des ennemis**
let enemyBullets = [];


// Compteur de points
let score = 0;
let gamePaused = false;
let lastSpawnX = 0;  // La dernière position d'apparition des ennemis

// Générer des ennemis par groupe
function spawnEnemies() {
    const numEnemies = Math.floor(Math.random() * 3) + 1;  // Générer entre 1 et 3 ennemis
    for (let i = 0; i < numEnemies; i++) {
        const enemy = {
            x: player.x + canvas.width + Math.random() * 200 + i * 50,
            y: canvas.height - 250 - Math.random() * 100,  // Limiter l'ennemi à la partie basse de la scène visible
            width: 170,
            height: 170,
            color: enemyColor,
            bullets: [],
            isShooting: false,
            moving: false,
            frame: 0,
            frameTime: 0,
            frameInterval: 200,  // Intervalle de changement de frame en millisecondes
            hits: 0  // Nombre de tirs reçus

        };
        enemies.push(enemy);
    }
}

// Détecter les collisions
function isColliding(a, b) {
    const aHitboxX = (a.hitboxOffsetX !== undefined) ? a.x + a.hitboxOffsetX : a.x;
    const aHitboxY = (a.hitboxOffsetY !== undefined) ? a.y + a.hitboxOffsetY : a.y;
    const aHitboxWidth = (a.hitboxWidth !== undefined) ? a.hitboxWidth : a.width;
    const aHitboxHeight = (a.hitboxHeight !== undefined) ? a.hitboxHeight : a.height;

    const bHitboxX = (b.hitboxOffsetX !== undefined) ? b.x + b.hitboxOffsetX : b.x;
    const bHitboxY = (b.hitboxOffsetY !== undefined) ? b.y + b.hitboxOffsetY : b.y;
    const bHitboxWidth = (b.hitboxWidth !== undefined) ? b.hitboxWidth : b.width;
    const bHitboxHeight = (b.hitboxHeight !== undefined) ? b.hitboxHeight : b.height;

    return aHitboxX < bHitboxX + bHitboxWidth &&
        aHitboxX + aHitboxWidth > bHitboxX &&
        aHitboxY < bHitboxY + bHitboxHeight &&
        aHitboxY + aHitboxHeight > bHitboxY;
}


function resolveCollisions() {
    for (let i = 0; i < enemies.length; i++) {
        for (let j = i + 1; j < enemies.length; j++) {
            let enemy1 = enemies[i];
            let enemy2 = enemies[j];

            if (isColliding(enemy1, enemy2)) {
                let dx = (enemy1.x + enemy1.width / 2) - (enemy2.x + enemy2.width / 2);
                let dy = (enemy1.y + enemy1.height / 2) - (enemy2.y + enemy2.height / 2);

                if (Math.abs(dx) > Math.abs(dy)) {
                    let distance = Math.abs(dx);
                    let overlap = enemy1.width / 2 + enemy2.width / 2 - distance;
                    if (dx > 0) {
                        enemy1.x += overlap / 2;
                        enemy2.x -= overlap / 2;
                    } else {
                        enemy1.x -= overlap / 2;
                        enemy2.x += overlap / 2;
                    }
                } else {
                    let distance = Math.abs(dy);
                    let overlap = enemy1.height / 2 + enemy2.height / 2 - distance;
                    if (dy > 0) {
                        enemy1.y += overlap / 2;
                        enemy2.y -= overlap / 2;
                    } else {
                        enemy1.y -= overlap / 2;
                        enemy2.y += overlap / 2;
                    }
                }
            }
        }
    }
}


function drawWorld() {
    context.clearRect(0, 0, canvas.width, canvas.height);

    updateBackgroundTiles();

    backgroundTiles.forEach(tileIndex => {
        const x = tileIndex * tileSize - offsetX;
        context.drawImage(backgroundImage, x, 0, tileSize, canvas.height);


        // Dessiner la tuile "bonus" toutes les 5 tuiles
        if (tileIndex === 0 || tileIndex % 10 === 0) {
            context.drawImage(bonusTileImage, x, 0, tileSize, canvas.height);
        }
    });

    let playerImage;
    if (player.frame === 0) {
        playerImage = playerImageStatic;
    } else if (player.frame === 2) {
        playerImage = playerImageMove1;
    } else {
        playerImage = playerImageMove2;
    }
    context.drawImage(playerImage, player.x - offsetX, player.y, player.width, player.height);

    context.fillStyle = 'yellow';
    player.bullets.forEach(bullet => {
        context.fillRect(bullet.x - offsetX, bullet.y, bullet.width, bullet.height);
    });

    enemies.forEach(enemy => {
        let enemyImage;
        if (enemy.frame === 0) {
            enemyImage = enemyImageStatic;
        } else if (enemy.frame === 2) {
            enemyImage = enemyImageMove1;
        } else {
            enemyImage = enemyImageMove2;
        }
        context.drawImage(enemyImage, enemy.x - offsetX, enemy.y, enemy.width, enemy.height);
    });

    context.fillStyle = 'white';
    enemyBullets.forEach(bullet => {
        context.fillRect(bullet.x - offsetX, bullet.y, bullet.width, bullet.height);
    });

    context.fillStyle = 'white';
    context.font = '22px Arial';
    context.fillText('Score: ' + score, 10, 60);

    const healthBar = document.getElementById('healthBar');
    healthBar.style.width = player.health + '%';
}

// Mettre à jour la position des ennemis et gérer les attaques
function updateEnemies() {
    const currentTime = Date.now();

    enemies = enemies.filter(enemy => {
        if (Math.abs(enemy.x - player.x) > canvas.width / 1.5) return true;

        let newX = enemy.x;
        let newY = enemy.y;

        // Faire que les ennemis gardent une distance du joueur
        const distance = Math.hypot(player.x - enemy.x, player.y - enemy.y);
        if (distance > 500) {
            enemy.moving = true;
            if (enemy.x < player.x) newX += enemySpeed;
            if (enemy.x > player.x) newX -= enemySpeed;
            if (enemy.y < player.y) newY += enemySpeed;
            if (enemy.y > player.y) newY -= enemySpeed;

            // Limiter la position y des ennemis à la partie visible du bas de l'écran
            if (newY < canvas.height - 500) newY = canvas.height - 500;
            if (newY > canvas.height - enemy.height) newY = canvas.height - enemy.height;
        } else {
            enemy.moving = false;
        }

        // Vérifier les collisions avec les zones interdites des tuiles bonus
        let isCollidingWithForbiddenZone = false;
        backgroundTiles.forEach(tileIndex => {
            const tileX = tileIndex * tileSize;
            if (tileIndex === 0 || tileIndex % 10 === 0) {
                if (isInForbiddenZone({ x: newX, y: newY, width: enemy.width, height: enemy.height }, tileX)) {
                    isCollidingWithForbiddenZone = true;
                }
            }
        });

        if (!isCollidingWithForbiddenZone) {
            enemy.x = newX;
            enemy.y = newY;
        }

        // Gérer l'animation de l'ennemi
        if (enemy.moving) {
            if (currentTime - enemy.frameTime > enemy.frameInterval) {
                enemy.frame = (enemy.frame === 2) ? 3 : 2; // Alterner entre 2 et 3
                enemy.frameTime = currentTime;
            }
        } else {
            enemy.frame = 0; // Image statique
        }

        // Tirer des projectiles vers le joueur
        if (Math.abs(enemy.x - player.x) < 800 && !enemy.isShooting) {
            enemy.isShooting = true;
            const angle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
            enemyBullets.push({
                x: enemy.x + enemy.width / 50,  // Position x du projectile (milieu de l'ennemi)
                y: enemy.y + enemy.height / 4.7,  // Position y du projectile (milieu de l'ennemi)
                width: 7,
                height: 7,
                speed: enemyBulletSpeed,
                angle: angle,
                distanceTraveled: 0, // Initialiser la distance parcourue
            });
            setTimeout(() => enemy.isShooting = false, 2000); // Tirer toutes les secondes
        }

        return true;
    });

    // Déplacer les projectiles des ennemis
    enemyBullets.forEach(bullet => {
        const dx = Math.cos(bullet.angle) * bullet.speed;
        const dy = Math.sin(bullet.angle) * bullet.speed;
        bullet.x += dx;
        bullet.y += dy;
        bullet.distanceTraveled += Math.sqrt(dx * dx + dy * dy);
    });

    // Filtrer les projectiles des ennemis qui ont dépassé la distance maximale
    enemyBullets = enemyBullets.filter(bullet => bullet.distanceTraveled <= 1500);

    // Vérifier les collisions entre les projectiles des ennemis et le joueur
    enemyBullets = enemyBullets.filter(bullet => {
        if (isColliding(bullet, player)) {
            player.health -= damage;  // Réduire la santé du joueur
            checkGameOver();
            return false; // Retirer le projectile après la collision
        }
        return true; // Garder le projectile sinon
    });

    // Vérifier les collisions entre les projectiles du joueur et les ennemis
    player.bullets = player.bullets.filter(bullet => {
        let hit = false;
        enemies = enemies.filter(enemy => {
            if (isColliding(bullet, enemy)) {
                enemy.hits += 1;  // Incrémenter le nombre de tirs reçus
                hit = true;
                if (enemy.hits >= 3) {
                    score++;
                    return false;  // Éliminer l'ennemi après 3 tirs
                }
            }
            return true; // Garder l'ennemi sinon
        });
        return !hit; // Retirer le projectile après la collision
    });

    // Résoudre les collisions entre les ennemis
    resolveCollisions();
}

// Définit le pourcentage souhaité
const percentageOfHeight = 0.66; // 10% de la hauteur du canvas

// Vérifier si un objet est dans la zone interdite
function isInForbiddenZone(object, tileX) {
    return object.x < tileX + bonusTileForbiddenZone.x + bonusTileForbiddenZone.width &&
        object.x + object.width > tileX + bonusTileForbiddenZone.x &&
        object.y < bonusTileForbiddenZone.y + bonusTileForbiddenZone.height &&
        object.y + object.height > bonusTileForbiddenZone.y;
}

// Gérer le mouvement du joueur
function updatePlayer() {
    player.moving = false;

    let newX = player.x;
    let newY = player.y;

    if ((keys['ArrowUp'] || keys['z']) && player.y > canvas.height - (canvas.height * 0.65)) {
        newY -= player.speed;
        player.moving = true;
    }
    if ((keys['ArrowDown'] || keys['s']) && player.y < canvas.height - player.height) {
        newY += player.speed;
        player.moving = true;
    }
    if ((keys['ArrowLeft'] || keys['q']) && player.x > 0) {
        newX -= player.speed;
        player.moving = true;
    }
    if ((keys['ArrowRight'] || keys['d']) && player.x < worldWidth - player.width) {
        newX += player.speed;
        player.moving = true;
    }

    // Vérifier les collisions avec les zones interdites des tuiles bonus
    let isCollidingWithForbiddenZone = false;
    backgroundTiles.forEach(tileIndex => {
        const tileX = tileIndex * tileSize;
        if (tileIndex === 0 || tileIndex % 10 === 0) {
            if (isInForbiddenZone({ x: newX, y: newY, width: player.width, height: player.height }, tileX)) {
                isCollidingWithForbiddenZone = true;
            }
        }
    });

    if (!isCollidingWithForbiddenZone) {
        player.x = newX;
        player.y = newY;
    }

    // Repositionner le joueur au début du monde lorsqu'il atteint la fin
    if (player.x >= worldWidth) {
        player.x = 0;
    }

    // Démarrer la musique lors du premier mouvement
    if (!musicStarted && (keys['ArrowUp'] || keys['ArrowDown'] || keys['ArrowLeft'] || keys['ArrowRight'] || keys['z'] || keys['s'] || keys['q'] || keys['d'])) {
        backgroundMusic.play();
        musicStarted = true;
    }

    // Gérer l'animation
    const currentTime = Date.now();
    if (player.moving) {
        if (currentTime - player.frameTime > player.frameInterval) {
            player.frame = (player.frame === 2) ? 3 : 2; // Alterner entre 2 et 3
            player.frameTime = currentTime;
        }
    } else {
        player.frame = 0; // Image statique
    }

    // Tirer des projectiles
    const currentTimeShot = Date.now();
    if (keys[' '] && canShoot && currentTimeShot - lastShotTime >= 300) {  // Vérifier si 1 seconde s'est écoulée
        player.bullets.push({
            x: player.x + player.width,
            y: player.y + player.height / 2.5,
            width: 20,
            height: 5,
            speed: 10,
            angle: 0,
            distanceTraveled: 0, // Initialiser la distance parcourue
        });
        lastShotTime = currentTimeShot;  // Mettre à jour le temps du dernier tir
        canShoot = false;  // Désactiver le tir jusqu'à ce que la touche soit relâchée
    }

    // Déplacer les projectiles du joueur
    player.bullets.forEach(bullet => {
        const dx = Math.cos(bullet.angle) * bullet.speed;
        const dy = Math.sin(bullet.angle) * bullet.speed;
        bullet.x += dx;
        bullet.y += dy;
        bullet.distanceTraveled += Math.sqrt(dx * dx + dy * dy);
    });

    // Filtrer les projectiles du joueur qui ont dépassé la distance maximale
    player.bullets = player.bullets.filter(bullet => bullet.distanceTraveled <= 300);

    // Garder le joueur au centre de l'écran
    offsetX = player.x - canvas.width / 6;

    // Limiter le défilement aux bords du monde
    offsetX = Math.max(0, Math.min(offsetX, worldWidth - canvas.width));

    // Générer des ennemis au fur et à mesure que le joueur avance
    if (player.x - lastSpawnX >= spawnDistance) {
        spawnEnemies();
        lastSpawnX = player.x;
    }
}

// Boucle de mise à jour du jeu
function update() {
    if (!gamePaused) {
        updatePlayer();
        updateEnemies();
        drawWorld();
    }
    requestAnimationFrame(update);
}

let keys = {};
window.addEventListener('keydown', function (e) {
    keys[e.key] = true;
    if (e.key === 'Escape') {
        togglePause();
    }
});

window.addEventListener('keyup', function (e) {
    keys[e.key] = false;
    if (e.key === ' ') {
        canShoot = true;  // Permettre à nouveau le tir lorsque la touche est relâchée
    }
});

update();

function togglePause() {
    gamePaused = !gamePaused;
    if (gamePaused) {
        backgroundMusic.pause();
    } else {
        backgroundMusic.play();
    }
    document.getElementById('pauseMenu').style.display = gamePaused ? 'block' : 'none';
}

function checkGameOver() {
    if (player.health <= 0) {
        gamePaused = true;
        document.getElementById('gameOver').classList.remove('hidden');
        localStorage.setItem('previousScore', score);
        backgroundMusic.pause();
    }
}

// Gérer les interactions du menu de pause
document.getElementById('resumeGame').addEventListener('click', function () {
    togglePause();
});

document.getElementById('returnToMainMenu').addEventListener('click', function () {
    localStorage.setItem('previousScore', score);
    window.location.href = 'index.html';
});

document.getElementById('returnToMainMenuFromGameOver').addEventListener('click', function () {
    window.location.href = 'index.html';
});

// Gérer les interactions du menu en jeu
document.getElementById('closeMenu').addEventListener('click', function () {
    document.getElementById('menu').style.display = 'none';
});

document.getElementById('upgradeSpeed').addEventListener('click', function () {
    player.speed += 1;
});

document.getElementById('upgradePower').addEventListener('click', function () {
    player.power += 1;
});

document.getElementById('changeWeapon').addEventListener('click', function () {
    player.weapon = player.weapon === 'default' ? 'laser' : 'default';
});

function resetGame() {
    player = {
        x: canvas.width / 2,
        y: canvas.height - 100,
        width: 20,
        height: 40,
        color: 'blue',
        speed: 5,
        power: 1,
        weapon: 'default',
        bullets: [],
        health: 100
    };
    enemies = [];
    score = 0;
    lastSpawnX = 0;
}
