google.charts.load('current', {'packages':['corechart']});


const peqMaxHz = 96000

const hertz = [
  0, 10, 20, 30, 40, 50, 60, 70, 80, 90,
  100, 110, 120, 130, 140, 150, 160, 180,
  200, 220, 240, 260, 280, 300, 320, 400, 1000
];
const h12 = [
  12.00000,
  11.99847,
  11.97586,
  11.89152,
  11.67647,
  11.23689,
  10.60702,
  9.67786,
  8.69714,
  7.52952,
  6.47994,
  5.52354,
  4.58757,
  3.81589,
  3.20677,
  2.65650,
  2.17104,
  1.50948,
  1.06201,
  0.76508,
  0.54504,
  0.40228,
  0.30884,
  0.23642,
  0.18059,
  0.13766,
  0.00000
];
const slopes = [
  1,
  0.99989,
  0.99825,
  0.9913,
  0.973165,
  0.93619,
  0.882985,
  0.805015,
  0.72302,
  0.625895,
  0.539435,
  0.46085,
  0.38376,
  0.319825,
  0.26906,
  0.222985,
  0.1821895,
  0.126487,
  0.088828,
  0.063887,
  0.045447,
  0.033507,
  0.0257055,
  0.01966685,
  0.01501495,
  0.011439228,
  0
];

function interpolate(hertz, values, hz) {
	p = 0;
	for (let i = 0; hertz[i] < hz; i++) {
		p=i;
	}
	if (hertz[p] == hz) {
		return values[p];
	} else {
		return values[p] + (values[p+1]-values[p]) * (hz - hertz[p]) / (hertz[p+1] - hertz[p])
	}
}

// take a value hz between 0 and 1000 plus a db value describing the difference between start and end and return a fitting value
function curvevalue(hz, db) {
	x = db-12;
	m = interpolate(hertz, slopes, hz);
	b = interpolate(hertz, h12, hz);
	return m*x+b;
}

function hzScheduleOctaves(startHz, endHz, nth) {
	schedule = [];
	hZ = startHz
	i = 1
	while(hZ < endHz) {
		schedule.push(hZ);
		hZ = Math.pow(2, i/nth) * startHz		
		i = i + 1
	}
	return schedule;
}

function intermediateValues(curveType, startHz, startdB, endHz, enddB, steps, schedule) {
	retval = [];
	schedule.forEach((hZ) => {
		if ((hZ >= startHz) && (hZ < endHz)) {
			dB = startdB
			if (startdB != enddB) { 
				switch (curveType) {
					case "linear": 
						dB = startdB + (enddB-startdB) * (hZ-startHz) / (endHz-startHz);
						break;
					case "curved":
						Hz1000 = 1000 * (hZ - startHz) / (endHz - startHz);
						dB1000 = 1-curvevalue(Hz1000, startdB-enddB)/(startdB-enddB);
						dB = startdB + dB1000 * (enddB-startdB);
						break;
					case "cosine": 
						p = (hZ-startHz)/(endHz-startHz) * Math.PI;
						s = -((Math.cos(p)+1)/2 -1);
						dB = startdB + s * (enddB - startdB);
						break;
				} 
			}
			retval.push([hZ, dB]);
		}
	})
	return retval;
}

function generateValues(startHz, startdB, lowCutoffHz, lowCutoffdB, highCutoffHz, highCutoffdB, endHz, enddB, curveTypeLow, curveTypeMid, curveTypeHigh, octaveSteps) {
	// create a hz schedule
	schedule = hzScheduleOctaves(startHz, endHz, octaveSteps);
	// get the values
	values = intermediateValues(curveTypeLow, startHz, startdB, lowCutoffHz, lowCutoffdB, 20, schedule);
	values = values.concat(intermediateValues(curveTypeMid, lowCutoffHz, lowCutoffdB, highCutoffHz, highCutoffdB, 20, schedule));
	values = values.concat(intermediateValues(curveTypeHigh, highCutoffHz, highCutoffdB, endHz, enddB, 20, schedule));
	values.push([endHz, enddB]);
	return values;
}

