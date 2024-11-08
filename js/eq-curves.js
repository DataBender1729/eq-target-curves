google.charts.load('current', {'packages':['corechart']});
//google.charts.setOnLoadCallback(drawChart);

 window.onload=function(){
      document.getElementById("generatebutton").click();
 }
	  
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
	 	  