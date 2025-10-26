
const arrowScaleTo = 130;

function rotateAndProjectPoint(x, y, z, alpha, beta, gamma, cx, cy, Rpix) {
    // precalcular senos/cosenos
    const ca = Math.cos(alpha), sa = Math.sin(alpha);
    const cb = Math.cos(beta),  sb = Math.sin(beta);
    const cg = Math.cos(gamma), sg = Math.sin(gamma);

    // rotación alrededor de X (alpha)
    const x1 = x;
    const y1 = y * ca - z * sa;
    const z1 = y * sa + z * ca;

    // rotación alrededor de Y (beta)
    const x2 = x1 * cb + z1 * sb;
    const y2 = y1;
    const z2 = -x1 * sb + z1 * cb;

    // rotación alrededor de Z (gamma)
    const xp = x2 * cg - y2 * sg;
    const yp = x2 * sg + y2 * cg;
    const zp = z2;

    // proyección ortográfica (mirando a lo largo de xp)
    const screenX = yp;
    const screenY = zp;

    // pasar a píxeles dentro del layout
    const pixelX = cx + Rpix * screenX;
    const pixelY = cy - Rpix * screenY;

    // devuelvo también "profundidad" xp por si quiero usar z-order
    return {
        x: pixelX,
        y: pixelY,
        depth: xp
    };
}

// helper: qubit Bloch coords desde theta, phi
function qubitBlochCoords(theta, phi) {
    const x = Math.sin(theta) * Math.cos(phi);
    const y = Math.sin(theta) * Math.sin(phi);
    const z = Math.cos(theta);
    return {x, y, z};
}

function meridianPoints(steps=32, n_meridians=12) {
    
    const pts = [];

    for (let n=0; n<n_meridians; n++) {
        const phi = 2*Math.PI * n / n_meridians;
        // recorrer theta de 0..pi
        for (let i=0; i<steps; i++) {
            const th = Math.PI * i / steps;
            const x = Math.sin(th) * Math.cos(phi);
            const y = Math.sin(th) * Math.sin(phi);
            const z = Math.cos(th);
            pts.push({x,y,z});
        }
    }
    return pts;
}

function parallelPoints(steps=64, n_paralles=12) {
    const pts = [];

    for (let n=0; n<n_paralles; n++) {
        const theta = Math.PI * n / n_paralles;
        for (let i=0; i<steps; i++) {
            const phi = 2*Math.PI * i / steps;
            const x = Math.sin(theta) * Math.cos(phi);
            const y = Math.sin(theta) * Math.sin(phi);
            const z = Math.cos(theta);
            pts.push({x,y,z});
        }
    }
    return pts;
}

function drawGridLines(runtime, lines, steps, n, alpha, beta, gamma, centerX, centerY, radius) {
    const pixel_sphere = runtime.objects.sphere;

    for (let i=0; i < (steps*n); i++) {
        const line_pt = lines[i];
        const line_pt_new = rotateAndProjectPoint(line_pt.x, line_pt.y, line_pt.z, alpha, beta, gamma, centerX, centerY, radius);
        const ps_ins = pixel_sphere.createInstance("bloch_sphere", line_pt_new.x, line_pt_new.y);
        ps_ins.width = 1;
        ps_ins.height = 1;
    }
}

function drawAxis(runtime, o2d, axis2d, scaleArrow) {
    const dx_axis = axis2d.x - o2d.x;
    const dy_axis = axis2d.y - o2d.y;
    const lengthPixels = Math.sqrt(dx_axis*dx_axis + dy_axis*dy_axis);
    const angleRad = Math.atan2(dy_axis, dx_axis);
    const angleDeg = angleRad * 180 / Math.PI;

    const axis_line = runtime.objects.axis;

    const axis = axis_line.createInstance("bloch_sphere", o2d.x, o2d.y);
    axis.width = lengthPixels;
    axis.angleDegrees = angleDeg;

    const canvasInst = runtime.objects.BlochCanvas.getFirstInstance();
    drawArrow(canvasInst, o2d.x, o2d.y, axis2d.x, axis2d.y, scaleArrow);
}

