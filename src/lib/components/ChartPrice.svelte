<script lang="ts">
	import { page } from '$app/stores';
	import Chart from 'chart.js/auto';
	import type { ChartType } from 'chart.js';
	import 'chartjs-adapter-date-fns';
	import { priceHistoryStore, lastUpdateTimeStore, waitForInitialData } from '$lib/coinData';
	import { format } from 'date-fns';
	import CoinInfo from './CoinInfo.svelte';

	type Props = {
		symbol: string;
	};

	let { symbol = 'USDT_KRW' }: Props = $props();

	let chartElement = $state<HTMLCanvasElement>();
	let chart = $state<Chart | null>(null);
	let tooltipEl = $state<HTMLDivElement>();

	let priceData = $derived($priceHistoryStore[symbol] || {});
	let lastUpdateTime = $derived($lastUpdateTimeStore);

	const verticalHoverPlugin = {
		id: 'verticalHover',
		beforeDraw: (chart: Chart<ChartType, unknown[], unknown>) => {
			const activeElements = chart.getActiveElements();
			if (activeElements && activeElements.length) {
				const activePoint = activeElements[0];
				const ctx = chart.ctx;
				const x = activePoint.element.x;
				const topY = chart.scales['y'].top;
				const bottomY = chart.scales['y'].bottom;

				ctx.save();
				ctx.beginPath();
				ctx.moveTo(x, topY);
				ctx.lineTo(x, bottomY);
				ctx.lineWidth = 20;
				ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
				ctx.stroke();
				ctx.restore();
			}
		}
	};

	const externalTooltipHandler = (context: any) => {
		if (!tooltipEl) return;
		const { chart, tooltip } = context;
		const tooltipModel = tooltip;

		if (tooltipModel.opacity === 0) {
			tooltipEl.style.opacity = '0';
			return;
		}

		if (tooltipModel.body) {
			const bodyLines = tooltipModel.body.map((b: any) => b.lines);
			let innerHtml = '<div class="tooltip-body">';
			bodyLines.forEach((body: any) => {
				innerHtml += `<div>${body}</div>`;
			});
			const time = format(new Date(tooltipModel.dataPoints[0].parsed.x), 'HH:mm:ss');
			innerHtml += `<div class="tooltip-time">${time}</div>`;
			innerHtml += '</div>';

			tooltipEl.innerHTML = innerHtml;
		}

		const position = chart.canvas.getBoundingClientRect();

		tooltipEl.style.opacity = '1';
		tooltipEl.style.position = 'absolute';
		tooltipEl.style.left = position.left + window.pageXOffset + tooltipModel.caretX + 'px';
		tooltipEl.style.top = position.top + window.pageYOffset + tooltipModel.caretY - 75 + 'px';
		tooltipEl.style.pointerEvents = 'none';
		tooltipEl.style.zIndex = '1000';
	};

	const latestPricePlugin = {
		id: 'latestPrice',
		afterDraw: (chart: Chart<ChartType, unknown[], unknown>) => {
			const ctx = chart.ctx;
			const yAxis = chart.scales['y'];
			const xAxis = chart.scales['x'];
			const dataset = chart.data.datasets[0];
			const lastPoint = dataset.data[dataset.data.length - 1] as { x: number; y: number };

			if (lastPoint) {
				const x = xAxis.getPixelForValue(lastPoint.x);
				const y = yAxis.getPixelForValue(lastPoint.y);

				ctx.save();
				ctx.fillStyle = 'gold';
				ctx.font = 'bold 18px Arial';
				ctx.textAlign = 'center';
				ctx.textBaseline = 'bottom';
				ctx.fillText(lastPoint.y.toLocaleString(), x, y - 10);
				ctx.restore();
			}
		}
	};

	const updateChart = () => {
		if (!$priceHistoryStore || !$priceHistoryStore[symbol]) {
			return;
		}

		const chartData = Object.values($priceHistoryStore[symbol]).sort((a, b) => a.t - b.t);
		const series = [
			{
				data: chartData.map((item) => ({
					x: item.t,
					y: item.c
				}))
			}
		];

		if (chart) {
			chart.data.datasets[0].data = series[0].data;
			chart.update();
		} else if (chartElement) {
			chart = new Chart(chartElement, {
				type: 'line',
				data: {
					datasets: [
						{
							data: series[0].data,
							backgroundColor: 'rgba(75, 192, 192, 0.6)',
							borderColor: 'rgb(75, 192, 192)',
							borderWidth: 2,
							pointRadius: 3,
							pointHoverRadius: 8,
							pointBackgroundColor: 'rgb(75, 192, 192)',
							pointHoverBackgroundColor: 'yellow',
							pointBorderColor: 'rgb(75, 192, 192)',
							pointHoverBorderColor: 'white',
							pointBorderWidth: 2,
							pointHoverBorderWidth: 3,
							tension: 0.1
						}
					]
				},
				options: {
					responsive: true,
					maintainAspectRatio: false,
					layout: {
						padding: {
							top: 40,
							right: 30
						}
					},
					scales: {
						x: {
							type: 'time',
							time: {
								unit: 'minute',
								displayFormats: {
									minute: 'HH:mm'
								}
							},
							ticks: {
								color: 'white',
								maxRotation: 0,
								maxTicksLimit: 10,
								autoSkip: true
							},
							grid: {
								color: 'rgba(255, 255, 255, 0.1)'
							}
						},
						y: {
							ticks: {
								color: 'white',
								callback: (value) => {
									if (typeof value === 'number') {
										return value.toFixed(1);
									}
									return value;
								}
							},
							grid: {
								color: 'rgba(255, 255, 255, 0.1)'
							}
						}
					},
					plugins: {
						tooltip: {
							enabled: false,
							external: externalTooltipHandler,
							mode: 'index',
							intersect: false,
							callbacks: {
								title: () => `${symbol}`,
								label: (context) => {
									if (context.parsed.y !== null) {
										return new Intl.NumberFormat('en-US', {
											style: 'currency',
											currency: 'KRW',
											minimumFractionDigits: 1,
											maximumFractionDigits: 1
										}).format(context.parsed.y);
									}
									return '';
								}
							}
						},
						legend: {
							display: false
						}
					},
					interaction: {
						mode: 'index',
						intersect: false
					},
					animation: {
						duration: 0
					}
				}
			});
		}
	};

	Chart.register(verticalHoverPlugin);
	Chart.register(latestPricePlugin);

	$effect.root(() => {
		const init = async () => {
			await waitForInitialData();

			tooltipEl = document.createElement('div');
			tooltipEl.id = 'chartjs-tooltip';
			tooltipEl.style.background = 'rgba(0, 0, 0, 0.7)';
			tooltipEl.style.borderRadius = '3px';
			tooltipEl.style.color = 'white';
			tooltipEl.style.opacity = '0';
			tooltipEl.style.pointerEvents = 'none';
			tooltipEl.style.position = 'absolute';
			tooltipEl.style.transform = 'translate(-50%, 0)';
			tooltipEl.style.transition = 'all .1s ease';
			document.body.appendChild(tooltipEl);

			updateChart();
		};

		init();

		return () => {
			if (chart) chart.destroy();
			if (tooltipEl?.parentNode) {
				tooltipEl.parentNode.removeChild(tooltipEl);
			}
		};
	});

	$effect(() => {
		if (Object.keys(priceData).length > 0 && chartElement) {
			updateChart();
		}
	});

	$effect(() => {
		if (lastUpdateTime > 0) {
			updateChart();
		}
	});

	let isViewChart = $derived(
		$page.url.pathname.startsWith('/market') && !$page.url.searchParams.get('lid')
	);
</script>

<div class="chart-container {isViewChart ? '' : 'hide'}">
	<div class="coin_info-container">
		<CoinInfo />
	</div>
	<canvas bind:this={chartElement}> </canvas>
</div>

<style>
	.hide {
		display: none;
	}
	.chart-container {
		position: relative;
		width: 100%;
		height: 200px;
	}
	canvas {
		width: 100%;
		height: 100%;
		background-color: rgba(0, 0, 0, 0.3);
		border-radius: 10px;
	}
	.coin_info-container {
		position: absolute;
		top: 5px;
		left: 5px;
		z-index: 10;
	}
	:global(#chartjs-tooltip) {
		z-index: 1000;
		background: rgba(0, 0, 0, 0.7) !important;
		padding: 10px !important;
		text-align: center !important;
	}
	:global(.tooltip-title) {
		font-size: 14px;
		font-weight: bold;
		margin-bottom: 5px;
	}
	:global(.tooltip-body) {
		font-size: 14px;
	}
	:global(.tooltip-time) {
		font-size: 12px;
		margin-top: 4px;
		color: #ccc;
	}
</style>
