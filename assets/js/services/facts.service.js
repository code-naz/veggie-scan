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

			const toneInstruction = {
				normal: 'friendly and clear',
				funny: 'playful and funny',
				professional: 'professional and concise',
				casual: 'casual and warm'
			}[tone] || 'friendly and clear';
			const sourceFact = this.getSourceFact(cleanVegetable);

			const prompt = `Rewrite this verified vegetable fact in Indonesian with a ${toneInstruction} tone. Keep the meaning accurate and under 35 words. Vegetable: ${cleanVegetable}. Fact: ${sourceFact}`;

			const result = await this.generator(prompt, this.config.generationConfig);
			const generatedText = Array.isArray(result)
				? result[0]?.generated_text
				: result?.generated_text;

			return this.cleanGeneratedText(generatedText, cleanVegetable, sourceFact);
		} catch (error) {
			logError('Error generating fun fact', error);
			throw new Error(`Failed to generate fun fact: ${error.message}`);
		} finally {
			this.isGenerating = false;
		}
	}

	getSourceFact(vegetable) {
		const sourceFacts = {
			Beetroot: 'Beetroot mengandung betalain, pigmen alami yang memberi warna merah pekat dan sering dipakai sebagai pewarna makanan alami.',
			Paprika: 'Paprika merah biasanya lebih manis daripada paprika hijau karena matang lebih lama di tanaman.',
			Cabbage: 'Kubis bisa berubah warna saat dimasak tergantung tingkat keasaman air atau bahan yang digunakan.',
			Carrot: 'Wortel oranye populer karena kaya beta-karoten, senyawa yang dapat diubah tubuh menjadi vitamin A.',
			Cauliflower: 'Kembang kol sebenarnya adalah kumpulan bakal bunga yang belum mekar dan tumbuh rapat membentuk kepala putih.',
			Chilli: 'Rasa pedas cabai berasal dari capsaicin, senyawa yang memicu sensor panas di lidah.',
			Corn: 'Setiap helai rambut jagung biasanya terhubung ke satu biji jagung di tongkolnya.',
			Cucumber: 'Mentimun memiliki kandungan air sangat tinggi, sehingga terasa segar dan sering dipakai untuk hidrasi ringan.',
			eggplant: 'Terong termasuk keluarga nightshade, masih satu kerabat dengan tomat dan kentang.',
			Garlic: 'Bawang putih menghasilkan aroma kuat ketika selnya rusak, misalnya saat dicincang atau dihancurkan.',
			Ginger: 'Jahe yang biasa digunakan di dapur adalah rimpang, yaitu batang yang tumbuh di bawah tanah.',
			Lettuce: 'Selada romaine memiliki daun yang lebih kokoh, sehingga sering dipakai untuk salad yang tetap renyah.',
			Onion: 'Saat bawang dipotong, senyawa belerangnya dapat bereaksi dan membuat mata terasa perih.',
			Peas: 'Kacang polong muda terasa manis karena gulanya belum banyak berubah menjadi pati.',
			Potato: 'Kentang berasal dari daerah Andes dan kini menjadi salah satu bahan pangan paling penting di dunia.',
			Turnip: 'Lobak turnip bisa dimakan bagian umbi dan daunnya, sehingga cukup serbaguna di dapur.',
			Soybean: 'Kedelai kaya protein nabati dan menjadi bahan dasar tempe, tahu, susu kedelai, serta kecap.',
			Spinach: 'Bayam dikenal cepat layu saat dipanaskan karena struktur daunnya tipis dan banyak mengandung air.'
		};

		return sourceFacts[vegetable] || `${vegetable} punya karakter rasa dan nutrisi yang unik, sehingga sering menjadi bahan fleksibel dalam banyak masakan.`;
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

		return uniqueWords.size >= 8 && repeatedWords <= Math.floor(words.length * 0.45) && mentionsVegetable;
	}

	// TODO [Basic] Periksa apakah model siap dan tidak sedang menghasilkan fakta
	isReady() {
		return Boolean(this.isModelLoaded && this.generator && !this.isGenerating);
	}
}

export default FunFactService;