function drawAxisCanvas(canvasInst, o2d, axis2d, scaleArrow, color) {
    canvasInst.clearCanvas([255, 255, 255, 0]);

    // coordenadas de tus dos puntos en pantalla:
    const x1 = o2d.x;
    const y1 = o2d.y;
    const x2 = axis2d.x;
    const y2 = axis2d.y;

    // grosor de la línea en píxeles:
    const lineWidth = 2;

    const offsetX = canvasInst.x;
    const offsetY = canvasInst.y;

    const localX1 = x1 - offsetX;
    const localY1 = y1 - offsetY;
    const localX2 = x2 - offsetX;
    const localY2 = y2 - offsetY;

    canvasInst.line(localX1, localY1, localX2, localY2, color, lineWidth);

    drawArrow(canvasInst, x1, y1, x2, y2, scaleArrow, color);

}

function drawArrow(canvasInst, x1, y1, x2, y2, scaleArrow, arrowColor=[0, 255, 255, 1]) {

    const arrowLen = Math.round(12*scaleArrow);
    const arrowWidth = Math.round(6*scaleArrow);
    const lineWidth = 2;

    // calcular geometría de la flecha
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.sqrt(dx*dx + dy*dy);

    if (len < 0.0001) {
        return; // evita división entre cero si start==end
    }

    const ux = dx / len;
    const uy = dy / len;

    // punto base de la flecha (un poco "antes" de la punta)
    const baseX = x2 - ux * arrowLen;
    const baseY = y2 - uy * arrowLen;

    // perpendicular
    const leftX  = baseX + (-uy) * arrowWidth;
    const leftY  = baseY + ( ux) * arrowWidth;
    const rightX = baseX + ( uy) * arrowWidth;
    const rightY = baseY + (-ux) * arrowWidth;

    // dibujar la punta
    // polígono relleno
    if (canvasInst.fillPoly) {
        canvasInst.fillPoly(
            [
                [x2,    y2],
                [leftX, leftY],
                [rightX,rightY]
            ],
            arrowColor
        );
    } else {
        // fallback: dibujar una V con line()
        canvasInst.line(x2, y2, leftX,  leftY,  arrowColor, lineWidth);
        canvasInst.line(x2, y2, rightX, rightY, arrowColor, lineWidth);
    }
}

function placeAxisLabel(textObject, origin2d, tip2d, offsetPx) {
    // dirección del eje en pantalla
    const dx = tip2d.x - origin2d.x;
    const dy = tip2d.y - origin2d.y;
    const len = Math.sqrt(dx*dx + dy*dy);

    // seguridad por si algo salió raro
    if (len < 0.0001) {
        return;
    }

    const ux = dx / len;
    const uy = dy / len;

    // punto para colocar la etiqueta:
    const labelX = tip2d.x + ux * offsetPx;
    const labelY = tip2d.y + uy * offsetPx;

    // mover la instancia de texto correspondiente
    textObject.x = labelX;
    textObject.y = labelY;
}


function drawAxisLabels(runtime, o2d, xAxis2d, yAxis2d, zAxis2d, offset) {

    // agarrar las instancias de texto
    const labelX = runtime.objects.axis_x_txt.getFirstInstance();
    const labelY = runtime.objects.axis_y_txt.getFirstInstance();
    const labelZ = runtime.objects.axis_z_txt.getFirstInstance();

    placeAxisLabel(labelX, o2d, xAxis2d, offset);
    placeAxisLabel(labelY, o2d, yAxis2d, offset);
    placeAxisLabel(labelZ, o2d, zAxis2d, offset);

}

