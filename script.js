// Game Constants
const PLAYER_RED = 'red';
const PLAYER_BLUE = 'blue';
const PLAYER_TIME = 120; 
const TITANS_PER_PLAYER = 4;
const CIRCUIT_NAMES = ['outer', 'middle', 'inner'];

// Game State
let gameState = {
    currentPlayer: PLAYER_RED,
    gamePhase: 'placement', 
    unlockedCircuit: 0,
    selectedNode: null,
    redScore: 0,
    blueScore: 0,
    redTitansLeft: TITANS_PER_PLAYER,
    blueTitansLeft: TITANS_PER_PLAYER,
    redTime: PLAYER_TIME,
    blueTime: PLAYER_TIME,
    isPaused: false,
    isGameOver: false,
    timerInterval: null,
    nodes: {},
    edges: {},
    controlledEdges: {}
};

// Board geometry
const circuits = [
    { radius: 200, nodes: 6 },
    { radius: 130, nodes: 6 },
    { radius: 70, nodes: 6 }   
];

// Edge weights 
const edgeWeights = {
    "0-1": 1, "1-2": 1, "2-3": 1, "3-4": 1, "4-5": 1, "5-0": 1,
    "6-7": 6, "7-8": 4, "8-9": 5, "9-10": 6, "10-11": 5, "11-6": 4,
    "12-13": 8, "13-14": 9, "14-15": 8, "15-16": 8, "16-17": 9, "17-12": 8,
    "0-6": 2, "1-7": 2, "2-8": 2, "3-9": 1, "4-10": 1, "5-11": 1,
    "6-12": 5, "7-13": 4, "8-14": 4, "9-15": 5, "10-16": 5, "11-17": 4
};

// html Elements
const gameSvg = document.getElementById('gameSvg');
const gameStatus = document.getElementById('gameStatus');
const redScore = document.getElementById('redScore');
const blueScore = document.getElementById('blueScore');
const redTime = document.getElementById('redTime');
const blueTime = document.getElementById('blueTime');
const redTitansLeft = document.getElementById('redTitansLeft');
const blueTitansLeft = document.getElementById('blueTitansLeft');
const pauseBtn = document.getElementById('pauseBtn');
const resetBtn = document.getElementById('resetBtn');
const instructionsBtn = document.getElementById('instructionsBtn');
const pauseModal = document.getElementById('pauseModal');
const resumeBtn = document.getElementById('resumeBtn');
const gameOverModal = document.getElementById('gameOverModal');
const gameOverMessage = document.getElementById('gameOverMessage');
const newGameBtn = document.getElementById('newGameBtn');
const instructionsModal = document.getElementById('instructionsModal');
const closeInstructionsBtn = document.getElementById('closeInstructionsBtn');

// Initialize game
function initGame() {
    gameState = {
        currentPlayer: PLAYER_RED,
        gamePhase: 'placement',
        unlockedCircuit: 0,
        selectedNode: null,
        redScore: 0,
        blueScore: 0,
        redTitansLeft: TITANS_PER_PLAYER,
        blueTitansLeft: TITANS_PER_PLAYER,
        redTime: PLAYER_TIME,
        blueTime: PLAYER_TIME,
        isPaused: false,
        isGameOver: false,
        timerInterval: null,
        nodes: {},
        edges: {},
        controlledEdges: {}
    };
    
    gameSvg.innerHTML = '';

    createHexagonalBoard();
    
    updateGameStatus();
    updatePlayerInfo();
    
    startTimer();
}

