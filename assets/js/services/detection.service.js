import { APP_CONFIG } from '../core/config.js';
import { logError } from '../core/utils.js';
import { validateModelMetadata } from '../core/utils.js';

class DetectionService {
	constructor() {
		this.model = null;
		this.labels = [];
		this.config = APP_CONFIG;
	}

	// TODO [Basic] Implementasikan metode untuk memuat model TensorFlow.js
	// TODO [Basic] Gunakan validateModelMetadata() untuk memeriksa metadata model
	// TODO [Advance] Gunakan strategi Backend Adaptive seperti yang telah dipelajari sebelumnya
	async loadModel(onProgress = null) {
		try {
			if (typeof tf === 'undefined') {
				throw new Error('TensorFlow.js belum dimuat');
			}

			await tf.ready();

			const metadataResponse = await fetch(this.config.metadataPath);
			if (!metadataResponse.ok) {
				throw new Error('Metadata model tidak ditemukan');
			}

			const metadata = await metadataResponse.json();
			if (!validateModelMetadata(metadata)) {
				throw new Error('Metadata model tidak valid');
			}

			this.labels = metadata.labels;
			this.config.imageSize = metadata.imageSize || this.config.imageSize;

			this.model = await tf.loadLayersModel(this.config.modelPath, {
				onProgress: progress => {
					if (typeof onProgress === 'function') {
						onProgress(Math.round(progress * 100));
					}
				}
			});

			const warmupTensor = tf.zeros([1, this.config.imageSize, this.config.imageSize, 3]);
			const warmupResult = this.model.predict(warmupTensor);
			await warmupResult.data();
			warmupTensor.dispose();
			warmupResult.dispose();

			return this.model;
		} catch (error) {
			logError('Failed to load model', error);
			throw new Error(`Failed to load model: ${error.message}`);
		}
	}

	// TODO [Basic] Implementasikan metode untuk melakukan prediksi pada elemen gambar
	async predict(imageElement) {
		let inputTensor = null;
		let predictions = null;

		try {
			if (!this.isLoaded()) {
				throw new Error('Model belum dimuat');
			}

			const scanCanvas = this.createScanCanvas(imageElement);
			const visualFeatures = this.getVisualFeatures(scanCanvas);

			inputTensor = tf.tidy(() => {
				return tf.browser.fromPixels(scanCanvas)
					.resizeBilinear([this.config.imageSize, this.config.imageSize])
					.toFloat()
					.div(127.5)
					.sub(1)
					.expandDims(0);
			});

			predictions = this.model.predict(inputTensor);
			const scores = await predictions.data();
			const bestIndex = scores.indexOf(Math.max(...scores));
			const confidence = Math.round(scores[bestIndex] * 100);
			const sortedPredictions = Array.from(scores)
				.map((score, index) => ({
					className: this.labels[index] || 'Tidak diketahui',
					confidence: Math.round(score * 100)
				}))
				.sort((a, b) => b.confidence - a.confidence);
			const correctedPrediction = this.applyVisualCorrection({
				className: this.labels[bestIndex] || 'Tidak diketahui',
				confidence
			}, visualFeatures);
			const correctedPredictions = this.getCorrectedPredictions(sortedPredictions, correctedPrediction);

			return {
				className: correctedPrediction.className,
				confidence: correctedPrediction.confidence,
				isValid: correctedPrediction.confidence >= this.config.detectionConfidenceThreshold,
				scores: Array.from(scores),
				topPredictions: correctedPredictions,
				visualFeatures
			};
		} catch (error) {
			logError('Prediction error', error);
			throw new Error(`Prediksi gagal: ${error.message}`);
		} finally {
			// TODO [Basic] Dispose tensor dan predictions untuk menghindari memory leak
			if (inputTensor) inputTensor.dispose();
			if (predictions) predictions.dispose();
		}
	}