function generateName(startHz, startdB, lowCutoffHz, lowCutoffdB, highCutoffHz, highCutoffdB, endHz, enddB, curveTypeLow, curveTypeMid, curveTypeHigh, octaveSteps) {
	return `EQ-TargetCurve-(${startHz},${startdB})-${curveTypeLow}-(${lowCutoffHz},${lowCutoffdB})-${curveTypeMid}-(${highCutoffHz},${highCutoffdB})-${curveTypeHigh}-(${endHz},${enddB})-${octaveSteps}steps.targetcurve`
}

function valuesToText(values) {
	return values.map((x) => `${+x[0].toFixed(2)} ${+x[1].toFixed(5)}`).join('\n');
}

function generateText() {
	document.getElementById('downloadbutton').disabled=true;
	
	// Retrieve input values
	const octaveSteps = Math.max(0,Math.min(100, parseFloat(document.getElementById('octaveSteps').value)));
	const startHz = parseFloat(document.getElementById('startHz').value);
	const lowCutoffHz = parseFloat(document.getElementById('lowCutoffHz').value);
	const highCutoffHz = parseFloat(document.getElementById('highCutoffHz').value);
	const endHz = parseFloat(document.getElementById('endHz').value);
	
	const startdB = parseFloat(document.getElementById('startdB').value);
	const lowCutoffdB = parseFloat(document.getElementById('lowCutoffdB').value);
	const highCutoffdB = parseFloat(document.getElementById('highCutoffdB').value);
	const enddB = parseFloat(document.getElementById('enddB').value);

	const curveTypeLow = document.getElementById('curveTypeLow').value;
	const curveTypeMid = document.getElementById('curveTypeMid').value;
	const curveTypeHigh = document.getElementById('curveTypeHigh').value;
	
	// validate inputs
	if (startHz >= lowCutoffHz || lowCutoffHz >= highCutoffHz || highCutoffHz >= endHz) {
		document.getElementById('output').value = `Hz values out of order! Must have startHz < lowCutoffHz < highCutoffHz < endHz.`
		return
	}
	
	//Compute Hz/dB values
	values = generateValues(startHz, startdB, lowCutoffHz, lowCutoffdB, highCutoffHz, highCutoffdB, endHz, enddB, curveTypeLow, curveTypeMid, curveTypeHigh, octaveSteps)
	document.getElementById('filename').value = generateName(startHz, startdB, lowCutoffHz, lowCutoffdB, highCutoffHz, highCutoffdB, endHz, enddB, curveTypeLow, curveTypeMid, curveTypeHigh, octaveSteps)
	valuesText = valuesToText(values)
	
	// Create textual representation (you can customize this part)
	const representation = 
`NAME
EQ Target Curve Generator - https://databender1729.github.io/eq-target-curves/
DEVICENAME
Unnamed
BREAKPOINTS
${valuesText}
LOWLIMITHZ
${startHz}
HIGHLIMITHZ
${endHz}`;

	// Assign to output field and draw chart
	document.getElementById('output').value = representation;
	drawChart(values)
	document.getElementById('downloadbutton').disabled=false;
}

function saveText() {
	const targetcurve = document.getElementById('output').value;
	
	// Create a download link
	var anchor = document.createElement("a");
	anchor.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(targetcurve));
	anchor.setAttribute('download',document.getElementById('filename').value);
	anchor.style.display = 'none';
	document.body.appendChild(anchor);
	// Trigger the download (may not always work due to browser security)
	anchor.click();

	// Clean up
	document.body.removeChild(anchor);
}

function drawChart(values) {
	var data = new google.visualization.DataTable();
	data.addColumn('number', 'Hz');
	data.addColumn('number', 'Db');
	data.addRows(values)

	var options = {	
	  legend: 'none',
	  curveType: 'function',
	  pointSize: 4,
	  hAxis: { logScale: true, title: 'Hz'},
	  vAxis: {minValue: 10, title: 'dB' }
	};

	var chart = new google.visualization.LineChart(document.getElementById('curve_chart'));

	chart.draw(data, options);
}

function biquad3(c1, c2 , c3, f) {
	return math.sum(
		math.multiply(c1, math.exp(math.complex(0, 0))),
		math.multiply(c2, math.exp(math.complex(0, -2 * math.PI * f))),
		math.multiply(c3, math.exp(math.complex(0, -4 * math.PI * f)))
	)
}