// hexagonal board 
function createHexagonalBoard() {
    let nodeId = 0;
    let nodeCoords = [];
    
    // Create nodes for each circuit
    circuits.forEach((circuit, circuitIndex) => {
        const { radius, nodes: nodeCount } = circuit;
        
        for (let i = 0; i < nodeCount; i++) {
            const angle = (Math.PI / 3) * i;
            const x = radius * Math.cos(angle);
            const y = radius * Math.sin(angle);
            
            nodeCoords.push({ id: nodeId, x, y, circuit: circuitIndex });
            
            gameState.nodes[nodeId] = {
                id: nodeId,
                x,
                y,
                circuit: circuitIndex,
                occupiedBy: null
            };
            
            nodeId++;
        }
    });
    
    // Create lines between nodes
    for (const [edgeKey, weight] of Object.entries(edgeWeights)) {
        const [node1, node2] = edgeKey.split('-').map(Number);
        
        gameState.edges[edgeKey] = {
            node1,
            node2,
            weight,
            controlledBy: null
        };
        
        const n1 = nodeCoords[node1];
        const n2 = nodeCoords[node2];
        
        const edgeElement = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        edgeElement.setAttribute('x1', n1.x);
        edgeElement.setAttribute('y1', n1.y);
        edgeElement.setAttribute('x2', n2.x);
        edgeElement.setAttribute('y2', n2.y);
        edgeElement.setAttribute('class', 'edge');
        edgeElement.setAttribute('data-edge', edgeKey);
        gameSvg.appendChild(edgeElement);
        
        const textX = (n1.x + n2.x) / 2;
        const textY = (n1.y + n2.y) / 2;
        
        const textElement = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        textElement.setAttribute('x', textX);
        textElement.setAttribute('y', textY);
        textElement.setAttribute('class', 'edge-weight');
        textElement.textContent = weight;
        gameSvg.appendChild(textElement);
    }
    
    nodeCoords.forEach(node => {
        const nodeElement = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        nodeElement.setAttribute('cx', node.x);
        nodeElement.setAttribute('cy', node.y);
        nodeElement.setAttribute('r', node.circuit === 0 ? 18 : (node.circuit === 1 ? 16 : 14));
        nodeElement.setAttribute('class', 'node');
        nodeElement.setAttribute('data-node-id', node.id);
        
        nodeElement.addEventListener('click', () => handleNodeClick(node.id));
        
        gameSvg.appendChild(nodeElement);
    });
}

function handleNodeClick(nodeId) {
    if (gameState.isPaused || gameState.isGameOver) return;
    
    const node = gameState.nodes[nodeId];
    
    if (gameState.gamePhase === 'placement') {
        handlePlacementPhase(node);
    } else if (gameState.gamePhase === 'movement') {
        handleMovementPhase(node);
    }
}

function handlePlacementPhase(node) {
    if (node.occupiedBy !== null) return;
    
    if (node.circuit !== gameState.unlockedCircuit) {
        updateGameStatus(`Place titans on the ${CIRCUIT_NAMES[gameState.unlockedCircuit]} circuit`);
        return;
    }
    
    node.occupiedBy = gameState.currentPlayer;
    updateNodeUI(node.id);
    
    // Decrease titans left
    if (gameState.currentPlayer === PLAYER_RED) {
        gameState.redTitansLeft--;
    } else {
        gameState.blueTitansLeft--;
    }
    
    checkForControlledEdges(node.id);
    
    checkCircuitFilled();
    
    checkAllTitansPlaced();
    
    switchPlayer();
    
    updatePlayerInfo();
    updateGameStatus();
}

