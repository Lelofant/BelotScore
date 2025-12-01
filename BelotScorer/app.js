// --- STATE MANAGEMENT ---
const state = {
    currentMode: null,
    modifiers: { contra: false, recontra: false },
    scores: { myTeam: 0, opponent: 0 },
    wins: { myTeam: 0, opponent: 0 },
    darkMode: false,
    pendingPoints: { raw: 0, rounded: 0, fromScan: 0, bonus: 0 },
    dealer: { current: null, positions: ['N', 'E', 'S', 'W'], isSet: false },
    history: []
};
const dom = {};

// --- INITIALIZATION ---
function initDOM() {
    const ids = [
        'start-screen', 'scan-mode-screen', 'manual-mode-screen', 'scan-bonus-screen', 'manual-input-screen', 'confirm-screen', 'history-screen', 'settings-screen',
        'my-team-total', 'opponent-total', 'total-wins', 'dark-mode-icon', 'history-list', 'victory-container', 'victory-message', 'victory-submessage',
        'scanned-points-display', 'scan-bonuses-container', 'manual-points-input', 'manual-bonuses-container', 'raw-points', 'added-points',
        'dealer-fab', 'dealer-modal', 'undo-button', 'confetti-container'
    ];
    ids.forEach(id => {
        if (id) dom[id.replace(/-(\w)/g, (m, g) => g.toUpperCase())] = document.getElementById(id);
    });
    dom.screens = document.querySelectorAll('.screen');
    dom.dealerQuadrants = document.querySelectorAll('#dealer-selector .dealer-quadrant');
}

document.addEventListener('DOMContentLoaded', () => {
    initDOM();
    createModeSelectionScreen('scan');
    createModeSelectionScreen('manual');
    setupDealerInteraction();
    updateDealerDisplay();
    updateScoresDisplay();
    updateHistoryDisplay();
    if (localStorage.getItem('darkMode') === 'true') toggleDarkMode();
});

// --- UI & SCREEN MANAGEMENT ---
function showScreen(screenId) {
    dom.screens.forEach(screen => screen.classList.remove('active-screen'));
    dom[screenId.replace(/-(\w)/g, (m, g) => g.toUpperCase())].classList.add('active-screen');
    if (screenId === 'scan-mode-screen' || screenId === 'manual-mode-screen') resetModeAndModifiers();
}

function createModeSelectionScreen(type) {
    const isScan = type === 'scan';
    const targetScreenId = isScan ? 'scan-mode-screen' : 'manual-mode-screen';
    let nextScreenId = isScan ? 'scan-bonus-screen' : 'manual-input-screen';
    const proceedFunction = isScan ? `proceedToScanOrBonus()` : `proceedToNextStep('${nextScreenId}')`;

    const screen = dom[targetScreenId.replace(/-(\w)/g, (m, g) => g.toUpperCase())];
    screen.innerHTML = `
        <div class="flex items-center mb-6">
            <button onclick="showScreen('start-screen')" class="p-2 rounded-full bg-gray-100"><i class="fas fa-arrow-left text-gray-700"></i></button>
            <h2 class="text-2xl font-bold ml-4">${isScan ? 'Сканиране' : 'Ръчно'}: Режим</h2>
        </div>
        <div class="space-y-4">
            <div class="card p-6 rounded-xl"><h3 class="font-medium text-lg mb-2">Избери режим</h3><div class="space-y-3" id="${targetScreenId}-modes">
                <button onclick="selectMode('on-suit', this)" class="w-full py-3 bg-gray-200 text-gray-800 rounded-lg font-medium">На боя</button>
                <button onclick="selectMode('no-trump', this)" class="w-full py-3 bg-gray-200 text-gray-800 rounded-lg font-medium">Без коз</button>
                <button onclick="selectMode('all-trump', this)" class="w-full py-3 bg-gray-200 text-gray-800 rounded-lg font-medium">Всичко коз</button>
            </div></div>
            <div class="card p-6 rounded-xl"><h3 class="font-medium text-lg mb-2">Модификатори</h3><div class="grid grid-cols-2 gap-3" id="${targetScreenId}-modifiers">
                <button onclick="toggleModifier('contra', this)" class="py-2 bg-gray-200 text-gray-800 rounded-lg font-medium">Контра</button>
                <button onclick="toggleModifier('recontra', this)" class="py-2 bg-gray-200 text-gray-800 rounded-lg font-medium">Реконтра</button>
            </div></div>
            <button onclick="${proceedFunction}" class="w-full py-3 bg-belot-blue text-white rounded-xl font-medium mt-6">Продължи</button>
        </div>`;
}

