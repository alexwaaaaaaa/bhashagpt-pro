import { NextRequest, NextResponse } from 'next/server';
import { APP_CONFIG } from '@/lib/config';

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;
        const language = formData.get('language') as string || 'en';
        
        if (!file) {
            return NextResponse.json(
                { error: 'No audio file provided' },
                { status: 400 }
            );
        }

        // Validate file type
        const allowedTypes = ['audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/wav'];
        if (!allowedTypes.includes(file.type)) {
            return NextResponse.json(
                { error: 'Invalid file type. Please upload an audio file.' },
                { status: 400 }
            );
        }

        // Validate file size (max 25MB for Whisper API)
        const maxSize = 25 * 1024 * 1024; // 25MB
        if (file.size > maxSize) {
            return NextResponse.json(
                { error: 'File too large. Maximum size is 25MB.' },
                { status: 400 }
            );
        }

        // Call backend API for transcription
        const backendUrl = APP_CONFIG.backendUrl;
        const formDataToSend = new FormData();
        formDataToSend.append('file', file);
        formDataToSend.append('language', language);

        const response = await fetch(`${backendUrl}/api/v1/voice/transcribe`, {
            method: 'POST',
            body: formDataToSend,
        });

        if (!response.ok) {
            throw new Error(`Backend API error: ${response.status}`);
        }

        const result = await response.json();

        // Return transcription result
        return NextResponse.json({
            text: result.text || 'Mock transcription result',
            language: language,
            duration: result.duration || null,
        });

    } catch (error) {
        console.error('Transcription error:', error);
        
        if (error instanceof Error) {
            // Handle backend API errors
            if (error.message.includes('Backend API error')) {
                return NextResponse.json(
                    { error: 'Transcription service temporarily unavailable.' },
                    { status: 503 }
                );
            }
        }

        return NextResponse.json(
            { error: 'Failed to transcribe audio. Please try again.' },
            { status: 500 }
        );
    }
}

export async function GET() {
    return NextResponse.json(
        { error: 'Method not allowed' },
        { status: 405 }
    );
}