function handleMovementPhase(node) {
    if (gameState.selectedNode === null) {
        if (node.occupiedBy === gameState.currentPlayer) {
            gameState.selectedNode = node.id;
            updateNodeSelection(node.id, true);
            updateGameStatus(`Select a destination for your Titan`);
        }
        return;
    }
    
    const selectedNode = gameState.nodes[gameState.selectedNode];
    
    if (node.id === gameState.selectedNode) {
        gameState.selectedNode = null;
        updateNodeSelection(node.id, false);
        updateGameStatus(`${gameState.currentPlayer === PLAYER_RED ? 'Red' : 'Blue'} player's turn`);
        return;
    }
    
    if (node.occupiedBy === gameState.currentPlayer) {
        updateNodeSelection(gameState.selectedNode, false);
        gameState.selectedNode = node.id;
        updateNodeSelection(node.id, true);
        return;
    }
    
    if (node.occupiedBy === null && isAdjacent(selectedNode.id, node.id)) {
        removeControlFromEdges(selectedNode.id);
        
        node.occupiedBy = gameState.currentPlayer;
        selectedNode.occupiedBy = null;
        
        updateNodeUI(selectedNode.id);
        updateNodeUI(node.id);
        
        checkForControlledEdges(node.id);
        
        checkForSurroundedTitans();
        
        checkInnerHexagonFilled();
        
        updateNodeSelection(gameState.selectedNode, false);
        gameState.selectedNode = null;
        
        switchPlayer();
        
        updatePlayerInfo();
        updateGameStatus();
    }
}

function isAdjacent(nodeId1, nodeId2) {
    const edgeKey1 = `${nodeId1}-${nodeId2}`;
    const edgeKey2 = `${nodeId2}-${nodeId1}`;
    
    return gameState.edges[edgeKey1] !== undefined || gameState.edges[edgeKey2] !== undefined;
}

function getEdgeKey(nodeId1, nodeId2) {
    const edgeKey1 = `${nodeId1}-${nodeId2}`;
    const edgeKey2 = `${nodeId2}-${nodeId1}`;
    
    return gameState.edges[edgeKey1] !== undefined ? edgeKey1 : edgeKey2;
}

function checkForControlledEdges(nodeId) {
    const connectedNodes = getConnectedNodes(nodeId);
    
    connectedNodes.forEach(connectedNodeId => {
        const connectedNode = gameState.nodes[connectedNodeId];
        
        if (connectedNode.occupiedBy === gameState.nodes[nodeId].occupiedBy) {
            const edgeKey = getEdgeKey(nodeId, connectedNodeId);
            const edge = gameState.edges[edgeKey];
            
            if (edge.controlledBy !== gameState.currentPlayer) {
                if (gameState.currentPlayer === PLAYER_RED) {
                    gameState.redScore += edge.weight;
                    if (edge.controlledBy === PLAYER_BLUE) {
                        gameState.blueScore -= edge.weight;
                    }
                } else {
                    gameState.blueScore += edge.weight;
                    if (edge.controlledBy === PLAYER_RED) {
                        gameState.redScore -= edge.weight;
                    }
                }
                
                edge.controlledBy = gameState.currentPlayer;
                updateEdgeUI(edgeKey);
                
                if (!gameState.controlledEdges[gameState.currentPlayer]) {
                    gameState.controlledEdges[gameState.currentPlayer] = [];
                }
                if (!gameState.controlledEdges[gameState.currentPlayer].includes(edgeKey)) {
                    gameState.controlledEdges[gameState.currentPlayer].push(edgeKey);
                }
            }
        }
    });
}

function removeControlFromEdges(nodeId) {
    const connectedNodes = getConnectedNodes(nodeId);
    
    connectedNodes.forEach(connectedNodeId => {
        const edgeKey = getEdgeKey(nodeId, connectedNodeId);
        const edge = gameState.edges[edgeKey];
        
        if (edge.controlledBy === gameState.currentPlayer) {
            if (gameState.currentPlayer === PLAYER_RED) {
                gameState.redScore -= edge.weight;
            } else {
                gameState.blueScore -= edge.weight;
            }
            
            edge.controlledBy = null;
            updateEdgeUI(edgeKey);
            
            if (gameState.controlledEdges[gameState.currentPlayer]) {
                const index = gameState.controlledEdges[gameState.currentPlayer].indexOf(edgeKey);
                if (index !== -1) {
                    gameState.controlledEdges[gameState.currentPlayer].splice(index, 1);
                }
            }
        }
    });
}

