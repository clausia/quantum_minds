import {drawBlochSphere, drawQubit, drawTetrahedron} from "./bloch_sphere.js";
import {tomography, checkFidelity} from "./tomography.js";


// facile spara probar los nieveles
//const SIC_STATES = [
//    { // estado 0
//        alpha: {re: 1/Math.sqrt(2), im: 0},
//        beta:  {re: 1/Math.sqrt(2), im: 0}
//    },
//    { // estado 1
//        alpha: {re: 1/Math.sqrt(2), im: 0},
//        beta:  {re: -1/Math.sqrt(2), im: 0}
//    },
//    { // estado 2
//        alpha: {re: 1/Math.sqrt(2), im: 0},
//        beta:  {re: 0, im: 1/Math.sqrt(2)}
//    },
//    { // estado 3
//        alpha: {re: 1, im: 0},
//        beta:  {re: 0, im: 0}
//    }
//];


const TUTORIAL_STATES = [
    { // estado 0
        alpha: {re: 1, im: 0},
        beta:  {re: 0, im: 0}
    },
    { // estado 1
        alpha: {re: 1/Math.sqrt(2), im: 0},
        beta:  {re: -1/Math.sqrt(2), im: 0}
    },
    { // estado 2
        alpha: {re: 1/Math.sqrt(2), im: 0},
        beta:  {re: 0, im: 1/Math.sqrt(2)}
    },
    { // estado 3
        alpha: {re: 0.8660, im: 0},
        beta:  {re: 0.4045, im: 0.2939}
    }
];

const sqrt2over3 = Math.sqrt(2/3);
const oneOverSqrt3 = 1/Math.sqrt(3);

// https://en.wikipedia.org/wiki/SIC-POVM
const SIC_STATES = [
    { // ψ0 = |0>
        alpha: { re: 1, im: 0 },
        beta:  { re: 0, im: 0 }
    },
    { // ψ1 = (1/√3)|0> + √(2/3)|1>
        alpha: { re: oneOverSqrt3, im: 0 },
        beta:  { re: sqrt2over3, im: 0 }
    },
    { // ψ2 = (1/√3)|0> + √(2/3)e^{i 2π/3}|1>
        alpha: { re: oneOverSqrt3, im: 0 },
        beta:  {
            re: sqrt2over3 * Math.cos(2*Math.PI/3),
            im: sqrt2over3 * Math.sin(2*Math.PI/3)
        }
    },
    { // ψ3 = (1/√3)|0> + √(2/3)e^{i 4π/3}|1>
        alpha: { re: oneOverSqrt3, im: 0 },
        beta:  {
            re: sqrt2over3 * Math.cos(4*Math.PI/3),
            im: sqrt2over3 * Math.sin(4*Math.PI/3)
        }
    }
];


// estados disponibles al inicio: 0, 1, 2, 3 (indices)
let remainingStates = [0, 1, 2, 3];

// thresholds por nivel
const fidelityThresholds = [0.6, 0.75, 0.9, 0.97];

// tokens de verificación por nivel
const verificationTokens = [5, 4, 3, 2];

// elegir un nuevo estado secreto para el siguiente nivel
// también quita ese estado de remainingStates para no repetirlo
function getLevelConfig(runtime) {

    if (remainingStates.length === 0) {
        // ya se ganó el juego completo
        return null;
    }

    // elegir índice aleatorio dentro de remainingStates
    const r = Math.floor(Math.random() * remainingStates.length);
    const sicIndex = remainingStates[r];

    // removerlo del array (swap and pop)
    remainingStates.splice(r, 1);

    // el threshold depende de cuántos niveles ya se superaron
    // calculemos nivelActual = 4 - remainingStates.length
    const levelNumber = 4 - remainingStates.length; // empieza en 1
    const threshold = fidelityThresholds[levelNumber - 1]; //obtener el umbral para el nivel actual
    const verTokens = verificationTokens[levelNumber - 1]; //obtener ver. tokens para el nivel actual

    runtime.globalVars.hidden_state_index = sicIndex;
    runtime.globalVars.level_threshold = threshold;
    runtime.globalVars.verification_tokens = verTokens;
    runtime.globalVars.level = levelNumber;

    runtime.objects.ver_tok_val_txt.getFirstInstance().text = ''+verTokens;

    console.log("Hidden state index:" + runtime.globalVars.hidden_state_index);

}
