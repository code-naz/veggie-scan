export const APP_CONFIG = {
  detectionConfidenceThreshold: 85,
  analyzingDelay: 2000,
  funFactGenerationDelay: 6000,
  detectionRetryInterval: 100,
  fps: 30,
  modelPath: './model/model.json',
  metadataPath: './model/metadata.json',
  imageSize: 224,
  funFactModel: 'Xenova/flan-t5-small',
  maxInputLength: 40,
  stableDetectionFrames: 8,
  scanAreaInset: 0.18,
  predictionMarginThreshold: 12,
  generationConfig: {
    temperature: 0.2,
    max_new_tokens: 120,
    top_p: 0.8,
    do_sample: false
  }
};

export const UI_CONFIG = {
  fadeAnimation: 'fadeIn 0.5s ease-out forwards',
  confidenceThresholds: {
    excellent: 90,
    good: 80
  }
};