function getConnectedNodes(nodeId) {
    const connectedNodes = [];
    
    for (const edgeKey in gameState.edges) {
        const edge = gameState.edges[edgeKey];
        
        if (edge.node1 == nodeId) {
            connectedNodes.push(edge.node2);
        } else if (edge.node2 == nodeId) {
            connectedNodes.push(edge.node1);
        }
    }
    
    return connectedNodes;
}

function checkForSurroundedTitans() {
    for (const nodeId in gameState.nodes) {
        const node = gameState.nodes[nodeId];
        
        if (node.occupiedBy && node.occupiedBy !== gameState.currentPlayer) {
            const connectedNodes = getConnectedNodes(nodeId);
            let surrounded = true;
            
            for (const connectedNodeId of connectedNodes) {
                const connectedNode = gameState.nodes[connectedNodeId];
                
                if (!connectedNode.occupiedBy || connectedNode.occupiedBy === node.occupiedBy) {
                    surrounded = false;
                    break;
                }
            }
            
            if (surrounded) {
                removeControlFromEdges(nodeId);
                
                node.occupiedBy = null;
                updateNodeUI(nodeId);
                
                if (node.occupiedBy === PLAYER_RED) {
                    gameState.redTitansLeft--;
                } else {
                    gameState.blueTitansLeft--;
                }
                
                if (gameState.redTitansLeft === 0) {
                    endGame(PLAYER_BLUE);
                } else if (gameState.blueTitansLeft === 0) {
                    endGame(PLAYER_RED);
                }
            }
        }
    }
}

function checkCircuitFilled() {
    const currentCircuit = gameState.unlockedCircuit;
    let circuitFilled = true;
    
    for (const nodeId in gameState.nodes) {
        const node = gameState.nodes[nodeId];
        
        if (node.circuit === currentCircuit && node.occupiedBy === null) {
            circuitFilled = false;
            break;
        }
    }
    
    if (circuitFilled && currentCircuit < 2) {
        gameState.unlockedCircuit++;
        updateGameStatus(`${CIRCUIT_NAMES[gameState.unlockedCircuit]} circuit unlocked!`);
    }
}

function checkAllTitansPlaced() {
    if (gameState.redTitansLeft === 0 && gameState.blueTitansLeft === 0) {
        gameState.gamePhase = 'movement';
        updateGameStatus(`All titans placed. Movement phase begins!`);
    }
}

function checkInnerHexagonFilled() {
    let innerHexagonFilled = true;
    
    for (const nodeId in gameState.nodes) {
        const node = gameState.nodes[nodeId];
        
        if (node.circuit === 2 && node.occupiedBy === null) {
            innerHexagonFilled = false;
            break;
        }
    }
    
    if (innerHexagonFilled) {
        if (gameState.redScore > gameState.blueScore) {
            endGame(PLAYER_RED);
        } else if (gameState.blueScore > gameState.redScore) {
            endGame(PLAYER_BLUE);
        } else {
            endGame('draw');
        }
    }
}

function updateNodeUI(nodeId) {
    const nodeElement = document.querySelector(`[data-node-id="${nodeId}"]`);
    const node = gameState.nodes[nodeId];
    
    nodeElement.classList.remove(PLAYER_RED, PLAYER_BLUE);
    
    if (node.occupiedBy) {
        nodeElement.classList.add(node.occupiedBy);
    }
}

function updateNodeSelection(nodeId, selected) {
    const nodeElement = document.querySelector(`[data-node-id="${nodeId}"]`);
    
    if (selected) {
        nodeElement.classList.add('selected');
    } else {
        nodeElement.classList.remove('selected');
    }
}

function updateEdgeUI(edgeKey) {
    const edgeElement = document.querySelector(`[data-edge="${edgeKey}"]`);
    const edge = gameState.edges[edgeKey];
    
    edgeElement.classList.remove(PLAYER_RED, PLAYER_BLUE);
    
    if (edge.controlledBy) {
        edgeElement.classList.add(edge.controlledBy);
    }
}