function toggleDarkMode() {
    state.darkMode = !state.darkMode;
    document.body.classList.toggle('dark-mode', state.darkMode);
    dom.darkModeIcon.className = state.darkMode ? 'fas fa-sun text-yellow-400' : 'fas fa-moon text-gray-700';
    localStorage.setItem('darkMode', state.darkMode);
}

// --- DEALER & UNDO LOGIC ---
function showDealerModal() {
    if (state.dealer.isSet) return;
    dom.dealerModal.classList.remove('hidden');
}

function hideDealerModal() {
    dom.dealerModal.classList.add('hidden');
}

function setupDealerInteraction() {
    dom.dealerQuadrants.forEach(quad => {
        quad.onclick = () => {
            const index = parseInt(quad.dataset.dealerIndex);
            state.dealer.current = index;
            state.dealer.isSet = true;
            updateDealerDisplay();
            hideDealerModal();
        };
    });
}

function undoLastHand() {
    if (state.history.length === 0) return;
    if (confirm('Сигурни ли сте, че искате да отмените последната ръка?')) {
        const lastHand = state.history.pop();
        state.scores[lastHand.team] -= lastHand.points;
        if (state.dealer.current !== null)
            state.dealer.current = (state.dealer.current - 1 + 4) % 4;
        updateScoresDisplay();
        updateHistoryDisplay();
        updateDealerDisplay();
    }
}

function clearHistory() {
    if (confirm('Сигурни ли сте, че искате да изчистите историята?')) {
        state.history = [];
        updateHistoryDisplay();
    }
}

// --- GAME LOGIC & SCORING ---
function resetModeAndModifiers() {
    state.currentMode = null;
    state.modifiers = { contra: false, recontra: false };
    ['scan-mode-screen', 'manual-mode-screen'].forEach(id => {
        const screen = dom[id.replace(/-(\w)/g, (m, g) => g.toUpperCase())];
        if (!screen) return;
        screen.querySelectorAll('button.bg-belot-blue').forEach(btn => {
            btn.classList.remove('bg-belot-blue', 'text-white');
            btn.classList.add('bg-gray-200', 'text-gray-800');
        });
    });
}

function selectMode(mode, button) {
    state.currentMode = mode;
    const parent = button.parentElement;
    parent.querySelectorAll('button').forEach(btn => {
        btn.classList.remove('bg-belot-blue', 'text-white');
        btn.classList.add('bg-gray-200', 'text-gray-800');
    });
    button.classList.remove('bg-gray-200', 'text-gray-800');
    button.classList.add('bg-belot-blue', 'text-white');
}

function toggleModifier(modifier, button) {
    const wasActive = state.modifiers[modifier];
    const parent = button.parentElement;
    state.modifiers.contra = false;
    state.modifiers.recontra = false;
    if (!wasActive) {
        state.modifiers[modifier] = true;
    }
    parent.querySelectorAll('button').forEach(btn => {
        const btnText = btn.textContent.toLowerCase();
        let btnModifier;
        if (btnText.includes('реконтра')) { btnModifier = 'recontra'; }
        else if (btnText.includes('контра')) { btnModifier = 'contra'; }
        if (btnModifier) {
            btn.classList.toggle('bg-belot-blue', state.modifiers[btnModifier]);
            btn.classList.toggle('text-white', state.modifiers[btnModifier]);
            btn.classList.toggle('bg-gray-200', !state.modifiers[btnModifier]);
            btn.classList.toggle('text-gray-800', !state.modifiers[btnModifier]);
        }
    });
}

function proceedToNextStep(nextScreenId) {
    if (!state.currentMode) return alert('Моля, изберете режим на игра.');
    if (nextScreenId === 'manual-input-screen') prepareBonusScreen('manual');
    showScreen(nextScreenId);
}

