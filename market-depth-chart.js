class MarketDepthChart {
	
	canvas = null;
	
	innerMarkup = 
`<div>
	<style>
		.plot-place {
			display: inline-block;
		}
		#plot {
			border: 1px solid gray;
		}
		#mid-price {
			text-align: center;
		}
	</style>
	<div class="plot-place">
		<canvas id="plot"></canvas>
		<div id="mid-price">Loading...</div>
	</div>
</div>
`;
	
	constructor({ element, data }) {
		element.innerHTML = this.innerMarkup;
		this.canvas = element.querySelector('canvas');
	}
	
	// todo
	
}


const url = 'wss://stream.binance.com:9443/ws/btcusdt@depth20';

const socket = new WebSocket(url);

socket.onopen = function(e) {
	console.log('opened');
};

socket.onmessage = function(event) {
	console.log('received', event.data);
	draw(JSON.parse(event.data));
};

socket.onclose = function(event) {
	console.log(`Closed, clean ${event.wasClean} code ${event.code} reason ${event.reason}`);
};

socket.onerror = function(error) {
	console.error(`Error ${error.message}`);
};





const prepareSeries = (seriesRaw) => {
	//console.log(seriesRaw);
	const series = seriesRaw.map((item) => {
		return {
			price: +item[0],
			volume: +item[1],
		}
	});
	
	let volumeCombined = 0;
	
	series.forEach(item => {
		volumeCombined += item.volume;
		item.volumeCombined = volumeCombined;
	});
	return series;
};

const draw = (data) => {
	
	const bids = prepareSeries(data.bids);
	const asks = prepareSeries(data.asks);
	
	const midPrice = (bids[0].price + asks[0].price) / 2;
	document.getElementById('mid-price').innerHTML = midPrice.toFixed(2);
	
	const priceAmp = Math.max(
		Math.abs(midPrice - bids[bids.length-1].price),
		Math.abs(midPrice - asks[asks.length-1].price),
	);
	
	const volumeAmp = Math.max(
		bids[bids.length-1].volumeCombined,
		asks[asks.length-1].volumeCombined,
	);
	
	console.log('priceAmp', priceAmp);
	console.log('volumeAmp', volumeAmp);
	
	
	const mapSide = data => data.map(item => [
		(item.price - midPrice) / priceAmp,
		item.volumeCombined / volumeAmp,
	]);
	
	
	const canvas = {
		
		width: 400,
		height: 200,
		element: document.getElementById('plot'),
		ctx: document.getElementById('plot').getContext('2d'),
		
		drawLine: (coord1, coord2) => {
			
			const coords1projected = canvas.projectCoord(coord1);
			const coords2projected = canvas.projectCoord(coord2);
			//console.log(coords1projected, coords2projected);
			
			canvas.ctx.beginPath();
			canvas.ctx.moveTo(coords1projected[0], coords1projected[1]);
			canvas.ctx.lineTo(coords2projected[0], coords2projected[1]);
			canvas.ctx.stroke();
		},
		
		projectCoord: (coord) => {
			return [
				canvas.width / 2 + coord[0] * canvas.width / 2,
				canvas.height - coord[1] * canvas.height,
			];
		},
		
		drawSide: (coords, type) => {
			
			console.log('coords', type, coords);
			
			const firstPoint = coords[0];
			const lastPoint = coords[coords.length - 1];
			
			const startCoord = [firstPoint[0], 0];
			const finishCoord = [lastPoint[0], 0];
			
			console.log('startCoord', startCoord)
			console.log('finishCoord', finishCoord)
			
			const startPlace = canvas.projectCoord(startCoord);
			const finishPlace = canvas.projectCoord(finishCoord);
			
			canvas.ctx.beginPath();
			canvas.ctx.moveTo(startPlace[0], startPlace[1]);
			
			let prevPointPlace;
			
			coords.forEach(coord => {
				const pointPlace = canvas.projectCoord(coord);
				if (prevPointPlace) {
					canvas.ctx.lineTo(pointPlace[0], prevPointPlace[1]);
				}
				canvas.ctx.lineTo(pointPlace[0], pointPlace[1]);
				prevPointPlace = pointPlace;
			});
			
			canvas.ctx.lineTo(finishPlace[0], finishPlace[1]);
			
			let lineColor, fillColor;
			
			if (type == 'bids') {
				lineColor = '#aaffaaff';
				fillColor = '#aaffaa88';
			}
			
			if (type == 'asks') {
				lineColor = '#ffaaaaff';
				fillColor = '#ffaaaa88';
			}
			
			canvas.ctx.closePath();
			canvas.ctx.strokeStyle = lineColor;
			canvas.ctx.stroke();
			canvas.ctx.fillStyle = fillColor;
			canvas.ctx.fill();
		},
		
		draw: () => {
			canvas.drawLine([0, 0], [0, 1]);
		},
		
		init: () => {
			canvas.element.width = canvas.width;
			canvas.element.height = canvas.height;
		},
		
	}
	
	canvas.init();
	canvas.draw();
	
	canvas.drawSide(mapSide(bids), 'bids');
	canvas.drawSide(mapSide(asks), 'asks');
	
};