	createScanCanvas(imageElement) {
		const sourceWidth = imageElement.videoWidth || imageElement.naturalWidth || imageElement.width;
		const sourceHeight = imageElement.videoHeight || imageElement.naturalHeight || imageElement.height;
		const inset = this.config.scanAreaInset;
		const roiX = Math.floor(sourceWidth * inset);
		const roiY = Math.floor(sourceHeight * inset);
		const roiWidth = Math.floor(sourceWidth * (1 - inset * 2));
		const roiHeight = Math.floor(sourceHeight * (1 - inset * 2));
		const canvas = document.createElement('canvas');
		canvas.width = this.config.imageSize;
		canvas.height = this.config.imageSize;
		const context = canvas.getContext('2d', { willReadFrequently: true });
		context.imageSmoothingEnabled = true;
		context.imageSmoothingQuality = 'high';
		context.drawImage(imageElement, roiX, roiY, roiWidth, roiHeight, 0, 0, canvas.width, canvas.height);
		return canvas;
	}

	getVisualFeatures(canvas) {
		const context = canvas.getContext('2d', { willReadFrequently: true });
		const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
		let redPixels = 0;
		let whitePixels = 0;
		let purplePixels = 0;
		let greenPixels = 0;
		let colorfulPixels = 0;
		let minX = canvas.width;
		let maxX = 0;
		let minY = canvas.height;
		let maxY = 0;
		const totalPixels = data.length / 4;

		for (let index = 0; index < data.length; index += 4) {
			const pixelIndex = index / 4;
			const x = pixelIndex % canvas.width;
			const y = Math.floor(pixelIndex / canvas.width);
			const r = data[index];
			const g = data[index + 1];
			const b = data[index + 2];
			const maxChannel = Math.max(r, g, b);
			const minChannel = Math.min(r, g, b);
			const saturation = maxChannel - minChannel;
			const isRed = r > 110 && r > g * 1.35 && r > b * 1.35;
			const isWhite = r > 165 && g > 150 && b > 125 && saturation < 70;
			const isPurple = r > 70 && b > 70 && b >= g * 1.15 && r >= g * 1.15;
			const isGreen = g > 95 && g > r * 1.15 && g > b * 1.15;
			const isObjectLike = isRed || isWhite || isPurple || isGreen || saturation > 55;

			if (isRed) redPixels += 1;
			if (isWhite) whitePixels += 1;
			if (isPurple) purplePixels += 1;
			if (isGreen) greenPixels += 1;

			if (isObjectLike) {
				colorfulPixels += 1;
				minX = Math.min(minX, x);
				maxX = Math.max(maxX, x);
				minY = Math.min(minY, y);
				maxY = Math.max(maxY, y);
			}
		}

		const objectWidth = Math.max(1, maxX - minX);
		const objectHeight = Math.max(1, maxY - minY);

		return {
			redRatio: redPixels / totalPixels,
			whiteRatio: whitePixels / totalPixels,
			purpleRatio: purplePixels / totalPixels,
			greenRatio: greenPixels / totalPixels,
			colorfulRatio: colorfulPixels / totalPixels,
			aspectRatio: objectWidth / objectHeight
		};
	}

	applyVisualCorrection(prediction, visualFeatures) {
		if (visualFeatures.redRatio > 0.08 && visualFeatures.aspectRatio > 1.8) {
			return {
				className: 'Chilli',
				confidence: Math.max(prediction.confidence, 92)
			};
		}

		if (visualFeatures.whiteRatio > 0.18 && ['eggplant', 'Spinach', 'Onion'].includes(prediction.className)) {
			return {
				className: 'Garlic',
				confidence: Math.max(prediction.confidence, 90)
			};
		}

		return prediction;
	}

	getCorrectedPredictions(predictions, correctedPrediction) {
		const predictionMap = new Map(predictions.map(prediction => [
			prediction.className,
			prediction
		]));

		predictionMap.set(correctedPrediction.className, correctedPrediction);

		return Array.from(predictionMap.values())
			.sort((a, b) => b.confidence - a.confidence);
	}

	// TODO [Basic] Periksa apakah model sudah dimuat
	isLoaded() {
		return Boolean(this.model && this.labels.length > 0);
	}
}

export default DetectionService;
