
function drawShots(p, nShots) {
    // simular N mediciones binarias con probabilidad p de obtener "+"
    let plusCount = 0;
    for (let i = 0; i < nShots; i++) {
        if (Math.random() < p) {
            plusCount++;
        }
    }
    const minusCount = nShots - plusCount;
    const freqPlus = plusCount / nShots;   // frecuencia empírica
    const expValue = 2 * freqPlus - 1;     // <σ> ≈ 2P(+) - 1
    return {
        plusCount,
        minusCount,
        freqPlus,
        expValue
    };
}

// alpha = {re, im}, beta = {re, im}
// Devuelve {theta, phi} en radianes
function alphaBetaToThetaPhi(alpha, beta) {
    // normalizar estado (por seguridad)
    const norm2 = (alpha.re*alpha.re + alpha.im*alpha.im) +
                  (beta.re*beta.re   + beta.im*beta.im);
    const norm = Math.sqrt(norm2);

    let aRe = alpha.re / norm;
    let aIm = alpha.im / norm;
    let bRe = beta.re  / norm;
    let bIm = beta.im  / norm;

    // remover fase global para que alpha sea real y >= 0
    // gamma = arg(alpha) = atan2(aIm, aRe)
    const gamma = Math.atan2(aIm, aRe);

    // multiplicamos ambos por e^{-i gamma} = cos(gamma) - i sin(gamma)
    const cosG = Math.cos(gamma);
    const sinG = Math.sin(gamma);

    // alpha' = alpha * e^{-i gamma}
    const aPrimeRe = aRe * cosG + aIm * sinG;
    const aPrimeIm = -aRe * sinG + aIm * cosG;

    // beta' = beta * e^{-i gamma}
    const bPrimeRe = bRe * cosG + bIm * sinG;
    const bPrimeIm = -bRe * sinG + bIm * cosG;

    // por construcción, aPrimeIm debería ser ~0 numéricamente
    // y aPrimeRe >= 0 (salvo redondeo)

    // extraer theta
    // aPrimeRe = cos(theta/2)
    let theta = 2 * Math.acos(aPrimeRe);

    // extraer phi
    // beta' = e^{i phi} sin(theta/2)
    // => e^{i phi} = beta' / sin(theta/2)
    const sinThetaOver2 = Math.sin(theta / 2);

    let phi;
    if (sinThetaOver2 < 1e-12) {
        // estado ~|0>, phi es irrelevante: lo fijamos 0
        phi = 0;
    } else {
        // fase de beta' = atan2(Im, Re)
        phi = Math.atan2(bPrimeIm, bPrimeRe);
    }

    // asegurar phi en [0, 2π)
    if (phi < 0) {
        phi += 2 * Math.PI;
    }

    return {
        theta: theta,
        phi: phi
    };
}

function fidelityUserVsSIC(sicIndex, thetaUser, phiUser, SIC_STATES) {
    // estado objetivo (uno de los 4 del SIC)
    const alphaT = SIC_STATES[sicIndex].alpha; // {re, im}
    const betaT  = SIC_STATES[sicIndex].beta;  // {re, im}

    // estado del jugador en amplitudes
    const aU = Math.cos(thetaUser / 2); // real
    const bU_re = Math.sin(thetaUser / 2) * Math.cos(phiUser);
    const bU_im = Math.sin(thetaUser / 2) * Math.sin(phiUser);

    // producto interno <target | user>
    // <psi_T | psi_U> = alphaT* * aU + betaT* * bU
    // alphaT* = (alphaT.re - i alphaT.im)
    // betaT*  = (betaT.re  - i betaT.im)

    // parte real
    const inner_re =
        (alphaT.re * aU + alphaT.im * 0 /*aU imag=0*/) +
        (betaT.re * bU_re + betaT.im * bU_im);

    // parte imag:
    // alphaT* * aU solo aporta -alphaT.im * aU en la parte imag (porque aU es real)
    // betaT* * bU = (betaT.re - i betaT.im)*(bU_re + i bU_im)
    //             = betaT.re*bU_re + betaT.im*bU_im
    //               + i( betaT.re*bU_im - betaT.im*bU_re )
    // sumamos ambas contribuciones
    const inner_im =
        (-alphaT.im * aU) +
        (betaT.re * bU_im - betaT.im * bU_re);

    // fidelidad
    const F = inner_re * inner_re + inner_im * inner_im;
    return F;
}



