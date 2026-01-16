# Environment Variables Configuration

## Backend Environment Variables

Create a `backend/.env` file with the following variables:

```env
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/wizardirector

# Server Configuration
PORT=3001
NODE_ENV=development

# LLM API Keys
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_AI_API_KEY=AIza...

# Image Generation - Nano Banana (uses Google Gemini)
# Uses the same GOOGLE_AI_API_KEY as other Gemini services

# Video Generation - Google Veo3
GOOGLE_VEO3_API_KEY=your_veo3_api_key_here
GOOGLE_VEO3_API_URL=https://veo3.googleapis.com/v1

# Voice Generation - ElevenLabs (Optional)
ELEVENLABS_API_KEY=your_elevenlabs_api_key_here

# Session Secret
SESSION_SECRET=your_session_secret_here
```

## Frontend Environment Variables

Create a `.env.local` file in the root directory with the following variables:

**Note**: All frontend variables must be prefixed with `VITE_`

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here

# API Configuration
VITE_API_URL=http://localhost:3001

# Application Configuration
VITE_APP_NAME=Wizardirector
VITE_APP_ENV=development
```

## Required for Feature 3.1: Image Generation

The following environment variables are required for the Nano Banana image generation integration:

- `NANO_BANANA_API_KEY`: Your Nano Banana API key (required)
- `NANO_BANANA_API_URL`: API endpoint (defaults to `https://api.nanobanana.ai/v1`)

## Setup Instructions

1. Copy the examples above to the appropriate locations
2. Replace placeholder values with your actual credentials
3. Ensure `.env` and `.env.local` are in `.gitignore` (they should be by default)
4. Run the backend bucket setup script: `cd backend && npm run setup:bucket`