function switchPlayer() {
    gameState.currentPlayer = gameState.currentPlayer === PLAYER_RED ? PLAYER_BLUE : PLAYER_RED;
}

function updateGameStatus(message) {
    if (message) {
        gameStatus.textContent = message;
    } else {
        if (gameState.gamePhase === 'placement') {
            if (gameState.redTitansLeft === 0 && gameState.blueTitansLeft === 0) {
                gameStatus.textContent = `All titans placed. Movement phase begins!`;
            } else {
                const currentPlayerName = gameState.currentPlayer === PLAYER_RED ? 'Red' : 'Blue';
                gameStatus.textContent = `${currentPlayerName} player: Place titans on the ${CIRCUIT_NAMES[gameState.unlockedCircuit]} circuit`;
            }
        } else {
            const currentPlayerName = gameState.currentPlayer === PLAYER_RED ? 'Red' : 'Blue';
            gameStatus.textContent = `${currentPlayerName} player's turn`;
        }
    }
}

function updatePlayerInfo() {
    redScore.textContent = gameState.redScore;
    blueScore.textContent = gameState.blueScore;
    redTime.textContent = formatTime(gameState.redTime);
    blueTime.textContent = formatTime(gameState.blueTime);
    redTitansLeft.textContent = gameState.redTitansLeft;
    blueTitansLeft.textContent = gameState.blueTitansLeft;
}

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

function startTimer() {
    if (gameState.timerInterval) {
        clearInterval(gameState.timerInterval);
    }
    
    gameState.timerInterval = setInterval(() => {
        if (gameState.isPaused || gameState.isGameOver) return;
        
        if (gameState.currentPlayer === PLAYER_RED) {
            gameState.redTime--;
            redTime.textContent = formatTime(gameState.redTime);
            
            if (gameState.redTime <= 0) {
                endGame(PLAYER_BLUE);
            }
        } else {
            gameState.blueTime--;
            blueTime.textContent = formatTime(gameState.blueTime);
            
            if (gameState.blueTime <= 0) {
                endGame(PLAYER_RED);
            }
        }
    }, 1000);
}

function endGame(winner) {
    gameState.isGameOver = true;
    clearInterval(gameState.timerInterval);
    
    let message;
    if (winner === 'draw') {
        message = "It's a draw!";
    } else {
        const winnerName = winner === PLAYER_RED ? 'Red' : 'Blue';
        message = `${winnerName} player wins with a score of ${winner === PLAYER_RED ? gameState.redScore : gameState.blueScore}!`;
    }
    
    gameOverMessage.textContent = message;
    gameOverModal.style.display = 'flex';
}

function togglePause() {
    gameState.isPaused = !gameState.isPaused;
    
    if (gameState.isPaused) {
        pauseBtn.textContent = 'Resume';
        pauseModal.style.display = 'flex';
    } else {
        pauseBtn.textContent = 'Pause';
        pauseModal.style.display = 'none';
    }
}

pauseBtn.addEventListener('click', togglePause);
resumeBtn.addEventListener('click', togglePause);
resetBtn.addEventListener('click', () => {
    if (confirm('Are you sure you want to reset the game?')) {
        initGame();
    }
});
newGameBtn.addEventListener('click', () => {
    gameOverModal.style.display = 'none';
    initGame();
});
instructionsBtn.addEventListener('click', () => {
    instructionsModal.style.display = 'flex';
});
closeInstructionsBtn.addEventListener('click', () => {
    instructionsModal.style.display = 'none';
});

initGame();

window.addEventListener('resize', () => {
    const container = document.querySelector('.board-container');
    const aspectRatio = 1; 
    
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    
    if (containerWidth / containerHeight > aspectRatio) {
        const newWidth = containerHeight * aspectRatio;
        container.style.width = `${newWidth}px`;
    } else {
        const newHeight = containerWidth / aspectRatio;
        container.style.height = `${newHeight}px`;
    }
});

window.dispatchEvent(new Event('resize'));