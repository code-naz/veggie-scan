import {
	APP_CONFIG
} from '../core/config.js';
import {
	getCameraErrorMessage,
	logError
} from '../core/utils.js';

class CameraService {
	constructor() {
		this.stream = null;
		this.video = null;
		this.canvas = null;
		this.config = APP_CONFIG;

		this.initializeElements();
		this.init();
	}

	// TODO [Basic] Implementasikan metode untuk menginisialisasi elemen DOM yang diperlukan
	initializeElements() {
		this.video = document.getElementById('videoElement');
		this.canvas = document.getElementById('canvasElement');
		this.cameraSelect = document.getElementById('camera-select');
	}

	async init() {
		await this.loadCameras();
	}

	// TODO [Basic] Implementasikan metode untuk memuat daftar kamera yang tersedia
	async loadCameras() {
		try {
			if (!navigator.mediaDevices?.enumerateDevices) {
				return [];
			}

			const devices = await navigator.mediaDevices.enumerateDevices();
			const cameras = devices.filter(device => device.kind === 'videoinput');

			if (this.cameraSelect && cameras.length > 0) {
				this.cameraSelect.innerHTML = '';

				cameras.forEach((camera, index) => {
					const option = document.createElement('option');
					option.value = camera.deviceId;
					option.textContent = camera.label || `Kamera ${index + 1}`;
					this.cameraSelect.appendChild(option);
				});
			}

			return cameras;
		} catch (error) {
			logError('Gagal memuat kamera', error);
			throw new Error(`Akses kamera gagal: ${error.message}`);
		}
	}

	// TODO [Basic] Implementasikan metode untuk memulai kamera dengan constraints yang sesuai
	async startCamera() {
		try {
			if (!navigator.mediaDevices?.getUserMedia) {
				throw new Error('Peramban tidak mendukung akses kamera');
			}

			this.stopCamera();

			const selectedCamera = this.cameraSelect?.value;
			const videoConstraints = selectedCamera === 'front'
				? { facingMode: 'user' }
				: selectedCamera && selectedCamera !== 'default'
					? { deviceId: { exact: selectedCamera } }
					: { facingMode: 'environment' };

			this.stream = await navigator.mediaDevices.getUserMedia({
				video: {
					...videoConstraints,
					width: { ideal: 640 },
					height: { ideal: 480 }
				},
				audio: false
			});

			if (this.video) {
				this.video.srcObject = this.stream;
				await this.video.play();
			}

			await this.loadCameras();
			return this.stream;
		} catch (error) {
			logError('Gagal memulai kamera', error);
			const errorMessage = getCameraErrorMessage(error);
			throw new Error(errorMessage);
		}
	}

	// TODO [Basic] Implementasikan metode untuk menghentikan kamera
	stopCamera() {
		if (this.stream) {
			this.stream.getTracks().forEach(track => track.stop());
			this.stream = null;
		}

		if (this.video) {
			this.video.pause();
			this.video.srcObject = null;
		}
	}

	// TODO [Skilled] Implementasikan metode untuk mengatur FPS kamera
	setFPS(fps) {
		this.config.fps = Number(fps) || this.config.fps;
	}

	// TODO [Basic] Periksa apakah kamera sedang aktif
	isActive() {
		return Boolean(this.stream && this.stream.active);
	}

	// TODO [Basic] Periksa apakah kamera siap untuk digunakan
	isReady() {
		return Boolean(
			this.video &&
			this.video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
			this.video.videoWidth > 0 &&
			this.video.videoHeight > 0
		);
	}
}

export default CameraService;