function blochCoordsFromAlphaBeta(alpha, beta) {
    // α = ar + i ai
    // β = br + i bi
    const ar = alpha.re, ai = alpha.im;
    const br = beta.re,  bi = beta.im;

    // conj(α)β = (ar - i ai)(br + i bi) = (ar*br + ai*bi) + i(br*ai - ar*bi)
    const re_ab = ar*br + ai*bi;
    const im_ab = br*ai - ar*bi;

    const x = 2 * re_ab;
    const y = 2 * im_ab;
    const z = (ar*ar + ai*ai) - (br*br + bi*bi);

    return { x, y, z };
}

function drawLineCanvas(canvasInst, o2d, axis2d, lineWidth, color) {

    // coordenadas de tus dos puntos en pantalla:
    const x1 = o2d.x;
    const y1 = o2d.y;
    const x2 = axis2d.x;
    const y2 = axis2d.y;

    const offsetX = canvasInst.x;
    const offsetY = canvasInst.y;

    const localX1 = x1 - offsetX;
    const localY1 = y1 - offsetY;
    const localX2 = x2 - offsetX;
    const localY2 = y2 - offsetY;

    canvasInst.line(localX1, localY1, localX2, localY2, color, lineWidth);

}


export function drawBlochSphere(runtime) {

    const centerX = runtime.globalVars.centerX_bloch;
    const centerY = runtime.globalVars.centerY_bloch;
    const radius = runtime.globalVars.radius_bloch;
    const offset_axis = runtime.globalVars.offset_axis_bloch;
    const n_meridians = runtime.globalVars.meridians_bloch;
    const n_paralles = runtime.globalVars.parallels_bloch;
    const steps_meridians = runtime.globalVars.points_per_meridian_bloch;
    const steps_parallels = runtime.globalVars.points_per_parallel_bloch;

    const alpha = runtime.globalVars.alpha_cam_bloch;
    const beta = runtime.globalVars.beta_cam_bloch;
    const gamma =runtime.globalVars.gamma_cam_bloch;

    //console.log(runtime);

    const o2d = rotateAndProjectPoint(0, 0, 0, alpha, beta, gamma, centerX, centerY, radius);


    // grid lines

    const meridians = meridianPoints(steps_meridians, n_meridians);

    drawGridLines(runtime, meridians, steps_meridians, n_meridians, alpha, beta, gamma, centerX, centerY, radius);

    //for (let i=0; i < (steps_meridians*n_meridians); i++) {
    //    const meridian_pt = meridians[i];
    //    const meridian_pt_new = rotateAndProjectPoint(meridian_pt.x, meridian_pt.y, meridian_pt.z, alpha, beta, gamma, centerX, centerY, radius);
    //    const ps_ins = pixel_sphere.createInstance("bloch_sphere", meridian_pt_new.x, meridian_pt_new.y);
    //    ps_ins.width = 1;
    //    ps_ins.height = 1;
    //}

    const parallels = parallelPoints(steps_parallels, n_paralles);

    drawGridLines(runtime, parallels, steps_parallels, n_paralles, alpha, beta, gamma, centerX, centerY, radius);

    //for (let i=0; i < (steps_parallels*n_paralles); i++) {
    //    const parallel_pt = parallels[i];
    //    const parallel_pt_new = rotateAndProjectPoint(parallel_pt.x, parallel_pt.y, parallel_pt.z, alpha, beta, gamma, centerX, centerY, radius);
    //    const ps_ins = pixel_sphere.createInstance("bloch_sphere", parallel_pt_new.x, parallel_pt_new.y);
    //    ps_ins.width = 1;
    //    ps_ins.height = 1;
    //}


    // ejes

    const axisLen = 1.3; // un poquito más que el radio =1

    const xAxis2d = rotateAndProjectPoint(axisLen, 0, 0, alpha, beta, gamma, centerX, centerY, radius);
    const yAxis2d = rotateAndProjectPoint(0, axisLen, 0, alpha, beta, gamma, centerX, centerY, radius);
    const zAxis2d = rotateAndProjectPoint(0, 0, axisLen, alpha, beta, gamma, centerX, centerY, radius);

    const scaleArrow = radius/arrowScaleTo;
    const colorLine = [255, 255, 255, 1];

    drawAxis(runtime, o2d, xAxis2d, scaleArrow);
    drawAxis(runtime, o2d, yAxis2d, scaleArrow);
    drawAxis(runtime, o2d, zAxis2d, scaleArrow);
    const canvasInst = runtime.objects.BlochCanvas.getFirstInstance();
    //drawAxisCanvas(canvasInst, o2d, zAxis2d, scaleArrow, colorLine);

    drawAxisLabels(runtime, o2d, xAxis2d, yAxis2d, zAxis2d, offset_axis);

}

