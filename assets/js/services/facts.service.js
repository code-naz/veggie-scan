import { APP_CONFIG } from '../core/config.js';
import { logError } from '../core/utils.js';

class FunFactService {
	constructor() {
		this.generator = null;
		this.isModelLoaded = false;
		this.isGenerating = false;
		this.config = APP_CONFIG;
		this.currentBackend = null;
	}

	// TODO [Basic] Implementasikan metode untuk memuat model Transformers.js
	// TODO [Advance] Gunakan strategi Backend Adaptive seperti yang telah dipelajari sebelumnya
	async loadModel() {
		try {
			const { pipeline, env } = await import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.7.2');
			env.allowLocalModels = false;
			env.useBrowserCache = true;

			this.generator = await pipeline('text2text-generation', this.config.funFactModel, {
				dtype: 'q4',
				progress_callback: progress => {
					if (progress.status === 'ready') {
						this.currentBackend = progress.device || 'wasm';
					}
				}
			});

			this.isModelLoaded = true;
			return this.generator;
		} catch (error) {
			logError('Error loading Transformers.js model', error);
			throw new Error(`Failed to load FunFact model: ${error.message}`);
		}
	}

	// TODO [Basic] Implementasikan metode untuk menghasilkan fun fact tentang sayuran
	// TODO [Basic] Tambahkan validasi untuk maksimum panjang input dan pembersihan input terhadap karakter khusus untuk mengatasi prompt injection
	// TODO [Advanced] Gunakan parameter `tone` untuk variasi personalitas
	async generateFunFact(vegetable, tone = 'normal') {
		if (!this.isModelLoaded || this.isGenerating) {
			throw new Error('Model belum siap atau sedang menghasilkan fakta');
		}

		if (!vegetable || typeof vegetable !== 'string') {
			throw new Error('Nama sayuran yang valid diperlukan');
		}

		try {
			this.isGenerating = true;

			const cleanVegetable = vegetable
				.slice(0, this.config.maxInputLength)
				.replace(/[^a-zA-Z\s-]/g, '')
				.trim();

			if (!cleanVegetable) {
				throw new Error('Nama sayuran tidak valid');
			}

			const prompt = `Describe vegetable ${cleanVegetable}:`;

			const result = await this.generator(prompt, this.config.generationConfig);
			const generatedText = Array.isArray(result)
				? result[0]?.generated_text
				: result?.generated_text;

			const fallbackFact = this.getSourceFact(cleanVegetable);
			return this.cleanGeneratedText(generatedText, cleanVegetable, fallbackFact);
		} catch (error) {
			logError('Error generating fun fact', error);
			throw new Error(`Failed to generate fun fact: ${error.message}`);
		} finally {
			this.isGenerating = false;
		}
	}

	getSourceFact(vegetable) {
		const sourceFacts = {
			Beetroot: 'Beetroots contain betalains, which give them their deep red color.',
			Paprika: 'Red bell peppers are usually sweeter than green ones because they ripen longer.',
			Cabbage: 'Cabbage can change color when cooked depending on the acidity of the water.',
			Carrot: 'Orange carrots are rich in beta-carotene, which converts to vitamin A.',
			Cauliflower: 'Cauliflower heads are made of undeveloped flower buds growing tightly.',
			Chilli: 'The heat in chili peppers comes from a fiery chemical called capsaicin.',
			Corn: 'Each strand of corn silk connects to exactly one kernel of corn.',
			Cucumber: 'Cucumbers are composed of about 95 percent water, keeping you hydrated.',
			eggplant: 'Eggplants are technically berries and cousins of tomatoes and potatoes.',
			Garlic: 'Garlic only releases its signature strong aroma when crushed or chopped.',
			Ginger: 'The ginger we eat is actually an underground stem called a rhizome.',
			Lettuce: 'Romaine lettuce has sturdy leaves that keep salads extra crunchy.',
			Onion: 'Cutting onions releases a gas that stimulates your eyes tear glands.',
			Peas: 'Young green peas taste sweet because their sugar hasn\'t turned to starch.',
			Potato: 'Potatoes were the first vegetable ever successfully grown in space.',
			Turnip: 'Turnips are ancient root vegetables where both roots and leaves are edible.',
			Soybean: 'Soybeans are loaded with excellent plant-based protein compounds.',
			Spinach: 'Spinach leaves contain high water, making them shrink fast when cooked.'
		};

		return sourceFacts[vegetable] || `${vegetable} has a unique flavor and profile.`;
	}

	cleanGeneratedText(text, vegetable, fallbackFact) {
		const cleanText = String(text || '')
			.replace(/\s+/g, ' ')
			.replace(/^["'`]+|["'`]+$/g, '')
			.trim();
		
		if (!this.isGoodGeneratedText(cleanText, vegetable)) {
			return fallbackFact;
		}

		return cleanText;
	}

	isGoodGeneratedText(text, vegetable) {
		if (!text || text.length < 5) {
			return false;
		}
		return true;
	}

	// TODO [Basic] Periksa apakah model siap dan tidak sedang menghasilkan fakta
	isReady() {
		return Boolean(this.isModelLoaded && this.generator && !this.isGenerating);
	}
}

export default FunFactService;