function proceedToScanOrBonus() {
    if (!state.currentMode) return alert('Моля, изберете режим на игра.');
    const totalGamePoints = (state.currentMode === 'on-suit') ? 162 : (state.currentMode === 'all-trump' ? 258 : 260);
    state.pendingPoints.fromScan = Math.floor(Math.random() * (totalGamePoints / 2)) + (totalGamePoints / 2 - 40);
    state.pendingPoints.bonus = 0;
    if (state.currentMode === 'no-trump') {
        calculateAndShowFinalScore(state.pendingPoints.fromScan);
    } else {
        prepareBonusScreen('scan');
        showScreen('scan-bonus-screen');
    }
}

function prepareBonusScreen(type) {
    const container = (type === 'scan') ? dom.scanBonusesContainer : dom.manualBonusesContainer;
    setupBonusButtons(container, type);
    container.querySelectorAll('button').forEach(button => {
        button.disabled = state.currentMode === 'no-trump';
    });
    if (type === 'scan') dom.scannedPointsDisplay.textContent = state.pendingPoints.fromScan;
    if (type === 'manual') dom.manualPointsInput.value = '';
}

const bonusButtonsHTML = `
    <button data-points="20" class="py-3 bg-gray-200 rounded-lg font-medium">Белот <span class="block text-xs">(+20)</span></button>
    <button data-points="20" class="py-3 bg-gray-200 rounded-lg font-medium">Терца <span class="block text-xs">(+20)</span></button>
    <button data-points="50" class="py-3 bg-gray-200 rounded-lg font-medium">Кварта <span class="block text-xs">(+50)</span></button>
    <button data-points="100" class="py-3 bg-gray-200 rounded-lg font-medium">100 <span class="block text-xs">(Квинта/Каре)</span></button>
    <button data-points="150" class="py-3 bg-gray-200 rounded-lg font-medium">150 <span class="block text-xs">(Каре 9-ки)</span></button>
    <button data-points="200" class="py-3 bg-gray-200 rounded-lg font-medium">200 <span class="block text-xs">(Каре J)</span></button>`;

function setupBonusButtons(container, type) {
    container.innerHTML = bonusButtonsHTML;
    container.querySelectorAll('button').forEach(button => {
        button.classList.add('bonus-button');
        button.onclick = (event) => {
            if (button.disabled) return;
            addBonusPoints(parseInt(button.dataset.points), type, event.currentTarget);
        };
    });
}

function addBonusPoints(points, type, clickedButton) {
    if (type === 'manual') {
        dom.manualPointsInput.value = (parseInt(dom.manualPointsInput.value) || 0) + points;
    } else if (type === 'scan') {
        state.pendingPoints.bonus += points;
        dom.scannedPointsDisplay.textContent = state.pendingPoints.fromScan + state.pendingPoints.bonus;
    }
    if (clickedButton) {
        const pointsEffect = document.createElement('span');
        pointsEffect.className = 'floating-points';
        pointsEffect.textContent = `+${points}`;
        clickedButton.appendChild(pointsEffect);
        setTimeout(() => { pointsEffect.remove(); }, 1000);
    }
}

function submitBonuses(type) {
    const basePoints = (type === 'manual') ? (parseInt(dom.manualPointsInput.value) || 0) : state.pendingPoints.fromScan;
    const bonusPoints = (type === 'manual') ? 0 : state.pendingPoints.bonus;
    if (type === 'manual' && basePoints <= 0) {
        return alert('Моля, въведете точки.');
    }
    calculateAndShowFinalScore(basePoints + bonusPoints);
}

function calculateAndShowFinalScore(rawPoints) {
    let finalPoints = rawPoints;
    if (state.modifiers.contra) finalPoints *= 2;
    if (state.modifiers.recontra) finalPoints *= 4;
    if (state.currentMode === 'no-trump') finalPoints *= 2;
    const roundedPoints = roundBelotPoints(finalPoints);
    state.pendingPoints.raw = Math.round(rawPoints);
    state.pendingPoints.rounded = roundedPoints;
    dom.rawPoints.textContent = state.pendingPoints.raw;
    dom.addedPoints.textContent = state.pendingPoints.rounded;
    showScreen('confirm-screen');
}

