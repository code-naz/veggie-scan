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

	// TODO [Basic] Implementasikan metode untuk menghasilkan fun fact
	async generateFunFact(vegetable, tone = 'normal') {
		if (!this.isModelLoaded || !this.generator) {
			throw new Error('Model belum dimuat');
		}

		if (this.isGenerating) {
			throw new Error('Proses generasi sedang berjalan');
		}

		this.isGenerating = true;
		const fallbackFact = this.getSourceFact(vegetable);

		try {
			const cleanVegetable = String(vegetable || '').trim();
			const sourceFact = fallbackFact;

			const prompt = `Rewrite this verified vegetable fact in English with a ${tone} tone. Keep the meaning accurate and under 35 words. Vegetable: ${cleanVegetable}. Fact: ${sourceFact}`;

			const output = await this.generator(prompt, this.config.generationConfig);
			const generatedText = output[0]?.generated_text || '';

			return this.cleanGeneratedText(generatedText, cleanVegetable, fallbackFact);
		} catch (error) {
			logError('Gagal melakukan generasi teks', error);
			return fallbackFact;
		} finally {
			this.isGenerating = false;
		}
	}

	getSourceFact(vegetable) {
		const sourceFacts = {
			Beetroot: 'Beetroots contain betalains, which give them their deep red color and are powerful antioxidants.',
			Paprika: 'Red paprikas or bell peppers are actually fully ripened green peppers and are much sweeter.',
			Cabbage: 'Cabbage can change its color to bright red when cooked with acidic ingredients like vinegar.',
			Carrot: 'Carrots were originally purple or yellow before orange varieties became popular in the 17th century.',
			Cauliflower: 'The head of a cauliflower is made of tightly packed undeveloped flower buds.',
			Chilli: 'Chili peppers get their spicy heat from capsaicin, which protects them from being eaten by mammals.',
			Corn: 'An average ear of corn always has an even number of rows, usually around 16 rows.',
			Cucumber: 'Cucumbers are composed of about 95 percent water, making them incredibly hydrating.',
			eggplant: 'Eggplants are technically berries and belong to the same nightshade family as tomatoes.',
			Garlic: 'Garlic releases its strong pungent aroma only when its cells are crushed or chopped.',
			Ginger: 'Ginger is not a root but a rhizome, an underground stem that stores nutrients for the plant.',
			Lettuce: 'Lettuce was one of the first vegetables to be successfully grown in space by astronauts.',
			Onion: 'Onions release a gas called syn-propanethial-S-oxide when cut, which stimulates tear glands.',
			Peas: 'Peas are ancient vegetables that have been cultivated by humans for thousands of years.',
			Potato: 'Potatoes were the first vegetable to be grown in space aboard the Space Shuttle Columbia.',
			Turnip: 'Turnips are ancient root vegetables, and both the root and the green leaves are edible.',
			Soybean: 'Soybeans are an excellent plant-based source of complete protein containing all essential amino acids.',
			Spinach: 'Spinach is packed with iron and vitamins, though its leaves shrink significantly when cooked.'
		};

		return sourceFacts[vegetable] || `${vegetable} has a unique flavor and nutritional profile, making it a versatile ingredient in many dishes.`;
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
		if (text.length < 20 || text.length > 260) {
			return false;
		}

		const words = text.toLowerCase().split(/\s+/).filter(Boolean);
		const uniqueWords = new Set(words);
		const repeatedWords = words.length - uniqueWords.size;
		const vegetableWords = vegetable.toLowerCase().split(/\s+/);
		const mentionsVegetable = vegetableWords.some(word => text.toLowerCase().includes(word));

		return uniqueWords.size >= 8 && repeatedWords <= words.length * 0.4 && mentionsVegetable;
	}
}

export default FunFactService;