export function tomography(runtime, basis, SIC_STATES) {
    // estado objetivo (uno de los 4 del SIC)
    const sicIndex = runtime.globalVars.hidden_state_index;
    const alphaT = SIC_STATES[sicIndex].alpha; // {re, im}
    const betaT  = SIC_STATES[sicIndex].beta;  // {re, im}

	const theta = runtime.globalVars.theta_guess * Math.PI / 180;
    const phi = runtime.globalVars.phi_guess * Math.PI / 180;
    const shots = runtime.globalVars.meas_shots;

    const alpha = alphaT.re;
    const betaReal = betaT.re;
    const betaImag = betaT.im;
    //const alpha = Math.cos(theta / 2); // real
    //const betaReal = Math.sin(theta / 2) * Math.cos(phi);
    //const betaImag = Math.sin(theta / 2) * Math.sin(phi);

    // probabilidades teóricas de obtener '+' en cada base

    // base Z
    const pZplus = alpha * alpha; // cos^2(theta/2)
    // const pZminus = 1 - pZplus; // no es necesario guardarlo explícito

    // base X
    // |alpha + beta|^2 = (alpha + betaReal)^2 + (betaImag)^2
    const pXplus = 0.5 * ( (alpha + betaReal) * (alpha + betaReal) + (betaImag * betaImag) );
    // const pXminus = 1 - pXplus;

    // base Y
    // (alpha - betaImag)^2 + (betaReal)^2
    const pYplus = 0.5 * ( (alpha + betaImag) * (alpha + betaImag) + (betaReal * betaReal) );
    // const pYminus = 1 - pYplus;
    

    // simular mediciones independientes en cada base
    const measZ = drawShots(pZplus, shots);
    const measX = drawShots(pXplus, shots);
    const measY = drawShots(pYplus, shots);

    // vector de Bloch estimado experimentalmente
    // r_est = (<X>, <Y>, <Z>) a partir de los valores esperados empíricos
    const r_est = {
        x: measX.expValue,
        y: measY.expValue,
        z: measZ.expValue
    };

    // resultado detallado para usar en UI
    const probs_theory = {
            // probabilidades ideales
            pXplus: pXplus,
            pYplus: pYplus,
            pZplus: pZplus
    };

    if (basis == "X") {
        const plus_res = runtime.objects.results_plus_val_txt.getFirstInstance();
        plus_res.text = ''+Math.round(measX.freqPlus*100)/100;
        const minus_res = runtime.objects.results_minus_val_txt.getFirstInstance();
        minus_res.text = ''+Math.round((1-measX.freqPlus)*100)/100;
    }

    if (basis == "Y") {
        const plusi_res = runtime.objects.results_plusi_val_txt.getFirstInstance();
        plusi_res.text = ''+Math.round(measY.freqPlus*100)/100;
        const minusi_res = runtime.objects.results_minusi_val_txt.getFirstInstance();
        minusi_res.text = ''+Math.round((1-measY.freqPlus)*100)/100;
    }

    if (basis == "Z") {
        const zero_res = runtime.objects.results_zero_val_txt.getFirstInstance();
        zero_res.text = ''+Math.round(measZ.freqPlus*100)/100;
        const one_res = runtime.objects.results_one_val_txt.getFirstInstance();
        one_res.text = ''+Math.round((1-measZ.freqPlus)*100)/100;
    }

    runtime.globalVars.meas_shots = 0;
    runtime.globalVars.used_shots = runtime.globalVars.used_shots + shots;
    runtime.globalVars.max_shots = runtime.globalVars.max_shots - shots;

    runtime.objects.slider_shots.getFirstInstance().value = 0;
    runtime.objects.shots_val_txt.getFirstInstance().text = "0";
    runtime.objects.shots_max_txt.getFirstInstance().text = ''+runtime.globalVars.max_shots;

    // colocar el 'blocker' visual del slide de shots
    const widthSlider = runtime.objects.slider_shots.getFirstInstance().width;

    const percentageUsedShots = runtime.globalVars.used_shots/(runtime.globalVars.used_shots+runtime.globalVars.max_shots);

    runtime.objects.shots_blocker.getFirstInstance().width = widthSlider*percentageUsedShots;


}


export function checkFidelity(runtime, SIC_STATES) {

    const sicIndex = runtime.globalVars.hidden_state_index;
    const threshold = runtime.globalVars.level_threshold;
    const thetaUser = runtime.globalVars.theta_guess * Math.PI / 180;
    const phiUser = runtime.globalVars.phi_guess * Math.PI / 180;

    runtime.globalVars.verification_tokens -= 1;
    runtime.objects.ver_tok_val_txt.getFirstInstance().text = ''+runtime.globalVars.verification_tokens;

    const fide = fidelityUserVsSIC(sicIndex, thetaUser, phiUser, SIC_STATES);

    runtime.objects.fidelity_val_txt.getFirstInstance().text = ''+Math.round(fide*1000)/1000;

    if (fide >= threshold) {
        console.log("Nivel superado, fidelidad =", fide);
        runtime.globalVars.level_completed = true;
    } else {
        console.log("Aún no, fidelidad =", fide, "necesitas al menos", threshold);
    }

}