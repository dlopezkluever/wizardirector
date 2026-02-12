/**
 * Image Analysis Service
 * Uses Gemini Vision to extract visual descriptions from uploaded asset images.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

export interface ImageAnalysisResult {
    extractedDescription: string;
    suggestedMerge: string;
    confidence: number;
}

const TYPE_PROMPTS: Record<string, string> = {
    character: 'Focus on: physical appearance, facial features, hair style/color, clothing, body build, distinguishing marks, posture, and expression.',
    location: 'Focus on: architectural style, atmosphere, lighting, materials/textures, spatial layout, notable landmarks, color palette, and time of day/weather.',
    prop: 'Focus on: material, shape, size, color, texture, condition (new/worn/damaged), and any unique markings or details.',
    extra_archetype: 'Focus on: archetype traits, general appearance, clothing style, body language, and any distinguishing visual features that define this background character type.',
};

export class ImageAnalysisService {
    private client: GoogleGenerativeAI;

    constructor() {
        const apiKey = process.env.GOOGLE_AI_API_KEY;
        if (!apiKey || apiKey === 'placeholder') {
            throw new Error('GOOGLE_AI_API_KEY not configured');
        }
        this.client = new GoogleGenerativeAI(apiKey);
    }

    /**
     * Analyze an asset image and extract a visual description.
     */
    async analyzeAssetImage(
        imageUrl: string,
        existingDescription: string,
        assetType: string,
        assetName: string
    ): Promise<ImageAnalysisResult> {
        console.log(`[ImageAnalysis] Analyzing image for ${assetType} "${assetName}"`);

        // Download image and convert to base64
        const imageData = await this.downloadImage(imageUrl);

        const typePrompt = TYPE_PROMPTS[assetType] || TYPE_PROMPTS.character;

        const extractPrompt = `You are a visual description expert for film production. Analyze this image of a ${assetType} named "${assetName}" and write a detailed visual description suitable for AI image generation.

${typePrompt}

Write a concise but comprehensive visual description (2-4 sentences). Be specific about colors, materials, and visual details. Do not include narrative or story elements — only what is visually observable.`;

        const model = this.client.getGenerativeModel({ model: 'gemini-2.5-flash' });

        const result = await model.generateContent({
            contents: [{
                role: 'user',
                parts: [
                    {
                        inlineData: {
                            mimeType: imageData.mimeType,
                            data: imageData.base64
                        }
                    },
                    { text: extractPrompt }
                ]
            }]
        });

        const extractedDescription = result.response.text().trim();
        console.log(`[ImageAnalysis] Extracted description (${extractedDescription.length} chars)`);

        // Generate merged description if existing description exists
        let suggestedMerge = extractedDescription;
        if (existingDescription && existingDescription.trim().length > 0) {
            suggestedMerge = await this.mergeDescriptions(existingDescription, extractedDescription, assetType, assetName);
        }

        // Estimate confidence based on response length
        const confidence = extractedDescription.length > 50 ? 0.9 : extractedDescription.length > 20 ? 0.7 : 0.5;

        return {
            extractedDescription,
            suggestedMerge,
            confidence,
        };
    }

    private async mergeDescriptions(
        existing: string,
        extracted: string,
        assetType: string,
        assetName: string
    ): Promise<string> {
        const mergePrompt = `You are merging two visual descriptions of a ${assetType} named "${assetName}" for AI image generation.

Existing description (from script analysis):
"${existing}"

Extracted description (from uploaded image):
"${extracted}"

Create a single, cohesive visual description that combines the best details from both. Prioritize visual details from the image (extracted) but keep important narrative context from the existing description. Keep it concise (2-4 sentences). Only describe what is visually observable.`;

        const model = this.client.getGenerativeModel({ model: 'gemini-2.5-flash' });

        const result = await model.generateContent({
            contents: [{
                role: 'user',
                parts: [{ text: mergePrompt }]
            }]
        });

        return result.response.text().trim();
    }

    private async downloadImage(imageUrl: string): Promise<{ base64: string; mimeType: string }> {
        const response = await fetch(imageUrl);
        if (!response.ok) {
            throw new Error(`Failed to download image: HTTP ${response.status}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const base64 = buffer.toString('base64');

        // Detect MIME type
        let mimeType = 'image/png';
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.startsWith('image/')) {
            mimeType = contentType;
        } else {
            const urlLower = imageUrl.toLowerCase();
            if (urlLower.includes('.jpg') || urlLower.includes('.jpeg')) {
                mimeType = 'image/jpeg';
            } else if (urlLower.includes('.webp')) {
                mimeType = 'image/webp';
            }
        }

        return { base64, mimeType };
    }
}
