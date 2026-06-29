import UIHandler from '../ui/ui.handler.js';
import { APP_CONFIG } from './config.js';
import { createDelay, isValidDetection, logError } from './utils.js';
import CameraService from '../services/camera.service.js';
import DetectionService from '../services/detection.service.js';
import FunFactService from '../services/facts.service.js';

class RootFactsApp {
	constructor() {
		this.detector = new DetectionService();
		this.camera = new CameraService();
		this.funFactGenerator = new FunFactService();
		this.ui = new UIHandler();
		this.isRunning = false;
		this.currentLoopId = null;
		this.config = APP_CONFIG;
		this.currentFunFact = '';
		this.lastDetectedName = '';
		this.lastGeneratedAt = 0;
		this.lastFrameAt = 0;
		this.pendingDetection = null;
		this.stableDetectionCount = 0;
		this.detectionHistory = [];

		// TODO [Advanced] Tambahkan properti untuk tone yang dipilih
		this.selectedTone = 'normal';

		this.ui.disableButton();

		this.bindEvents();
		this.init();
		// TODO [Basic] Panggil registerServiceWorker()
		this.registerServiceWorker();
	}

	// TODO [Basic] Bind toggle camera event dengan nama onToggleCamera
	// TODO [Basic] Bind camera change event dengan nama onCameraChange
	// TODO [Skilled] Bind FPS change event dengan nama onFPSChange
	// TODO [Skilled] Bind copy fun fact event dengan nama onCopy
	// TODO [Advanced] Bind tone change event dengan nama onToneChange
	bindEvents() {
		this.ui.bindEvents({
			onToggleCamera: () => this.toggleCamera(),
			onCameraChange: () => this.onCameraChange(),
			onFPSChange: fps => this.onFPSChange(fps),
			onCopy: () => this.copyFunFact(),
			onToneChange: tone => this.onToneChange(tone)
		});
	}
	
	// TODO [Skilled] Perbarui status header UI menjadi 'Memuat model...' saat memulai inisialisasi
	// TODO [Basic] Lengkapi inisialisasi kemampuan aplikasi
	// TODO [Skilled] Perbarui status header UI menjadi 'Siap'
	async init() {
		try {
			this.ui.updateHeaderStatus('Memuat model... 0%', true);
			await this.detector.loadModel(progress => {
				this.ui.updateHeaderStatus(`Memuat model... ${progress}%`, true);
			});

			this.ui.updateHeaderStatus('Memuat AI...', true);
			await this.funFactGenerator.loadModel();

			this.ui.updateHeaderStatus('Siap', false);
			this.ui.enableAllInputs();
			this.ui.enableButton();
		} catch (error) {
			logError('Gagal menginisialisasi aplikasi', error);
			// TODO [Skilled] Perbarui status header UI menjadi 'Error' jika inisialisasi gagal
			this.ui.updateHeaderStatus('Error', false);
			this.ui.showError(`Gagal menginisialisasi: ${error.message}`);
			this.ui.disableButton();
		}
	}


	// TODO [Basic] Buatlah berkas sw.js di root project dan konfigurasikan precaching di dalamnya menggunakan Workbox
	// TODO [Basic] Registrasikan Service Worker
	async registerServiceWorker() {
		if ('serviceWorker' in navigator) {
			try {
				await navigator.serviceWorker.register('./sw.js');
			} catch (error) {
				logError('Gagal meregistrasikan Service Worker', error);
			}
		}
	}

	// TODO [Skilled] Buatlah metode untuk menyalin fun fact ke clipboard
	async copyFunFact() {
		try {
			const text = this.ui.getFunFactText();
			if (!text) return;

			await navigator.clipboard.writeText(text);
			this.ui.setCopyButtonCopied();

			setTimeout(() => {
				this.ui.resetCopyButton();
			}, 1500);
		} catch (error) {
			logError('Gagal menyalin fun fact', error);
		}
	}

	async onCameraChange() {
		if (this.camera.isActive()) {
			await this.startCamera();
		}
	}

	onFPSChange(fps) {
		this.config.fps = Number(fps) || this.config.fps;
		this.camera.setFPS(this.config.fps);
	}

	onToneChange(tone) {
		this.selectedTone = tone;
	}

	// TODO [Basic] Implementasikan metode untuk mengaktifkan atau menonaktifkan kamera
	toggleCamera() {
		if (this.isRunning) {
			this.stopCamera();
		} else {
			this.startCamera();
		}
	}

	// TODO [Basic] Implementasikan metode untuk memulai kamera
	async startCamera() {
		try {
			this.ui.disableButton();
			this.ui.switchToState('loading');
			await this.camera.startCamera();
			this.isRunning = true;
			this.lastDetectedName = '';
			this.lastGeneratedAt = 0;
			this.pendingDetection = null;
			this.stableDetectionCount = 0;
			this.detectionHistory = [];
			this.ui.updateCameraUI(true);
			this.ui.enableButton();
			this.startDetection();
		} catch (error) {
			logError('Gagal memulai kamera', error);
			this.ui.showError(error.message);
			this.ui.enableButton();
		}
	}