export function drawQubit(runtime) {
    const theta = runtime.globalVars.theta_guess * Math.PI / 180;
    const phi = runtime.globalVars.phi_guess * Math.PI / 180;

    const centerX = runtime.globalVars.centerX_bloch;
    const centerY = runtime.globalVars.centerY_bloch;
    const radius = runtime.globalVars.radius_bloch;
    const alpha = runtime.globalVars.alpha_cam_bloch;
    const beta = runtime.globalVars.beta_cam_bloch;
    const gamma =runtime.globalVars.gamma_cam_bloch;

    const qubit = qubitBlochCoords(theta, phi);

    // origen 3D
    const o2d = rotateAndProjectPoint(0, 0, 0, alpha, beta, gamma, centerX, centerY, radius);

    // punta del vector qubit
    const tip2d = rotateAndProjectPoint(
        qubit.x, qubit.y, qubit.z,
        alpha, beta, gamma,
        centerX, centerY, radius
    );

    const scaleArrow = radius/arrowScaleTo;
    const colorVector = [1, 0, 0, 1];

    const canvasInst = runtime.objects.QubitCanvas.getFirstInstance();
    drawAxisCanvas(canvasInst, o2d, tip2d, scaleArrow, colorVector);
}

export function drawTetrahedron(runtime, SIC_STATES) {

    const centerX = runtime.globalVars.centerX_bloch;
    const centerY = runtime.globalVars.centerY_bloch;
    const radius = runtime.globalVars.radius_bloch;
    const alpha = runtime.globalVars.alpha_cam_bloch;
    const beta = runtime.globalVars.beta_cam_bloch;
    const gamma =runtime.globalVars.gamma_cam_bloch;

    const canvasInst = runtime.objects.QubitCanvas.getFirstInstance();

    // origen en el centro de la esfera
    const origin2d = rotateAndProjectPoint(0, 0, 0, alpha, beta, gamma, centerX, centerY, radius);

    // convertir todos los estados a coordenadas Bloch
    const blochPoints = SIC_STATES.map(s => blochCoordsFromAlphaBeta(s.alpha, s.beta));

    // proyectar los vértices en 2D
    const tips2d = [];

    for (let i = 0; i < blochPoints.length; i++) {
        const p = blochPoints[i];
        const tip2d = rotateAndProjectPoint(p.x, p.y, p.z, alpha, beta, gamma, centerX, centerY, radius);
        tips2d.push(tip2d);

        // dibujar el vector desde el centro
        //drawLineCanvas(canvasInst, origin2d, tip2d, [255, 0, 0]); // rojo
    }

    // dibujar líneas entre cada par de vértices (aristas del tetraedro)
    for (let i = 0; i < tips2d.length; i++) {
        for (let j = i + 1; j < tips2d.length; j++) {
            drawLineCanvas(canvasInst, tips2d[i], tips2d[j], 2, [255, 255, 255]); // blanco
        }
    }

    for (let i = 0; i < tips2d.length; i++) {
        drawLineCanvas(canvasInst, origin2d, tips2d[i], 3, [255, 0, 0]); // rojo
    }
}
