export const APP_CONFIG = {
  detectionConfidenceThreshold: 85,
  analyzingDelay: 2000,
  funFactGenerationDelay: 6000,
  detectionRetryInterval: 100,
  fps: 30,
  modelPath: './model/model.json',
  metadataPath: './model/metadata.json',
  imageSize: 224,
  funFactModel: 'Xenova/LaMini-Flan-T5-77M',
  maxInputLength: 40,
  stableDetectionFrames: 8,
  scanAreaInset: 0.18,
  predictionMarginThreshold: 12,
  generationConfig: {
    temperature: 0.7,
    max_new_tokens: 120,
    top_p: 0.9,
    do_sample: true
  }
};

export const UI_CONFIG = {
  fadeAnimation: 'fadeIn 0.5s ease-out forwards',
  confidenceThresholds: {
    excellent: 90,
    good: 80
  }
};