	// TODO [Basic] Implementasikan metode untuk menghentikan kamera
	stopCamera() {
		this.stopDetection();
		this.camera.stopCamera();
		this.isRunning = false;
		this.ui.updateCameraUI(false);
		this.ui.switchToState('idle');
		this.ui.enableButton();
	}

	// TODO [Basic] Implementasikan metode untuk memulai deteksi
	startDetection() {
		this.stopDetection();
		this.currentLoopId = Date.now();
		this.lastFrameAt = 0;
		this.detectLoop(this.currentLoopId);
	}

	// TODO [Basic] Implementasikan metode untuk menghentikan deteksi
	stopDetection() {
		this.currentLoopId = null;
	}

	// TODO [Basic] Implementasikan metode deteksi utama
	async detectLoop(loopId) {
		if (!this.isRunning || loopId !== this.currentLoopId) {
			return;
		}

		const now = performance.now();
		const frameInterval = 1000 / this.config.fps;

		if (now - this.lastFrameAt < frameInterval) {
			requestAnimationFrame(() => this.detectLoop(loopId));
			return;
		}

		this.lastFrameAt = now;

		try {
			if (this.camera.isReady() && this.detector.isLoaded()) {
				const detectionResult = await this.detector.predict(this.camera.video);

				if (isValidDetection(detectionResult)) {
					const stableDetection = this.getStableDetection(detectionResult);

					if (stableDetection) {
						await this.generateAndShowResults(stableDetection);
					}
				} else {
					this.pendingDetection = null;
					this.stableDetectionCount = 0;
					this.detectionHistory = [];
				}
			}
		} catch (error) {
			logError('Gagal menjalankan deteksi', error);
		}

		await createDelay(this.config.detectionRetryInterval);
		requestAnimationFrame(() => this.detectLoop(loopId));
	}

	getStableDetection(detectionResult) {
		this.detectionHistory.push(detectionResult);

		if (this.detectionHistory.length > this.config.stableDetectionFrames) {
			this.detectionHistory.shift();
		}

		if (this.pendingDetection?.className === detectionResult.className) {
			this.stableDetectionCount += 1;

			if (detectionResult.confidence > this.pendingDetection.confidence) {
				this.pendingDetection = detectionResult;
			}
		} else {
			this.pendingDetection = detectionResult;
			this.stableDetectionCount = 1;
		}

		if (this.stableDetectionCount >= this.config.stableDetectionFrames) {
			const averageDetection = this.getAverageDetection();

			if (averageDetection) {
				return averageDetection;
			}
		}

		return null;
	}

	getAverageDetection() {
		if (this.detectionHistory.length < this.config.stableDetectionFrames) {
			return null;
		}

		const scoreTotals = new Map();

		this.detectionHistory.forEach(result => {
			result.topPredictions.forEach(prediction => {
				const currentScore = scoreTotals.get(prediction.className) || 0;
				scoreTotals.set(prediction.className, currentScore + prediction.confidence);
			});
		});

		const averagedPredictions = Array.from(scoreTotals.entries())
			.map(([className, total]) => ({
				className,
				confidence: Math.round(total / this.detectionHistory.length)
			}))
			.sort((a, b) => b.confidence - a.confidence);
		const bestPrediction = averagedPredictions[0];
		const secondPrediction = averagedPredictions[1];
		const margin = bestPrediction.confidence - (secondPrediction?.confidence || 0);

		if (
			bestPrediction.className !== this.pendingDetection.className ||
			bestPrediction.confidence < this.config.detectionConfidenceThreshold ||
			margin < this.config.predictionMarginThreshold
		) {
			return null;
		}

		return {
			...this.pendingDetection,
			className: bestPrediction.className,
			confidence: bestPrediction.confidence,
			topPredictions: averagedPredictions
		};
	}

	// TODO [Basic] Implementasikan metode untuk menghasilkan dan menampilkan fun fact
	async generateAndShowResults(detectionResult) {
		try {
			const detectedName = detectionResult.className;
			const now = Date.now();
			const isSameDetection = detectedName === this.lastDetectedName;

			if (isSameDetection) {
				this.ui.showResults(detectionResult, {
					funFact: this.currentFunFact
				});
				return;
			}

			if (now - this.lastGeneratedAt < this.config.funFactGenerationDelay) {
				return;
			}

			this.lastDetectedName = detectedName;
			this.lastGeneratedAt = now;
			this.ui.showResults(detectionResult);

			const funFact = await this.funFactGenerator.generateFunFact(detectedName, this.selectedTone);
			this.currentFunFact = funFact;

			this.ui.updateFunFactState('success', {
				funFact
			});
		} catch (error) {
			logError('Gagal menampilkan hasil', error);
			this.ui.updateFunFactState('error');
		}
	}
}

document.addEventListener('DOMContentLoaded', () => {
	new RootFactsApp();

	if (typeof lucide !== 'undefined') {
		lucide.createIcons();
	}
});

export default RootFactsApp;