function transferFunction(b0, b1, b2, a0, a1, a2, f) {
	var enumerator = biquad3(b0, b1, b2, f)
	var denominator = biquad3(a0, a1, a2, f)
	return math.abs(math.divide(enumerator, denominator))
}

function scaleResponse(x) {
	return math.log10(x)*20
}

function readPEQs(textRepresentation) {
	var peqs = []
	const lines = textRepresentation.split(/\r?\n/);
	// look for biquadN
	idx = 0
	const re = /([ab][012])=(-?[0-9]*.?[0-9]+),?$/
	while ((idx < Math.min(lines.length, 600)) && lines[idx].startsWith("biquad")) {
		idx = idx + 1
		peq = {}
		while ((idx < Math.min(lines.length, 600)) && (result = lines[idx].match(re))) {
			peq[result[1]] = parseFloat(result[2])
			idx = idx + 1
		}
		if (!("a0" in peq) ) {
			peq["a0"] = 1.0
		}
		peqs.push(peq)
	}
	return peqs
}

function readTargetCurve(textRepresentation) {
	var target = {}
	const lines = textRepresentation.split(/\r?\n/);
	const re = /([0-9]+\.?[0-9]*?) (-?[0-9]+\.?[0-9]*?)$/
	idx = 0
	while ((idx < Math.min(lines.length, 600)) && (!(lines[idx].startsWith("BREAKPOINTS")))) {
		idx = idx + 1
	}
	idx = idx + 1
	if (idx < 600) { 
		target["preamble"] = lines.slice(0,idx).join('\n')
		bps = []
		while ((idx < Math.min(lines.length, 600)) && (result = lines[idx].match(re))) {
			bps.push([parseFloat(result[1]), parseFloat(result[2])])
			idx = idx + 1
		}
		target["breakpoints"] = bps
		target["appendix"] = lines.slice(idx).join('\n')
	}
	return target
}

function generateCombinedText() {
	document.getElementById('downloadbutton').disabled=true;
	var target = readTargetCurve(document.getElementById('targetcurve').value)
	var peqs = readPEQs(document.getElementById('peq').value)
	breakpoints = target["breakpoints"]
	outputText = target["preamble"] + "\n"
	values = []
	for (const bp of breakpoints) {
		f = bp[0]
		dB = bp[1]
		for (const p of peqs) {	
			r = scaleResponse(transferFunction(p["b0"], p["b1"], p["b2"], p["a0"], -p["a1"], -p["a2"], f/peqMaxHz))
			dB = dB + r
		}
		outputText = outputText + f + ": " + dB + "\n"
		values.push([f, dB])
	}
	outputText = outputText + target["appendix"] 
	document.getElementById('output').value = outputText
	drawChart(values)
	document.getElementById('filename').value = "EQ-TargetCurve-PEQed-" + new Date().toISOString() +  ".targetcurve"
	document.getElementById('downloadbutton').disabled=false;
}

function setDefault(target, source) {
	document.getElementById(target).value = document.getElementById(source).value
}

function peakFilter(f, q, g) {
	var V = Math.pow(10, Math.abs(g) / 20)
	var K = Math.tan(Math.PI * f / peqMaxHz)
	var V1 = K / q
	var Vq = K * V/q
	var K2 = Math.pow(K, 2)
	var K21 =  K2 - 1
	var a0 = 1 + V1 + K2
	peq = {
		"a0": 1.0,
		"a1": -2 * K21 / a0,
		"a2": -(1 - V1 + K2) / a0,
		"b0": (1 + Vq + K2) / a0,
		"b1": 2 * K21 / a0,
		"b2": (1 - Vq + K2) / a0
	}
	return peq
}

function biquadToText(peq, n) {
	var orderedKeys
	if ("a0" in peq) {
		orderedKeys = ["b0", "b1", "b2", "a0", "a1", "a2"]
	} else {
		orderedKeys = ["b0", "b1", "b2", "a1", "a2"]
	}
	output = "biquad" + n + ",\n"
	for (key of orderedKeys) {
		output = output + key + "=" + peq[key]+ ",\n"
	}
	return output
	
}