function roundBelotPoints(raw) {
    const points = Math.round(raw);
    const lastDigit = points % 10;
    const base = Math.floor(points / 10);
    if (state.currentMode === 'no-trump') return (lastDigit > 4) ? base + 1 : base;
    return (lastDigit > 5) ? base + 1 : base;
}

function addPointsToTeam(team) {
    if (!state.dealer.isSet) {
        alert('Моля, изберете кой раздава пръв, като кликнете върху жълтия бутон.');
        showDealerModal();
        return;
    }
    state.scores[team] += state.pendingPoints.rounded;
    state.history.push({ team, points: state.pendingPoints.rounded, date: new Date().toLocaleTimeString('bg-BG') });
    state.dealer.current = (state.dealer.current + 1) % 4;
    updateDealerDisplay();
    updateScoresDisplay();
    updateHistoryDisplay();
    checkVictory();
}

function checkVictory() {
    let winner = null;
    if (state.scores.myTeam >= 151) winner = 'myTeam';
    else if (state.scores.opponent >= 151) winner = 'opponent';

    if (winner) {
        state.victory = true;
        state.wins[winner]++;
        dom.victoryMessage.textContent = "ПОБЕДА!";
        dom.victorySubmessage.textContent = `Отбор "${winner === 'myTeam' ? 'Ние' : 'Вие'}" достигна ${state.scores[winner]} точки!`;
        showVictoryAnimation();
    } else {
        state.victory = false;
        showScreen('start-screen');
    }
}

// --- MISSING HELPER FUNCTIONS (Implemented based on usage) ---

function updateScoresDisplay() {
    dom.myTeamTotal.textContent = state.scores.myTeam;
    dom.opponentTotal.textContent = state.scores.opponent;
    dom.totalWins.textContent = `${state.wins.myTeam}:${state.wins.opponent}`;
}

function updateDealerDisplay() {
    if (state.dealer.current === null) {
        dom.dealerFab.textContent = "?";
        return;
    }
    const positions = ['N', 'E', 'S', 'W'];
    dom.dealerFab.textContent = positions[state.dealer.current];
    // Optional: Highlight current dealer in modal if desired
}

function updateHistoryDisplay() {
    if (state.history.length === 0) {
        dom.historyList.innerHTML = '<div class="text-center py-8 text-gray-500">Няма записани ръце.</div>';
        return;
    }
    dom.historyList.innerHTML = '';
    state.history.slice().reverse().forEach(hand => {
        const item = document.createElement('div');
        item.className = 'history-item p-3 bg-white rounded-lg shadow-sm flex justify-between items-center';
        if (state.darkMode) item.classList.add('bg-gray-800', 'text-white');

        const teamName = hand.team === 'myTeam' ? 'Ние' : 'Вие';
        const teamColor = hand.team === 'myTeam' ? 'text-belot-blue' : 'text-belot-red';

        item.innerHTML = `
            <div>
                <span class="font-bold ${teamColor}">${teamName}</span>
                <span class="text-xs text-gray-500 ml-2">${hand.date}</span>
            </div>
            <div class="font-bold text-lg">+${hand.points}</div>
        `;
        dom.historyList.appendChild(item);
    });
}

function showVictoryAnimation() {
    dom.victoryContainer.classList.remove('hidden');
    // Simple confetti simulation can be added here
}

function hideVictory() {
    dom.victoryContainer.classList.add('hidden');
    // Reset scores for new game, keep wins
    state.scores = { myTeam: 0, opponent: 0 };
    state.history = [];
    updateScoresDisplay();
    updateHistoryDisplay();
    showScreen('start-screen');
}

function startCardScan() {
    alert("Функцията за сканиране на камерата е симулация.");
    // In a real app, you would initialize camera stream here
}

function resetGame() {
    if (confirm('Сигурни ли сте, че искате да нулирате текущата игра?')) {
        state.scores = { myTeam: 0, opponent: 0 };
        state.history = [];
        state.dealer.isSet = false;
        state.dealer.current = null;
        updateScoresDisplay();
        updateHistoryDisplay();
        updateDealerDisplay();
        showScreen('start-screen');
    }
}